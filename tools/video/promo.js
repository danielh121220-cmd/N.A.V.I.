const stage = document.getElementById('stage');
const PH = window.PHOTOS || {};
const E = {
  out: t => 1 - Math.pow(1 - t, 3),
  out5: t => 1 - Math.pow(1 - t, 5),
  expo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  io: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  lin: t => t
};
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b, e = E.out) => e(clamp((t - a) / (b - a)));
const lerp = (a, b, p) => a + (b - a) * p;
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const css = (e, o) => { for (const k in o) e.style[k] = o[k]; return e; };

const ICON = '<svg viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#0A7CFF"/><g transform="translate(56 56) scale(4)"><path d="M50 16C54 16 58 20 62 26L86 70C90 77 85 86 77 86L23 86C15 86 10 77 14 70L38 26C42 20 46 16 50 16Z" fill="#fff"/><rect x="41" y="54" width="8" height="20" rx="4" fill="#0A7CFF"/><rect x="53" y="54" width="8" height="20" rx="4" fill="#0A7CFF"/></g></svg>';
const WAVES = c => `<svg viewBox="0 0 100 100" fill="none" stroke="${c}" stroke-linecap="round"><path d="M38 30c10 12 10 28 0 40" stroke-width="6"/><path d="M54 20c16 18 16 42 0 60" stroke-width="6"/><path d="M70 10c22 24 22 56 0 80" stroke-width="6"/><circle cx="24" cy="50" r="6" fill="${c}" stroke="none"/></svg>`;
const SIGNAL = c => `<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="${c}"/><rect x="5" y="5" width="3" height="7" rx="1" fill="${c}"/><rect x="10" y="2.5" width="3" height="9.5" rx="1" fill="${c}"/><rect x="15" y="0" width="3" height="12" rx="1" fill="${c}"/></svg>`;
const BATT = c => `<svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="${c}" opacity="0.4"/><rect x="2" y="2" width="18" height="9" rx="2" fill="${c}"/><rect x="25" y="4" width="2" height="5" rx="1" fill="${c}" opacity="0.4"/></svg>`;

function title(text, o = {}) {
  const el = h('div', 'ttl ' + (o.cls || 'white'));
  css(el, { top: (o.top != null ? o.top : 470) + 'px', fontSize: (o.size || 140) + 'px', fontWeight: o.weight || 700 });
  let on = false;
  el.innerHTML = text.split(' ').map(w => {
    let word = w;
    if (word.startsWith('*')) { on = true; word = word.slice(1); }
    const hl = on;
    if (word.endsWith('*')) { on = false; word = word.slice(0, -1); }
    return `<span class="w${hl ? ' ' + (o.hl || 'grad') : ''}">${word}</span>`;
  }).join(' ');
  return el;
}
function sub(text, o = {}) {
  const el = h('div', 'sub ' + (o.cls || 'gray'), text);
  css(el, { top: (o.top || 640) + 'px', fontSize: (o.size || 44) + 'px' });
  return el;
}
function reveal(el, lt, t0, o = {}) {
  const ws = el.querySelectorAll('.w');
  const st = o.stagger != null ? o.stagger : 0.075;
  const dur = o.dur || 0.75;
  ws.forEach((w, i) => {
    const p = prog(lt, t0 + i * st, t0 + i * st + dur, E.out5);
    w.style.opacity = p;
    w.style.transform = `translateY(${(1 - p) * (o.rise || 46)}px)`;
    w.style.filter = `blur(${(1 - p) * (o.blur != null ? o.blur : 14)}px)`;
  });
  if (o.out != null) {
    const q = prog(lt, o.out, o.out + (o.outDur || 0.45), E.io);
    el.style.opacity = 1 - q;
    el.style.transform = `translateY(${-q * 24}px)`;
  }
}
function fadeIn(el, lt, t0, d = 0.6, rise = 30, out = null, outDur = 0.45) {
  const p = prog(lt, t0, t0 + d, E.out5);
  let o = p;
  let y = (1 - p) * rise;
  if (out != null) { const q = prog(lt, out, out + outDur, E.io); o *= 1 - q; y -= q * 20; }
  el.style.opacity = o;
  el.style.transform = `translateY(${y}px)`;
}


