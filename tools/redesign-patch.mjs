#!/usr/bin/env node
/**
 * tools/redesign-patch.mjs — aplica el rediseño de marca a las 24 páginas.
 *
 * Determinista e idempotente: cada parche comprueba si ya está aplicado y no
 * vuelve a escribir. No toca los bloques que genera tools/i18n.mjs
 * (<!-- i18n:generated:* -->), la navegación ni el selector de idioma.
 *
 * Uso:  node tools/redesign-patch.mjs [--dry]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const WEB = join(ROOT, 'web');
const DRY = process.argv.includes('--dry');

const cfg = JSON.parse(readFileSync(join(ROOT, 'i18n', 'locales.json'), 'utf8'));
const BASE = (cfg.site.base_url || '').replace(/\/+$/, '');
if (!BASE) { console.error('FALLO: site.base_url vacío en i18n/locales.json'); process.exit(1); }

const OG = BASE + '/assets/brand/og-cover.jpg';
const OG_ALT = {
  es: 'Logotipo TAMV ONLINE en cromo y emblema del colibrí sobre fondo azul profundo, con la línea «Red independiente de investigación, tecnología y memoria».',
  en: 'The chrome TAMV ONLINE wordmark and the hummingbird emblem on a deep blue field, with the line "Independent research, technology and memory network".',
};

const files = [];
for (const loc of cfg.locales) {
  const dir = join(WEB, loc.prefix);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) if (f.endsWith('.html')) files.push({ abs: join(dir, f), rel: loc.prefix + f, code: loc.code });
}

const report = [];

function patchPage({ abs, rel, code }) {
  const src = readFileSync(abs, 'utf8');
  let html = src;
  const done = [];
  const isEn = code === 'en';

  // Corrección de una pasada anterior que duplicó el directorio: el prefijo
  // capturado en src="assets/mark.svg" ya incluye «assets/».
  const fixed = html.replace(/assets\/assets\/brand\//g, 'assets/brand/');
  if (fixed !== html) { html = fixed; done.push('prefijo-duplicado-corregido'); }

  // P0 — migración al encuadre recortado en píxeles (tools/brand-build.py).
  // El recorte por `object-fit` cortaba «TECNOLOGÍA AVANZADA MEXICANA
  // VERSÁTIL» a media altura según el ancho del contenedor. Sólo se sustituye
  // el lockup corto de cabecera y pie (alt="TAMV Online Network"); el panel de
  // identidad conserva el logotipo oficial completo con su descargo.
  let swapped = 0;
  html = html.replace(
    /<img class="brand-art brand-art--lockup" src="([^"]*?)brand\/tamv-wordmark\.webp" alt="TAMV Online Network">/g,
    (_m, pfx) => { swapped++; return `<img class="brand-art brand-art--mark" src="${pfx}brand/tamv-mark.webp" alt="TAMV Online Network">`; });
  const heroSwap = html.replace(
    /(<figure class="hero-figure">\s*<img class="brand-art brand-art--emblem" src="[^"]*?brand\/)isabella-hummingbird\.webp"/,
    (_m, a) => { swapped++; return `${a}emblem-mark.webp"`; });
  if (heroSwap !== html) html = heroSwap;
  if (swapped) done.push(`encuadre-pixels(${swapped})`);

  // P1 — color de tema alineado con el negro azabache del lockup.
  if (html.includes('content="#08111c"')) {
    html = html.replace('<meta name="theme-color" content="#08111c">', '<meta name="theme-color" content="#03060b">');
    done.push('theme-color');
  }

  // P2 — tipografía autohospedada antes que la hoja del sitio.
  if (!html.includes('fonts.css')) {
    const re = /<link rel="stylesheet" href="([^"]*?)site\.css">/;
    if (re.test(html)) {
      html = html.replace(re, (m, pfx) => `<link rel="stylesheet" href="${pfx}fonts.css">\n${m}`);
      done.push('fonts.css');
    } else done.push('!fonts.css: no hay enlace a site.css');
  }

  // P3 — Open Graph completo: muchas páginas interiores solo tenían <title>
  // y description, así que al compartirlas no aparecía ni título ni imagen.
  const title = (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1];
  const desc = (html.match(/<meta name="description" content="([^"]*)">/) || [, ''])[1];
  const ogMissing = [];
  if (title && !html.includes('property="og:title"')) ogMissing.push(`<meta property="og:title" content="${title}">`);
  if (desc && !html.includes('property="og:description"')) ogMissing.push(`<meta property="og:description" content="${desc}">`);
  if (!html.includes('property="og:type"')) ogMissing.unshift('<meta property="og:type" content="website">');
  if (!html.includes('property="og:image"')) {
    ogMissing.push(
      `<meta property="og:image" content="${OG}">`,
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      `<meta property="og:image:alt" content="${OG_ALT[code] ?? OG_ALT.es}">`,
    );
  }
  if (ogMissing.length) {
    const anchor = html.match(/<meta name="description" content="[^"]*">/);
    if (anchor) {
      html = html.replace(anchor[0], anchor[0] + '\n' + ogMissing.join('\n'));
      done.push('og:' + (ogMissing.length) + '-campos');
    } else done.push('!og: sin ancla de description');
  }
  if (html.includes('name="twitter:card"') && !html.includes('name="twitter:image"')) {
    html = html.replace(/<meta name="twitter:card" content="([^"]*)">/,
      (m) => `${m}\n<meta name="twitter:image" content="${OG}">`);
    done.push('twitter:image');
  }

  // P4 — cabecera: el lockup corto (TAMV + ONLINE) en lugar de la marca geométrica.
  const brandRe = /(<a class="brand" href="index.html">\s*)(<img src="([^"]*?)mark\.svg"[^>]*>)(\s*)(<span class="brand-text">[\s\S]*?<\/span>\s*<\/span>)/;
  const brand = html.match(brandRe);
  if (brand) {
    html = html.replace(brandRe, (_m, a, _img, pfx) => `${a}<img class="brand-art brand-art--mark" src="${pfx}brand/tamv-mark.webp" alt="TAMV Online Network">`);
    done.push('brand-cabecera');
  } else if (html.includes('brand-art--mark')) done.push('brand-cabecera ya');
  else done.push('!brand-cabecera: estructura no reconocida');

  // P5 — pie: lockup corto + lema, sin duplicar la marca.
  const footRe = /(<div class="footer-brand">\s*)(<img src="([^"]*?)mark\.svg"[^>]*>)(\s*)<span><b>([^<]*)<\/b><span class="mono-note">([^<]*)<\/span><\/span>/;
  const foot = html.match(footRe);
  if (foot) {
    html = html.replace(footRe, (_m, a, _img, pfx, _s, name, tagline) =>
      `${a}<img class="brand-art brand-art--mark" src="${pfx}brand/tamv-mark.webp" alt="${name}">\n          <span class="tagline">${tagline}</span>`);
    done.push('brand-pie');
  } else if (html.includes('class="tagline"')) done.push('brand-pie ya');
  else done.push('!brand-pie: estructura no reconocida');

  // P6 — hero de la portada: emblema del colibrí sobre la ficha institucional.
  if (basename(abs) === 'index.html' && !html.includes('hero-figure')) {
    const re = /(\s*)(<aside class="record-card">)/;
    if (re.test(html)) {
      const alt = isEn
        ? 'A blue metal hummingbird surrounded by luminous orbits, with a glowing heart at its centre: the ISABELLA VILLASENOR V6 emblem'
        : 'Colibrí de metal azul rodeado de órbitas luminosas, con un corazón luminoso en el centro: emblema ISABELLA VILLASEÑOR V6';
      const cap = isEn
        ? 'Emblem ISABELLA VILLASENOR V6 — quantum hummingbird, luminous heart'
        : 'Emblema ISABELLA VILLASEÑOR V6 — colibrí cuántico de corazón luminoso';
      html = html.replace(re, (_m, nl, aside) =>
        `\n${' '.repeat(8)}<figure class="hero-figure">\n` +
        `          <img class="brand-art brand-art--emblem" src="${isEn ? '../' : ''}assets/brand/emblem-mark.webp" alt="${alt}">\n` +
        `          <figcaption>${cap}</figcaption>\n` +
        `        </figure>${nl}${aside}`);
      done.push('emblema-hero');
    } else done.push('!emblema-hero: no hay record-card');
  }

  if (html !== src) {
    if (!DRY) writeFileSync(abs, html.replace(/\r\n/g, '\n'), 'utf8');
    report.push(`${rel.padEnd(24)} ${done.join(', ')}`);
  } else {
    report.push(`${rel.padEnd(24)} sin cambios`);
  }
}

for (const f of files) patchPage(f);
console.log(report.join('\n'));
console.log(`\n${DRY ? 'SIMULACIÓN' : 'APLICADO'} sobre ${files.length} página(s).`);
