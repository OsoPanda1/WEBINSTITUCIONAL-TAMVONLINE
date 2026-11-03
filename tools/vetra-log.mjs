#!/usr/bin/env node
/* TAMV Online Network — bitácora de auditoría VETRA con encadenado SHA-256
 *
 * Fase 5 del plan de trazabilidad. El requisito del dueño era doble y tiene
 * respuestas distintas: (1) que cada documento evaluado quede registrado con su
 * hash en un log público y (2) que se demuestre que el agente Isabella Villaseñor
 * AI no puede escribir registros oficiales sin la firma humana del administrador.
 *
 * (1) se resuelve con un encadenado: cada entrada guarda el digesto SHA-256 del
 * documento evaluado y el hash de la entrada anterior, de modo que borrar o
 * reescribir una entrada rompe la cadena de todas las siguientes.
 * (2) se resuelve con una puerta criptográfica, no con una promesa: cada entrada
 * exige una firma Ed25519 de una clave humana registrada en `signers`. El agente
 * redacta y calcula hashes, pero no tiene clave: `append` rechaza cualquier
 * firmante que no esté en `signers`, y `verify` rechaza entradas firmadas por una
 * clave que no sea la publicada. Por eso la bitácora puede estar vacía hoy y aun
 * así ser verificable: el mecanismo se comprueba, la ausencia de registros se
 * declara.
 *
 * Uso (Node 24, sin dependencias):
 *   node tools/vetra-log.mjs init                         crea la bitácora publica
 *   node tools/vetra-log.mjs verify [--json]              recomputa toda la cadena
 *   node tools/vetra-log.mjs keygen --id X --name Y       genera par Ed25519 humano
 *   node tools/vetra-log.mjs add-signer --id X ...        publica la clave humana
 *   node tools/vetra-log.mjs append --file ... --signer X --key secrets/X.pem
 *   node tools/vetra-log.mjs selftest                     prueba la puerta con clave sintética
 *
 * La clave privada se escribe fuera del árbol público (`secrets/`, ignorado por
 * git) con permisos 0600. `keygen` nunca sobreescribe una clave existente.
 *
 * Formato: TAMV-VETRA-AUDITLOG/1
 *   entrada      = objeto JSON con llaves ordenadas lexicográficamente, sin espacios
 *   hash         = sha256(canonical(entrada sin `hash` ni `signature`)) en hex
 *   prev         = hash de la entrada anterior, o el ancla "GENESIS:<hex>"
 *   ancla        = sha256(canonical(bitácora sin `entries`, `counts`, `updated_on`))
 *   signature    = ed25519 sobre los bytes UTF-8 del campo `hash`, en base64
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_LOG = path.join(ROOT, 'web', 'auditoria', 'vetra-log.json');

const FORMAT = 'TAMV-VETRA-AUDITLOG/1';
const AGENT_ID = 'isabella-ai';
const argv = process.argv.slice(2);
const CMD = argv[0] || 'verify';

/* ── utilidades ─────────────────────────────────────────────────────────── */
function arg(name, fallback) {
  const i = argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const v = argv[i + 1];
  /* Un PEM empieza con "-----" y es un valor legitimo, no una bandera. */
  if (!v || (v.startsWith('--') && !v.startsWith('-----'))) return fallback;
  return v;
}
function has(name) { return argv.includes('--' + name); }
function logPath() { return path.resolve(ROOT, arg('log', DEFAULT_LOG)); }
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value) === undefined ? 'null' : JSON.stringify(value);
}
const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

function readLog(p) {
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}
function writeLog(p, log) {
  log.counts = {
    entries: log.entries.length,
    signed: log.entries.filter((e) => e.signature).length,
    unsigned: log.entries.filter((e) => !e.signature).length,
  };
  log.updated_on = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(p, JSON.stringify(log, null, 2) + '\n');
}
function anchorOf(log) {
  const clone = {};
  for (const k of Object.keys(log)) {
    if (k === 'entries' || k === 'counts' || k === 'updated_on') continue;
    clone[k] = log[k];
  }
  return 'GENESIS:' + sha256(canonical(clone));
}
function digestOf(entry) {
  const clone = {};
  for (const k of Object.keys(entry)) if (k !== 'hash' && k !== 'signature') clone[k] = entry[k];
  return sha256(canonical(clone));
}

