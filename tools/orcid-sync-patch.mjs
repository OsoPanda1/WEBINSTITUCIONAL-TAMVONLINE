// tools/orcid-sync-patch.mjs
//
// Sincroniza el sitio con la corrección del empleo en ORCID del fundador.
//
// POR QUÉ EXISTE: once pasajes del sitio documentan hoy —con datos reales y
// fechados— que el empleo institucional figura en ORCID como puesto PASADO
// (2020-01-01 → 2026-01-01) y con la denominación en mayúsculas. Esa
// contradicción es verificable por cualquiera y debilita el expediente ROR.
// Cuando el fundador corrija el registro, esos pasajes dejan de ser ciertos y
// hay que revertirlos; pero escribir "corregido" antes de que la fuente pública
// lo muestre sería exactamente el defecto que el sitio denuncia. Por eso este
// script NO confía en la orden del usuario: consulta la API y se niega a tocar
// un byte si la evidencia todavía no cambió.
//
// FUENTE (reproducible, sin autenticación):
//   GET https://pub.orcid.org/v3.0/0009-0008-5050-1539/employments
//     forma: .["affiliation-group"][].summaries[]["employment-summary"]
//     (el endpoint singular /employment devuelve 404; /employment-group no existe)
//   Estado leído el 2026-11-03: name "TAMV ONLINE NETWORK", end-date 2026-01-01,
//   city "MINERAL DEL MONTE", region "HIDALGO", disambiguated-organization null,
//   last-modified-date 2026-01-01T13:39:20Z.
//
// PUERTA (todas deben cumplirse para escribir; se informan una por una):
//   G1 organization.name == "TAMV Online Network"  (exacto, sin espacios sobrantes)
//   G2 sin fecha de cierre                          (puesto actual)
//   G3 start-date sigue en 2020                     (no se inventa una fecha nueva)
//   G4 país MX
// La ciudad y la región no bloquean: se leen del registro vivo y se reescriben
// literalmente donde el sitio las cita entre comillas, para que la cita siempre
// coincida con la fuente aunque el fundador decida mantenerlas en mayúsculas.
//
// FECHA QUE SE PUBLICA: la de `last-modified-date` del propio registro (UTC,
// YYYY-MM-DD), no la de ejecución. Es la fecha que un curador puede comprobar en
// la misma fuente, y evita que el sitio afirme "corregido el X" siendo X sólo el
// día en que alguien lanzó un script.
//
// MARCADORES en el texto nuevo: {{DATE}} {{CITY}} {{REGION}} {{RECORD}}. Se usan
// marcadores y no la letra suelta porque el texto bilingüe contiene F mayúsculas
// legítimas ("Founder", "Faculty").
//
// USO:
//   node tools/orcid-sync-patch.mjs               consulta la puerta; si pasa, aplica
//   node tools/orcid-sync-patch.mjs --dry         mismo recorrido, sin escribir
//   node tools/orcid-sync-patch.mjs --selftest    valida las reglas contra los archivos
//                                                 actuales sin leer la red ni escribir
// Idempotencia: cada `from` debe aparecer exactamente una vez; si ya se aplicó
// (`to` presente, `from` ausente) se cuenta como "ya aplicado"; si `to` contuviera
// `from` la regla se rechaza, porque al relanzar duplicaría el texto.
//
// TRAS APLICAR: node tools/i18n.mjs all
//   && node tools/schema-audit.mjs && node tools/map-data-audit.mjs
//   && node tools/vetra-log-audit.mjs

const fs = await import('node:fs');
const path = await import('node:path');
const { fileURLToPath } = await import('node:url');

// Raíz del proyecto deducida del propio script: quien clone el repo lo ejecuta
// desde su carpeta, sin rutas absolutas de esta máquina.
const WS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORCID_ID = '0009-0008-5050-1539';
const PUT_CODE = 33707742;
const API = `https://pub.orcid.org/v3.0/${ORCID_ID}/employments`;
const RECORD = `pub.orcid.org/v3.0/${ORCID_ID}/employment/${PUT_CODE}`;

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const SELFTEST = argv.includes('--selftest');

