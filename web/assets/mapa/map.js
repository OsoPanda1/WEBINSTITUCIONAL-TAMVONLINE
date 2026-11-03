/* TAMV Online Network — HCU Living Universe (motor del mapa)
 *
 * Principio de implementación: este archivo NO contiene datos. Todo lo que se
 * dibuja viene de assets/mapa/graph.js, que es la única fuente y está auditada
 * por tools/map-data-audit.mjs. Si falta graph.js el lienzo se retira y quedan
 * legibles las tablas estáticas de la página.
 *
 * El canvas es una capa de percepción situacional, no la única vía de lectura:
 * el registro de entidades, los flujos y la crónica existen como HTML, dentro
 * y fuera del lienzo. Respeta prefers-reduced-motion (nada gira solo), se
 * maneja con teclado y nunca usa el color como único indicador.
 */
(function () {
  'use strict';
  let G = window.TAMV_GRAPH;
  const stage = document.querySelector('[data-hcu-stage]');
  if (!G) { if (stage) stage.remove(); document.querySelectorAll('[data-hcu-replace]').forEach(n => n.remove()); return; }

  /* ── idioma ───────────────────────────────────────────────────────────── */
  const lang = (document.documentElement.lang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  /* L() resuelve el envoltorio {es, en}. En entidades, dominios, modos y ejes
     el valor es un objeto con campos; en estados, sellos y activaciones es una
     cadena. Los sitios de llamada deben usar el campo correcto. */
  const L = (o) => (o && (o[lang] || o.es)) || '';
  /* nm() da la etiqueta legible de un registro: si el envoltorio resuelve a una
     cadena (estados, sellos, activaciones) se usa tal cual; si resuelve a un
     objeto (entidades, dominios, ancla, modos) se toma su campo `name`. */
  const nm = (o) => { const v = L(o); return typeof v === 'string' ? v : ((v && v.name) || ''); };
  const es = (a, b) => (lang === 'es' ? a : b);

  /* ── rutas del sitio ───────────────────────────────────────────────────── */
  /* graph.js enlaza las fuentes internas con el nombre de archivo en español.
     El bloque estático genera un islote <script id="hcu-paths"> con la traducción
     de esos nombres al idioma de la página. Sin el islote, un enlace interno del
     expediente en EN apuntaría a en/gobernanza.html (404). Los esquemas externos
     (http, mailto, tel, data) y los anclas no se tocan. */
  const PATHS = (() => {
    try {
      const n = document.getElementById('hcu-paths');
      return n ? JSON.parse(n.textContent) : {};
    } catch (err) { return {}; }
  })();
  const isRemote = (h) => (/^[a-z][a-z0-9+.-]*:/i.test(String(h || '')) || String(h || '').charAt(0) === '#');
  const siteHref = (h) => (isRemote(h) ? h : (PATHS[String(h || '').replace(/^\.\//, '')] || h));

  const T = {
    es: {
      rotate: 'Arrastra para orbitar · rueda o teclas +/− para acercar · clic en una partícula para abrir su expediente · flechas para girar con el teclado',
      empty: 'Selecciona una partícula o una fila del registro para ver su expediente con las fuentes que la sostienen.',
      noEvidence: 'sin fuente enlazada',
      src: 'Fuentes',
      verified: 'verificado',
      noVerified: 'enlace interno del sitio',
      risk: 'Riesgo de lectura',
      next: 'Qué lo subiría de estado',
      flows: 'Flujos que atraviesan esta entidad',
      sel: 'seleccionada',
      snapOk: 'Instantánea calculada. El digestivo es SHA-512 local: coincide o no coincide, no es firma digital ni sello de tiempo.',
      snapNo: 'Este navegador no expone Web Crypto en este contexto: no se calcula digestivo y la instantánea no se exporta.',
      reduced: 'Movimiento reducido: la rotación automática está desactivada. Usa las flechas o los botones de capa.',
      layerWord: 'Capa', on: 'activada', off: 'desactivada',
      regionRisk: 'Riesgo de región: el número de partículas dice más de donde TAMV trabaja que de dónde debería trabajar. Una región vacía no es una región segura: es una afirmación sin hacer.',
      entitiesIn: 'Entidades en la región',
      kind: 'Tipo', region: 'Región', activation: 'Activación', state: 'Estado de evidencia',
      density: 'Densidad', uncertainty: 'Incertidumbre', whatItIs: 'Qué es', seals: 'Sellos',
      sourcesWord: 'fuentes', pause: 'Pausar rotación', resume: 'Reanudar rotación',
      mode: 'Modo', reset: 'Vista reiniciada.', lead: 'Lectura de liderazgo'
    },
    en: {
      rotate: 'Drag to orbit · wheel or +/− to zoom · click a particle to open its dossier · arrow keys to rotate with the keyboard',
      empty: 'Select a particle or a row of the register to read its dossier with the sources behind it.',
      noEvidence: 'no source linked',
      src: 'Sources',
      verified: 'verified',
      noVerified: 'internal site link',
      risk: 'Reading risk',
      next: 'What would raise its state',
      flows: 'Flows crossing this entity',
      sel: 'selected',
      snapOk: 'Snapshot computed. The digest is a local SHA-512: it matches or it does not — it is not a digital signature or a trusted timestamp.',
      snapNo: 'This browser does not expose Web Crypto in this context: no digest is computed and the snapshot is not exported.',
      reduced: 'Reduced motion: automatic rotation is off. Use the arrow keys or the layer buttons.',
      layerWord: 'Layer', on: 'on', off: 'off',
      regionRisk: 'Region risk: the number of particles says more about where TAMV works than where it should. An empty region is not a safe region: it is a claim left unmade.',
      entitiesIn: 'Entities in this region',
      kind: 'Kind', region: 'Region', activation: 'Activation', state: 'Evidence state',
      density: 'Density', uncertainty: 'Uncertainty', whatItIs: 'What it is', seals: 'Seals',
      sourcesWord: 'sources', pause: 'Pause rotation', resume: 'Resume rotation',
      mode: 'Mode', reset: 'View reset.', lead: 'Lead reading'
    }
  }[lang];

  const KIND = {
    es: { documento: 'Documento', registro: 'Registro', nodo: 'Nodo', capacidad: 'Capacidad', actor: 'Actor', vacio: 'Vacío declarado', domain: 'Región de densidad', core: 'Ancla conceptual' },
    en: { documento: 'Document', registro: 'Record', nodo: 'Node', capacidad: 'Capability', actor: 'Actor', vacio: 'Declared void', domain: 'Density region', core: 'Conceptual anchor' }
  }[lang];

  /* ── modelo derivado: densidad = sellos verificados + fuentes ─────────── */
  const SEAL_KEYS = G.sealDefs.map(d => d.key);
  const sealYes = (e) => SEAL_KEYS.filter(k => e.seals[k] === 'si').length;
  const domById = new Map(G.domains.map(d => [d.id, d]));
  const nodes = [];
  nodes.push({ id: 'core', kind: 'core', dom: null, x: 0, y: 0, z: 0, r: 21, ev: 0, phase: 0 });
  const R = 252, D = G.domains.length;
  G.domains.forEach((d, i) => {
    const phi = Math.acos(-1 + (2 * i + 1) / D), th = Math.sqrt(D * Math.PI) * phi;
    nodes.push({
      id: 'dom:' + d.id, kind: 'domain', dom: d, color: d.color,
      x: R * Math.sin(phi) * Math.cos(th), y: R * Math.cos(phi), z: R * Math.sin(phi) * Math.sin(th),
      r: 13, ev: 0, phase: i * 1.7
    });
  });
  const ents = G.entities.map((e, i) => {
    const ev = sealYes(e) + Math.min(3, e.src.length);
    const n = {
      id: e.id, kind: e.kind, ent: e, domId: 'dom:' + e.dom,
      color: (domById.get(e.dom) || {}).color || '#9ed4ff',
      ev, r: 4.6 + Math.min(11, ev * 1.5),
      angle: (i / G.entities.length) * Math.PI * 2 + (e.dom.charCodeAt(0) % 7) * 0.4,
      orbit: 92 + (i % 5) * 7, phase: (i * 0.9) % 7, wob: 0.6 + (i % 4) * 0.22
    };
    nodes.push(n);
    return n;
  });
  const byId = new Map(nodes.map(n => [n.id, n]));
  const entById = new Map(G.entities.map(e => [e.id, e]));
  const maxEv = Math.max.apply(null, ents.map(n => n.ev)) || 1;
  const stateOf = (code) => G.states.find(s => s.code === code);

  /* ── lienzo ───────────────────────────────────────────────────────────── */
  const holder = stage.querySelector('[data-hcu-holder]');
  const field = stage.querySelector('canvas[data-layer="field"]');
  const net = stage.querySelector('canvas[data-layer="net"]');
  if (!holder || !field || !net || !net.getContext) { stage.remove(); return; }
  const fx = field.getContext('2d'), cx = net.getContext('2d');
  let W = 0, H = 0, DPR = 1, stars = [];

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = holder.clientWidth || 900; H = holder.clientHeight || 520;
    [field, net].forEach(c => {
      c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
      c.style.width = W + 'px'; c.style.height = H + 'px';
    });
    fx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    stars = Array.from({ length: Math.round(W * H / 5200) }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.1 + 0.25,
      a: Math.random() * 0.5 + 0.12, s: Math.random() * 0.06 + 0.01
    }));
  }
  window.addEventListener('resize', resize);

  /* ── estado de la interfaz ────────────────────────────────────────────── */
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layers = { field: true, flow: true, density: true, gravity: false, risk: false, evidence: false };
  let mode = 'community', running = !reduced, t = 0, sel = null, hover = null;
  let rx = -0.3, ry = 0.5, trx = -0.3, tryy = 0.5, zoom = 1, tz = 1, orbit = 0, drag = null;
  let filter = { q: '', state: 0, dom: '' };

  /* ── proyección ───────────────────────────────────────────────────────── */
  function project(n) {
    const cy = Math.cos(ry), sy = Math.sin(ry), ca = Math.cos(rx), sa = Math.sin(rx);
    const x1 = n.x * cy - n.z * sy, z1 = n.z * cy + n.x * sy;
    const y2 = n.y * ca - z1 * sa, z2 = z1 * ca + n.y * sa;
    const fov = 620, p = fov / (fov + z2);
    n.sx = W / 2 + x1 * p * zoom; n.sy = H / 2 + y2 * p * zoom;
    n.sz = z2; n.sr = Math.max(1.1, n.r * p * zoom); n.sp = p;
  }

  function physics() {
    if (running) { t++; orbit += 0.0026; }
    rx += (trx - rx) * 0.14; ry += (tryy - ry) * 0.14; zoom += (tz - zoom) * 0.14;
    nodes.forEach(n => {
      if (n.kind === 'core') { n.x = 0; n.y = 0; n.z = 0; return; }
      n.phase += 0.012;
      if (n.kind === 'domain') { n.r = 13 + Math.sin(n.phase) * 1.3; return; }
      const p = byId.get(n.domId); if (!p) return;
      const a = n.angle + orbit * n.wob;
      const rr = n.orbit + Math.sin(n.phase * 0.8) * 7;
      n.x = p.x + Math.cos(a) * rr;
      n.y = p.y + Math.sin(a * 1.03) * rr * 0.62;
      n.z = p.z + Math.sin(a) * rr;
    });
    if (running && layers.flow) flows.forEach(f => { f.p += f.v; if (f.p > 1) f.p = 0; });
  }

  /* flujos: cada proposición se descompone en tramos fuente→destino */
  const flows = [];
  G.flows.forEach((fl, i) => {
    fl.from.forEach(a => fl.to.forEach(b => flows.push({ id: fl.id, a: byId.get(a), b: byId.get(b), p: (i * 0.17 + Math.random() * 0.5) % 1, v: 0.0026 + (i % 3) * 0.0009 })));
    fl.to.forEach(b => fl.from.forEach(a => flows.push({ id: fl.id, a: byId.get(a), b: byId.get(b), p: (i * 0.23 + Math.random() * 0.4) % 1, v: 0.0021 + (i % 4) * 0.0007 })));
  });

  function hex(c, a) {
    const v = String(c || '#9ed4ff').replace('#', '');
    const n = parseInt(v.length === 3 ? v.split('').map(x => x + x).join('') : v, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function codeOf(e) {
    const d = domById.get(e.dom);
    const i = G.entities.filter(x => x.dom === e.dom).indexOf(e) + 1;
    return (d ? d.code : '??') + i;
  }

  function visible(n) {
    if (n.kind === 'core') return true;
    if (n.kind === 'domain') return !filter.dom || n.dom.id === filter.dom;
    const e = n.ent, s = L(e);
    if (filter.dom && e.dom !== filter.dom) return false;
    if (filter.state && e.st !== filter.state) return false;
    if (filter.q) {
      const hay = [
        s.name, s.cls, s.what, s.risk, s.next, codeOf(e),
        e.src.map(x => (typeof x[lang] === 'string' ? x[lang] : x.es || '') + ' ' + (x.href || '')).join(' ')
      ].join(' ').toLowerCase();
      if (!hay.includes(filter.q)) return false;
    }
    return true;
  }

  /* ── capa de campo: nebulosas ─────────────────────────────────────────── */
  function drawField() {
    fx.clearRect(0, 0, W, H);
    if (!layers.field) return;
    stars.forEach(s => {
      if (running) { s.y -= s.s; if (s.y < 0) s.y = H; }
      fx.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(t * 0.015 + s.x * 0.05));
      fx.fillStyle = '#dbe9f7';
      fx.beginPath(); fx.arc(s.x, s.y, s.r, 0, 7); fx.fill();
    });
    fx.globalAlpha = 1;
    G.domains.forEach(d => {
      const n = byId.get('dom:' + d.id);
      if (!n || !Number.isFinite(n.sx)) return;
      const count = G.entities.filter(e => e.dom === d.id).length;
      const dens = layers.density ? Math.min(1, 0.32 + count * 0.12) : 0.42;
      const rad = Math.max(70, 150 * n.sp * zoom);
      const g = fx.createRadialGradient(n.sx, n.sy, 0, n.sx, n.sy, rad);
      g.addColorStop(0, hex(d.color, 0.30 * dens));
      g.addColorStop(0.35, hex(d.color, 0.14 * dens));
      g.addColorStop(1, hex(d.color, 0));
      fx.fillStyle = g;
      fx.beginPath(); fx.arc(n.sx, n.sy, rad, 0, 7); fx.fill();
    });
  }

  /* ── red ──────────────────────────────────────────────────────────────── */
  function drawNet() {
    cx.clearRect(0, 0, W, H);

    if (layers.gravity) {
      cx.lineWidth = 0.7;
      nodes.forEach(n => {
        if (n.kind === 'core') return;
        const anchor = n.kind === 'domain' ? byId.get('core') : byId.get(n.domId);
        if (!anchor) return;
        cx.strokeStyle = hex(n.color || '#9ed4ff', visible(n) ? 0.3 : 0.08);
        cx.beginPath(); cx.moveTo(anchor.sx, anchor.sy);
        cx.quadraticCurveTo((anchor.sx + n.sx) / 2 + Math.sin(t * 0.01 + n.phase) * 12, (anchor.sy + n.sy) / 2, n.sx, n.sy);
        cx.stroke();
      });
    }

    if (layers.flow) {
      flows.forEach(f => {
        if (!f.a || !f.b) return;
        const on = visible(f.a) && visible(f.b);
        cx.strokeStyle = hex(f.a.color || '#9ed4ff', on ? 0.14 : 0.04);
        cx.lineWidth = 0.9;
        const mx = (f.a.sx + f.b.sx) / 2 + Math.sin(t * 0.008 + f.a.phase) * 22;
        const my = (f.a.sy + f.b.sy) / 2 + Math.cos(t * 0.009 + f.b.phase) * 22;
        cx.beginPath(); cx.moveTo(f.a.sx, f.a.sy); cx.quadraticCurveTo(mx, my, f.b.sx, f.b.sy); cx.stroke();
        const u = f.p;
        const px = (1 - u) * (1 - u) * f.a.sx + 2 * (1 - u) * u * mx + u * u * f.b.sx;
        const py = (1 - u) * (1 - u) * f.a.sy + 2 * (1 - u) * u * my + u * u * f.b.sy;
        const rr = (on ? 2.1 : 1) * (0.8 + 0.3 * Math.sin(u * 12));
        const g = cx.createRadialGradient(px, py, 0, px, py, rr * 4);
        g.addColorStop(0, 'rgba(255,255,255,' + (on ? 0.9 : 0.25) + ')');
        g.addColorStop(0.4, hex(f.a.color || '#9ed4ff', on ? 0.5 : 0.12));
        g.addColorStop(1, hex(f.a.color || '#9ed4ff', 0));
        cx.fillStyle = g; cx.beginPath(); cx.arc(px, py, rr * 4, 0, 7); cx.fill();
      });
    }

    nodes.slice().sort((a, b) => b.sz - a.sz).forEach(n => {
      const on = visible(n);
      const r = n.sr;
      const col = n.color || (n.kind === 'core' ? '#ffffff' : '#9ed4ff');
      cx.globalAlpha = on ? 1 : 0.2;

      const glow = cx.createRadialGradient(n.sx, n.sy, 0, n.sx, n.sy, r * 4.6);
      glow.addColorStop(0, hex(col, 0.85));
      glow.addColorStop(0.22, hex(col, 0.32));
      glow.addColorStop(1, hex(col, 0));
      cx.fillStyle = glow; cx.beginPath(); cx.arc(n.sx, n.sy, r * 4.6, 0, 7); cx.fill();

      if (layers.evidence && n.ent) {
        const e = n.ent;
        cx.strokeStyle = e.st >= 2 ? '#7fe6bd' : '#ffd479';
        cx.lineWidth = 1.1;
        cx.setLineDash(e.st >= 3 ? [] : e.st === 2 ? [4, 3] : [1.6, 3]);
        cx.beginPath(); cx.arc(n.sx, n.sy, r + 6 + (running ? Math.sin(t * 0.02 + n.phase) * 1.2 : 0), 0, 7); cx.stroke();
        cx.setLineDash([]);
        for (let k = 0; k < sealYes(e); k++) {
          const a = -Math.PI / 2 + k * (Math.PI * 2 / 5);
          cx.fillStyle = '#7fe6bd';
          cx.beginPath(); cx.arc(n.sx + Math.cos(a) * (r + 11), n.sy + Math.sin(a) * (r + 11), 1.5, 0, 7); cx.fill();
        }
      }
      if (layers.risk && n.ent && n.ent.rk === 'alto') {
        cx.strokeStyle = '#ff9fb0'; cx.lineWidth = 1.5;
        cx.beginPath(); cx.arc(n.sx, n.sy, r + 15 + (running ? Math.sin(t * 0.05 + n.phase) * 2.4 : 0), 0, 7); cx.stroke();
      }

      const coreG = cx.createRadialGradient(n.sx - r * 0.3, n.sy - r * 0.3, 0, n.sx, n.sy, r);
      coreG.addColorStop(0, '#ffffff');
      coreG.addColorStop(0.4, col);
      coreG.addColorStop(1, n.kind === 'core' ? '#2a4a72' : '#04101d');
      cx.fillStyle = coreG; cx.beginPath(); cx.arc(n.sx, n.sy, r, 0, 7); cx.fill();

      const isSel = sel && sel.id === n.id;
      cx.strokeStyle = isSel ? '#ffffff' : (hover === n ? 'rgba(255,255,255,.75)' : hex(col, 0.6));
      cx.lineWidth = isSel ? 2.2 : 1;
      cx.beginPath(); cx.arc(n.sx, n.sy, r, 0, 7); cx.stroke();

      /* el código de región se pinta siempre: el color nunca es el único indicador */
      const code = n.kind === 'core' ? 'Ω' : (n.kind === 'domain' ? n.dom.code : codeOf(n.ent));
      if (n.sp > 0.5) {
        cx.fillStyle = 'rgba(4,16,29,.85)';
        cx.font = '600 ' + Math.max(7, Math.round(r * 0.9)) + 'px "IBM Plex Mono", ui-monospace, monospace';
        cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.fillText(code, n.sx, n.sy + 0.5);
      }
      const showName = n.kind === 'domain' ? n.sp > 0.5 : n.sp > 0.6;
      if (showName) {
        const label = n.kind === 'core' ? nm(G.core) : n.kind === 'domain' ? nm(n.dom) : nm(n.ent);
        cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
        cx.font = '600 ' + Math.max(9, Math.round(11 * n.sp)) + 'px "IBM Plex Sans", system-ui, sans-serif';
        cx.fillStyle = on ? 'rgba(234,243,251,.96)' : 'rgba(234,243,251,.35)';
        cx.fillText(label.length > 34 ? label.slice(0, 33) + '…' : label, n.sx + r + 8, n.sy + 1);
        if (n.ent) {
          cx.font = '400 ' + Math.max(8, Math.round(9 * n.sp)) + 'px "IBM Plex Mono", ui-monospace, monospace';
          cx.fillStyle = on ? 'rgba(158,212,255,.85)' : 'rgba(158,212,255,.3)';
          cx.fillText('E' + n.ent.st + (n.ev ? ' · d' + n.ev : ' · —'), n.sx + r + 8, n.sy + 14);
        }
      }
      cx.globalAlpha = 1;
    });
  }

  function loop() {
    physics();
    nodes.forEach(project);
    drawField();
    drawNet();
    window.requestAnimationFrame(loop);
  }

  /* ── panel: registro navegable (derivado de graph.js) ─────────────────── */
  const indexBody = stage.querySelector('[data-hcu-list]');
  function buildIndex() {
    if (!indexBody) return;
    indexBody.innerHTML = '';
    G.domains.forEach(d => {
      const list = G.entities.filter(e => e.dom === d.id);
      const lab = document.createElement('div');
      lab.className = 'hcu-group-label';
      lab.innerHTML = '<i></i><span></span>';
      lab.querySelector('i').style.background = d.color;
      lab.querySelector('span').textContent = nm(d) + ' · ' + list.length;
      indexBody.appendChild(lab);
      list.forEach(e => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'hcu-item' + (e.kind === 'vacio' ? ' is-void' : '');
        b.dataset.node = e.id;
        b.innerHTML = '<b></b><small></small>';
        b.querySelector('b').textContent = nm(e);
        b.querySelector('small').textContent = codeOf(e) + ' · ' + nm(stateOf(e.st)) + ' · ' +
          (e.src.length ? e.src.length + ' ' + T.sourcesWord : T.noEvidence);
        indexBody.appendChild(b);
      });
    });
    applyIndexFilter();
    markSelection();
  }
  function applyIndexFilter() {
    if (!indexBody) return;
    indexBody.querySelectorAll('.hcu-item').forEach(b => {
      const n = byId.get(b.dataset.node);
      b.classList.toggle('is-hidden', n ? !visible(n) : true);
    });
  }
  function markSelection() {
    indexBody && indexBody.querySelectorAll('.hcu-item').forEach(b =>
      b.setAttribute('aria-current', String(!!sel && b.dataset.node === sel.id)));
    document.querySelectorAll('[data-hcu-row]').forEach(r =>
      r.setAttribute('aria-current', String(!!sel && r.dataset.hcuRow === sel.id)));
  }

  /* ── expediente ───────────────────────────────────────────────────────── */
  const dossier = stage.querySelector('[data-hcu-dossier]');
  const status = document.querySelector('[data-hcu-status]');
  const say = (txt) => { if (status) status.textContent = txt; };

  function show(node) {
    sel = node;
    markSelection();
    if (!dossier) return;
    const e = node.ent;
    const s = e ? L(e) : null;
    dossier.classList.remove('is-empty');
    const head = dossier.querySelector('[data-hcu-dossier-head]');
    const body = dossier.querySelector('[data-hcu-dossier-body]');
    if (head) head.querySelector('h3').textContent =
      e ? codeOf(e) + ' · ' + nm(e) : (node.kind === 'core' ? 'Ω · ' + nm(G.core) : nm(node.dom) + ' · ' + node.dom.code);
    body.innerHTML = '';

    const meta = [];
    meta.push([T.kind, KIND[e ? e.kind : node.kind]]);
    meta.push([T.region, e ? nm(domById.get(e.dom)) : (node.kind === 'core' ? '—' : nm(node.dom))]);
    if (e) {
      meta.push([T.activation, nm(G.activations[e.act])]);
      meta.push([T.state, 'E' + e.st + ' · ' + nm(stateOf(e.st))]);
      meta.push([T.density, e.st >= 2 ? String(node.ev) : '0']);
      meta.push([T.uncertainty, uncLabel(node.ev)]);
    }
    const kv = document.createElement('div');
    kv.className = 'hcu-kv-set';
    meta.forEach(([k, v]) => {
      const d = document.createElement('div'); d.className = 'hcu-kv';
      const a = document.createElement('span'); a.textContent = k;
      const b = document.createElement('b'); b.textContent = v;
      d.append(a, b); kv.appendChild(d);
    });
    body.appendChild(kv);

    if (e) {
      body.appendChild(sub(T.whatItIs));
      body.appendChild(par(s.what));
      if (s.cls) body.appendChild(el('p', s.cls, 'mono-note'));
      body.appendChild(sub(T.risk));
      body.appendChild(par(s.risk));
      body.appendChild(sub(T.next));
      body.appendChild(par(s.next));

      body.appendChild(sub(T.seals));
      const ul = document.createElement('ul'); ul.className = 'hcu-seals';
      G.sealDefs.forEach(sd => {
        const v = e.seals[sd.key];
        const li = document.createElement('li');
        const mark = document.createElement('b');
        mark.textContent = v === 'si' ? '✓' : v === 'parcial' ? '~' : v === 'na' ? '·' : '✗';
        mark.className = 'hcu-v-' + (v === 'si' ? 'yes' : v === 'parcial' ? 'part' : v === 'na' ? 'na' : 'no');
        const txt = document.createElement('span'); txt.textContent = L(sd) + ' — ' + sealWord(v);
        li.append(mark, txt); ul.appendChild(li);
      });
      body.appendChild(ul);

      body.appendChild(sub(T.src));
      const sl = document.createElement('ul'); sl.className = 'hcu-src';
      e.src.forEach(x => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = siteHref(x.href); a.textContent = L(x);
        if (/^https?:/i.test(x.href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        li.appendChild(a);
        const em = document.createElement('em');
        em.textContent = x.ver ? T.verified + ' ' + x.ver : T.noVerified;
        li.appendChild(em); sl.appendChild(li);
      });
      body.appendChild(sl);

      const rel = G.flows.filter(f => f.from.concat(f.to).indexOf(e.id) >= 0);
      if (rel.length) {
        body.appendChild(sub(T.flows));
        const rl = document.createElement('div'); rl.className = 'hcu-flowrefs';
        rel.forEach(f => {
          const d = document.createElement('div'); d.className = 'hcu-flowref';
          const a = document.createElement('button');
          a.type = 'button'; a.className = 'hcu-btn';
          a.textContent = f.id + ' · ' + L(f).claim;
          a.addEventListener('click', () => {
            const el2 = document.querySelector('[data-hcu-flow="' + f.id + '"]');
            if (el2) el2.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
          });
          d.append(a); rl.appendChild(d);
        });
        body.appendChild(rl);
      }
    } else {
      body.appendChild(sub(T.whatItIs));
      body.appendChild(par(node.kind === 'core' ? L(G.core).what : L(node.dom).field));
      body.appendChild(sub(T.risk));
      body.appendChild(par(node.kind === 'core' ? (L(G.core).risk || '') : T.regionRisk));
      if (node.kind === 'domain') {
        body.appendChild(sub(T.entitiesIn));
        const ul = document.createElement('ul'); ul.className = 'hcu-src';
        G.entities.filter(x => x.dom === node.dom.id).forEach(x => {
          const li = document.createElement('li');
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'hcu-btn';
          b.textContent = codeOf(x) + ' · ' + nm(x);
          b.addEventListener('click', () => show(byId.get(x.id)));
          li.appendChild(b); ul.appendChild(li);
        });
        if (!ul.children.length) ul.appendChild(el('li', T.noEvidence, 'muted'));
        body.appendChild(ul);
      }
    }
    say((e ? codeOf(e) : node.id) + ' ' + T.sel);
  }

  function sealWord(v) {
    return { si: es('cumple', 'met'), no: es('no cumple', 'not met'), parcial: es('parcial', 'partial'), na: es('no aplica', 'not applicable') }[v] || v;
  }
  function uncLabel(ev) {
    const u = 1 - ev / maxEv;
    const word = u > 0.66 ? es('alta', 'high') : u > 0.33 ? es('media', 'medium') : es('baja', 'low');
    return word + ' (' + Math.round(u * 100) + '%)';
  }
  function sub(txt) { const d = document.createElement('div'); d.className = 'hcu-sub'; d.textContent = txt; return d; }
  function par(txt) { const p = document.createElement('p'); p.textContent = String(txt || ''); return p; }
  function el(tag, txt, cls) { const n = document.createElement(tag); n.textContent = String(txt || ''); if (cls) n.className = cls; return n; }
  function closeDossier() { if (dossier) dossier.classList.add('is-empty'); sel = null; markSelection(); }

  /* ── interacción ──────────────────────────────────────────────────────── */
  function pick(x, y) {
    let best = null, bd = 1e9;
    nodes.forEach(n => {
      if (!visible(n) || !Number.isFinite(n.sx)) return;
      const d = Math.hypot(n.sx - x, n.sy - y);
      if (d < Math.max(15, n.sr + 7) && d < bd) { bd = d; best = n; }
    });
    return best;
  }
  net.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    if (net.setPointerCapture) { try { net.setPointerCapture(e.pointerId); } catch (_) { /* sin captura */ } }
    stage.classList.add('is-dragging');
  });
  net.addEventListener('pointermove', e => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      tryy += dx * 0.005; trx += dy * 0.005;
      drag.x = e.clientX; drag.y = e.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      return;
    }
    const b = net.getBoundingClientRect();
    hover = pick(e.clientX - b.left, e.clientY - b.top);
    net.style.cursor = hover ? 'pointer' : 'grab';
  });
  window.addEventListener('pointerup', e => {
    stage.classList.remove('is-dragging');
    if (!drag) return;
    const wasDrag = drag.moved > 6; drag = null;
    if (wasDrag) return;
    const b = net.getBoundingClientRect();
    const n = pick(e.clientX - b.left, e.clientY - b.top);
    if (n) show(n); else closeDossier();
  });
  net.addEventListener('wheel', e => { e.preventDefault(); tz = Math.min(2.6, Math.max(0.45, tz * (e.deltaY < 0 ? 1.09 : 0.92))); }, { passive: false });

  holder.setAttribute('tabindex', '0');
  holder.setAttribute('role', 'application');
  holder.setAttribute('aria-label', es('Mapa vivo del ecosistema TAMV. Usa las flechas para orbitar, más y menos para acercar, y la lista de entidades para leer los expedientes sin el lienzo.', 'Living map of the TAMV ecosystem. Use the arrow keys to orbit, plus and minus to zoom, and the entity list to read the dossiers without the canvas.'));
  holder.addEventListener('keydown', e => {
    const k = e.key;
    if (k === 'ArrowLeft') { tryy -= 0.14; e.preventDefault(); }
    else if (k === 'ArrowRight') { tryy += 0.14; e.preventDefault(); }
    else if (k === 'ArrowUp') { trx -= 0.12; e.preventDefault(); }
    else if (k === 'ArrowDown') { trx += 0.12; e.preventDefault(); }
    else if (k === '+' || k === '=') { tz = Math.min(2.6, tz * 1.12); e.preventDefault(); }
    else if (k === '-' || k === '_') { tz = Math.max(0.45, tz * 0.89); e.preventDefault(); }
    else if (k === 'Escape') { closeDossier(); }
  });
  if (indexBody) indexBody.addEventListener('click', e => {
    const b = e.target.closest('.hcu-item'); if (!b) return;
    const n = byId.get(b.dataset.node); if (!n) return;
    aim(n); show(n);
  });
  function aim(n) {
    tryy = Math.atan2(n.x, n.z) * -1 + 0.4;
    trx = Math.max(-1.1, Math.min(1.1, -n.y / 320));
  }

  document.querySelectorAll('[data-hcu-row]').forEach(r => {
    r.addEventListener('click', () => {
      const n = byId.get(r.dataset.hcuRow);
      if (!n) return;
      stage.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      aim(n); show(n);
    });
  });

  /* ── controles ────────────────────────────────────────────────────────── */
  document.querySelectorAll('[data-hcu-layer]').forEach(b => {
    const key = b.dataset.hcuLayer;
    b.setAttribute('aria-pressed', String(layers[key]));
    b.addEventListener('click', () => {
      layers[key] = !layers[key];
      b.setAttribute('aria-pressed', String(layers[key]));
      say(T.layerWord + ' «' + b.textContent + '»: ' + (layers[key] ? T.on : T.off));
    });
  });
  document.querySelectorAll('[data-hcu-mode]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.hcuMode === mode));
    b.addEventListener('click', () => {
      mode = b.dataset.hcuMode;
      const m = G.modes.find(x => x.id === mode);
      if (!m) return;
      Object.keys(layers).forEach(k => { if (k !== 'field' && m.layers[k] !== undefined) layers[k] = m.layers[k]; });
      document.querySelectorAll('[data-hcu-layer]').forEach(x => x.setAttribute('aria-pressed', String(layers[x.dataset.hcuLayer])));
      document.querySelectorAll('[data-hcu-mode]').forEach(x => {
        x.classList.toggle('is-lead', x === b);
        x.setAttribute('aria-pressed', String(x === b));
      });
      filter.dom = ''; filter.state = 0;
      const selDom = document.querySelector('[data-hcu-filter="dom"]'); if (selDom) selDom.value = '';
      const selSt = document.querySelector('[data-hcu-filter="state"]'); if (selSt) selSt.value = '0';
      buildIndex(); applyFilters();
      say(T.mode + ': ' + nm(m) + ' — ' + L(m).ask);
    });
  });
  const playBtn = document.querySelector('[data-hcu-play]');
  if (playBtn) playBtn.addEventListener('click', function () {
    running = !running;
    this.setAttribute('aria-pressed', String(running));
    this.textContent = running ? T.pause : T.resume;
  });
  const q = document.querySelector('[data-hcu-search]');
  if (q) q.addEventListener('input', () => { filter.q = q.value.trim().toLowerCase(); applyIndexFilter(); applyFilters(); });
  document.querySelectorAll('[data-hcu-filter]').forEach(s => {
    s.addEventListener('change', () => {
      if (s.dataset.hcuFilter === 'dom') filter.dom = s.value;
      if (s.dataset.hcuFilter === 'state') filter.state = +s.value;
      applyIndexFilter(); applyFilters();
    });
  });
  function applyFilters() {
    const vis = nodes.filter(n => n.ent && visible(n)).length;
    const out = document.querySelector('[data-hcu-visible]');
    if (out) out.textContent = String(vis);
    say(es('Entidades visibles: ', 'Visible entities: ') + vis + ' / ' + G.entities.length);
  }
  document.querySelector('[data-hcu-close]')?.addEventListener('click', closeDossier);
  document.querySelector('[data-hcu-reset]')?.addEventListener('click', () => {
    filter = { q: '', state: 0, dom: '' };
    if (q) q.value = '';
    document.querySelectorAll('[data-hcu-filter]').forEach(s => s.value = s.dataset.hcuFilter === 'state' ? '0' : '');
    trx = -0.3; tryy = 0.5; tz = 1;
    closeDossier(); applyIndexFilter(); applyFilters();
    say(T.reset);
  });

  /* ── resumen calculado desde los datos ────────────────────────────────── */
  function fillTally() {
    const box = document.querySelector('[data-hcu-tally]'); if (!box) return;
    const withPersist = G.entities.filter(e => e.seals.persist === 'si').length;
    const noSource = G.entities.filter(e => !e.src.length).length;
    const assessed = G.entities.filter(e => e.st >= 3).length;
    const closed = G.entities.filter(e => ['cerrado-por-diseno', 'no-poblado', 'propuesto'].indexOf(e.act) >= 0).length;
    const rows = [
      [G.entities.length, es('entidades en el mapa, cada una con registro o vacío declarado', 'entities on the map, each with a record or a declared void'), false],
      [withPersist, es('con identificador persistente propio', 'with their own persistent identifier'), false],
      [assessed, es('en estado de evidencia evaluada o superior (E3+)', 'at the evidence-assessed state or above (E3+)'), true],
      [noSource, es('sin ninguna fuente enlazada', 'with no source linked at all'), false],
      [closed, es('cerradas, no pobladas o sólo propuestas', 'closed, unpopulated or proposal-only'), false],
      [G.flows.length, es('proposiciones de relación entre entidades', 'relation propositions between entities'), false]
    ];
    box.innerHTML = '';
    rows.forEach(([n, s, alert]) => {
      const d = document.createElement('div'); if (alert) d.className = 'is-alert';
      d.innerHTML = '<b></b><span></span>';
      d.querySelector('b').textContent = String(n);
      d.querySelector('span').textContent = s;
      box.appendChild(d);
    });
  }

  /* ── instantánea con digestivo SHA-512 ───────────────────────────────── */
  document.querySelector('[data-hcu-snapshot]')?.addEventListener('click', async function () {
    const snap = {
      format: 'tamv-hcu-snapshot/1',
      version: G.meta.version,
      site: location.host || 'local',
      generated: new Date().toISOString(),
      lang, mode, layers,
      selection: sel ? sel.id : null,
      nodes: nodes.filter(n => n.ent || n.kind === 'domain').map(n => ({
        id: n.id, kind: n.kind,
        region: n.ent ? n.ent.dom : n.dom.id,
        code: n.ent ? codeOf(n.ent) : n.dom.code,
        state: n.ent ? n.ent.st : null,
        activation: n.ent ? n.ent.act : null,
        density: n.ev,
        sources: n.ent ? n.ent.src.length : 0
      })),
      flows: G.flows.map(f => ({ id: f.id, from: f.from, to: f.to, type: f.type, state: 1 })),
      digest: 'sha-512:'
    };
    let body = JSON.stringify(Object.assign({}, snap, { digest: '' }));
    if (!(window.crypto && crypto.subtle && crypto.subtle.digest)) { say(T.snapNo); return; }
    try {
      const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(body));
      snap.digest = 'sha-512:' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      body = JSON.stringify(snap, null, 2);
    } catch (err) { say(T.snapNo); return; }
    const name = 'tamv-hcu-' + es('instantanea', 'snapshot') + '-' + G.meta.audited + '.json';
    const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    const out = document.querySelector('[data-hcu-digest]');
    if (out) out.textContent = snap.digest;
    say(T.snapOk);
  });

  /* ── arranque ─────────────────────────────────────────────────────────── */
  resize();
  nodes.forEach(project);
  buildIndex(); fillTally(); applyFilters();
  const hint = stage.querySelector('[data-hcu-hint]'); if (hint) hint.textContent = T.rotate;
  if (reduced) { running = false; say(T.reduced); }
  if (playBtn) {
    playBtn.setAttribute('aria-pressed', String(running));
    if (!running) playBtn.textContent = T.resume;
  }
  const leadMode = document.querySelector('[data-hcu-mode="community"]');
  if (leadMode) leadMode.classList.add('is-lead');
  loop();
})();
