#!/usr/bin/env node
/* TAMV Online Network — normaliza en el sitio las variantes de la cadena de marca
 *
 * Fuente: docs/marca/variantes-marca.json y docs/marca/homologacion-marca.md (tarea #32),
 * con cada cifra re-medida el 2026-11-02 contra las APIs públicas:
 *
 *   api.datacite.org  query=creators.affiliation.name:TAMV        → meta.total = 44
 *     publisher:  «zenodo | TAMV Online | Figshare» 28 · «Zenodo» 10 ·
 *                 «zenodo | TAMV Online» 4 · «TAMV ONLINE» 2
 *     affiliation dentro de esos 44: TAMV ONLINE NETWORK 38 · TAMV ONLINE 2 ·
 *                 tamv online network 2 · TAMV ONLINEE NETWORK 2 (errata, 1 obra)
 *   api.datacite.org  query="TAMV Online Network" (texto libre)   → 18
 *   zenodo.org/api/records  q="TAMV Online Network" 23 · q="TAMV ONLINE" 25 · q=TAMV 28
 *   api.github.com/search/users?q="TAMV Online Enterprise"        → total_count 1 = OsoPanda1
 *   api.github.com/search/repositories?q="TAMV Online Enterprise" → total_count 0
 *
 * Correcciones de fondo, no tipográficas:
 *   1. «18 DOIs en DataCite con afiliación declarada» medía una búsqueda de texto libre y se
 *      etiquetaba como afiliación. La cifra de afiliación es 44; el 18 se conserva como lo que es.
 *   2. «TAMV Online Enterprise es una cuenta de terceros» está refutada: la emite el propio
 *      fundador en su perfil. Además organizacion.html se contradecía (fila 264 vs fila 301).
 *   3. Faltaban siete superficies de variante declaradas, incluida una errata que no es alias.
 *   4. Las claims de «0 releases» se re-etiquetan con su muestra real (17 repos inspeccionados).
 *
 * Idempotente: cada `from` debe aparecer exactamente una vez en su archivo; si ya está el
 * `to`, la pasada no escribe. No toca la región generada por i18n (se regenera después).
 *
 *   node tools/brand-variant-patch.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const RULES = [
  /* ── 1. fecha y método de los conteos ─────────────────────────────────── */
  ['web/produccion.html',
   '<p>Conteos obtenidos el 2026-11-01 consultando las APIs públicas de cada proveedor. Ninguno de estos números implica revisión por pares.</p>',
   '<p>Conteos obtenidos el 2026-11-01 y revalidados el 2026-11-02 en las APIs públicas de cada proveedor. Cada cifra se publica con la consulta que la produjo: cambiar la cadena buscada cambia el número. Ninguno de estos números implica revisión por pares.</p>'],
  ['web/en/outputs.html',
   '<p>Counts obtained on 2026-11-01 by querying the public APIs of each provider. None of these numbers implies peer review.</p>',
   '<p>Counts obtained on 2026-11-01 and revalidated on 2026-11-02 against the public APIs of each provider. Each figure is published together with the query that produced it: changing the searched string changes the number. None of these numbers implies peer review.</p>'],

  /* ── 2. métrica DataCite: 18 (texto libre) → 44 (campo de afiliación) ──── */
  ['web/index.html',
   '<div class="metric"><b>18</b><span>DOIs en DataCite con afiliación declarada</span><span class="src">api.datacite.org · 2026-11-01</span></div>',
   '<div class="metric"><b>44</b><span>DOIs en DataCite cuyo campo de afiliación contiene TAMV: 22 obras, cada una con su DOI de concepto y su DOI de versión</span><span class="src">api.datacite.org · 2026-11-02 · consulta <code>creators.affiliation.name:TAMV</code></span></div>'],
  ['web/investigacion.html',
   '<div class="metric"><b>18</b><span>DOIs en DataCite con afiliación declarada</span><span class="src">api.datacite.org · 2026-11-01</span></div>',
   '<div class="metric"><b>44</b><span>DOIs en DataCite cuyo campo de afiliación contiene TAMV: 22 obras, cada una con su DOI de concepto y su DOI de versión</span><span class="src">api.datacite.org · 2026-11-02 · consulta <code>creators.affiliation.name:TAMV</code></span></div>'],
  ['web/produccion.html',
   '<div class="metric"><b>18</b><span>DOIs en DataCite con afiliación declarada</span><span class="src">api.datacite.org</span></div>',
   '<div class="metric"><b>44</b><span>DOIs en DataCite cuyo campo de afiliación contiene TAMV: 22 obras, cada una con su DOI de concepto y su DOI de versión</span><span class="src">api.datacite.org · 2026-11-02 · consulta <code>creators.affiliation.name:TAMV</code></span></div>'],
  ['web/en/index.html',
   '<div class="metric"><b>18</b><span>DOIs in DataCite with declared affiliation</span><span class="src">api.datacite.org · 2026-11-01</span></div>',
   '<div class="metric"><b>44</b><span>DOIs in DataCite whose affiliation field contains TAMV: 22 works, each with its concept DOI and its version DOI</span><span class="src">api.datacite.org · 2026-11-02 · query <code>creators.affiliation.name:TAMV</code></span></div>'],
  ['web/en/research.html',
   '<div class="metric"><b>18</b><span>DOIs in DataCite with declared affiliation</span><span class="src">api.datacite.org · 2026-11-01</span></div>',
   '<div class="metric"><b>44</b><span>DOIs in DataCite whose affiliation field contains TAMV: 22 works, each with its concept DOI and its version DOI</span><span class="src">api.datacite.org · 2026-11-02 · query <code>creators.affiliation.name:TAMV</code></span></div>'],
  ['web/en/outputs.html',
   '<div class="metric"><b>18</b><span>DOIs in DataCite with declared affiliation</span><span class="src">api.datacite.org</span></div>',
   '<div class="metric"><b>44</b><span>DOIs in DataCite whose affiliation field contains TAMV: 22 works, each with its concept DOI and its version DOI</span><span class="src">api.datacite.org · 2026-11-02 · query <code>creators.affiliation.name:TAMV</code></span></div>'],

  /* fila de la tabla de evidencias */
  ['web/produccion.html',
   '<td>18 DOIs con afiliación declarada en DataCite</td>',
   '<td>44 DOIs cuyo campo de afiliación contiene TAMV (22 obras × concepto + versión)</td>'],
  ['web/en/outputs.html',
   '<td>18 DOIs with declared affiliation in DataCite</td>',
   '<td>44 DOIs whose affiliation field contains TAMV (22 works × concept + version)</td>'],

  /* frases sueltas que citaban el 18 como si fuera afiliación */
  ['web/investigacion.html',
   '23 registros en Zenodo y 18 DOIs en DataCite con licencia CC BY 4.0 y autoría única;',
   '23 registros en Zenodo con la consulta <code>"TAMV Online Network"</code> (25 con <code>"TAMV ONLINE"</code>) y 44 DOIs en DataCite cuyo campo de afiliación contiene TAMV, con licencia CC BY 4.0 y autoría única;'],
  ['web/en/research.html',
   '23 records in Zenodo and 18 DOIs in DataCite with CC BY 4.0 license and sole authorship;',
   '23 Zenodo records under the query <code>"TAMV Online Network"</code> (25 under <code>"TAMV ONLINE"</code>) and 44 DOIs in DataCite whose affiliation field contains TAMV, with CC BY 4.0 license and sole authorship;'],
  ['web/investigacion.html',
   '<td>Los 23 registros de Zenodo, los 18 DOIs de DataCite, los 2 nodos de OSF',
   '<td>Los 23 registros de Zenodo, los 44 DOIs de DataCite, los 2 nodos de OSF'],
  ['web/en/research.html',
   '<td>The 23 Zenodo records, the 18 DataCite DOIs, the 2 OSF nodes',
   '<td>The 23 Zenodo records, the 44 DataCite DOIs, the 2 OSF nodes'],
  ['web/organizacion.html',
   '<li><b>Autoría única</b> en los 23 registros de Zenodo y en los 18 DOIs de DataCite consultados.</li>',
   '<li><b>Autoría única</b> en los 23 registros de Zenodo y en los 44 DOIs de DataCite cuyo campo de afiliación contiene TAMV.</li>'],
  ['web/en/organization.html',
   '<li><b>Sole authorship</b> in the 23 Zenodo records and the 18 DataCite DOIs consulted.</li>',
   '<li><b>Sole authorship</b> in the 23 Zenodo records and the 44 DataCite DOIs whose affiliation field contains TAMV.</li>'],
  ['web/contacto.html',
   'y los 23 registros de Zenodo y 18 DOIs de DataCite con afiliación declarada.</li>',
   'y los 23 registros de Zenodo y 44 DOIs de DataCite cuyo campo de afiliación contiene TAMV.</li>'],
  ['web/en/contact.html',
   'and the 23 Zenodo records and 18 DataCite DOIs with a declared affiliation.</li>',
   'and the 23 Zenodo records and 44 DataCite DOIs whose affiliation field contains TAMV.</li>'],
  ['web/ror.html',
   '<td>23 registros Zenodo · 18 DOIs DataCite · 3 Figshare · 2 nodos OSF</td>',
   '<td>23 registros Zenodo · 44 DOIs DataCite por campo de afiliación · 3 Figshare · 2 nodos OSF</td>'],
  ['web/en/ror.html',
   '<td>23 Zenodo records · 18 DataCite DOIs · 3 Figshare · 2 OSF nodes</td>',
   '<td>23 Zenodo records · 44 DataCite DOIs by affiliation field · 3 Figshare · 2 OSF nodes</td>'],
  ['web/ror.html',
   '<li><b>Pluralidad de personas:</b> los 23 registros de Zenodo, los 18 DOIs de DataCite, Figshare, OSF',
   '<li><b>Pluralidad de personas:</b> los 23 registros de Zenodo, los 44 DOIs de DataCite, Figshare, OSF'],
  ['web/en/ror.html',
   '<li><b>Plurality of people:</b> the 23 Zenodo records, the 18 DataCite DOIs, Figshare, OSF',
   '<li><b>Plurality of people:</b> the 23 Zenodo records, the 44 DataCite DOIs, Figshare, OSF'],

  /* ── 3. la afirmación refutada: «cuenta de terceros» ───────────────────── */
  ['web/produccion.html',
   '<li><code>TAMV Online Enterprise</code> — nombre de una cuenta de terceros, no de esta red.</li>',
   '<li><code>TAMV Online Enterprise</code> y <code>TAMV ONLINE ENTERPRISE</code> — no vienen de un tercero: son la cadena que el propio fundador emite en su perfil de GitHub. La consulta <code>search/users?q="TAMV Online Enterprise"</code> devuelve un único resultado (<code>OsoPanda1</code>) y <code>search/repositories</code> devuelve 0 (2026-11-02). No hay nada que desambiguar frente a un tercero, y no se solicita como alias.</li>'],
  ['web/en/outputs.html',
   '<li><code>TAMV Online Enterprise</code> — the name of a third-party account, not of this network.</li>',
   '<li><code>TAMV Online Enterprise</code> and <code>TAMV ONLINE ENTERPRISE</code> — these do not come from a third party: they are the string the founder himself issues on his own GitHub profile. The query <code>search/users?q="TAMV Online Enterprise"</code> returns a single result (<code>OsoPanda1</code>) and <code>search/repositories</code> returns 0 (2026-11-02). There is no third party to disambiguate from, and it is not requested as an alias.</li>'],
  ['web/organizacion.html',
   '<td>No pertenece a ninguna empresa; la cuenta de terceros <code>TAMV Online Enterprise</code> se desambigua arriba.</td>',
   '<td>No pertenece a ninguna empresa. La cadena <code>TAMV Online Enterprise</code> la emite el propio fundador en su perfil de GitHub, no un tercero: se desambigua arriba y no se pide como alias.</td>'],
  ['web/en/organization.html',
   '<td>It belongs to no company; the third-party account <code>TAMV Online Enterprise</code> is disambiguated above.</td>',
   '<td>It belongs to no company. The string <code>TAMV Online Enterprise</code> is issued by the founder himself on his GitHub profile, not by a third party: it is disambiguated above and is not requested as an alias.</td>'],
  ['web/organizacion.html',
   '<td>Nombre visible de la cuenta GitHub <code>OsoPanda1</code> y de una cadena de afiliación en <code>CITATION.cff</code>. Se documenta para desambiguar, no como alias. <span class="tag tag-block">Confusión a resolver</span></td>',
   '<td>Nombre visible de la cuenta GitHub <code>OsoPanda1</code>: el campo <code>name</code> del perfil dice <code>TAMV ONLINE ENTERPRISE</code> y el campo <code>company</code> dice <code>TAMV Enterprise</code> (verificado 2026-11-02). También aparece en una cadena de afiliación de <code>CITATION.cff</code>. Se documenta para desambiguar, no como alias: declararlo en ROR afirmaría una naturaleza mercantil que la red niega. <span class="tag tag-block">Confusión a resolver</span></td>'],
  ['web/en/organization.html',
   '<td>Visible name of the GitHub account <code>OsoPanda1</code> and of an affiliation string in <code>CITATION.cff</code>. It is documented to disambiguate, not as an alias. <span class="tag tag-block">Ambiguity to resolve</span></td>',
   '<td>Visible name of the GitHub account <code>OsoPanda1</code>: the profile <code>name</code> field reads <code>TAMV ONLINE ENTERPRISE</code> and the <code>company</code> field reads <code>TAMV Enterprise</code> (verified 2026-11-02). It also appears in an affiliation string in <code>CITATION.cff</code>. It is documented to disambiguate, not as an alias: declaring it in ROR would assert a commercial nature the network denies. <span class="tag tag-block">Ambiguity to resolve</span></td>'],
  ['web/gobernanza.html',
   '<code>TAMV Online Enterprise</code> no es el nombre de esta entidad y no se usa como afiliación.',
   '<code>TAMV Online Enterprise</code> y <code>TAMV ONLINE ENTERPRISE</code> las emite el propio fundador en su perfil de GitHub: no son el nombre de esta entidad, no se usan como afiliación y no se piden como alias.'],
  ['web/en/governance.html',
   '<code>TAMV Online Enterprise</code> is not the name of this entity and is not used as an affiliation.',
   '<code>TAMV Online Enterprise</code> and <code>TAMV ONLINE ENTERPRISE</code> are issued by the founder himself on his GitHub profile: they are not the name of this entity, are not used as an affiliation and are not requested as an alias.'],

  /* ── 4. el inventario de variantes pasa de cuatro a siete ─────────────── */
  ['web/index.html',
   '<td>Coexisten cuatro variantes: <code>TAMV ONLINE</code>, <code>TAMV ONLINE NETWORK</code>, <code>TAMV Online Enterprise</code> y en minúsculas.</td>',
   '<td>Coexisten siete variantes verificadas el 2026-11-02: <code>TAMV ONLINE</code>, <code>TAMV ONLINE NETWORK</code>, <code>tamv online network</code>, <code>TAMV Online</code> dentro del campo <code>publisher</code> de 32 DOIs, <code>TAMV ONLINE ENTERPRISE</code>, <code>TAMV Enterprise</code> y la errata <code>TAMV ONLINEE NETWORK</code>.</td>'],
  ['web/en/index.html',
   '<td>Four variants coexist: <code>TAMV ONLINE</code>, <code>TAMV ONLINE NETWORK</code>, <code>TAMV Online Enterprise</code> and a lowercase one.</td>',
   '<td>Seven variants verified on 2026-11-02: <code>TAMV ONLINE</code>, <code>TAMV ONLINE NETWORK</code>, <code>tamv online network</code>, <code>TAMV Online</code> inside the <code>publisher</code> field of 32 DOIs, <code>TAMV ONLINE ENTERPRISE</code>, <code>TAMV Enterprise</code> and the typo <code>TAMV ONLINEE NETWORK</code>.</td>'],
  ['web/membresia.html',
   'las divergencias entre las cuatro variantes detectadas en depósitos anteriores son la causa frecuente de rechazo',
   'las divergencias entre las siete variantes detectadas el 2026-11-02 en depósitos, perfiles y metadatos son la causa frecuente de rechazo'],
  ['web/en/membership.html',
   'divergences among the four variants detected in earlier deposits are a frequent cause of rejection',
   'divergences among the seven variants detected on 2026-11-02 across deposits, profiles and metadata are a frequent cause of rejection'],
  ['web/contacto.html',
   '<li>Variantes de la cadena a normalizar: <code>TAMV ONLINE</code>, <code>tamv online network</code> y <code>TAMV Online Enterprise</code>.</li>',
   '<li>Variantes de la cadena a normalizar: <code>TAMV ONLINE</code>, <code>TAMV ONLINE NETWORK</code>, <code>tamv online network</code>, <code>TAMV Online</code> en el campo <code>publisher</code>, <code>TAMV ONLINE ENTERPRISE</code>, <code>TAMV Enterprise</code> y la errata <code>TAMV ONLINEE NETWORK</code>.</li>'],
  ['web/en/contact.html',
   '<li>Variants of the string to normalise: <code>TAMV ONLINE</code>, <code>tamv online network</code> and <code>TAMV Online Enterprise</code>.</li>',
   '<li>Variants of the string to normalise: <code>TAMV ONLINE</code>, <code>TAMV ONLINE NETWORK</code>, <code>tamv online network</code>, <code>TAMV Online</code> in the <code>publisher</code> field, <code>TAMV ONLINE ENTERPRISE</code>, <code>TAMV Enterprise</code> and the typo <code>TAMV ONLINEE NETWORK</code>.</li>'],
  ['web/ror.html',
   '<td>TAMV ONLINE · tamv online network</td><td>Variantes detectadas en depósitos; normalizar y dejar de emitir</td>',
   '<td>TAMV ONLINE · TAMV ONLINE NETWORK · tamv online network</td><td>Variantes detectadas en depósitos y en el registro de empleo de ORCID; se declaran solo como alias de recuperación y se deja de emitirlos. La errata <code>TAMV ONLINEE NETWORK</code> y las formas con "Enterprise" no se piden como alias.</td>'],
  ['web/en/ror.html',
   '<td>TAMV ONLINE · tamv online network</td><td>Variants detected in deposits; normalise and stop issuing</td>',
   '<td>TAMV ONLINE · TAMV ONLINE NETWORK · tamv online network</td><td>Variants detected in deposits and in the ORCID employment record; declared only as retrieval aliases, no longer issued. The typo <code>TAMV ONLINEE NETWORK</code> and the forms containing "Enterprise" are not requested as aliases.</td>'],

  /* ── 5. las cadenas que conviven, medidas campo a campo ────────────────── */
  ['web/investigacion.html',
   '<td>Afiliación inconsistente</td><td>Conviven las cadenas <code>TAMV ONLINE</code> y <code>TAMV ONLINE NETWORK</code> en los depósitos con metadato; los 3 artículos de Figshare no tienen campo de afiliación.</td>',
   '<td>Afiliación inconsistente</td><td>En los 44 DOIs de DataCite con afiliación TAMV, la cadena es <code>TAMV ONLINE NETWORK</code> en 38, <code>TAMV ONLINE</code> en 2, <code>tamv online network</code> en 2 y <code>TAMV ONLINEE NETWORK</code> (errata) en 2. El campo <code>publisher</code> tiene cuatro valores distintos: <code>zenodo | TAMV Online | Figshare</code> en 28, <code>Zenodo</code> en 10, <code>zenodo | TAMV Online</code> en 4 y <code>TAMV ONLINE</code> en 2. Los 3 artículos de Figshare no tienen campo de afiliación.</td>'],
  ['web/en/research.html',
   '<td>Inconsistent affiliation</td><td>The strings <code>TAMV ONLINE</code> and <code>TAMV ONLINE NETWORK</code> coexist in the deposits with metadata; the 3 Figshare articles have no affiliation field.</td>',
   '<td>Inconsistent affiliation</td><td>Across the 44 DataCite DOIs with a TAMV affiliation, the string is <code>TAMV ONLINE NETWORK</code> in 38, <code>TAMV ONLINE</code> in 2, <code>tamv online network</code> in 2 and <code>TAMV ONLINEE NETWORK</code> (a typo) in 2. The <code>publisher</code> field holds four different values: <code>zenodo | TAMV Online | Figshare</code> in 28, <code>Zenodo</code> in 10, <code>zenodo | TAMV Online</code> in 4 and <code>TAMV ONLINE</code> in 2. The 3 Figshare articles have no affiliation field.</td>'],

  /* ── 6. claims de GitHub acotadas a su muestra real ───────────────────── */
  ['web/produccion.html',
   '<li>Los repositorios de GitHub no tienen <em>releases</em>, así que <b>no existe ningún DOI emitido por GitHub</b> pese a que el sitio anterior lo insinuaba.</li>',
   '<li>En los 17 repositorios inspeccionados individualmente el 2026-11-02 no hay ninguna <em>release</em> ni ningún tag, así que <b>no existe ningún DOI emitido por GitHub</b> pese a que el sitio anterior lo insinuaba. Los otros 86 repositorios propios y los 40 forks no se revisaron uno por uno.</li>'],
  ['web/en/outputs.html',
   '<li>The GitHub repositories have no <em>releases</em>, so <b>there is no DOI issued by GitHub</b>, although the previous site hinted at one.</li>',
   '<li>The 17 repositories inspected individually on 2026-11-02 have no <em>release</em> and no tag, so <b>there is no DOI issued by GitHub</b>, although the previous site hinted at one. The other 86 own repositories and the 40 forks were not reviewed one by one.</li>'],
  ['web/investigacion.html',
   '<td>Citabilidad del software</td><td>0 <em>releases</em> en la cuenta GitHub, por lo que no hay DOI de software generado desde ahí; <code>CITATION.cff</code> presente en 2 de los 8 repositorios revisados.</td>',
   '<td>Citabilidad del software</td><td>Inventario completo de los 103 repositorios propios el 2026-11-02: <code>CITATION.cff</code> en 2, ninguno archivado, <code>.zenodo.json</code> y <code>codemeta.json</code> en 0. Las <em>releases</em> se inspeccionaron en 17 repositorios y todas devuelven 0, por lo que no hay DOI de software generado desde GitHub.</td>'],
  ['web/en/research.html',
   '<td>Software citability</td><td>0 <em>releases</em> in the GitHub account, so there is no software DOI generated from there; <code>CITATION.cff</code> present in 2 of the 8 repositories reviewed.</td>',
   '<td>Software citability</td><td>Full inventory of the 103 own repositories on 2026-11-02: <code>CITATION.cff</code> in 2, none archived, <code>.zenodo.json</code> and <code>codemeta.json</code> in 0. <em>Releases</em> were inspected in 17 repositories and all return 0, so there is no software DOI generated from GitHub.</td>'],
];