// ── reglas ─────────────────────────────────────────────────────────────────
const RULES = [
  // 1 · Ficha ROR ES: la fila de estado, que hoy ordena corregir.
  ['web/ror.html',
    '<td>Corregir antes: el empleo en ORCID figura cerrado en 2026-01</td><td><span class="tag tag-warn">Corregir ORCID</span></td>',
    '<td>Empleo corregido en ORCID el {{DATE}}: denominación <code>TAMV Online Network</code>, puesto actual sin fecha de cierre</td><td><span class="tag tag-ok">Corregido el {{DATE}}</span></td>'],
  // 2 · Ficha ROR ES: fase 1 del plan de remediación.
  ['web/ror.html',
    '<p>Registrar dominio propio · corregir el empleo cerrado en ORCID · normalizar la cadena de afiliación',
    '<p>Registrar dominio propio · corregir el empleo cerrado en ORCID (listo el {{DATE}}) · normalizar la cadena de afiliación'],
  // 3 · Ficha ROR ES: lista de verificación previa al envío.
  ['web/ror.html',
    '<li>Empleo del fundador en ORCID reactivado como puesto actual, sin fecha de cierre.</li>',
    '<li>Empleo del fundador en ORCID reactivado como puesto actual, sin fecha de cierre — <b>listo el {{DATE}}</b>.</li>'],
  // 4-6 · espejos EN de las tres anteriores.
  ['web/en/ror.html',
    '<td>Correct first: the employment in ORCID is recorded as closed in 2026-01</td><td><span class="tag tag-warn">Correct ORCID</span></td>',
    '<td>Employment corrected in ORCID on {{DATE}}: name <code>TAMV Online Network</code>, current position with no end date</td><td><span class="tag tag-ok">Corrected on {{DATE}}</span></td>'],
  ['web/en/ror.html',
    '<p>Register an own domain · correct the closed employment in ORCID · normalise the affiliation string',
    '<p>Register an own domain · correct the closed employment in ORCID (done on {{DATE}}) · normalise the affiliation string'],
  ['web/en/ror.html',
    "<li>Founder's employment in ORCID reinstated as a current position, with no end date.</li>",
    "<li>Founder's employment in ORCID reinstated as a current position, with no end date — <b>done on {{DATE}}</b>.</li>"],
  // 7 · Borrador del registro ROR: el comentario de estado.
  ['web/ror-record-draft.json',
    '"$comment_status": "Corregir antes de enviar: el empleo del fundador en ORCID figura cerrado en 2026-01-01.",',
    '"$comment_status": "Empleo del fundador corregido en ORCID el {{DATE}}: puesto actual sin fecha de cierre y denominacion TAMV Online Network.",'],
  // 8 · Borrador del registro ROR: deja de figurar como brecha alta.
  ['web/ror-record-draft.json',
    '      "ISNI publicado sin verificar su tipo de entidad",\n      "Empleo del fundador cerrado en el registro ORCID"\n',
    '      "ISNI publicado sin verificar su tipo de entidad"\n'],
  // 9-10 · Tabla de cómo se escribe la cadena en cada contexto.
  ['web/produccion.html',
    '<tr><td>ORCID · empleos</td><td class="mono">Organization: TAMV ONLINE NETWORK → corregir a "TAMV Online Network" · puesto actual, sin fecha de cierre</td></tr>',
    '<tr><td>ORCID · empleos</td><td class="mono">Organization: "TAMV Online Network" · puesto actual, sin fecha de cierre (corregido el {{DATE}})</td></tr>'],
  ['web/en/outputs.html',
    '<tr><td>ORCID · employment</td><td class="mono">Organization: TAMV ONLINE NETWORK → correct to "TAMV Online Network" · current position, no end date</td></tr>',
    '<tr><td>ORCID · employment</td><td class="mono">Organization: "TAMV Online Network" · current position, no end date (corrected on {{DATE}})</td></tr>'],
  // 11-12 · Procedencia del alias en mayúsculas: seguía vigente en ORCID.
  ['web/organizacion.html',
    'cadena de afiliación en 38 de los 44 DOIs de DataCite y nombre del registro de empleo en ORCID.',
    'cadena de afiliación en 38 de los 44 DOIs de DataCite; fue además el nombre del registro de empleo en ORCID hasta su corrección el {{DATE}}.'],
  ['web/en/organization.html',
    'the affiliation string in 38 of the 44 DataCite DOIs and the name in the ORCID employment record.',
    'the affiliation string in 38 of the 44 DataCite DOIs; it was also the name in the ORCID employment record until its correction on {{DATE}}.'],
  // 13-14 · La misma procedencia en la ficha ROR (fila de aliases).
  ['web/ror.html',
    '<td>Variantes detectadas en depósitos y en el registro de empleo de ORCID;',
    '<td>Variantes detectadas en los depósitos y, hasta su corrección el {{DATE}}, en el registro de empleo de ORCID;'],
  ['web/en/ror.html',
    '<td>Variants detected in deposits and in the ORCID employment record;',
    '<td>Variants detected in deposits and, until its correction on {{DATE}}, in the ORCID employment record;'],
  // 15-16 · Bloque de contradicción en la página de investigación.
  ['web/investigacion.html',
    '      <div class="note warn" style="margin-top:22px">\n        <h3>Contradicción registrada que debe corregirse</h3>\n        <p>En el registro ORCID del fundador, el empleo en <em>TAMV ONLINE NETWORK</em> figura con fechas <code>2020-01-01 → 2026-01-01</code>, es decir como puesto <b>pasado</b>. Mientras esa fuente siga así, la evidencia oficial contradice la afirmación de continuidad de la red y debilita esta página. Debe actualizarse a puesto actual sin fecha de cierre antes de enviar cualquier solicitud.</p>',
    '      <div class="note ok" style="margin-top:22px">\n        <h3>Contradicción registrada y corregida</h3>\n        <p>El empleo en <em>TAMV Online Network</em> consta en el registro ORCID del fundador como puesto actual sin fecha de cierre desde el {{DATE}}. Hasta esa fecha figuraba con fechas <code>2020-01-01 → 2026-01-01</code>, como puesto pasado, y esa era la contradicción que un curador encontraba en cinco minutos. Verificable en la API pública: <code>{{RECORD}}</code>.</p>'],
  ['web/en/research.html',
    '      <div class="note warn" style="margin-top:22px">\n        <h3>Registered contradiction that must be corrected</h3>\n        <p>In the founder\'s ORCID record, the employment at <em>TAMV ONLINE NETWORK</em> appears with dates <code>2020-01-01 → 2026-01-01</code>, that is, as a <b>past</b> position. While that source stays this way, the official evidence contradicts the network\'s claim of continuity and weakens this page. It must be updated to a current position without an end date before any application is sent.</p>',
    '      <div class="note ok" style="margin-top:22px">\n        <h3>Registered contradiction, now corrected</h3>\n        <p>In the founder\'s ORCID record the employment at <em>TAMV Online Network</em> has stood as a current position with no end date since {{DATE}}. Until that date it appeared as <code>2020-01-01 → 2026-01-01</code>, a past position, and that was the contradiction a curator could find in five minutes. Checkable in the public API: <code>{{RECORD}}</code>.</p>'],
  // 17-18 · Bloque de dato inconsistente en la ficha institucional.
  ['web/organizacion.html',
    '      <div class="note warn" style="margin-top:24px">\n        <h4>Dato inconsistente a corregir antes de solicitar</h4>\n        <p>En el registro ORCID del fundador, el empleo en <em>TAMV ONLINE NETWORK</em> figura con fechas <code>2020-01-01 → 2026-01-01</code>, es decir, como puesto <b>pasado</b>. Debe actualizarse a puesto actual sin fecha de cierre antes de enviar cualquier solicitud, o la propia fuente de evidencia contradirá la afirmación de continuidad.</p>',
    '      <div class="note ok" style="margin-top:24px">\n        <h4>Dato inconsistente corregido</h4>\n        <p>El empleo institucional del fundador en ORCID quedó corregido el {{DATE}}: denominación <code>TAMV Online Network</code> y puesto actual sin fecha de cierre. Antes de esa fecha figuraba como <em>TAMV ONLINE NETWORK</em> con fechas <code>2020-01-01 → 2026-01-01</code>, es decir como puesto pasado, y la propia fuente de evidencia contradecía la afirmación de continuidad.</p>'],
  ['web/en/organization.html',
    '      <div class="note warn" style="margin-top:24px">\n        <h4>Inconsistent datum to correct before applying</h4>\n        <p>In the founder\'s ORCID record, the employment at <em>TAMV ONLINE NETWORK</em> appears with dates <code>2020-01-01 → 2026-01-01</code>, that is, as a <b>past</b> position. It must be updated to a current position without an end date before any application is sent, or the very source of evidence will contradict the claim of continuity.</p>',
    '      <div class="note ok" style="margin-top:24px">\n        <h4>Inconsistent datum, now corrected</h4>\n        <p>The founder\'s institutional employment in ORCID was corrected on {{DATE}}: name <code>TAMV Online Network</code>, current position with no end date. Before that date it read <em>TAMV ONLINE NETWORK</em> with dates <code>2020-01-01 → 2026-01-01</code>, a past position, and the evidence source itself contradicted the continuity claim.</p>'],
  // 19-20 · Bloque de gobernanza.
  ['web/gobernanza.html',
    '      <div class="note warn" style="margin-top:24px">\n        <h3>Inconsistencia que contradice el modelo</h3>\n        <p>El empleo del fundador en ORCID figura cerrado el <code>2026-01-01</code>, como puesto pasado. Esa fuente pública contradice la afirmación de continuidad y debe corregirse a puesto actual sin fecha de cierre antes de invocar el registro como evidencia (ver <a href="organizacion.html">ficha institucional</a>).</p>',
    '      <div class="note ok" style="margin-top:24px">\n        <h3>Inconsistencia corregida</h3>\n        <p>El empleo del fundador en ORCID consta desde el {{DATE}} como puesto actual sin fecha de cierre. Hasta esa fecha figuraba cerrado el <code>2026-01-01</code>, como puesto pasado, y esa fuente pública contradecía la afirmación de continuidad (ver <a href="organizacion.html">ficha institucional</a>).</p>'],
  ['web/en/governance.html',
    '      <div class="note warn" style="margin-top:24px">\n        <h3>An inconsistency that contradicts the model</h3>\n        <p>The founder\'s employment in ORCID is listed as closed on <code>2026-01-01</code>, as a past position. That public source contradicts the continuity claim, and it must be corrected to a current position without an end date before the record is invoked as evidence (see the <a href="organization.html">institution profile</a>).</p>',
    '      <div class="note ok" style="margin-top:24px">\n        <h3>An inconsistency, now corrected</h3>\n        <p>The founder\'s employment in ORCID has been listed as a current position with no end date since {{DATE}}. Until that date it was closed on <code>2026-01-01</code> as a past position, and that public source contradicted the continuity claim (see the <a href="organization.html">institution profile</a>).</p>'],
  // 21-22 · Lista de registros pendientes de corrección (contacto).
  ['web/contacto.html',
    '<li>Empleo en ORCID del fundador, que figura cerrado en 2026-01 y debe constar como puesto actual.</li>',
    '<li>Empleo en ORCID del fundador: corregido el {{DATE}} — denominación <code>TAMV Online Network</code> y puesto actual sin fecha de cierre.</li>'],
  ['web/en/contact.html',
    "<li>The employment in the founder's ORCID, which is recorded as closed in 2026-01 and should stand as a current position.</li>",
    "<li>The employment in the founder's ORCID: corrected on {{DATE}} — name <code>TAMV Online Network</code>, current position with no end date.</li>"],
  // 23-24 · Cita textual de la sede: se reescribe con el valor vivo, no con el que
  // el sitio recordaba. Si el fundador mantiene las mayúsculas, la regla no cambia
  // nada y se reporta como "sin cambio".
  ['web/organizacion.html',
    '("MINERAL DEL MONTE, HIDALGO, MX")',
    '("{{CITY}}, {{REGION}}, MX")'],
  ['web/en/organization.html',
    '("MINERAL DEL MONTE, HIDALGO, MX")',
    '("{{CITY}}, {{REGION}}, MX")'],
];

