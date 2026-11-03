#!/usr/bin/env node
/* TAMV Online Network — actualiza el recuento de repositorios a la verificación del 2026-11-02
 *
 * docs/github/inventario-github.json mide hoy, con la API pública de GitHub:
 *   public_repos = 143 · búsqueda user:OsoPanda1 is:public fork:false = 103 · horquetes = 40.
 * El sitio se escribió antes de crear WEBINSTITUCIONAL-TAMVONLINE y decía 142 / 102, y el
 * mapa lo contradecía ("143 tras crear el del sitio"). Este parche deja las tres
 * cifras en un solo número verifiable y ajustado a la fecha de consulta.
 *
 * Es idempotente: cada sustitución se exige exactamente una vez; si el texto ya
 * está corregido, la pasada no escribe nada. No toca la región i18n generada.
 *
 *   node tools/repo-count-patch.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');

const RULES = [
  /* ── español ──────────────────────────────────────────────────────────── */
  ['web/index.html', '<b>102</b><span>repositorios propios en GitHub, más 40 forks</span>', '<b>103</b><span>repositorios propios en GitHub, más 40 forks</span>'],
  ['web/index.html', 'de sus 102 repositorios propios', 'de sus 103 repositorios propios'],
  ['web/index.html', 'La mayoría de los 102 repositorios propios', 'La mayoría de los 103 repositorios propios'],
  ['web/produccion.html', '<b>102</b><span>repositorios propios en GitHub (más 40 forks)</span>', '<b>103</b><span>repositorios propios en GitHub (más 40 forks)</span>'],
  ['web/organizacion.html', '142 repositorios públicos, 102 propios y 40 forks', '143 repositorios públicos: 103 propios y 40 forks'],
  ['web/investigacion.html', '142 repositorios públicos: 102 propios y 40 forks', '143 repositorios públicos: 103 propios y 40 forks'],
  ['web/investigacion.html', 'Forman parte de los 102 repositorios propios', 'Forman parte de los 103 repositorios propios'],
  /* ── inglés (espejo exacto de las cifras) ─────────────────────────────── */
  ['web/en/index.html', '<b>102</b><span>own repositories in GitHub, plus 40 forks</span>', '<b>103</b><span>own repositories in GitHub, plus 40 forks</span>'],
  ['web/en/index.html', 'of its 102 own repositories', 'of its 103 own repositories'],
  ['web/en/index.html', 'Most of the 102 own repositories', 'Most of the 103 own repositories'],
  ['web/en/outputs.html', '<b>102</b><span>own repositories in GitHub (plus 40 forks)</span>', '<b>103</b><span>own repositories in GitHub (plus 40 forks)</span>'],
  ['web/en/organization.html', '142 public repositories, 102 own and 40 forks', '143 public repositories: 103 own and 40 forks'],
  ['web/en/research.html', '142 public repositories: 102 own and 40 forks', '143 public repositories: 103 own and 40 forks'],
  ['web/en/research.html', "part of the account's 102 own repositories", "part of the account's 103 own repositories"],
  /* ── el mapa: una sola cifra, sin la nota de "tras crear el del sitio" ─── */
  ['web/assets/mapa/graph.js', "registraba 142 repositorios el 2026-11-02 (102 propios y 40 forks; 143 tras crear el del sitio)", "registraba 143 repositorios públicos el 2026-11-02 (103 propios y 40 forks, incluido el repositorio del propio sitio)"],
  ['web/assets/mapa/graph.js', "registered 142 repositories on 2026-11-02 (102 own and 40 forks; 143 after creating the site repository)", "registered 143 public repositories on 2026-11-02 (103 own and 40 forks, including the site repository itself)"],
];

const byFile = new Map();
for (const [f, from, to] of RULES) {
  if (!byFile.has(f)) byFile.set(f, []);
  byFile.get(f).push([from, to]);
}

let touched = 0, applied = 0, already = 0;
for (const [f, list] of byFile) {
  const p = path.join(ROOT, f);
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  let n = 0;
  for (const [from, to] of list) {
    const count = s.split(from).length - 1;
    const done = s.split(to).length - 1;
    if (count === 0 && done >= 1) { already++; continue; }
    if (count !== 1) {
      console.error('ERROR ' + f + ': la cadena aparece ' + count + ' veces (se exige 1): ' + from.slice(0, 64));
      process.exitCode = 1;
      continue;
    }
    s = s.replace(from, to);
    n++;
  }
  if (s !== before) { fs.writeFileSync(p, s); touched++; }
  applied += n;
  console.log(f + ': ' + n + ' sustitucion(es) ' + (s === before ? '(sin cambios)' : 'escritas'));
}
const leftovers = [];
for (const f of ['web/index.html', 'web/produccion.html', 'web/organizacion.html', 'web/investigacion.html', 'web/en/index.html', 'web/en/outputs.html', 'web/en/organization.html', 'web/en/research.html', 'web/assets/mapa/graph.js']) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of s.matchAll(/\b(142|102)\b/g)) leftovers.push(f + ': ' + s.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' '));
}
console.log('total aplicado: ' + applied + ' · ya aplicado: ' + already + ' · paginas tocadas: ' + touched);
console.log(leftovers.length ? 'AVISO quedan cifras antiguas:\n  ' + leftovers.join('\n  ') : 'sin cifras antiguas 142/102 en esos nueve archivos');
if (leftovers.length) process.exitCode = 1;
