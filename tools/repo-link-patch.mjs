/**
 * repo-link-patch.mjs — enlaza el repositorio del sitio desde el propio sitio.
 *
 * Qué hace (y sólo eso, para que sea repetible):
 *   F  pie de página: "GitHub" pasa a "Cuenta de GitHub" / "GitHub account" y se
 *      añade una línea al repositorio de la fuente. Un <li> por página.
 *   J  web/index.html y web/en/index.html: segundo bloque JSON-LD con un nodo
 *      schema.org/CodeRepository que declara la fuente del sitio.
 *   O  web/organization.json: se reordena a @graph (nodo de la organización +
 *      el mismo nodo CodeRepository). El `sameAs` de la organización sigue vacío
 *      a propósito: la cuenta de GitHub es del fundador, no de la red.
 *   R  web/ror.html y web/en/ror.html: la frase de límite de afirmación pasa a
 *      señalar que la fuente del sitio es pública y está licenciada.
 *
 * Idempotente: si el archivo ya contiene la URL del repositorio, se salta.
 * Uso: node tools/repo-link-patch.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const REPO = 'https://github.com/OsoPanda1/WEBINSTITUCIONAL-TAMVONLINE';
const DRY = process.argv.includes('--dry');
const changes = [];

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function write(rel, txt) {
  if (DRY) { changes.push(rel + ' (dry)'); return; }
  fs.writeFileSync(path.join(ROOT, rel), txt);
  changes.push(rel);
}

/* ── F — pies de página ────────────────────────────────────────────── */
const FOOTER_RE = /^([ \t]*)<li><a href="https:\/\/github\.com\/OsoPanda1" rel="noopener noreferrer" target="_blank">GitHub<\/a><\/li>$/m;
let footers = 0;
for (const dir of [['web', false], ['web/en', true]]) {
  for (const f of fs.readdirSync(path.join(ROOT, dir[0])).sort()) {
    if (!f.endsWith('.html')) continue;
    const rel = dir[0] + '/' + f;
    if (fs.statSync(path.join(ROOT, rel)).isDirectory()) continue;
    let txt = read(rel);
    if (txt.includes(`<li><a href="${REPO}"`)) continue;
    const m = txt.match(FOOTER_RE);
    if (!m) continue;
    const pad = m[1];
    const account = dir[1] ? 'GitHub account' : 'Cuenta de GitHub';
    const source = dir[1] ? 'Site source' : 'Repositorio del sitio';
    txt = txt.replace(m[0],
      `${pad}<li><a href="https://github.com/OsoPanda1" rel="noopener noreferrer" target="_blank">${account}</a></li>\n` +
      `${pad}<li><a href="${REPO}" rel="noopener noreferrer" target="_blank">${source}</a></li>`);
    write(rel, txt);
    footers++;
  }
}

/* ── nodo CodeRepository compartido ────────────────────────────────── */
const repoNode = {
  '@type': 'CodeRepository',
  '@id': REPO,
  'name': 'WEBINSTITUCIONAL-TAMVONLINE',
  'codeRepository': REPO,
  'url': REPO,
  'producer': { '@id': '#tamv-org' },
  'maintainer': { '@id': '#tamv-org' },
  'programmingLanguage': ['HTML', 'CSS', 'JavaScript', 'Python'],
  'runtimePlatform': 'Navegador; Node.js y Python solo en las herramientas de construcción',
  'license': 'https://opensource.org/licenses/MIT',
  'dateCreated': '2026-11-01',
  'description': 'Fuente del sitio web institucional de TAMV Online Network: 24 páginas estáticas en español e inglés, el pipeline de idiomas y el generador de la marca. El MIT cubre únicamente el código; los logotipos y sus derivados quedan reservados (archivo NOTICE) y las tipografías autoalojadas siguen bajo SIL Open Font License 1.1.'
};

const LD_BLOCK = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CodeRepository",
  "@id": "${REPO}",
  "name": "WEBINSTITUCIONAL-TAMVONLINE",
  "codeRepository": "${REPO}",
  "url": "${REPO}",
  "license": "https://opensource.org/licenses/MIT",
  "dateCreated": "2026-11-01",
  "programmingLanguage": ["HTML", "CSS", "JavaScript", "Python"],
  "runtimePlatform": "Navegador; Node.js y Python solo en las herramientas de construcción",
  "producer": { "@type": "ResearchOrganization", "name": "TAMV Online Network", "url": "https://tamvonline-t78x4mdi9wa.qoder.website" },
  "description": "Fuente del sitio web institucional de TAMV Online Network: 24 páginas estáticas en español e inglés, el pipeline de idiomas y el generador de la marca. El MIT cubre únicamente el código; los logotipos y sus derivados quedan reservados (archivo NOTICE) y las tipografías autoalojadas siguen bajo SIL Open Font License 1.1."
}
</script>`;

/* ── J — bloque JSON-LD en las portadas ────────────────────────────── */
let ld = 0;
for (const rel of ['web/index.html', 'web/en/index.html']) {
  let txt = read(rel);
  if (txt.includes('"@type": "CodeRepository"')) continue;
  const anchor = '}\n</script>\n<!-- i18n:generated:start -->';
  if (!txt.includes(anchor)) throw new Error(rel + ': falta el ancla del bloque generado');
  txt = txt.replace(anchor, '}\n</script>\n' + LD_BLOCK + '\n<!-- i18n:generated:start -->');
  write(rel, txt);
  ld++;
}

/* ── O — organization.json a @graph ────────────────────────────────── */
{
  const rel = 'web/organization.json';
  const doc = JSON.parse(read(rel));
  if (doc['@graph']) {
    changes.push(rel + ' (ya en @graph)');
  } else {
    const { '@context': ctx, ...org } = doc;
    org['@id'] = '#tamv-org';
    const graph = {
      '@context': 'https://schema.org',
      '@graph': [org, repoNode]
    };
    write(rel, JSON.stringify(graph, null, 2) + '\n');
  }
}

/* ── R — límite de la afirmación en las páginas ROR ────────────────── */
const ROR = {
  'web/ror.html': [
    'ordena la evidencia de afiliación. La decisión sigue siendo de ROR.</p>',
    'ordena la evidencia de afiliación. La decisión sigue siendo de ROR. La fuente de este sitio —incluidos el pipeline de idiomas y el generador de la marca— es pública y está licenciada en <a href="' + REPO + '" rel="noopener noreferrer" target="_blank">github.com/OsoPanda1/WEBINSTITUCIONAL-TAMVONLINE</a>: se puede verificar cómo se construye sin depender de nuestra palabra.</p>'
  ],
  'web/en/ror.html': [
    'and orders the affiliation evidence. The decision still belongs to ROR.</p>',
    'and orders the affiliation evidence. The decision still belongs to ROR. The source of this site —including the language pipeline and the brand generator— is public and licensed at <a href="' + REPO + '" rel="noopener noreferrer" target="_blank">github.com/OsoPanda1/WEBINSTITUCIONAL-TAMVONLINE</a>, so a curator can check how it was built without taking our word for it.</p>'
  ]
};
let ror = 0;
for (const [rel, [from, to]] of Object.entries(ROR)) {
  let txt = read(rel);
  if (txt.includes(to)) continue;
  if (!txt.includes(from)) throw new Error(rel + ': no aparece la frase de límite esperada');
  txt = txt.replace(from, to);
  write(rel, txt);
  ror++;
}

console.log(`pies de página: ${footers} · portadas JSON-LD: ${ld} · páginas ROR: ${ror}`);
console.log(changes.join('\n'));
