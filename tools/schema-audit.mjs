#!/usr/bin/env node
/* TAMV Online Network — auditor del JSON-LD embebido en las paginas
 *
 * tools/schema-inject-patch.mjs proyecta el nodo ResearchOrganization de
 * web/organization.json en las 26 paginas. Este script comprueba que la
 * proyeccion no miente, que es la unica clase de error que un generador
 * idempotente puede producir en silencio: un bloque que se escribe igual en
 * todas las paginas pero que afirma algo que el repo no sostiene.
 *
 * Uso (Node 24, sin dependencias):
 *   node tools/schema-audit.mjs            informe completo
 *   node tools/schema-audit.mjs --quiet    solo errores, sin el detalle
 *
 * Devuelve codigo de salida distinto de cero si algo falla, para poder usarlo
 * como puerta de publicacion junto con tools/map-data-audit.mjs.
 *
 *   S1 presencia — cada pagina tiene exactamente un bloque entre marcadores.
 *   S2 parseo — el interior es JSON valido con @context schema.org.
 *   S3 una sola entidad — el @id es identico en todas las paginas y apunta al
 *      archivo que existe; dos paginas no definen dos organizaciones.
 *   S4 campos — el bloque coincide campo por campo con la proyeccion que
 *      dicta organization.json, incluida la advertencia honesta de que el
 *      ORCID es de la persona y no de la red.
 *   S5 recursos — url, logo e image apuntan a archivos que existen en web/.
 *   S6 dominio — nada del bloque afirma un dominio que el sitio no controla.
 *   S7 grafo — el nodo CodeRepository referencia la organizacion por @id.
 *   S8 derive — generador y auditor proyectan los mismos campos: si uno de los
 *      dos cambia sin el otro, el bloqueo falla en vez de divergir en silencio.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const WEB = path.join(ROOT, 'web');
const QUIET = process.argv.includes('--quiet');

const BEGIN = '<!-- schema:tamv-org:start -->';
const END = '<!-- schema:tamv-org:end -->';
const OPEN = '<script type="application/ld+json">';
const CLOSE = '</script>';

const errors = [];
const warnings = [];
const ok = [];
const fail = (rule, msg) => errors.push(rule + ' · ' + msg);
const warn = (rule, msg) => warnings.push(rule + ' · ' + msg);
const pass = (rule, msg) => ok.push(rule + ' · ' + msg);

const locales = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n/locales.json'), 'utf8'));
const BASE = String(locales.site.base_url).replace(/\/+$/, '');
const graph = JSON.parse(fs.readFileSync(path.join(WEB, 'organization.json'), 'utf8'))['@graph'];
const org = graph.find((n) => n['@type'] === 'ResearchOrganization');
const repo = graph.find((n) => n['@type'] === 'CodeRepository');
if (!org) throw new Error('organization.json no tiene nodo ResearchOrganization');

const ORG_ID = BASE + '/organization.json#tamv-org';

const pages = [];
for (const f of fs.readdirSync(WEB)) if (f.endsWith('.html')) pages.push(f);
for (const f of fs.readdirSync(path.join(WEB, 'en'))) if (f.endsWith('.html')) pages.push('en/' + f);

/* El mismo juego de campos que proyecta el generador. S8 comprueba que esta
   lista y la del generador no puedan separarse en silencio: si alguien anade
   un campo a organization.json y olvida el generador, S4 lo reclama; si el
   generador inventa un campo, S4 tambien. */
const PROJECTED = ['name', 'alternateName', 'description', 'slogan', 'foundingDate',
  'address', 'areaServed', 'knowsAbout', 'knowsLanguage', 'founder',
  'contactPoint', 'identifier', 'subjectOf'];

/* Campos que no vienen de organization.json sino de la URL servida: la ficha
   no puede llevar un dominio porque el dominio propio todavia no existe. */
const DERIVED = {
  url: BASE + '/index.html',
  logo: BASE + '/assets/brand/emblem-mark.webp',
  image: BASE + '/assets/brand/og-cover.jpg',
};

const blocks = new Map();