/* ── init ───────────────────────────────────────────────────────────────── */
function cmdInit() {
  const p = logPath();
  const skeleton = {
    format: FORMAT,
    organization: 'TAMV Online Network',
    purpose_es: 'Registro público, aditivo y encadenado de los informes de auditoría emitidos sobre documentos evaluados con el marco VETRA y los estándares TQAF.',
    purpose_en: 'A public, append-only, hash-chained record of audit reports issued over documents evaluated with the VETRA framework and the TQAF standards.',
    opened_on: new Date().toISOString().slice(0, 10),
    updated_on: null,
    hash_function: 'sha256',
    signature_scheme: 'ed25519',
    canonicalization: 'llaves ordenadas lexicográficamente, sin espacios; hash sobre la entrada sin `hash` ni `signature`; firma sobre los bytes UTF-8 del hash',
    policy: {
      append_only: true,
      chain_required: true,
      requires_human_signature: true,
      agent_may_sign: false,
      note_es: 'Una entrada sin firma humana válida no es un registro oficial: es un borrador. Ninguna herramienta del agente puede emitir una entrada válida por sí sola.',
      note_en: 'An entry without a valid human signature is not an official record: it is a draft. No agent tool can mint a valid entry on its own.',
    },
    signers: [],
    draft_only_identities: [
      {
        id: AGENT_ID,
        name: 'Isabella Villaseñor AI',
        kind: 'ai_agent',
        may_sign: false,
        permissions: ['read', 'hash', 'draft'],
        no_permissions: ['sign', 'append_official', 'merge', 'delete_record'],
        note_es: 'El agente calcula el digesto del documento y redacta el borrador del informe. La entrada sólo existe si una clave humana registrada la firma.',
        note_en: 'The agent computes the document digest and drafts the report. The entry exists only once a registered human key signs it.',
      },
    ],
    entries: [],
    counts: { entries: 0, signed: 0, unsigned: 0 },
    reproduce: 'node tools/vetra-log.mjs verify',
  };
  if (fs.existsSync(p) && !has('force')) {
    console.log('La bitácora ya existe: ' + path.relative(ROOT, p) + ' (usa --force para recrearla)');
    return 0;
  }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  writeLog(p, skeleton);
  console.log('bitácora creada: ' + path.relative(ROOT, p) + ' · 0 entradas, 0 firmadas');
  console.log('ancla: ' + anchorOf(skeleton));
  return 0;
}

/* ── keygen / add-signer ────────────────────────────────────────────────── */
function cmdKeygen() {
  const id = arg('id');
  const name = arg('name');
  if (!id || !name) { console.error('keygen requiere --id y --name'); return 2; }
  if (id === AGENT_ID) { console.error('el identificador del agente no puede ser firmante'); return 2; }
  const dir = path.join(ROOT, 'secrets');
  const file = path.join(dir, 'vetra-' + id + '.pem');
  if (fs.existsSync(file)) { console.error('ya existe una clave: ' + path.relative(ROOT, file) + ' (no se sobreescribe)'); return 1; }
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  const pub = publicKey.export({ type: 'spki', format: 'pem' });
  const pubFile = path.join(dir, 'vetra-' + id + '.pub.pem');
  fs.writeFileSync(pubFile, pub);
  console.log('clave privada (NO publicar, NO commitear): ' + path.relative(ROOT, file));
  console.log('clave pública: ' + path.relative(ROOT, pubFile));
  console.log('\nsiguiente paso, en la misma máquina:\n  node tools/vetra-log.mjs add-signer --id ' + id + ' --name "' + name + '" --orcid <0000-0000-0000-0000> --pubkey-file ' + path.relative(ROOT, pubFile));
  return 0;
}

function cmdAddSigner() {
  const p = logPath();
  const log = readLog(p);
  const id = arg('id');
  const name = arg('name');
  if (!id || !name) { console.error('add-signer requiere --id y --name'); return 2; }
  if (id === AGENT_ID) { console.error('el agente no puede registrarse como firmante: ' + AGENT_ID); return 1; }
  let pem = arg('pubkey-pem');
  const pubFile = arg('pubkey-file');
  if (!pem && pubFile) pem = fs.readFileSync(path.resolve(ROOT, pubFile), 'utf8');
  if (!pem) { console.error('add-signer requiere --pubkey-file o --pubkey-pem'); return 2; }
  let key;
  try { key = crypto.createPublicKey(pem); } catch (e) { console.error('la clave pública no es un PEM Ed25519 válido: ' + e.message); return 1; }
  if (key.asymmetricKeyType !== 'ed25519') { console.error('el firmante debe usar Ed25519, no ' + key.asymmetricKeyType); return 1; }
  const entry = {
    id,
    name,
    kind: 'human',
    orcid: arg('orcid') || null,
    may_sign: true,
    public_key_pem: pem.trim(),
    fingerprint_sha256: sha256(canonical(pem.trim())),
    registered_on: new Date().toISOString().slice(0, 10),
  };
  const i = log.signers.findIndex((s) => s.id === id);
  if (i >= 0) { log.signers[i] = entry; console.log('firmante actualizado: ' + id); }
  else log.signers.push(entry);
  writeLog(p, log);
  console.log('signers ahora: ' + log.signers.length + ' · ancla: ' + anchorOf(log));
  console.log('nota: registrar la clave cambia el ancla; las entradas firmadas antes de este cambio quedan invalidadas a propósito.');
  return 0;
}

