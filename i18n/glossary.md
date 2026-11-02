# Glosario bloqueado y reglas de traducción — TAMV Online Network

Este archivo es la única fuente de coherencia terminológica entre idiomas. Toda
traducción del sitio se revisa contra él. Si una regla de aquí entra en conflicto
con la elegancia de la frase, gana la regla: la credibilidad del sitio depende de
que lo declarado en español sea exactamente lo declarado en inglés.

## 1. Principio rector

El sitio existe porque declara sus límites. **Ninguna traducción puede subir la
apuesta.** Prohibido convertir una debilidad declarada en una fortaleza formulada.

| Español (fuente) | Inglés obligatorio | Prohibido en inglés |
|---|---|---|
| declarado / declaración | declared / declaration | ~~stated, asserted, established~~ |
| previsto / en diseño | planned / designed but not operating | ~~available, offered, live~~ |
| sin poblar | unpopulated | ~~pending, upcoming~~ |
| brecha | gap | ~~challenge, opportunity~~ |
| bloqueado a propósito | deliberately blocked | ~~not yet available~~ |
| no equivale a | is not equivalent to | ~~differs from~~ |
| no acredita | does not certify | ~~does not guarantee~~ |
| no demuestra | does not demonstrate | ~~does not prove~~ |
| pendiente | outstanding | ~~in progress~~ |
| sin confirmar | unconfirmed | ~~to be determined~~ |

## 2. Términos que no se traducen nunca

Nombres propios de sistemas, identificadores y organizaciones. Se copian igual en
todos los idiomas, con la grafía exacta:

`TAMV Online Network` · `Tecnología Avanzada Mexicana Versátil` · `TRI` ·
`TAMV Research Identity` · `TRI-TAMV-YYYY-XXXX` · `TQAF` · `TQAF-10` ·
`TAMV Verified Output` · `VETRA Ω∞` · `Isabella Villaseñor AI` ·
`Mineral del Monte` · `ROR` · `ORCID` · `ISNI` · `DOI` · `DataCite` · `Crossref` ·
`OpenAIRE` · `Zenodo` · `Figshare` · `OSF` · `GitHub` · `COPE` · `FAIR` ·
`CRediT` · `RFC 3161` · `Geonames` · `EasyChair` · `Springer LNNS`

- `TAMV Online Network` nunca se traduce a `TAMV Online Red`. Es una denominación,
  no un sustantivo común.
- `Tecnología Avanzada Mexicana Versátil` se mantiene en español en el texto inglés
  y se glossa una sola vez por página: *"(Advanced Versatile Mexican Technology; a
  declared expansion, not a registered legal name)"*.
- `Mineral del Monte` es la forma canónica. `Real del Monte` solo aparece donde el
  original español ya la menciona como variante.

## 3. Falsos amigos que hay que prohibirse

| Español | Traducción correcta | Trampa a evitar |
|---|---|---|
| resumen (criptográfico) | **digest** | ~~summary~~ |
| huella digital (de un archivo) | **digital fingerprint / digest** | ~~digital footprint~~ |
| depósito | **deposit** (sustantivo y verbo) | ~~depositión, storage~~ |
| curaduría / curador | **curation / curator** | ~~care~~ |
| sello | **seal** | ~~stamp~~ |
| cadena de afiliación | **affiliation string** | ~~affiliation chain~~ |
| expediente | **dossier** | ~~file, record~~ |
| convocatoria | **open call** | ~~convocation~~ |
| persona moral | **legal entity** | ~~moral person~~ |
| constituida | **incorporated** | ~~constituted~~ |
| suscripción (a un servicio) | **membership** | ~~subscription~~ |
| acta / minuta | **minutes** | ~~record~~ |
| recusación | **recusal** | ~~excuse~~ |
| aval / respaldo | **endorsement / backing** | ~~support~~ (demasiado débil) |
| título de crédito | **credential** | ~~title~~ |

## 4. Etiquetas de estado

Se traducen, pero la clase CSS no cambia. Usar siempre la misma correspondencia:

| Español | Inglés |
|---|---|
| Disponible ahora | Available now |
| Publicado / Publicados | Published |
| Declarado | Declared |
| Parcial | Partial |
| Bloqueado | Blocked |
| Bloqueado a propósito | Deliberately blocked |
| Pendiente | Outstanding |
| Sin confirmar | Unconfirmed |
| Previsto | Planned |
| Confusión a resolver | Ambiguity to resolve |
| Verificado | Verified |
| No verificado | Not verified |

## 5. Tagline y fórmulas fijas

| Español | Inglés |
|---|---|
| Conocimiento que perdura | Knowledge that endures |
| La presencia en este sitio no representa acreditación ni respaldo de terceros. | Presence on this site does not constitute accreditation or third-party endorsement. |
| TAMV Online Network (denominación exacta para citas y campos de afiliación) | TAMV Online Network (exact string for citations and affiliation fields) |

## 6. Registro y voz

- Inglés académico internacional, formal, en primera persona plural solo cuando el
  original español ya use "nosotros". Donde el original dice "la red", decir
  "the network", no "we".
- Frases cortas. Este sitio no usa marketing. Prohibido: *cutting-edge,
  world-class, revolutionary, innovative solutions, leading, premier, state-of-the-art*.
- Voz activa cuando el original la tenga. Mantener las construcciones impersonales
  donde el original las use para no atribuirse méritos.
- No añadir conectores enfáticos (*crucially, importantly, notably*) que el original
  no tenga.

## 7. Lo que se copia sin tocar

Números, fechas en formato ISO (`2026-11-01`), DOI, URLs, direcciones de correo,
códigos de referencia, nombres de archivo, clases e ids CSS, atributos `data-*`
técnicos, bloques `<pre>` con JSON o sellos, y cualquier valor literal entre
`<code>`.

Los atributos `alt`, `aria-label`, `title` y `data-label` **sí** se traducen: son
texto accesible.

## 8. Regla de no invención

Si una frase del original es ambigua, se traduce literal y se anota al final del
trabajo. **Nunca** se completa información que el español no da, ni se explica algo
que el original deja sin explicar. Un traductor que "mejora" una afirmación está
escribiendo una afirmación nueva a nombre de la red.

## 9. Estructura

- `<html lang="...">` lo fija el generador; no escribirlo a mano.
- Los enlaces internos van dirigidos a los archivos de `i18n/pages.json` para el
  idioma de la página. Los recursos compartidos se referencian con `../assets/...`
  desde cualquier subdirectorio de idioma.
- El selector de idioma y el bloque `rel=alternate` los genera `tools/i18n.mjs`.
  No se editan a mano; el generador los sobrescribe.
- Las etiquetas del menú y del selector salen del bloque `aria` de cada idioma en
  `i18n/locales.json`. Sin ese bloque, el generador las escribe en inglés.
- Un aviso de `audit` por texto en español dentro de una página inglesa se
  resuelve traduciendo, o añadiendo el nombre propio exacto a
  `i18n/residue-allow.txt` (un regex por línea). Nunca ampliando los patrones de
  búsqueda, porque eso ocultaría texto sin traducir.
- `tools/i18n.mjs` es copia exacta del script del skill `bilingual-static-site-i18n`
  (`~/.qoder/skills/bilingual-static-site-i18n/scripts/i18n.mjs`). Cambiar uno
  obliga a cambiar el otro; la versión anterior quedó en `tools/i18n.mjs.bak`.
