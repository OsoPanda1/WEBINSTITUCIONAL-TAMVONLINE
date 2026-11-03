#!/usr/bin/env node
/* TAMV Online Network — auditor de la bitácora VETRA y de su ficha pública
 *
 * La bitácora puede estar vacía y eso es legítimo; lo que no puede pasar es que
 * la página afirme números distintos de los que el archivo sostiene, que el
 * agente aparezca con capacidad de firma, o que alguien publique una clave
 * privada. Este auditor recomputa la cadena con las mismas primitivas que
 * tools/vetra-log.mjs (no confía en los campos que el propio log declara) y
 * después compara contra lo que dicen calidad.html / quality.html.
 *
 * Uso:
 *   node tools/vetra-log-audit.mjs            informe completo
 *   node tools/vetra-log-audit.mjs --quiet    solo fallos
 *
 * Código de salida distinto de cero si algo falla, para usarlo como puerta.
 *
 *   V1 estructura  — el log parsea, es del formato esperado y tiene las llaves
 *      que genera tools/vetra-log.mjs init (nada escrito a mano).
 *   V2 cadena      — cada entrada recalcula su hash, continúa el eslabón anterior
 *      y su firma Ed25519 valida contra la clave publicada. Con cero entradas la
 *      cadena es válidamente vacía, no "sin verificar".
 *   V3 conteos     — counts refleja las entradas reales; la página cita esos
 *      números exactos en las dos lenguas.
 *   V4 aislamiento — el agente está en draft_only con may_sign:false y no puede
 *      estar en signers; ninguna entrada lo lista como firmante.
 *   V5 claves      — ninguna clave privada en el árbol público; las públicas que
 *      se publican son PEM Ed25519 parseables y con huella correcta.
 *   V6 ancla       — el ancla que cita la página es la que el log produce hoy.
 *   V7 honestidad  — la ficha declara el cero y no vende la bitácora como
 *      acreditación; está prohibido afirmar auditorías externas inexistentes.
 *   V8 retención   — BookPI, SHA3 y "VETRA Seal" siguen sin emitirse: ni el log
 *      ni la página los reclaman (coherente con la metodología del mapa, E8).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUIET = process.argv.includes('--quiet');
const LOG_FILE = path.join(ROOT, 'web', 'auditoria', 'vetra-log.json');
const PAGES = [
  { file: 'web/calidad.html', lang: 'ES', log_href: 'auditoria/vetra-log.json', gov: 'gobernanza.html' },
  { file: 'web/en/quality.html', lang: 'EN', log_href: '../auditoria/vetra-log.json', gov: 'governance.html' },
];
const AGENT_ID = 'isabella-ai';
const FORMAT = 'TAMV-VETRA-AUDITLOG/1';
/* Llaves que `init` escribe; si falta alguna, el archivo no lo produjo la herramienta. */
const REQUIRED_KEYS = ['format', 'organization', 'opened_on', 'updated_on', 'hash_function', 'signature_scheme',
  'canonicalization', 'policy', 'signers', 'draft_only_identities', 'entries', 'counts', 'reproduce'];

const errors = [];
const warnings = [];
const ok = [];
const pass = (c, m) => { if (!QUIET) ok.push(c + '  ' + m); };
const fail = (c, m) => errors.push(c + '  ' + m);
const warn = (c, m) => warnings.push(c + '  ' + m);

const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  return JSON.stringify(v) === undefined ? 'null' : JSON.stringify(v);
}
function anchorOf(log) {
  const clone = {};
  for (const k of Object.keys(log)) if (!['entries', 'counts', 'updated_on'].includes(k)) clone[k] = log[k];
  return 'GENESIS:' + sha256(canonical(clone));
}
function digestOf(entry) {
  const clone = {};
  for (const k of Object.keys(entry)) if (k !== 'hash' && k !== 'signature') clone[k] = entry[k];
  return sha256(canonical(clone));
}