const OLED_IDLE = { idle: true };
const OLED_HELLO = { bmp: (BITMAPS.happy || [])[0], l1: 'HOLA MATEO', l2: 'A TIEMPO 06:58' };
const V3 = G3.THREE;
function view3d(el, opts = {}) {
  const c = h('canvas', 'full');
  c.width = 1920; c.height = 1080;
  css(c, { width: '1920px', height: '1080px' });
  el.appendChild(c);
  return G3.createView(c, { width: 1920, height: 1080, ...opts });
}
function wall(v, color) {
  const m = new V3.Mesh(new V3.PlaneGeometry(4000, 4000), new V3.MeshStandardMaterial({ color, roughness: 0.92 }));
  m.position.z = -40.6;
  m.receiveShadow = true;
  v.scene.add(m);
  return m;
}
function look(v, from, to, fov) {
  v.camera.position.set(from[0], from[1], from[2]);
  if (fov) { v.camera.fov = fov; v.camera.updateProjectionMatrix(); }
  v.camera.lookAt(to[0], to[1], to[2]);
}
const mix3 = (a, b, p) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];
function seeded(n) { let x = n * 9301 + 49297; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; }
function tagMesh() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d');
  c.fillStyle = '#f7f7f5'; c.beginPath(); c.arc(128, 128, 127, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#c98a3a'; c.lineWidth = 4;
  for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(128, 128, 112 - i * 9, 0, Math.PI * 2); c.stroke(); }
  c.fillStyle = '#222'; c.fillRect(118, 60, 20, 14);
  const t = new V3.CanvasTexture(cv); t.colorSpace = V3.SRGBColorSpace;
  const m = new V3.Mesh(new V3.CylinderGeometry(12.5, 12.5, 0.4, 64), [new V3.MeshStandardMaterial({ color: '#eeeeea' }), new V3.MeshStandardMaterial({ map: t, roughness: 0.6 }), new V3.MeshStandardMaterial({ map: t, roughness: 0.6 })]);
  m.rotation.x = Math.PI / 2;
  return m;
}

function phone(imgs) {
  const p = h('div', 'phone');
  const scr = h('div', 'scr');
  p.layers = imgs.map(name => {
    const L = h('div', 'layer');
    const bg = (window.META && META[name]) || '#f2f2f7';
    const dark = name === 'ph_ficha';
    L.style.background = bg;
    L.innerHTML = `<div class="sb" style="color:${dark ? '#fff' : '#000'}"><span>6:58</span><span class="ic">${SIGNAL(dark ? '#fff' : '#000')}${BATT(dark ? '#fff' : '#000')}</span></div><img src="assets/${name}.png">`;
    scr.appendChild(L);
    return L;
  });
  p.appendChild(scr);
  p.appendChild(h('div', 'island'));
  p.scr = scr;
  return p;
}
function lockPhone() {
  const p = h('div', 'phone');
  const scr = h('div', 'scr');
  scr.innerHTML = `<div class="lock"><div class="sb" style="color:#fff;position:absolute;left:0;right:0;top:0;height:46px;display:flex;justify-content:space-between;align-items:center;padding:0 34px 0 40px;font:600 17px Inter"><span></span><span style="display:flex;gap:6px">${SIGNAL('#fff')}${BATT('#fff')}</span></div><div class="date">martes, 20 de octubre</div><div class="time">6:58</div><div class="note"><div class="ni">${ICON}</div><div class="nt"><b>N.A.V.I <span>ahora</span></b>Mateo ingresó a clases a las 6:58. ¡Llegó a tiempo!</div></div></div>`;
  p.appendChild(scr);
  p.appendChild(h('div', 'island'));
  p.note = scr.querySelector('.note');
  return p;
}
function laptop(img) {
  const l = h('div', 'laptop');
  l.innerHTML = `<div class="lid"><div class="sc"><img src="assets/${img}.png"></div></div><div class="base"></div>`;
  return l;
}

const S = [];
function scene(start, end, build, update, o = {}) {
  const el = h('div', 'scene');
  if (o.bg) el.style.background = o.bg;
  const ctx = build(el) || {};
  stage.appendChild(el);
  S.push({ start, end, el, update, ctx, fi: o.fi != null ? o.fi : 0.4, fo: o.fo != null ? o.fo : 0.4 });
}

scene(0, 3.3, el => {
  const a = title('6:58', { size: 260, top: 360, weight: 600 });
  const b = sub('a. m.', { top: 650, size: 54, cls: 'gray' });
  el.append(a, b);
  return { a, b };
}, (lt, s) => {
  const p = prog(lt, 0.3, 2.2, E.io);
  s.ctx.a.style.letterSpacing = `${lerp(-0.02, -0.05, p)}em`;
  reveal(s.ctx.a, lt, 0.35, { stagger: 0, dur: 1.1, blur: 20, rise: 20 });
  fadeIn(s.ctx.b, lt, 0.9, 0.8, 16);
}, { fi: 0.01, fo: 0.5 });

