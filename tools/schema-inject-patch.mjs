/* tools/schema-inject-patch.mjs — nodo ResearchOrganization embebido en las 24 páginas.
   Fuente de datos: web/organization.json (nodo ResearchOrganization) y el
   base_url de i18n/locales.json. La herramienta proyecta, no inventa.

   Por qué. Un curador o un indexador que llega a cualquier página —no sólo a la
   portada— debe leer la misma entidad: nombre oficial, alias bajo el que existen
   sus registros, sede, fecha declarada y el estado real de cada identificador.
   Hasta ahora el bloque vivía en las dos portadas y el resto del sitio ofrecía
   organization.json sólo como `<link rel="alternate">`.

   Qué se corrige de paso.
   - `@id` absoluto idéntico en todas las páginas (BASE/organization.json#tamv-org):
     varias páginas describen una sola entidad en lugar de redefinirla.
   - `url` y `logo` apuntan a recursos que existen y están servidos. No se declara
     `https://tamvonline.org`: el DNS responde NXDOMAIN (org.afilias, medido el
     2026-11-02) y el sitio no controla ese nombre. Tampoco un archivo de logo que
     no está en el árbol.
   - `alternateName` incluye «TAMV ONLINE», la cadena con la que existen los
     registros en Zenodo/DataCite, para que el indexador la vincule al nombre
     oficial. Es un alias declarado, no un rename: la página de producción sigue
     listándola como variante pendiente de normalización.
   - Se conservan las advertencias honestas del registro (ROR no asignado, ISNI no
     verificable, ORCID identificando a la persona y no a la organización). Quitarlas
     para "limpiar" el esquema sería justo lo que la ficha existe para evitar.
   - `sameAs` de la organización se omite mientras esté vacío a propósito: la cuenta
     de GitHub es del fundador, no de la red.

   Uso (Node 24, sin dependencias):
     node tools/schema-inject-patch.mjs            # aplica
     node tools/schema-inject-patch.mjs --check     # informa sin escribir
     node tools/schema-inject-patch.mjs --print     # imprime el bloque generado
   Idempotente: reescribe sólo el interior de los marcadores
   Idempotencia medida, no afirmada: tools/schema-audit.mjs (S1 a S8) es la puerta
   que comprueba el resultado pagina por pagina.
   <!-- schema:tamv-org:start|end -->.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');
const CHECK = process.argv.includes('--check');
const PRINT = process.argv.includes('--print');

const BEGIN = '<!-- schema:tamv-org:start -->';
const END = '<!-- schema:tamv-org:end -->';
/* El anclaje del generador i18n esta al inicio de linea: exigir una
   sangria en la busqueda haria que ninguna pagina lo encontrara. */
const GEN_ANCHOR = '<!-- i18n:generated:start -->';

const locales = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n/locales.json'), 'utf8'));
const BASE = String(locales.site.base_url).replace(/\/+$/, '');
const graph = JSON.parse(fs.readFileSync(path.join(WEB, 'organization.json'), 'utf8'))['@graph'];
const org = graph.find(n => n['@type'] === 'ResearchOrganization');
if (!org) throw new Error('organization.json no tiene nodo ResearchOrganization');

const ORG_ID = BASE + '/organization.json#tamv-org';

/* Proyección: se toman los campos del registro; si un día falta uno, se omite en
   lugar de rellenarse con un valor inventado. */
const block = {
  '@context': 'https://schema.org',
  '@type': 'ResearchOrganization',
  '@id': ORG_ID,
  name: org.name,
};
if (org.alternateName) block.alternateName = org.alternateName;
block.url = BASE + '/index.html';
block.logo = BASE + '/assets/brand/emblem-mark.webp';
block.image = BASE + '/assets/brand/og-cover.jpg';
if (org.description) block.description = org.description;
if (org.slogan) block.slogan = org.slogan;
if (org.foundingDate) block.foundingDate = org.foundingDate;
if (org.address) block.address = org.address;
if (org.areaServed) block.areaServed = org.areaServed;
if (org.knowsAbout) block.knowsAbout = org.knowsAbout;
if (org.knowsLanguage) block.knowsLanguage = org.knowsLanguage;
if (org.founder) block.founder = org.founder;
if (org.contactPoint) block.contactPoint = org.contactPoint;
if (org.identifier) block.identifier = org.identifier;
if (org.subjectOf) block.subjectOf = org.subjectOf;
/* Sin sameAs mientras sea []; y sin legalName cuando es null: un campo vacío o
   nulo en el bloque embebido sólo añade ruido al grafo. */
