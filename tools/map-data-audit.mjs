#!/usr/bin/env node
/* TAMV Online Network — auditor del grafo del HCU Living Universe
 *
 * Este script es el que da significado a las cuatro reglas escritas en el
 * encabezado de web/assets/mapa/graph.js. Sin él, las reglas serían una
 * promesa tipográfica. Se ejecuta antes de publicar:
 *
 *   node tools/map-data-audit.mjs          # informe completo
 *   node tools/map-data-audit.mjs --quiet  # solo errores, sin el detalle
 *
 * Devuelve código de salida distinto de cero si algo falla, así que puede
 * funcionar como puerta de publicación.
 *
 * Qué comprueba, y por qué:
 *  E1 topología — el número de nodos declarado en el meta-resumen tiene que
 *     coincidir con las arrays reales (ancla + 6 regiones + 18 entidades).
 *  E2 integridad — identificadores únicos y toda referencia (dom, refs,
 *     from/to) resuelve contra un nodo existente.
 *  E3 enums — kind/act/st/rk y los sellos usan únicamente los vocabularios
 *     publicados en el propio archivo.
 *  E4 evidencia — ninguna entidad supera hoy el estado E2, y toda entidad o
 *     bien tiene una fuente registrada o se declara vacío.
 *  E5 fuentes — cada fuente externa lleva fecha de verificación pasada
 *     (no futura) y formato ISO; cada enlace interno apunta a un archivo que
 *     existe en web/.
 *  E6 bilingüismo — cada campo en español tiene su contraparte en inglés, no
 *     vacía y no idéntica (una copia literal deliría como "traducción").
 *  E7 medición — ningún número de influencia, confianza o ponderación escrito
 *     como propiedad; los porcentajes sólo aparecen donde hay una auditoría
 *     que los sustenta (lista de excepciones declarada abajo).
 *  E8 claims prohibidos — la metodología §7 retira explícitamente BookPI,
 *     SHA3-512, certificación ISCIR Ω∞, computación cuántica y estado de
 *     Kubernetes; el grafo tampoco puede afirmar conciencia ni autoridad
 *     autónoma.
 *  E9 capas — motor, generador y las dos páginas siguen leyendo la misma
 *     fuente, y ningún rótulo fija a mano una cifra que el grafo ya cuenta.
 *  E10 idioma — ningún enlace de una página del mapa conserva el nombre de
 *     archivo de otro idioma: el orden correcto es generador estático y
 *     después `tools/i18n.mjs links`, nunca al revés.
 *  E11 JavaScript — sin script el lienzo se retira y queda el registro; con
 *     script pero sin graph.js el escenario también se retira.
 *  E12 islote de rutas — el bloque estático publica <script id="hcu-paths">
 *     con la traducción de cada enlace interno del grafo al idioma de la página,
 *     y el motor lo lee para resolver las fuentes del expediente.
 */
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGraph } from './map-static-patch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const WEB = resolve(join(ROOT, 'web'));

const QUIET = process.argv.includes('--quiet');

const errors = [];
const warnings = [];
const ok = [];

const fail = (rule, msg) => errors.push(rule + ' · ' + msg);
const warn = (rule, msg) => warnings.push(rule + ' · ' + msg);
const pass = (rule, msg) => ok.push(rule + ' · ' + msg);

const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const isYearDate = (s) => typeof s === 'string' && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(s);
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;
const external = (href) => /^[a-z]+:\/\//i.test(String(href || ''));

/* Los porcentajes legítimos del registro provienen de la auditoría de
 * higiene de código (677 commits analizados). Fuera de estas entidades, un
 * número con signo de porcentaje sería una medición inventada. */
const PERCENT_ALLOWLIST = new Set(['code-hygiene', 'hcu']);

/* ------------------------------------------------------------------ */
const G = loadGraph(WEB);