scene(3.0, 7.4, el => {
  let wrap = null;
  let v = null;
  let rd = null;
  let blinds = null;
  let motes = [];
  if (PH.gate) {
    wrap = h('div', 'photo');
    wrap.style.backgroundImage = 'url(assets/gate.png)';
    el.append(wrap, h('div', 'vignette'));
  } else {
    el.style.background = '#2a1d14';
    v = view3d(el, { env: 0.3 });
    v.renderer.toneMappingExposure = 1.05;
    wall(v, '#efe2cf');
    rd = G3.buildReader();
    rd.setOled('idle', OLED_IDLE);
    v.scene.add(rd.group);
    v.key.color.set('#ffc98f'); v.key.intensity = 3.2; v.key.position.set(520, 300, 260);
    v.fill.color.set('#8fa6ff'); v.fill.intensity = 0.18;
    blinds = h('div', 'full');
    css(blinds, { background: 'repeating-linear-gradient(104deg, rgba(0,0,0,0) 0 70px, rgba(70,35,10,0.16) 70px 128px)', mixBlendMode: 'multiply', WebkitMaskImage: 'radial-gradient(70% 90% at 70% 35%, #000 30%, transparent 75%)', maskImage: 'radial-gradient(70% 90% at 70% 35%, #000 30%, transparent 75%)' });
    const sunGlow = h('div', 'full');
    css(sunGlow, { background: 'radial-gradient(60% 70% at 78% 18%, rgba(255,190,120,0.28), rgba(255,150,80,0) 60%)', mixBlendMode: 'screen' });
    const md = h('div', 'full');
    const rnd = seeded(7);
    for (let i = 0; i < 46; i++) {
      const d = h('div');
      const s = 2 + rnd() * 4;
      css(d, { position: 'absolute', width: s + 'px', height: s + 'px', borderRadius: '50%', background: 'rgba(255,236,200,0.85)', filter: `blur(${rnd() * 1.6}px)` });
      md.appendChild(d);
      motes.push({ d, x: 700 + rnd() * 1200, y: rnd() * 900, vx: -6 - rnd() * 10, vy: -4 + rnd() * 8, ph: rnd() * 6 });
    }
    el.append(blinds, sunGlow, md, h('div', 'vignette'));
  }
  const shade = h('div', 'shade-b');
  const t = title('Empieza el día.', { size: 120, top: 820, cls: 'white' });
  el.append(shade, t, h('div', 'grain'));
  return { wrap, v, rd, blinds, motes, t };
}, (lt, s) => {
  const c = s.ctx;
  const p = prog(lt, 0, 4.4, E.lin);
  if (c.wrap) c.wrap.style.transform = `scale(${lerp(1.04, 1.13, p)}) translate(${lerp(0, -18, p)}px, ${lerp(0, -8, p)}px)`;
  if (c.v) {
    look(c.v, mix3([90, -20, 470], [30, -6, 360], E.sine(p)), [6, 4, -20], 30);
    c.v.key.position.set(520 - p * 60, 300 + p * 20, 260);
    c.v.render();
    c.blinds.style.transform = `translateX(${lt * 18}px)`;
    c.motes.forEach(m => { m.d.style.transform = `translate(${m.x + m.vx * lt}px, ${m.y + m.vy * lt + Math.sin(lt * 1.3 + m.ph) * 6}px)`; m.d.style.opacity = 0.35 + 0.35 * Math.sin(lt * 2 + m.ph); });
  }
  reveal(c.t, lt, 1.0, { out: 3.7 });
}, { fi: 0.6, fo: 0.4 });