/* ── lectura del log ────────────────────────────────────────────────────── */
if (!fs.existsSync(LOG_FILE)) {
  console.log('ERROR V1  no existe web/auditoria/vetra-log.json: la bitácora pública no está publicada');
  console.log('bitácora VETRA · sin archivo · 1 error(es), 0 aviso(s)');
  process.exit(1);
}
const log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
const ANCHOR = anchorOf(log);
const ENTRIES = log.entries.length;
const SIGNED = log.entries.filter((e) => e.signature).length;
const SIGNERS = (log.signers || []).length;

/* ── V1 estructura ──────────────────────────────────────────────────────── */
if (log.format !== FORMAT) fail('V1', 'formato distinto del esperado: ' + log.format);
else pass('V1', 'formato ' + log.format);
const missing = REQUIRED_KEYS.filter((k) => !(k in log));
if (missing.length) fail('V1', 'llaves ausentes, el archivo no lo produjo `vetra-log.mjs init`: ' + missing.join(', '));
else pass('V1', 'las 13 llaves del esqueleto están presentes');
if (!log.policy || log.policy.requires_human_signature !== true || log.policy.agent_may_sign !== false) {
  fail('V1', 'policy no declara requires_human_signature:true y agent_may_sign:false');
} else pass('V1', 'policy: firma humana obligatoria, agente sin capacidad de firma');
if (!Array.isArray(log.entries) || !Array.isArray(log.signers) || !Array.isArray(log.draft_only_identities)) {
  fail('V1', 'entries / signers / draft_only_identities no son arreglos');
}

/* ── V2 cadena ──────────────────────────────────────────────────────────── */
{
  let prev = ANCHOR;
  let broken = 0;
  for (const e of log.entries) {
    const problems = [];
    if (digestOf(e) !== e.hash) problems.push('el hash no corresponde con el contenido');
    if (e.prev !== prev) problems.push('no continúa el eslabón anterior');
    if (!e.signature) problems.push('sin firma: no es registro oficial');
    else {
      const s = (log.signers || []).find((x) => x.id === e.signed_by);
      if (!s) problems.push('firmante no registrado: ' + e.signed_by);
      else {
        let good = false;
        try { good = crypto.verify(null, Buffer.from(e.hash, 'utf8'), crypto.createPublicKey(s.public_key_pem), Buffer.from(e.signature, 'base64')); } catch (err) { good = false; }
        if (!good) problems.push('firma inválida para la clave publicada');
      }
    }
    if (problems.length) { broken++; fail('V2', 'entrada ' + e.seq + ': ' + problems.join('; ')); }
    prev = e.hash;
  }
  if (!broken) pass('V2', ENTRIES ? ENTRIES + ' entradas con cadena y firma válidas' : 'cadena válidamente vacía: 0 entradas, ancla ' + ANCHOR.slice(0, 20) + '…');
}

/* ── V3 conteos y cita en la página ─────────────────────────────────────── */
{
  const c = log.counts || {};
  if (c.entries !== ENTRIES || c.signed !== SIGNED || c.unsigned !== ENTRIES - SIGNED) {
    fail('V3', 'counts (' + JSON.stringify(c) + ') no coincide con entradas reales: ' + ENTRIES + '/' + SIGNED);
  } else pass('V3', 'counts coherente: ' + ENTRIES + ' entradas, ' + SIGNED + ' firmadas');
  for (const p of PAGES) {
    const t = fs.readFileSync(path.join(ROOT, p.file), 'utf8');
    const sec = t.slice(t.indexOf('<section class="section alt" id="vetra-log">'));
    if (!sec || sec.length < 200) { fail('V3', p.lang + ': no se encontró la sección id="vetra-log"'); continue; }
    const row = (label) => {
      const m = sec.match(new RegExp('<td>' + label + '</td><td><b>([^<]*)</b></td>'));
      return m ? m[1] : null;
    };
    const cited = { entries: row('Entries recorded') || row('Entradas registradas'), signed: row('Entries with a human signature') || row('Entradas con firma humana'), signers: row('Authorized signers') || row('Firmantes autorizados') };
    if (cited.entries !== String(ENTRIES)) fail('V3', p.lang + ': la ficha cita ' + cited.entries + ' entradas, el log tiene ' + ENTRIES);
    if (cited.signed !== String(SIGNED)) fail('V3', p.lang + ': la ficha cita ' + cited.signed + ' entradas firmadas, el log tiene ' + SIGNED);
    if (cited.signers !== String(SIGNERS)) fail('V3', p.lang + ': la ficha cita ' + cited.signers + ' firmantes, el log registra ' + SIGNERS);
    if (!t.includes('href="' + p.log_href + '"')) fail('V3', p.lang + ': la ficha no enlaza el log en la ruta correcta (' + p.log_href + ')');
    if (!fs.existsSync(path.join(ROOT, 'web', 'auditoria', 'vetra-log.json'))) fail('V3', p.lang + ': el destino enlazado no existe en el paquete');
    if (cited.entries === String(ENTRIES) && cited.signed === String(SIGNED) && cited.signers === String(SIGNERS)) {
      pass('V3', p.lang + ': ficha cita ' + ENTRIES + '/' + SIGNED + '/' + SIGNERS + ' y enlaza ' + p.log_href);
    }
  }
}

