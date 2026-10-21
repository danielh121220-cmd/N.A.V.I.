(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const root = $('#root');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    list: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="m3.5 6 1.3 1.3L7.3 4.8M3.5 12l1.3 1.3 2.5-2.5M3.5 18l1.3 1.3 2.5-2.5"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.6 3.5 5.2"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    camera: '<path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><circle cx="12" cy="13" r="3.5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    alert: '<path d="M12 3.5 2.5 20h19L12 3.5Z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    send: '<path d="m4 12 16-8-6 16-2.5-6.5L4 12Z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    nfc: '<path d="M7 8.5a5 5 0 0 1 0 7M10.5 6a9 9 0 0 1 0 12M14 3.5a13 13 0 0 1 0 17"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/>',
    chat: '<path d="M4 18.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 3.5Z"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
    door: '<path d="M5 21V4a1 1 0 0 1 1-1h9l3 2v16"/><path d="M3 21h18M12 12v.01"/>',
    bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.2-6 8-6s7 2 8 6"/>',
    xcircle: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    medical: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    pill: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="m9.5 9.5 5 5"/>',
    wand: '<path d="m4 20 11-11M14 4l1.5 3L19 8.5 15.5 10 14 13l-1.5-3L9 8.5 12.5 7 14 4Z"/>'
  };
  const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const ico = (n, color) => `<span class="ico ${color}">${icon(n)}</span>`;

  const S = {
    token: store.get('navi_token'),
    user: null,
    courses: [],
    students: [],
    records: [],
    stats: null,
    channels: {},
    settings: {},
    demo: false,
    terminals: [],
    notifications: [],
    review: [],
    view: 'inicio',
    params: {},
    filter: 'ALL',
    rollEdits: new Map(),
    rollStart: 0,
    rollCourse: null,
    query: '',
    studentCourse: 0,
    fresh: new Set(),
    online: false,
    installPrompt: null,
    camOn: false,
    camCovered: false,
    camStream: null,
    listenUid: null,
    timers: []
  };

  const NAV = [
    { id: 'inicio', label: 'Inicio', icon: 'home', color: 'blue' },
    { id: 'lista', label: 'Pase de lista', short: 'Lista', icon: 'list', color: 'green' },
    { id: 'revision', label: 'Revisión', icon: 'shield', color: 'purple' },
    { id: 'alumnos', label: 'Estudiantes', short: 'Alumnos', icon: 'users', color: 'orange' },
    { id: 'terminal', label: 'Lector', icon: 'cpu', color: 'graphite' },
    { id: 'ajustes', label: 'Ajustes', icon: 'settings', color: 'gray' }
  ];

  const STATUS = {
    A_TIEMPO: { label: 'Puntual', cls: 'p-ok' },
    TARDE: { label: 'Atraso', cls: 'p-late' },
    AUSENTE: { label: 'Ausente', cls: 'p-abs' }
  };
  const SOURCE = { NFC: 'Tarjeta', MANUAL: 'Docente', AUTO: 'Automático', OFFLINE: 'Sin conexión' };
  const KIND = { ARRIVAL: 'Ingreso', LATE: 'Atraso', ABSENT: 'Ausencia', LATE_AFTER_ABSENT: 'Llegó tarde', NOT_IN_CLASS: 'No está en el aula', EMERGENCY: 'Ficha médica abierta', ABSENT_STREAK: '5 faltas seguidas', CUSTOM: 'Mensaje' };
  const NSTATUS = { ENVIADO: ['Enviado', 'p-ok'], MANUAL: ['Enviado', 'p-ok'], FALLIDO: ['Falló', 'p-abs'], SIMULADO: ['Sin enviar', 'p-none'], PENDIENTE: ['Esperando celular', 'p-late'], ENVIANDO: ['Enviando', 'p-info'], ENLACE: ['Por enviar', 'p-info'] };
  const CHANNEL = { EMAIL: ['Correo', 'mail', 'blue'], WHATSAPP: ['WhatsApp', 'chat', 'green'], TELEGRAM: ['Telegram', 'send', 'teal'], SMS: ['SMS', 'phone', 'indigo'] };
  const PALETTE = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#30B0C7', '#5856D6', '#FF3B30', '#A2845E', '#00C7BE'];

  const pad = n => String(n).padStart(2, '0');
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const hhmm = t => (t || '').slice(0, 5);
  const colorFor = id => PALETTE[Math.abs(Number(id) || 0) % PALETTE.length];
  const firstName = n => String(n || '').split(' ')[0];
  const isAdmin = () => S.user && S.user.role === 'ADMINISTRADOR';
  const canConfigure = () => isAdmin() || S.demo;
  const haptic = (p = 8) => {
    const ms = Array.isArray(p) ? Math.max(...p) : p;
    if (window.NaviAndroid && NaviAndroid.haptic) { try { NaviAndroid.haptic(ms); return; } catch (e) {} }
    if (navigator.vibrate) navigator.vibrate(p);
  };
  const bars = (() => {
    let last = '';
    return () => {
      if (!(window.NaviAndroid && NaviAndroid.setBars)) return;
      const dark = matchMedia('(prefers-color-scheme: dark)').matches;
      const color = getComputedStyle(document.body).backgroundColor;
      const m = color.match(/\d+(\.\d+)?/g);
      if (!m) return;
      const [r, g, b] = m.map(Number);
      const hex = '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
      const light = (r * 299 + g * 587 + b * 114) / 1000 > 140;
      const key = hex + light + dark;
      if (key === last) return;
      last = key;
      try { NaviAndroid.setBars(hex, light); } catch (e) {}
    };
  })();
  window.naviBack = () => {
    if (sheetState) { closeSheet(); return true; }
    return false;
  };
  const mobile = () => matchMedia('(max-width: 900px)').matches;

  function ago(iso) {
    const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
    if (s < 45) return 'ahora';
    if (s < 3600) return `hace ${Math.round(s / 60)} min`;
    if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
    return new Date(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
  }
  const sqlIso = s => (s && !s.includes('T') ? s.replace(' ', 'T') + 'Z' : s);
  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  }
  function eyebrowDate() {
    return new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  async function api(path, { method = 'GET', body } = {}) {
    const headers = {};
    if (S.token) headers.Authorization = 'Bearer ' + S.token;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetch('/api' + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch (e) {
      const err = new Error('No hay conexión con el servidor');
      err.code = 'OFFLINE';
      throw err;
    }
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      const err = new Error((data && data.error) || `Error ${res.status}`);
      err.status = res.status;
      err.code = data && data.code;
      err.fields = (data && data.fields) || [];
      err.data = data;
      if (res.status === 401 && S.user && !path.startsWith('/auth/login')) logout(true);
      throw err;
    }
    return data;
  }

  const faceUrl = (id, v) => `/api/faces/${id}?t=${encodeURIComponent(S.token)}&v=${encodeURIComponent(v)}`;
  const snapUrl = id => `/api/snapshots/${id}?t=${encodeURIComponent(S.token)}`;

  function avatar(p, cls = '') {
    const id = p.student_id != null ? p.student_id : p.id;
    if (p.face_photo) return `<div class="av ${cls}"><img loading="lazy" decoding="async" src="${faceUrl(id, p.face_photo)}" alt=""></div>`;
    if (p.mascot != null && showMascots() && window.NaviMascots) return `<div class="av av-m ${p.mascot_dead_on ? 'gone' : ''} ${cls}">${NaviBots.svg(NaviMascots.key(p.mascot), p.mascot_dead_on ? 'sleepy' : 'neutral')}</div>`;
    const ini = `${(p.first_name || '?')[0] || ''}${(p.last_name || '')[0] || ''}`.toUpperCase();
    const c = colorFor(id);
    return `<div class="av ${cls}" style="background:linear-gradient(160deg, ${c}CC, ${c})">${esc(ini)}</div>`;
  }

  function statusPill(r) {
    if (!r) return '<span class="pill p-none">Sin marcar</span>';
    const s = STATUS[r.status] || { label: r.status, cls: 'p-none' };
    return `<span class="pill ${s.cls}">${s.label}</span>`;
  }
  const reviewPill = r => (r && r.review_state === 'PENDIENTE' ? '<span class="pill p-rev">Revisar</span>' : '');

  function segHtml(items, current, act, extra = '') {
    return `<div class="seg" ${extra}><span class="thumb"></span>${items.map(([k, l, n]) => `<button type="button" class="${k === current ? 'on' : ''}" data-act="${act}" data-k="${esc(k)}">${l}${n != null ? `<span class="n">${n}</span>` : ''}</button>`).join('')}</div>`;
  }
  function syncSegs(scope = document, instant = false) {
    for (const seg of $$('.seg', scope)) {
      const on = seg.querySelector('button.on');
      const thumb = seg.querySelector('.thumb');
      if (!thumb) continue;
      if (!on) { thumb.style.opacity = '0'; continue; }
      if (instant) thumb.style.transition = 'none';
      thumb.style.opacity = '1';
      thumb.style.width = on.offsetWidth + 'px';
      thumb.style.transform = `translateX(${on.offsetLeft}px)`;
      if (instant) { void thumb.offsetWidth; thumb.style.transition = ''; }
    }
  }
  function segSelect(btn) {
    const seg = btn.closest('.seg');
    $$('button', seg).forEach(b => b.classList.toggle('on', b === btn));
    syncSegs(seg.parentElement);
  }
  addEventListener('resize', () => syncSegs(document, true), { passive: true });

  const islandQueue = [];
  let islandEl = null;
  let islandTimer = 0;
  function toast(t) {
    islandQueue.push(t);
    if (islandQueue.length > 3) islandQueue.splice(0, islandQueue.length - 3);
    if (!islandEl) nextIsland();
  }
  function nextIsland() {
    const t = islandQueue.shift();
    if (!t) { islandEl = null; return; }
    const { title, text = '', mood = 'neutral', bot, action, ms = 3400 } = t;
    const reuse = islandEl && islandEl.isConnected && !islandEl.classList.contains('out');
    const el = reuse ? islandEl : document.createElement('div');
    el.className = 'island';
    if (reuse) { void el.offsetWidth; el.classList.add('bump'); }
    el.innerHTML = `<div class="tb">${NaviBots.svg(bot || (S.user && S.user.avatar) || store.get('navi_bot') || 'triangle', mood)}</div><div class="tx"><b>${esc(title)}</b>${text ? `<small>${esc(text)}</small>` : ''}</div>`;
    if (action) {
      const a = document.createElement(action.href ? 'a' : 'button');
      a.className = 'act';
      a.textContent = action.label;
      if (action.href) { a.href = action.href; a.target = '_blank'; a.rel = 'noopener'; }
      a.addEventListener('click', e => { e.stopPropagation(); if (action.fn) action.fn(); hideIsland(true); });
      el.appendChild(a);
    }
    el.onclick = () => hideIsland();
    if (!reuse) document.body.appendChild(el);
    SFX.play(t.sound || 'notify');
    islandEl = el;
    clearTimeout(islandTimer);
    islandTimer = setTimeout(() => hideIsland(), islandQueue.length ? Math.min(ms, 1800) : ms);
  }
  function hideIsland(all) {
    clearTimeout(islandTimer);
    if (!islandEl) return;
    if (all) islandQueue.length = 0;
    if (islandQueue.length) return nextIsland();
    const el = islandEl;
    el.classList.remove('bump');
    el.classList.add('out');
    islandEl = null;
    setTimeout(() => el.remove(), 340);
  }

  let sheetState = null;
  function openSheet({ title, body, foot = '', left = '', right = '', onMount, onClose, wide }) {
    closeSheet(true);
    const scrim = document.createElement('div');
    scrim.className = 'scrim';
    const el = document.createElement('div');
    el.className = 'sheet';
    if (wide) el.style.width = 'min(760px, calc(100vw - 32px))';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="grabber"></div><div class="sheet-head"><div class="l">${left}</div><h2>${esc(title)}</h2><div class="r">${right || `<button class="icon-btn round" data-close aria-label="Cerrar">${icon('x')}</button>`}</div></div><div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}`;
    document.body.append(scrim, el);
    SFX.play('open');
    requestAnimationFrame(() => {
      scrim.classList.add('show');
      el.classList.add('show');
      if (mobile()) document.body.classList.add('sheet-open');
    });
    scrim.addEventListener('click', () => closeSheet());
    $$('[data-close]', el).forEach(b => b.addEventListener('click', e => { e.preventDefault(); closeSheet(); }));
    sheetState = { el, scrim, onClose };
    enableDrag(el, scrim);
    if (onMount) onMount(el);
    syncSegs(el, true);
    return el;
  }
  function enableDrag(el, scrim) {
    const handle = $('.sheet-head', el);
    let startY = 0, dy = 0, t0 = 0, dragging = false;
    handle.addEventListener('pointerdown', e => {
      if (!mobile() || e.target.closest('button, a, input')) return;
      dragging = true;
      startY = e.clientY;
      t0 = performance.now();
      dy = 0;
      el.classList.add('dragging');
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', e => {
      if (!dragging) return;
      dy = Math.max(0, e.clientY - startY);
      el.style.transform = `translateY(${dy}px)`;
      scrim.style.opacity = String(Math.max(0, 1 - dy / 400));
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      const v = dy / Math.max(1, performance.now() - t0);
      el.style.transform = '';
      scrim.style.opacity = '';
      if (dy > 140 || (v > 0.6 && dy > 30)) closeSheet();
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }
  function closeSheet(instant) {
    if (!sheetState) return;
    const { el, scrim, onClose } = sheetState;
    sheetState = null;
    if (onClose) onClose();
    if (!instant) SFX.play('close');
    el.classList.remove('show');
    scrim.classList.remove('show');
    document.body.classList.remove('sheet-open');
    setTimeout(() => { el.remove(); scrim.remove(); }, instant ? 0 : 480);
  }
  addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

  const SFX = window.NaviSFX || { play() {}, bot() {}, sounds: false, voices: false, setSounds() {}, setVoices() {} };
  function sound(type) {
    SFX.play({ ok: 'scan', warn: 'warn', bad: 'error' }[type] || type);
  }
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('button, a, select, .tile, .chip, .tap, [data-act], [data-nav], .bot-pick');
    if (!el || el.disabled || el.closest('label.switch')) return;
    SFX.play(el.classList.contains('tab') || el.classList.contains('nav-item') || el.closest('.seg') ? 'soft' : 'tap');
  }, { capture: true, passive: true });
  document.addEventListener('change', e => {
    if (e.target.matches('.switch input')) SFX.play(e.target.checked ? 'on' : 'off');
  }, true);

  function setFieldError(form, names, focus = true) {
    $$('.frow', form).forEach(f => f.classList.remove('bad'));
    const groups = new Set();
    for (const n of names || []) {
      const input = form.querySelector(`[name="${n}"]`);
      if (!input) continue;
      const row = input.closest('.frow');
      row.classList.add('bad');
      const g = row.closest('.group');
      if (g) groups.add(g);
    }
    for (const g of groups) { g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake'); }
    const first = focus && names && names[0] && form.querySelector(`[name="${names[0]}"]`);
    if (first) first.focus({ preventScroll: false });
  }
  const frow = (name, label, { type = 'text', value = '', placeholder = '', attrs = '', addon = '' } = {}) =>
    `<label class="frow"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${attrs}>${addon}</label>`;

  const BOT_LINES = {
    pebble: '¡Hola! Soy Pebble. Tranquilo, yo te acompaño.',
    triangle: '¡Hola! Soy Delta. ¿Entramos?',
    cloud: '¡Hola! Soy Nimbo. ¡Qué buen día para pasar lista!',
    circle: 'Hola. Soy Kuro. Seré tu guardián.',
    capsule: '¡Hola! Soy Bean. Listo para ayudarte.',
    clover: '¡Hola! Soy Bloom. Bienvenido a N.A.V.I.'
  };

  function showAuth(mode = 'login') {
    setTimeout(bars, 60);
    stopTimers();
    const saved = store.get('navi_bot') || 'triangle';
    root.innerHTML = `
      <div class="auth">
        <div class="auth-card">
          <div class="role-switch" id="roleSw"><button type="button" data-role="teacher">${icon('person')} Docente</button><button type="button" data-role="student">${icon('users')} Estudiante</button></div>
          <div class="auth-bot" id="authBot" title="Tócame"></div>
          <h1>N.A.V.I</h1>
          <p class="lead" id="authLead">Asistencia escolar con NFC</p>
          <div class="demo-tag hidden" id="demoTag">${icon('bolt')} Modo demostración</div>
          <div id="teacherPane">
          <div class="bubble" id="bubble">${esc(BOT_LINES[saved])}</div>
          <div class="bot-picker" id="picker">${NaviBots.KEYS.map(k => `<button type="button" class="bot-pick ${k === saved ? 'on' : ''}" data-bot="${k}" aria-label="${NaviBots.CHARACTERS[k].name}">${NaviBots.svg(k)}</button>`).join('')}</div>
          ${segHtml([['login', 'Iniciar sesión'], ['register', 'Crear cuenta']], mode, 'authMode', 'id="authSeg" style="margin-bottom:14px"')}
          <form id="authForm" novalidate autocomplete="on">
            <div class="group">
              <div class="reg-only">
                ${frow('name', 'Nombre', { placeholder: 'Tu nombre', attrs: 'autocomplete="name" maxlength="80"' })}
                ${frow('institution_name', 'Colegio', { placeholder: 'Colegio (opcional)', attrs: 'autocomplete="organization" maxlength="100"' })}
              </div>
              ${frow('email', 'Correo', { type: 'email', placeholder: 'Correo', attrs: 'autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false"' })}
              <label class="frow"><span>Contraseña</span><input name="password" type="password" placeholder="Contraseña" autocomplete="current-password"><button type="button" class="icon-btn" id="peek" aria-label="Mostrar contraseña">${icon('eye')}</button></label>
            </div>
            <p class="group-foot reg-only">Mínimo 6 caracteres. La primera cuenta creada será la administradora.</p>
            <button class="btn btn-primary btn-lg btn-block" id="authSubmit" style="margin-top:16px">Entrar</button>
          </form>
          <button type="button" class="btn btn-plain btn-block hidden" id="demoBtn" style="margin-top:6px">Entrar a la cuenta de demostración</button>
          <p class="foot" id="authFoot">Tus datos se quedan en el servidor de tu colegio.</p>
          </div>
          <div id="studentPane" class="hidden">
            <div class="kid-trio">${[3, 0, 5].map((i, n) => `<span style="--d:${n * 90}ms">${NaviBots.svg(mascotKey(i), 'happy')}</span>`).join('')}</div>
            <div class="kid-intro"><b>Cuenta de estudiante</b><small>Tu asistencia, tu mascota y tu ficha médica. Es distinta a la cuenta del docente y no necesita correo ni contraseña.</small></div>
            <button type="button" class="btn btn-primary btn-lg btn-block" id="kidReader">${icon('nfc')} Usar el lector del aula</button>
            ${NFC.available() ? `<button type="button" class="btn btn-tinted btn-lg btn-block" id="kidPhone" style="margin-top:10px">${icon('phone')} Acercar la tarjeta a este celular</button>` : '<p class="foot" style="margin-top:12px">Si tu celular no tiene NFC, usa el lector del aula: funciona con cualquier celular.</p>'}
            <div id="kidDemo"></div>
          </div>
        </div>
      </div>`;

    const bot = NaviBots.mount($('#authBot'), { character: saved });
    const bubble = $('#bubble');
    const form = $('#authForm');
    const pw = form.password;
    let current = mode;
    let fails = 0;
    let idleTimer = 0;
    let sleeping = false;

    const say = (text, type = '') => {
      bubble.textContent = text;
      bubble.className = 'bubble ' + type;
      void bubble.offsetWidth;
      bubble.classList.add('pop');
    };

    const resetIdle = () => {
      clearTimeout(idleTimer);
      if (sleeping) {
        sleeping = false;
        bot.setBase('neutral');
        bot.mood('surprised', 700);
        say('¡Uy! Me quedé dormido. Aquí estoy.');
      }
      idleTimer = setTimeout(() => {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        sleeping = true;
        bot.setBase('sleepy');
        say('Zzz… toca cualquier cosa para despertarme');
      }, 25000);
    };
    addEventListener('pointerdown', resetIdle, { passive: true });
    addEventListener('keydown', resetIdle);
    S.timers.push(() => { clearTimeout(idleTimer); removeEventListener('pointerdown', resetIdle); removeEventListener('keydown', resetIdle); });
    resetIdle();

    function setMode(m) {
      current = m;
      $$('#authSeg button').forEach(b => b.classList.toggle('on', b.dataset.k === m));
      syncSegs(root);
      $$('.reg-only', form).forEach(el => el.classList.toggle('hidden', m !== 'register'));
      $('#authSubmit').textContent = m === 'register' ? 'Crear cuenta' : 'Entrar';
      pw.autocomplete = m === 'register' ? 'new-password' : 'current-password';
      $$('.frow', form).forEach(f => f.classList.remove('bad'));
      bubble.className = 'bubble';
    }
    setMode(mode);
    requestAnimationFrame(() => syncSegs(root, true));

    $('#authSeg').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.dataset.k === current) return;
      haptic();
      setMode(b.dataset.k);
      if (b.dataset.k === 'register') { bot.mood('happy', 900); say('¡Genial! Vamos a crear tu cuenta.'); }
      else { bot.mood('neutral'); say('Escribe tu correo y contraseña.'); }
    });

    $('#picker').addEventListener('click', e => {
      const b = e.target.closest('.bot-pick');
      if (!b) return;
      haptic();
      $$('.bot-pick').forEach(x => x.classList.toggle('on', x === b));
      store.set('navi_bot', b.dataset.bot);
      bot.setCharacter(b.dataset.bot);
      bot.mood('happy', 1000);
      say(BOT_LINES[b.dataset.bot]);
    });

    const typingLook = input => {
      const x = Math.min(1, input.value.length / 28) * 1.6 - 0.8;
      bot.look(x, 0.75);
    };
    for (const name of ['email', 'name', 'institution_name']) {
      const input = form[name];
      input.addEventListener('focus', () => {
        bot.setBase('neutral');
        typingLook(input);
        input.closest('.frow').classList.remove('bad');
        if (name === 'email') say(current === 'register' ? 'Usa un correo que revises seguido.' : '¿Cuál es tu correo?');
        if (name === 'name') say('¿Cómo te llamas?');
        if (name === 'institution_name') say('¿En qué colegio trabajas?');
        bubble.className = 'bubble';
      });
      input.addEventListener('input', () => typingLook(input));
      input.addEventListener('blur', () => bot.look(null));
    }

    pw.addEventListener('focus', () => {
      pw.closest('.frow').classList.remove('bad');
      bot.setBase(pw.type === 'text' ? 'peek' : 'shy');
      say(pw.type === 'text' ? 'Bueno… solo miro un poquito.' : 'Tranquilo, no estoy mirando.');
      bubble.className = 'bubble';
    });
    pw.addEventListener('blur', () => bot.setBase('neutral'));
    pw.addEventListener('input', () => {
      if (current !== 'register' || !pw.value.length) return;
      if (pw.value.length < 6) say(`Faltan ${6 - pw.value.length} caracteres más.`);
      else say('¡Buena contraseña!', 'ok');
    });
    $('#peek').addEventListener('pointerdown', e => e.preventDefault());
    $('#peek').addEventListener('click', e => {
      e.preventDefault();
      const show = pw.type === 'password';
      pw.type = show ? 'text' : 'password';
      $('#peek').innerHTML = icon(show ? 'eyeoff' : 'eye');
      if (document.activeElement === pw) {
        bot.setBase(show ? 'peek' : 'shy');
        say(show ? 'Bueno… solo miro un poquito.' : 'Ya no miro, lo prometo.');
      }
    });

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function react(err) {
      const msgs = {
        EMPTY: ['confused', err.message],
        BAD_EMAIL: ['confused', 'Mmm… ese correo no parece válido.'],
        SHORT_PASSWORD: ['worried', 'La contraseña necesita al menos 6 caracteres.'],
        NO_USER: ['confused', 'No encuentro esa cuenta. ¿La creamos?'],
        BAD_PASSWORD: ['angry', fails >= 3 ? '¡Otra vez no! Si la olvidaste, pide al administrador que te ayude.' : '¡Contraseña incorrecta!'],
        EMAIL_TAKEN: ['surprised', 'Ese correo ya tiene cuenta. Inicia sesión.'],
        LOCKED: ['angry', 'Demasiados intentos. Espera unos minutos.'],
        OFFLINE: ['sad', 'No puedo conectarme con el servidor. ¿Está encendido?']
      };
      const [mood, text] = msgs[err.code] || ['sad', err.message];
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      bot.setBase('neutral');
      bot.mood(mood, mood === 'angry' ? 2400 : 2800);
      say(text, 'error');
      setFieldError(form, err.fields, false);
      haptic(mood === 'angry' ? [20, 40, 20] : 15);
      if (err.code === 'NO_USER') {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-gray btn-sm';
        b.textContent = 'Crear cuenta';
        b.onclick = () => { const email = form.email.value; setMode('register'); form.email.value = email; form.name.focus(); bot.mood('happy', 900); say('¡Perfecto! Completa tus datos.'); };
        bubble.append(b);
      }
    }

    async function done(data, text) {
      store.set('navi_token', data.token);
      S.token = data.token;
      S.user = data.user;
      if (data.user.avatar) store.set('navi_bot', data.user.avatar);
      bot.setBase('happy');
      say(text, 'ok');
      haptic(10);
      await new Promise(r => setTimeout(r, 650));
      bot.destroy();
      transition(showApp);
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(form));
      const missing = [];
      if (current === 'register' && !v.name.trim()) missing.push('name');
      if (!v.email.trim()) missing.push('email');
      if (!v.password) missing.push('password');
      if (missing.length) {
        const names = { name: 'tu nombre', email: 'tu correo', password: 'tu contraseña' };
        return react({ code: 'EMPTY', message: missing.length > 1 ? 'Te faltan algunos datos, mira los marcados.' : `Te faltó ${names[missing[0]]}.`, fields: missing });
      }
      if (!EMAIL_RE.test(v.email.trim())) return react({ code: 'BAD_EMAIL', fields: ['email'] });
      if (current === 'register' && v.password.length < 6) return react({ code: 'SHORT_PASSWORD', fields: ['password'] });
      const btn = $('#authSubmit');
      const label = btn.textContent;
      btn.disabled = true;
      btn.innerHTML = '<span class="spin"></span>';
      bot.setBase('thinking');
      say(current === 'register' ? 'Creando tu cuenta…' : 'Revisando…');
      try {
        const data = current === 'register'
          ? await api('/auth/register', { method: 'POST', body: { name: v.name, institution_name: v.institution_name, email: v.email, password: v.password, avatar: bot.character } })
          : await api('/auth/login', { method: 'POST', body: { email: v.email, password: v.password } });
        await done(data, `¡Bienvenido, ${firstName(data.user.name)}!`);
      } catch (err) {
        if (err.code === 'BAD_PASSWORD') fails++;
        btn.disabled = false;
        btn.textContent = label;
        react(err);
      }
    });

    const teacherPane = $('#teacherPane');
    const studentPane = $('#studentPane');
    const setRole = (role, quiet) => {
      store.set('navi_role', role);
      $$('#roleSw button').forEach(b => b.classList.toggle('on', b.dataset.role === role));
      teacherPane.classList.toggle('hidden', role !== 'teacher');
      studentPane.classList.toggle('hidden', role !== 'student');
      $('#authBot').classList.toggle('hidden', role === 'student');
      $('#authLead').textContent = role === 'student' ? 'Entra con tu tarjeta NFC' : 'Asistencia escolar con NFC';
      if (!quiet) haptic(6);
      if (role === 'student' && S.demo && !studentPane.dataset.demo) {
        studentPane.dataset.demo = '1';
        api('/student/demo-list').then(list => {
          const d = $('#kidDemo');
          if (!d || !list.length) return;
          d.innerHTML = `<div class="group-title" style="margin-top:24px;padding:0 4px 8px">Versión de prueba · entra sin tarjeta</div><div class="demo-kids">${list.slice(0, 9).map(k => `<button type="button" data-id="${k.id}"><span class="mk">${NaviBots.svg(mascotKey(k.mascot), 'neutral')}</span><b>${esc(k.first_name)}</b><small>${esc(k.course_code)}</small></button>`).join('')}</div>`;
          d.addEventListener('click', async e => {
            const b = e.target.closest('[data-id]');
            if (!b) return;
            try { const r = await api('/student/demo-login', { method: 'POST', body: { student_id: Number(b.dataset.id) } }); store.set('navi_student', r.token); showStudent(); } catch (err) { toast({ title: 'No se pudo', text: err.message, mood: 'sad' }); }
          });
        }).catch(() => {});
      }
    };
    $('#roleSw').addEventListener('click', e => { const b = e.target.closest('[data-role]'); if (b) setRole(b.dataset.role); });
    setRole(store.get('navi_role') === 'student' ? 'student' : 'teacher', true);
    $('#kidReader').addEventListener('click', () => openCodeLogin());
    const kp = $('#kidPhone');
    if (kp) kp.addEventListener('click', () => openStudentLogin());
    api('/info').then(info => {
      S.demo = !!info.demo_mode;
      if (!$('#demoBtn')) return;
      $('#demoBtn').classList.toggle('hidden', !S.demo);
      $('#demoTag').classList.toggle('hidden', !S.demo);
      if (S.demo) {
        $('#authFoot').textContent = 'Todos los datos de esta versión son de ejemplo.';
        if (store.get('navi_role') === 'student') { delete studentPane.dataset.demo; setRole('student', true); }
      }
      if (info.setup && !S.demo) {
        setMode('register');
        $('#authSeg').classList.add('hidden');
        $('#authLead').textContent = 'Primer uso: crea la cuenta del administrador';
        say('¡Bienvenido! Esta será la cuenta principal del colegio.');
      }
    }).catch(() => {});
    $('#demoBtn').addEventListener('click', async () => {
      bot.setBase('thinking');
      say('Preparando la demo…');
      try {
        const data = await api('/auth/demo', { method: 'POST' });
        await done(data, '¡Listo! Esta es la cuenta de prueba.');
      } catch (err) {
        react(err);
      }
    });
  }

  function transition(fn) {
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(fn);
    else fn();
  }

  function stopTimers() {
    while (S.timers.length) { try { S.timers.pop()(); } catch (e) {} }
  }

  function logout(expired) {
    store.del('navi_token');
    S.token = null;
    S.user = null;
    if (S.ws) { S.ws.onclose = null; S.ws.close(); S.ws = null; }
    stopCam();
    closeSheet(true);
    if (viewCleanup) { viewCleanup(); viewCleanup = null; }
    showAuth('login');
    if (expired) toast({ title: 'Tu sesión expiró', text: 'Vuelve a iniciar sesión.', mood: 'sad' });
  }

  const roleName = r => (r === 'ADMINISTRADOR' ? 'Administrador' : r === 'INSPECTOR' ? 'Inspector' : 'Docente');

  function showApp() {
    stopTimers();
    root.innerHTML = `
      <div class="shell">
        <aside class="sidebar">
          <div class="brand"><div class="brand-bot">${NaviBots.svg('triangle', 'happy')}</div><div><b>N.A.V.I</b><small id="instName">${esc(S.user.institution_name || '')}</small></div></div>
          ${NAV.map(n => `<button class="nav-item" data-nav="${n.id}">${ico(n.icon, n.color)}<span>${n.label}</span>${n.id === 'revision' ? '<span class="count hidden" data-count></span>' : ''}</button>`).join('')}
          <button class="side-foot" data-nav="ajustes"><div class="me-bot" id="meSide"></div><div class="who"><b id="meName">${esc(S.user.name)}</b><small>${roleName(S.user.role)}</small></div><span class="conn" id="connSide" title="Conexión en tiempo real"></span></button>
        </aside>
        <header class="topbar" id="topbar"><div class="l"><span class="conn" id="connTop"></span></div><div class="title" id="topTitle">N.A.V.I</div><div class="r"><button class="icon-btn" data-nav="ajustes" aria-label="Ajustes"><div class="me-bot" id="meTop"></div></button></div></header>
        <div class="ptr" id="ptr">${icon('refresh')}</div>
        <main class="main" id="main"></main>
        <nav class="tabbar">${NAV.slice(0, 5).map(n => `<button class="tab" data-nav="${n.id}">${icon(n.icon)}<span>${n.short || n.label}</span>${n.id === 'revision' ? '<span class="count hidden" data-count></span>' : ''}</button>`).join('')}</nav>
      </div>`;
    paintMe();
    root.addEventListener('click', onNavClick);
    S.timers.push(() => root.removeEventListener('click', onNavClick));
    const main = $('#main');
    main.addEventListener('click', onAction);
    main.addEventListener('input', onInput);
    main.addEventListener('change', onChange);
    const onScroll = () => { const tb = $('#topbar'); if (tb) tb.classList.toggle('scrolled', scrollY > 30); };
    addEventListener('scroll', onScroll, { passive: true });
    S.timers.push(() => removeEventListener('scroll', onScroll));
    setupPullToRefresh();
    connectWS();
    S.view = '';
    route();
    loadAll();
    const iv = setInterval(() => { if (S.view === 'terminal') loadTerminals(); }, 15000);
    S.timers.push(() => clearInterval(iv));
  }

  function setupPullToRefresh() {
    const ptr = $('#ptr');
    let startY = null, dist = 0, busy = false;
    const onStart = e => {
      if (busy || scrollY > 0 || sheetState || !mobile() || e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      dist = 0;
    };
    const onMove = e => {
      if (startY == null) return;
      dist = Math.max(0, e.touches[0].clientY - startY);
      if (dist <= 0) return;
      ptr.style.opacity = String(Math.min(1, dist / 90));
      ptr.style.transform = `translateY(${Math.min(60, dist * 0.45)}px) rotate(${dist * 3}deg)`;
    };
    const onEnd = async () => {
      if (startY == null) return;
      startY = null;
      if (dist > 90) {
        busy = true;
        haptic(10);
        SFX.play('whoosh');
        ptr.classList.add('spin');
        ptr.style.transform = 'translateY(40px)';
        await loadAll();
        await new Promise(r => setTimeout(r, 300));
        ptr.classList.remove('spin');
        busy = false;
      }
      ptr.style.transition = 'opacity .25s, transform .3s';
      ptr.style.opacity = '0';
      ptr.style.transform = '';
      setTimeout(() => (ptr.style.transition = ''), 320);
    };
    addEventListener('touchstart', onStart, { passive: true });
    addEventListener('touchmove', onMove, { passive: true });
    addEventListener('touchend', onEnd);
    S.timers.push(() => { removeEventListener('touchstart', onStart); removeEventListener('touchmove', onMove); removeEventListener('touchend', onEnd); });
  }

  function paintMe() {
    const k = (S.user && S.user.avatar) || 'triangle';
    for (const id of ['meSide', 'meTop']) { const el = $('#' + id); if (el) el.innerHTML = NaviBots.svg(k); }
  }

  function onNavClick(e) {
    const b = e.target.closest('[data-nav]');
    if (!b) return;
    haptic(6);
    go(b.dataset.nav);
  }

  function go(view, params = {}) {
    const q = new URLSearchParams(params).toString();
    const hash = `#/${view}${q ? '?' + q : ''}`;
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  addEventListener('hashchange', () => { if (S.user) route(); });

  let viewCleanup = null;
  function route() {
    setTimeout(bars, 60);
    const m = location.hash.match(/^#\/(\w+)(?:\?(.*))?$/);
    const view = m && NAV.some(n => n.id === m[1]) ? m[1] : 'inicio';
    const params = Object.fromEntries(new URLSearchParams((m && m[2]) || ''));
    const changed = view !== S.view && S.view !== '';
    if (viewCleanup) { viewCleanup(); viewCleanup = null; }
    S.view = view;
    S.params = params;
    $$('[data-nav]').forEach(b => b.classList.toggle('on', b.dataset.nav === view));
    const t = $('#topTitle');
    if (t) t.textContent = (NAV.find(n => n.id === view) || {}).label || 'N.A.V.I';
    const doRender = () => { renderView(); window.scrollTo(0, 0); };
    if (changed) transition(doRender);
    else doRender();
  }

  function renderView() {
    const main = $('#main');
    if (!main) return;
    const fn = VIEWS[S.view] || VIEWS.inicio;
    main.innerHTML = `<div class="view">${fn.html()}</div>`;
    if (fn.mount) viewCleanup = fn.mount() || null;
    syncSegs(main, true);
    updateBadges();
  }

  let refreshQueued = 0;
  function softRefresh() {
    if (refreshQueued) return;
    refreshQueued = requestAnimationFrame(() => {
      refreshQueued = 0;
      const fn = VIEWS[S.view];
      if (fn && fn.update) fn.update();
      syncSegs($('#main') || document, true);
      updateBadges();
    });
  }

  function updateBadges() {
    const n = S.review.length;
    $$('[data-count]').forEach(el => { el.textContent = n; el.classList.toggle('hidden', !n); });
    if ('setAppBadge' in navigator) { try { (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {}); } catch (e) {} }
  }

  async function loadAll() {
    try {
      const [status, courses, students, records, review, notifications, terminals, risk] = await Promise.all([
        api('/status'), api('/courses'), api('/students'), api('/attendance'), api('/review'), api('/notifications?limit=40'), api('/terminals'), api('/early-warning').catch(() => [])
      ]);
      S.risk = risk;
      S.stats = status.stats;
      S.channels = status.channels;
      S.settings = status.settings;
      S.demo = status.demo_mode;
      S.publicUrl = status.public_url;
      S.lanIp = status.lan_ip;
      S.srvPort = status.port;
      S.courses = courses;
      S.students = students;
      S.records = records;
      S.review = review;
      S.notifications = notifications;
      S.terminals = terminals;
      if (!S.rollCourse && courses[0]) S.rollCourse = courses[0].id;
      if (S.view === 'terminal' && $('#devFace')) softRefresh();
      else renderView();
    } catch (e) {
      if (e.code === 'OFFLINE') toast({ title: 'Sin conexión', text: 'No puedo llegar al servidor. Reintentando…', mood: 'sad' });
    }
  }

  let statsTimer = 0;
  function refreshStats() {
    clearTimeout(statsTimer);
    statsTimer = setTimeout(async () => {
      try {
        const [status, courses, risk] = await Promise.all([api('/status'), api('/courses'), api('/early-warning').catch(() => S.risk || [])]);
        S.stats = status.stats;
        S.courses = courses;
        S.risk = risk;
        softRefresh();
      } catch (e) {}
    }, 220);
  }
  async function loadStudents() {
    try { S.students = await api('/students'); softRefresh(); } catch (e) {}
  }
  async function loadTerminals() {
    try { S.terminals = await api('/terminals'); if (S.view === 'terminal') VIEWS.terminal.update(); } catch (e) {}
  }

  function setConn(on) {
    S.online = on;
    for (const id of ['connSide', 'connTop']) { const el = $('#' + id); if (el) el.className = 'conn ' + (on ? 'on' : 'off'); }
  }

  const smsHere = () => Boolean(!S.demo && window.NaviAndroid && typeof NaviAndroid.canSms === 'function' && NaviAndroid.canSms() && store.get('navi_sms') === '1' && NaviAndroid.smsReady());
  const wsSend = o => { try { if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify(o)); } catch (e) {} };
  function smsAnnounce() {
    if (smsHere()) wsSend({ type: 'sms_gateway', on: true, device: NaviAndroid.deviceName() });
  }
  window.naviSmsResult = (id, ok, error) => wsSend({ type: 'sms_result', id, ok, error });

  let wsRetry = 0;
  function connectWS() {
    if (!S.token) return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(S.token)}`);
    S.ws = ws;
    ws.onopen = () => {
      if (wsRetry > 0) loadAll();
      wsRetry = 0;
      setConn(true);
      smsAnnounce();
    };
    ws.onclose = () => {
      setConn(false);
      if (!S.user || S.ws !== ws) return;
      wsRetry++;
      if (wsRetry === 3) api('/auth/me').catch(() => {});
      setTimeout(() => { if (S.user && S.ws === ws) connectWS(); }, Math.min(8000, 800 * wsRetry));
    };
    ws.onmessage = e => {
      if (e.data === 'pong') return;
      let m;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      onEvent(m.type, m.payload);
    };
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && S.user && (!S.ws || S.ws.readyState > 1)) { S.ws = null; connectWS(); }
  });

  function upsertRecord(r) {
    const i = S.records.findIndex(x => x.id === r.id);
    const before = i >= 0 ? S.records[i] : null;
    if (r.date === todayStr()) {
      if (i >= 0) S.records[i] = r;
      else S.records.unshift(r);
      S.records.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    }
    const j = S.review.findIndex(x => x.id === r.id);
    if (r.review_state === 'PENDIENTE') { if (j >= 0) S.review[j] = r; else S.review.unshift(r); }
    else if (j >= 0) S.review.splice(j, 1);
    return before;
  }

  function onEvent(type, p) {
    if (type === 'attendance') {
      const before = upsertRecord(p);
      const isNewScan = !before || (before.timestamp !== p.timestamp && p.source === 'NFC');
      if (isNewScan) {
        S.fresh.add(p.id);
        setTimeout(() => S.fresh.delete(p.id), 1500);
      }
      const flaggedNow = p.review_state === 'PENDIENTE' && (!before || before.review_state !== 'PENDIENTE');
      if (flaggedNow) toast({ title: `Revisar a ${p.student_name}`, text: p.review_reasons[p.review_reasons.length - 1].text, mood: 'surprised', action: { label: 'Ver', fn: () => go('revision') }, ms: 5000 });
      else if (isNewScan && p.status === 'TARDE' && p.source === 'NFC' && S.view !== 'terminal') toast({ title: `${p.student_name} llegó con atraso`, text: `${hhmm(p.time_recorded)} · ${p.course_code}`, mood: 'worried' });
      if (S.view === 'terminal' && isNewScan && p.terminal_id !== 'SIMULADOR' && p.source === 'NFC') deviceFromRecord(p);
      refreshStats();
      softRefresh();
    } else if (type === 'unknown_card') {
      if (S.listenUid) { S.listenUid(p.uid); return; }
      if (S.view === 'terminal' && p.terminal_id !== 'SIMULADOR') deviceShow('TARJETA NO REGISTRADA', p.uid, 'angry', 'r', 'bad');
      toast({ title: 'Tarjeta no registrada', text: `UID ${p.uid}`, mood: 'confused', action: { label: 'Registrar', fn: () => openStudentSheet(null, { nfc_uid: p.uid }) }, ms: 6000 });
    } else if (type === 'duplicate') {
      if (S.view === 'terminal' && p.terminal_id !== 'SIMULADOR') deviceShow(String(p.student_name).toUpperCase(), `YA MARCÓ ${hhmm(p.first_time)}`, 'confused', 'y', 'warn');
    } else if (type === 'notification_update') {
      const n = S.notifications.find(x => x.id === p.id);
      if (n) { Object.assign(n, p); refreshNotifs(); }
    } else if (type === 'card_written') {
      if (S.writeWait && S.writeWait.studentId === p.student_id) S.writeWait.done(p);
      else if (p.ok) toast({ title: 'Tarjeta grabada', mood: 'happy', sound: 'success' });
    } else if (type === 'mascot_unlocked') {
      const s0 = S.students.find(x => x.id === p.student_id);
      if (s0 && S.view === 'terminal') toast({ title: `Nació la mascota de ${s0.first_name}`, text: 'Primer toque en el lector', bot: mascotKey(s0.mascot), mood: 'happy', ms: 2600 });
    } else if (type === 'mascot_died') {
      toast({ title: `${p.first_name} lleva ${p.run} faltas seguidas`, text: 'Su mascota se fue. Revisa la alerta temprana.', bot: mascotKey(p.mascot), mood: 'sad', ms: 6000, action: { label: 'Ver', fn: () => go('inicio') } });
      loadStudents();
      refreshStats();
    } else if (type === 'mascot_revived' || type === 'mascot_adopted') {
      loadStudents();
      refreshStats();
    } else if (type === 'channels') {
      S.channels = p;
      if (S.view === 'ajustes' && !sheetState) renderView();
    } else if (type === 'sms_job') {
      if (smsHere()) NaviAndroid.sendSms(String(p.id), p.phone, p.text);
    } else if (type === 'sms_test') {
      toast(p.ok ? { title: 'SMS de prueba enviado', text: 'Revisa el celular que lo recibe.', mood: 'happy', sound: 'success' } : { title: 'No se envió el SMS', text: p.error || '', mood: 'sad', sound: 'bad' });
    } else if (type === 'notification') {
      S.notifications.unshift({ ...p, created_at: p.created_at || new Date().toISOString() });
      S.notifications.length = Math.min(S.notifications.length, 60);
      softRefresh();
    } else if (type === 'student') {
      loadStudents();
      refreshStats();
    } else if (type === 'terminal') {
      if (S.view === 'terminal') loadTerminals();
    } else if (type === 'camera') {
      if (S.view === 'terminal') toast({ title: 'Foto recibida', text: `${p.terminal_id} · ${Math.round(p.bytes / 1024)} KB`, mood: 'happy', ms: 1800 });
    } else if (type === 'emergency_card') {
      if (S.emergencyListen) S.emergencyListen(p.student_id);
      if (S.view === 'terminal') deviceShow('FICHA MEDICA', 'ABIERTA EN LA APP', 'worried', 'r', '');
    } else if (type === 'emergency_view') {
      haptic([30, 60, 30]);
      toast({ sound: 'sos', title: `Ficha médica abierta: ${p.student_name}`, text: 'Alguien acercó un celular a su tarjeta. Puede necesitar ayuda.', mood: 'worried', action: { label: 'Ver', fn: () => openMedicalView(p.student_id) }, ms: 9000 });
    } else if (type === 'reset' || type === 'courses') {
      loadAll();
    }
  }

  const handlers = {};
  function onAction(e) {
    const el = e.target.closest('[data-act]');
    if (!el || !$('#main').contains(el)) return;
    if (e.target.closest('a[data-wa]')) return;
    const fn = handlers[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  }
  function onInput(e) {
    const el = e.target.closest('[data-input]');
    if (el && handlers[el.dataset.input]) handlers[el.dataset.input](el, e);
  }
  function onChange(e) {
    const el = e.target.closest('[data-change]');
    if (el && handlers[el.dataset.change]) handlers[el.dataset.change](el, e);
  }
  handlers.go = el => go(el.dataset.v, el.dataset.c ? { c: el.dataset.c } : {});

  function confirmTap(el, text, fn) {
    if (el.dataset.armed) { delete el.dataset.armed; clearTimeout(el._t); el.innerHTML = el._orig; fn(); return; }
    el.dataset.armed = '1';
    el._orig = el.innerHTML;
    el.textContent = text;
    haptic(12);
    el._t = setTimeout(() => { delete el.dataset.armed; el.innerHTML = el._orig; }, 3000);
  }

  function ring(r, w, pct, grad, dim) {
    const C = 2 * Math.PI * r;
    return `<circle cx="80" cy="80" r="${r}" stroke="${dim}" stroke-width="${w}"/><circle class="bar" cx="80" cy="80" r="${r}" stroke="url(#${grad})" stroke-width="${w}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - Math.min(1, pct))).toFixed(1)}"/>`;
  }

  function heroHtml() {
    const st = S.stats || { total: 0, present: 0, on_time: 0, late: 0, absent: 0, unmarked: 0, verified: 0 };
    const att = st.total ? st.present / st.total : 0;
    const punct = st.present ? st.on_time / st.present : 0;
    const marked = st.present + st.absent;
    const ver = marked ? (st.verified || 0) / marked : 0;
    return `
      <div class="rings-card">
        <svg class="rings" viewBox="0 0 160 160" aria-hidden="true">
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E20048"/><stop offset="1" stop-color="#FF4F8B"/></linearGradient>
            <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5DDB00"/><stop offset="1" stop-color="#B5FF3B"/></linearGradient>
            <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00C4D8"/><stop offset="1" stop-color="#5BFFF9"/></linearGradient>
          </defs>
          ${ring(68, 18, att, 'g1', 'rgba(250,17,79,.25)')}${ring(48, 18, punct, 'g2', 'rgba(146,232,42,.22)')}${ring(28, 18, ver, 'g3', 'rgba(30,234,239,.22)')}
        </svg>
        <div class="rings-legend">
          <div><div class="k c1">Asistencia</div><div class="v c1">${st.present}<small>/${st.total}</small></div></div>
          <div><div class="k c2">Puntualidad</div><div class="v c2">${Math.round(punct * 100)}<small>%</small></div></div>
          <div><div class="k c3">Verificado</div><div class="v c3">${st.verified || 0}<small>/${marked}</small></div></div>
        </div>
      </div>
      <div class="tiles">
        <div class="tile-k"><div class="top">${ico('clock', 'orange')}</div><div><div class="num">${st.late}</div><div class="lbl">Atrasos</div></div></div>
        <div class="tile-k"><div class="top">${ico('xcircle', 'red')}</div><div><div class="num">${st.absent}</div><div class="lbl">Ausentes</div></div></div>
        <button class="tile-k" data-act="go" data-v="revision"><div class="top">${ico('shield', 'purple')}${S.review.length ? icon('chevron', 'faint') : ''}</div><div><div class="num">${S.review.length}</div><div class="lbl">Por revisar</div></div></button>
        <div class="tile-k"><div class="top">${ico('person', 'gray')}</div><div><div class="num">${st.unmarked}</div><div class="lbl">Sin marcar</div></div></div>
      </div>`;
  }

  function coursesHtml() {
    if (!S.courses.length) return emptyHtml('sleepy', 'Aún no hay cursos', 'Crea uno desde Ajustes.');
    return S.courses.map(c => {
      const tot = c.total_students || 0;
      const ok = tot ? ((c.present - c.late) / tot) * 100 : 0;
      const late = tot ? (c.late / tot) * 100 : 0;
      const abs = tot ? (c.absent / tot) * 100 : 0;
      return `<button class="course" data-act="go" data-v="lista" data-c="${c.id}">
        <div class="top"><div class="badge t-${esc(c.theme)}">${esc(c.code.split('-')[1] || c.code.slice(0, 3))}</div><div style="min-width:0"><h3>${esc(c.name)}</h3><div class="meta">Entrada ${esc(c.schedule_start)} · ${esc(c.classroom)}</div></div></div>
        <div class="progress">${ok ? `<span style="width:${ok}%;background:var(--green)"></span>` : ''}${late ? `<span style="width:${late}%;background:var(--orange)"></span>` : ''}${abs ? `<span style="width:${abs}%;background:var(--red)"></span>` : ''}</div>
        <div class="nums"><span>${c.present} de ${tot} presentes</span><b style="color:var(--text)">${c.percentage}%</b></div>
      </button>`;
    }).join('');
  }

  function emptyHtml(mood, title, text) {
    return `<div class="empty"><div class="bot-holder">${NaviBots.svg((S.user && S.user.avatar) || 'triangle', mood)}</div><b>${esc(title)}</b><p>${esc(text)}</p></div>`;
  }

  function feedRows() {
    const f = S.filter;
    let list = S.records;
    if (f === 'REVISAR') list = list.filter(r => r.review_state === 'PENDIENTE');
    else if (f !== 'ALL') list = list.filter(r => r.status === f);
    list = list.slice(0, 60);
    if (!list.length) return emptyHtml('sleepy', f === 'ALL' ? 'Esperando tarjetas' : 'Nada por aquí', f === 'ALL' ? 'Los registros aparecen al instante cuando alguien acerca su tarjeta.' : 'No hay registros con este filtro.');
    return list.map(r => `<button class="cell has-av ${S.fresh.has(r.id) ? 'enter' : ''}" data-act="record" data-id="${r.id}">${avatar(r)}<div class="grow"><div class="t b">${esc(r.student_name)}</div><div class="s">${esc(r.course_code)} · ${hhmm(r.time_recorded)} · ${SOURCE[r.source] || r.source}</div></div>${reviewPill(r)}${statusPill(r)}</button>`).join('');
  }

  function notifGroups(limit = 10) {
    const groups = [];
    for (const n of S.notifications) {
      const key = `${n.student_id}|${n.kind}`;
      const g = groups.find(x => x.key === key && Math.abs(Date.parse(sqlIso(x.items[0].created_at)) - Date.parse(sqlIso(n.created_at))) < 120000);
      if (g) g.items.push(n);
      else groups.push({ key, items: [n] });
      if (groups.length > limit) break;
    }
    return groups.slice(0, limit).map(g => {
      const wa = g.items.find(x => x.channel === 'WHATSAPP');
      const ok = g.items.find(x => x.status === 'ENVIADO' || x.status === 'MANUAL');
      const best = ok || g.items.find(x => x.status === 'FALLIDO') || wa || g.items[0];
      return { ...best, items: g.items, wa };
    });
  }
  const waPendingCount = () => S.notifications.filter(n => n.channel === 'WHATSAPP' && n.status === 'ENLACE').length;
  function waHead() {
    const n = waPendingCount();
    return n ? `<button class="pill p-wa tap" data-act="waQueue">${icon('chat')} ${n} por enviar</button>` : '<small>Representantes</small>';
  }

  function notifRows() {
    const list = notifGroups(10);
    if (!list.length) return emptyHtml('neutral', 'Sin avisos todavía', 'Se avisa a los representantes cuando hay atraso o ausencia.');
    return list.map(n => {
      const waPending = n.wa && n.wa.status === 'ENLACE';
      const [label, cls] = NSTATUS[n.status] || [n.status, 'p-none'];
      const [, ic, col] = CHANNEL[n.channel] || CHANNEL.EMAIL;
      const end = waPending ? `<a class="btn btn-wa btn-sm" href="${esc(n.wa.recipient)}" target="_blank" rel="noopener" data-wa="${n.wa.id}">Enviar</a>` : `<span class="pill ${cls}">${label}</span>`;
      const via = [...new Set(n.items.map(x => x.channel))].map(c => {
        const it = n.items.find(x => x.channel === c);
        const good = it.status === 'ENVIADO' || it.status === 'MANUAL';
        return `${(CHANNEL[c] || [c])[0]}${good ? ' ✓' : it.status === 'FALLIDO' ? ' ✕' : ''}`;
      }).join(' · ');
      return `<div class="cell has-icon tap" data-act="notif" data-id="${n.id}" role="button" tabindex="0">${ico(n.kind === 'CUSTOM' ? 'chat' : ic, n.kind === 'EMERGENCY' ? 'red' : n.kind === 'CUSTOM' ? 'indigo' : col)}<div class="grow"><div class="t">${esc(n.student_name || '')}</div><div class="s">${KIND[n.kind] || n.kind} · ${via} · ${ago(sqlIso(n.created_at))}</div></div>${end}</div>`;
    }).join('');
  }

  function waFormat(text) {
    return esc(text).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/(^|\s)_([^_\n]+)_/g, '$1<i>$2</i>');
  }
  function phoneFromLink(link) {
    const m = /wa\.me\/(\d+)/.exec(link || '');
    if (!m) return link || '';
    const d = m[1];
    return d.startsWith('593') && d.length === 12 ? `+593 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : '+' + d;
  }
  function recipientLabel(n) {
    if (n.channel === 'WHATSAPP') return phoneFromLink(n.recipient);
    if (n.channel === 'TELEGRAM') return 'Chat vinculado';
    return String(n.recipient || '').replace(/cc:/g, 'copia: ');
  }

  async function markWa(id) {
    const n = S.notifications.find(x => x.id === id);
    if (n) n.status = 'MANUAL';
    haptic(8);
    setTimeout(() => refreshNotifs(), 400);
    try { await api(`/notifications/${id}/sent`, { method: 'POST' }); } catch (e) {}
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-wa]');
    if (a) markWa(Number(a.dataset.wa));
  }, true);
  function refreshNotifs() {
    const box = $('#notifs');
    if (box) box.innerHTML = notifRows();
    const head = $('#waHead');
    if (head) head.innerHTML = waHead();
  }

  function openNotif(id) {
    const g = notifGroups(40).find(x => x.items.some(i => i.id === id));
    if (!g) return;
    const st = S.students.find(x => x.id === g.student_id);
    const msgItem = g.items.find(x => x.channel === 'WHATSAPP') || g.items[0];
    const mailItem = g.items.find(x => x.channel === 'EMAIL');
    const rows = g.items.map(n => {
      const [name, ic, col] = CHANNEL[n.channel] || [n.channel, 'mail', 'gray'];
      const [label, cls] = NSTATUS[n.status] || [n.status, 'p-none'];
      const err = n.error ? `<div class="s" style="white-space:normal;color:${n.status === 'FALLIDO' ? 'var(--red)' : 'var(--text-2)'}">${esc(n.error)}</div>` : '';
      return `<div class="cell has-icon">${ico(ic, col)}<div class="grow"><div class="t">${name}</div><div class="s">${esc(recipientLabel(n))}</div>${err}</div><span class="pill ${cls}">${label}</span></div>`;
    }).join('');
    const acts = [];
    const waP = g.items.find(x => x.channel === 'WHATSAPP' && x.status === 'ENLACE');
    if (waP) acts.push(`<a class="cell has-icon" href="${esc(waP.recipient)}" target="_blank" rel="noopener" data-wa="${waP.id}" id="nfWa">${ico('chat', 'green')}<div class="grow"><div class="t b" style="color:var(--green)">Enviar por WhatsApp</div><div class="s">Se abre con el mensaje listo, solo toca enviar</div></div>${icon('chevron', 'chev')}</a>`);
    if (mailItem && mailItem.status === 'FALLIDO') acts.push(`<button class="cell has-icon" id="nfRetry">${ico('refresh', 'blue')}<div class="grow t">Reintentar correo</div></button>`);
    if (mailItem && mailItem.status === 'SIMULADO' && canConfigure()) acts.push(`<button class="cell has-icon" id="nfCfg">${ico('mail', 'blue')}<div class="grow"><div class="t">Configurar correo</div><div class="s">Para que este aviso llegue de verdad</div></div>${icon('chevron', 'chev')}</button>`);
    if (st) acts.push(`<button class="cell has-icon" id="nfMsg">${ico('chat', 'indigo')}<div class="grow t">Escribir otro mensaje</div>${icon('chevron', 'chev')}</button>`);
    const subject = msgItem.channel === 'EMAIL' && msgItem.subject ? `<div class="bubble-sub">${esc(msgItem.subject)}</div>` : '';
    openSheet({
      title: KIND[g.kind] || 'Aviso',
      body: `
        <div class="notif-hero">${st ? avatar(st, 'av-lg') : ''}<div><b>${esc(g.student_name || '')}</b><small>${esc(st && st.parent_name ? 'Representante: ' + st.parent_name : '')}</small><small>${new Date(sqlIso(g.created_at)).toLocaleString('es-EC', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></div></div>
        <div class="group-title">Enviado por</div>
        <div class="group">${rows}</div>
        <div class="group-title">Mensaje</div>
        <div class="chat-bg"><div class="bubble ${msgItem.channel === 'WHATSAPP' ? 'wa' : ''}">${subject}${msgItem.channel === 'WHATSAPP' ? waFormat(msgItem.message || '') : esc(msgItem.message || '')}</div></div>
        ${acts.length ? `<div class="group" style="margin-top:22px">${acts.join('')}</div>` : ''}`,
      onMount(el) {
        const wa = $('#nfWa', el);
        if (wa) wa.addEventListener('click', () => setTimeout(() => closeSheet(), 300));
        const r = $('#nfRetry', el);
        if (r) r.addEventListener('click', async () => {
          r.disabled = true;
          $('.t', r).textContent = 'Enviando…';
          try {
            const out = await api(`/notifications/${mailItem.id}/resend`, { method: 'POST' });
            closeSheet();
            toast(out && out.status === 'ENVIADO' ? { title: 'Correo enviado', mood: 'happy', sound: 'success' } : { title: 'Volvió a fallar', text: (out && out.error) || '', mood: 'sad', ms: 6000 });
          } catch (e) { r.disabled = false; $('.t', r).textContent = 'Reintentar correo'; toast({ title: 'No se pudo', text: e.message, mood: 'sad' }); }
        });
        const c = $('#nfCfg', el);
        if (c) c.addEventListener('click', () => { closeSheet(true); openMailSettings(); });
        const m = $('#nfMsg', el);
        if (m) m.addEventListener('click', () => { closeSheet(true); openCompose(st); });
      }
    });
  }

  async function openWaQueue() {
    let list = [];
    try { list = await api('/notifications/pending'); } catch (e) { return toast({ title: 'No se pudo', text: e.message, mood: 'sad' }); }
    const row = n => {
      const st = S.students.find(x => x.id === n.student_id) || { id: n.student_id, first_name: n.student_name };
      return `<div class="cell has-av" data-row="${n.id}">${avatar(st, 'av-sm')}<div class="grow"><div class="t">${esc(n.student_name || '')}</div><div class="s">${KIND[n.kind] || n.kind} · ${esc(phoneFromLink(n.recipient))} · ${ago(sqlIso(n.created_at))}</div></div><a class="btn btn-wa btn-sm" href="${esc(n.recipient)}" target="_blank" rel="noopener" data-wa="${n.id}">Enviar</a></div>`;
    };
    openSheet({
      title: 'WhatsApp por enviar',
      body: list.length ? `
        <div class="wa-intro">${ico('chat', 'green')}<div><b>${list.length} ${list.length === 1 ? 'mensaje listo' : 'mensajes listos'}</b><small>Toca "Enviar": WhatsApp se abre con el texto escrito, tú solo presionas enviar y vuelves aquí.</small></div></div>
        <div class="group" id="waList">${list.map(row).join('')}</div>
        <p class="group-foot">Para que se envíen solos sin tocar nada, activa el modo automático en Ajustes → WhatsApp (requiere la API oficial de Meta).</p>` : emptyHtml('happy', 'Todo enviado', 'No hay mensajes de WhatsApp pendientes.'),
      onMount(el) {
        el.addEventListener('click', e => {
          const a = e.target.closest('a[data-wa]');
          if (!a) return;
          const r = a.closest('[data-row]');
          setTimeout(() => { a.outerHTML = `<span class="pill p-ok">${icon('check')} Enviado</span>`; r.classList.add('done'); }, 250);
        });
      }
    });
  }

  const MSG_TEMPLATES = [
    ['reunion', 'Reunión', 'Citación a reunión', f => `Le solicitamos acercarse a la institución el día ____ a las ____ para conversar sobre ${f}.`],
    ['atrasos', 'Atrasos', 'Atrasos frecuentes', f => `${f} ha registrado varios atrasos en los últimos días. Le pedimos su apoyo para que llegue a tiempo a clases.`],
    ['recordatorio', 'Recordatorio', 'Recordatorio', f => `Le recordamos que ${f} debe traer ____ para la clase de mañana.`],
    ['felicitacion', 'Felicitación', 'Felicitación', f => `Queremos felicitar a ${f} por su excelente asistencia y puntualidad. ¡Gracias por su apoyo!`],
    ['libre', 'En blanco', '', () => '']
  ];

  function openCompose(st) {
    if (!st) return;
    const has = { email: Boolean(st.parent_email), whatsapp: Boolean(st.parent_phone), telegram: Boolean(st.telegram_linked) };
    if (!has.email && !has.whatsapp && !has.telegram) return toast({ title: 'Falta un contacto', text: 'Agrega el celular o el correo del representante.', mood: 'confused' });
    const inst = (S.user && S.user.institution_name) || 'La institución';
    const chRow = (k, ic, col, title, sub) => `<div class="cell has-icon">${ico(ic, col)}<div class="grow"><div class="t">${title}</div><div class="s">${esc(sub)}</div></div><label class="switch"><input type="checkbox" name="ch_${k}" ${has[k] ? 'checked' : 'disabled'}><span></span></label></div>`;
    openSheet({
      title: 'Mensaje',
      left: `<button class="btn btn-plain" data-close>Cancelar</button>`,
      right: `<button class="btn btn-plain" id="sendMsg" style="font-weight:600">Enviar</button>`,
      body: `
        <div id="composeBox">
        <form id="msgForm" novalidate>
          <div class="notif-hero">${avatar(st, 'av-lg')}<div><b>Para ${esc(st.parent_name || 'el representante')}</b><small>Sobre ${esc(st.first_name)} ${esc(st.last_name)}</small></div></div>
          <div class="chips" id="tpls" style="margin:4px 0 14px">${MSG_TEMPLATES.map(([k, l], i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}" data-tpl="${k}">${l}</button>`).join('')}</div>
          <div class="group">
            ${frow('subject', 'Asunto', { value: MSG_TEMPLATES[0][2], placeholder: 'Mensaje de la institución' })}
            <textarea class="ta" name="text" rows="5" placeholder="Escribe tu mensaje…">${esc(MSG_TEMPLATES[0][3](st.first_name))}</textarea>
          </div>
          <div class="group-title">Enviar por</div>
          <div class="group">
            ${chRow('email', 'mail', 'blue', 'Correo', has.email ? st.parent_email : 'Sin correo registrado')}
            ${chRow('whatsapp', 'chat', 'green', 'WhatsApp', has.whatsapp ? st.parent_phone : 'Sin celular registrado')}
            ${has.telegram ? chRow('telegram', 'send', 'teal', 'Telegram', 'Chat vinculado') : ''}
          </div>
          <div class="group-title">Vista previa</div>
          <div class="chat-bg"><div class="bubble wa" id="msgPrev"></div></div>
        </form>
        </div>`,
      onMount(el) {
        const form = $('#msgForm', el);
        const prev = () => {
          const v = Object.fromEntries(new FormData(form));
          $('#msgPrev', el).innerHTML = waFormat(`*✉️ ${v.subject || 'Mensaje de la institución'}*\n\nEstimado/a ${st.parent_name || 'representante'}:\n${v.text || '…'}\n\n— ${inst}`);
        };
        prev();
        form.addEventListener('input', prev);
        $('#tpls', el).addEventListener('click', e => {
          const b = e.target.closest('[data-tpl]');
          if (!b) return;
          $$('#tpls .chip', el).forEach(c => c.classList.toggle('on', c === b));
          const t = MSG_TEMPLATES.find(x => x[0] === b.dataset.tpl);
          form.subject.value = t[2];
          form.text.value = t[3](st.first_name);
          prev();
          haptic(5);
          if (t[0] === 'libre' || form.text.value.includes('____')) {
            const i = form.text.value.indexOf('____');
            form.text.focus();
            if (i >= 0) form.text.setSelectionRange(i, i + 4);
          }
        });
        $('#sendMsg', el).addEventListener('click', async ev => {
          const btn = ev.currentTarget;
          const v = Object.fromEntries(new FormData(form));
          if (!String(v.text || '').trim() || v.text.includes('____')) {
            setFieldError(form, []);
            form.text.focus();
            const i = form.text.value.indexOf('____');
            if (i >= 0) form.text.setSelectionRange(i, i + 4);
            return toast({ title: v.text.includes('____') ? 'Completa los espacios ____' : 'Escribe el mensaje', mood: 'confused', sound: 'warn' });
          }
          const channels = { email: Boolean(form.ch_email && form.ch_email.checked), whatsapp: Boolean(form.ch_whatsapp && form.ch_whatsapp.checked), telegram: Boolean(form.ch_telegram && form.ch_telegram.checked) };
          if (!channels.email && !channels.whatsapp && !channels.telegram) return toast({ title: 'Elige al menos un canal', mood: 'confused', sound: 'warn' });
          btn.disabled = true;
          btn.textContent = 'Enviando…';
          try {
            const { results } = await api(`/students/${st.id}/message`, { method: 'POST', body: { subject: v.subject, text: v.text, channels } });
            showSendResult(el, results, st);
            btn.remove();
          } catch (e) {
            btn.disabled = false;
            btn.textContent = 'Enviar';
            toast({ title: 'No se pudo enviar', text: e.message, mood: 'sad' });
          }
        });
      }
    });
  }

  function showSendResult(el, results, st) {
    const okAll = results.every(r => r.status === 'ENVIADO');
    const wa = results.find(r => r.channel === 'WHATSAPP' && r.status === 'ENLACE');
    const rows = results.map(n => {
      const [name, ic, col] = CHANNEL[n.channel] || [n.channel, 'mail', 'gray'];
      const [label, cls] = NSTATUS[n.status] || [n.status, 'p-none'];
      return `<div class="cell has-icon">${ico(ic, col)}<div class="grow"><div class="t">${name}</div><div class="s" style="white-space:normal">${esc(n.error || recipientLabel(n))}</div></div><span class="pill ${cls}" data-res="${n.id}">${label}</span></div>`;
    }).join('');
    $('#composeBox', el).innerHTML = `
      <div class="result-hero"><div class="bot-holder">${NaviBots.svg((S.user && S.user.avatar) || 'triangle', okAll || wa ? 'happy' : 'worried')}</div><b>${wa ? 'Falta un toque' : okAll ? 'Mensaje enviado' : 'Revisa el envío'}</b><p>${wa ? 'Abre WhatsApp y presiona enviar.' : okAll ? `${esc(st.parent_name || 'El representante')} ya lo recibió.` : 'Algunos canales no se pudieron usar.'}</p></div>
      ${wa ? `<a class="btn btn-wa btn-lg" href="${esc(wa.recipient)}" target="_blank" rel="noopener" data-wa="${wa.id}" id="resWa">${icon('chat')} Abrir WhatsApp</a>` : ''}
      <div class="group" style="margin-top:18px">${rows}</div>
      <div class="group" style="margin-top:22px"><button class="cell center" data-close>Listo</button></div>`;
    $$('[data-close]', el).forEach(b => b.addEventListener('click', e => { e.preventDefault(); closeSheet(); }));
    const a = $('#resWa', el);
    if (a) a.addEventListener('click', () => setTimeout(() => {
      a.outerHTML = `<div class="sent-chip">${icon('check')} Enviado por WhatsApp</div>`;
      const pill = $(`[data-res="${wa.id}"]`, el);
      if (pill) { pill.className = 'pill p-ok'; pill.textContent = 'Enviado'; }
    }, 250));
    SFX.play(okAll || wa ? 'success' : 'warn');
    if (S.user && NaviBots) SFX.bot(S.user.avatar || 'triangle', okAll || wa ? 'happy' : 'worried');
  }

  const MAIL_HELP = {
    gmail: 'Gmail pide una <b>contraseña de aplicación</b>: activa la verificación en 2 pasos de tu cuenta y crea una en <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">myaccount.google.com/apppasswords</a>. Pega aquí las 16 letras.',
    outlook: 'Usa tu correo de Outlook o Hotmail y una <b>contraseña de aplicación</b> (account.microsoft.com → Seguridad). Si Microsoft la rechaza, usa Gmail: es lo más estable.',
    yahoo: 'Yahoo también pide una <b>contraseña de aplicación</b> (Seguridad de la cuenta → Generar contraseña de app).',
    custom: 'Si el colegio tiene su propio correo (por ejemplo <span class="mono">@colegio.edu.ec</span>), pide al técnico el servidor SMTP y el puerto (normalmente 587).'
  };

  function stateBox(ok, text) {
    return `<div class="state-box ${ok ? 'ok' : 'bad'}">${icon(ok ? 'check' : 'alert')}<span>${text}</span></div>`;
  }

  async function openMailSettings() {
    let data;
    try { data = await api('/messaging'); } catch (e) { return toast({ title: 'No se pudo abrir', text: e.message, mood: 'sad' }); }
    const c = data.config;
    let prov = c.mail_provider || 'gmail';
    const fromEnv = c.mail_source === 'env';
    openSheet({
      title: 'Correo',
      left: `<button class="btn btn-plain" data-close>Cancelar</button>`,
      right: `<button class="btn btn-plain" id="saveMail" style="font-weight:600">Guardar</button>`,
      body: `
        <form id="mailForm" novalidate autocomplete="off">
          <div class="notif-hero">${ico('mail', 'blue')}<div><b>Correo a representantes</b><small>Avisos con diseño, copia a la institución y respuesta al DECE</small></div></div>
          <div id="mailState">${c.mail_source ? stateBox(true, `Enviando desde <b>${esc(c.mail_user)}</b>${fromEnv ? ' (configurado en backend/.env)' : ''}`) : stateBox(false, S.demo ? 'Aún no está configurado: los avisos por correo se simulan.' : 'Aún no está configurado: los avisos por correo no se envían hasta que lo configures.')}</div>
          <div class="group-title">Cuenta que envía</div>
          <div style="margin-bottom:10px" id="provSeg">${segHtml([['gmail', 'Gmail'], ['outlook', 'Outlook'], ['custom', 'Otro']], prov === 'yahoo' ? 'custom' : prov, 'mailProv')}</div>
          <div class="group">
            ${frow('mail_user', 'Correo', { type: 'email', value: fromEnv ? '' : c.mail_user, placeholder: 'inspeccion@gmail.com', attrs: 'autocapitalize="off" spellcheck="false"' })}
            ${frow('mail_pass', 'Contraseña', { type: 'password', placeholder: c.mail_pass_set ? '•••• guardada (deja vacío)' : 'Contraseña de aplicación', attrs: 'autocomplete="new-password" spellcheck="false"' })}
            <div class="custom-only ${prov === 'custom' ? '' : 'hidden'}">
              ${frow('mail_host', 'Servidor', { value: c.mail_host, placeholder: 'smtp.colegio.edu.ec', attrs: 'autocapitalize="off" spellcheck="false"' })}
              ${frow('mail_port', 'Puerto', { type: 'number', value: c.mail_port || 587, attrs: 'inputmode="numeric"' })}
            </div>
            ${frow('mail_from_name', 'Remitente', { value: c.mail_from_name, placeholder: (S.user && S.user.institution_name) || 'Nombre del colegio' })}
          </div>
          <p class="group-foot" id="mailHelp">${MAIL_HELP[prov] || MAIL_HELP.custom}</p>
          <div class="group-title">Institución</div>
          <div class="group">
            ${frow('inst_email', 'Correo DECE', { type: 'email', value: c.inst_email, placeholder: 'dece@colegio.edu.ec', attrs: 'autocapitalize="off" spellcheck="false"' })}
            <label class="frow"><span>Con copia</span><select name="inst_cc"><option value="URGENT" ${c.inst_cc === 'URGENT' ? 'selected' : ''}>Ausencias y emergencias</option><option value="ALL" ${c.inst_cc === 'ALL' ? 'selected' : ''}>Todos los avisos</option><option value="NONE" ${c.inst_cc === 'NONE' ? 'selected' : ''}>Nunca</option></select></label>
            ${frow('inst_phone', 'Teléfono', { type: 'tel', value: c.inst_phone, placeholder: '04 260 0000' })}
            ${frow('signature', 'Firma', { value: c.signature, placeholder: 'Inspección General' })}
          </div>
          <p class="group-foot">Las respuestas de los padres llegan al correo del DECE o inspección. El teléfono aparece en los avisos urgentes para que llamen.</p>
          <div class="group-title">Probar</div>
          <div class="group">
            ${frow('to', 'Enviar a', { type: 'email', value: S.user && !S.user.email.endsWith('navi.local') ? S.user.email : '', placeholder: 'tu correo', attrs: 'autocapitalize="off"', addon: '<button type="button" class="btn btn-tinted btn-sm" id="testMail">Probar</button>' })}
          </div>
          <div id="testState"></div>
          <p class="group-foot">Te llega un aviso de ejemplo igual al que reciben los representantes.</p>
          ${c.mail_source === 'app' ? `<div class="group" style="margin-top:22px"><button type="button" class="cell center danger" id="mailOff">Desconectar este correo</button></div>` : ''}
        </form>`,
      onMount(el) {
        const form = $('#mailForm', el);
        $('#provSeg', el).addEventListener('click', e => {
          const b = e.target.closest('[data-act=mailProv]');
          if (!b) return;
          prov = b.dataset.k;
          segSelect(b);
          $('.custom-only', el).classList.toggle('hidden', prov !== 'custom');
          $('#mailHelp', el).innerHTML = MAIL_HELP[prov];
          haptic(5);
        });
        const body = () => {
          const v = Object.fromEntries(new FormData(form));
          const out = { mail_provider: prov, mail_from_name: v.mail_from_name, inst_email: v.inst_email, inst_cc: v.inst_cc, inst_phone: v.inst_phone, signature: v.signature };
          if (v.mail_user || !fromEnv) out.mail_user = v.mail_user;
          if (v.mail_pass) out.mail_pass = v.mail_pass;
          if (prov === 'custom') { out.mail_host = v.mail_host; out.mail_port = Number(v.mail_port) || 587; }
          return out;
        };
        const save = async () => {
          const r = await api('/messaging', { method: 'PUT', body: body() });
          S.channels = r.status;
          form.mail_pass.value = '';
          if (r.config.mail_pass_set) { c.mail_pass_set = true; form.mail_pass.placeholder = '•••• guardada (deja vacío)'; }
          if (r.verify) $('#mailState', el).innerHTML = r.verify.ok ? stateBox(true, `Conectado. Enviando desde <b>${esc(r.config.mail_user)}</b>`) : stateBox(false, esc(r.verify.error));
          else if (r.config.mail_source) $('#mailState', el).innerHTML = stateBox(true, `Enviando desde <b>${esc(r.config.mail_user)}</b>`);
          return r;
        };
        $('#saveMail', el).addEventListener('click', async ev => {
          const btn = ev.currentTarget;
          const v = Object.fromEntries(new FormData(form));
          if (v.mail_user && !v.mail_pass && !c.mail_pass_set) { setFieldError(form, ['mail_pass']); return toast({ title: 'Falta la contraseña de aplicación', mood: 'confused', sound: 'warn' }); }
          btn.disabled = true;
          btn.textContent = 'Comprobando…';
          try {
            const r = await save();
            setFieldError(form, [], false);
            if (r.verify && !r.verify.ok) {
              setFieldError(form, ['mail_pass'], false);
              $('.sheet-body', el).scrollTo({ top: 0, behavior: 'smooth' });
              SFX.play('error');
              haptic([20, 40, 20]);
            } else {
              toast({ title: 'Correo guardado', text: r.verify ? 'La conexión funciona.' : '', mood: 'happy', sound: 'success' });
              closeSheet();
              if (S.view === 'ajustes') renderView();
            }
          } catch (e) {
            setFieldError(form, e.fields || []);
            toast({ title: 'No se pudo guardar', text: e.message, mood: 'sad' });
          }
          btn.disabled = false;
          btn.textContent = 'Guardar';
        });
        $('#testMail', el).addEventListener('click', async ev => {
          const btn = ev.currentTarget;
          const to = form.to.value.trim();
          if (!to) { setFieldError(form, ['to']); return; }
          btn.disabled = true;
          btn.textContent = 'Enviando…';
          $('#testState', el).innerHTML = '';
          try {
            await save();
            await api('/messaging/test', { method: 'POST', body: { channel: 'email', to } });
            $('#testState', el).innerHTML = stateBox(true, `Listo. Revisa la bandeja de <b>${esc(to)}</b> (y la carpeta de spam la primera vez).`);
            SFX.play('success');
          } catch (e) {
            $('#testState', el).innerHTML = stateBox(false, esc(e.message));
            if (e.fields && e.fields.length) setFieldError(form, e.fields, false);
            SFX.play('error');
          }
          btn.disabled = false;
          btn.textContent = 'Probar';
        });
        const off = $('#mailOff', el);
        if (off) off.addEventListener('click', e => confirmTap(e.currentTarget, 'Toca otra vez para desconectar', async () => {
          try {
            const r = await api('/messaging', { method: 'PUT', body: { mail_user: '', mail_pass: null } });
            S.channels = r.status;
            closeSheet();
            toast({ title: 'Correo desconectado', mood: 'neutral' });
            if (S.view === 'ajustes') renderView();
          } catch (err) { toast({ title: 'No se pudo', text: err.message, mood: 'sad' }); }
        }));
      }
    });
  }

  async function openSmsSettings() {
    let data;
    try { data = await api('/messaging'); } catch (e) { return toast({ title: 'No se pudo abrir', text: e.message, mood: 'sad' }); }
    const c = data.config;
    const st = data.status;
    const can = canConfigure();
    const android = Boolean(window.NaviAndroid && typeof NaviAndroid.canSms === 'function');
    const phoneOk = android && NaviAndroid.canSms();
    const here = smsHere();
    openSheet({
      title: 'SMS',
      onClose: () => setTimeout(() => { if (S.view === 'ajustes') renderView(); }, 50),
      left: `<button class="btn btn-plain" data-close>Listo</button>`,
      body: `
        <form id="smsForm" novalidate autocomplete="off">
          <div class="notif-hero">${ico('phone', 'indigo')}<div><b>Mensajes de texto (SMS)</b><small>Llegan a cualquier celular, aunque no tenga internet ni WhatsApp</small></div></div>
          <p class="group-foot" style="padding-top:0">Los SMS salen de un celular Android con chip, por ejemplo el del docente o uno del colegio, que tenga abierta la app N.A.V.I. Cada mensaje usa el saldo o el plan de ese chip.</p>
          <div class="group" style="margin-top:12px">
            <div class="cell has-icon">${ico('bell', 'indigo')}<div class="grow"><div class="t">Enviar avisos por SMS</div><div class="s" style="white-space:normal">Llegadas, atrasos y ausencias, según lo que actives en Avisos</div></div><label class="switch"><input type="checkbox" id="smsOn" ${c.sms_on ? 'checked' : ''} ${can ? '' : 'disabled'}><span></span></label></div>
            <div class="cell has-icon">${ico('cpu', st.sms_device ? 'green' : 'graphite')}<div class="grow"><div class="t">Celular que envía</div><div class="s" id="smsDev">${st.sms_device ? esc(st.sms_device) + ' · en línea' : 'Ninguno conectado'}</div></div></div>
          </div>
          ${android ? `<div class="group-title">Este celular</div>
          <div class="group">
            <div class="cell has-icon">${ico('phone', 'green')}<div class="grow"><div class="t">Enviar los SMS desde este celular</div><div class="s" style="white-space:normal">${phoneOk ? 'Deja la app abierta o en segundo plano y con señal' : 'Este dispositivo no tiene chip para SMS'}</div></div><label class="switch"><input type="checkbox" id="smsHere" ${here ? 'checked' : ''} ${phoneOk ? '' : 'disabled'}><span></span></label></div>
          </div>` : `<p class="group-foot" style="margin-top:14px">Para enviar los SMS, abre la app de Android N.A.V.I en un celular con chip y activa <b>Enviar los SMS desde este celular</b> en Ajustes → SMS.</p>`}
          <div class="group-title">Probar</div>
          <div class="group">
            ${frow('to', 'Celular', { type: 'tel', placeholder: '09XXXXXXXX', addon: '<button type="button" class="btn btn-tinted btn-sm" id="testSms">Probar</button>' })}
          </div>
          <p class="group-foot">El mensaje dice, por ejemplo: «N.A.V.I · ${esc((S.user && S.user.institution_name) || 'Colegio')}: Daniel Heredia ingresó a clases a las 07:02.»</p>
        </form>`,
      onMount(el) {
        const form = $('#smsForm', el);
        const on = $('#smsOn', el);
        on.addEventListener('change', async () => {
          try {
            const r = await api('/messaging', { method: 'PUT', body: { sms_on: on.checked } });
            S.channels = r.status;
            toast({ title: on.checked ? 'Avisos por SMS activados' : 'Avisos por SMS apagados', mood: on.checked ? 'happy' : 'neutral' });
          } catch (e) { on.checked = !on.checked; toast({ title: 'No se pudo', text: e.message, mood: 'sad' }); }
        });
        const hereEl = $('#smsHere', el);
        if (hereEl) hereEl.addEventListener('change', () => {
          if (!hereEl.checked) {
            store.set('navi_sms', '0');
            wsSend({ type: 'sms_gateway', on: false });
            return;
          }
          window.naviSmsPermission = granted => {
            window.naviSmsPermission = null;
            if (!granted) {
              hereEl.checked = false;
              return toast({ title: 'Sin permiso para SMS', text: 'Acepta el permiso para que N.A.V.I pueda enviar mensajes.', mood: 'confused', sound: 'warn' });
            }
            store.set('navi_sms', '1');
            smsAnnounce();
            const d = $('#smsDev', el);
            if (d) d.textContent = NaviAndroid.deviceName() + ' · en línea';
            toast({ title: 'Este celular enviará los SMS', mood: 'happy', sound: 'success' });
          };
          NaviAndroid.requestSms();
        });
        $('#testSms', el).addEventListener('click', async ev => {
          const btn = ev.currentTarget;
          const to = form.to.value.trim();
          if (!to) return setFieldError(form, ['to']);
          btn.disabled = true;
          try {
            const r = await api('/messaging/test', { method: 'POST', body: { channel: 'sms', to } });
            if (r.ok) toast({ title: 'Enviando SMS de prueba…', text: `Desde ${r.device}`, mood: 'thinking' });
            else { if (r.fields) setFieldError(form, r.fields); toast({ title: 'No se pudo probar', text: r.error, mood: 'sad', sound: 'bad' }); }
          } catch (e) { toast({ title: 'No se pudo', text: e.message, mood: 'sad' }); }
          btn.disabled = false;
        });
      }
    });
  }

  async function openWaSettings() {
    let data;
    try { data = await api('/messaging'); } catch (e) { return toast({ title: 'No se pudo abrir', text: e.message, mood: 'sad' }); }
    const c = data.config;
    let mode = c.wa_mode || 'LINK';
    const explain = m => (m === 'API'
      ? 'Los avisos se envían solos desde el número de WhatsApp Business del colegio, con la <b>API oficial de Meta</b>. Necesitas una cuenta de Meta Business y una plantilla aprobada.'
      : 'N.A.V.I prepara cada mensaje y tú lo envías con <b>un toque</b> desde tu propio WhatsApp. No necesita configurar nada y funciona desde hoy.');
    openSheet({
      title: 'WhatsApp',
      left: `<button class="btn btn-plain" data-close>Cancelar</button>`,
      right: `<button class="btn btn-plain" id="saveWa" style="font-weight:600">Guardar</button>`,
      body: `
        <form id="waForm" novalidate autocomplete="off">
          <div class="notif-hero">${ico('chat', 'green')}<div><b>WhatsApp a representantes</b><small>El canal que más leen los padres</small></div></div>
          <div id="waSeg" style="margin-bottom:10px">${segHtml([['LINK', 'Un toque'], ['API', 'Automático']], mode, 'waMode')}</div>
          <p class="group-foot" id="waExplain" style="padding-top:0;margin-bottom:6px">${explain(mode)}</p>
          <div class="group" style="margin-top:14px">
            <div class="cell has-icon">${ico('bell', 'red')}<div class="grow"><div class="t">También en lo urgente</div><div class="s" style="white-space:normal">Ausencias y emergencias van por WhatsApp aunque el correo haya llegado</div></div><label class="switch"><input type="checkbox" name="wa_urgent" ${c.wa_urgent ? 'checked' : ''}><span></span></label></div>
          </div>
          <div class="api-only ${mode === 'API' ? '' : 'hidden'}">
            <div class="group-title">API de WhatsApp Cloud</div>
            <div class="group">
              ${frow('wa_phone_id', 'Phone ID', { value: c.wa_phone_id, placeholder: '1234567890', attrs: 'inputmode="numeric" class="mono"' })}
              ${frow('wa_token', 'Token', { type: 'password', placeholder: c.wa_token_set ? '•••• guardado (deja vacío)' : 'EAAG…', attrs: 'autocomplete="new-password" spellcheck="false"' })}
              ${frow('wa_template', 'Plantilla', { value: c.wa_template, placeholder: 'navi_aviso', attrs: 'class="mono" autocapitalize="off" spellcheck="false"' })}
              ${frow('wa_lang', 'Idioma', { value: c.wa_lang, placeholder: 'es', attrs: 'class="mono" autocapitalize="off"' })}
            </div>
            <ol class="steps">
              <li>Entra a <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener">developers.facebook.com</a>, crea una app de tipo <b>Empresa</b> y agrega <b>WhatsApp</b>.</li>
              <li>Copia el <b>Phone number ID</b> y crea un <b>token permanente</b> (usuario del sistema en Meta Business).</li>
              <li>Crea una plantilla de categoría <b>Utilidad</b> llamada <span class="mono">navi_aviso</span> con el texto: <span class="mono">Hola {{1}}, {{2}}</span></li>
              <li>Cuando Meta la apruebe, pruébala aquí abajo.</li>
            </ol>
          </div>
          <div class="group-title">Probar</div>
          <div class="group">
            ${frow('to', 'Celular', { type: 'tel', placeholder: '09XXXXXXXX', addon: '<button type="button" class="btn btn-tinted btn-sm" id="testWa">Probar</button>' })}
          </div>
          <div id="waTest"></div>
          <p class="group-foot">Formatos válidos: 0991234567, 991234567 o +593 99 123 4567. Para otros países escribe el + y el código.</p>
        </form>`,
      onMount(el) {
        const form = $('#waForm', el);
        $('#waSeg', el).addEventListener('click', e => {
          const b = e.target.closest('[data-act=waMode]');
          if (!b) return;
          mode = b.dataset.k;
          segSelect(b);
          $('.api-only', el).classList.toggle('hidden', mode !== 'API');
          $('#waExplain', el).innerHTML = explain(mode);
          haptic(5);
        });
        const body = () => {
          const v = Object.fromEntries(new FormData(form));
          const out = { wa_mode: mode, wa_urgent: form.wa_urgent.checked, wa_phone_id: v.wa_phone_id, wa_template: v.wa_template, wa_lang: v.wa_lang };
          if (v.wa_token) out.wa_token = v.wa_token;
          return out;
        };
        $('#saveWa', el).addEventListener('click', async ev => {
          const btn = ev.currentTarget;
          const b = body();
          if (mode === 'API' && (!b.wa_phone_id || (!b.wa_token && !c.wa_token_set))) { setFieldError(form, !b.wa_phone_id ? ['wa_phone_id'] : ['wa_token']); return toast({ title: 'Faltan datos de la API', mood: 'confused', sound: 'warn' }); }
          btn.disabled = true;
          try {
            const r = await api('/messaging', { method: 'PUT', body: b });
            S.channels = r.status;
            c.wa_token_set = r.config.wa_token_set;
            toast({ title: 'WhatsApp guardado', text: r.status.whatsapp === 'API' ? 'Modo automático' : 'Modo un toque', mood: 'happy', sound: 'success' });
            closeSheet();
            if (S.view === 'ajustes') renderView();
          } catch (e) { setFieldError(form, e.fields || []); toast({ title: 'No se pudo guardar', text: e.message, mood: 'sad' }); }
          btn.disabled = false;
        });
        $('#testWa', el).addEventListener('click', async ev => {
          const btn = ev.currentTarget;
          const to = form.to.value.trim();
          if (!to) { setFieldError(form, ['to']); return; }
          btn.disabled = true;
          $('#waTest', el).innerHTML = '';
          try {
            const saved = await api('/messaging', { method: 'PUT', body: body() });
            c.wa_token_set = saved.config.wa_token_set;
            const r = await api('/messaging/test', { method: 'POST', body: { channel: 'whatsapp', to } });
            if (r.link) $('#waTest', el).innerHTML = `<a class="btn btn-wa btn-lg" style="margin-top:12px" href="${esc(r.link)}" target="_blank" rel="noopener">${icon('chat')} Abrir WhatsApp</a>`;
            else $('#waTest', el).innerHTML = stateBox(true, `Enviado a <b>+${esc(r.to)}</b>. Revisa ese WhatsApp.`);
            setFieldError(form, [], false);
            SFX.play('success');
          } catch (e) {
            setFieldError(form, e.fields || [], false);
            $('#waTest', el).innerHTML = stateBox(false, esc(e.message)) + (e.data && e.data.link ? `<a class="btn btn-wa btn-lg" style="margin-top:10px" href="${esc(e.data.link)}" target="_blank" rel="noopener">Enviar con un toque</a>` : '');
            SFX.play('error');
          }
          btn.disabled = false;
        });
      }
    });
  }

  function filterSeg() {
    const counts = { ALL: S.records.length, A_TIEMPO: 0, TARDE: 0, AUSENTE: 0, REVISAR: 0 };
    for (const r of S.records) { counts[r.status] = (counts[r.status] || 0) + 1; if (r.review_state === 'PENDIENTE') counts.REVISAR++; }
    return segHtml([['ALL', 'Todos'], ['A_TIEMPO', 'Puntual'], ['TARDE', 'Atraso'], ['AUSENTE', 'Ausente'], ['REVISAR', 'Revisar']].map(([k, l]) => [k, l, mobile() ? null : counts[k] || 0]), S.filter, 'filter');
  }

  function riskHtml() {
    const list = S.risk || [];
    if (!list.length) return '';
    const heart = on => `<svg viewBox="0 0 24 24" class="${on ? 'on' : ''}"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>`;
    const course = id => (S.courses.find(c => c.id === id) || {}).code || '';
    return `<div class="section-title">Alerta temprana <small>Faltas seguidas sin justificar</small></div>
      <div class="group">${list.slice(0, 8).map(r => `<button type="button" class="cell has-av risk-row" data-act="student" data-id="${r.student_id}">${avatar({ ...r, mascot_dead_on: r.dead ? r.dead_on : null })}<div class="grow"><div class="t">${esc(r.first_name)} ${esc(r.last_name)} <small style="color:var(--text-2)">${esc(course(r.course_id))}</small></div><div class="s">${r.dead ? `${r.run} faltas seguidas · su mascota se fue` : `${r.run} faltas seguidas · ${r.health === 1 ? 'último corazón' : `quedan ${r.health} corazones`}`}</div></div><div class="hearts-mini">${Array.from({ length: 5 }, (_, i) => heart(i < r.health)).join('')}</div></button>`).join('')}</div>
      <p class="group-foot">Justifica las faltas que tengan respaldo (art. 170 del Reglamento a la LOEI) y conversa con el DECE sobre los demás casos. Con 5 faltas seguidas se avisa al representante.</p>`;
  }

  const VIEWS = {};

  function setupHtml() {
    if (S.demo || store.get('navi_setup_hide') === '1') return '';
    const steps = [
      [S.courses.length > 0, 'Crea tu primer curso', isAdmin() ? 'Ajustes → Nuevo curso, con su hora de entrada' : 'Pídeselo al administrador del colegio', 'ajustes', 'calendar', 'red'],
      [S.students.length > 0, 'Agrega a tus estudiantes', 'Con su representante y el número de su tarjeta o llavero', 'alumnos', 'users', 'blue'],
      [S.terminals.some(t => t.kind !== 'CAMARA'), 'Conecta el lector del aula', 'Copia la configuración en el firmware del ESP32', 'terminal', 'nfc', 'graphite'],
      [S.students.some(x => x.card_ver > 0), 'Graba las tarjetas', 'Estudiante → Tarjeta y acceso → Tarjeta nueva con el lector', 'alumnos', 'shield', 'green']
    ];
    const done = steps.filter(x => x[0]).length;
    if (done === steps.length) return '';
    return `<div class="section-title">Primeros pasos <small>${done} de ${steps.length}</small></div>
      <div class="group setup">${steps.map(([ok, t, sub, v, ic, col]) => `<button class="cell has-icon ${ok ? 'done' : ''}" data-act="go" data-v="${v}">${ok ? ico('check', 'green') : ico(ic, col)}<div class="grow"><div class="t">${t}</div><div class="s">${ok ? 'Listo' : sub}</div></div>${ok ? '' : icon('chevron', 'chev')}</button>`).join('')}
      <button class="cell center" data-act="hideSetup">Ocultar</button></div>`;
  }
  handlers.hideSetup = () => { store.set('navi_setup_hide', '1'); renderView(); };

  VIEWS.inicio = {
    html() {
      const install = S.installPrompt ? `<div class="group" style="margin-top:14px"><div class="cell has-icon">${ico('download', 'blue')}<div class="grow"><div class="t b">Instala N.A.V.I</div><div class="s">Ábrela como una app desde tu pantalla de inicio.</div></div><button class="btn btn-primary btn-sm" data-act="install">Instalar</button></div></div>` : '';
      return `
        <div class="page-head"><div><div class="eyebrow">${esc(eyebrowDate())}</div><h1>${greeting()}, ${esc(firstName(S.user.name))}</h1></div>
        <div class="actions"><button class="btn btn-sos keep" data-act="sos">${icon('medical')} Emergencia</button><button class="btn btn-primary" data-act="go" data-v="lista">${icon('list')} Pasar lista</button></div></div>
        <div id="setupBox">${setupHtml()}</div>
        <div class="hero" id="hero">${heroHtml()}</div>
        ${install}
        <div class="section-title">Cursos <small>Hoy</small></div>
        <div class="grid courses" id="courseCards">${coursesHtml()}</div>
        <div id="riskBox">${riskHtml()}</div>
        <div class="grid two" style="margin-top:8px">
          <div><div class="section-title">En vivo <span class="conn ${S.online ? 'on' : 'off'}"></span></div><div id="feedSeg" style="margin-bottom:10px">${filterSeg()}</div><div class="group" id="feed">${feedRows()}</div></div>
          <div><div class="section-title">Avisos <span id="waHead">${waHead()}</span></div><div class="group" id="notifs">${notifRows()}</div></div>
        </div>`;
    },
    update() {
      const set = (id, html) => { const el = $('#' + id); if (el) el.innerHTML = html; };
      set('hero', heroHtml());
      set('courseCards', coursesHtml());
      set('setupBox', setupHtml());
      set('riskBox', riskHtml());
      set('feedSeg', filterSeg());
      set('feed', feedRows());
      set('notifs', notifRows());
      set('waHead', waHead());
    }
  };
  handlers.notif = el => openNotif(Number(el.dataset.id));
  handlers.waQueue = () => openWaQueue();
  handlers.filter = el => {
    S.filter = el.dataset.k;
    haptic(5);
    segSelect(el);
    const f = $('#feed');
    if (f) f.innerHTML = feedRows();
  };
  handlers.install = async () => {
    if (!S.installPrompt) return;
    S.installPrompt.prompt();
    await S.installPrompt.userChoice;
    S.installPrompt = null;
    renderView();
  };

  handlers.record = el => {
    const id = Number(el.dataset.id);
    const r = S.records.find(x => x.id === id) || S.review.find(x => x.id === id);
    if (!r) return;
    const reasons = r.review_reasons.length ? `<div class="group-title">Motivos de revisión</div><div class="reasons">${r.review_reasons.map(x => `<div class="reason">${icon('alert')}<span>${esc(x.text)}</span></div>`).join('')}</div>` : '';
    const inClass = r.in_class === 0 ? '<span class="pill p-abs">Fuera del aula</span>' : r.in_class === 1 ? '<span class="pill p-ok">Visto en el aula</span>' : '';
    openSheet({
      title: r.student_name,
      body: `
        <div class="group" style="margin-top:6px">
          <div class="cell has-av-lg" style="padding:12px 16px">${avatar(r, 'av-lg')}<div class="grow"><div class="t b" style="font-size:17px">${esc(r.student_name)}</div><div class="s">${esc(r.course_name)}</div><div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">${statusPill(r)}${reviewPill(r)}${inClass}</div></div></div>
          <div class="cell"><div class="grow t">Hora</div><div class="v tnum">${hhmm(r.time_recorded)}</div></div>
          <div class="cell"><div class="grow t">Origen</div><div class="v">${SOURCE[r.source] || r.source}</div></div>
          ${r.card_verified != null ? `<div class="cell"><div class="grow t">Tarjeta</div><div class="v">${r.card_verified ? '<span class="pill p-ok">Firma verificada</span>' : '<span class="pill p-abs">Sin firma válida</span>'}</div></div>` : ''}
          ${r.justified ? `<div class="cell"><div class="grow"><div class="t">Justificada</div><div class="s" style="white-space:normal">${esc(r.justification || 'Sin detalle')}</div></div><span class="pill p-info">LOEI art. 170</span></div>` : ''}
          ${r.terminal_id ? `<div class="cell"><div class="grow t">Lector</div><div class="v">${esc(r.terminal_id)}</div></div>` : ''}
        </div>
        <div class="group-title">Fotos</div>${photosHtml(r)}${reasons}`,
      foot: r.review_state === 'PENDIENTE' ? `<button class="btn btn-gray" style="flex:1" data-sheet-decide="OK">${icon('check')} Todo bien</button><button class="btn btn-danger" style="flex:1" data-sheet-decide="FRAUDE">${icon('x')} Suplantación</button>` : r.status !== 'A_TIEMPO' ? `<button class="btn btn-gray" style="flex:1" id="justBtn">${icon('heart')} ${r.justified ? 'Justificada · editar' : 'Justificar'}</button>` : '',
      onMount(sheet) {
        const jb = $('#justBtn', sheet);
        if (jb) jb.addEventListener('click', () => { closeSheet(true); openJustify(r); });
        $$('[data-sheet-decide]', sheet).forEach(b => b.addEventListener('click', () => decide(r.id, b.dataset.sheetDecide).then(() => closeSheet())));
      }
    });
  };

  function photosHtml(r) {
    const face = r.face_photo ? `<img src="${faceUrl(r.student_id, r.face_photo)}" alt="">` : 'Sin foto de matrícula';
    const snap = r.snapshot_photo ? `<img src="${snapUrl(r.id)}" alt="">` : r.source === 'NFC' ? 'Sin foto al marcar' : 'Registro sin cámara';
    return `<div class="photos"><div class="photo">${face}<span>Matrícula</span></div><div class="photo">${snap}<span>Al marcar ${hhmm(r.time_recorded)}</span></div></div>`;
  }

  async function decide(id, decision) {
    try {
      const r = await api(`/review/${id}`, { method: 'POST', body: { decision } });
      upsertRecord(r);
      refreshStats();
      softRefresh();
      haptic(decision === 'OK' ? 10 : [15, 30, 15]);
      toast(decision === 'OK' ? { sound: 'success', title: 'Registro confirmado', text: r.student_name, mood: 'happy' } : { sound: 'warn', title: 'Suplantación confirmada', text: `${r.student_name} queda ausente. Se avisó al representante.`, mood: 'angry' });
    } catch (e) {
      toast({ title: 'No se pudo guardar', text: e.message, mood: 'sad' });
    }
  }

  function rollData(courseId) {
    const byStudent = new Map(S.records.map(r => [r.student_id, r]));
    return S.students.filter(s => s.course_id === courseId).map(s => {
      const r = byStudent.get(s.id) || null;
      const def = r ? (r.in_class === 0 ? false : r.in_class === 1 ? true : r.status === 'A_TIEMPO' || r.status === 'TARDE') : false;
      const inClass = S.rollEdits.has(s.id) ? S.rollEdits.get(s.id) : def;
      return { s, r, inClass };
    });
  }

  function rollTiles(data) {
    if (!data.length) return `<div style="grid-column:1/-1;border-radius:18px;overflow:hidden">${emptyHtml('confused', 'Este curso no tiene estudiantes', 'Agrégalos desde Estudiantes.')}</div>`;
    return data.map(({ s, r, inClass }) => {
      const st = r ? (r.status === 'AUSENTE' ? (r.source === 'AUTO' ? 'Ausente (auto)' : 'Ausente') : `${STATUS[r.status].label} ${hhmm(r.time_recorded)}`) : 'Sin marcar';
      const flag = r && r.review_state === 'PENDIENTE';
      return `<button class="tile ${inClass ? '' : 'out'} ${flag ? 'flag' : ''}" data-act="toggle" data-id="${s.id}" aria-pressed="${inClass}">
        <span class="mark">${icon(inClass ? 'check' : 'x')}</span>${s.has_allergy || s.has_condition ? `<span class="med-dot ${s.severe_allergy ? 'grave' : ''}" title="Ficha médica">${icon('medical')}</span>` : ''}${avatar(s)}<span class="nm">${esc(s.first_name)}<br>${esc(s.last_name)}</span><span class="st">${flag ? '<b style="color:var(--purple)">Revisar · </b>' : ''}${st}</span></button>`;
    }).join('');
  }

  function rollSummary(data) {
    const inside = data.filter(d => d.inClass).length;
    const changes = data.filter(d => S.rollEdits.has(d.s.id)).length;
    return `<div class="sum">En el aula <b>${inside}</b> · Fuera <b>${data.length - inside}</b>${changes ? ` · ${changes} cambio${changes > 1 ? 's' : ''}` : ''}</div>`;
  }

  VIEWS.lista = {
    html() {
      if (S.params.c) S.rollCourse = Number(S.params.c);
      if (!S.rollCourse && S.courses[0]) S.rollCourse = S.courses[0].id;
      S.rollStart = Date.now();
      const c = S.courses.find(x => x.id === S.rollCourse);
      const data = c ? rollData(c.id) : [];
      if (!S.courses.length) return `<div class="page-head"><div><h1>Pase de lista</h1></div></div><div class="group">${emptyHtml('sleepy', 'Aún no hay cursos', isAdmin() ? 'Crea el primero en Ajustes → Nuevo curso.' : 'Pídele al administrador que cree tu curso.')}</div>`;
      return `
        <div class="page-head"><div><div class="eyebrow">${c ? esc(c.name) : ''}</div><h1>Pase de lista</h1><p>Mira el salón y toca solo a quien <b>no</b> está. Los demás ya vienen marcados por su tarjeta.</p></div>
        <div class="actions"><span class="timer" id="rollTimer">${icon('clock')} 0:00</span><button class="btn btn-gray btn-sm keep" data-act="allIn">Todos en el aula</button></div></div>
        <div class="chips" style="margin-bottom:12px">${S.courses.map(x => `<button class="chip ${x.id === S.rollCourse ? 'on' : ''}" data-act="rollCourse" data-id="${x.id}">${esc(x.code)} <span class="n">${x.present}/${x.total_students}</span></button>`).join('')}</div>
        ${c ? `<p class="group-foot" style="padding:0 2px 12px">Entrada ${esc(c.schedule_start)} · atraso después de ${c.late_tolerance_min} min · ausente después de ${c.absent_limit_min} min</p>` : ''}
        <div class="grid roll" id="roll">${rollTiles(data)}</div>
        <div class="roll-bar" id="rollBar">${rollSummary(data)}<button class="btn btn-green" data-act="confirmRoll" ${data.length ? '' : 'disabled'}>${icon('check')} Confirmar</button></div>`;
    },
    mount() {
      const iv = setInterval(() => {
        const el = $('#rollTimer');
        if (!el) return;
        const s = Math.floor((Date.now() - S.rollStart) / 1000);
        el.innerHTML = `${icon('clock')} ${Math.floor(s / 60)}:${pad(s % 60)}`;
      }, 1000);
      return () => clearInterval(iv);
    },
    update() {
      const data = rollData(S.rollCourse);
      const roll = $('#roll');
      if (roll) roll.innerHTML = rollTiles(data);
      const bar = $('#rollBar .sum');
      if (bar) bar.outerHTML = rollSummary(data);
    }
  };
  handlers.rollCourse = el => { S.rollCourse = Number(el.dataset.id); S.rollEdits.clear(); go('lista', { c: el.dataset.id }); };
  handlers.toggle = el => {
    haptic(6);
    const id = Number(el.dataset.id);
    const d = rollData(S.rollCourse).find(x => x.s.id === id);
    if (!d) return;
    const now = !d.inClass;
    S.rollEdits.set(id, now);
    el.classList.toggle('out', !now);
    el.setAttribute('aria-pressed', String(now));
    el.querySelector('.mark').innerHTML = icon(now ? 'check' : 'x');
    const bar = $('#rollBar .sum');
    if (bar) bar.outerHTML = rollSummary(rollData(S.rollCourse));
  };
  handlers.allIn = () => {
    for (const d of rollData(S.rollCourse)) S.rollEdits.set(d.s.id, true);
    VIEWS.lista.update();
  };
  handlers.confirmRoll = async el => {
    const data = rollData(S.rollCourse);
    el.disabled = true;
    try {
      await api(`/roll/${S.rollCourse}/confirm`, { method: 'POST', body: { students: data.map(d => ({ id: d.s.id, in_class: d.inClass })) } });
      const secs = Math.max(1, Math.round((Date.now() - S.rollStart) / 1000));
      const out = data.filter(d => !d.inClass).length;
      const flagged = data.filter(d => !d.inClass && d.r && (d.r.status === 'A_TIEMPO' || d.r.status === 'TARDE')).length;
      S.rollEdits.clear();
      const [records, review] = await Promise.all([api('/attendance'), api('/review')]);
      S.records = records;
      S.review = review;
      refreshStats();
      VIEWS.lista.update();
      updateBadges();
      haptic([10, 40, 10]);
      toast({ sound: 'success', title: `Lista confirmada en ${secs} s`, text: flagged ? `${flagged} marcó tarjeta pero no está: queda para revisión.` : out ? `${out} ausente${out > 1 ? 's' : ''}. Se avisa a sus representantes.` : '¡Todos presentes!', mood: flagged ? 'surprised' : 'happy', ms: 5000 });
    } catch (e) {
      toast({ title: 'No se pudo confirmar', text: e.message, mood: 'sad' });
    }
    el.disabled = false;
  };

  VIEWS.revision = {
    html() {
      return `<div class="page-head"><div><div class="eyebrow" id="revCount">${this.count()}</div><h1>Revisión</h1><p>Solo aparecen los registros con algo raro. Compara las fotos y decide en segundos.</p></div></div><div id="reviewList">${this.list()}</div>`;
    },
    count() {
      return S.review.length ? `${S.review.length} pendiente${S.review.length > 1 ? 's' : ''}` : 'Al día';
    },
    list() {
      if (!S.review.length) return `<div class="group">${emptyHtml('happy', 'Nada que revisar', 'Cuando un registro parezca sospechoso aparecerá aquí con sus fotos y el motivo.')}</div>`;
      return `<div class="grid reviews">${S.review.map(r => `
        <div class="review-card">
          <div class="review-top">${avatar(r)}<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:16px;letter-spacing:-.02em">${esc(r.student_name)}</div><div style="font-size:13px;color:var(--text-2)">${esc(r.course_code)} · ${r.date === todayStr() ? 'Hoy' : esc(r.date)} ${hhmm(r.time_recorded)}</div></div>${statusPill(r)}</div>
          ${photosHtml(r)}
          <div class="reasons">${r.review_reasons.map(x => `<div class="reason">${icon('alert')}<span>${esc(x.text)}</span></div>`).join('')}</div>
          <div class="review-actions"><button class="btn btn-gray" data-act="decide" data-id="${r.id}" data-d="OK">${icon('check')} Todo bien</button><button class="btn btn-danger" data-act="decide" data-id="${r.id}" data-d="FRAUDE">${icon('x')} Suplantación</button></div>
        </div>`).join('')}</div>`;
    },
    update() {
      const el = $('#reviewList');
      if (el) el.innerHTML = this.list();
      const eb = $('#revCount');
      if (eb) eb.textContent = this.count();
    }
  };
  handlers.decide = el => {
    if (el.dataset.d === 'FRAUDE') return confirmTap(el, '¿Seguro? Toca otra vez', () => decide(Number(el.dataset.id), 'FRAUDE'));
    decide(Number(el.dataset.id), 'OK');
  };

  function studentRows() {
    const q = S.query.trim().toLowerCase();
    let list = S.students;
    if (S.studentCourse) list = list.filter(s => s.course_id === S.studentCourse);
    if (q) list = list.filter(s => `${s.first_name} ${s.last_name} ${s.nfc_uid} ${s.student_code} ${s.parent_name || ''}`.toLowerCase().includes(q));
    if (!list.length) return emptyHtml('confused', q ? 'Sin resultados' : 'Sin estudiantes', q ? 'Prueba con otro nombre o UID.' : 'Agrega el primero con el botón +.');
    let html = '';
    let letter = '';
    for (const s of list) {
      const L = (s.last_name || '#')[0].toUpperCase();
      if (L !== letter) { letter = L; html += `<div class="letter">${esc(L)}</div>`; }
      html += `<button class="cell has-av" data-act="student" data-id="${s.id}">${avatar(s, 'av-sm')}<div class="grow"><div class="t"><b>${esc(s.last_name)}</b> ${esc(s.first_name)}</div><div class="s">${esc(s.course_code)} · <span class="mono">${esc(s.nfc_uid)}</span></div></div>${medBadge(s)}${s.telegram_linked ? '<span class="pill p-info">Telegram</span>' : ''}${icon('chevron', 'chev')}</button>`;
    }
    return html;
  }

  VIEWS.alumnos = {
    html() {
      return `
        <div class="page-head"><div><div class="eyebrow" id="stuCount">${S.students.length} registrados</div><h1>Estudiantes</h1></div><div class="actions"><button class="icon-btn keep sos-icon" data-act="sos" aria-label="Emergencia médica">${icon('medical')}</button><button class="icon-btn keep" style="background:var(--blue-t)" data-act="newStudent" aria-label="Nuevo estudiante">${icon('plus')}</button></div></div>
        <div class="toolbar"><label class="search">${icon('search')}<input data-input="search" type="search" placeholder="Buscar" value="${esc(S.query)}" autocomplete="off"></label></div>
        <div class="chips" style="margin-bottom:12px" id="stuChips">${this.chips()}</div>
        <div class="group" id="studentList">${studentRows()}</div>`;
    },
    chips() {
      return `<button class="chip ${!S.studentCourse ? 'on' : ''}" data-act="stuCourse" data-id="0">Todos</button>` + S.courses.map(c => `<button class="chip ${S.studentCourse === c.id ? 'on' : ''}" data-act="stuCourse" data-id="${c.id}">${esc(c.code)} <span class="n">${c.total_students}</span></button>`).join('');
    },
    update() {
      const el = $('#studentList');
      if (el) el.innerHTML = studentRows();
      const ch = $('#stuChips');
      if (ch) ch.innerHTML = this.chips();
      const p = $('#stuCount');
      if (p) p.textContent = `${S.students.length} registrados`;
    }
  };
  handlers.search = el => { S.query = el.value; const l = $('#studentList'); if (l) l.innerHTML = studentRows(); };
  handlers.stuCourse = el => { S.studentCourse = Number(el.dataset.id); haptic(5); VIEWS.alumnos.update(); };
  handlers.newStudent = () => openStudentSheet(null);
  handlers.sos = () => openEmergency();
  handlers.student = el => openStudentSheet(S.students.find(s => s.id === Number(el.dataset.id)));

  function resizeToDataUrl(source, sw, sh, size = 360) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const side = Math.min(sw, sh);
    c.getContext('2d').drawImage(source, (sw - side) / 2, (sh - side) / 2, side, side, 0, 0, size, size);
    return c.toDataURL('image/jpeg', 0.84);
  }

  function openStudentSheet(s, preset = {}) {
    const isNew = !s;
    const v = { first_name: '', last_name: '', course_id: S.rollCourse || (S.courses[0] && S.courses[0].id), nfc_uid: '', parent_name: '', parent_phone: '', parent_email: '', ...(s || {}), ...preset };
    let photo;
    let stream = null;
    let listenTimer = 0;
    const initials = () => esc(`${(v.first_name || '?')[0] || ''}${(v.last_name || '')[0] || ''}`.toUpperCase());
    const preview = () => (photo ? `<div class="av"><img src="${photo}" alt=""></div>` : photo === null || !v.face_photo ? `<div class="av" style="background:linear-gradient(160deg, ${colorFor(v.id || 1)}CC, ${colorFor(v.id || 1)})">${initials()}</div>` : avatar(v));
    openSheet({
      title: isNew ? 'Nuevo estudiante' : 'Estudiante',
      left: `<button class="btn btn-plain" data-close>Cancelar</button>`,
      right: `<button class="btn btn-plain" id="saveStu" style="font-weight:600">${isNew ? 'Agregar' : 'Guardar'}</button>`,
      body: `
        <form id="stuForm" novalidate>
          <div class="photo-pick"><div id="pp">${preview()}</div><div class="btns"><button type="button" class="btn btn-gray btn-sm" id="camBtn">${icon('camera')} Tomar foto</button><label class="btn btn-gray btn-sm">${icon('upload')} Subir<input type="file" accept="image/*" id="fileIn" hidden></label><button type="button" class="btn btn-plain btn-sm" id="rmPhoto">Quitar</button></div></div>
          <div id="capture" class="capture hidden"><video playsinline muted autoplay></video><button type="button" class="shoot" aria-label="Capturar"></button></div>
          <div class="group">
            ${frow('first_name', 'Nombres', { value: v.first_name, placeholder: 'Obligatorio' })}
            ${frow('last_name', 'Apellidos', { value: v.last_name, placeholder: 'Obligatorio' })}
            <label class="frow"><span>Curso</span><select name="course_id">${S.courses.map(c => `<option value="${c.id}" ${c.id === Number(v.course_id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
          </div>
          <div class="group-title">Tarjeta NFC</div>
          <div class="group">
            ${frow('nfc_uid', 'UID', { value: v.nfc_uid, placeholder: '04A1B2C3', attrs: 'class="mono" autocapitalize="characters" spellcheck="false" autocomplete="off"', addon: `<button type="button" class="btn btn-tinted btn-sm" id="readCard">${icon('nfc')} Leer</button>` })}
          </div>
          <div id="listenBox"></div>
          <div class="group-title">Representante</div>
          <div class="group">
            ${frow('parent_name', 'Nombre', { value: v.parent_name, placeholder: 'Opcional' })}
            ${frow('parent_phone', 'Celular', { type: 'tel', value: v.parent_phone, placeholder: '09…' })}
            ${frow('parent_email', 'Correo', { type: 'email', value: v.parent_email, placeholder: 'Opcional', attrs: 'autocapitalize="off"' })}
          </div>
          <p class="group-foot">La foto solo se usa para que el docente compare en la revisión. No se hace reconocimiento facial.</p>
          ${!isNew && v.mascot != null && window.NaviMascots ? `<div class="group-title">Mascota</div><div class="group"><div class="cell has-av-lg" style="padding:10px 16px"><div class="av av-m av-lg">${NaviBots.svg(NaviMascots.key(v.mascot), 'happy')}</div><div class="grow"><div class="t b">${esc(mascotName(v))}</div><div class="s">Mascota ${NaviMascots.info(v.mascot).number} de 40 · ${esc(NaviMascots.describe(v.mascot))}</div></div></div></div>` : ''}
          ${!isNew ? `<div class="group-title">Tarjeta del estudiante</div><div class="group"><button type="button" class="cell has-icon" id="cardTools">${ico('shield', 'green')}<div class="grow"><div class="t">Tarjeta y acceso</div><div class="s">${v.card_ver ? 'Credencial cifrada activa' : 'Grabar credencial para que entre con su tarjeta'}${v.has_pin ? ' · PIN creado' : ''}</div></div>${icon('chevron', 'chev')}</button></div>` : ''}
          ${!isNew ? `<div class="group-title">Salud</div><div class="group">
            <button type="button" class="cell has-icon" id="openHealth">${ico('medical', 'red')}<div class="grow"><div class="t">Ficha médica</div><div class="s">${v.has_health ? (v.health_public ? 'Activa en la tarjeta' : 'Guardada, sin acceso con la tarjeta') : 'Alergias, condiciones y contactos'}</div></div>${medBadge(v)}${icon('chevron', 'chev')}</button>
            ${v.has_health ? `<button type="button" class="cell has-icon" id="viewHealth">${ico('eye', 'pink')}<div class="grow t">Ver ficha de emergencia</div>${icon('chevron', 'chev')}</button>` : ''}
          </div><div class="group" id="links" style="margin-top:22px"></div><div class="group" style="margin-top:22px"><button type="button" class="cell center danger" id="delStu">Desactivar estudiante</button></div>` : ''}
        </form>`,
      onClose() {
        if (stream) stream.getTracks().forEach(t => t.stop());
        clearTimeout(listenTimer);
        S.listenUid = null;
      },
      onMount(el) {
        const form = $('#stuForm', el);
        const stopStream = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } $('#capture', el).classList.add('hidden'); };
        $('#camBtn', el).addEventListener('click', async () => {
          if (stream) return stopStream();
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
            $('#capture video', el).srcObject = stream;
            $('#capture', el).classList.remove('hidden');
          } catch (e) {
            toast({ title: 'No pude abrir la cámara', text: window.isSecureContext ? 'Revisa los permisos del navegador.' : 'La cámara solo funciona en localhost o HTTPS. Usa "Subir".', mood: 'sad' });
          }
        });
        $('#capture .shoot', el).addEventListener('click', () => {
          const video = $('#capture video', el);
          photo = resizeToDataUrl(video, video.videoWidth, video.videoHeight);
          $('#pp', el).innerHTML = preview();
          haptic(10);
          stopStream();
        });
        $('#fileIn', el).addEventListener('change', e => {
          const file = e.target.files[0];
          if (!file) return;
          const img = new Image();
          img.onload = () => { photo = resizeToDataUrl(img, img.naturalWidth, img.naturalHeight); $('#pp', el).innerHTML = preview(); URL.revokeObjectURL(img.src); };
          img.src = URL.createObjectURL(file);
        });
        $('#rmPhoto', el).addEventListener('click', () => { photo = null; $('#pp', el).innerHTML = preview(); });
        $('#readCard', el).addEventListener('click', e => {
          e.preventDefault();
          const box = $('#listenBox', el);
          box.innerHTML = `<div class="listen"><span class="pulse"></span>Acerca la tarjeta al lector${S.demo ? ' (o usa "Tarjeta nueva" en el simulador)' : ''}…</div>`;
          clearTimeout(listenTimer);
          S.listenUid = uid => {
            form.nfc_uid.value = uid;
            box.innerHTML = `<div class="listen" style="background:var(--green-t);color:var(--green)">${icon('check')} Tarjeta leída: <span class="mono">${esc(uid)}</span></div>`;
            S.listenUid = null;
            haptic(12);
            sound('ok');
          };
          listenTimer = setTimeout(() => { S.listenUid = null; box.innerHTML = ''; }, 30000);
        });
        if (!isNew) {
          $('#openHealth', el).addEventListener('click', () => { closeSheet(true); openHealthEditor(v); });
          $('#cardTools', el).addEventListener('click', () => { closeSheet(true); openCardTools(v); });
          const vh = $('#viewHealth', el);
          if (vh) vh.addEventListener('click', () => { closeSheet(true); openMedicalView(v.id); });
          api(`/students/${v.id}/links`).then(l => {
            const box = $('#links', el);
            if (!box) return;
            const rows = [];
            if (v.parent_email || v.parent_phone || v.telegram_linked) rows.push(`<button type="button" class="cell has-icon" id="msgStu">${ico('send', 'indigo')}<div class="grow"><div class="t">Enviar mensaje al representante</div><div class="s">Reunión, recordatorio, felicitación…</div></div>${icon('chevron', 'chev')}</button>`);
            if (l.whatsapp) rows.push(`<a class="cell has-icon" href="${esc(l.whatsapp)}" target="_blank" rel="noopener">${ico('chat', 'green')}<div class="grow t">Abrir chat de WhatsApp</div>${icon('chevron', 'chev')}</a>`);
            if (l.telegram) rows.push(`<button type="button" class="cell has-icon" id="tgCopy">${ico('send', 'teal')}<div class="grow t">Copiar enlace de Telegram</div>${icon('copy', 'chev')}</button>`);
            if (!rows.length) { box.remove(); return; }
            box.innerHTML = rows.join('');
            const ms = $('#msgStu', el);
            if (ms) ms.addEventListener('click', () => { closeSheet(true); openCompose(v); });
            const tg = $('#tgCopy', el);
            if (tg) tg.addEventListener('click', () => copyText(l.telegram, 'Envíaselo al representante para que reciba avisos por Telegram.'));
          }).catch(() => {});
          $('#delStu', el).addEventListener('click', e => confirmTap(e.currentTarget, 'Toca otra vez para desactivar', async () => {
            try {
              await api(`/students/${v.id}`, { method: 'DELETE' });
              closeSheet();
              toast({ title: 'Estudiante desactivado', text: `${v.first_name} ${v.last_name}`, mood: 'sad' });
              loadStudents();
            } catch (err) { toast({ title: 'No se pudo', text: err.message, mood: 'sad' }); }
          }));
        }
        $('#saveStu', el).addEventListener('click', async ev => {
          const btn = ev.currentTarget;
          const data = Object.fromEntries(new FormData(form));
          data.course_id = Number(data.course_id);
          if (photo !== undefined) data.face_photo = photo;
          const missing = ['first_name', 'last_name', 'nfc_uid'].filter(k => !String(data[k] || '').trim());
          if (missing.length) { setFieldError(form, missing); haptic(15); return; }
          btn.disabled = true;
          try {
            const saved = isNew ? await api('/students', { method: 'POST', body: data }) : await api(`/students/${v.id}`, { method: 'PATCH', body: data });
            closeSheet();
            toast(isNew ? { title: 'Estudiante agregado', text: 'Graba su tarjeta con el lector para que tenga su credencial.', mood: 'happy', ms: 6000, action: { label: 'Grabar', fn: () => openCardTools(saved) } } : { title: 'Cambios guardados', text: `${saved.first_name} ${saved.last_name}`, mood: 'happy' });
            loadStudents();
            refreshStats();
          } catch (e) {
            btn.disabled = false;
            setFieldError(form, e.fields && e.fields.length ? e.fields : e.status === 409 ? ['nfc_uid'] : []);
            toast({ title: 'Revisa los datos', text: e.message, mood: 'confused' });
          }
        });
      }
    });
  }

  const SEV = [['LEVE', 'Leve'], ['MODERADA', 'Moderada'], ['GRAVE', 'Grave']];
  const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const medBadge = s => (s.severe_allergy ? '<span class="pill p-abs" title="Alergia grave">Alergia</span>' : s.has_allergy || s.has_condition ? '<span class="pill p-late" title="Ficha médica">Salud</span>' : '');
  const publicBase = () => S.publicUrl || location.origin;
  const isLocalBase = () => /\/\/(localhost|127\.0\.0\.1)/.test(publicBase());
  const telHref = p => 'tel:' + String(p || '').replace(/[^\d+]/g, '');

  function listEditor(kind, items, fields, addLabel) {
    const row = (it = {}) => `<div class="li" data-li="${kind}"><button type="button" class="li-del" data-del aria-label="Quitar">${icon('x')}</button><div class="li-body">${fields.map(f => f.options
      ? `<select data-k="${f.key}">${f.options.map(([v, l]) => `<option value="${v}" ${(it[f.key] || f.def) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`
      : `<input data-k="${f.key}" type="${f.type || 'text'}" value="${esc(it[f.key] || '')}" placeholder="${esc(f.ph)}" class="${f.main ? 'li-main' : ''}">`).join('')}</div></div>`;
    return `<div class="group list-edit" data-list="${kind}">${items.map(row).join('')}<button type="button" class="cell li-add" data-add="${kind}">${ico('plus', 'green')}<span class="t">${addLabel}</span></button></div><template data-tpl="${kind}">${row()}</template>`;
  }

  function readList(el, kind) {
    return $$(`[data-li="${kind}"]`, el).filter(r => !r.closest('template')).map(r => Object.fromEntries($$('[data-k]', r).map(i => [i.dataset.k, i.value.trim()])));
  }

  function drawQR(canvas, text) {
    if (typeof qrcode !== 'function') return;
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    const scale = 6;
    const pad = 3;
    canvas.width = canvas.height = (n + pad * 2) * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect((c + pad) * scale, (r + pad) * scale, scale, scale);
  }

  async function openHealthEditor(st) {
    let data;
    try { data = await api(`/students/${st.id}/health`); } catch (e) { return toast({ title: 'No se pudo abrir', text: e.message, mood: 'sad' }); }
    const h = data.health || { allergies: [], conditions: [], medications: [], contacts: st.parent_phone ? [{ name: st.parent_name || '', relation: 'Representante', phone: st.parent_phone }] : [], consent: false };
    const url = h.token ? `${publicBase()}/e/${h.token}` : '';
    const accessRows = (data.access || []).slice(0, 6).map(a => `<div class="cell has-icon">${ico(a.via === 'PUBLICO' ? 'phone' : a.via === 'LECTOR' ? 'nfc' : 'person', a.via === 'PUBLICO' ? 'red' : 'gray')}<div class="grow"><div class="t">${a.via === 'PUBLICO' ? 'Celular con la tarjeta' : a.via === 'LECTOR' ? 'Lector del aula' : 'App'}${a.user_name ? ' · ' + esc(a.user_name) : ''}</div><div class="s">${ago(a.at)}${a.ip ? ' · ' + esc(a.ip) : ''}</div></div></div>`).join('');
    openSheet({
      title: 'Ficha médica',
      left: `<button class="btn btn-plain" data-close>Cancelar</button>`,
      right: `<button class="btn btn-plain" id="saveHealth" style="font-weight:600">Guardar</button>`,
      body: `
        <form id="healthForm" novalidate>
          <div class="med-hero"><span class="med-star">${icon('medical')}</span><div><b>${esc(st.first_name)} ${esc(st.last_name)}</b><small>Información para emergencias</small></div></div>
          <div class="group">
            <label class="frow"><span>Nacimiento</span><input type="date" name="birth_date" value="${esc(h.birth_date || '')}"></label>
            <label class="frow"><span>Sangre</span><select name="blood_type"><option value="">No sé</option>${BLOOD.map(b => `<option ${h.blood_type === b ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
          </div>
          <div class="group-title">Alergias</div>
          ${listEditor('allergies', h.allergies, [{ key: 'name', ph: 'Ej. Penicilina, maní, abejas', main: true }, { key: 'severity', options: SEV, def: 'MODERADA' }, { key: 'reaction', ph: 'Reacción (opcional)' }], 'Agregar alergia')}
          <div class="group-title">Condiciones médicas</div>
          ${listEditor('conditions', h.conditions, [{ key: 'name', ph: 'Ej. Asma, diabetes, epilepsia', main: true }, { key: 'notes', ph: 'Detalles (opcional)' }], 'Agregar condición')}
          <div class="group-title">Medicamentos</div>
          ${listEditor('medications', h.medications, [{ key: 'name', ph: 'Ej. Inhalador salbutamol', main: true }, { key: 'dose', ph: 'Dosis o cuándo usarlo' }], 'Agregar medicamento')}
          <div class="group-title">Qué hacer en una emergencia</div>
          <div class="group"><textarea class="ta" name="instructions" rows="4" placeholder="Ej. Si tiene crisis de asma, sentarlo y darle su inhalador. Si no mejora en 10 minutos, llamar al 911.">${esc(h.instructions || '')}</textarea></div>
          <div class="group-title">Contactos de emergencia</div>
          ${listEditor('contacts', h.contacts, [{ key: 'name', ph: 'Nombre', main: true }, { key: 'relation', ph: 'Parentesco' }, { key: 'phone', ph: 'Celular', type: 'tel' }], 'Agregar contacto')}
          <div class="group-title">Atención médica</div>
          <div class="group">
            ${frow('doctor', 'Médico', { value: h.doctor || '', placeholder: 'Nombre y teléfono' })}
            ${frow('insurance', 'Seguro', { value: h.insurance || '', placeholder: 'IESS, privado…' })}
          </div>
          <div class="group-title">Acceso con la tarjeta</div>
          <div class="group">
            <div class="cell has-icon">${ico('shield', 'green')}<div class="grow"><div class="t">El representante lo autorizó</div><div class="s" style="white-space:normal">Cualquier persona que acerque su celular a la tarjeta verá esta ficha</div></div><label class="switch"><input type="checkbox" name="consent" ${h.consent ? 'checked' : ''}><span></span></label></div>
            ${frow('consent_by', 'Autorizó', { value: h.consent_by || st.parent_name || '', placeholder: 'Nombre del representante' })}
          </div>
          <p class="group-foot">Son datos de salud de un menor: guarda solo lo necesario para atenderlo en una emergencia. Cada vez que alguien abre la ficha se registra y se avisa al representante y al colegio.</p>
          ${url ? `
          <div class="group-title">Enlace de emergencia</div>
          <div class="group">
            <div class="qr-wrap"><canvas id="qr"></canvas><div><div class="t b">Graba este enlace en la tarjeta</div><div class="s mono" style="word-break:break-all;margin-top:4px">${esc(url)}</div>${isLocalBase() ? '<div class="s" style="color:var(--red);margin-top:6px">Usa la IP de la PC o una dirección pública (NAVI_PUBLIC_URL). "localhost" no abre en otros celulares.</div>' : ''}</div></div>
            ${NFC.available() ? `<button type="button" class="cell has-icon" id="writeNfc">${ico('nfc', 'blue')}<div class="grow"><div class="t">Grabar en la tarjeta</div><div class="s">Acerca la tarjeta a este celular</div></div>${icon('chevron', 'chev')}</button>` : ''}
            <button type="button" class="cell has-icon" id="copyUrl">${ico('copy', 'gray')}<div class="grow t">Copiar enlace</div></button>
            <a class="cell has-icon" href="${esc(url)}" target="_blank" rel="noopener">${ico('eye', 'indigo')}<div class="grow t">Ver como lo verá un rescatista</div>${icon('chevron', 'chev')}</a>
            <button type="button" class="cell has-icon" id="rotate">${ico('refresh', 'orange')}<div class="grow"><div class="t">Cambiar enlace</div><div class="s">Si perdió la tarjeta: el enlace anterior deja de funcionar</div></div></button>
          </div>
          <p class="group-foot">${NFC.available() ? '' : 'Para grabarla usa un celular Android con Chrome, o la app gratuita NFC Tools (Escribir → URL). '}Usa tarjetas NTAG213 o NTAG215: las leen iPhone y Android. El QR sirve de respaldo impreso en el carnet.</p>` : '<p class="group-foot">Guarda la ficha con la autorización activada para obtener el enlace de la tarjeta.</p>'}
          ${accessRows ? `<div class="group-title">Últimos accesos</div><div class="group">${accessRows}</div>` : ''}
        </form>`,
      onMount(el) {
        const form = $('#healthForm', el);
        if (url) drawQR($('#qr', el), url);
        el.addEventListener('click', e => {
          const del = e.target.closest('[data-del]');
          if (del) { const li = del.closest('.li'); li.classList.add('gone'); setTimeout(() => li.remove(), 220); haptic(8); return; }
          const add = e.target.closest('[data-add]');
          if (add) {
            const tpl = $(`template[data-tpl="${add.dataset.add}"]`, el);
            const node = tpl.content.firstElementChild.cloneNode(true);
            add.before(node);
            node.querySelector('input').focus();
            haptic(6);
          }
        });
        const copy = $('#copyUrl', el);
        if (copy) copy.addEventListener('click', () => copyText(url, 'Enlace de emergencia copiado.'));
        const rot = $('#rotate', el);
        if (rot) rot.addEventListener('click', e => confirmTap(e.currentTarget.querySelector('.t'), 'Toca otra vez para cambiarlo', async () => {
          try { await api(`/students/${st.id}/health/token`, { method: 'POST' }); closeSheet(true); openHealthEditor(st); toast({ title: 'Enlace cambiado', text: 'Vuelve a grabar la tarjeta.', mood: 'thinking' }); } catch (err) { toast({ title: 'No se pudo', text: err.message, mood: 'sad' }); }
        }));
        const wr = $('#writeNfc', el);
        if (wr) wr.addEventListener('click', async () => {
          try {
            const c = await api(`/students/${st.id}/credential`, { method: 'POST', body: {} });
            toast({ title: 'Acerca la tarjeta', text: 'Mantenla quieta detrás del celular.', mood: 'thinking', ms: 6000 });
            await NFC.write([{ type: 'url', data: url }, { type: 'text', data: c.cred }], st.nfc_uid);
            toast({ sound: 'success', title: 'Tarjeta grabada', text: 'Ficha de emergencia y credencial del estudiante.', mood: 'happy' });
          } catch (err) {
            toast({ title: 'No se pudo grabar', text: err.name === 'NotAllowedError' ? 'Permite el uso de NFC en el navegador.' : err.message, mood: 'sad' });
          }
        });
        $('#saveHealth', el).addEventListener('click', async ev => {
          const btn = ev.currentTarget;
          const v = Object.fromEntries(new FormData(form));
          const body = { birth_date: v.birth_date, blood_type: v.blood_type, instructions: v.instructions, doctor: v.doctor, insurance: v.insurance, consent: !!form.consent.checked, consent_by: v.consent_by, allergies: readList(el, 'allergies'), conditions: readList(el, 'conditions'), medications: readList(el, 'medications'), contacts: readList(el, 'contacts') };
          if (body.consent && !String(body.consent_by || '').trim()) { setFieldError(form, ['consent_by']); return toast({ title: '¿Quién lo autorizó?', text: 'Escribe el nombre del representante.', mood: 'confused' }); }
          btn.disabled = true;
          try {
            await api(`/students/${st.id}/health`, { method: 'PUT', body });
            closeSheet();
            toast({ sound: 'success', title: 'Ficha médica guardada', text: `${st.first_name} ${st.last_name}`, mood: 'happy' });
            loadStudents();
          } catch (e) {
            btn.disabled = false;
            toast({ title: 'No se pudo guardar', text: e.message, mood: 'sad' });
          }
        });
      }
    });
  }

  async function openMedicalView(studentId) {
    const st = S.students.find(s => s.id === studentId);
    let data;
    try { data = await api(`/students/${studentId}/health?view=1`); } catch (e) { return toast({ title: 'No se pudo abrir', text: e.message, mood: 'sad' }); }
    const h = data.health;
    if (!st) return;
    const sevName = { GRAVE: 'Grave', MODERADA: 'Moderada', LEVE: 'Leve' };
    const contacts = (h ? h.contacts : []).filter(c => c.phone);
    if (!contacts.length && st.parent_phone) contacts.push({ name: st.parent_name || 'Representante', relation: 'Representante', phone: st.parent_phone });
    SFX.play('sos');
    openSheet({
      title: 'Ficha médica',
      body: `
        <div class="med-view">
          <div class="mv-head">${avatar(st, 'av-xl')}<div><b>${esc(st.first_name)} ${esc(st.last_name)}</b><small>${esc(st.course_name)}${h && h.birth_date ? ' · ' + esc(h.birth_date) : ''}</small>${h && h.blood_type ? `<span class="blood">Sangre ${esc(h.blood_type)}</span>` : ''}</div></div>
          <div class="mv-actions"><a class="btn btn-sos btn-lg" href="tel:911">${icon('phone')} ECU 911</a>${contacts.slice(0, 2).map(c => `<a class="btn btn-gray btn-lg" href="${telHref(c.phone)}">${icon('phone')} ${esc(firstName(c.name) || c.relation)}</a>`).join('')}</div>
          ${!h ? `<div class="group">${emptyHtml('worried', 'Sin ficha médica', 'Este estudiante aún no tiene datos de salud. Llama a su representante.')}</div>` : `
          ${h.instructions ? `<div class="group-title">Qué hacer</div><div class="mv-do">${esc(h.instructions).replace(/\n/g, '<br>')}</div>` : ''}
          <div class="group-title">Alergias</div>
          <div class="group">${h.allergies.length ? h.allergies.map(a => `<div class="cell has-icon ${a.severity === 'GRAVE' ? 'al-grave' : ''}">${ico('alert', a.severity === 'GRAVE' ? 'red' : 'orange')}<div class="grow"><div class="t b">${esc(a.name)}</div>${a.reaction ? `<div class="s">${esc(a.reaction)}</div>` : ''}</div><span class="pill ${a.severity === 'GRAVE' ? 'p-abs' : 'p-late'}">${sevName[a.severity]}</span></div>`).join('') : '<div class="cell"><div class="grow s">Sin alergias registradas</div></div>'}</div>
          ${h.conditions.length ? `<div class="group-title">Condiciones</div><div class="group">${h.conditions.map(c => `<div class="cell has-icon">${ico('heart', 'pink')}<div class="grow"><div class="t b">${esc(c.name)}</div>${c.notes ? `<div class="s" style="white-space:normal">${esc(c.notes)}</div>` : ''}</div></div>`).join('')}</div>` : ''}
          ${h.medications.length ? `<div class="group-title">Medicamentos</div><div class="group">${h.medications.map(m => `<div class="cell has-icon">${ico('pill', 'blue')}<div class="grow"><div class="t b">${esc(m.name)}</div>${m.dose ? `<div class="s" style="white-space:normal">${esc(m.dose)}</div>` : ''}</div></div>`).join('')}</div>` : ''}
          ${h.doctor || h.insurance ? `<div class="group-title">Atención médica</div><div class="group">${h.doctor ? `<div class="cell"><div class="grow t">Médico</div><div class="v">${esc(h.doctor)}</div></div>` : ''}${h.insurance ? `<div class="cell"><div class="grow t">Seguro</div><div class="v">${esc(h.insurance)}</div></div>` : ''}</div>` : ''}`}
          <div class="group" style="margin-top:22px"><button type="button" class="cell center" id="editHealth">Editar ficha médica</button></div>
        </div>`,
      onMount(el) {
        $('#editHealth', el).addEventListener('click', () => { closeSheet(true); openHealthEditor(st); });
      }
    });
  }

  let emergencyTimer = 0;
  let ndefAbort = null;
  function openEmergency() {
    SFX.play('sos');
    const results = q => {
      const t = q.trim().toLowerCase();
      const list = S.students.filter(s => !t || `${s.first_name} ${s.last_name} ${s.student_code}`.toLowerCase().includes(t)).slice(0, 40);
      return list.map(s => `<button type="button" class="cell has-av" data-med="${s.id}">${avatar(s, 'av-sm')}<div class="grow"><div class="t"><b>${esc(s.last_name)}</b> ${esc(s.first_name)}</div><div class="s">${esc(s.course_code)}</div></div>${medBadge(s)}${icon('chevron', 'chev')}</button>`).join('') || '<div class="cell"><div class="grow s">Sin resultados</div></div>';
    };
    openSheet({
      title: 'Emergencia médica',
      body: `
        <div class="sos-hero"><span class="med-star big">${icon('medical')}</span><b>Identifica al estudiante</b><small>Acerca su tarjeta al lector del aula o a este celular, o búscalo por nombre.</small></div>
        <div class="group">
          <button type="button" class="cell has-icon" id="armReader">${ico('nfc', 'red')}<div class="grow"><div class="t">Usar el lector del aula</div><div class="s" id="armState">El siguiente toque abre la ficha (no marca asistencia)</div></div>${icon('chevron', 'chev')}</button>
          ${NFC.available() ? `<button type="button" class="cell has-icon" id="phoneRead">${ico('phone', 'blue')}<div class="grow"><div class="t">Leer con este celular</div><div class="s">${NFC.native() ? 'NFC del teléfono' : 'Android con Chrome'}</div></div>${icon('chevron', 'chev')}</button>` : ''}
          <a class="cell has-icon" href="tel:911">${ico('phone', 'green')}<div class="grow t">Llamar al ECU 911</div>${icon('chevron', 'chev')}</a>
        </div>
        <div class="toolbar" style="margin:18px 0 10px"><label class="search">${icon('search')}<input id="sosSearch" type="search" placeholder="Buscar estudiante" autocomplete="off"></label></div>
        <div class="group" id="sosList">${results('')}</div>`,
      onClose() {
        clearInterval(emergencyTimer);
        S.emergencyListen = null;
        api('/emergency/disarm', { method: 'POST' }).catch(() => {});
        if (ndefAbort) { ndefAbort.abort(); ndefAbort = null; }
      },
      onMount(el) {
        $('#sosSearch', el).addEventListener('input', e => { $('#sosList', el).innerHTML = results(e.target.value); });
        el.addEventListener('click', e => {
          const b = e.target.closest('[data-med]');
          if (b) { closeSheet(true); openMedicalView(Number(b.dataset.med)); }
        });
        S.emergencyListen = id => { closeSheet(true); openMedicalView(id); };
        $('#armReader', el).addEventListener('click', async () => {
          try {
            const r = await api('/emergency/arm', { method: 'POST' });
            haptic(10);
            const stEl = $('#armState', el);
            clearInterval(emergencyTimer);
            const tick = () => {
              const left = Math.max(0, Math.round((r.until - Date.now()) / 1000));
              stEl.innerHTML = left ? `<b style="color:var(--red)">Esperando tarjeta… ${left} s</b>` : 'Tiempo agotado. Toca para intentar de nuevo.';
              if (!left) clearInterval(emergencyTimer);
            };
            tick();
            emergencyTimer = setInterval(tick, 1000);
          } catch (err) { toast({ title: 'No se pudo', text: err.message, mood: 'sad' }); }
        });
        const pr = $('#phoneRead', el);
        if (pr) pr.addEventListener('click', async () => {
          try {
            ndefAbort = new AbortController();
            toast({ title: 'Acerca la tarjeta', text: 'Detrás del celular, cerca de la cámara.', mood: 'thinking', ms: 5000 });
            const rec = await NFC.read(ndefAbort.signal);
            const s = S.students.find(x => x.nfc_uid === rec.uid);
            if (s) { SFX.play('scan'); closeSheet(true); openMedicalView(s.id); }
            else toast({ title: 'Tarjeta no registrada', text: `UID ${rec.uid}`, mood: 'confused' });
          } catch (err) { if (err.name !== 'AbortError') toast({ title: 'No se pudo leer', text: err.message, mood: 'sad' }); }
        });
      }
    });
  }

  async function copyText(text, msg) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copiado', text: msg, mood: 'happy' });
    } catch (e) {
      openSheet({ title: 'Copia este texto', body: `<div class="code" style="white-space:pre-wrap;word-break:break-all;margin-top:8px">${esc(text)}</div>` });
    }
  }

  let deviceBot = null;
  let deviceTimer = 0;
  function deviceShow(l1, l2, mood, led, snd, extra = {}) {
    const a = $('#scrL1');
    if (!a) return;
    a.textContent = l1;
    $('#scrL2').innerHTML = esc(l2 || '') + (extra.code ? ` <b class="scr-code">${esc(extra.code)}</b>` : '');
    $$('.led').forEach(x => x.classList.toggle('on', x.classList.contains(led)));
    if (deviceBot) {
      if (extra.mascot != null && window.NaviMascots) deviceBot.setCharacter(NaviMascots.key(extra.mascot));
      deviceBot.mood(mood);
    }
    if (snd) sound(snd);
    clearTimeout(deviceTimer);
    deviceTimer = setTimeout(deviceIdle, extra.code ? 7000 : 1800);
  }
  function deviceIdle() {
    const a = $('#scrL1');
    if (!a) return;
    a.textContent = 'ACERQUE SU TARJETA';
    $('#scrL2').textContent = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    $$('.led').forEach(x => x.classList.remove('on'));
    if (deviceBot) {
      const me = (S.user && S.user.avatar) || 'triangle';
      if (deviceBot.character !== me) deviceBot.setCharacter(me);
      deviceBot.mood('neutral');
    }
  }
  function deviceFromResult(r) {
    const d = r.display || {};
    const x = { mascot: r.mascot_index, code: d.line3 };
    if (r.status === 'REPETIDO') return;
    if (r.status === 'GRABADO') return deviceShow(d.line1, d.line2, 'happy', 'g', 'success');
    if (r.status === 'ERROR_GRABAR') return deviceShow(d.line1, d.line2, 'sad', 'r', 'bad');
    if (d.line3) return deviceShow(d.line1, d.line2, 'happy', r.status === 'DUPLICADO' ? 'y' : 'g', 'ok', x);
    if (r.status === 'EMERGENCIA') return deviceShow(d.line1, d.line2, 'worried', 'r', 'sos');
    if (r.status === 'DESCONOCIDO') return deviceShow(d.line1, d.line2, 'angry', 'r', 'bad');
    if (r.status === 'DUPLICADO') return deviceShow(d.line1, d.line2, 'confused', 'y', 'warn', x);
    if (r.review) return deviceShow(d.line1, d.line2, 'surprised', 'y', 'warn', x);
    if (r.status === 'TARDE') return deviceShow(d.line1, d.line2, 'worried', 'y', 'warn', x);
    deviceShow(d.line1, d.line2, 'happy', 'g', 'ok', x);
  }
  function deviceFromRecord(p) {
    deviceFromResult({ status: p.status, review: p.review_state === 'PENDIENTE', display: { line1: `HOLA ${String(p.first_name).toUpperCase()}`, line2: p.status === 'TARDE' ? `ATRASO ${hhmm(p.time_recorded)}` : `A TIEMPO ${hhmm(p.time_recorded)}` } });
  }

  function grabFrame() {
    const video = $('#simCam video');
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 480;
    const ctx = c.getContext('2d');
    if (S.camCovered || !video || !video.videoWidth) {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, 640, 480);
    } else {
      ctx.drawImage(video, 0, 0, 640, 480);
    }
    return c.toDataURL('image/jpeg', 0.8);
  }

  async function simTap(uid, extra) {
    haptic(6);
    deviceShow('LEYENDO…', uid, 'thinking', '', '');
    const snapshot = S.camOn || S.camCovered ? grabFrame() : undefined;
    try {
      const r = await api('/attendance/scan', { method: 'POST', body: { uid, terminal_id: 'SIMULADOR', snapshot_photo: snapshot, ...(extra || {}) } });
      deviceFromResult(r);
    } catch (e) {
      if (e.data && e.data.status) deviceFromResult(e.data);
      else deviceShow('ERROR DE RED', e.message.toUpperCase(), 'sad', 'r', 'bad');
    }
  }

  function stopCam() {
    if (S.camStream) S.camStream.getTracks().forEach(t => t.stop());
    S.camStream = null;
    S.camOn = false;
  }

  function terminalsHtml() {
    if (!S.terminals.length) return `<div class="cell has-icon">${ico('info', 'blue')}<div class="grow"><div class="t">Sin hardware conectado</div><div class="s" style="white-space:normal">Cuando el lector o la cámara se enciendan con la configuración de abajo, aparecerán aquí.</div></div></div>`;
    return S.terminals.map(t => `<div class="cell has-icon">${ico(t.kind === 'CAMARA' ? 'camera' : 'nfc', t.online ? 'green' : 'gray')}<div class="grow"><div class="t">${esc(t.id.replace('#CAM', ' · cámara'))}</div><div class="s">${esc(t.ip || '')}${t.firmware ? ' · ' + esc(t.firmware) : ''}${t.rssi ? ` · ${t.rssi} dBm` : ''} · ${t.last_seen ? ago(t.last_seen) : 'nunca'}</div></div><span class="pill ${t.online ? 'p-ok' : 'p-none'}">${t.online ? 'En línea' : 'Desconectado'}</span></div>`).join('');
  }

  VIEWS.terminal = {
    html() {
      const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      const host = local ? (S.lanIp || 'IP_DE_TU_PC') : location.hostname;
      const port = local && S.srvPort ? String(S.srvPort) : location.port || (location.protocol === 'https:' ? '443' : '80');
      const course = S.courses.find(c => c.id === S.rollCourse) || S.courses[0];
      const list = S.students.filter(s => !course || s.course_id === course.id).slice(0, 18);
      const sim = S.demo;
      return `
        <div class="page-head"><div><div class="eyebrow">${sim ? 'Simulador y hardware' : 'Hardware del aula'}</div><h1>Lector</h1></div></div>
        <div class="grid term">
          <div>
            <div class="device">
              <div class="screen"><div class="face" id="devFace"></div><div><div class="l1" id="scrL1">ACERQUE SU TARJETA</div><div class="l2" id="scrL2"></div></div></div>
              <div class="leds"><span class="led g"></span><span class="led y"></span><span class="led r"></span></div>
${sim ? `              <div class="lbl">Tarjetas de ${esc(course ? course.code : '')}</div>
              <div class="taps">${list.map(s => `<button class="tap" data-act="simTap" data-uid="${esc(s.nfc_uid)}">${esc(s.first_name)} ${esc((s.last_name || '')[0] || '')}.</button>`).join('')}</div>
              <div class="lbl">Casos especiales</div>
              <div class="taps"><button class="tap" data-act="simNew">Tarjeta nueva</button><button class="tap warn" data-act="simBurst">Dos tarjetas seguidas</button><button class="tap" data-act="simSigned">Tarjeta firmada</button><button class="tap warn" data-act="simClone">Tarjeta copiada</button></div>
              <div class="lbl">UID manual</div>
              <div class="inline"><input id="manualUid" placeholder="04A1B2C3" maxlength="20" autocomplete="off"><button class="tap" data-act="simManual">Marcar</button></div>
` : `<div class="lbl">En vivo</div><p class="device-note">Esta pantalla repite lo que muestra el lector del aula cada vez que un estudiante acerca su tarjeta o llavero.</p>`}
            </div>
            ${sim ? `
            <div class="group-title">Cámara simulada</div>
            <div class="group">
              <div class="cell has-icon">${ico('camera', 'blue')}<div class="grow"><div class="t">Cámara web como ESP32-CAM</div><div class="s">Guarda una foto en cada toque simulado</div></div><label class="switch"><input type="checkbox" data-change="camToggle" ${S.camOn ? 'checked' : ''}><span></span></label></div>
              <div class="cell has-icon">${ico('eyeoff', 'graphite')}<div class="grow"><div class="t">Simular cámara tapada</div><div class="s">El registro queda para revisión</div></div><label class="switch"><input type="checkbox" data-change="camCover" ${S.camCovered ? 'checked' : ''}><span></span></label></div>
              <div style="padding:4px 16px 16px"><div class="cam" id="simCam">${S.camOn ? '<video playsinline muted autoplay></video>' : 'Cámara apagada'}</div></div>
            </div>
            ` : ''}
          </div>
          <div>
            <div class="group-title" style="margin-top:0">Hardware conectado <button class="btn btn-plain btn-sm" data-act="reloadTerminals" aria-label="Actualizar">${icon('refresh')}</button></div>
            <div class="group" id="terminals">${terminalsHtml()}</div>
            <div class="group-title">Configuración del firmware</div>
            <div class="group"><div style="padding:14px 16px">
              <div class="code" id="fwCfg">#define SERVER_HOST "${esc(host)}"\n#define SERVER_PORT ${esc(port)}\n#define TERMINAL_KEY "${isAdmin() ? '…' : 'pídela al administrador'}"\n#define TERMINAL_ID "ESP32-AULA-1"</div>
            </div>${isAdmin() ? `<button class="cell center" data-act="copyCfg">Copiar configuración</button>` : ''}</div>
            <p class="group-foot">El servidor ya guarda la IP y la clave en <span class="mono">servidor.h</span>, dentro de las dos carpetas del firmware. Solo escribe el nombre y la clave de tu WiFi en <span class="mono">config.h</span> y sube el programa. El ESP32 y esta PC deben estar en la misma red WiFi.</p>
            ${sim ? `
            <div class="group-title">Preparar una demostración</div>
            <div class="group">
              <button class="cell has-icon" data-act="demoNow">${ico('bolt', 'orange')}<div class="grow"><div class="t">Entrada = ahora</div><div class="s">Todos los cursos entran en este minuto</div></div>${icon('chevron', 'chev')}</button>
              <button class="cell has-icon" data-act="resetDay">${ico('refresh', 'blue')}<div class="grow"><div class="t">Reiniciar el día</div><div class="s">Borra los registros de hoy</div></div>${icon('chevron', 'chev')}</button>
              <button class="cell has-icon" data-act="runAbs">${ico('door', 'red')}<div class="grow"><div class="t">Marcar ausencias ya</div><div class="s">Si ya pasó el límite de algún curso</div></div>${icon('chevron', 'chev')}</button>
            </div>
            ` : isAdmin() ? `<div class="group-title">Herramientas del día</div>
            <div class="group">
              <button class="cell has-icon" data-act="runAbs">${ico('door', 'red')}<div class="grow"><div class="t">Marcar ausencias ya</div><div class="s">Para los cursos que ya pasaron su hora límite</div></div>${icon('chevron', 'chev')}</button>
            </div>
            <p class="group-foot">El servidor también las marca solo, cada minuto.</p>` : ''}
          </div>
        </div>`;
    },
    mount() {
      deviceBot = NaviBots.mount($('#devFace'), { character: (S.user && S.user.avatar) || 'triangle', follow: false, pokeable: false });
      deviceIdle();
      if (S.camOn && S.camStream) $('#simCam video').srcObject = S.camStream;
      if (isAdmin()) api('/terminal/key').then(k => { const el = $('#fwCfg'); if (el) el.textContent = el.textContent.replace('"…"', `"${k.key}"`); }).catch(() => {});
      loadTerminals();
      const onKey = e => { if (e.key === 'Enter' && e.target.id === 'manualUid') handlers.simManual(); };
      $('#main').addEventListener('keydown', onKey);
      return () => {
        $('#main').removeEventListener('keydown', onKey);
        if (deviceBot) deviceBot.destroy();
        deviceBot = null;
        clearTimeout(deviceTimer);
        stopCam();
      };
    },
    update() { const el = $('#terminals'); if (el) el.innerHTML = terminalsHtml(); }
  };
  handlers.simTap = el => simTap(el.dataset.uid);
  handlers.simNew = () => simTap(Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase());
  handlers.simBurst = () => {
    const course = S.courses.find(c => c.id === S.rollCourse) || S.courses[0];
    const two = S.students.filter(s => !course || s.course_id === course.id).slice(-2);
    if (two.length < 2) return toast({ title: 'Faltan estudiantes', text: 'Necesitas al menos dos en el curso.', mood: 'confused' });
    simTap(two[0].nfc_uid);
    setTimeout(() => simTap(two[1].nfc_uid), 700);
  };
  const simCard = async clone => {
    const course = S.courses.find(c => c.id === S.rollCourse) || S.courses[0];
    const pool = S.students.filter(s => !course || s.course_id === course.id);
    const marked = new Set(S.records.map(r => r.student_id));
    const s = pool.find(x => !marked.has(x.id)) || pool[0];
    if (!s) return;
    try {
      const c = await api(`/students/${s.id}/credential`, { method: 'POST', body: {} });
      simTap(s.nfc_uid, clone ? { ntag: true } : { ntag: true, cred: c.cred });
      if (clone) toast({ title: 'Tarjeta copiada', text: `Mismo número que la de ${s.first_name}, pero sin la firma cifrada.`, mood: 'thinking', ms: 4200 });
    } catch (e) { toast({ title: 'No se pudo', text: e.message, mood: 'sad' }); }
  };
  handlers.simSigned = () => simCard(false);
  handlers.simClone = () => simCard(true);
  handlers.simManual = () => { const i = $('#manualUid'); if (i && i.value.trim()) { simTap(i.value.trim()); i.value = ''; } };
  handlers.reloadTerminals = () => loadTerminals();
  handlers.copyCfg = () => copyText($('#fwCfg').textContent, 'Pégalo en config.h de los firmwares.');
  handlers.camToggle = async el => {
    if (el.checked) {
      try {
        S.camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
        S.camOn = true;
        $('#simCam').innerHTML = '<video playsinline muted autoplay></video>';
        $('#simCam video').srcObject = S.camStream;
      } catch (e) {
        el.checked = false;
        toast({ title: 'No pude abrir la cámara', text: window.isSecureContext ? 'Revisa los permisos del navegador.' : 'Solo funciona en localhost o HTTPS.', mood: 'sad' });
      }
    } else {
      stopCam();
      $('#simCam').textContent = 'Cámara apagada';
    }
  };
  handlers.camCover = el => { S.camCovered = el.checked; };
  handlers.demoNow = async el => {
    const now = new Date();
    const t = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    el.disabled = true;
    try {
      const wd = now.getDay() === 0 ? 7 : now.getDay();
      await Promise.all(S.courses.map(c => api(`/courses/${c.id}`, { method: 'PATCH', body: { schedule_start: t, days: Array.from(new Set(c.days.split(',').concat(String(wd)))).sort().join(',') } })));
      await api('/demo/reset-today', { method: 'POST' });
      await loadAll();
      toast({ title: `Entrada fijada a las ${t}`, text: 'Día reiniciado. Ya puedes marcar tarjetas.', mood: 'happy' });
    } catch (e) {
      toast({ title: 'No se pudo preparar', text: e.message, mood: 'sad' });
    }
    el.disabled = false;
  };
  handlers.resetDay = el => confirmTap(el.querySelector('.t'), 'Toca otra vez para borrar', async () => {
    try {
      const r = await api('/demo/reset-today', { method: 'POST' });
      toast({ title: 'Día reiniciado', text: `${r.deleted} registros borrados.`, mood: 'neutral' });
    } catch (e) { toast({ title: 'No se pudo', text: e.message, mood: 'sad' }); }
  });
  handlers.runAbs = async () => {
    try {
      const r = await api('/absences/run', { method: 'POST' });
      toast({ title: r.marked ? `${r.marked} ausentes marcados` : 'Nada que marcar', text: r.marked ? 'Se avisó a sus representantes.' : 'Aún no pasa el límite de ningún curso, o ya se marcaron hoy.', mood: r.marked ? 'worried' : 'neutral' });
    } catch (e) { toast({ title: 'No se pudo', text: e.message, mood: 'sad' }); }
  };

  const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  function courseGroups() {
    return S.courses.map(c => `
      <div class="group-title">${esc(c.name)}</div>
      <div class="group" data-course="${c.id}">
        <div class="cell has-icon">${ico('calendar', 'red')}<div class="grow t">Días</div><div class="days">${DAYS.map((d, i) => `<button type="button" class="${c.days.split(',').includes(String(i + 1)) ? 'on' : ''}" data-act="toggleDay" data-day="${i + 1}">${d}</button>`).join('')}</div></div>
        <label class="frow" style="--inset:60px">${ico('clock', 'blue')}<span>Entrada</span><input type="time" name="schedule_start" value="${esc(c.schedule_start)}"></label>
        <label class="frow" style="--inset:60px">${ico('bolt', 'orange')}<span>Tolerancia</span><input type="number" name="late_tolerance_min" min="0" max="120" value="${c.late_tolerance_min}" inputmode="numeric"><span class="unit">min</span></label>
        <label class="frow" style="--inset:60px">${ico('door', 'graphite')}<span>Ausente tras</span><input type="number" name="absent_limit_min" min="5" max="480" value="${c.absent_limit_min}" inputmode="numeric"><span class="unit">min</span></label>
        <button class="cell center" data-act="saveCourse">Guardar horario</button>
      </div>`).join('');
  }

  VIEWS.ajustes = {
    html() {
      const u = S.user;
      const st = S.settings || {};
      const can = canConfigure();
      const toggle = (k, ic, col, title, sub) => `<div class="cell has-icon">${ico(ic, col)}<div class="grow"><div class="t">${title}</div><div class="s" style="white-space:normal">${sub}</div></div><label class="switch"><input type="checkbox" data-change="setting" data-key="${k}" ${st[k] ? 'checked' : ''} ${can ? '' : 'disabled'}><span></span></label></div>`;
      const ch = S.channels || {};
      const standalone = matchMedia('(display-mode: standalone)').matches;
      const installSub = window.NaviAndroid ? `App de Android ${window.NaviAndroid.version()} · NFC ${window.NaviAndroid.hasNfc() ? 'disponible' : 'no disponible'}` : standalone ? 'Ya estás usando la app instalada' : S.installPrompt ? 'Ábrela como una app, sin barra del navegador' : window.isSecureContext ? 'Menú del navegador → "Instalar app"' : 'En el celular necesitas HTTPS (mira INSTALAR_APP.md)';
      return `
        <div class="page-head"><div><h1>Ajustes</h1></div></div>
        <div class="grid two">
          <div>
            ${S.demo ? `<div class="group demo-card"><div class="cell has-icon">${ico('bolt', 'orange')}<div class="grow"><div class="t b">Modo demostración</div><div class="s" style="white-space:normal">Los estudiantes, cursos y registros son de ejemplo. Nada de esto se mezcla con los datos reales del colegio.</div></div></div>${window.NaviAndroid ? `<button class="cell center" data-act="exitDemo">Salir de la demostración</button>` : ''}</div>` : ''}
            <div class="group"><div class="profile-card"><div class="me-bot" id="meBig">${NaviBots.svg(u.avatar || 'triangle', 'happy')}</div><div style="min-width:0"><b>${esc(u.name)}</b><small>${esc(u.email)} · ${roleName(u.role)}</small></div></div></div>
            <div class="group-title">Tu bot</div>
            <div class="group"><div class="avatar-grid" id="avGrid">${NaviBots.KEYS.map(k => `<button type="button" class="${u.avatar === k ? 'on' : ''}" data-act="pickAvatar" data-k="${k}" title="${NaviBots.CHARACTERS[k].name}">${NaviBots.svg(k, u.avatar === k ? 'happy' : 'neutral')}</button>`).join('')}</div></div>
            <div class="group-title">Perfil</div>
            <form id="profForm" class="group" novalidate>
              ${frow('name', 'Nombre', { value: u.name })}
              ${frow('institution_name', 'Institución', { value: u.institution_name || '' })}
              <button class="cell center" data-act="saveProfile">Guardar perfil</button>
            </form>
            <div class="section-title" style="font-size:20px;margin:32px 0 4px">Cursos y horarios</div>
            <div id="courseEdit">${courseGroups()}</div>
            ${isAdmin() ? `<div class="group-title">Nuevo curso</div><form id="newCourse" class="group" novalidate>${frow('name', 'Nombre', { placeholder: '3ro BGU C' })}${frow('code', 'Código', { placeholder: 'BGU-3C', attrs: 'style="text-transform:uppercase"' })}<button class="cell center" data-act="addCourse">Agregar curso</button></form>` : ''}
          </div>
          <div>
            <div class="group-title" style="margin-top:0">Avisos a representantes</div>
            <div class="group">
              ${toggle('notify_on_late', 'clock', 'orange', 'Atrasos', 'Cuando llega después de la tolerancia')}
              ${toggle('notify_on_absent', 'xcircle', 'red', 'Ausencias', 'Cuando no llegó o el docente no lo vio en el aula')}
              ${toggle('notify_on_arrival', 'bell', 'blue', 'Cada llegada', 'Muchos mensajes diarios hacen que los padres dejen de leerlos')}
              ${toggle('auto_absences', 'wand', 'purple', 'Ausentes automáticos', 'Al pasar el límite de ausencia de cada curso')}
            </div>
            ${can ? '' : '<p class="group-foot">Solo el administrador puede cambiar esto.</p>'}
            <div class="group-title">Canales</div>
            <div class="group">
              <${can ? 'button' : 'div'} class="cell has-icon" ${can ? 'data-act="cfgMail"' : ''}>${ico('mail', 'blue')}<div class="grow"><div class="t">Correo</div><div class="s">${ch.email ? esc(ch.email_from) : (S.demo ? 'Sin configurar · se simula' : 'Sin configurar')}</div></div>${ch.email ? '' : '<span class="pill p-late">Configurar</span>'}${can ? icon('chevron', 'chev') : ''}</${can ? 'button' : 'div'}>
              <${can ? 'button' : 'div'} class="cell has-icon" ${can ? 'data-act="cfgMail"' : ''}>${ico('door', 'graphite')}<div class="grow"><div class="t">Copia a la institución</div><div class="s">${ch.inst_email ? esc(ch.inst_email) : 'DECE o inspección'}</div></div><span class="v">${ch.inst_email ? { URGENT: 'Urgentes', ALL: 'Todos', NONE: 'Nunca' }[ch.inst_cc] || '' : 'No'}</span>${can ? icon('chevron', 'chev') : ''}</${can ? 'button' : 'div'}>
              <${can ? 'button' : 'div'} class="cell has-icon" ${can ? 'data-act="cfgWa"' : ''}>${ico('chat', 'green')}<div class="grow"><div class="t">WhatsApp</div><div class="s">${ch.wa_urgent === false ? 'Solo si no llegó otro aviso' : 'También en ausencias y emergencias'}</div></div><span class="v">${ch.whatsapp === 'API' ? 'Automático' : 'Un toque'}</span>${can ? icon('chevron', 'chev') : ''}</${can ? 'button' : 'div'}>
              <button class="cell has-icon" data-act="cfgSms">${ico('phone', 'indigo')}<div class="grow"><div class="t">SMS al celular</div><div class="s">${ch.sms ? (ch.sms_device ? 'Desde ' + esc(ch.sms_device) : 'Falta un celular que los envíe') : 'Mensaje de texto normal, sin internet'}</div></div><span class="v">${ch.sms ? (ch.sms_device ? 'Activo' : 'En espera') : 'No'}</span>${icon('chevron', 'chev')}</button>
              <div class="cell has-icon">${ico('send', 'teal')}<div class="grow t">Telegram</div><span class="v">${ch.telegram ? '@' + esc(ch.telegramBot) : 'No configurado'}</span></div>
            </div>
            <p class="group-foot">${can ? 'Toca para configurar y enviar una prueba.' : 'Solo el administrador puede configurar los canales.'}</p>
            ${isAdmin() ? `<div class="group-title">Usuarios</div><div class="group" id="usersBox"><div class="cell"><div class="grow s">Cargando…</div></div></div>` : ''}
            <div class="group-title">Seguridad</div>
            <form id="pwForm" class="group" novalidate>
              ${frow('current', 'Actual', { type: 'password', placeholder: 'Contraseña actual', attrs: 'autocomplete="current-password"' })}
              ${frow('next', 'Nueva', { type: 'password', placeholder: 'Mínimo 6 caracteres', attrs: 'autocomplete="new-password"' })}
              <button class="cell center" data-act="changePw">Cambiar contraseña</button>
            </form>
            <div class="group-title">Mascotas</div>
            <div class="group">
              <div class="cell has-icon">${ico('heart', 'pink')}<div class="grow"><div class="t">Mostrar mascotas en las listas</div><div class="s">En vez de iniciales cuando no hay foto</div></div><label class="switch"><input type="checkbox" data-change="mascotsToggle" ${showMascots() ? 'checked' : ''}><span></span></label></div>
              <button class="cell has-icon" data-act="mascotGallery">${ico('users', 'orange')}<div class="grow"><div class="t">Ver las 40 mascotas</div><div class="s">Y a quién le tocó cada una</div></div>${icon('chevron', 'chev')}</button>
            </div>
            <div class="group-title">Sonidos</div>
            <div class="group">
              <div class="cell has-icon">${ico('bell', 'pink')}<div class="grow"><div class="t">Sonidos de la interfaz</div><div class="s">Un toque suave en cada botón</div></div><label class="switch"><input type="checkbox" data-change="sfx" ${SFX.sounds ? 'checked' : ''}><span></span></label></div>
              <div class="cell has-icon">${ico('chat', 'orange')}<div class="grow"><div class="t">Voz de los bots</div><div class="s">Cada personaje tiene su propia voz</div></div><label class="switch"><input type="checkbox" data-change="voices" ${SFX.voices ? 'checked' : ''}><span></span></label></div>
            </div>
            <div class="group-title">Reportes</div>
            <div class="group">
              <a class="cell has-icon" data-export="0" href="#">${ico('download', 'green')}<div class="grow"><div class="t">Asistencia de hoy</div><div class="s">Archivo CSV que abre en Excel</div></div>${icon('chevron', 'chev')}</a>
              <a class="cell has-icon" data-export="30" href="#">${ico('calendar', 'teal')}<div class="grow"><div class="t">Últimos 30 días</div><div class="s">Todos los cursos</div></div>${icon('chevron', 'chev')}</a>
            </div>
            <div class="group-title">App</div>
            <div class="group">
              ${window.NaviAndroid && window.NaviAndroid.getServer() ? `<button class="cell has-icon" data-act="nativeServer">${ico('cpu', 'graphite')}<div class="grow"><div class="t">Servidor del colegio</div><div class="s">${esc(window.NaviAndroid.getServer().replace(/^https?:\/\//, ''))}</div></div><span class="v">Cambiar</span>${icon('chevron', 'chev')}</button>` : ''}
              <div class="cell has-icon">${ico('phone', 'indigo')}<div class="grow"><div class="t">App en este dispositivo</div><div class="s" style="white-space:normal">${installSub}</div></div>${S.installPrompt ? `<button class="btn btn-primary btn-sm" data-act="install">Instalar</button>` : standalone ? '<span class="pill p-ok">Instalada</span>' : ''}</div>
            </div>
            <div class="group" style="margin-top:26px"><button class="cell center danger" data-act="logout">Cerrar sesión</button></div>
            <p class="group-foot" style="text-align:center;margin-top:10px">N.A.V.I 3.3</p>
          </div>
        </div>`;
    },
    mount() {
      if (isAdmin()) loadUsers();
      const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      $$('[data-export]').forEach(a => {
        const days = Number(a.dataset.export);
        const from = new Date();
        from.setDate(from.getDate() - days);
        a.href = `/api/export.csv?t=${encodeURIComponent(S.token)}&from=${ds(from)}&to=${todayStr()}`;
        a.setAttribute('download', '');
      });
    },
    update() {}
  };

  async function loadUsers() {
    try {
      const users = await api('/users');
      const box = $('#usersBox');
      if (!box) return;
      box.innerHTML = users.map(u => `<div class="cell has-av"><div class="av av-sm" style="background:transparent">${NaviBots.svg(u.avatar)}</div><div class="grow"><div class="t">${esc(u.name)}</div><div class="s">${esc(u.email)}</div></div><label class="frow" style="padding:0;min-height:0;background:transparent;flex:none"><select data-change="role" data-id="${u.id}" ${u.id === S.user.id ? 'disabled' : ''} style="height:32px;color:var(--text-2);font-size:16px">${['ADMINISTRADOR', 'DOCENTE', 'INSPECTOR'].map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${roleName(r)}</option>`).join('')}</select></label></div>`).join('');
    } catch (e) {}
  }

  handlers.pickAvatar = async el => {
    haptic(6);
    try {
      const r = await api('/auth/me', { method: 'PATCH', body: { avatar: el.dataset.k } });
      S.user = r.user;
      store.set('navi_bot', r.user.avatar);
      $$('#avGrid button').forEach(b => { const on = b.dataset.k === r.user.avatar; b.classList.toggle('on', on); b.innerHTML = NaviBots.svg(b.dataset.k, on ? 'happy' : 'neutral'); });
      const big = $('#meBig');
      if (big) big.innerHTML = NaviBots.svg(r.user.avatar, 'happy');
      paintMe();
    } catch (e) { toast({ title: 'No se pudo', text: e.message, mood: 'sad' }); }
  };
  handlers.saveProfile = async el => {
    const form = $('#profForm');
    const v = Object.fromEntries(new FormData(form));
    if (!v.name.trim()) return setFieldError(form, ['name']);
    el.disabled = true;
    try {
      const r = await api('/auth/me', { method: 'PATCH', body: v });
      S.user = r.user;
      const inst = $('#instName');
      if (inst) inst.textContent = r.user.institution_name || '';
      const nm = $('#meName');
      if (nm) nm.textContent = r.user.name;
      toast({ title: 'Perfil guardado', mood: 'happy' });
    } catch (e) { toast({ title: 'No se pudo', text: e.message, mood: 'sad' }); }
    el.disabled = false;
  };
  handlers.changePw = async el => {
    const form = $('#pwForm');
    const v = Object.fromEntries(new FormData(form));
    if (!v.current || !v.next) return setFieldError(form, [!v.current ? 'current' : 'next']);
    if (v.next.length < 6) { setFieldError(form, ['next']); return toast({ title: 'Muy corta', text: 'Usa al menos 6 caracteres.', mood: 'worried' }); }
    el.disabled = true;
    try {
      await api('/auth/password', { method: 'POST', body: v });
      form.reset();
      toast({ title: 'Contraseña cambiada', mood: 'happy' });
    } catch (e) {
      setFieldError(form, e.code === 'BAD_PASSWORD' ? ['current'] : ['next']);
      toast({ title: e.code === 'BAD_PASSWORD' ? 'La contraseña actual no coincide' : 'No se pudo', text: e.code === 'BAD_PASSWORD' ? '' : e.message, mood: 'angry' });
    }
    el.disabled = false;
  };
  handlers.logout = el => confirmTap(el, 'Toca otra vez para salir', () => logout(false));
  handlers.setting = async el => {
    try {
      S.settings = await api('/settings', { method: 'PATCH', body: { [el.dataset.key]: el.checked } });
      haptic(6);
    } catch (e) {
      el.checked = !el.checked;
      toast({ title: 'No se pudo', text: e.message, mood: 'sad' });
    }
  };
  handlers.role = async el => {
    try {
      await api(`/users/${el.dataset.id}`, { method: 'PATCH', body: { role: el.value } });
      toast({ title: 'Rol actualizado', mood: 'happy' });
    } catch (e) { toast({ title: 'No se pudo', text: e.message, mood: 'sad' }); loadUsers(); }
  };
  handlers.exitDemo = el => confirmTap(el, 'Toca otra vez para salir', () => window.NaviAndroid.resetServer());
  handlers.nativeServer = el => confirmTap(el.querySelector('.t'), 'Toca otra vez para cambiar', () => window.NaviAndroid.resetServer());
  handlers.mascotsToggle = el => { store.set('navi_mascots', el.checked ? '1' : '0'); };
  handlers.mascotGallery = () => openMascotGallery();
  handlers.cfgMail = () => openMailSettings();
  handlers.cfgWa = () => openWaSettings();
  handlers.cfgSms = () => openSmsSettings();
  handlers.sfx = el => SFX.setSounds(el.checked);
  handlers.voices = el => { SFX.setVoices(el.checked); if (el.checked) SFX.bot((S.user && S.user.avatar) || 'triangle', 'happy'); };
  handlers.toggleDay = el => { el.classList.toggle('on'); haptic(5); };
  handlers.saveCourse = async el => {
    const box = el.closest('[data-course]');
    const body = {
      schedule_start: $('[name=schedule_start]', box).value,
      late_tolerance_min: Number($('[name=late_tolerance_min]', box).value),
      absent_limit_min: Number($('[name=absent_limit_min]', box).value),
      days: $$('.days button.on', box).map(b => b.dataset.day).join(',')
    };
    el.disabled = true;
    try {
      await api(`/courses/${box.dataset.course}`, { method: 'PATCH', body });
      S.courses = await api('/courses');
      toast({ title: 'Horario guardado', mood: 'happy' });
    } catch (e) { toast({ title: 'No se pudo', text: e.message, mood: 'sad' }); }
    el.disabled = false;
  };
  handlers.addCourse = async el => {
    const form = $('#newCourse');
    const v = Object.fromEntries(new FormData(form));
    const miss = ['name', 'code'].filter(k => !v[k].trim());
    if (miss.length) return setFieldError(form, miss);
    el.disabled = true;
    try {
      const themes = ['blue', 'green', 'orange', 'purple', 'pink', 'teal'];
      await api('/courses', { method: 'POST', body: { ...v, theme: themes[S.courses.length % themes.length] } });
      S.courses = await api('/courses');
      form.reset();
      $('#courseEdit').innerHTML = courseGroups();
      toast({ title: 'Curso creado', text: v.name, mood: 'happy' });
    } catch (e) { toast({ title: 'No se pudo', text: e.message, mood: 'sad' }); }
    el.disabled = false;
  };

  addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    S.installPrompt = e;
    if (S.user && (S.view === 'inicio' || S.view === 'ajustes')) renderView();
  });
  addEventListener('appinstalled', () => {
    S.installPrompt = null;
    toast({ title: 'N.A.V.I instalada', text: 'Ya la puedes abrir desde tu pantalla de inicio.', mood: 'happy' });
  });

  if ('serviceWorker' in navigator && window.isSecureContext) {
    addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }

  const NFC = (() => {
    const native = () => Boolean(window.NaviAndroid && typeof window.NaviAndroid.nfcRead === 'function');
    const pending = {};
    let seq = 0;
    window.__naviNfc = (id, json) => {
      const p = pending[id];
      if (!p) return;
      delete pending[id];
      let d;
      try { d = JSON.parse(json); } catch (e) { d = { error: 'Lectura inválida' }; }
      if (d.error) p.reject(Object.assign(new Error(d.error), { name: d.code || 'NfcError' }));
      else p.resolve(d);
    };
    const call = (method, arg) => new Promise((resolve, reject) => {
      const id = 'n' + (++seq);
      pending[id] = { resolve, reject };
      try { window.NaviAndroid[method](id, arg || ''); } catch (e) { delete pending[id]; reject(e); }
    });
    const hex = s => String(s || '').replace(/[^0-9a-f]/gi, '').toUpperCase();
    function webRead(signal) {
      const r = new NDEFReader();
      return r.scan({ signal }).then(() => new Promise((resolve, reject) => {
        r.onreadingerror = () => reject(new Error('No se pudo leer la tarjeta. Mantenla quieta e intenta otra vez.'));
        r.onreading = ev => {
          const records = [];
          for (const rec of ev.message.records) {
            try {
              const dec = new TextDecoder(rec.encoding || 'utf-8');
              if (rec.recordType === 'url' || rec.recordType === 'absolute-url') records.push({ type: 'url', data: dec.decode(rec.data) });
              else if (rec.recordType === 'text') records.push({ type: 'text', data: dec.decode(rec.data) });
            } catch (e) {}
          }
          resolve({ uid: hex(ev.serialNumber), records, reader: r });
        };
      }));
    }
    return {
      native,
      available: () => native() || 'NDEFReader' in window,
      async read(signal) {
        if (native()) {
          if (signal) signal.addEventListener('abort', () => { try { window.NaviAndroid.nfcStop(); } catch (e) {} });
          const d = await call('nfcRead');
          return { uid: hex(d.uid), records: d.records || [] };
        }
        return webRead(signal);
      },
      async write(records, expectUid, signal) {
        if (native()) {
          const d = await call('nfcWrite', JSON.stringify({ records, uid: expectUid || '' }));
          return { uid: hex(d.uid) };
        }
        const got = await webRead(signal);
        if (expectUid && got.uid && got.uid !== hex(expectUid)) throw Object.assign(new Error(`Esa no es la tarjeta correcta (UID ${got.uid}).`), { name: 'WRONG_CARD' });
        await got.reader.write({ records: records.map(r => (r.type === 'url' ? { recordType: 'url', data: r.data } : { recordType: 'text', data: r.data, lang: 'es' })) }, { signal });
        return { uid: got.uid };
      },
      stop() { if (native()) { try { window.NaviAndroid.nfcStop(); } catch (e) {} } }
    };
  })();

  const credOf = rec => ((rec.records || []).find(r => r.type === 'text' && /^NAVI1\./.test(r.data)) || {}).data || '';

  function deviceId() {
    let id = store.get('navi_device');
    if (!id) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(18))).map(b => b.toString(16).padStart(2, '0')).join('');
      store.set('navi_device', id);
    }
    return id;
  }

  const mascotKey = i => (window.NaviMascots ? NaviMascots.key(i) : 'triangle');
  const mascotInfo = i => (window.NaviMascots ? NaviMascots.info(i) : { name: 'Bot', number: '00', color: '#1382FD', shape: '', colorName: '', eyes: '' });
  const mascotName = s => s.mascot_name || mascotInfo(s.mascot).name;
  const showMascots = () => store.get('navi_mascots') !== '0';

  function pinPad(host, { title, sub, onDone }) {
    let value = '';
    host.innerHTML = `
      <div class="pin">
        <b>${esc(title)}</b><small>${esc(sub || '')}</small>
        <div class="pin-dots">${'<i></i>'.repeat(4)}</div>
        <div class="pin-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => (k === '' ? '<span></span>' : `<button type="button" data-k="${k}">${k}</button>`)).join('')}</div>
      </div>`;
    const dots = $$('.pin-dots i', host);
    const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < value.length));
    const api2 = {
      shake() { const p = $('.pin', host); p.classList.remove('bad'); void p.offsetWidth; p.classList.add('bad'); value = ''; paint(); haptic([20, 40, 20]); SFX.play('error'); },
      reset() { value = ''; paint(); }
    };
    $('.pin-keys', host).addEventListener('click', e => {
      const b = e.target.closest('[data-k]');
      if (!b) return;
      haptic(5);
      if (b.dataset.k === '⌫') value = value.slice(0, -1);
      else if (value.length < 4) value += b.dataset.k;
      paint();
      if (value.length === 4) { const v = value; setTimeout(() => onDone(v, api2), 120); }
    });
    return api2;
  }

  function studentFlow(el, box, endpoint, onFail) {
    const finish = data => {
      store.set('navi_student', data.token);
      closeSheet(true);
      showStudent();
    };
    const run = async (body, prev) => {
      try {
        const r = await api(endpoint, { method: 'POST', body: { ...body, device_id: deviceId(), device_label: navigator.userAgent.includes('Android') ? 'Android' : /iPhone|iPad/.test(navigator.userAgent) ? 'iPhone' : 'Celular' } });
        if (r.token) return finish(r);
        const info = mascotInfo(r.student.mascot);
        box.innerHTML = `<div class="pin-head">${NaviBots.svg(mascotKey(r.student.mascot), 'happy')}</div><div id="pinHost"></div>`;
        if (r.need === 'SET_PIN') {
          let first = '';
          pinPad($('#pinHost', box), {
            title: `¡Hola, ${r.student.first_name}!`,
            sub: `Crea un PIN de 4 números. Te lo pediremos solo en celulares nuevos. ${info.name} te espera.`,
            onDone(v, p) {
              if (!first) { first = v; p.reset(); $('.pin small', box).textContent = 'Escríbelo otra vez para confirmar.'; return; }
              if (v !== first) { first = ''; $('.pin small', box).textContent = 'No coincidían. Crea tu PIN de nuevo.'; return p.shake(); }
              run({ ...body, new_pin: v }, p);
            }
          });
          return;
        }
        pinPad($('#pinHost', box), {
          title: `Hola, ${r.student.first_name}`,
          sub: 'Este celular es nuevo. Escribe tu PIN.',
          onDone(v, p) { run({ ...body, pin: v }, p); }
        });
      } catch (err) {
        if (prev && (err.code === 'BAD_PIN' || err.code === 'PIN_FORMAT')) { prev.shake(); $('.pin small', box).textContent = err.message; return; }
        toast({ title: 'No pude entrar', text: err.message, mood: err.code && err.code.startsWith('CRED_') ? 'angry' : 'sad', ms: 5000 });
        if (onFail) onFail(err);
      }
    };
    return run;
  }

  function openStudentLogin() {
    let abort = null;
    openSheet({
      title: 'Tarjeta en este celular',
      body: `
        <div id="stuLogin">
          <div class="tap-hero"><div class="tap-phone">${icon('phone')}</div><div class="tap-card"><span>N.A.V.I</span>${icon('nfc')}</div><div class="tap-ring"></div></div>
          <div class="tap-text"><b>Acerca tu tarjeta a la parte de atrás del celular</b><small id="stuHint">${NFC.available() ? 'Tu tarjeta tiene una firma cifrada que solo el servidor del colegio puede comprobar.' : 'Este celular no puede leer tarjetas. Usa el lector del aula.'}</small></div>
          ${NFC.available() ? '<button class="btn btn-primary btn-lg btn-block" id="stuScan">Leer mi tarjeta</button>' : ''}
        </div>`,
      onClose() { if (abort) abort.abort(); NFC.stop(); },
      onMount(el) {
        const box = $('#stuLogin', el);
        const run = studentFlow(el, box, '/student/card-login', err => { const h = $('#stuHint', el); if (h) h.textContent = err.message; });
        const scan = $('#stuScan', el);
        if (scan) scan.addEventListener('click', async () => {
          scan.disabled = true;
          scan.textContent = 'Acerca la tarjeta…';
          box.classList.add('listening');
          abort = new AbortController();
          try {
            const rec = await NFC.read(abort.signal);
            box.classList.remove('listening');
            SFX.play('scan');
            const cred = credOf(rec);
            if (!cred) throw new Error('Esta tarjeta todavía no tiene tu credencial. Pide al docente que la grabe con el lector del aula.');
            await run({ cred, uid: rec.uid });
          } catch (err) {
            box.classList.remove('listening');
            if (err.name !== 'AbortError') toast({ title: 'No se pudo leer', text: err.name === 'NotAllowedError' ? 'Permite el uso de NFC.' : err.message, mood: 'confused', ms: 5000 });
            scan.disabled = false;
            scan.textContent = 'Leer mi tarjeta';
          }
        });
      }
    });
  }

  function openCodeLogin() {
    openSheet({
      title: 'Entrar con el lector',
      body: `
        <div id="codeLogin">
          <div class="oled-demo"><div class="oled-top"><span>N.A.V.I</span><span>WiFi</span></div><div class="oled-body"><div class="oled-pet">${NaviBots.svg(mascotKey(0), 'happy')}</div><div><div>NACIO CHISPA!</div><div>CODIGO APP:</div><b>482193</b></div></div></div>
          <ol class="steps big">
            <li>Acerca tu tarjeta al <b>lector del aula</b>. Si ya marcaste hoy, acércala otra vez.</li>
            <li>En la pantalla del lector aparece tu mascota y un <b>código de 6 números</b>.</li>
            <li>Escríbelo aquí. Vence en 5 minutos.</li>
          </ol>
          <input class="code-in" id="codeIn" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" placeholder="000000" aria-label="Código del lector">
          <button class="btn btn-primary btn-lg btn-block" id="codeGo" style="margin-top:14px">Entrar</button>
          <p class="group-foot" style="text-align:center;margin-top:10px">Funciona con cualquier celular, tenga o no NFC.</p>
        </div>`,
      onMount(el) {
        const box = $('#codeLogin', el);
        const input = $('#codeIn', el);
        const go = $('#codeGo', el);
        const run = studentFlow(el, box, '/student/code-login', () => { input.value = ''; input.classList.add('bad'); go.disabled = false; go.textContent = 'Entrar'; input.focus(); });
        const submit = () => {
          const code = input.value.replace(/\D/g, '');
          if (code.length !== 6) { input.classList.add('bad'); haptic([20, 40, 20]); return; }
          go.disabled = true;
          go.textContent = 'Comprobando…';
          run({ code });
        };
        input.addEventListener('input', () => {
          input.value = input.value.replace(/\D/g, '').slice(0, 6);
          input.classList.remove('bad');
          if (input.value.length === 6) submit();
        });
        go.addEventListener('click', submit);
        setTimeout(() => input.focus(), 350);
      }
    });
  }

  async function sapi(path, opts = {}) {
    const saved = S.token;
    S.token = store.get('navi_student');
    try { return await api(path, opts); }
    catch (e) { if (e.status === 401) studentLogout(true); throw e; }
    finally { S.token = saved; }
  }

  function studentLogout(expired) {
    store.del('navi_student');
    stopTimers();
    closeSheet(true);
    showAuth('login');
    if (expired) toast({ title: 'Tu sesión terminó', text: 'Acerca otra vez tu tarjeta.', mood: 'sleepy' });
  }

  const WD = ['', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
  const DAY_KIND = { A_TIEMPO: ['ok', 'check', 'A tiempo'], TARDE: ['late', 'clock', 'Atraso'], JUSTIFICADO: ['just', 'heart', 'Justificada'], AUSENTE: ['miss', 'moon', 'Faltaste'], NONE: ['none', '', 'Sin clase'], HOY: ['today', '', 'Hoy'] };
  const BADGE_ICON = { egg: '🥚', flag: '🚩', flame: '🔥', star: '⭐', sun: '🌅', medal: '🏅', shield: '🛡️', trophy: '🏆' };

  function confetti(host, colors) {
    const box = document.createElement('div');
    box.className = 'confetti';
    box.innerHTML = Array.from({ length: 28 }, (_, i) => `<i style="--x:${(Math.random() * 2 - 1).toFixed(2)};--r:${Math.round(Math.random() * 720 - 360)}deg;--d:${(0.7 + Math.random() * 0.7).toFixed(2)}s;background:${colors[i % colors.length]};left:${40 + Math.random() * 20}%"></i>`).join('');
    host.appendChild(box);
    setTimeout(() => box.remove(), 1800);
  }

  async function showStudent() {
    setTimeout(bars, 60);
    stopTimers();
    root.innerHTML = `<div class="kid"><div class="kid-load">${NaviBots.svg('triangle', 'thinking')}</div></div>`;
    let data;
    try { data = await sapi('/student/me'); if (data.renew) store.set('navi_student', data.renew); } catch (e) {
      if (e.code === 'OFFLINE') { root.innerHTML = `<div class="auth"><div class="auth-card"><div class="auth-bot">${NaviBots.svg('triangle', 'sad')}</div><h1>Sin conexión</h1><div class="bubble error">No puedo llegar al servidor del colegio.</div><button class="btn btn-primary btn-lg btn-block" id="retryBtn">Reintentar</button></div></div>`; $('#retryBtn').addEventListener('click', () => showStudent()); }
      return;
    }
    let pet = null;
    const render = d => {
      const st = d.student;
      const info = mascotInfo(st.mascot);
      const name = st.mascot_name || info.name;
      const goal = d.course_goal;
      const pct = Math.round(goal.rate * 100);
      const lvlPct = Math.round(((5 - d.next_level_in) / 5) * 100);
      const todayLabel = { A_TIEMPO: 'A tiempo', TARDE: 'Atraso', JUSTIFICADO: 'Falta justificada', AUSENTE: 'Hoy no marcaste', NONE: d.today.school ? 'Aún no marcas' : 'Hoy no hay clases' }[d.today.kind] || '';
      root.innerHTML = `
        <div class="kid" style="--pet:${info.color}">
          <header class="kid-top"><div class="kid-brand">N.A.V.I</div><button class="btn btn-gray btn-sm" id="kidOut">Salir</button></header>
          <section class="kid-hero">
            <div class="kid-glow"></div>
            <div class="kid-pet" id="kidPet" title="Tócame"></div>
            <div class="kid-say" id="kidSay">${esc(d.line)}</div>
          </section>
          <div class="kid-name"><h1>Hola, ${esc(st.first_name)}</h1><button type="button" class="kid-petname" id="petName">${esc(name)} ${icon('wand')}</button><small>Mascota ${info.number} de 40 · ${esc(NaviMascots.describe(st.mascot))}. Nadie más en tu curso la tiene.</small></div>
          ${lifeHtml(d.pet, name)}
          <div class="kid-grid">
            <div class="kid-card today ${DAY_KIND[d.today.kind] ? DAY_KIND[d.today.kind][0] : ''}"><span class="lbl">Hoy</span><b>${todayLabel}</b><small>${d.today.time && (d.today.kind === 'A_TIEMPO' || d.today.kind === 'TARDE') ? `Marcaste a las ${d.today.time}${d.today.verified ? ' · tarjeta verificada' : ''}` : `Entrada ${esc(st.schedule_start)}`}</small></div>
            <div class="kid-card"><span class="lbl">Tu semana</span><div class="week">${d.week.map(w => { const k = DAY_KIND[w.kind] || DAY_KIND.NONE; return `<div class="wd ${k[0]}" title="${k[2]}"><i>${k[1] ? icon(k[1]) : ''}</i><span>${WD[w.weekday]}</span></div>`; }).join('')}</div><small>${(() => { const n = d.week.filter(w => w.kind === 'A_TIEMPO').length; return n ? `${n} ${n === 1 ? 'día' : 'días'} a tiempo` : 'Verde = llegaste a tiempo'; })()}</small></div>
            <div class="kid-card level"><span class="lbl">Nivel ${d.level}</span><div class="bar"><span style="width:${lvlPct}%"></span></div><small>${d.punctual} ${d.punctual === 1 ? 'día puntual' : 'días puntuales'} · ${d.punctual === 0 ? 'Llega a tiempo y sumas tu primer día' : d.next_level_in === 5 ? '¡Subiste de nivel!' : `faltan ${d.next_level_in} para el nivel ${d.level + 1}`}</small>${d.streak > 1 ? `<div class="streak">🔥 ${d.streak} días seguidos a tiempo</div>` : ''}</div>
            <div class="kid-card goal ${goal.reached ? 'won' : ''}"><span class="lbl">Meta del curso</span><b>${goal.days ? `${pct}% de asistencia` : 'Empieza el lunes'}</b><div class="bar"><span style="width:${Math.min(100, pct)}%"></span><em style="left:${goal.goal * 100}%"></em></div><small>${goal.reached ? '¡Lo lograron! Todas las mascotas del curso celebran.' : `Si el curso llega al ${Math.round(goal.goal * 100)}% esta semana, todas las mascotas celebran.`}</small></div>
          </div>
          <div class="group-title">Logros</div>
          <div class="badges">${d.badges.map(b => `<div class="badge ${b.got ? 'got' : ''}" title="${esc(b.title)}"><span>${BADGE_ICON[b.icon] || '★'}</span><small>${esc(b.title)}</small></div>`).join('')}</div>
          <div class="group" style="margin-top:22px"><button class="cell has-icon" id="kidHealth">${ico('medical', 'red')}<div class="grow"><div class="t">Mi ficha médica</div><div class="s">Lo que verá alguien que te ayude en una emergencia</div></div>${icon('chevron', 'chev')}</button></div>
          ${historyHtml(d.pet)}
          <p class="group-foot" style="text-align:center;margin:18px 0 8px">Tu mascota es privada: solo tú la ves. Cada falta sin justificar le quita un corazón y cada día que vienes los recupera todos. Si faltas ${d.pet.life} días de clase seguidos sin justificar, se va. Las faltas justificadas no le afectan.</p>
        </div>`;
      pet = NaviBots.mount($('#kidPet'), { character: mascotKey(st.mascot), mood: d.mood });
      $('#kidOut').addEventListener('click', e => confirmTap(e.currentTarget, '¿Salir?', () => studentLogout(false)));
      $('#kidPet').addEventListener('click', () => {
        const lines = [`¡Hola, ${st.first_name}!`, 'Me gusta cuando llegas temprano.', `Llevamos ${d.punctual} días juntos a tiempo.`, '¡Cosquillas!', `Soy ${name}, la mascota ${info.number} de 40.`];
        $('#kidSay').textContent = lines[Math.floor(Math.random() * lines.length)];
      });
      $('#petName').addEventListener('click', () => renamePet(st, name));
      $('#kidHealth').addEventListener('click', openOwnHealth);
      if (goal.reached && !sessionStorage.getItem('navi_goal')) { try { sessionStorage.setItem('navi_goal', '1'); } catch (e) {} setTimeout(() => confetti($('.kid-hero'), ['#FFD60A', '#34C759', '#0A84FF', '#FF375F', info.color]), 500); }
    };
    if (data.pet && data.pet.dead) return petGone(data);
    if (!data.student.mascot_unlocked) return sleepingEgg(data);
    if (!data.student.mascot_hatched) return hatch(data, () => sapi('/student/me').then(render));
    render(data);
    const refresh = () => sapi('/student/me').then(d => { data = d; if (d.pet && d.pet.dead) return showStudent(); if (pet && document.visibilityState === 'visible') render(d); }).catch(() => {});
    const t = setInterval(refresh, 30000);
    const vis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', vis);
    S.timers.push(() => { clearInterval(t); document.removeEventListener('visibilitychange', vis); });
  }

  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>';

  function lifeHtml(p, name) {
    if (!p) return '';
    const hearts = Array.from({ length: p.life }, (_, i) => `<i class="${i < p.health ? 'on' : ''}" style="--i:${i}">${HEART}</i>`).join('');
    const msg = p.run === 0 ? `${esc(name)} tiene toda su energía.` : p.health === 1 ? `Último corazón: si faltas un día más sin justificar, ${esc(name)} se va.` : `${p.run} ${p.run === 1 ? 'falta seguida' : 'faltas seguidas'} sin justificar. Ven a clase y recupera todos los corazones.`;
    return `<div class="kid-life ${p.health <= 2 ? 'low' : ''}"><div class="hearts" aria-label="${p.health} de ${p.life} corazones">${hearts}</div><b>${esc(p.label)}</b><small>${msg}</small></div>`;
  }

  function historyHtml(p) {
    if (!p || !p.history || !p.history.length) return '';
    return `<div class="group-title">Mascotas que te acompañaron</div><div class="kid-past">${p.history.map(h => { const i = mascotInfo(h.mascot); return `<div class="past"><span>${NaviBots.svg(mascotKey(h.mascot), 'sleepy')}</span><b>${esc(h.mascot_name || i.name)}</b><small>${h.punctual_days} ${h.punctual_days === 1 ? 'día' : 'días'} a tiempo</small></div>`; }).join('')}</div>`;
  }

  function petGone(data) {
    const st = data.student;
    const p = data.pet;
    const info = mascotInfo(st.mascot);
    const name = st.mascot_name || info.name;
    const last = p.history[0] || {};
    const fmt = d => { try { return new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'long' }); } catch (e) { return d; } };
    root.innerHTML = `
      <div class="kid hatch gone-wrap" style="--pet:${info.color}">
        <header class="kid-top" style="position:absolute;top:0;left:16px;right:16px"><div class="kid-brand">N.A.V.I</div><button class="btn btn-gray btn-sm" id="kidOut">Salir</button></header>
        <div class="ghost-pet">${NaviBots.svg(mascotKey(st.mascot), 'sleepy')}</div>
        <h1>${esc(name)} se fue</h1>
        <p>Faltaste ${p.life} días de clase seguidos sin justificar y ${esc(name)} se cansó de esperarte. ${last.born_on ? `Te acompañó desde el ${esc(fmt(last.born_on))}` : 'Te acompañó'}${last.punctual_days ? ` y llegaron a tiempo ${last.punctual_days} ${last.punctual_days === 1 ? 'día' : 'días'}` : ''}.</p>
        <div class="gone-note">${icon('info')}<span>Si alguna de esas faltas tiene justificación, pide a tu docente que la registre y ${esc(name)} vuelve.</span></div>
        <div class="group-title" style="margin-top:22px">Elige un huevo nuevo</div>
        <div class="egg-pick">${p.choices.map(i => `<button type="button" data-m="${i}" style="--egg:${mascotInfo(i).color}"><span class="mini-egg"></span><small>¿Quién saldrá?</small></button>`).join('')}</div>
        <p class="foot" style="margin-top:14px">Tu nueva mascota empieza en el nivel 1. Tus logros se quedan contigo.</p>
      </div>`;
    $('#kidOut').addEventListener('click', e => confirmTap(e.currentTarget, '¿Salir?', () => studentLogout(false)));
    $('.egg-pick').addEventListener('click', async e => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      $$('.egg-pick button').forEach(x => { x.disabled = true; x.classList.toggle('picked', x === b); });
      haptic(12);
      SFX.play('tap');
      try { await sapi('/student/adopt', { method: 'POST', body: { mascot: Number(b.dataset.m) } }); setTimeout(() => showStudent(), 450); } catch (err) { toast({ title: 'No se pudo', text: err.message, mood: 'sad' }); $$('.egg-pick button').forEach(x => { x.disabled = false; }); }
    });
    const t = setInterval(async () => { try { const d = await sapi('/student/me'); if (!d.pet.dead) { clearInterval(t); SFX.play('success'); showStudent(); } } catch (e) {} }, 30000);
    S.timers.push(() => clearInterval(t));
  }

  function sleepingEgg(data) {
    const st = data.student;
    const info = mascotInfo(st.mascot);
    root.innerHTML = `
      <div class="kid hatch" style="--pet:${info.color}">
        <header class="kid-top" style="position:absolute;top:0;left:16px;right:16px"><div class="kid-brand">N.A.V.I</div><button class="btn btn-gray btn-sm" id="kidOut">Salir</button></header>
        <div class="kid-glow"></div>
        <div class="egg sleeping"><div class="egg-shell"></div><span class="zz">z</span><span class="zz z2">z</span></div>
        <h1>${esc(st.first_name)}, tu mascota está dormida en el huevo</h1>
        <p>Acerca tu tarjeta al <b>lector del aula</b> para que nazca. Va a aparecer en la pantalla del lector.</p>
        <div class="listen" style="margin-top:6px"><span class="pulse"></span>Esperando tu toque en el lector…</div>
        <div id="eggDemo"></div>
      </div>`;
    $('#kidOut').addEventListener('click', e => confirmTap(e.currentTarget, '¿Salir?', () => studentLogout(false)));
    const t = setInterval(async () => {
      try { const d = await sapi('/student/me'); if (d.student.mascot_unlocked) { clearInterval(t); SFX.play('success'); showStudent(); } } catch (e) {}
    }, 3000);
    S.timers.push(() => clearInterval(t));
    api('/student/demo-list').then(() => {
      const d = $('#eggDemo');
      if (!d) return;
      d.innerHTML = '<button class="btn btn-tinted" id="eggSim" style="margin-top:16px">Simular el lector (versión de prueba)</button>';
      $('#eggSim').addEventListener('click', async () => { try { await sapi('/student/demo-unlock', { method: 'POST' }); clearInterval(t); showStudent(); } catch (e) {} });
    }).catch(() => {});
  }

  function hatch(data, after) {
    const st = data.student;
    const info = mascotInfo(st.mascot);
    let taps = 0;
    root.innerHTML = `
      <div class="kid hatch" style="--pet:${info.color}">
        <div class="kid-glow"></div>
        <div class="egg" id="egg"><div class="egg-shell"></div><div class="egg-crack"></div></div>
        <h1>${esc(st.first_name)}, tu mascota está por nacer</h1>
        <p>Toca el huevo tres veces.</p>
      </div>`;
    $('#egg').addEventListener('click', async () => {
      taps++;
      const egg = $('#egg');
      egg.classList.remove('wobble'); void egg.offsetWidth; egg.classList.add('wobble');
      egg.dataset.taps = taps;
      haptic(10 * taps);
      SFX.play(taps < 3 ? 'tap' : 'success');
      if (taps < 3) return;
      const wrap = $('.hatch');
      wrap.innerHTML = `<div class="kid-glow"></div><div class="kid-pet born" id="bornPet"></div><h1>¡Hola! Soy ${esc(info.name)}</h1><p>Soy la mascota ${info.number} de 40 y solo tú me tienes en tu curso. Cuando llegues a tiempo creceré contigo.</p><button class="btn btn-primary btn-lg" id="goPet">Ver a ${esc(info.name)}</button>`;
      NaviBots.mount($('#bornPet'), { character: mascotKey(st.mascot), mood: 'happy' });
      confetti(wrap, ['#FFD60A', '#34C759', '#0A84FF', '#FF375F', info.color]);
      try { await sapi('/student/me', { method: 'PATCH', body: { hatched: true } }); } catch (e) {}
      $('#goPet').addEventListener('click', () => showStudent());
    });
  }

  function renamePet(st, current) {
    openSheet({
      title: 'Nombre de tu mascota',
      left: '<button class="btn btn-plain" data-close>Cancelar</button>',
      right: '<button class="btn btn-plain" id="savePet" style="font-weight:600">Guardar</button>',
      body: `<div class="pin-head" style="margin:8px auto 16px">${NaviBots.svg(mascotKey(st.mascot), 'shy')}</div><form id="petForm" class="group" novalidate>${frow('mascot_name', 'Nombre', { value: st.mascot_name || '', placeholder: mascotInfo(st.mascot).name, attrs: 'maxlength="18" autocomplete="off"' })}</form><p class="group-foot">Déjalo vacío para usar su nombre original.</p>`,
      onMount(el) {
        $('#savePet', el).addEventListener('click', async () => {
          try { await sapi('/student/me', { method: 'PATCH', body: { mascot_name: $('[name=mascot_name]', el).value } }); closeSheet(); showStudent(); } catch (e) { toast({ title: 'No se pudo', text: e.message, mood: 'sad' }); }
        });
      }
    });
  }

  async function openOwnHealth() {
    let h;
    try { h = (await sapi('/student/health')).health; } catch (e) { return; }
    const list = (arr, f) => (arr && arr.length ? arr.map(f).join('') : '<div class="cell"><div class="grow s">Nada registrado</div></div>');
    openSheet({
      title: 'Mi ficha médica',
      body: h ? `
        <div class="group-title">Alergias</div><div class="group">${list(h.allergies, a => `<div class="cell"><div class="grow"><div class="t">${esc(a.name)}</div><div class="s">${esc(a.reaction || '')}</div></div><span class="pill ${a.severity === 'GRAVE' ? 'p-abs' : 'p-late'}">${esc(a.severity === 'GRAVE' ? 'Grave' : a.severity === 'LEVE' ? 'Leve' : 'Moderada')}</span></div>`)}</div>
        <div class="group-title">Condiciones</div><div class="group">${list(h.conditions, c => `<div class="cell"><div class="grow"><div class="t">${esc(c.name)}</div><div class="s">${esc(c.notes || '')}</div></div></div>`)}</div>
        <div class="group-title">Medicamentos</div><div class="group">${list(h.medications, m => `<div class="cell"><div class="grow"><div class="t">${esc(m.name)}</div><div class="s">${esc(m.dose || '')}</div></div></div>`)}</div>
        <p class="group-foot">${h.consent ? 'Tu representante autorizó que esta información se muestre si alguien acerca un celular a tu tarjeta.' : 'Esta ficha no se muestra con la tarjeta porque tu representante no lo ha autorizado.'} Si algo está mal, avisa a tu docente.</p>` : emptyHtml('neutral', 'Sin ficha médica', 'Tu representante puede pedir al colegio que la complete.')
    });
  }

  async function openCardTools(st) {
    let acc;
    try { acc = await api(`/students/${st.id}/access`); } catch (e) { return toast({ title: 'No se pudo abrir', text: e.message, mood: 'sad' }); }
    let cred = null;
    openSheet({
      title: 'Tarjeta y acceso',
      body: `
        <div class="notif-hero">${ico('shield', 'green')}<div><b>Credencial cifrada</b><small>Firma HMAC-SHA256 ligada al número de la tarjeta (${esc(st.nfc_uid)})</small></div></div>
        <div class="group">
          <button type="button" class="cell has-icon" id="cReader">${ico('nfc', 'green')}<div class="grow"><div class="t b">Grabar con el lector del aula</div><div class="s">No necesita un celular con NFC</div></div>${icon('chevron', 'chev')}</button>
          <button type="button" class="cell has-icon" id="cAssign">${ico('plus', 'blue')}<div class="grow"><div class="t">Tarjeta nueva con el lector</div><div class="s">Asigna una tarjeta en blanco o de reemplazo y la graba</div></div>${icon('chevron', 'chev')}</button>
        </div>
        <div id="cWait"></div>
        <div class="group-title">Estado</div>
        <div class="group">
          <div class="cell has-icon">${ico('nfc', 'blue')}<div class="grow"><div class="t">Credencial</div><div class="s">${acc.card_ver ? `Versión ${acc.card_ver}` : 'Aún no se ha grabado'}</div></div><span class="pill ${acc.card_ver ? 'p-ok' : 'p-none'}">${acc.card_ver ? 'Activa' : 'Sin grabar'}</span></div>
          <div class="cell has-icon">${ico('person', 'indigo')}<div class="grow"><div class="t">PIN del estudiante</div><div class="s">${acc.has_pin ? `Creado · ${acc.devices.length} ${acc.devices.length === 1 ? 'celular vinculado' : 'celulares vinculados'}` : 'Lo crea el estudiante la primera vez'}</div></div></div>
        </div>
        <div class="group" style="margin-top:22px">
          ${NFC.available() ? `<button type="button" class="cell has-icon" id="cWrite">${ico('nfc', 'green')}<div class="grow"><div class="t b">${acc.card_ver ? 'Volver a grabar la tarjeta' : 'Grabar la tarjeta'}</div><div class="s">Enlace de emergencia + credencial firmada</div></div>${icon('chevron', 'chev')}</button>` : ''}
          <button type="button" class="cell has-icon" id="cCopy">${ico('copy', 'gray')}<div class="grow"><div class="t">Copiar la credencial</div><div class="s">Para grabarla con NFC Tools (registro de texto)</div></div></button>
          <button type="button" class="cell has-icon" id="cRotate">${ico('refresh', 'orange')}<div class="grow"><div class="t">Tarjeta perdida: nueva credencial</div><div class="s">La credencial anterior deja de servir al instante</div></div></button>
          <button type="button" class="cell has-icon" id="cReset">${ico('xcircle', 'red')}<div class="grow"><div class="t">Restablecer PIN y celulares</div><div class="s">Si olvidó su PIN o cambió de celular</div></div></button>
        </div>
        <div id="cOut"></div>
        <p class="group-foot">La tarjeta guarda dos registros: un enlace (que cualquier celular abre para la ficha de emergencia) y la credencial firmada, que solo el servidor puede comprobar. Si alguien copia solo el número de la tarjeta, el lector del aula lo marca para revisión.</p>`,
      onClose() {
        if (S.writeWait) { api('/write-card', { method: 'DELETE' }).catch(() => {}); clearInterval(S.writeWait.timer); S.writeWait = null; }
      },
      onMount(el) {
        const issue = async rotate => { const r = await api(`/students/${st.id}/credential`, { method: 'POST', body: { rotate } }); cred = r; return r; };
        const wait = $('#cWait', el);
        const arm = async assign => {
          try {
            const r = await api(`/students/${st.id}/write-card`, { method: 'POST', body: { assign } });
            if (S.writeWait) clearInterval(S.writeWait.timer);
            const until = Date.parse(r.until);
            const paint = (msg, bad) => { wait.innerHTML = `<div class="write-wait ${bad ? 'bad' : ''}"><div class="ww-icon">${icon('nfc')}</div><div class="grow"><b>${assign ? 'Acerca la tarjeta nueva al lector' : `Acerca la tarjeta de ${esc(st.first_name)} al lector`}</b><small>${msg || 'Mantenla quieta sobre el lector hasta oír dos bips.'}</small></div><span class="ww-time" id="wwTime"></span><button type="button" class="btn btn-plain btn-sm" id="wwCancel">Cancelar</button></div>`; $('#wwCancel', el).addEventListener('click', stop); tick(); };
            const tick = () => { const left = Math.max(0, Math.round((until - Date.now()) / 1000)); const t = $('#wwTime', el); if (t) t.textContent = left + ' s'; if (!left) stop(true); };
            const stop = expired => { if (!S.writeWait) return; clearInterval(S.writeWait.timer); S.writeWait = null; api('/write-card', { method: 'DELETE' }).catch(() => {}); wait.innerHTML = expired === true ? stateBox(false, 'Se acabó el tiempo. Vuelve a intentarlo.') : ''; };
            S.writeWait = {
              studentId: st.id,
              timer: setInterval(tick, 1000),
              done(p) {
                if (p.ok) {
                  clearInterval(S.writeWait.timer);
                  S.writeWait = null;
                  wait.innerHTML = stateBox(true, `Tarjeta grabada${p.uid ? ` (UID ${esc(p.uid)})` : ''}. ${esc(st.first_name)} ya puede entrar con ella y el lector comprobará su firma.`);
                  SFX.play('success');
                  haptic([10, 40, 10]);
                  loadStudents();
                } else {
                  paint(`No se grabó: ${esc(p.error || 'error')}. Vuelve a acercarla.`, true);
                  SFX.play('warn');
                }
              }
            };
            paint();
            SFX.play('open');
          } catch (err) { wait.innerHTML = stateBox(false, esc(err.message)); }
        };
        $('#cReader', el).addEventListener('click', () => arm(false));
        $('#cAssign', el).addEventListener('click', () => arm(true));
        const w = $('#cWrite', el);
        if (w) w.addEventListener('click', async () => {
          try {
            const c = cred || await issue(false);
            $('#cOut', el).innerHTML = `<div class="listen" style="margin-top:14px"><span class="pulse"></span>Acerca la tarjeta de ${esc(st.first_name)} a este celular…</div>`;
            const res = await NFC.write([{ type: 'url', data: c.url }, { type: 'text', data: c.cred }], st.nfc_uid);
            $('#cOut', el).innerHTML = stateBox(true, `Tarjeta grabada${res.uid ? ` (UID ${esc(res.uid)})` : ''}. Pruébala con "Soy estudiante".`);
            SFX.play('success');
            loadStudents();
          } catch (err) {
            $('#cOut', el).innerHTML = stateBox(false, esc(err.name === 'WRONG_CARD' ? err.message : err.name === 'NotAllowedError' ? 'Permite el uso de NFC en el navegador.' : err.message));
          }
        });
        $('#cCopy', el).addEventListener('click', async () => { try { const c = cred || await issue(false); copyText(c.cred, 'Credencial copiada. En NFC Tools: Escribir → Agregar registro → Texto.'); } catch (e) { toast({ title: 'No se pudo', text: e.message, mood: 'sad' }); } });
        $('#cRotate', el).addEventListener('click', e => confirmTap(e.currentTarget.querySelector('.t'), 'Toca otra vez para cambiarla', async () => {
          try { await issue(true); $('#cOut', el).innerHTML = stateBox(true, 'Nueva credencial creada. Graba la tarjeta nueva para que funcione.'); SFX.play('success'); } catch (err) { toast({ title: 'No se pudo', text: err.message, mood: 'sad' }); }
        }));
        $('#cReset', el).addEventListener('click', e => confirmTap(e.currentTarget.querySelector('.t'), 'Toca otra vez para restablecer', async () => {
          try { await api(`/students/${st.id}/reset-access`, { method: 'POST' }); $('#cOut', el).innerHTML = stateBox(true, `Listo. ${esc(st.first_name)} creará un PIN nuevo la próxima vez.`); } catch (err) { toast({ title: 'No se pudo', text: err.message, mood: 'sad' }); }
        }));
      }
    });
  }

  function openMascotGallery() {
    const course = S.courses.find(c => c.id === S.studentCourse) || S.courses.find(c => c.id === S.rollCourse) || S.courses[0];
    const owners = new Map(S.students.filter(s => course && s.course_id === course.id).map(s => [s.mascot, s]));
    openSheet({
      title: 'Mascotas',
      wide: true,
      body: `
        <p class="group-foot" style="padding:0 4px 12px">40 mascotas distintas: cada estudiante de ${esc(course ? course.name : 'un curso')} tiene una que nadie más del curso tiene.</p>
        <div class="gallery">${NaviMascots.all().map(m => { const o = owners.get(m.index); return `<div class="gm ${o ? 'taken' : ''}"><div class="mk">${NaviBots.svg(m.key, o ? 'happy' : 'neutral')}</div><b>${m.number} ${esc(m.name)}</b><small>${o ? esc(o.first_name + ' ' + o.last_name[0] + '.') : 'Libre'}</small></div>`; }).join('')}</div>`
    });
  }

  function openJustify(r) {
    openSheet({
      title: 'Justificar',
      left: '<button class="btn btn-plain" data-close>Cancelar</button>',
      right: '<button class="btn btn-plain" id="saveJust" style="font-weight:600">Guardar</button>',
      body: `
        <div class="notif-hero">${avatar(r, 'av-lg')}<div><b>${esc(r.student_name)}</b><small>${STATUS[r.status] ? STATUS[r.status].label : r.status} · ${esc(r.date)}</small></div></div>
        <div class="group"><textarea class="ta" id="justNote" rows="3" placeholder="Ej. Certificado médico presentado por la madre">${esc(r.justification || '')}</textarea></div>
        <p class="group-foot">El reglamento de la LOEI pide justificar la falta hasta dos días después del retorno. Una falta justificada no cuenta en la racha ni afecta a la mascota del estudiante.</p>
        ${r.justified ? '<div class="group" style="margin-top:22px"><button type="button" class="cell center danger" id="unJust">Quitar justificación</button></div>' : ''}`,
      onMount(el) {
        const save = async justified => {
          try {
            const rec = await api(`/attendance/${r.id}/justify`, { method: 'POST', body: { justified, note: $('#justNote', el).value } });
            upsertRecord(rec);
            softRefresh();
            closeSheet();
            toast({ title: justified ? 'Falta justificada' : 'Justificación quitada', text: r.student_name, mood: 'happy', sound: 'success' });
          } catch (e) { toast({ title: 'No se pudo', text: e.message, mood: 'sad' }); }
        };
        $('#saveJust', el).addEventListener('click', () => save(true));
        const u = $('#unJust', el);
        if (u) u.addEventListener('click', () => save(false));
      }
    });
  }

  async function boot() {
    try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => setTimeout(bars, 60)); } catch (e) {}
    if (store.get('navi_student')) return showStudent();
    if (!S.token) return showAuth('login');
    try {
      const r = await api('/auth/me');
      S.user = r.user;
      showApp();
    } catch (e) {
      if (e.code === 'OFFLINE') {
        root.innerHTML = `<div class="auth"><div class="auth-card"><div class="auth-bot">${NaviBots.svg(store.get('navi_bot') || 'triangle', 'sad')}</div><h1>Sin conexión</h1><div class="bubble error">No puedo conectarme con el servidor.</div><p class="muted" style="font-size:15px;margin-bottom:18px">Abre INICIAR_NAVI en la PC donde está el servidor y vuelve a intentar.</p><button class="btn btn-primary btn-lg btn-block" id="retryBtn">Reintentar</button></div></div>`;
        $('#retryBtn').addEventListener('click', () => location.reload());
      } else {
        store.del('navi_token');
        S.token = null;
        showAuth('login');
      }
    }
  }

  boot();
})();
