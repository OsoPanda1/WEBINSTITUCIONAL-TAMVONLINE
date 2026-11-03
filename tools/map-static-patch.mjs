#!/usr/bin/env node
/**
 * Generador del bloque estático del mapa HCU Living Universe.
 *
 * El lienzo del mapa es una capa de percepción: no puede ser la única vía de
 * lectura. Este script toma `web/assets/mapa/graph.js` —única fuente de datos—
 * y escribe, entre marcadores, el registro de partículas, las proposiciones de
 * relación, la crónica y los ejes como HTML real. Así un crawler indexa las
 * entidades y una persona sin JavaScript lee lo mismo.
 *
 * Idempotencia cruzada: el bloque ya sale con el nombre de página del idioma
 * de cada archivo, así que `tools/i18n.mjs links` no tiene nada que corregir
 * después. `tools/map-data-audit.mjs` (E10) falla si alguien reintroduce un
 * nombre de idioma ajeno. El orden recomendado sigue siendo generar y auditar:
 *   node tools/map-static-patch.mjs && node tools/map-data-audit.mjs && node tools/i18n.mjs all
 *
 * Uso CLI:
 *   node map-static-patch.mjs            Escribe en las páginas registradas.
 *   node map-static-patch.mjs --check    Informa si el bloque difiere, sin escribir.
 *
 * Opciones:
 *   --web=DIR    raíz pública   (por omisión <proyecto>/web)
 *   --i18n=DIR   configuración  (por omisión <proyecto>/i18n)
 *   --page=KEY   limita a una clave de página
 *
 * Sin dependencias externas. Idempotente: reescribir produce bytes idénticos.
 * Exporta buildBlock() para pruebas.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const START = '<!-- hcu:static:start -->';
const END = '<!-- hcu:static:end -->';

const esc = (t) => String(t == null ? '' : t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Carga graph.js evaluándolo contra un `window` falso: la fuente es una sola. */
export function loadGraph(webDir) {
  const src = readFileSync(join(webDir, 'assets', 'mapa', 'graph.js'), 'utf8');
  const win = {};
  new Function('window', src)(win);
  if (!win.TAMV_GRAPH) throw new Error('graph.js no define window.TAMV_GRAPH');
  return win.TAMV_GRAPH;
}