// ── lectura de la fuente ───────────────────────────────────────────────────
async function liveEmployment() {
  const res = await fetch(API, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`ORCID devolvió HTTP ${res.status} en ${API}`);
  const json = await res.json();
  const groups = json['affiliation-group'] || [];
  const items = [];
  for (const g of groups) for (const s of g.summaries || []) if (s['employment-summary']) items.push(s['employment-summary']);
  const mine = items.find((e) => e['put-code'] === PUT_CODE);
  if (!mine) throw new Error(`put-code ${PUT_CODE} no aparece en la respuesta (${items.length} empleos)`);
  return { record: mine, total: items.length };
}

const val = (node) => (node == null ? null : typeof node === 'object' ? (node.value ?? null) : String(node));
const ymd = (ms) => (ms ? new Date(ms).toISOString().slice(0, 10) : null);

function evaluate(record) {
  const org = record.organization || {};
  const addr = org.address || {};
  const name = org.name == null ? null : String(org.name);
  const end = record['end-date'];
  const endYear = end && end.year ? val(end.year) : null;
  const startYear = record['start-date'] ? val(record['start-date'].year) : null;
  const gates = [
    ['G1 denominacion == "TAMV Online Network"', (name || '').trim() === 'TAMV Online Network', `leido: ${JSON.stringify(name)}`],
    ['G2 sin fecha de cierre', endYear == null, endYear ? `leido end-date ${endYear}` : 'ausente'],
    ['G3 start-date sigue en 2020', startYear === '2020', `leido: ${startYear}`],
    ['G4 pais MX', String(addr.country || '').toUpperCase() === 'MX', `leido: ${JSON.stringify(addr.country)}`],
  ];
  return {
    ok: gates.every((g) => g[1]),
    gates,
    date: ymd(val(record['last-modified-date'])),
    city: String(addr.city || '').trim(),
    region: String(addr.region || '').trim(),
  };
}