/* ── E1 topología ─────────────────────────────────────────────────────── */
{
  const counts = {
    domains: G.domains.length,
    entities: G.entities.length,
    flows: G.flows.length,
    axes: G.axes.length,
    states: G.states.length,
    seals: G.sealDefs.length,
    modes: G.modes.length,
  };
  const expected = { domains: 6, entities: 18, flows: 7, axes: 5, states: 5, seals: 5, modes: 4 };
  for (const [k, v] of Object.entries(expected)) {
    if (counts[k] !== v) fail('E1', `se esperaban ${v} ${k} y hay ${counts[k]}`);
  }
  const nodes = 1 + counts.domains + counts.entities;
  /* El resumen promociona tres cifras en palabras; si los datos cambian, el
   * texto tiene que cambiarse con ellos o el mapa miente. */
  const named = [
    { n: nodes, es: 'veinticinco', en: 'twenty-five' },
    { n: counts.domains, es: 'seis', en: 'six' },
    { n: counts.entities, es: 'dieciocho', en: 'eighteen' },
  ];
  for (const { n, es, en } of named) {
    if (!G.meta.es.summary.toLowerCase().includes(es)) fail('E1', `el resumen en español no nombra ${n} como '${es}'`);
    if (!G.meta.en.summary.toLowerCase().includes(en)) fail('E1', `el resumen en inglés no nombra ${n} como '${en}'`);
  }
  if (!/^HCU-LIVE-\d+\.\d+$/.test(G.meta.version)) fail('E1', `versión ${G.meta.version} fuera del esquema HCU-LIVE-x.y`);
  if (!isDate(G.meta.audited)) fail('E1', `meta.audited '${G.meta.audited}' no es una fecha ISO`);
  if (nodes === 25 && !errors.some((e) => e.startsWith('E1'))) pass('E1', `topología ${nodes} nodos = 1 ancla + ${counts.domains} regiones + ${counts.entities} entidades`);
}

/* ── E2 integridad de identificadores ─────────────────────────────────── */
{
  const seen = new Map();
  const addId = (id, where) => {
    if (seen.has(id)) fail('E2', `id duplicada '${id}' en ${where} y ${seen.get(id)}`);
    else seen.set(id, where);
  };
  addId('core', 'ancla');
  G.domains.forEach((d) => addId(d.id, 'región'));
  G.entities.forEach((e) => addId(e.id, 'entidad'));
  const nodeIds = new Set(seen.keys());

  G.entities.forEach((e) => {
    if (!G.domains.some((d) => d.id === e.dom)) fail('E2', `entidad '${e.id}' apunta a la región inexistente '${e.dom}'`);
  });
  G.flows.forEach((f) => {
    if (!nonEmpty(f.id)) fail('E2', 'flujo sin id');
    [...f.from, ...f.to].forEach((id) => {
      if (!nodeIds.has(id)) fail('E2', `flujo '${f.id}' referencia el nodo inexistente '${id}'`);
    });
    if (!f.from.length || !f.to.length) fail('E2', `flujo '${f.id}' necesita al menos un origen y un destino`);
  });
  G.chronology.forEach((c) => {
    if (!Array.isArray(c.refs) || !c.refs.length) { fail('E2', `crónica '${c.date}' sin refs`); return; }
    c.refs.forEach((id) => { if (!nodeIds.has(id)) fail('E2', `crónica '${c.date}' referencia '${id}' que no es un nodo`); });
    if (!isYearDate(c.date)) fail('E2', `crónica con fecha '${c.date}' fuera de AAAA o AAAA-MM-DD`);
  });
  const domsWithEntities = new Set(G.entities.map((e) => e.dom));
  G.domains.forEach((d) => { if (!domsWithEntities.has(d.id)) fail('E2', `región '${d.id}' sin ninguna entidad`); });
  if (!errors.some((e) => e.startsWith('E2'))) pass('E2', `${seen.size} ids únicos; todas las refs de flujos y crónicas resuelven`);
}

