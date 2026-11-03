#!/usr/bin/env node
/* TAMV Online Network — inserta la sección 10 (bitácora VETRA) en calidad/quality.
 *
 * Idempotente y conmutativa con el resto del pipeline: la sección vive entre
 * `<section id="vetra-log">` y su cierre, y se reescribe entera en cada corrida.
 * No toca la región `i18n:generated` ni el bloque `schema:tamv-org`, así que
 * `node tools/i18n.mjs links|inject` y `tools/schema-inject-patch.mjs` siguen
 * siendo no-ops después de esta pasada.
 *
 * Los números de la tabla salen de web/auditoria/vetra-log.json, no de un texto
 * fijo: si mañana se registra un firmante o se firma una entrada, la página
 * cambia sola. tools/vetra-log-audit.mjs comprueba que página y bitácora no
 * se contradigan.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = path.join(ROOT, 'web', 'auditoria', 'vetra-log.json');
const MARK = '<section class="section alt" id="vetra-log">';

const log = JSON.parse(fs.readFileSync(LOG, 'utf8'));
const entries = log.entries.length;
const signed = log.entries.filter((e) => e.signature).length;
const signers = (log.signers || []).length;

function cryptoSHA(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

/* El ancla real se recalcula como en tools/vetra-log.mjs: canonicalización con
   llaves ordenadas, sin entries, counts ni updated_on. */
function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  return JSON.stringify(v) === undefined ? 'null' : JSON.stringify(v);
}
const clone = {};
for (const k of Object.keys(log)) if (!['entries', 'counts', 'updated_on'].includes(k)) clone[k] = log[k];
const ANCHOR = 'GENESIS:' + cryptoSHA(canonical(clone));

const st = {
  entries: String(entries),
  signed: String(signed),
  signers: String(signers),
  anchor: ANCHOR.slice(0, 23) + '…',
  opened: log.opened_on,
  hashf: log.hash_function.toUpperCase(),
  sig: log.signature_scheme.toUpperCase(),
};