// ── aplicación de reglas ───────────────────────────────────────────────────
function fill(to, ctx) {
  return to
    .split('{{DATE}}').join(ctx.date)
    .split('{{CITY}}').join(ctx.city)
    .split('{{REGION}}').join(ctx.region)
    .split('{{RECORD}}').join(RECORD);
}

function applyRules(ctx, { write }) {
  const byFile = new Map();
  for (const [rel, from, rawTo] of RULES) byFile.set(rel, [...(byFile.get(rel) || []), [from, rawTo]]);
  let applied = 0, already = 0, unchanged = 0, failed = 0;
  for (const [rel, list] of byFile) {
    const abs = path.join(WS, rel);
    if (!fs.existsSync(abs)) { console.error(`ERROR ${rel}: no existe`); failed += list.length; continue; }
    let s = fs.readFileSync(abs, 'utf8');
    const original = s;
    for (const [from, rawTo] of list) {
      const to = fill(rawTo, ctx);
      if (to === from) { console.log(`SIN CAMBIO ${rel}: la cita ya coincide con la fuente: ${from.slice(0, 46)}`); unchanged++; continue; }
      if (to.includes(from)) {
        console.error(`ERROR ${rel}: regla no idempotente, el texto nuevo contiene el viejo: ${from.slice(0, 70)}`);
        failed++; continue;
      }
      const count = s.split(from).length - 1;
      const done = s.split(to).length - 1;
      if (count === 0 && done >= 1) { already++; continue; }
      if (count === 0 && done === 0) { console.error(`ERROR ${rel}: cadena no encontrada: ${from.slice(0, 90)}`); failed++; continue; }
      if (count !== 1) { console.error(`ERROR ${rel}: la cadena aparece ${count} veces (se exige 1): ${from.slice(0, 90)}`); failed++; continue; }
      s = s.replace(from, to);
      applied++;
    }
    if (s !== original) {
      if (write) fs.writeFileSync(abs, s, 'utf8');
      else console.log(`[dry] ${rel}: se escribirían cambios`);
    }
  }
  console.log(`aplicado: ${applied} · ya aplicado: ${already} · sin cambio: ${unchanged} · fallas: ${failed}`);
  return { applied, already, unchanged, failed };
}