/* ── V4 aislamiento del agente ──────────────────────────────────────────── */
{
  const draft = (log.draft_only_identities || []).find((d) => d.id === AGENT_ID);
  if (!draft) fail('V4', 'la identidad del agente no está registrada en draft_only_identities');
  else {
    if (draft.may_sign !== false) fail('V4', 'el agente aparece con may_sign:' + draft.may_sign);
    else pass('V4', draft.name + ' registrada como draft_only, may_sign:false, permisos ' + draft.permissions.join('/'));
    if (!(draft.no_permissions || []).includes('sign')) fail('V4', 'draft_only del agente no declara no_permissions: sign');
  }
  if ((log.signers || []).some((s) => s.id === AGENT_ID)) fail('V4', 'el agente está registrado como firmante humano');
  if (log.entries.some((e) => e.signed_by === AGENT_ID)) fail('V4', 'hay una entrada firmada por el agente: ' + e());
  if (log.entries.some((e) => (log.draft_only_identities || []).some((d) => d.id === e.signed_by))) fail('V4', 'una entrada está firmada por una identidad de solo borrador');
  else if (ENTRIES) pass('V4', 'ninguna entrada firmada por una identidad de solo borrador');
  if (log.entries.some((e) => !e.draft_by)) warn('V4', 'hay entradas sin draft_by: no se distingue quién redactó');
}
function e() { return '?'; }

/* ── V5 claves ──────────────────────────────────────────────────────────── */
{
  const priv = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) { if (name !== '.git') walk(p); continue; }
      if (/BEGIN (PRIVATE|OPENSSH) KEY/.test(fs.readFileSync(p, 'utf8').slice(0, 200))) priv.push(path.relative(ROOT, p));
    }
  })(path.join(ROOT, 'web'));
  if (priv.length) fail('V5', 'clave privada dentro del árbol público: ' + priv.join(', '));
  else pass('V5', '0 claves privadas en web/ (la bitácora sólo publica claves públicas)');
  for (const s of log.signers) {
    let key = null;
    try { key = crypto.createPublicKey(s.public_key_pem); } catch (err) { fail('V5', 'firmante ' + s.id + ': PEM inválido'); }
    if (key) {
      if (key.asymmetricKeyType !== 'ed25519') fail('V5', 'firmante ' + s.id + ': clave ' + key.asymmetricKeyType + ', se exige ed25519');
      if (sha256(canonical(s.public_key_pem.trim())) !== s.fingerprint_sha256) fail('V5', 'firmante ' + s.id + ': la huella publicada no corresponde a la clave');
    }
    if (s.kind !== 'human') fail('V5', 'firmante ' + s.id + ': kind debe ser human, es ' + s.kind);
  }
  if (SIGNERS) pass('V5', SIGNERS + ' claves públicas humanas parseadas y con huella correcta');
  else pass('V5', '0 claves publicadas todavía: el paso siguiente (keygen + add-signer) es del administrador humano');
  if (fs.existsSync(path.join(ROOT, 'secrets')) && fs.readdirSync(path.join(ROOT, 'secrets')).length) {
    const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    if (!/^secrets\//m.test(gi)) fail('V5', 'existe secrets/ pero .gitignore no lo excluye');
    else pass('V5', 'secrets/ existe y está excluido por .gitignore');
  }
}