const ES = `  ${MARK}
    <div class="wrap">
      <div class="section-head">
        <div><span class="section-num">10 — Bitácora</span><h2>Registro público de auditorías VETRA</h2></div>
        <p>Todo informe de auditoría emitido sobre un documento evaluado con el marco VETRA se asienta en una bitácora pública, aditiva y encadenada con ${st.hashf}. A la fecha de esta ficha la bitácora está abierta y vacía: el mecanismo existe y es verificable, los registros todavía no.</p>
      </div>
      <div class="table-scroll" data-label="Estado verificable de la bitácora VETRA">
        <table>
          <caption>Estado de <a href="auditoria/vetra-log.json" rel="noopener">auditoria/vetra-log.json</a>, abierto el ${st.opened} y consultado el ${log.updated_on || st.opened}.</caption>
          <thead><tr><th scope="col">Campo</th><th scope="col">Valor</th><th scope="col">Cómo se comprueba</th></tr></thead>
          <tbody>
            <tr><td>Entradas registradas</td><td><b>${st.entries}</b></td><td>El campo <code>counts.entries</code> del archivo, o <code>node tools/vetra-log.mjs verify</code> sobre el fuente publicado en <a href="https://github.com/OsoPanda1/WEBINSTITUCIONAL-TAMVONLINE" rel="noopener noreferrer" target="_blank">el repositorio del sitio</a>.</td></tr>
            <tr><td>Entradas con firma humana</td><td><b>${st.signed}</b></td><td><code>counts.signed</code>. Una entrada sin firma válida es un borrador, no un registro oficial.</td></tr>
            <tr><td>Firmantes autorizados</td><td><b>${st.signers}</b></td><td>La lista <code>signers</code> del archivo. Con la lista vacía ninguna entrada puede validar: es el estado honesto de hoy.</td></tr>
            <tr><td>Encadenado</td><td>${st.hashf}, eslabón a eslabón</td><td>Cada entrada guarda el digesto del documento evaluado y el hash de la entrada anterior; el ancla de la serie es <code>${st.anchor}</code>.</td></tr>
            <tr><td>Esquema de firma</td><td>${st.sig}</td><td>La firma se verifica contra la clave pública publicada en el propio archivo, no contra una promesa.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="rule-label">Qué demuestra la bitácora y qué no</div>
      <div class="grid g2">
        <article class="card">
          <span class="idx">Demuestra</span>
          <h3>Que el agente no puede firmar solo</h3>
          <p>La identidad <code>Isabella Villaseñor AI</code> está registrada en el propio archivo como <code>draft_only</code>, con permisos de lectura, cálculo de hash y borrador, y sin clave privada posible. La herramienta rechaza por diseño cualquier entrada firmada por esa identidad o por un firmante que no esté en <code>signers</code>. Quien duda puede intentarlo: <code>node tools/vetra-log.mjs selftest</code> ejecuta los diez rechazos con una clave sintética y no escribe en la bitácora pública.</p>
        </article>
        <article class="card">
          <span class="idx">No demuestra</span>
          <h3>Que existan auditorías externas</h3>
          <p>${st.entries === 0 ? 'Con cero entradas, la bitácora no acredita que nadie haya auditado nada. Prueba la forma en que una auditoría quedaría registrada, y nada más. Tampoco hay hoy certificaciones de terceros, sellos de integridad ni actas firmadas que citar.' : 'Las entradas listadas son informes de auditoría registrados con firma humana; cada una enlaza su documento y su digesto.'}</p>
        </article>
      </div>
      <div class="note" style="margin-top:22px">
        <h4>Sello criptográfico: lo que se declara y lo que se retiene</h4>
        <p>La bitácora usa ${st.hashf} sobre el documento evaluado y firma Ed25519 humana porque son las primitivas que se pueden verificar con el fuente publicado. <b>No</b> se emiten sellos de tipo BookPI raíz, SHA3-512 ni «VETRA Seal»: la metodología publicada los retira mientras la entidad no tenga identificadores persistentes propios ni un logarítmico externo donde anclarlos. Un hash propio no es un sello de autenticidad: sin una cadena que un tercero pueda reproducir, solo prueba que quien escribió la página tenía ese archivo.</p>
      </div>
      <p class="mono-note" style="margin-top:16px">Replicación: <code>git clone https://github.com/OsoPanda1/WEBINSTITUCIONAL-TAMVONLINE</code> · <code>node tools/vetra-log.mjs verify</code> · <code>node tools/vetra-log.mjs selftest</code>.</p>
      <p style="margin-top:16px"><a class="btn btn-line" href="gobernanza.html">Cómo se aprueba un informe antes de registrarlo</a></p>
    </div>
  </section>
`;

