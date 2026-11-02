/* tools/evidence-links-patch.mjs — corregir los enlaces de evidencia del sitio.
 *
 * Nace de una verificación real (2026-11-02): cada enlace de apoyo del expediente
 * se abrió con navegador, no con un solo fetch. Tres cosas resultaron falsas y una
 * estaba mal apuntada:
 *
 * D1  El DOI de versión 10.5281/zenodo.19436662 está registrado en DataCite y es
 *     "findable", pero su ruta de aterrizaje en Zenodo devuelve 404 incluso en un
 *     navegador humano. El DOI de concepto 10.5281/zenodo.19436661 sí resuelve y
 *     lleva al registro 19436662. El sitio citaba el primero y etiquetaba la
 *     fila como «DOI resolvable»: se cita el de concepto y se declara el hecho.
 * D2  api.osf.io/v2/search/ ya no existe (404 con cualquier consulta). Los dos
 *     nodos se verifican por su propia ruta de API: /v2/nodes/t3wmy/ y
 *     /v2/nodes/rd47q/, ambas 200.
 * D3  publicationethics.org/core-practices redirige a «Code of conduct», y
 *     /core-practices-new y /guidance/core-practices son 404. La página vigente
 *     de los principios COPE es la de Transparency and Best Practice, revisada
 *     el 2026-10-29 con DOAJ, OASPA y WAME.
 * D4  En el JSON-LD de la portada en español, publishingPrinciples apuntaba a la
 *     ficha en inglés (organization.html) en vez de a organizacion.html.
 *
 * Reglas: 1 pasa el DOI de versión al de concepto en todo el árbol; 2 y 3
 * reescriben las celdas con texto distinto por idioma; 4 corrige el JSON-LD.
 * Idempotente: cada regla salta si su destino ya está aplicado.
 */
import fs from 'node:fs';
import path from 'node:path';

const WEB = 'web';
const DOI_V = '10.5281/zenodo.19436662';
const DOI_C = '10.5281/zenodo.19436661';
const RECORD = 'https://zenodo.org/records/19436662';
const COPE_NEW = 'https://publicationethics.org/guidance/guideline/principles-transparency-and-best-practice-scholarly-publishing';
const REL = 'rel="noopener noreferrer" target="_blank"';

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'assets') walk(f); continue; }
    if (/\.(html|json)$/.test(e.name)) files.push(f.replace(/\\/g, '/'));
  }
})(WEB);

const changes = [];
const read = f => fs.readFileSync(f, 'utf8');
const write = (f, t) => { fs.writeFileSync(f, t); changes.push(f); };

/* ── D1a · DOI de versión → DOI de concepto (URL, texto del ancla, captions) ── */
let nDoi = 0;
for (const f of files) {
  let t = read(f);
  const o = t;
  t = t.split('https://doi.org/' + DOI_V).join('https://doi.org/' + DOI_C);
  /* Solo el interior de un ancla. La primera versión de esta regla usaba
     '>DOI<', que también barría los <code>DOI</code> de las notas y convertía
     en falso el texto que explicaba el 404 de la ruta de versión. */
  t = t.split('>' + DOI_V + '</a>').join('>' + DOI_C + '</a>');
  t = t.split('DOI ' + DOI_V).join('DOI ' + DOI_C);
  t = t.split('doi ' + DOI_V).join('doi ' + DOI_C);
  if (t !== o) { write(f, t); nDoi++; }
}

