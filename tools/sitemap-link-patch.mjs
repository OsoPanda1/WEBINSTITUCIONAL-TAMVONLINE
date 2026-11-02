/* tools/sitemap-link-patch.mjs — declara el mapa del sitio dentro del documento.
   Alcance: web/*.html y web/en/*.html (24 páginas).

   Por qué. El host de Qoder Sites sirve los archivos estáticos con una tabla
   propia de extensión → Content-Type: html, css, js, json, txt, svg, webp, jpg y
   woff2 salen correctos, pero `.xml` no está en la tabla y cae en
   `application/octet-stream`. La cabecera la fija el Worker al subir el artefacto
   (se comprueba en vivo por `x-oss-*`), así que no hay entrada de `prepare_site`,
   manifiesto ni ruta de función que la cambie para la URL canónica `/sitemap.xml`:
   las funciones viven bajo `/functions/v1/app` y un archivo estático con ese nombre
   no puede ser reemplazado por una.

   Qué sí está en el documento: RFC 6579 registra la relación `sitemap` y su ejemplo
   declara el tipo con `type="application/xml"`. Enlazarlo desde cada página deja el
   medio del recurso escrito por quien lo controla — el sitio — y suma un canal de
   descubrimiento junto al `Sitemap:` de robots.txt. No es un parche cosmético: es
   la única capa donde este repositorio puede afirmar el tipo del archivo.

   Uso (Node 24, sin dependencias):
     node tools/sitemap-link-patch.mjs         # aplica
     node tools/sitemap-link-patch.mjs --check  # informa sin escribir
   Idempotente: si la página ya tiene rel="sitemap", no la toca.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');
const CHECK = process.argv.includes('--check');

const TARGETS = [];
for (const f of fs.readdirSync(WEB)) if (f.endsWith('.html')) TARGETS.push(f);
for (const f of fs.readdirSync(path.join(WEB, 'en'))) if (f.endsWith('.html')) TARGETS.push('en/' + f);

const LINK_ES = '<link rel="sitemap" type="application/xml" title="Mapa del sitio" href="/sitemap.xml">';
const LINK_EN = '<link rel="sitemap" type="application/xml" title="Site map" href="/sitemap.xml">';

let tocados = 0, omitidos = 0, sinCanon = [];
for (const rel of TARGETS) {
  const file = path.join(WEB, rel);
  const txt = fs.readFileSync(file, 'utf8');
  if (txt.includes('rel="sitemap"')) { omitidos++; continue; }
  const link = rel.startsWith('en' + path.sep) || rel.startsWith('en/') ? LINK_EN : LINK_ES;
  /* Se inserta junto al canonical, que es el bloque de enlaces de documento de
     todas las páginas; si alguna lo perdiera, el script lo avisa en vez de
     insertar a ciegas. */
  const m = /^([ \t]*)<link rel="canonical"[^\n]*\n/m.exec(txt);
  if (!m) { sinCanon.push(rel); continue; }
  const next = txt.slice(0, m.index) + m[0] + m[1] + link + '\n' + txt.slice(m.index + m[0].length);
  if (!CHECK) fs.writeFileSync(file, next, 'utf8');
  tocados++;
}

console.log((CHECK ? '[check] ' : '') + 'archivos tocados: ' + tocados + ' · ya enlazados: ' + omitidos +
  (sinCanon.length ? ' · sin canonical (revisar): ' + sinCanon.join(', ') : ''));
if (CHECK) console.log('tocaría ' + tocados + ' de ' + TARGETS.length + ' páginas');