scene(7.3, 10.2, el => {
  const names = h('div', 'full');
  const list = ['Andrade Mateo', 'Bravo Joaquín', 'Castro Emilio', 'Cedeño Valentina', 'Macías Sofía', 'Mora Santiago', 'Torres Camila', 'Vera Isabella', 'Zambrano Thiago', 'Alvarado Lucía', 'Benítez Martín', 'Carrillo Ana', 'Delgado Pablo', 'Espinoza Emma', 'Franco Diego', 'García Sara', 'Herrera Nico', 'Ibarra Luna'];
  names.innerHTML = [0, 1, 2].map(c => `<div style="position:absolute;left:${180 + c * 560}px;top:0;font:500 40px 'Inter Display';color:#f0f0f4;line-height:76px" class="col">${list.concat(list).map(n => `<div>${n}</div>`).join('')}</div>`).join('');
  const mask = h('div', 'full');
  mask.style.background = 'radial-gradient(42% 34% at 50% 50%, #fff 55%, rgba(255,255,255,0) 100%)';
  names.appendChild(mask);
  const t = title('Pasar lista', { size: 150, top: 380, cls: 'ink' });
  const t2 = title('toma minutos.', { size: 150, top: 545, cls: 'gray' });
  el.append(names, t, t2);
  return { names, t, t2 };
}, (lt, s) => {
  s.ctx.names.querySelectorAll('.col').forEach((c, i) => { c.style.transform = `translateY(${-lt * (120 + i * 40) - i * 200}px)`; });
  reveal(s.ctx.t, lt, 0.2);
  reveal(s.ctx.t2, lt, 0.75);
}, { bg: '#fff', fi: 0.25, fo: 0.25 });

scene(10.1, 12.5, el => {
  const t = title('Ahora,', { size: 150, top: 360, cls: 'white' });
  const t2 = title('un *segundo.*', { size: 220, top: 520, cls: 'white' });
  el.append(t, t2);
  return { t, t2 };
}, (lt, s) => {
  reveal(s.ctx.t, lt, 0.15);
  reveal(s.ctx.t2, lt, 0.7, { stagger: 0.18, dur: 0.9, blur: 24 });
  const z = prog(lt, 0.7, 2.4, E.lin);
  s.ctx.t2.style.transform = `scale(${lerp(1, 1.05, z)})`;
}, { bg: '#000', fi: 0.15, fo: 0.12 });


const T_TAP = 15.2;
scene(12.45, 17.7, el => {
  el.style.background = '#e9dccb';
  const v = view3d(el, { env: 0.55 });
  wall(v, '#efe4d6');
  v.key.color.set('#fff1e0'); v.key.intensity = 2.0; v.key.position.set(360, 280, 380);
  v.fill.intensity = 0.35;
  const rd = G3.buildReader();
  rd.setOled('idle', OLED_IDLE);
  v.scene.add(rd.group);
  const key = G3.buildKey('icono');
  v.scene.add(key.group);
  const flash = h('div', 'flash');
  el.append(flash);
  let photo = null;
  if (PH.tap) { photo = h('div', 'photo'); photo.style.backgroundImage = 'url(assets/tap.png)'; el.append(photo); }
  const t = title('Toca. *Listo.*', { size: 130, top: 470, cls: 'ink', hl: 'grad' });
  css(t, { textAlign: 'left', left: '170px', right: 'auto' });
  el.append(h('div', 'vignette'), t, h('div', 'grain'));
  return { v, rd, key, flash, photo, t };
}, (lt, s) => {
  const t = lt + 12.45;
  const c = s.ctx;
  const enter = prog(t, T_TAP - 1.25, T_TAP, E.io);
  const bump = t > T_TAP ? Math.sin(clamp((t - T_TAP) / 0.22) * Math.PI) * 2.2 : 0;
  const away = prog(t, T_TAP + 0.9, T_TAP + 1.8, E.io);
  const kx = lerp(170, -2, enter) + away * 40;
  const ky = lerp(-130, -8, enter) - away * 40;
  const kz = lerp(110, 1.2, enter) + bump + away * 70;
  c.key.group.position.set(kx, ky, kz);
  c.key.group.rotation.set(lerp(0.5, 0, enter) + away * 0.4, lerp(-0.7, 0, enter) - away * 0.3, lerp(-1.9, -2.8, enter));
  c.key.ring.rotation.x = Math.sin(t * 7) * 0.35 * (1 - enter * 0.7);
  const on = t >= T_TAP + 0.04;
  c.rd.setOled(on ? 'hello' : 'idle', on ? OLED_HELLO : OLED_IDLE);
  c.rd.setLed(on);
  const zoom = prog(t, T_TAP + 0.1, T_TAP + 1.6, E.io);
  const pre = prog(t, 12.45, T_TAP, E.lin);
  look(c.v, mix3(mix3([30, -40, 420], [8, -18, 330], pre), [-62, 0, 300], zoom), mix3([0, -12, 0], [-62, 2, 0], zoom), 30);
  c.v.render();
  const f = t >= T_TAP ? Math.exp(-(t - T_TAP) * 3.2) : 0;
  c.flash.style.opacity = f;
  if (c.photo) {
    const pp = prog(t, 12.45, 14.6, E.lin);
    c.photo.style.transform = `scale(${lerp(1.04, 1.12, pp)})`;
    c.photo.style.opacity = 1 - prog(t, 14.1, 14.6, E.io);
  }
  reveal(c.t, lt, T_TAP + 0.35 - 12.45, { stagger: 0.22 });
}, { bg: '#e9dccb', fi: 0.12, fo: 0.35 });