export function createPatch({ webDir, i18nDir } = {}) {
  const WEB = resolve(webDir || join(ROOT, 'web'));
  const I18N = resolve(i18nDir || join(ROOT, 'i18n'));
  const pages = JSON.parse(readFileSync(join(I18N, 'pages.json'), 'utf8')).pages;
  const LOCALES = JSON.parse(readFileSync(join(I18N, 'locales.json'), 'utf8')).locales;
  const PREFIX = new Map(LOCALES.map((l) => [l.code, l.prefix || '']));

  /** Ruta relativa a web/ de una pagina en un idioma: coincide con tools/i18n.mjs. */
  const pathFor = (key, code) => {
    const f = pages[key] && pages[key].file[code];
    return f && PREFIX.has(code) ? PREFIX.get(code) + f : null;
  };
  const G = loadGraph(WEB);

  const KEY_OF_FILE = new Map();
  for (const [key, def] of Object.entries(pages)) {
    for (const f of Object.values(def.file)) KEY_OF_FILE.set(f, key);
  }

  const L = (o, code) => (o && (o[code] || o.es)) || '';
  const nm = (o, code) => { const v = L(o, code); return typeof v === 'string' ? v : (v && v.name) || ''; };
  const WORDS = {
    es: {
      register: 'Registro de partículas',
      registerLead: 'La misma información que dibuja el lienzo, en texto. Cada fila abre el expediente en el mapa y enlaza las fuentes que la sostienen; donde no hay fuente, la fila lo dice.',
      th: ['Código', 'Partícula', 'Región', 'Activación', 'Estado de evidencia', 'Sellos', 'Fuentes'],
      caption: 'Código · tipo · nombre · región · activación · estado · sellos · fuentes. Los sellos se leen en orden: identificador persistente, licencia declarada, afiliación con la cadena exacta, revisión externa identificable, registro o versionado público. ✓ cumple · ~ parcial · ✗ no cumple · — no aplica.',
      anchor: 'Ancla conceptual', region: 'Región de densidad', entity: 'Entidad',
      internal: 'enlace interno del sitio', verified: 'verificado',
      flows: 'Proposiciones de relación',
      flowsLead: 'Cada flujo es una hipótesis sobre cómo se condicionan estas entidades entre sí. Ninguno afirma causalidad: la columna inferior dice qué habría que observar para subirlo de estado.',
      from: 'origen', to: 'destino', test: 'Qué lo verificaría',
      chrono: 'Cronología de registro',
      chronoLead: 'Fechas de depósitos, publicaciones y verificaciones efectivamente realizadas. El único futuro listado está marcado como previsto y no como resultado.',
      axes: 'Qué significa cada eje',
      axesLead: 'Ningún valor de este mapa es una medición de importancia. La densidad se calcula desde los sellos y las fuentes del propio nodo; los demás ejes son texto atribuido o acción pendiente.',
      states: 'Los cinco estados de evidencia',
      statesLead: 'Escala de HCU-DEMO-1.0. Un mismo registro puede estar en un estado distinto según la afirmación que se haga de él.',
      none: 'sin fuente enlazada',
      void: 'Vacío declarado: la partícula existe para que la ausencia se vea.',
      opens: 'Abrir en el mapa',
      kind: { declarado: 'declarado', registrado: 'registrado', depositado: 'depositado', publicado: 'publicado', verificado: 'verificación', previsto: 'previsto', vacio: 'vacío declarado' }
    },
    en: {
      register: 'Register of particles',
      registerLead: 'The same information the canvas draws, in text. Each row opens the dossier in the map and links the sources behind it; where there is no source, the row says so.',
      th: ['Code', 'Particle', 'Region', 'Activation', 'Evidence state', 'Seals', 'Sources'],
      caption: 'Code · kind · name · region · activation · state · seals · sources. The seals read in order: persistent identifier, declared licence, affiliation with the exact string, identifiable external review, public register or versioning. ✓ met · ~ partial · ✗ not met · — not applicable.',
      anchor: 'Conceptual anchor', region: 'Density region', entity: 'Entity',
      internal: 'internal site link', verified: 'verified',
      flows: 'Relation propositions',
      flowsLead: 'Each flow is a hypothesis about how these entities condition one another. None claims causality: the line below states what would have to be observed to raise its state.',
      from: 'origin', to: 'destination', test: 'What would verify it',
      chrono: 'Chronology of record',
      chronoLead: 'Dates of deposits, publications and verifications actually carried out. The only future entry is marked as planned, not as an outcome.',
      axes: 'What each axis means',
      axesLead: 'No value on this map is a measurement of importance. Density is computed from the seals and sources on the node itself; the other axes are attributed text or an outstanding action.',
      states: 'The five evidence states',
      statesLead: 'The HCU-DEMO-1.0 scale. One and the same record can sit in a different state depending on the claim made about it.',
      none: 'no source linked',
      void: 'Declared void: the particle exists so that the absence is visible.',
      opens: 'Open in the map',
      kind: { declarado: 'declared', registrado: 'recorded', depositado: 'deposited', publicado: 'published', verificado: 'verification', previsto: 'planned, not an outcome', vacio: 'declared void' }
    }
  };

  const codeOf = (e) => {
    const d = G.domains.find(x => x.id === e.dom);
    const i = G.entities.filter(x => x.dom === e.dom).indexOf(e) + 1;
    return (d ? d.code : '??') + i;
  };
  const slug = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '-');

  /**
   * Enlace interno. Las páginas se nombran en el idioma de la página que las
   * recibe —todas conviven en un mismo nivel, así que el nombre suelto resuelve
   * bien desde `web/` y desde `web/en/`—; los recursos de raíz se suben con
   * `../` según la profundidad. Localizar aquí y no depender de que alguien
   * ejecute `i18n links` después es lo que hace al pipeline conmutativo.
   */
  function hrefFor(href, code, rel) {
    if (!href) return '';
    if (/^(https?:|mailto:|tel:|data:|#)/i.test(href)) return href;
    const bare = href.replace(/^\.\//, '');
    if (bare.includes('/')) return href;
    if (KEY_OF_FILE.has(bare)) {
      const target = pages[KEY_OF_FILE.get(bare)];
      return (target && target.file[code]) || bare;
    }
    const depth = rel.includes('/') ? posix.dirname(rel).split('/').length : 0;
    return '../'.repeat(depth) + bare;
  }

  function sourceList(src, code, rel, W) {
    if (!src || !src.length) return `<span class="mono-note">${esc(W.none)}</span>`;
    const items = src.map(s => {
      const h = hrefFor(s.href, code, rel);
      const label = esc(L(s, code));
      const isOut = /^(https?:|mailto:)/i.test(h);
      const a = isOut
        ? `<a href="${esc(h)}" rel="noopener noreferrer" target="_blank">${label}</a>`
        : `<a href="${esc(h)}">${label}</a>`;
      const when = s.ver ? `${esc(W.verified)} ${esc(s.ver)}` : esc(W.internal);
      return `        <li>${a}<em>${when}</em></li>`;
    });
    return `<ul class="hcu-src-list">\n${items.join('\n')}\n      </ul>`;
  }

  function sealMini(e, code, W) {
    const mark = { si: '✓', parcial: '~', no: '✗', na: '—' };
    return G.sealDefs.map(sd => `${mark[e.seals[sd.key]] || '?'} ${esc(L(sd, code))}`).join(' · ');
  }

  function row(id, code, kind, name, sub, region, activation, state, seals, src, W, rel) {
    const anchor = 'reg-' + slug(id);
    return `        <tr id="${anchor}">
          <td class="mono"><button type="button" class="hcu-open" data-hcu-row="${esc(id)}" title="${esc(W.opens)}">${esc(code)}</button></td>
          <td><b>${esc(name)}</b>${sub ? `<br><span class="mono-note">${esc(sub)}</span>` : ''}</td>
          <td>${esc(region)}</td>
          <td>${esc(activation)}</td>
          <td class="mono">${esc(state)}</td>
          <td><span class="hcu-seals-mini">${seals}</span></td>
          <td>${src}</td>
        </tr>`;
  }

  function registerTable(code, rel, W) {
    const rows = [];
    rows.push(row('core', 'Ω', 'core', nm(G.core, code), '', '—', '—', '—', '—',
      sourceList(G.core.src || [], code, rel, W), W, rel));
    G.domains.forEach(d => {
      rows.push(row('dom:' + d.id, d.code, 'domain', nm(d, code), L(d, code).field, nm(d, code),
        '—', '—', '—', sourceList(d.src || [], code, rel, W), W, rel));
      G.entities.filter(e => e.dom === d.id).forEach(e => {
        const s = L(e, code);
        rows.push(row(e.id, codeOf(e), 'entity', s.name, s.cls, nm(d, code),
          nm(G.activations[e.act], code), 'E' + e.st + ' · ' + nm(G.states.find(x => x.code === e.st), code),
          sealMini(e, code, W), sourceList(e.src, code, rel, W), W, rel));
      });
    });
    return `<div class="table-scroll" data-label="${esc(W.register)}">
      <table class="hcu-static">
        <caption>${esc(W.caption)}</caption>
        <thead><tr>${W.th.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>
${rows.join('\n')}
        </tbody>
      </table>
    </div>`;
  }

  function flowsBlock(code, rel, W) {
    const chip = (id) => {
      const e = G.entities.find(x => x.id === id);
      const d = G.domains.find(x => 'dom:' + x.id === id);
      const name = e ? nm(e, code) : d ? nm(d, code) : id;
      const label = e ? codeOf(e) + ' · ' + name : name;
      return `<a href="#reg-${esc(slug(id))}" data-hcu-row="${esc(id)}">${esc(label)}</a>`;
    };
    const items = G.flows.map(f => {
      const s = L(f, code);
      return `      <article class="hcu-flow" id="flujo-${f.id}" data-hcu-flow="${f.id}">
        <h3>${esc(f.id)}</h3>
        <p class="type">${esc(f.type)}</p>
        <p class="link"><span class="arrow">${esc(W.from)}:</span> ${f.from.map(chip).join(' · ')}<br><span class="arrow">${esc(W.to)}:</span> ${f.to.map(chip).join(' · ')}</p>
        <p>${esc(s.claim)}</p>
        <p class="test"><b>${esc(W.test)}.</b> ${esc(s.test)}</p>
      </article>`;
    });
    return `<div class="hcu-flows">\n${items.join('\n')}\n    </div>`;
  }

  function chronoBlock(code, rel, W) {
    const items = G.chronology.map(c => {
      const refs = (c.refs || []).map(id => {
        const e = G.entities.find(x => x.id === id);
        return e ? codeOf(e) + ' · ' + nm(e, code) : null;
      }).filter(Boolean);
      const h = hrefFor(c.href, code, rel);
      const isOut = /^(https?:)/i.test(h);
      const label = isOut ? h.replace(/^https?:\/\//, '').replace(/^www\./, '') : h;
      const link = h ? `<a class="who" href="${esc(h)}"${isOut ? ' rel="noopener noreferrer" target="_blank"': ''}>${esc(label)}</a>` : '';
      return `      <li data-kind="${esc(c.kind)}">
        <span class="when">${esc(c.date)} · ${esc((W.kind || {})[c.kind] || c.kind)}</span>
        <p>${esc(L(c, code))}</p>
        ${refs.length ? `<p class="who">${esc(refs.join(' · '))}</p>` : ''}
        ${link}
      </li>`;
    });
    return `<ol class="hcu-chrono">\n${items.join('\n')}\n    </ol>`;
  }

  function axesBlock(code, W) {
    const items = G.axes.map(a => {
      const s = L(a, code);
      return `      <dt>${esc(s.name)}</dt><dd>${esc(s.basis)}</dd>`;
    });
    return `<dl class="fields">\n${items.join('\n')}\n    </dl>`;
  }

  function statesBlock(code, W) {
    const items = G.states.map(s => `      <li><b class="mono">E${s.code}</b> ${esc(L(s, code))}</li>`);
    return `<ul class="plain gap">\n${items.join('\n')}\n    </ul>`;
  }

  /**
   * Isla de rutas: el motor del lienzo no lee pages.json, así que necesita que
   * el nombre de archivo del idioma fuente esté resuelto en el propio documento.
   * `map.js` la busca por id y traduce cada href interno antes de pintarlo.
   */
  function pathsIsland(code, rel) {
    const internal = new Set();
    G.entities.forEach((e) => (e.src || []).forEach((s) => { if (s.href && !/^(https?:|mailto:|tel:|data:|#)/i.test(s.href)) internal.add(s.href.replace(/^\.\//, '')); }));
    G.chronology.forEach((c) => { if (c.href && !/^(https?:|mailto:|tel:|data:|#)/i.test(c.href)) internal.add(c.href.replace(/^\.\//, '')); });
    const map = {};
    [...internal].sort().forEach((h) => { map[h] = hrefFor(h, code, rel); });
    return `      <script type="application/json" id="hcu-paths">${JSON.stringify(map)}</script>`;
  }

  /** Bloque completo para una página de un idioma. */
  function buildBlock(key, code) {
    const W = WORDS[code];
    const rel = pathFor(key, code);
    const meta = L(G.meta, code);
    const total = 1 + G.domains.length + G.entities.length;
    return [
      START,
      pathsIsland(code, rel),
      `      <p class="muted">${esc(meta.summary)}</p>`,
      `      <h3 id="registro">${esc(W.register)} <span class="mono-note">${total}</span></h3>`,
      `      <p class="muted">${esc(W.registerLead)}</p>`,
      registerTable(code, rel, W),
      `      <h3 id="flujos">${esc(W.flows)} <span class="mono-note">${G.flows.length}</span></h3>`,
      `      <p class="muted">${esc(W.flowsLead)}</p>`,
      flowsBlock(code, rel, W),
      `      <h3 id="cronica">${esc(W.chrono)}</h3>`,
      `      <p class="muted">${esc(W.chronoLead)}</p>`,
      chronoBlock(code, rel, W),
      `      <h3 id="ejes">${esc(W.axes)}</h3>`,
      `      <p class="muted">${esc(W.axesLead)}</p>`,
      axesBlock(code, W),
      `      <h3 id="estados">${esc(W.states)}</h3>`,
      `      <p class="muted">${esc(W.statesLead)}</p>`,
      statesBlock(code, W),
      `      <p class="mono-note">${esc(G.meta.version)} · ${esc(code === 'es' ? 'auditoría de fuentes' : 'source audit')} ${esc(G.meta.audited)}</p>`,
      END
    ].join('\n');
  }

  function apply(key, onlyCheck) {
    const out = [];
    for (const code of Object.keys(pages[key].file)) {
      const rel = pathFor(key, code);
      if (code !== 'es' && code !== 'en') continue;
      const abs = join(WEB, rel);
      if (!existsSync(abs)) { out.push(`  ! falta la página web/${rel} (clave ${key}, idioma ${code})`); continue; }
      const html = readFileSync(abs, 'utf8');
      if (!html.includes(START)) { out.push(`  ! ${rel} no contiene el marcador ${START}`); continue; }
      const block = buildBlock(key, code);
      const next = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), () => block);
      if (next === html) { out.push(`  = ${rel} ya coincide`); continue; }
      if (onlyCheck) { out.push(`  ~ ${rel} difiere (ejecuta sin --check)`); continue; }
      writeFileSync(abs, next.replace(/\r\n/g, '\n'), 'utf8');
      out.push(`  + ${rel} actualizado`);
    }
    return out.join('\n');
  }

  return { buildBlock, apply, G, pages };
}

const argv = process.argv.slice(2);
const opt = (name) => { const a = argv.find(x => x.startsWith('--' + name + '=')); return a ? a.split('=').slice(1).join('=') : null; };
const only = opt('page');

const invokedDirectly = resolve(process.argv[1] || '').replace(/\\/g, '/').endsWith('/tools/map-static-patch.mjs');
if (invokedDirectly) {
  const site = createPatch({ webDir: opt('web') || undefined, i18nDir: opt('i18n') || undefined });
  if (!site.pages.map) {
    console.log('La clave "map" no esta registrada en i18n/pages.json. Registrela antes de generar.');
    process.exitCode = 1;
  } else {
    const keys = only ? [only] : ['map'];
    console.log(keys.map(k => `paginas de la clave "${k}":\n` + site.apply(k, argv.includes('--check'))).join('\n'));
  }
}
