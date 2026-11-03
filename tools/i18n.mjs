#!/usr/bin/env node
/**
 * Generador y auditor de multilingüismo para un sitio estático bilingüe.
 *
 * El selector de idioma, la navegación principal, los enlaces hreflang, el
 * atributo lang y la localización de enlaces internos se derivan de
 * <i18n>/locales.json y <i18n>/pages.json. No se editan a mano: el generador
 * los sobrescribe.
 *
 * Uso CLI:
 *   node i18n.mjs status      [opciones]   Idiomas vivos y páginas que faltan
 *   node i18n.mjs links   [locale] [opc.]  Reescribe enlaces internos al archivo correcto
 *   node i18n.mjs inject  [locale] [opc.]  Escribe alternates, selector, navegación y lang
 *   node i18n.mjs audit       [opciones]   Enlaces rotos, marcadores sin resolver, alternates, restos del idioma fuente
 *   node i18n.mjs emit-meta   [opciones]   robots.txt + sitemap.xml (exige site.base_url)
 *   node i18n.mjs all       [locale] [opc.]  links + inject + audit
 *
 * Opciones:
 *   --web=DIR       raíz pública (por omisión ./web del directorio de trabajo;
 *                   si ahí no hay i18n/locales.json, el directorio padre del script)
 *   --i18n=DIR      directorio de configuración (por omisión ./i18n, misma regla)
 *   --allow=FILE    lista blanca de nombres propios (por defecto <i18n>/residue-allow.txt si existe)
 *   --patterns=FILE patrones de restos del idioma fuente (por defecto <i18n>/residue-patterns.txt, luego los del español)
 *
 * Sin dependencias externas. Requiere Node 18+.
 * Exporta createSite() para pruebas: importa el módulo y llama a los comandos
 * sobre un fixture sin necesitar argv ni stdin.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const BEGIN = '<!-- i18n:generated:start -->';
const END = '<!-- i18n:generated:end -->';

/**
 * Raíces por omisión: primero el directorio de trabajo (un proyecto que ejecute
 * `node tools/i18n.mjs` desde su raíz), y si ahí no hay configuración, el
 * directorio que contiene a `scripts/` o `tools/`. Así el script funciona desde
 * cualquier carpeta sin pasarle opciones.
 */
function defaultDirs() {
  const cwd = process.cwd();
  if (existsSync(join(cwd, 'i18n', 'locales.json'))) return { webDir: join(cwd, 'web'), i18nDir: join(cwd, 'i18n') };
  const root = resolve(HERE, '..');
  return { webDir: join(root, 'web'), i18nDir: join(root, 'i18n') };
}

/**
 * Restos del idioma fuente (español) que delatan una página sin traducir.
 * Excluye deliberadamente "del" y "actual": son palabras inglesas legítimas o
 * parte de topónimos como "Mineral del Monte". Los nombres propios se liberan
 * con la lista blanca, no ampliando esta lista.
 */
const DEFAULT_RESIDUE = [
  /\b(?:los|las|unos|unas)\b/gi, /\b(?:desde|durante)\b/gi, /\b(?:este|esta|estos|estas|eso)\b/gi,
  /\b(?:tiene|tienen|existe|existen|puede|pueden|deben|debe)\b/gi, /\b(?:cuando|donde|porque|aunque)\b/gi,
  /\b(?:más|menos|antes|después|cada|pero|siempre|aquí|así)\b/gi,
  /\b(?:solicitud|miembros|miembro|red|sitio|sitios|página|páginas|depósito|depósitos)\b/gi,
];

function readPatterns(file) {
  if (!file || !existsSync(file)) return null;
  const out = [];
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    out.push(new RegExp(t, 'gi'));
  }
  return out.length ? out : null;
}

function readAllow(file) {
  if (!file || !existsSync(file)) return [];
  const out = [];
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    out.push(new RegExp(t, 'gi'));
  }
  return out;
}