// ── ejecución ──────────────────────────────────────────────────────────────
if (SELFTEST) {
  // Validación estática: cada regla debe casar exactamente una vez contra el
  // árbol de hoy. Se rellena con la fecha de lectura y los valores vivos del
  // registro, de modo que la regla de la sede caiga en "sin cambio".
  const ctx = { date: '2026-11-03', city: 'MINERAL DEL MONTE', region: 'HIDALGO' };
  console.log('SELFTEST contra el árbol actual, sin leer la red ni escribir.');
  const r = applyRules(ctx, { write: false });
  const duplicated = [];
  for (const [rel, from, rawTo] of RULES) {
    const to = fill(rawTo, ctx);
    const s = fs.readFileSync(path.join(WS, rel), 'utf8');
    if (to === from) continue;
    if (s.split(to).length - 1 > 1) duplicated.push(`${rel} → ${to.slice(0, 60)}`);
    const after = s.replace(from, to);
    if (after.split(to).length - 1 !== 1) duplicated.push(`TRAS APLICAR ${rel}: ${after.split(to).length - 1} ocurrencias de ${to.slice(0, 50)}`);
  }
  console.log(duplicated.length ? 'DUPLICADOS: ' + duplicated.join(' | ') : 'SIN DUPLICADOS DE TEXTO');
  process.exit(r.failed || duplicated.length ? 1 : 0);
}