scene(17.6, 21.4, el => {
  const glow = h('div', 'full');
  glow.style.background = 'radial-gradient(45% 55% at 50% 62%, rgba(10,124,255,0.30), rgba(0,0,0,0) 70%)';
  el.append(glow);
  const v = view3d(el, { env: 0.75 });
  v.key.position.set(-260, 320, 420); v.key.intensity = 1.8;
  const rim = new V3.DirectionalLight('#5aa8ff', 2.4); rim.position.set(300, 120, -400); v.scene.add(rim);
  const rd = G3.buildReader();
  rd.setOled('hello', OLED_HELLO);
  rd.setLed(true);
  v.scene.add(rd.group);
  const t = title('N.A.V.I', { size: 170, top: 70, cls: 'white', weight: 700 });
  const sb = sub('Asistencia con NFC.', { top: 265, size: 46, cls: 'gray' });
  el.append(t, sb);
  return { v, rd, t, sb };
}, (lt, s) => {
  const c = s.ctx;
  const p = prog(lt, 0, 3.8, E.sine);
  c.rd.group.rotation.y = Math.PI + lerp(-0.55, 0.42, p);
  c.rd.group.rotation.x = lerp(0.12, 0.05, p);
  c.rd.group.position.y = lerp(-60, -42, prog(lt, 0, 1.2, E.out5));
  look(c.v, [0, 20, 470], [0, -30, -40], 30);
  c.v.render();
  reveal(c.t, lt, 0.25, { stagger: 0, dur: 1.0, blur: 18 });
  fadeIn(c.sb, lt, 0.8, 0.8, 18);
}, { bg: '#000', fi: 0.3, fo: 0.35 });

scene(21.3, 25.6, el => {
  const lp = laptop('desk_inicio');
  css(lp, { left: '300px', top: '330px' });
  const hl = h('div', 'hl');
  css(hl, { left: `${20 + 272}px`, top: `${22 + 624}px`, width: '512px', height: '40px' });
  lp.querySelector('.lid').appendChild(hl);
  const t = title('El docente lo ve *al instante.*', { size: 96, top: 110, cls: 'ink' });
  el.append(lp, t);
  return { lp, hl, t };
}, (lt, s) => {
  const p = prog(lt, 0, 4.3, E.lin);
  const e = prog(lt, 0, 1.1, E.out5);
  s.ctx.lp.style.transform = `translateY(${lerp(120, 0, e)}px) scale(${lerp(0.94, 1.0, p)})`;
  const pl = lt > 1.4 ? 0.5 + 0.5 * Math.sin((lt - 1.4) * 5) : 0;
  s.ctx.hl.style.opacity = prog(lt, 1.3, 1.6) * (0.55 + 0.45 * pl);
  reveal(s.ctx.t, lt, 0.3);
}, { bg: '#f5f5f7', fi: 0.3, fo: 0.35 });