/* ── append ─────────────────────────────────────────────────────────────── */
function cmdAppend() {
  const p = logPath();
  const log = readLog(p);
  const signerId = arg('signer');
  const keyPath = arg('key');
  if (!signerId) { console.error('append requiere --signer <id>: ninguna entrada puede emitirse sin firmante humano'); return 2; }
  if (signerId === AGENT_ID || (log.draft_only_identities || []).some((d) => d.id === signerId)) {
    console.error('rechazado: ' + signerId + ' es una identidad de solo borrador, no puede firmar registros oficiales');
    return 1;
  }
  const signer = (log.signers || []).find((s) => s.id === signerId);
  if (!signer) { console.error('rechazado: ' + signerId + ' no está en signers de la bitácora. Ejecuta add-signer con la clave pública humana.'); return 1; }
  if (!keyPath) { console.error('append requiere --key <ruta a la clave privada humana>'); return 2; }
  const absKey = path.resolve(ROOT, keyPath);
  if (!fs.existsSync(absKey)) { console.error('no existe la clave: ' + keyPath); return 1; }
  const subjectFile = arg('file');
  const subject = {
    kind: arg('kind', subjectFile ? 'document' : 'report'),
    title: arg('title') || (subjectFile ? path.basename(subjectFile) : null),
    path: subjectFile ? path.relative(ROOT, path.resolve(ROOT, subjectFile)).replace(/\\/g, '/') : null,
    url: arg('url') || null,
    sha256: subjectFile ? sha256(fs.readFileSync(path.resolve(ROOT, subjectFile), 'utf8')) : (arg('digest') || null),
    bytes: subjectFile ? fs.statSync(path.resolve(ROOT, subjectFile)).size : null,
  };
  if (!subject.title || !subject.sha256) { console.error('append requiere --file o la pareja --title y --digest'); return 2; }
  const verifyResult = verify(log, { quiet: true });
  if (!verifyResult.ok) { console.error('la bitácora está rota; no se escribe encima de una cadena inválida'); return 1; }
  const prev = log.entries.length ? log.entries[log.entries.length - 1].hash : anchorOf(log);
  const entry = {
    seq: log.entries.length + 1,
    recorded_on: new Date().toISOString().slice(0, 10),
    subject,
    framework: { name: arg('framework', 'VETRA'), version: arg('framework_version', ''), standard: arg('standard', 'TQAF-10') },
    finding: arg('finding', ''),
    reviewer: { name: arg('reviewer') || signer.name, orcid: arg('reviewer_orcid') || signer.orcid || null, scope: arg('scope', 'internal') },
    draft_by: arg('draft_by', AGENT_ID),
    signed_by: signerId,
    prev,
  };
  entry.hash = digestOf(entry);
  const priv = crypto.createPrivateKey(fs.readFileSync(absKey, 'utf8'));
  entry.signature = crypto.sign(null, Buffer.from(entry.hash, 'utf8'), priv).toString('base64');
  log.entries.push(entry);
  writeLog(p, log);
  const after = verify(readLog(p), { quiet: true });
  console.log('entrada ' + entry.seq + ' firmada · hash ' + entry.hash.slice(0, 16) + '… · cadena ' + (after.ok ? 'válida' : 'ROTA'));
  return after.ok ? 0 : 1;
}