/* ── organización.html: dos filas nuevas en la tabla de nombres ─────────── *
 * El anclaje incluye el arranque de la fila siguiente: al insertar entre ambas,
 * el `from` deja de existir y la segunda pasada no vuelve a duplicar las filas. */
const NAME_ROW_ES = ['web/organizacion.html',
  '<tr><td>tamv online network</td><td class="mono">alias</td><td class="mono">en</td><td>Variante en minúsculas detectada en metadatos. Por normalizar. <span class="tag tag-warn">Por normalizar</span></td></tr>\n            <tr><td>TAMV Online Enterprise</td>',
  '<tr><td>tamv online network</td><td class="mono">alias</td><td class="mono">en</td><td>Variante en minúsculas detectada en metadatos. Por normalizar. <span class="tag tag-warn">Por normalizar</span></td></tr>\n            <tr><td>TAMV ONLINE NETWORK</td><td class="mono">alias</td><td class="mono">en</td><td>La variante más difundida: cadena de afiliación en 38 de los 44 DOIs de DataCite y nombre del registro de empleo en ORCID. No estaba declarada en <code>alternateName</code>; se declara como alias de recuperación, no como forma de cita. <span class="tag tag-warn">Por normalizar</span></td></tr>\n            <tr><td>TAMV ONLINEE NETWORK</td><td class="mono">— errata, no es alias</td><td class="mono">en</td><td>Doble E en el depósito Zenodo 23418238 y su DOI de concepto. Una errata no se defiende como forma propia: se corrige por nueva versión y se anota en el expediente; no entra en <code>alternateName</code> ni en <code>names[]</code> de ROR. <span class="tag tag-block">Error tipográfico</span></td></tr>\n            <tr><td>TAMV Online Enterprise</td>'];