scene(25.5, 30.2, el => {
  let bg;
  if (PH.mother) { bg = h('div', 'photo'); bg.style.backgroundImage = 'url(assets/mother.png)'; }
  else {
    bg = h('div', 'full');
    bg.innerHTML = `<div class="full" style="background:linear-gradient(120deg,#fbe3c8 0%,#f3c9a1 40%,#d9a27b 100%)"></div>${[[160, 140, 340, '#fff7ea'], [620, 600, 260, '#ffe2bd'], [980, 80, 220, '#fff'], [380, 820, 300, '#f7cfa0'], [1250, 700, 200, '#fff1dc']].map(([x, y, r, c]) => `<div class="bokeh" style="left:${x}px;top:${y}px;width:${r}px;height:${r}px;background:${c};opacity:0.7"></div>`).join('')}`;
  }
  const dim = h('div', 'full');
  dim.style.background = 'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.35) 100%)';
  const ph = lockPhone();
  css(ph, { left: '1300px', top: '120px' });
  const t = title('Y su familia,', { size: 110, top: 400, cls: 'white' });
  const t2 = title('*también.*', { size: 110, top: 520, cls: 'white', hl: 'grad-warm' });
  css(t, { textAlign: 'left', left: '140px', right: 'auto' });
  css(t2, { textAlign: 'left', left: '140px', right: 'auto' });
  el.append(bg, dim, ph, t, t2, h('div', 'grain'));
  return { bg, ph, t, t2 };
}, (lt, s) => {
  const p = prog(lt, 0, 4.7, E.lin);
  s.ctx.bg.style.transform = `scale(${lerp(1.05, 1.12, p)})`;
  const up = prog(lt, 0.3, 1.3, E.out5);
  s.ctx.ph.style.transform = `translateY(${lerp(700, 0, up)}px) rotate(${lerp(6, 0, up)}deg)`;
  const n = prog(lt, 1.5, 2.1, E.back);
  s.ctx.ph.note.style.transform = `translateY(${lerp(-90, 0, n)}px) scale(${lerp(0.9, 1, n)})`;
  s.ctx.ph.note.style.opacity = prog(lt, 1.5, 1.8);
  reveal(s.ctx.t, lt, 2.0);
  reveal(s.ctx.t2, lt, 2.35);
}, { bg: '#222', fi: 0.35, fo: 0.35 });

scene(30.1, 33.0, el => {
  const t = title('¿Faltó?', { size: 150, top: 330, cls: 'gray' });
  const t2 = title('Lo saben *hoy.*', { size: 190, top: 500, cls: 'white', hl: 'grad-warm' });
  el.append(t, t2);
  return { t, t2 };
}, (lt, s) => {
  reveal(s.ctx.t, lt, 0.15);
  reveal(s.ctx.t2, lt, 0.75, { stagger: 0.14 });
}, { bg: '#000', fi: 0.2, fo: 0.25 });

scene(32.9, 37.4, el => {
  const g = h('div', 'mgrid');
  const items = [];
  for (let i = 0; i < 40; i++) {
    const d = h('div');
    d.innerHTML = NaviBots.svg(NaviMascots.key(i), i % 7 === 0 ? 'wink' : 'happy');
    g.appendChild(d);
    items.push(d);
  }
  const t = title('40 mascotas.', { size: 120, top: 110, cls: 'ink' });
  const sb = sub('Una distinta para cada estudiante.', { top: 255, size: 46, cls: 'gray' });
  el.append(g, t, sb);
  return { items, t, sb };
}, (lt, s) => {
  const order = s.ctx.order || (s.ctx.order = s.ctx.items.map((_, i) => ((i * 17) % 40)));
  s.ctx.items.forEach((d, i) => {
    const t0 = 0.35 + order[i] * 0.028;
    const p = prog(lt, t0, t0 + 0.55, E.back);
    d.style.opacity = prog(lt, t0, t0 + 0.2);
    d.style.transform = `scale(${lerp(0.2, 1, p)}) translateY(${Math.sin(lt * 3 + i) * 4}px)`;
  });
  reveal(s.ctx.t, lt, 0.2);
  fadeIn(s.ctx.sb, lt, 0.9, 0.7, 16);
}, { bg: '#fff', fi: 0.25, fo: 0.35 });

scene(37.3, 41.8, el => {
  const glow = h('div', 'full');
  glow.style.background = 'radial-gradient(50% 60% at 70% 55%, rgba(52,199,89,0.22), rgba(255,255,255,0) 70%)';
  const ph = phone(['ph_egg', 'ph_born']);
  css(ph, { left: '1160px', top: '100px' });
  const t = title('Nace con tu', { size: 110, top: 410, cls: 'ink' });
  const t2 = title('*primer toque.*', { size: 110, top: 530, cls: 'ink' });
  css(t, { textAlign: 'left', left: '160px', right: 'auto' });
  css(t2, { textAlign: 'left', left: '160px', right: 'auto' });
  el.append(glow, ph, t, t2);
  return { ph, t, t2 };
}, (lt, s) => {
  const up = prog(lt, 0, 1.0, E.out5);
  s.ctx.ph.style.transform = `translateY(${lerp(200, 0, up)}px)`;
  const sw = prog(lt, 1.9, 2.3, E.io);
  s.ctx.ph.layers[0].style.opacity = 1 - sw;
  s.ctx.ph.layers[1].style.opacity = sw;
  const wob = lt > 0.9 && lt < 1.9 ? Math.sin((lt - 0.9) * 26) * (1 - (lt - 0.9)) * 2.2 : 0;
  s.ctx.ph.layers[0].querySelector('img').style.transform = `rotate(${wob * 0.3}deg)`;
  s.ctx.ph.layers[1].querySelector('img').style.transform = `scale(${lerp(0.96, 1, prog(lt, 1.9, 2.5, E.back))})`;
  reveal(s.ctx.t, lt, 0.4);
  reveal(s.ctx.t2, lt, 0.75);
}, { bg: '#f5f5f7', fi: 0.3, fo: 0.3 });