/* ── verify ─────────────────────────────────────────────────────────────── */
function verify(log, opts) {
  const out = { ok: true, problems: [], notes: [], entries: 0, signed: 0, unsigned: 0, signers: 0, anchor: anchorOf(log) };
  const quiet = opts && opts.quiet;
  if (log.format !== FORMAT) { out.ok = false; out.problems.push('formato distinto del esperado: ' + log.format); }
  out.signers = (log.signers || []).length;
  let prev = out.anchor;
  for (const e of log.entries) {
    const want = digestOf(e);
    if (want !== e.hash) { out.ok = false; out.problems.push('entrada ' + e.seq + ': el hash no corresponde con el contenido'); }
    if (e.prev !== prev) { out.ok = false; out.problems.push('entrada ' + e.seq + ': el encadenado no continúa (prev no coincide)'); }
    prev = e.hash;
    if (!e.signature) {
      out.ok = false;
      out.problems.push('entrada ' + e.seq + ': sin firma · no es un registro oficial');
    } else {
      const s = (log.signers || []).find((x) => x.id === e.signed_by);
      if (!s) { out.ok = false; out.problems.push('entrada ' + e.seq + ': firmante no registrado: ' + e.signed_by); }
      else if ((log.draft_only_identities || []).some((d) => d.id === e.signed_by)) {
        out.ok = false; out.problems.push('entrada ' + e.seq + ': firmada por una identidad de solo borrador');
      } else {
        let good = false;
        try { good = crypto.verify(null, Buffer.from(e.hash, 'utf8'), crypto.createPublicKey(s.public_key_pem), Buffer.from(e.signature, 'base64')); } catch (err) { good = false; }
        if (!good) { out.ok = false; out.problems.push('entrada ' + e.seq + ': firma inválida para la clave publicada'); }
      }
    }
  }
  out.entries = log.entries.length;
  out.signed = log.entries.filter((e) => e.signature).length;
  out.unsigned = log.entries.filter((e) => !e.signature).length;
  const c = log.counts || {};
  if (c.entries !== out.entries || c.signed !== out.signed) { out.ok = false; out.problems.push('counts no coincide con las entradas reales'); }
  if (!out.entries && !quiet) out.notes.push('bitácora estructuralmente válida y vacía: 0 registros firmados');
  if (!out.signers && !quiet) out.notes.push('0 firmantes humanos registrados: ninguna entrada podría ser válida todavía');
  if (!quiet) out.notes.push('ancla: ' + out.anchor);
  return out;
}

function cmdVerify() {
  const p = logPath();
  const log = readLog(p);
  const r = verify(log, { quiet: has('json') });
  if (has('json')) { console.log(JSON.stringify(r, null, 2)); return r.ok ? 0 : 1; }
  console.log('bitácora: ' + path.relative(ROOT, p));
  console.log('entradas: ' + r.entries + ' · firmadas: ' + r.signed + ' · sin firma: ' + r.unsigned + ' · firmantes registrados: ' + r.signers);
  console.log('ancla:    ' + r.anchor);
  for (const n of r.notes) console.log('· ' + n);
  for (const e of log.entries) {
    console.log('  #' + e.seq + ' ' + e.recorded_on + '  ' + (e.subject.title || '').slice(0, 48) + '  sha256=' + String(e.subject.sha256).slice(0, 12) + '…  ' + (e.signature ? 'FIRMADA por ' + e.signed_by : 'SIN FIRMA'));
  }
  for (const pr of r.problems) console.log('ERROR: ' + pr);
  console.log(r.ok ? 'resultado: cadena válida' : 'resultado: CADENA INVÁLIDA');
  return r.ok ? 0 : 1;
}

/* ── selftest ───────────────────────────────────────────────────────────── */
/* Demuestra la puerta con una clave sintética en un directorio temporal. Nada de
   esto toca la bitácora pública: el registro publicado sigue en cero entradas. */