const NAME_ROW_EN = ['web/en/organization.html',
  '<tr><td>tamv online network</td><td class="mono">alias</td><td class="mono">en</td><td>Lowercase variant detected in metadata. To be normalized. <span class="tag tag-warn">To be normalized</span></td></tr>\n            <tr><td>TAMV Online Enterprise</td>',
  '<tr><td>tamv online network</td><td class="mono">alias</td><td class="mono">en</td><td>Lowercase variant detected in metadata. To be normalized. <span class="tag tag-warn">To be normalized</span></td></tr>\n            <tr><td>TAMV ONLINE NETWORK</td><td class="mono">alias</td><td class="mono">en</td><td>The most widespread variant: the affiliation string in 38 of the 44 DataCite DOIs and the name in the ORCID employment record. It was absent from <code>alternateName</code>; declared as a retrieval alias, not as a citation form. <span class="tag tag-warn">To be normalized</span></td></tr>\n            <tr><td>TAMV ONLINEE NETWORK</td><td class="mono">— typo, not an alias</td><td class="mono">en</td><td>A double E in Zenodo deposit 23418238 and its concept DOI. A typo is not defended as a preferred form: it is corrected by a new version and recorded in the dossier; it does not enter <code>alternateName</code> or the ROR <code>names[]</code>. <span class="tag tag-block">Typographical error</span></td></tr>\n            <tr><td>TAMV Online Enterprise</td>'];