scene(41.7, 46.6, el => {
  const ph = phone(['ph_portal', 'ph_sick']);
  css(ph, { left: '1160px', top: '100px' });
  const a1 = title('Crece si', { size: 110, top: 410, cls: 'ink' });
  const a2 = title('*llegas a tiempo.*', { size: 110, top: 530, cls: 'ink' });
  const b1 = title('Y te extraña', { size: 110, top: 410, cls: 'ink' });
  const b2 = title('*si faltas.*', { size: 110, top: 530, cls: 'ink', hl: 'grad-warm' });
  [a1, a2, b1, b2].forEach(x => css(x, { textAlign: 'left', left: '160px', right: 'auto' }));
  el.append(ph, a1, a2, b1, b2);
  return { ph, a1, a2, b1, b2 };
}, (lt, s) => {
  const sw = prog(lt, 2.4, 2.8, E.io);
  s.ctx.ph.layers[0].style.opacity = 1 - sw;
  s.ctx.ph.layers[1].style.opacity = sw;
  s.ctx.ph.style.transform = `translateY(${lerp(0, -10, prog(lt, 0, 4.9, E.lin))}px)`;
  reveal(s.ctx.a1, lt, 0.2, { out: 2.2 });
  reveal(s.ctx.a2, lt, 0.5, { out: 2.2 });
  reveal(s.ctx.b1, lt, 2.6);
  reveal(s.ctx.b2, lt, 2.95);
}, { bg: '#f5f5f7', fi: 0.25, fo: 0.35 });


scene(46.5, 49.6, el => {
  const glow = h('div', 'full');
  glow.style.background = 'radial-gradient(40% 50% at 50% 45%, rgba(10,124,255,0.22), rgba(0,0,0,0) 70%)';
  el.append(glow);
  const v = view3d(el, { env: 0.6 });
  v.key.position.set(-200, 300, 400); v.key.intensity = 1.5;
  const rim = new V3.DirectionalLight('#8fc2ff', 1.6); rim.position.set(260, 200, -300); v.scene.add(rim);
  const key = G3.buildKey('icono');
  const tag = tagMesh();
  tag.position.set(0, 0, 1.6);
  key.group.add(tag);
  key.ring.visible = false;
  v.scene.add(key.group);
  const lb = h('div', 'lockbadge', '<svg width="62" height="62" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.6"/></svg>');
  css(lb, { left: '1210px', top: '230px' });
  const t = title('Cada llavero, *firmado.*', { size: 110, top: 690, cls: 'white', hl: 'grad' });
  const sb = sub('Una copia no pasa desapercibida.', { top: 835, size: 44, cls: 'gray' });
  el.append(lb, t, sb);
  return { v, key, tag, lb, t, sb };
}, (lt, s) => {
  const c = s.ctx;
  const e = prog(lt, 0.2, 1.3, E.io);
  c.key.explode(e * 1.1);
  c.tag.position.z = 1.6 + e * 7.5;
  c.key.group.rotation.set(-0.95, 0, lerp(-0.5, 0.25, prog(lt, 0, 3.1, E.sine)));
  look(c.v, [0, -40, 165], [0, -8, 4], 30);
  c.v.render();
  const b = prog(lt, 1.0, 1.5, E.back);
  c.lb.style.transform = `scale(${lerp(0, 1, b)})`;
  c.lb.style.opacity = prog(lt, 1.0, 1.2);
  reveal(c.t, lt, 0.9);
  fadeIn(c.sb, lt, 1.5, 0.7, 16);
}, { bg: '#000', fi: 0.3, fo: 0.3 });