/* ── E3 vocabularios cerrados ──────────────────────────────────────────── */
{
  const KINDS = ['documento', 'registro', 'nodo', 'capacidad', 'actor', 'vacio'];
  const RISK = ['alto', 'medio', 'bajo'];
  const SEAL_VALUES = ['si', 'parcial', 'no', 'na'];
  const acts = Object.keys(G.activations);
  const stateCodes = G.states.map((s) => s.code);
  const sealKeys = G.sealDefs.map((s) => s.key);
  G.entities.forEach((e) => {
    if (!KINDS.includes(e.kind)) fail('E3', `'${e.id}' con kind '${e.kind}' fuera de ${KINDS.join('|')}`);
    if (!acts.includes(e.act)) fail('E3', `'${e.id}' con act '${e.act}' no declarado en activations`);
    if (!stateCodes.includes(e.st)) fail('E3', `'${e.id}' con st ${e.st} inexistente en states`);
    if (!RISK.includes(e.rk)) fail('E3', `'${e.id}' con rk '${e.rk}' fuera de ${RISK.join('|')}`);
    const own = Object.keys(e.seals).sort().join(',');
    const def = [...sealKeys].sort().join(',');
    if (own !== def) fail('E3', `'${e.id}' declara sellos [${own}] distintos del vocabulario [${def}]`);
    Object.entries(e.seals).forEach(([k, v]) => {
      if (!SEAL_VALUES.includes(v)) fail('E3', `'${e.id}' con valor de sello '${v}' inválido en '${k}'`);
    });
    if (e.kind === 'vacio' && e.act !== 'vacio') fail('E3', `'${e.id}' es kind 'vacio' pero act '${e.act}': el vacío debe nombrarse`);
  });
  G.modes.forEach((m) => {
    Object.keys(m.layers).forEach((k) => {
      if (!['flow', 'density', 'gravity', 'risk', 'evidence'].includes(k)) fail('E3', `modo '${m.id}' capa desconocida '${k}'`);
    });
  });
  if (!errors.some((e) => e.startsWith('E3'))) pass('E3', 'kind/act/st/rk y los cinco sellos usan sólo vocabularios publicados');
}

/* ── E4 evidencia ──────────────────────────────────────────────────────── */
{
  G.entities.forEach((e) => {
    if (e.st >= 3) fail('E4', `'${e.id}' en estado E${e.st}: hoy ninguna entidad TAMV tiene evidencia evaluada por tercero`);
    const hasSource = Array.isArray(e.src) && e.src.length > 0;
    if (!hasSource && e.kind !== 'vacio' && e.act !== 'vacio') fail('E4', `'${e.id}' sin fuente y sin declararse vacío`);
    if (e.seals.review === 'si' && e.st < 3) fail('E4', `'${e.id}' reclama revisión externa identificable sin estar en E3`);
    if (e.seals.persist === 'si' && !e.src.some((s) => /doi\.org|orcid\.org|figshare\.com|zenodo\.org/.test(s.href || ''))) {
      warn('E4', `'${e.id}' marca identificador persistente pero ninguna fuente apunta a un agente de identificación`);
    }
  });
  const hi = G.entities.filter((e) => e.st >= 3).length;
  if (!errors.some((e) => e.startsWith('E4'))) pass('E4', `${G.entities.length} entidades con evidencia <= E2; E3+ = ${hi} (coherente con el sitio)`);
}