for (const rel of pages) {
  const html = fs.readFileSync(path.join(WEB, rel), 'utf8');

  /* S1 presencia */
  const starts = html.split(BEGIN).length - 1;
  const ends = html.split(END).length - 1;
  if (starts !== 1 || ends !== 1) {
    fail('S1', `${rel}: ${starts} aperturas y ${ends} cierres del marcador schema:tamv-org (se espera 1 y 1)`);
    continue;
  }

  /* S2 parseo */
  const from = html.indexOf(BEGIN) + BEGIN.length;
  const to = html.indexOf(END);
  const region = html.slice(from, to);
  const o = region.indexOf(OPEN);
  const c = region.indexOf(CLOSE, o);
  if (o < 0 || c < 0) { fail('S2', `${rel}: no hay script ld+json dentro de los marcadores`); continue; }
  let node;
  try { node = JSON.parse(region.slice(o + OPEN.length, c)); }
  catch (err) { fail('S2', `${rel}: el JSON-LD embebido no parsea (${err.message})`); continue; }
  blocks.set(rel, node);
  if (node['@context'] !== 'https://schema.org') fail('S2', `${rel}: @context '${node['@context']}'`);
  if (node['@type'] !== 'ResearchOrganization') fail('S2', `${rel}: @type '${node['@type']}'`);

  /* S3 una sola entidad */
  if (node['@id'] !== ORG_ID) fail('S3', `${rel}: @id '${node['@id']}' distinto de '${ORG_ID}'`);

  /* S4 campos proyectados */
  for (const key of PROJECTED) {
    const want = org[key];
    const got = node[key];
    if (want === undefined) { if (got !== undefined) fail('S4', `${rel}: el bloque publica '${key}' que no esta en organization.json`); continue; }
    if (got === undefined) { fail('S4', `${rel}: falta '${key}', que organization.json si declara`); continue; }
    if (JSON.stringify(want) !== JSON.stringify(got)) fail('S4', `${rel}: '${key}' difiere de organization.json`);
  }
  /* Los tres campos derivados no pueden venir de la ficha: el registro de la
     organizacion vive en el dominio que el sitio controla hoy. */
  for (const [key, want] of Object.entries(DERIVED)) {
    if (node[key] === undefined) fail('S4', `${rel}: el bloque omite '${key}', que el generador siempre deriva de la URL servida`);
    else if (node[key] !== want) fail('S4', `${rel}: '${key}' = '${node[key]}' en lugar de '${want}'`);
  }
  const knownKeys = new Set([...PROJECTED, ...Object.keys(DERIVED)]);
  const extra = Object.keys(node).filter((k) => !k.startsWith('@') && !knownKeys.has(k));
  if (extra.length) fail('S4', `${rel}: campos fuera de la proyeccion: ${extra.join(', ')}`);

  /* Los avisos honestos del registro no son decoracion: si alguien los "limpia",
     el esquema pasa a afirmar identificadores que no existen. */
  const ids = (node.identifier || []).map((x) => `${x.propertyID}=${x.value}`);
  if (!ids.some((x) => /^ROR=no asignado$/.test(x))) fail('S4', `${rel}: el bloque ya no declara que el ROR esta sin asignar`);
  const orcid = (node.identifier || []).find((x) => x.propertyID === 'ORCID');
  if (!orcid || !/PERSONAL|persona/i.test(orcid.description || '')) fail('S4', `${rel}: el ORCID del fundador perdio la advertencia de que no identifica a la organizacion`);
  if (node.legalName !== undefined && node.legalName !== null) warn('S4', `${rel}: legalName publicado como '${node.legalName}' cuando el registro lo declara null`);

  /* S6 dominio */
  const blob = JSON.stringify(node);
  if (/tamvonline\.org/i.test(blob)) fail('S6', `${rel}: el bloque afirma tamvonline.org, dominio cuyo DNS responde NXDOMAIN y el sitio no controla`);
  if (blob.includes(BASE) === false) fail('S6', `${rel}: ningun campo del bloque usa la URL del sitio servido (${BASE})`);
}

/* S3 global: una entidad, no veintiseis */
{
  const ids = new Set([...blocks.values()].map((n) => n['@id']));
  if (blocks.size === pages.length && ids.size === 1) pass('S3', `${blocks.size} paginas comparten el @id ${[...ids][0]}`);
}

/* S5 recursos que existen */
{
  const sample = [...blocks.values()][0];
  if (sample) {
    const checks = [['url', sample.url], ['logo', sample.logo], ['image', sample.image]];
    for (const [key, value] of checks) {
      if (typeof value !== 'string' || !value.startsWith(BASE + '/')) { fail('S5', `${key} no apunta al sitio servido: '${value}'`); continue; }
      const relPath = value.slice(BASE.length + 1).split('#')[0];
      let existe = true;
      try { fs.readFileSync(path.join(WEB, relPath)); } catch { existe = false; }
      if (!existe) fail('S5', `${key} apunta a ${relPath}, que no existe en web/`);
    }
    if (!errors.some((e) => e.startsWith('S5'))) pass('S5', 'url, logo e image resuelven a archivos presentes en el arbol');
  }
}