const EN = `  ${MARK}
    <div class="wrap">
      <div class="section-head">
        <div><span class="section-num">10 — Audit log</span><h2>Public VETRA audit log</h2></div>
        <p>Every audit report issued over a document evaluated with the VETRA framework is settled into a public, append-only log chained with ${st.hashf}. As of this record the log is open and empty: the mechanism exists and is verifiable, the entries do not yet.</p>
      </div>
      <div class="table-scroll" data-label="Verifiable state of the VETRA audit log">
        <table>
          <caption>State of <a href="../auditoria/vetra-log.json" rel="noopener">auditoria/vetra-log.json</a>, opened on ${st.opened} and consulted on ${log.updated_on || st.opened}.</caption>
          <thead><tr><th scope="col">Field</th><th scope="col">Value</th><th scope="col">How to check it</th></tr></thead>
          <tbody>
            <tr><td>Entries recorded</td><td><b>${st.entries}</b></td><td>The <code>counts.entries</code> field in the file, or <code>node tools/vetra-log.mjs verify</code> against the source published in <a href="https://github.com/OsoPanda1/WEBINSTITUCIONAL-TAMVONLINE" rel="noopener noreferrer" target="_blank">the site repository</a>.</td></tr>
            <tr><td>Entries with a human signature</td><td><b>${st.signed}</b></td><td><code>counts.signed</code>. An entry without a valid signature is a draft, not an official record.</td></tr>
            <tr><td>Authorized signers</td><td><b>${st.signers}</b></td><td>The <code>signers</code> list in the file. With the list empty, no entry can validate: that is today's honest state.</td></tr>
            <tr><td>Chaining</td><td>${st.hashf}, link by link</td><td>Each entry stores the digest of the evaluated document and the hash of the previous entry; the series anchor is <code>${st.anchor}</code>.</td></tr>
            <tr><td>Signature scheme</td><td>${st.sig}</td><td>The signature is verified against the public key published in the same file, not against a promise.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="rule-label">What the log proves and what it does not</div>
      <div class="grid g2">
        <article class="card">
          <span class="idx">Proves</span>
          <h3>That the agent cannot sign alone</h3>
          <p>The identity <code>Isabella Villaseñor AI</code> is registered in the file itself as <code>draft_only</code>, with read, hash and draft permissions and no possible private key. By design the tool rejects any entry signed by that identity or by a signer absent from <code>signers</code>. Anyone doubting it can try: <code>node tools/vetra-log.mjs selftest</code> runs the ten rejections with a synthetic key and never writes to the public log.</p>
        </article>
        <article class="card">
          <span class="idx">Does not prove</span>
          <h3>That external audits exist</h3>
          <p>${st.entries === 0 ? 'With zero entries the log does not accredit that anyone audited anything. It proves the form an audit would take when registered, and nothing more. There are also no third-party certifications, integrity seals or signed minutes to cite today.' : 'The listed entries are audit reports registered with a human signature; each links its document and its digest.'}</p>
        </article>
      </div>
      <div class="note" style="margin-top:22px">
        <h4>Cryptographic seal: what is declared and what is withheld</h4>
        <p>The log uses ${st.hashf} over the evaluated document and a human Ed25519 signature because those are the primitives a reader can verify against published source. BookPI root, SHA3-512 and any "VETRA Seal" are <b>not</b> issued: the published methodology withdraws them while the entity has no persistent identifiers of its own and no external ledger to anchor them in. A self-issued hash is not an authenticity seal: without a chain a third party can reproduce, it only proves that whoever wrote the page had that file.</p>
      </div>
      <p class="mono-note" style="margin-top:16px">Replication: <code>git clone https://github.com/OsoPanda1/WEBINSTITUCIONAL-TAMVONLINE</code> · <code>node tools/vetra-log.mjs verify</code> · <code>node tools/vetra-log.mjs selftest</code>.</p>
      <p style="margin-top:16px"><a class="btn btn-line" href="governance.html">How a report is approved before it is registered</a></p>
    </div>
  </section>
`;

const TARGETS = [
  { file: path.join('web', 'calidad.html'), block: ES },
  { file: path.join('web', 'en', 'quality.html'), block: EN },
];

let changed = 0;
for (const t of TARGETS) {
  const raw = fs.readFileSync(path.join(ROOT, t.file), 'utf8');
  const start = raw.indexOf(MARK);
  let next;
  if (start >= 0) {
    /* La sección empieza en su sangría y termina en el cierre de sección. */
    const lineStart = raw.lastIndexOf('\n', start) + 1;
    const end = raw.indexOf('\n  </section>', start);
    if (end < 0) { console.error('no se encontró el cierre de la sección en ' + t.file); process.exit(1); }
    const tail = raw.slice(end + '\n  </section>'.length);
    next = raw.slice(0, lineStart) + t.block.replace(/\n$/, '') + tail;
  } else {
    const at = raw.lastIndexOf('\n</main>');
    if (at < 0) { console.error('no se encontró </main> en ' + t.file); process.exit(1); }
    next = raw.slice(0, at + 1) + t.block + raw.slice(at + 1);
  }
  if (next !== raw) { fs.writeFileSync(path.join(ROOT, t.file), next); changed++; }
  console.log(path.relative(ROOT, t.file) + ': ' + (start >= 0 ? 'sección reescrita' : 'sección añadida'));
}
console.log('bitácora: ' + st.entries + ' entradas · ' + st.signed + ' firmadas · ' + st.signers + ' firmantes · páginas modificadas: ' + changed);
