# TAMV Online Network — sitio institucional / institutional website

**EN.** Source of the public institutional site of TAMV Online Network, a
one-person independent research network based in Mineral del Monte, Hidalgo,
Mexico. Live at <https://tamvonline-t78x4mdi9wa.qoder.website> (Spanish) and
`/en/` (English). This repository is the **static bilingual site**: 24 HTML
pages, one stylesheet, one script, two machine-readable records, and the two
reproducible pipelines that build them. It is published here so that a
research-infrastructure curator, an editor or a university office can inspect
the whole thing — including the parts we would rather not have inspected, which
are declared on the site itself.

**ES.** Fuente del sitio institucional público de TAMV Online Network, una red
independiente de investigación con sede en Mineral del Monte, Hidalgo, México.
Está publicado en <https://tamvonline-t78x4mdi9wa.qoder.website> (español) y
`/en/` (inglés). Este repositorio es el **sitio estático bilingüe**: 24 páginas
HTML, una hoja de estilos, un script, dos registros de máquina y los dos
pipelines reproducibles que los generan. Se publica para que un curador de
infraestructura de investigación, una editorial o una oficina universitaria
puedan inspeccionarlo entero — incluidos los puntos débiles, que el propio
sitio declara.

---

## Qué es y qué no es

| | |
| --- | --- |
| **Es** | el sitio estático, sus herramientas de construcción y su pipeline de idiomas |
| **No es** | la aplicación `tamvonline-weboficial.com`: esa es otra cosa (una app Next.js) y no vive aquí |
| **No contiene** | datos de investigación, datasets, claves ni configuración de despliegue |
| **Tampoco contiene** | el acervo histórico de prototipos de esta cuenta; este repositorio pretende ser la parte comprobable |

## Estructura

```
web/                    raíz del sitio (esto es lo que se sirve)
  index.html …          12 páginas en español
  en/                   12 páginas en inglés, espejo 1:1
  assets/               site.css, site.js, fonts/, brand/, mark.svg
  organization.json     Schema.org: @graph con la ResearchOrganization y un
                        CodeRepository que apunta a este mismo repo
  ror-record-draft.json borrador de registro ROR v2.1
i18n/                   glosario, lista de páginas, locales, allowlist de residuos
tools/                  los dos generadores y los parches de migración (ver abajo)
```

No hay framework, ni `node_modules`, ni build de pasos ocultos: un `git clone`
y abrir `web/index.html` ya funciona.

## Pipelines

### 1. Idiomas — `tools/i18n.mjs`

Node sin dependencias externas. Mantiene el espejo inglés sincronizado con el
español y audita que no queden frases en español sin traducir.

```
node tools/i18n.mjs status      qué páginas existen en cada idioma
node tools/i18n.mjs links        reescribe rutas relativas por idioma
node tools/i18n.mjs inject       inserta canonical / hreflang / og:locale
node tools/i18n.mjs audit        busca residuos de un idioma en el otro
node tools/i18n.mjs emit-meta    regenera las etiquetas i18n generadas
node tools/i18n.mjs all          lo anterior, en orden
```

El auditor excluye `<pre>`/`<code>` y las excepciones listas en
`i18n/residue-allow.txt`; cada excepción de esa lista es una cadena concreta, no
un patrón amplio.

### 2. Marca — `tools/brand-build.py`

Requiere Python 3 y Pillow (`pip install pillow`), sin otras dependencias. Genera
los recortes de los dos logotipos oficiales y la tarjeta social `og-cover.jpg`
(1200×630). Existe porque el recorte que antes hacía el CSS con
`object-fit: cover` dependía del ancho del contenedor y cortaba una línea de
texto a media altura; aquí el encuadre son píxeles deterministas, fijados con el
perfil de bandas de luminancia que produce `tools/brand-inspect.py`.

```
python tools/brand-build.py      regenera web/assets/brand/*.webp y og-cover.jpg
python tools/brand-inspect.py    diagnóstico de solo lectura (geometría del recorte)
```

Los originales completos (`tamv-wordmark.webp`, `isabella-hummingbird.webp`) no
se modifican: se exponen tal cual en la página de identidad, con su descargo.
`tools/redesign-patch.mjs` es el parche de migración que aplicó la última
revisión visual a las 24 páginas; se conserva para que el cambio sea
reproducible, no para volver a ejecutarlo.

### 3. Enlace de la fuente — `tools/repo-link-patch.mjs`

Une el sitio con este repositorio, en los tres sitios donde un curador puede
buscarlo: el pie de las 22 páginas con lista de registros (etiquetado
«Repositorio del sitio» / «Site source», junto a «Cuenta de GitHub», que es del
fundador y no de la red), un nodo `CodeRepository` en el JSON-LD de las dos
portadas y en `web/organization.json`, y una frase en la página del expediente
ROR. Es idempotente: si el enlace ya está, no duplica.