let source;
try {
  source = await liveEmployment();
} catch (e) {
  console.error('No se pudo leer la fuente pública: ' + e.message);
  process.exit(1);
}
const { record, total } = source;
const verdict = evaluate(record);
console.log(`ORCID · ${total} empleo(s) · put-code ${PUT_CODE} · last-modified ${verdict.date}`);
console.log(`organization: ${JSON.stringify(record.organization)}`);
for (const [name, pass, detail] of verdict.gates) console.log(`${pass ? 'OK  ' : 'NO  '} ${name} — ${detail}`);
if (!verdict.ok) {
  console.log('\nPUERTA FALLIDA: la fuente pública todavía no documenta la corrección, así que el sitio no puede afirmar que existe. No se modificó ningún archivo.');
  console.log('Valores a escribir en ORCID (Employment → Organization): TAMV Online Network · Mineral del Monte · Hidalgo · MX · Start 2020/01 · End: DEJAR EN BLANCO.');
  process.exit(2);
}
if (!verdict.date) { console.error('El registro no trae last-modified-date: no se puede fechar la afirmación. Aborte.'); process.exit(1); }
const ctx = { date: verdict.date, city: verdict.city || 'MINERAL DEL MONTE', region: verdict.region || 'HIDALGO' };
console.log(`\nPuerta superada. Fecha publicada: ${ctx.date} (last-modified de ORCID).`);
const out = applyRules(ctx, { write: !DRY });
if (out.failed) { console.error('Hay reglas con fallas: revisa el árbol antes de commitear.'); process.exit(1); }
console.log(DRY ? 'Modo dry: no se escribió nada.' : 'Aplicado. A continuación: node tools/i18n.mjs all && node tools/schema-audit.mjs');