function cmdSelftest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vetra-selftest-'));
  const p = path.join(dir, 'log.json');
  const keyFile = path.join(dir, 'admin.pem');
  const results = [];
  const t = (name, cond, detail) => results.push({ name, pass: !!cond, detail: detail || '' });

  process.argv[2] = 'init'; argv.length = 0; argv.push('init', '--log', p);
  cmdInit();
  t('init crea bitácora vacía y válida', verify(readLog(p)).ok, '0 entradas');

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  fs.writeFileSync(keyFile, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

  const doc = path.join(dir, 'documento-evaluado.md');
  fs.writeFileSync(doc, '# Documento evaluado\nTAMV Online Network · VETRA\n');

  /* 1. append sin firmante registrado debe rechazar */
  argv.length = 0; argv.push('append', '--log', p, '--file', doc, '--signer', 'fantasma', '--key', keyFile);
  const before = fs.readFileSync(p, 'utf8');
  const rcGhost = cmdAppendQuiet();
  t('rechaza firmante no registrado', rcGhost.code !== 0 && fs.readFileSync(p, 'utf8') === before, 'exit=' + rcGhost.code);

  /* 2. append con el agente como firmante debe rechazar */
  argv.length = 0; argv.push('append', '--log', p, '--file', doc, '--signer', AGENT_ID, '--key', keyFile);
  const rcAgent = cmdAppendQuiet();
  t('rechaza que el agente firme', rcAgent.code !== 0 && fs.readFileSync(p, 'utf8') === before, 'exit=' + rcAgent.code);

  /* 3. append sin clave debe rechazar (aunque el firmante exista) */
  const anchorBefore = anchorOf(readLog(p));
  argv.length = 0; argv.push('add-signer', '--log', p, '--id', 'admin-sintetico', '--name', 'Admin Sintético', '--pubkey-pem', pubPem);
  cmdQuiet(cmdAddSigner);
  const logWithSigner = readLog(p);
  t('registrar una clave humana cambia el ancla', anchorOf(logWithSigner) !== anchorBefore, 'signers=' + logWithSigner.signers.length);
  argv.length = 0; argv.push('append', '--log', p, '--file', doc, '--signer', 'admin-sintetico');
  const beforeNoKey = fs.readFileSync(p, 'utf8');
  const rcNoKey = cmdAppendQuiet();
  t('rechaza firmar sin clave privada', rcNoKey.code !== 0 && fs.readFileSync(p, 'utf8') === beforeNoKey, 'exit=' + rcNoKey.code);

  /* 4. append legítimo: una entrada firmada y cadena válida */
  argv.length = 0; argv.push('append', '--log', p, '--file', doc, '--signer', 'admin-sintetico', '--key', keyFile, '--finding', 'hallazgo de prueba');
  const rcOk = cmdAppendQuiet();
  const log1 = readLog(p);
  t('firma humana produce cadena válida', rcOk.code === 0 && log1.entries.length === 1 && verify(log1).ok, 'entradas=' + log1.entries.length);

  /* 5. encadenado: una segunda entrada continúa la cadena */
  argv.length = 0; argv.push('append', '--log', p, '--file', doc, '--signer', 'admin-sintetico', '--key', keyFile, '--finding', 'segunda prueba');
  cmdAppendQuiet();
  const log2 = readLog(p);
  t('la segunda entrada encadena con la primera', log2.entries.length === 2 && log2.entries[1].prev === log2.entries[0].hash && verify(log2).ok);

  /* 6. integridad: alterar el contenido de una entrada rompe la verificación */
  const tampered = JSON.parse(JSON.stringify(log2));
  tampered.entries[0].finding = 'hallazgo alterado';
  t('detectar alteración de contenido', !verify(tampered).ok, verify(tampered).problems[0] || '');

  /* 7. integridad: borrar una entrada del medio rompe el eslabón */
  const removed = JSON.parse(JSON.stringify(log2));
  removed.entries.splice(0, 1);
  t('detectar entrada borrada', !verify(removed).ok, verify(removed).problems[0] || '');

  /* 8. suplantación: firmar con otra clave no valida contra la clave publicada */
  const forged = JSON.parse(JSON.stringify(log2));
  const other = crypto.generateKeyPairSync('ed25519');
  forged.entries[1].signature = crypto.sign(null, Buffer.from(forged.entries[1].hash, 'utf8'), other.privateKey).toString('base64');
  t('detectar firma de otra clave', !verify(forged).ok, verify(forged).problems[0] || '');

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('SELFTEST del mecanismo VETRA (clave sintética, no toca la bitácora pública)');
  let fails = 0;
  for (const r of results) { if (!r.pass) fails++; console.log((r.pass ? '  OK   ' : '  FAIL ') + r.name + (r.detail ? '  [' + r.detail + ']' : '')); }
  console.log(fails ? 'resultado: ' + fails + ' fallo(s) de ' + results.length : 'resultado: mecanismo verificado, ' + results.length + '/' + results.length);
  return fails ? 1 : 0;
}
function cmdQuiet(fn) { const lines = []; const w = console.log; console.log = (...a) => lines.push(a.join(' ')); let code = 0; try { code = fn(); } catch (e) { code = 1; } console.log = w; return { code, lines }; }
function cmdAppendQuiet() { return cmdQuiet(cmdAppend); }

/* ── despacho ───────────────────────────────────────────────────────────── */
let code = 1;
if (CMD === 'init') code = cmdInit();
else if (CMD === 'verify') code = cmdVerify();
else if (CMD === 'keygen') code = cmdKeygen();
else if (CMD === 'add-signer') code = cmdAddSigner();
else if (CMD === 'append') code = cmdAppend();
else if (CMD === 'selftest') code = cmdSelftest();
else {
  console.log('comandos: init | verify | keygen | add-signer | append | selftest');
  code = CMD === 'help' ? 0 : 2;
}
process.exitCode = code;