### 4. Corrección de evidencias citadas — `tools/evidence-links-patch.mjs`

Ajusta cuatro afirmaciones del sitio que no resistían la verificación en vivo
(mismo script para el par ES/EN, 13 archivos):

- **DOI.** El DOI de versión `10.5281/zenodo.19436662` está registrado en DataCite
  y figura como *findable*, pero su ruta de aterrizaje en Zenodo devuelve 404
  incluso en navegador. Se cita el DOI de concepto `10.5281/zenodo.19436661`, que
  sí resuelve, y se enlaza aparte el registro `19436662`. La nota que explica el
  404 conserva el DOI de versión escrito como texto, no como enlace.
- **COPE.** El enlace a `publicationethics.org/core-practices` apuntaba a una
  página que redirige con otro nombre. Ahora enlaza directo a *Principles of
  Transparency and Best Practice in Scholarly Publishing* y consigna «última
  revisión 2026-10-29, COPE con DOAJ, OASPA y WAME», leído de la propia página.
- **OSF.** `api.osf.io/v2/search/` dejó de existir, así que el conteo citado no
  era reproducible. Se enlazan los dos nodos concretos (`t3wmy`, `rd47q`).
- **`publishingPrinciples`.** La portada en español declaraba como principios la
  página en inglés; ahora cada idioma apunta a la suya.

Idempotente: volver a ejecutarlo no cambia nada. El 403 que ese enlace devuelve
a los scripts de enlaces es un bloqueo de *user agent* del WAF de COPE, no un
enlace roto; se verificó en navegador.

### 5. Descubrimiento del mapa del sitio — `tools/sitemap-link-patch.mjs`

El host de Qoder Sites asigna el `Content-Type` de los archivos estáticos con una
tabla propia de extensiones (html, css, js, json, txt, svg, webp, jpg, woff2
salen bien) en la que **no está `.xml`**, que cae en `application/octet-stream`.
La cabecera la fija el Worker al subir el artefacto y no hay parámetro de
`prepare_site`, manifiesto ni ruta de función que la cambie para la URL canónica:
las funciones viven bajo `/functions/v1/app` y no pueden sustituir a un archivo
estático que existe. Como el protocolo de mapas no exige la cabecera, lo que sí
puede afirmar el documento es su propio tipo: las 24 páginas llevan

```html
<link rel="sitemap" type="application/xml" title="Mapa del sitio" href="/sitemap.xml">
```

la relación registrada en RFC 6579, junto al `Sitemap:` absoluto de `robots.txt`.
El script es idempotente y `tools/i18n.mjs` valida ahora las `href` que empiezan
por `/` contra la raíz de `web/`, no contra el directorio de la página.

## Reproducir el sitio

```
git clone https://github.com/OsoPanda1/WEBINSTITUCIONAL-TAMVONLINE.git
node tools/i18n.mjs audit      # debe salir limpio
python tools/brand-build.py    # opcional, sólo si se tocan los logotipos
```

Para servirlo en local, cualquier servidor estático sobre `web/`.

## Licencia

Tres cosas distintas, declaradas en [`NOTICE`](NOTICE):

- El **código** (HTML, CSS, `site.js`, los registros JSON y los scripts de
  `tools/`) está bajo **MIT**: ver [`LICENSE`](LICENSE).
- Las **tipografías** autoalojadas (`web/assets/fonts/`: Fraunces, IBM Plex Sans
  y IBM Plex Mono) siguen bajo **SIL Open Font License 1.1**; aquí no se
  relicencian.
- Los **logotipos** y todas las artes derivadas de ellos (`web/assets/brand/` y
  `web/assets/mark.svg`) están **reservados**. Se publican para que el sitio
  pueda inspeccionarse entero, no para autorizar su uso. La prosa del sitio
  tampoco es software: se cita con atribución, como cualquier texto firmado.

El punto importa porque un repositorio sin licencia visible no es reutilizable,
y un repositorio que licencía por error la marca de su propia institución es
peor que uno silencioso.

## Contexto y limitaciones

Este sitio declara abiertamente sus brechas —falta de personalidad jurídica,
ausencia de dominio propio, un solo autor humano en el registro— en la página
[`web/en/ror.html`](web/en/ror.html) / [`web/ror.html`](web/ror.html), junto con
el plan para cerrarlas. Si se llega a solicitar un identificador ROR, este
repositorio es la evidencia de infraestructura que se aporta con la solicitud.