/* ── organization.json: alta del alias más difundido ────────────────────── */
const JSONLD_ALIAS = ['web/organization.json',
  '        "TAMV ONLINE",\n        "Red TAMV Online Network"',
  '        "TAMV ONLINE",\n        "TAMV ONLINE NETWORK",\n        "Red TAMV Online Network"'];

/* ── ror-record-draft.json: el recuento de brechas también estaba viejo ──── *
 * El borrador del registro ROR seguía anunciando «cuatro variantes» mientras las
 * páginas ya listaban siete. Es el mismo árbol, servido como JSON público, y un
 * curador lo descarga: una cifra distinta por canal es exactamente el defecto
 * que esta auditoría vino a cerrar. */
const DRAFT_GAP_COUNT = ['web/ror-record-draft.json',
  '      "Cuatro variantes de cadena de afiliación en circulación",',
  '      "Siete variantes de cadena de afiliación en circulación, verificadas el 2026-11-02",'];

for (const r of [NAME_ROW_ES, NAME_ROW_EN, JSONLD_ALIAS, DRAFT_GAP_COUNT]) RULES.push(r);

const byFile = new Map();
for (const [f, from, to] of RULES) {
  if (!byFile.has(f)) byFile.set(f, []);
  byFile.get(f).push([from, to]);
}