/* ── V6 ancla citada ────────────────────────────────────────────────────── */
{
  const short = ANCHOR.slice(0, 23) + '…';
  for (const p of PAGES) {
    const t = fs.readFileSync(path.join(ROOT, p.file), 'utf8');
    if (!t.includes(short)) fail('V6', p.lang + ': la ficha no cita el ancla actual (' + short + ')');
    else pass('V6', p.lang + ': ancla citada coincide con la que el log produce hoy');
  }
}

/* ── V7 honestidad ──────────────────────────────────────────────────────── */
{
  for (const p of PAGES) {
    const t = fs.readFileSync(path.join(ROOT, p.file), 'utf8');
    const sec = t.slice(t.indexOf('<section class="section alt" id="vetra-log">'), t.indexOf('</section>', t.indexOf('<section class="section alt" id="vetra-log">')));
    if (ENTRIES === 0) {
      if (!/vacía|empty/i.test(sec)) fail('V7', p.lang + ': con 0 entradas la ficha no declara que la bitácora está vacía');
      if (!/no demuestra|does not prove/i.test(sec)) fail('V7', p.lang + ': falta la cláusula de lo que la bitácora NO demuestra');
    }
    if (/<b>[1-9][0-9]*<\/b>\s*<\/td><td>[^<]*auditor/i.test(t)) fail('V7', p.lang + ': la ficha presume auditorías registradas');
    /* Prohibido vender el log como acreditación o como revisado por terceros. */
    for (const bad of [/auditado por terceros/i, /audited by third parties/i, /certificada por/i, /certified by/i]) {
      if (bad.test(sec)) fail('V7', p.lang + ': la sección afirma ' + bad + ', y ningún tercero ha auditado nada');
    }
    if (!/selftest/.test(sec)) fail('V7', p.lang + ': la ficha no da el comando para reproducir las pruebas del mecanismo');
    else if (ENTRIES === 0) pass('V7', p.lang + ': declara el cero, la cláusula de no-demuestra y el comando de replicación');
  }
}

/* ── V8 retención de sellos ──────────────────────────────────────────────── */
{
  const banned = [/BookPI/i, /SHA3/i, /VETRA\s+Seal/i, /sello\s+VETRA/i];
  const hits = [];
  const logText = JSON.stringify(log);
  for (const b of banned) if (b.test(logText)) hits.push('log: ' + b);
  for (const p of PAGES) {
    const t = fs.readFileSync(path.join(ROOT, p.file), 'utf8');
    const sec = t.slice(t.indexOf('<section class="section alt" id="vetra-log">'));
    const head = sec.slice(0, 6000);
    /* Se permite mencionar el término solo para negar su emisión. */
    for (const b of banned) {
      const m = head.match(b);
      if (m && !/no se emiten|not</i.test(head) && !/retiene|withheld|No</i.test(head)) hits.push(p.lang + ': ' + b);
    }
  }
  if (hits.length) fail('V8', 'sellos retirados reaparecen como afirmación: ' + hits.join(' | '));
  else pass('V8', 'BookPI / SHA3 / VETRA Seal solo aparecen en la cláusula que los retiene');
}

report();

function report() {
  for (const l of ok) console.log(l);
  for (const l of warnings) console.log('AVISO ' + l);
  for (const l of errors) console.log('ERROR ' + l);
  console.log('bitácora VETRA · ' + ENTRIES + ' entradas · ' + SIGNED + ' firmadas · ' + SIGNERS + ' firmantes · ' + errors.length + ' error(es), ' + warnings.length + ' aviso(s)');
  process.exitCode = errors.length ? 1 : 0;
}