/* S7 el repositorio referencia a la organizacion, no la redefina */
{
  /* Dentro de organization.json la referencia correcta es relativa (#tamv-org):
     resuelve contra la URL del propio archivo, que es el mismo nodo que el
     @id absoluto que llevan las paginas. Aceptar solo una de las dos formas
     pondria el auditor a discutir con el modelo en lugar de con los datos. */
  const FORMS = new Set(['#tamv-org', ORG_ID]);
  if (!repo) fail('S7', 'organization.json no tiene nodo CodeRepository');
  else {
    if (org['@id'] !== '#tamv-org') fail('S7', `organization.json declara la organizacion con @id '${org['@id']}', el auditor esperaba '#tamv-org'`);
    for (const key of ['producer', 'maintainer']) {
      const v = repo[key];
      if (!v || !FORMS.has(v['@id'])) fail('S7', `CodeRepository.${key} no referencia por @id a la organizacion (leido ${v && v['@id']})`);
      if (v && v['@type']) fail('S7', `CodeRepository.${key} redefine la organizacion en lugar de referirla por @id`);
    }
    for (const rel of ['index.html', 'en/index.html', 'produccion.html', 'en/outputs.html']) {
      const html = fs.readFileSync(path.join(WEB, rel), 'utf8');
      const m = html.match(/"(producer|maintainer)"\s*:\s*\{\s*"@type"\s*:\s*"ResearchOrganization"/);
      if (m) fail('S7', `${rel}: un nodo CodeRepository embebido sigue redefiniendo la organizacion por nombre`);
    }
    if (!errors.some((e) => e.startsWith('S7'))) pass('S7', 'CodeRepository enlaza la organizacion por @id en la ficha y en las portadas');
  }
}

/* S8 generador y auditor no pueden separarse */
{
  const gen = fs.readFileSync(path.join(ROOT, 'tools', 'schema-inject-patch.mjs'), 'utf8');
  /* Se leen las tres formas con las que el generador puede tomar un campo de la
     ficha: asignacion, literal del objeto y guarda condicional. La unica
     lectura que no se proyecta es sameAs, que hoy esta vacia a proposito. */
  const reads = new Set();
  const SHAPES = /(?:if \(org\.([A-Za-z]+)\) block\.[A-Za-z]+ =)|(?:block\.([A-Za-z]+) = org\.[A-Za-z]+;)|(?:^[ \t]+([A-Za-z]+): org\.[A-Za-z]+,$)/gm;
  for (const m of gen.matchAll(SHAPES)) reads.add(m[1] || m[2] || m[3]);
  const projected = [...reads].filter((k) => k !== 'sameAs');
  if (reads.has('sameAs') && !/if \(org\.sameAs && org\.sameAs\.length\)/.test(gen)) {
    fail('S8', 'el generador lee sameAs sin su guarda de longitud: publicaria una lista vacia y la cuenta de GitHub es del fundador, no de la red');
  }
  const derived = [...gen.matchAll(/\nblock\.(url|logo|image) = BASE \+ '([^']+)'/g)].map((m) => [m[1], m[2]]);
  if (projected.sort().join(',') !== PROJECTED.slice().sort().join(',')) {
    fail('S8', `el generador proyecta [${projected.join(', ')}] y el auditor esperaba [${PROJECTED.join(', ')}]`);
  }
  if (derived.length !== Object.keys(DERIVED).length) {
    fail('S8', `el generador deriva ${derived.length} campos dependientes de la URL y el auditor conoce ${Object.keys(DERIVED).length}`);
  }
  derived.forEach(([key, value]) => {
    if (DERIVED[key] !== BASE + value) fail('S8', `el generador fija ${key} en ${BASE}${value} y el auditor en ${DERIVED[key]}`);
  });
  const beginDecl = /const BEGIN = '<!-- schema:tamv-org:start -->';/.test(gen) && /const END = '<!-- schema:tamv-org:end -->';/.test(gen);
  if (!beginDecl) fail('S8', 'los marcadores del generador ya no coinciden con los que busca este auditor');
  if (!errors.some((e) => e.startsWith('S8'))) pass('S8', 'generador y auditor proyectan exactamente los mismos campos');
}

/* S4 global */
{
  if (blocks.size === pages.length && !errors.some((e) => e.startsWith('S2') || e.startsWith('S4'))) {
    pass('S4', 'los ' + pages.length + ' bloques coinciden campo por campo con la proyeccion de organization.json');
  }
  if (blocks.size === pages.length && !errors.some((e) => e.startsWith('S1'))) pass('S1', `${pages.length} paginas con un unico bloque entre marcadores`);
}

/* ------------------------------------------------------------------ */
if (!QUIET) ok.forEach((l) => console.log('  ok  ' + l));
warnings.forEach((l) => console.log('  AVISO  ' + l));
errors.forEach((l) => console.log('  ERROR  ' + l));
console.log('');
console.log(`audit schema · ${pages.length} paginas · ${blocks.size} bloques · ${BASE}`);
console.log(`${errors.length} error(es), ${warnings.length} aviso(s)`);
if (errors.length) process.exitCode = 1;