export function createSite({ webDir, i18nDir, allowFile, patternFile } = {}) {
  const dflt = defaultDirs();
  const WEB = resolve(webDir || dflt.webDir);
  const I18N = resolve(i18nDir || dflt.i18nDir);

  const cfg = JSON.parse(readFileSync(join(I18N, 'locales.json'), 'utf8'));
  const pages = JSON.parse(readFileSync(join(I18N, 'pages.json'), 'utf8'));

  const ALL = cfg.locales;
  const LIVE = ALL.filter((l) => l.status === 'live');
  const BASE = (cfg.site.base_url || '').replace(/\/+$/, '');
  const DEFAULT_LOCALE = cfg.site.default_locale;
  const X_DEFAULT = cfg.site.x_default_locale || DEFAULT_LOCALE;

  const RESIDUE = readPatterns(patternFile || join(I18N, 'residue-patterns.txt')) || DEFAULT_RESIDUE;
  const ALLOWED = readAllow(allowFile === null ? null : (allowFile || join(I18N, 'residue-allow.txt')));

  /** Índice inverso: nombre de archivo -> clave de página. */
  const FILE_TO_KEY = new Map();
  for (const [key, def] of Object.entries(pages.pages)) {
    for (const f of Object.values(def.file)) FILE_TO_KEY.set(f, key);
  }

  const localeOf = (code) => ALL.find((l) => l.code === code);

  function fileFor(key, code) {
    const def = pages.pages[key];
    if (!def) return null;
    return def.file[code] ?? def.file[DEFAULT_LOCALE] ?? null;
  }

  /** Ruta relativa a WEB/ de una página en un idioma. */
  function pathFor(key, code) {
    const loc = localeOf(code);
    const f = fileFor(key, code);
    return loc && f ? loc.prefix + f : null;
  }

  function dirOf(relFromWeb) {
    const d = posix.dirname(relFromWeb);
    return d === '.' ? '' : d;
  }

  /**
   * Enlace relativo desde el directorio de una página hacia una ruta del sitio.
   * Normaliza el prefijo "./" en cada pasada: sin esa normalización el generador
   * no es idempotente y reescribe el archivo en cada ejecución.
   */
  function relLink(fromRel, toRel) {
    const out = relative(dirOf(fromRel) || '.', toRel).replace(/\\/g, '/');
    return out.startsWith('.') ? out : './' + out;
  }

  /** Enlace relativo desde una página hacia un recurso compartido. */
  function assetLink(fromRel, asset) {
    const d = dirOf(fromRel);
    const depth = d ? d.split('/').length : 0;
    return '../'.repeat(depth) + asset;
  }

  /**
   * Convierte los {marcadores} de un bloque generado en enlaces reales.
   * Las URLs absolutas se devuelven intactas: el cuerpo usa rutas relativas y
   * los metadatos (hreflang, canonical) exigen rutas absolutas.
   */
  function materialise(block, fromRel) {
    return block.replace(/\{([^{}]+)\}/g, (_m, target) => {
      if (/^https?:\/\//i.test(target)) return target;
      if (target.startsWith('assets/')) return assetLink(fromRel, target);
      return relLink(fromRel, target);
    });
  }

  /** URL absoluta para hreflang/canonical, o ruta de sitio si falta base_url. */
  function absUrl(relFromWeb) {
    if (!BASE) return relFromWeb;
    return BASE + '/' + relFromWeb.split('/').map(encodeURIComponent).join('/');
  }

  function localeFiles(code) {
    const loc = localeOf(code);
    if (!loc) return [];
    const abs = join(WEB, loc.prefix);
    if (!existsSync(abs)) return [];
    return readdirSync(abs).filter((f) => f.endsWith('.html')).map((f) => loc.prefix + f);
  }

  function keyOfPath(relFromWeb) {
    const loc = ALL.find((l) => l.prefix && relFromWeb.startsWith(l.prefix));
    const code = loc ? loc.code : DEFAULT_LOCALE;
    const file = posix.basename(relFromWeb);
    const key = FILE_TO_KEY.get(file);
    return key && pages.pages[key].file[code] === file ? key : null;
  }

  function existingPages() {
    const out = [];
    for (const l of LIVE) {
      for (const rel of localeFiles(l.code)) out.push({ rel, code: l.code, key: keyOfPath(rel) });
    }
    return out;
  }

  const readPage = (rel) => readFileSync(join(WEB, rel), 'utf8');
  const writePage = (rel, html) => writeFileSync(join(WEB, rel), html.replace(/\r\n/g, '\n'), 'utf8');

  // ---------------------------------------------------------------- bloques

  function navBlock(code) {
    const loc = localeOf(code);
    const aria = loc.aria?.nav ?? 'Main navigation';
    const items = pages.nav_order
      .filter((k) => pages.pages[k]?.nav)
      .map((k) => `        <li><a href="{${pathFor(k, code)}}">${pages.pages[k].nav[code] ?? pages.pages[k].nav[DEFAULT_LOCALE]}</a></li>`);
    return [`    <nav class="primary" aria-label="${aria}">`, '      <ul>', ...items, '      </ul>', '    </nav>'].join('\n');
  }

  function switcherBlock(code, key) {
    const loc = localeOf(code);
    const aria = loc.aria?.switch ?? 'Select language';
    const lines = LIVE.map((l) => {
      const target = pathFor(key, l.code) ?? l.prefix + 'index.html';
      const cur = l.code === code ? ' aria-current="true"' : '';
      return `      <a href="{${target}}" hreflang="${l.hreflang}"${cur}>${l.label}</a>`;
    });
    return [`    <div class="lang-switch" role="group" aria-label="${aria}">`, ...lines, '    </div>'].join('\n');
  }

  function headBlock(key, fromRel, code) {
    const loc = localeOf(code);
    const og = loc.og_locale ?? loc.lang_attr.replace(/-/g, '_');
    const lines = [BEGIN, `  <meta property="og:locale" content="${og}">`];
    for (const l of LIVE) {
      const target = pathFor(key, l.code);
      if (target) lines.push(`  <link rel="alternate" hreflang="${l.hreflang}" href="{${absUrl(target)}}">`);
    }
    const xd = pathFor(key, X_DEFAULT);
    if (xd) lines.push(`  <link rel="alternate" hreflang="x-default" href="{${absUrl(xd)}}">`);
    if (BASE) lines.push(`  <link rel="canonical" href="{${absUrl(pathFor(key, code))}}">`);
    /* RFC 6579: la relacion sitemap declara el medio del recurso desde el
       propio documento. Donde el host no fija Content-Type para .xml, esta linea
       es la unica capa del repositorio que puede afirmar el tipo del mapa. */
    lines.push(`  <link rel="sitemap" type="application/xml" title="${loc.sitemap_title ?? 'Site map'}" href="/sitemap.xml">`);
    lines.push(END);
    return materialise(lines.join('\n'), fromRel);
  }

  /** Inserta o reemplaza el bloque entre marcadores, justo antes de </head>. */
  function applyHeadBlock(html, block) {
    if (html.includes(BEGIN)) {
      return html.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`), block.trim());
    }
    return html.replace(/<\/head>/i, `${block.trim()}\n</head>`);
  }

  /** Reemplaza el bloque que coincide con `re` conservando la sangría original. */
  function replaceBlock(html, re, block) {
    return html.replace(re, (_m, indent = '') =>
      block.split('\n').map((l, i) => (i === 0 ? indent + l.trimStart() : l)).join('\n'),
    );
  }

  const NAV_RE = /([ \t]*)<nav class="primary"[\s\S]*?<\/nav>/;
  const SWITCH_RE = /([ \t]*)<div class="lang-switch"[\s\S]*?<\/div>/;

  /**
   * Escribe nav y selector, creándolos donde faltan. Sin esta creación la
   * sustitución por regex estructural es silenciosa: una página que nunca tuvo
   * el elemento nunca lo recibe.
   */
  function applyBodyBlocks(html, nav, sw) {
    const hasNav = NAV_RE.test(html);
    const hasSwitch = SWITCH_RE.test(html);
    if (hasNav) html = replaceBlock(html, NAV_RE, nav);
    if (hasSwitch) html = replaceBlock(html, SWITCH_RE, sw);
    if (hasNav && hasSwitch) return { html, bootstrapped: false };

    if (hasNav && !hasSwitch) {
      const m = html.match(NAV_RE);
      const at = (m.index ?? 0) + m[0].length;
      return { html: html.slice(0, at) + '\n' + sw + html.slice(at), bootstrapped: true };
    }
    if (!hasNav && hasSwitch) {
      const at = html.search(SWITCH_RE);
      return { html: html.slice(0, at) + nav + '\n    ' + html.slice(at), bootstrapped: true };
    }
    const anchors = [
      { re: /<\/header>/i, where: 'before' },
      { re: /<body[^>]*>/i, where: 'after' },
      { re: /<\/main>/i, where: 'before' },
    ];
    const combined = nav + '\n' + sw + '\n';
    for (const a of anchors) {
      const m = html.match(a.re);
      if (!m) continue;
      const at = a.where === 'before' ? m.index : m.index + m[0].length;
      return { html: html.slice(0, at) + (a.where === 'before' ? combined : '\n' + combined) + html.slice(at), bootstrapped: true };
    }
    return { html, bootstrapped: false, unplaced: true };
  }

  // -------------------------------------------------------------- comandos

  function status() {
    const out = ['Idiomas registrados: ' + ALL.map((l) => `${l.code}(${l.status})`).join(' ')];
    for (const l of ALL) {
      const have = new Set(localeFiles(l.code).map((p) => posix.basename(p)));
      const missing = Object.keys(pages.pages).filter((k) => !have.has(fileFor(k, l.code)));
      const extra = [...have].filter((f) => !FILE_TO_KEY.has(f));
      out.push(
        `  ${l.code}  prefijo="${l.prefix || '/'}"  ${l.status}  ${have.size}/${Object.keys(pages.pages).length}` +
          (missing.length ? `  faltan: ${missing.join(', ')}` : '') +
          (extra.length ? `  sin clave: ${extra.join(', ')}` : ''),
      );
    }
    out.push(BASE ? `base_url = ${BASE}` : 'base_url = null  ->  canonical, robots.txt y sitemap.xml bloqueados');
    return out.join('\n');
  }

  function links(only) {
    let changed = 0;
    for (const p of existingPages()) {
      if (only && p.code !== only) continue;
      if (!p.key) continue;
      let html = readPage(p.rel);
      const before = html;

      html = html.replace(/(href=")([^"{}#]+)(#[^"]*)?(")/g, (m, a, target, hash = '', c) => {
        if (/^(https?:|mailto:|tel:|data:)/i.test(target)) return m;
        const clean = target.replace(/^\.\//, '');
        // Solo nombres de archivo sueltos: las rutas con "/" ya están resueltas
        // y reescribirlas rompería la idempotencia.
        if (clean.includes('/')) return m;
        const key = FILE_TO_KEY.get(clean);
        if (!key) return m;
        const want = fileFor(key, p.code);
        return want && want !== clean ? `${a}${want}${hash}${c}` : m;
      });

      html = html.replace(/((?:href|src)=")(assets\/[^"]+)(")/g, (_m, a, target, c) => `${a}${assetLink(p.rel, target)}${c}`);

      if (html !== before) {
        writePage(p.rel, html);
        changed++;
      }
    }
    return `Enlaces localizados en ${changed} página(s).`;
  }

  function inject(only) {
    let changed = 0;
    let created = 0;
    const unplaced = [];
    for (const p of existingPages()) {
      if (only && p.code !== only) continue;
      if (!p.key) continue;
      const loc = localeOf(p.code);
      let html = readPage(p.rel);
      const before = html;

      html = html.replace(/<html\b[^>]*>/i, (m) => {
        const tag = m.replace(/\slang="[^"]*"/i, '').replace(/\sdir="[^"]*"/i, '');
        return tag.replace(/^<html/, `<html lang="${loc.lang_attr}"${loc.dir === 'rtl' ? ' dir="rtl"' : ''}`);
      });

      html = html.replace(/[ \t]*<meta property="og:locale"[^>]*>\s*\n?/gi, '');
      html = applyHeadBlock(html, headBlock(p.key, p.rel, p.code));
      const body = applyBodyBlocks(html, materialise(navBlock(p.code), p.rel), materialise(switcherBlock(p.code, p.key), p.rel));
      html = body.html;
      if (body.bootstrapped) created++;
      if (body.unplaced) unplaced.push(p.rel);

      if (html !== before) {
        writePage(p.rel, html);
        changed++;
      }
    }
    let out = `Bloques generados en ${changed} página(s).`;
    if (created) out += `\nNav o selector creados en ${created} página(s): verifica que la hoja de estilos los coloque donde toca.`;
    if (unplaced.length) out += `\nSin ancla donde insertar la navegación: ${unplaced.join(', ')}`;
    return out;
  }

  /**
   * Enlaces con {marcador} sin materializar. Deben ser un error explícito: una
   * comprobación de enlaces que excluye las llaves de su regex los silencía y
   * deja un sitio lleno de destinos inexistentes que la auditoría reporta limpio.
   */
  function unresolvedMarkers(html, rel, code, errors) {
    const re = /(?:href|src)="(\{[^"]*\})"/g;
    let m;
    while ((m = re.exec(html))) errors.push(`[${code}] ${rel} marcador sin materializar: ${m[1]} (ejecuta inject)`);
  }

  function stripSourceResidueExemptions(text) {
    let out = text
      .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
      .replace(/<code[\s\S]*?<\/code>/gi, ' ');
    for (const rx of ALLOWED) out = out.replace(new RegExp(rx.source, 'gi'), ' ');
    return out;
  }

  function audit() {
    const errors = [];
    const warns = [];

    for (const l of LIVE) {
      const have = new Set(localeFiles(l.code).map((f) => posix.basename(f)));
      for (const key of Object.keys(pages.pages)) {
        const f = fileFor(key, l.code);
        if (!have.has(f)) errors.push(`[${l.code}] falta la página "${key}" -> web/${l.prefix}${f}`);
      }
    }

    for (const p of existingPages()) {
      const html = readPage(p.rel);

      unresolvedMarkers(html, p.rel, p.code, errors);

      const re = /(?:href|src)="([^"{}]+)"/g;
      let m;
      while ((m = re.exec(html))) {
        const raw = m[1];
        if (/^(https?:|mailto:|tel:|data:|#)/i.test(raw)) continue;
        const clean = raw.split('#')[0].split('?')[0];
        if (!clean) continue;
        /* Una href que empieza por / es relativa a la raíz del sitio, no al
           directorio de la página: `/sitemap.xml` apunta al archivo raíz también
           desde `en/`. Resolverla contra la página producía falsos rotos. */
        const target = clean.startsWith('/')
          ? resolve(WEB, clean.replace(/^\/+/, ''))
          : resolve(WEB, posix.join(dirOf(p.rel), clean));
        if (!existsSync(target)) {
          errors.push(`[${p.code}] ${p.rel} -> enlace roto: ${raw}`);
        }
      }

      const alts = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)];
      if (!alts.length) warns.push(`[${p.code}] ${p.rel} sin alternates hreflang (ejecuta inject)`);
      if (!html.includes(BEGIN)) warns.push(`[${p.code}] ${p.rel} sin bloque generado (ejecuta inject)`);
      if (!BASE) for (const [, hl, href] of alts) {
        if (!/\.html$/.test(href)) warns.push(`[${p.code}] ${p.rel} alternate ${hl} no es ruta de archivo`);
      }

      const loc = localeOf(p.code);
      if (!new RegExp(`<html[^>]+lang="${loc.lang_attr}"`, 'i').test(html)) errors.push(`[${p.code}] ${p.rel} lang incorrecto`);

      if (p.code !== DEFAULT_LOCALE) {
        const text = stripSourceResidueExemptions(html)
          .replace(/<head[\s\S]*?<\/head>/gi, ' ')
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ');
        const hits = new Map();
        for (const rx of RESIDUE) for (const w of text.match(new RegExp(rx.source, 'gi')) || []) {
          const k = w.toLowerCase();
          hits.set(k, (hits.get(k) || 0) + 1);
        }
        if (hits.size) {
          const top = [...hits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w, n]) => `${w}×${n}`).join(' ');
          warns.push(`[${p.code}] ${p.rel} posible texto del idioma fuente sin traducir: ${top}`);
        }
      }
    }

    if (!BASE) warns.push('site.base_url = null: rel=canonical, robots.txt y sitemap.xml no se emiten.');

    const out = [`AUDITORÍA i18n — ${LIVE.length} idioma(s) vivo(s), ${existingPages().length} página(s) revisada(s)`];
    out.push(`  errores: ${errors.length}`);
    for (const x of errors) out.push('    x ' + x);
    out.push(`  avisos: ${warns.length}`);
    for (const x of warns) out.push('    . ' + x);
    if (!errors.length && !warns.length) out.push('  Sin incidencias.');
    return out.join('\n');
  }

  function emitMeta() {
    if (!BASE) {
      return 'NO EMITIDO. site.base_url es null en locales.json.\n' +
        'robots.txt y sitemap.xml necesitan URLs absolutas: confirmar el dominio definitivo,\n' +
        'verificar que recibe correo, escribirlo en locales.json y volver a ejecutar.';
    }
    const name = cfg.site.name || 'Sitio';
    const live = existingPages().filter((p) => posix.basename(p.rel) !== '404.html').map((p) => `${BASE}/${p.rel}`);
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      live.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n';
    writeFileSync(join(WEB, 'sitemap.xml'), xml, 'utf8');
    writeFileSync(join(WEB, 'robots.txt'), `# ${name}\nSitemap: ${BASE}/sitemap.xml\n\nUser-agent: *\nAllow: /\n`, 'utf8');
    return `Emitido sitemap.xml (${live.length} URLs) y robots.txt.`;
  }

  function all(only) {
    return [links(only), inject(only), audit()].join('\n');
  }

  return { status, links, inject, audit, emitMeta, all, WEB, I18N, BASE, LIVE, ALL, pages, relLink, assetLink, materialise, pathFor };
}

// ------------------------------------------------------------------- main CLI

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isCli) {
  const argv = process.argv.slice(2);
  const opts = {};
  const positional = [];
  for (const a of argv) {
    const m = a.match(/^--(web|i18n|allow|patterns)=(.*)$/);
    if (m) opts[m[1]] = m[2];
    else positional.push(a);
  }
  const [cmd = 'status', arg] = positional;

  try {
    const site = createSite({ webDir: opts.web, i18nDir: opts.i18n, allowFile: opts.allow, patternFile: opts.patterns });
    const fn = { status: site.status, links: () => site.links(arg), inject: () => site.inject(arg), audit: site.audit, 'emit-meta': site.emitMeta, all: () => site.all(arg) }[cmd];
    if (!fn) {
      console.error(`Comando desconocido: ${cmd}\nEspera: status | links | inject | audit | emit-meta | all`);
      process.exitCode = 1;
    } else {
      console.log(fn());
    }
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error(/locales\.json|pages\.json/.test(msg)
      ? `FALLO: ${msg}\nNo hay configuración i18n en el directorio de trabajo. Ejecuta desde la raíz del sitio\no pasa --web=DIR --i18n=DIR.`
      : 'FALLO: ' + msg);
    process.exitCode = 1;
  }
}