/* ── E5 fuentes ────────────────────────────────────────────────────────── */
{
  const today = new Date().toISOString().slice(0, 10);
  const pageKeys = new Set();
  for (const [key, def] of Object.entries(JSON.parse(readFileSync(join(ROOT, 'i18n', 'pages.json'), 'utf8')).pages)) {
    Object.values(def.file).forEach((f) => pageKeys.add(f));
  }
  const checkHref = (where, href) => {
    if (!nonEmpty(href)) { fail('E5', `${where} sin href`); return; }
    if (external(href)) {
      if (!/^https?:\/\//.test(href)) fail('E5', `${where} usa un esquema no http(s): '${href}'`);
      return;
    }
    const clean = String(href).split('#')[0].split('?')[0].replace(/^\.\//, '');
    if (!clean) return;
    if (clean.startsWith('/')) { fail('E5', `${where} enlace absoluto '${href}': el sitio vive en rutas relativas`); return; }
    const fsOk = (() => { try { return readFileSync(join(WEB, clean), 'utf8').length >= 0; } catch { return false; } })();
    if (!fsOk) fail('E5', `${where} enlaza '${clean}' que no existe en web/`);
  };
  G.entities.forEach((e) => {
    (e.src || []).forEach((s, i) => {
      const where = `fuente ${e.id}[${i}]`;
      if (external(s.href) && !isDate(s.ver)) fail('E5', `${where} externa sin 'ver' ISO: '${s.ver}'`);
      if (isDate(s.ver) && s.ver > today) fail('E5', `${where} verificada en fecha futura ${s.ver}`);
      if (!nonEmpty(s.es) || !nonEmpty(s.en)) fail('E5', `${where} sin etiqueta en alguno de los dos idiomas`);
      checkHref(where, s.href);
    });
  });
  G.chronology.forEach((c) => { if (c.href) checkHref(`crónica ${c.date}`, c.href); });
  const totalSrc = G.entities.reduce((n, e) => n + (e.src || []).length, 0);
  const extSrc = G.entities.reduce((n, e) => n + (e.src || []).filter((s) => external(s.href)).length, 0);
  if (!errors.some((e) => e.startsWith('E5'))) pass('E5', `${totalSrc} fuentes (${extSrc} externas con fecha de verificación, ${totalSrc - extSrc} internas comprobadas en disco)`);
}

/* ── E6 paridad bilingüe ───────────────────────────────────────────────── */
{
  const pair = (a, b, where, keys) => {
    if (!a || !b) { fail('E6', `${where} sin objeto es/en completo`); return; }
    /* Los nombres propios y los códigos de región sí son idénticos por
     * diseño: «Isabella Villaseñor AI» no se traduce. La sospecha de copia
     * sólo aplica a la prosa. */
    const NOMINAL = ['name'];
    keys.forEach((k) => {
      const okEs = nonEmpty(a[k]);
      const okEn = nonEmpty(b[k]);
      if (!okEs) fail('E6', `${where}.${k} vacío en español`);
      if (!okEn) fail('E6', `${where}.${k} vacío en inglés`);
      if (NOMINAL.includes(k)) return;
      if (okEs && okEn && a[k].trim() === b[k].trim() && a[k].trim().split(/\s+/).length > 4) {
        warn('E6', `${where}.${k} idéntico en ambos idiomas: ¿traducción o copia?`);
      }
    });
  };
  pair(G.meta.es, G.meta.en, 'meta', ['title', 'summary']);
  pair(G.core.es, G.core.en, 'core', ['name', 'what', 'risk', 'next']);
  G.domains.forEach((d) => pair(d.es, d.en, `región:${d.id}`, ['name', 'field']));
  G.entities.forEach((e) => {
    pair(e.es, e.en, `entidad:${e.id}`, ['name', 'cls', 'what', 'risk', 'next']);
    (e.src || []).forEach((s, i) => {
      if (nonEmpty(s.es) && nonEmpty(s.en) && s.es.trim() === s.en.trim()) warn('E6', `fuente ${e.id}[${i}] sin traducir`);
    });
  });
  G.flows.forEach((f) => pair(f.es, f.en, `flujo:${f.id}`, ['claim', 'test']));
  G.chronology.forEach((c, i) => pair({ v: c.es }, { v: c.en }, `crónica:${i} ${c.date}`, ['v']));
  G.axes.forEach((a) => pair(a.es, a.en, `eje:${a.id}`, ['name', 'basis']));
  G.states.forEach((s) => { if (!nonEmpty(s.es) || !nonEmpty(s.en)) fail('E6', `estado ${s.code} sin etiqueta bilingüe`); });
  G.sealDefs.forEach((s) => { if (!nonEmpty(s.es) || !nonEmpty(s.en)) fail('E6', `sello '${s.key}' sin etiqueta bilingüe`); });
  G.modes.forEach((m) => pair(m.es, m.en, `modo:${m.id}`, ['name', 'ask']));
  Object.entries(G.activations).forEach(([k, v]) => { if (!nonEmpty(v.es) || !nonEmpty(v.en)) fail('E6', `activación '${k}' sin etiqueta bilingüe`); });
  if (!errors.some((e) => e.startsWith('E6'))) pass('E6', 'los dos idiomas cubren los mismos campos en los 25 nodos y sus metadatos');
}

/* ── E7 mediciones inventadas ──────────────────────────────────────────── */
{
  const forbiddenProps = ['score', 'trust', 'confidence', 'weight', 'impact', 'influence', 'power', 'rank'];
  const walk = (node, path) => {
    if (!node || typeof node !== 'object') return;
    Object.keys(node).forEach((k) => {
      const lp = k.toLowerCase();
      if (forbiddenProps.includes(lp) && typeof node[k] === 'number') {
        fail('E7', `${path}.${k} convierte una afirmación en número escrito a mano`);
      }
      walk(node[k], path + '.' + k);
    });
  };
  walk(G, 'G');
  const prose = [];
  G.entities.forEach((e) => {
    ['what', 'risk', 'next'].forEach((k) => {
      ['es', 'en'].forEach((lang) => {
        const txt = e[lang][k];
        if (/[0-9]\s?%/.test(txt) && !PERCENT_ALLOWLIST.has(e.id)) {
          fail('E7', `'${e.id}' publica un porcentaje en ${lang}.${k} sin auditoría que lo sustente`);
        }
        if (/[0-9]\s?%/.test(txt)) prose.push(e.id);
      });
    });
  });
  if (!errors.some((e) => e.startsWith('E7'))) pass('E7', `sin pseudo-métricas escritas a mano; porcentajes sólo en ${[...new Set(prose)].join(', ') || 'ninguna parte'}`);
}

/* ── E8 claims prohibidos por la metodología §7 ────────────────────────── */
{
  const src = readFileSync(join(WEB, 'assets', 'mapa', 'graph.js'), 'utf8');
  const banned = [
    ['BookPI', /book\s?pi/i],
    ['SHA3-512', /sha\s?-?\s?3\s?-?\s?512/i],
    ['certificación ISCIR Ω∞', /iscir/i],
    ['computación cuántica', /quanti[sz]a|cuántica|quantum/i],
    ['estado de Kubernetes', /kubernetes|\bk8s\b/i],
    ['afirmación de conciencia', /\bconsciente\b|\bconscious(ness)?\b|\bsentient\b/i],
    ['autoridad autónoma', /autoridad\s+aut[óo]noma|autonomous\s+authorit|self[- ]govern/i],
    ['garantía automática de verdad', /verdad\s+autom[táa]tica|automatically\s+true/i],
  ];
  banned.forEach(([label, re]) => {
    const m = src.match(re);
    if (m) {
      const at = src.slice(0, m.index).split('\n').length;
      fail('E8', `la metodología §7 retira '${label}'; aparece en la línea ${at}: "${m[0]}"`);
    }
  });
  if (!errors.some((e) => e.startsWith('E8'))) pass('E8', 'ninguno de los ocho claims retirados aparece en la fuente de datos');
}

/* ── coherencia con las capas que leen el grafo ─────────────────────────── */
{
  const engine = readFileSync(join(WEB, 'assets', 'mapa', 'map.js'), 'utf8');
  const patch = readFileSync(join(ROOT, 'tools', 'map-static-patch.mjs'), 'utf8');
  ['TAMV_GRAPH', 'sealDefs', 'activations', 'domains', 'entities', 'flows', 'SHA-512'].forEach((k) => {
    if (!engine.includes(k)) fail('E9', `el motor ya no menciona '${k}': revisa la lectura de graph.js`);
  });
  ['chronology', 'axes', 'states', 'hcu:static:start'].forEach((k) => {
    if (!patch.includes(k)) fail('E9', `el generador estático ya no usa '${k}'`);
  });
  if (!/crypto\.subtle\.digest/.test(engine)) fail('E9', 'el digestivo local dejó de usar Web Crypto; la promesa de instantánea es falsa');
  if (!/prefers-reduced-motion/.test(engine)) fail('E9', 'el motor ignora prefers-reduced-motion (metodología §6)');
  if (/data-hcu-replace/.test(engine) === false) fail('E9', 'el motor perdió la retirada del lienzo cuando falta graph.js');
  if (/(Registro de las \d|Register of the \d|Siete proposiciones|Seven relation)/.test(patch)) {
    fail('E9', 'el generador vuelve a fijar una cifra a mano en sus rótulos; la cifra debe salir del grafo');
  }
  ['mapa.html', join('en', 'living-universe.html')].forEach((f) => {
    let html;
    try { html = readFileSync(join(WEB, f), 'utf8'); } catch { fail('E9', `falta la página ${f}`); return; }
    ['hcu:static:start', 'hcu:static:end', 'data-hcu-stage', 'graph.js', 'map.js'].forEach((k) => {
      if (!html.includes(k)) fail('E9', `${f} perdió el anclaje '${k}'`);
    });
  });
  if (!errors.some((e) => e.startsWith('E9'))) pass('E9', 'motor, generador y páginas siguen consumiendo la misma fuente sin cifras propias');
}

/* ── E10 enlaces localizados (el orden del pipeline importa) ───────────── */
{
  const defs = JSON.parse(readFileSync(join(ROOT, 'i18n', 'pages.json'), 'utf8')).pages;
  const LOCALES = JSON.parse(readFileSync(join(ROOT, 'i18n', 'locales.json'), 'utf8')).locales.filter((l) => l.status === 'live');
  /* Nombre de archivo ajeno al idioma: si aparece suelto en una página, el
   * navegador lo resolvería dentro de la carpeta del idioma y daría 404.
   * Los archivos que coinciden en todos los idiomas (ror.html, 404.html) no
   * pueden estar mal. */
  const foreign = new Map(LOCALES.map((l) => [l.code, new Set()]));
  for (const def of Object.values(defs)) {
    for (const l of LOCALES) {
      const mine = def.file[l.code];
      if (!mine) continue;
      Object.entries(def.file).forEach(([c, f]) => {
        if (c !== l.code && f !== mine) foreign.get(l.code).add(f);
      });
    }
  }
  for (const l of LOCALES) {
    const rel = (l.prefix || '') + defs.map.file[l.code];
    let html;
    try { html = readFileSync(join(WEB, rel), 'utf8'); } catch { fail('E10', `no se puede leer ${rel}`); continue; }
    const bad = [...new Set((html.match(/href="([^"{}:#]+)"/g) || []).map((m) => m.slice(6, -1)))]
      .filter((h) => !h.includes('/') && !h.startsWith('/') && foreign.get(l.code).has(h));
    bad.forEach((h) => fail('E10', `${rel} conserva el nombre de otro idioma '${h}': hrefFor() del generador debe emitir el nombre del idioma de la página`));
    if (!bad.length) pass('E10', `${rel}: ningún enlace con nombre de idioma ajeno`);
  }
}

/* ── E11 degradación sin JavaScript ────────────────────────────────────── */
{
  const css = readFileSync(join(WEB, 'assets', 'mapa', 'map.css'), 'utf8');
  const defs = JSON.parse(readFileSync(join(ROOT, 'i18n', 'pages.json'), 'utf8')).pages.map.file;
  if (!/html:not\(\.js\)[\s\S]{0,80}\.hcu-stage[\s\S]{0,80}display:\s*none/.test(css)) {
    fail('E11', 'map.css ya no retira el lienzo cuando falta la clase .js: sin JavaScript quedaría un campo vacío');
  }
  for (const [code, rel] of Object.entries(defs)) {
    const html = readFileSync(join(WEB, (code === 'es' ? '' : code + '/'), rel), 'utf8');
    if (!/classList\.add\(["']js["']\)/.test(html)) fail('E11', `${rel} no marca .js: el lienzo quedaría visible sin JavaScript`);
    if (!/<div class="hcu-stage" data-hcu-stage data-hcu-replace>/.test(html)) fail('E11', `${rel}: el escenario perdió data-hcu-replace y no se retira si falta graph.js`);
    if (!/<noscript>/.test(html)) fail('E11', `${rel} no explica la vía de lectura sin JavaScript`);
  }
  if (!errors.some((e) => e.startsWith('E11'))) pass('E11', 'sin JavaScript el lienzo se retira y el registro de texto permanece');
}

/* ── E12 islote de rutas internas (#hcu-paths) ─────────────────────────── */
{
  const engine = readFileSync(join(WEB, 'assets', 'mapa', 'map.js'), 'utf8');
  if (!engine.includes("getElementById('hcu-paths')")) fail('E12', 'el motor ya no lee el islote #hcu-paths: el expediente volvería a enlazar nombres en español');
  if (!/siteHref\(/.test(engine)) fail('E12', 'el motor menciona #hcu-paths pero no lo usa al resolver los enlaces de fuente');

  /* Inventario de los enlaces internos que el grafo usa en tiempo de ejecución. */
  const internal = new Set();
  const collect = (h) => {
    if (!h || /^(https?:|mailto:|tel:|data:|#)/i.test(h)) return;
    internal.add(String(h).split('#')[0].split('?')[0].replace(/^\.\//, ''));
  };
  G.entities.forEach((e) => (e.src || []).forEach((x) => collect(x.href)));
  G.chronology.forEach((c) => collect(c.href));

  const LOCALES = JSON.parse(readFileSync(join(ROOT, 'i18n', 'locales.json'), 'utf8')).locales.filter((l) => l.status === 'live');
  const defs = JSON.parse(readFileSync(join(ROOT, 'i18n', 'pages.json'), 'utf8')).pages;

  for (const l of LOCALES) {
    const rel = (l.prefix || '') + defs.map.file[l.code];
    const html = readFileSync(join(WEB, rel), 'utf8');
    const open = '<script type="application/json" id="hcu-paths">';
    const close = '</script>';
    const hits = [];
    let at = 0;
    while (true) {
      const a = html.indexOf(open, at);
      if (a < 0) break;
      const b = html.indexOf(close, a);
      hits.push(html.slice(a + open.length, b));
      at = b + close.length;
    }
    if (hits.length !== 1) { fail('E12', 'se esperaba un unico islote #hcu-paths en ' + rel + ' y hay ' + hits.length); continue; }
    let map;
    try { map = JSON.parse(hits[0]); }
    catch (err) { fail('E12', rel + ': el islote #hcu-paths no es JSON valido'); continue; }

    /* El expediente sólo puede traducir lo que el islote cubre: una ruta
     * ausente caería al nombre en español y daría 404 en la carpeta /en. */
    [...internal].sort().forEach((h) => {
      if (!(h in map)) fail('E12', rel + ': #hcu-paths no cubre ' + h + ', el expediente enlazaría la página de otro idioma');
    });

    /* Nombres de archivo ajenos al idioma de la página. */
    const ajeno = new Set();
    for (const d of Object.values(defs)) {
      Object.entries(d.file).forEach(([c, f]) => {
        if (c !== l.code && f !== d.file[l.code]) ajeno.add(f);
      });
    }

    for (const [from, to] of Object.entries(map)) {
      if (ajeno.has(to)) { fail('E12', rel + ': #hcu-paths traduce ' + from + ' a ' + to + ', nombre de otro idioma'); continue; }
      if (/^(https?:|mailto:|tel:|data:|#)/i.test(to)) continue;
      const clean = String(to).replace(/^\.\//, '').split('#')[0].split('?')[0];
      if (!clean) continue;
      const target = join(WEB, l.prefix || '', clean);
      let existe = true;
      try { readFileSync(target, 'utf8'); } catch { existe = false; }
      if (!existe) fail('E12', rel + ': #hcu-paths lleva ' + from + ' a ' + to + ', que no existe en disco');
    }
    if (!errors.some((e) => e.startsWith('E12') && e.includes(rel))) {
      pass('E12', rel + ': islote #hcu-paths con ' + Object.keys(map).length + ' rutas del idioma de la pagina, todas comprobadas en disco');
    }
  }
}

/* ------------------------------------------------------------------ */
if (!QUIET) ok.forEach((l) => console.log('  ok  ' + l));
warnings.forEach((l) => console.log('  AVISO  ' + l));
errors.forEach((l) => console.log('  ERROR  ' + l));
console.log('');
console.log(`audit HCU · ${G.meta.version} · ${G.domains.length} regiones · ${G.entities.length} entidades · ${G.flows.length} flujos · ${G.chronology.length} hitos`);
console.log(`${errors.length} error(es), ${warnings.length} aviso(s)`);
if (errors.length) process.exitCode = 1;