if (org.sameAs && org.sameAs.length) block.sameAs = org.sameAs;

const json = JSON.stringify(block, null, 2);
const snippet = BEGIN + '\n  <script type="application/ld+json">\n' +
  json.split('\n').map((l) => '  ' + l).join('\n') + '\n  </script>\n  ' + END;

if (PRINT) { console.log(json); }

/* El bloque de repositorio de las portadas referenciaba a la organización por
   nombre y URL suelta; se convierte a una referencia por @id para que el grafo
   defina la entidad una sola vez. */
const PRODUCER_RE = /"(producer|maintainer)":\s*\{\s*"@type":\s*"ResearchOrganization"[^}]*\}/g;

const pages = [];
for (const f of fs.readdirSync(WEB)) if (f.endsWith('.html')) pages.push(f);
for (const f of fs.readdirSync(path.join(WEB, 'en'))) if (f.endsWith('.html')) pages.push('en/' + f);

/* El orden importa y por eso esta escrito aqui, no en la practica:
   1. la region entre marcadores se aparta intacta;
   2. fuera de esa region se borra el bloque manual de portada y se referencian
      producer/maintainer por @id;
   3. la region se vuelve a colocar en su sitio con el bloque generado.
   Si el paso 1 no apartara la region, el paso 2 reconoceria el bloque generado
   como un resto manual (mismo @type, sin @graph), lo borraria y el paso 3 lo
   reescribiria: los bytes finales serian iguales, el contador mentiria y la
   herramienta se destruiria a si misma en cuanto le faltara un marcador. */

let inyectados = 0, actualizados = 0, legacy = 0, referenciados = 0, sinAncla = [];

function splitRegion(raw) {
  const b = raw.indexOf(BEGIN), e = raw.indexOf(END);
  if (b < 0 || e <= b) return { head: raw, tail: '', has: false };
  return { head: raw.slice(0, b), tail: raw.slice(e + END.length), has: true };
}

/* Dos pasadas de limpieza, cada una sobre un segmento que no contiene el
   bloque generado. Se cuentan las eliminaciones para que el informe no sea
   un deseo: si el grafo del repo cambia de forma, aqui se ve. */
function cleanOutside(str) {
  let out = str.replace(/[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, (m) => {
    const body = m.replace(/^[\s\S]*?ld\+json">/, '').replace(/<\/script>[\s\S]*$/, '');
    let o; try { o = JSON.parse(body); } catch { return m; }
    if (o && o['@type'] === 'ResearchOrganization' && !o['@graph']) { legacy++; return ''; }
    return m;
  });
  out = out.replace(PRODUCER_RE, (m, key) => {
    referenciados++;
    return `"${key}": { "@id": "${ORG_ID}" }`;
  });
  return out;
}

for (const rel of pages) {
  const file = path.join(WEB, rel);
  const raw = fs.readFileSync(file, 'utf8');
  const { head, tail, has } = splitRegion(raw);
  let t;

  if (has) {
    /* Las dos juntas se normalizan a un unico salto de linea: sin esto cada
       pasada dejaba un linea en blanco extra despues del marcador de cierre y
       la herramienta nunca convergia a los mismos bytes. */
    const headN = cleanOutside(head).replace(/[ \t]*\n+$/, '\n');
    const tailN = cleanOutside(tail).replace(/^\n+/, '\n');
    t = headN + snippet + tailN;
    actualizados++;
  } else {
    const body = cleanOutside(head + tail);
    const anchor = body.indexOf(GEN_ANCHOR);
    if (anchor < 0) { sinAncla.push(rel); continue; }
    t = body.slice(0, anchor) + snippet + '\n' + body.slice(anchor);
    inyectados++;
  }

  if (t !== raw && !CHECK) fs.writeFileSync(file, t, 'utf8');
}

console.log((CHECK ? '[check] ' : '') +
  `paginas: ${pages.length} · insertadas: ${inyectados} · reescritas: ${actualizados} · ` +
  `bloque legacy eliminado: ${legacy} · producer/maintainer por @id: ${referenciados}` +
  (sinAncla.length ? ' · sin ancla de generacion: ' + sinAncla.join(', ') : ''));