let applied = 0, already = 0, touched = 0, failed = 0;
for (const [f, list] of byFile) {
  const p = path.join(ROOT, f);
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  for (const [from, to] of list) {
    if (to.includes(from)) {
      failed++;
      console.error('ERROR ' + f + ': regla no idempotente, el texto nuevo contiene el viejo y se duplicaría al relanzar: ' + from.slice(0, 72));
      continue;
    }
    const count = s.split(from).length - 1;
    const done = s.split(to).length - 1;
    if (count === 0 && done >= 1) { already++; continue; }
    if (count !== 1) {
      failed++;
      console.error('ERROR ' + f + ': la cadena aparece ' + count + ' veces (se exige 1): ' + from.slice(0, 72));
      continue;
    }
    s = s.replace(from, to);
    applied++;
  }
  const wrote = s !== before;
  if (wrote) { fs.writeFileSync(p, s); touched++; }
  console.log(f + ': ' + (wrote ? 'escrito' : 'sin cambios'));
}

/* ── ninguna cifra vieja ni afirmación refutada puede sobrevivir ────────── */
const FORBIDDEN = [
  /18 DOIs en DataCite/, /18 DOIs de DataCite/, /18 DataCite DOIs/, /18 DOIs with declared affiliation/,
  /<b>18<\/b>/, /cuatro variantes/, /four variants/,
  /cuenta de terceros/, /third-party account/,
];
const leftovers = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (!/\.(html|json)$/.test(name)) continue;
    const rel = path.relative(ROOT, p).replace(/\\/g, '/');
    if (rel.startsWith('web/assets/')) continue;
    const t = fs.readFileSync(p, 'utf8');
    for (const re of FORBIDDEN) {
      const m = t.match(re);
      if (m) leftovers.push(rel + ' :: ' + re + ' :: ' + t.slice(Math.max(0, m.index - 50), m.index + 60).replace(/\s+/g, ' '));
    }
  }
})(path.join(ROOT, 'web'));

console.log('aplicado: ' + applied + ' · ya aplicado: ' + already + ' · archivos escritos: ' + touched + ' · fallas: ' + failed);
if (leftovers.length) { console.error('AVISO quedan textos antiguos:\n  ' + leftovers.join('\n  ')); process.exitCode = 1; }
if (failed) process.exitCode = 1;