scene(49.5, 54.2, el => {
  const ph = phone(['ph_ficha']);
  css(ph, { left: '1180px', top: '100px' });
  const t = title('En una emergencia,', { size: 96, top: 400, cls: 'white' });
  const t2 = title('puede *salvar una vida.*', { size: 96, top: 510, cls: 'white', hl: 'bw' });
  [t, t2].forEach(x => css(x, { textAlign: 'left', left: '150px', right: 'auto' }));
  el.append(ph, t, t2);
  return { ph, t, t2 };
}, (lt, s) => {
  const up = prog(lt, 0, 1.0, E.out5);
  s.ctx.ph.style.transform = `translateY(${lerp(220, 0, up)}px) rotate(${lerp(-4, 0, up)}deg)`;
  reveal(s.ctx.t, lt, 0.5);
  reveal(s.ctx.t2, lt, 1.2, { stagger: 0.12 });
}, { bg: 'radial-gradient(90% 90% at 75% 45%, #ff5a4e 0%, #e0261b 55%, #9c1209 100%)', fi: 0.3, fo: 0.35 });

scene(54.1, 57.6, el => {
  const lp = laptop('desk_risk');
  css(lp, { left: '300px', top: '360px' });
  const t = title('Nadie se queda *atrás.*', { size: 110, top: 100, cls: 'ink' });
  const sb = sub('Alerta temprana para el docente y el DECE.', { top: 245, size: 42, cls: 'gray' });
  el.append(lp, t, sb);
  return { lp, t, sb };
}, (lt, s) => {
  const e = prog(lt, 0, 1.0, E.out5);
  s.ctx.lp.style.transform = `translateY(${lerp(140, 0, e)}px) scale(${lerp(0.94, 1, prog(lt, 0, 3.5, E.lin))})`;
  reveal(s.ctx.t, lt, 0.3);
  fadeIn(s.ctx.sb, lt, 0.9, 0.7, 16);
}, { bg: '#f5f5f7', fi: 0.3, fo: 0.25 });

[['Sin papel.', '#fff', 'ink'], ['Sin huellas.', '#000', 'white'], ['Sin filas.', '#0a7cff', 'white']].forEach(([w, bg, cls], i) => {
  scene(57.5 + i * 1.0, 58.55 + i * 1.0, el => {
    const t = title(w, { size: 200, top: 420, cls });
    el.append(t);
    return { t };
  }, (lt, s) => {
    const p = prog(lt, 0, 0.5, E.out5);
    s.ctx.t.style.opacity = p;
    s.ctx.t.style.transform = `scale(${lerp(1.12, 1, p)})`;
    s.ctx.t.style.filter = `blur(${(1 - p) * 10}px)`;
  }, { bg, fi: 0.04, fo: 0.04 });
});

scene(60.5, 66.0, el => {
  const ic = h('div', 'full');
  ic.innerHTML = `<div style="position:absolute;left:50%;top:250px;width:220px;height:220px;margin-left:-110px">${ICON}</div>`;
  const t = title('N.A.V.I', { size: 170, top: 510, cls: 'ink' });
  const sb = sub('Asistencia que cuida.', { top: 720, size: 54, cls: 'gray' });
  const ft = h('div', 'foot', 'Innovación Tecnológica · 2.ª Ateneo Robotics League');
  el.append(ic, t, sb, ft);
  return { ic: ic.firstChild, t, sb, ft };
}, (lt, s) => {
  const p = prog(lt, 0.1, 0.9, E.back);
  s.ctx.ic.style.transform = `scale(${lerp(0.4, 1, p)})`;
  s.ctx.ic.style.opacity = prog(lt, 0.1, 0.4);
  reveal(s.ctx.t, lt, 0.7, { stagger: 0, dur: 0.9 });
  fadeIn(s.ctx.sb, lt, 1.3, 0.8, 16);
  fadeIn(s.ctx.ft, lt, 2.0, 0.8, 10);
}, { bg: '#fff', fi: 0.05, fo: 0.8 });

const DURATION = 66.0;
function render(t) {
  for (const s of S) {
    const on = t >= s.start && t <= s.end;
    s.el.style.display = on ? 'block' : 'none';
    if (!on) continue;
    const a = s.fi > 0 ? clamp((t - s.start) / s.fi) : 1;
    const b = s.fo > 0 ? clamp((s.end - t) / s.fo) : 1;
    s.el.style.opacity = Math.min(a, b);
    s.update(t - s.start, s);
  }
}
window.render = render;
window.DURATION = DURATION;
window.ready = Promise.all(Array.from(document.images).concat(Object.keys(PH).filter(k => PH[k]).map(k => { const i = new Image(); i.src = `assets/${k}.png`; return i; })).map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => document.fonts.ready);
render(0);