/* ── D1b · la fila que afirmaba «DOI resolvable» dice ahora qué se verificó ──── */
const RESOLVE = {
  'web/investigacion.html': [
    `<a href="https://doi.org/${DOI_C}" ${REL}>${DOI_C}</a> · Zenodo record 19436662 <span class="tag tag-ok">DOI resolvable</span>`,
    `<a href="https://doi.org/${DOI_C}" ${REL}>${DOI_C}</a> · <a href="${RECORD}" ${REL}>registro Zenodo 19436662</a> <span class="tag tag-ok">DOI resolvable</span><p class="mono-note">El DOI de versión <code>${DOI_V}</code> está registrado en DataCite y figura como findable, pero su ruta de aterrizaje en Zenodo devuelve 404 incluso en navegador (verificado el 2026-11-02). Se cita el DOI de concepto porque resuelve.</p>`
  ],
  'web/en/research.html': [
    `<a href="https://doi.org/${DOI_C}" ${REL}>${DOI_C}</a> · Zenodo record 19436662 <span class="tag tag-ok">DOI resolvable</span>`,
    `<a href="https://doi.org/${DOI_C}" ${REL}>${DOI_C}</a> · <a href="${RECORD}" ${REL}>Zenodo record 19436662</a> <span class="tag tag-ok">DOI resolvable</span><p class="mono-note">The version DOI <code>${DOI_V}</code> is registered in DataCite and marked findable, but its Zenodo landing route returns 404 even in a browser (checked 2026-11-02). The concept DOI is cited because it resolves.</p>`
  ]
};
let nRes = 0;
for (const [f, [from, to]] of Object.entries(RESOLVE)) {
  let t = read(f);
  if (t.includes(to)) continue;
  if (!t.includes(from)) { console.error('NO COINCIDE: ' + f + ' — buscar «' + from.slice(0, 40) + '»'); process.exitCode = 1; continue; }
  write(f, t.replace(from, to)); nRes++;
}

/* ── D3 · COPE: la página vigente ya no se llama Core Practices ─────────────── */
const COPE = {
  'web/calidad.html': [
    ['<a href="https://publicationethics.org/core-practices" ' + REL + '>COPE · Core Practices</a>',
     '<a href="' + COPE_NEW + '" ' + REL + '>COPE · Principios de Transparencia y Buenas Prácticas</a>'],
    ['Integridad, transparencia, responsabilidad, rigor y rendición de cuentas en la publicación académica.</td>',
     'Integridad, transparencia, responsabilidad, rigor y rendición de cuentas en la publicación académica. Revisado el 2026-10-29 por COPE con DOAJ, OASPA y WAME.</td>']
  ],
  'web/en/quality.html': [
    ['<a href="https://publicationethics.org/core-practices" ' + REL + '>COPE · Core Practices</a>',
     '<a href="' + COPE_NEW + '" ' + REL + '>COPE · Principles of Transparency and Best Practice</a>'],
    ['Integrity, transparency, responsibility, rigor and accountability in academic publishing.</td>',
     'Integrity, transparency, responsibility, rigor and accountability in academic publishing. Revised 2026-10-29 by COPE with DOAJ, OASPA and WAME.</td>']
  ]
};
let nCope = 0;
for (const [f, pairs] of Object.entries(COPE)) {
  let t = read(f);
  if (t.includes(COPE_NEW) && /2026-10-29/.test(t)) continue;
  for (const [from, to] of pairs) {
    if (!t.includes(from)) { console.error('NO COINCIDE: ' + f + ' — ' + from.slice(0, 50)); process.exitCode = 1; continue; }
    t = t.replace(from, to);
  }
  write(f, t); nCope++;
}

/* ── D2 · OSF: el endpoint de búsqueda desapareció; se enlazan los nodos ────── */
const OSF_FROM = '<a href="https://api.osf.io/v2/search/?q=%22TAMV%20Online%20Network%22" ' + REL + '>OSF</a>';
const OSF_TO = '<a href="https://api.osf.io/v2/nodes/t3wmy/" ' + REL + '>OSF t3wmy</a>, <a href="https://api.osf.io/v2/nodes/rd47q/" ' + REL + '>OSF rd47q</a>';
let nOsf = 0;
for (const f of ['web/ror.html', 'web/en/ror.html']) {
  let t = read(f);
  if (t.includes(OSF_TO)) continue;
  if (!t.includes(OSF_FROM)) { console.error('NO COINCIDE: ' + f); process.exitCode = 1; continue; }
  write(f, t.replace(OSF_FROM, OSF_TO)); nOsf++;
}

/* ── D4 · publishingPrinciples de la portada en español ─────────────────────── */
{
  const f = 'web/index.html';
  let t = read(f);
  const bad = '"publishingPrinciples": "https://tamvonline-t78x4mdi9wa.qoder.website/organization.html"';
  const good = '"publishingPrinciples": "https://tamvonline-t78x4mdi9wa.qoder.website/organizacion.html"';
  if (t.includes(bad)) { write(f, t.replace(bad, good)); }
}

console.log('archivos tocados: ' + changes.length);
console.log('  DOI concepto: ' + nDoi + ' · fila resolvable: ' + nRes + ' · COPE: ' + nCope + ' · OSF: ' + nOsf);
console.log(changes.map(x => '  - ' + x).join('\n'));
