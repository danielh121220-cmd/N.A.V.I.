const initSqlJs = require('sql.js/dist/sql-wasm.js');
const { Buffer } = require('buffer');

let backend = null;
let bootResolve;
const ready = new Promise(r => { bootResolve = r; });
const realFetch = window.fetch.bind(window);

function b64ToBytes(b) {
  const s = atob(b);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}

async function boot() {
  const wasm = b64ToBytes(window.__NAVI_WASM__);
  globalThis.__SQL = await initSqlJs({ wasmBinary: wasm });
  delete window.__NAVI_WASM__;
  const server = require('../../backend/server.js');
  const { db } = require('../../backend/database.js');
  const A = require('../../backend/attendance.js');
  const path = require('path');
  const fs = require('fs');
  db.q("UPDATE students SET face_photo = NULL WHERE face_photo IS NOT NULL").run();
  for (const f of fs.readdirSync(A.FACE_DIR)) {
    const id = Number(f.split('.')[0]);
    if (id) db.q('UPDATE students SET face_photo = ? WHERE id = ?').run(String(Date.now()), id);
  }
  db.q('UPDATE attendances SET snapshot_photo = NULL WHERE snapshot_photo IS NOT NULL').run();
  setTimeout(() => { try { A.runAbsences(); } catch (e) {} }, 2500);
  backend = { app: server.app, server: server.server, db, A, path, fs };
  bootResolve();
}

async function handle(input, init = {}) {
  await ready;
  const url = typeof input === 'string' ? input : input.url;
  const u = new URL(url, location.href);
  const headers = {};
  const h = init.headers || (typeof input !== 'string' && input.headers) || {};
  if (h instanceof Headers) h.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  else for (const [k, v] of Object.entries(h)) headers[k.toLowerCase()] = v;
  let body = init.body;
  if (typeof body === 'string' && (headers['content-type'] || '').includes('json')) {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const req = {
    method: String(init.method || 'GET').toUpperCase(),
    url: u.pathname + u.search,
    originalUrl: u.pathname + u.search,
    path: u.pathname,
    query: Object.fromEntries(u.searchParams),
    headers,
    body,
    socket: { remoteAddress: '127.0.0.1' },
    ip: '127.0.0.1',
    get(k) { return headers[String(k).toLowerCase()]; },
    header(k) { return headers[String(k).toLowerCase()]; }
  };
  const res = await backend.app.handle(req);
  const nobody = res.statusCode === 204 || res.statusCode === 304;
  return new Response(nobody ? null : res.body == null ? '' : res.body, { status: res.statusCode, headers: res.headers });
}

const isLocal = u => (u.pathname.startsWith('/api/') || /^\/e\/[^/]+(\/foto)?$/.test(u.pathname));
window.fetch = (input, init) => {
  try {
    const url = typeof input === 'string' ? input : input && input.url;
    if (url && isLocal(new URL(url, location.href))) return handle(input, init);
  } catch (e) {}
  return realFetch(input, init);
};

const RealWS = window.WebSocket;
class DemoSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.onopen = this.onclose = this.onmessage = this.onerror = null;
    ready.then(() => {
      const u = new URL(url, location.href);
      let refused = false;
      const socket = { client: this, write() {}, destroy() { refused = true; } };
      backend.server.emit('upgrade', { url: u.pathname + u.search, headers: {} }, socket, null);
      if (refused || !this._server) {
        this.readyState = 3;
        if (this.onclose) this.onclose({ code: 1006 });
        return;
      }
      this.readyState = 1;
      if (this.onopen) this.onopen({});
    });
  }
  send(m) { if (this.readyState === 1 && this._server) { const s = this._server; setTimeout(() => s.emit('message', String(m)), 0); } }
  close() { if (this._server) this._server.close(); }
  _recv(m) { if (this.readyState === 1 && this.onmessage) this.onmessage({ data: m }); }
  _closed() { if (this.readyState === 3) return; this.readyState = 3; if (this.onclose) this.onclose({ code: 1000 }); }
  addEventListener(t, f) { this['on' + t] = f; }
}
window.WebSocket = function (url, p) {
  return /\/ws(\?|$)/.test(url) ? new DemoSocket(url) : new RealWS(url, p);
};
window.WebSocket.OPEN = 1;

const urlCache = new Map();
function fileUrl(rel, v) {
  if (!backend) return '';
  const p = backend.path.join(backend.A.FACE_DIR, '..', rel);
  const key = p + '|' + v;
  if (urlCache.has(key)) return urlCache.get(key);
  let buf;
  try { buf = backend.fs.readFileSync(p); } catch (e) { return ''; }
  const url = URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }));
  urlCache.set(key, url);
  return url;
}
function snapUrl(id) {
  if (!backend) return '';
  const r = backend.db.q('SELECT snapshot_photo FROM attendances WHERE id = ?').get(id);
  return r && r.snapshot_photo ? fileUrl(`snapshots/${r.snapshot_photo}`, r.snapshot_photo) : '';
}

function overlay(html, token) {
  const wrap = document.createElement('div');
  wrap.className = 'demo-overlay';
  let page = html;
  const face = token ? fileUrl(`faces/${(backend.db.q('SELECT student_id FROM student_health WHERE token = ?').get(token) || {}).student_id}.jpg`, 'e') : '';
  page = page.replace(/src="\/e\/[^"]+\/foto"/, `src="${face}"`);
  wrap.innerHTML = `<div class="demo-phone"><div class="demo-bar"><span>Vista de quien acerca su celular a la tarjeta</span><button type="button" aria-label="Cerrar">✕</button></div><iframe title="Ficha" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe></div>`;
  wrap.querySelector('iframe').srcdoc = page;
  const close = () => { wrap.classList.add('out'); setTimeout(() => wrap.remove(), 250); };
  wrap.querySelector('button').addEventListener('click', close);
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  document.body.appendChild(wrap);
}

document.addEventListener('click', async e => {
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a) return;
  let u;
  try { u = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
  if (u.origin !== location.origin) return;
  const m = /^\/e\/([^/]+)$/.exec(u.pathname);
  if (m) {
    e.preventDefault();
    e.stopPropagation();
    const res = await handle(u.href);
    overlay(await res.text(), m[1]);
    return;
  }
  if (u.pathname === '/api/export.csv') {
    e.preventDefault();
    e.stopPropagation();
    note('En esta versión de prueba no se descargan archivos. En la app de tu PC el reporte se abre en Excel.');
  }
}, true);

function note(text) {
  const old = document.querySelector('.demo-note');
  if (old) old.remove();
  const n = document.createElement('div');
  n.className = 'demo-note';
  n.textContent = text;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 4200);
}

function resetAll() {
  try { ['navi_demo_db_v1', 'navi_token', 'navi_student', 'navi_device'].forEach(k => localStorage.removeItem(k)); } catch (e) {}
  require('fs').clearAll();
  try { sessionStorage.removeItem('navi_intro'); } catch (e) {}
  location.reload();
}

window.NaviDemo = { ready, file: fileUrl, snap: snapUrl, reset: resetAll };
boot().catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', `<div style="position:fixed;inset:auto 12px 12px;padding:14px;border-radius:14px;background:#FF3B30;color:#fff;font:15px system-ui;z-index:99999">No se pudo iniciar la versión de prueba: ${String(err.message || err)}</div>`);
});
