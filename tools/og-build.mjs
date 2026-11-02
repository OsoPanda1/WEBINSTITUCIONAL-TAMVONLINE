#!/usr/bin/env node
/**
 * tools/og-build.mjs — construye la tarjeta social (1200x630) sin librerías.
 *
 * Escribe tools/og-harness.html con los dos logotipos incrustados como data URL
 * (un archivo servido por file:// tainted el canvas; un data URL no) y levanta
 * un servidor efímero que recibe el JPEG ya codificado y lo guarda en
 * web/assets/brand/og-cover.jpg. El navegador hace todo el trabajo de composición.
 *
 * Uso: node tools/og-build.mjs --serve      (deja el servidor escuchando)
 *      node tools/og-build.mjs              (sólo genera el arnés)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OUT = join(ROOT, 'web', 'assets', 'brand', 'og-cover.jpg');
const HARNESS = join(HERE, 'og-harness.html');
const DATA = join(HERE, 'og-cover.data.txt');

const b64 = (p) => readFileSync(p).toString('base64');
const wordmark = b64(join(ROOT, 'web', 'assets', 'brand', 'tamv-wordmark.webp'));
const emblem = b64(join(ROOT, 'web', 'assets', 'brand', 'isabella-hummingbird.webp'));

// Recortes: dejan fuera las dos líneas de tagline autoafirmativas del lockup
// oficial y el pie tipográfico del emblema. Coinciden con aspect-ratio en CSS.
const CROP = { wordmark: [1000, 352], emblem: [1280, 566] };

const page = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>og harness</title></head>
<body><canvas id="c" width="1200" height="630"></canvas>
<pre id="log"></pre>
<script>
const W = ${JSON.stringify('data:image/webp;base64,' + wordmark)};
const E = ${JSON.stringify('data:image/webp;base64,' + emblem)};
const CROP = ${JSON.stringify(CROP)};
const log = [];
function load(src){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=e=>no(i.src.slice(0,40));i.src=src;});}
function grad(ctx,x0,y0,x1,y1,stops){const g=ctx.createLinearGradient(x0,y0,x1,y1);for(const[o,c]of stops)g.addColorStop(o,c);return g;}
async function main(){
  const cv=document.getElementById('c'), ctx=cv.getContext('2d');
  const wm=await load(W), em=await load(E);
  ctx.fillStyle=grad(ctx,0,0,1200,630,[[0,'#03060b'],[0.55,'#061120'],[1,'#0a1a2c']]);
  ctx.fillRect(0,0,1200,630);
  const rg=ctx.createRadialGradient(1010,-40,40,1010,-40,760);
  rg.addColorStop(0,'rgba(111,224,255,0.30)');rg.addColorStop(1,'rgba(111,224,255,0)');
  ctx.fillStyle=rg;ctx.fillRect(0,0,1200,630);
  ctx.strokeStyle='rgba(158,212,255,0.07)';ctx.lineWidth=1;
  for(let x=0;x<=1200;x+=62){ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,630);ctx.stroke();}
  for(let y=0;y<=630;y+=62){ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(1200,y+.5);ctx.stroke();}
  ctx.globalCompositeOperation='screen';
  // Recorte en pixeles fuente: la altura visible es anchura * (crop[1]/crop[0]),
  // igual que hace object-fit:cover con aspect-ratio en el sitio.
  function cropDraw(img, crop, dx, dy, dw){
    const k=crop[1]/crop[0], sh=Math.min(img.naturalHeight, img.naturalWidth*k), dh=dw*k;
    ctx.drawImage(img, 0, 0, img.naturalWidth, sh, dx, dy, dw, dh);
    return dh;
  }
  cropDraw(em, CROP.emblem, 660, 88, 480);
  cropDraw(wm, CROP.wordmark, 72, 96, 452);
  ctx.globalCompositeOperation='source-over';
  ctx.fillStyle=grad(ctx,72,0,600,0,[[0,'rgba(77,166,255,0)'],[0.18,'#4da6ff'],[0.5,'#6fe0ff'],[0.82,'#4da6ff'],[1,'rgba(77,166,255,0)']]);
  ctx.fillRect(72,300,528,1.6);
  ctx.fillStyle=grad(ctx,640,0,1160,0,[[0,'rgba(77,166,255,0)'],[0.5,'rgba(111,224,255,0.55)'],[1,'rgba(77,166,255,0)']]);
  ctx.fillRect(640,300,520,1.6);
  ctx.textBaseline='alphabetic';
  ctx.fillStyle='#eef4fa';ctx.font='italic 300 34px Georgia, "Times New Roman", serif';
  ctx.fillText('Red independiente de investigación,', 72, 366);
  ctx.fillText('tecnología y memoria', 72, 408);
  ctx.fillStyle='#7e93ab';ctx.font='500 19px "IBM Plex Mono", Consolas, monospace';
  ctx.fillText('MINERAL DEL MONTE  ·  HIDALGO  ·  MÉXICO', 72, 462);
  ctx.fillStyle='#9ed4ff';ctx.font='400 19px "IBM Plex Mono", Consolas, monospace';
  ctx.fillText('Ficha institucional pública — ES / EN', 72, 500);
  ctx.fillStyle='#6fe0ff';ctx.font='500 21px "IBM Plex Mono", Consolas, monospace';
  ctx.fillText('tamvonline-t78x4mdi9wa.qoder.website', 72, 556);
  const url=cv.toDataURL('image/jpeg',0.9);
  window.__OG=url;
  log.push('jpeg '+Math.round(url.length*0.75/1024)+' KB');
  document.getElementById('log').textContent=log.join('\\n');
}
main().catch(e=>{window.__OG=null;document.getElementById('log').textContent='ERROR '+e;});
</script></body></html>`;

const mode = process.argv[2] || 'harness';

if (mode === 'harness') {
  writeFileSync(HARNESS, page.replace(/\r\n/g, '\n'), 'utf8');
  console.log('Arnés escrito en ' + HARNESS + ' (' + Math.round(page.length / 1024) + ' KB)');
  console.log('Siguiente paso: abrir el arnés en el navegador y leer window.__OG.');
} else if (mode === 'save') {
  // Lee tools/og-cover.data.txt (data URL volcado desde el navegador) y escribe el JPEG.
  const raw = readFileSync(DATA, 'utf8').trim();
  const m = raw.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (!m) { console.error('FALLO: el archivo no contiene un data URL JPEG. Empieza por: ' + raw.slice(0, 40)); process.exitCode = 1; }
  else {
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length < 20000 || buf.readUInt16BE(0) !== 0xffd8) { console.error('FALLO: el JPEG no parece válido (' + buf.length + ' bytes).'); process.exitCode = 1; }
    else { writeFileSync(OUT, buf); console.log('OG-COVER ESCRITO en ' + OUT + ' — ' + Math.round(buf.length / 1024) + ' KB'); }
  }
} else {
  console.error('Modo desconocido: ' + mode + '. Espera harness | save');
  process.exitCode = 1;
}

