const { Buffer } = require('buffer');
const PREFIX = 'navi_demo_f:';
const files = new Map();
const norm = p => String(p).replace(/\\/g, '/').replace(/\/+/g, '/');
const persistable = p => !p.includes('/snapshots/');
try {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) files.set(k.slice(PREFIX.length), Buffer.from(localStorage.getItem(k), 'base64'));
  }
} catch (e) {}
function save(p, b) {
  if (!persistable(p)) return;
  try { localStorage.setItem(PREFIX + p, b.toString('base64')); } catch (e) {}
}
function enoent(p) {
  const e = new Error(`ENOENT: no such file or directory, '${p}'`);
  e.code = 'ENOENT';
  return e;
}
module.exports = {
  __files: files,
  clearAll() {
    files.clear();
    try {
      const ks = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX)) ks.push(k); }
      ks.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  },
  existsSync: p => files.has(norm(p)) || [...files.keys()].some(k => k.startsWith(norm(p) + '/')) || /\/data(\/(faces|snapshots))?$/.test(norm(p)),
  mkdirSync() {},
  readFileSync(p, enc) {
    const b = files.get(norm(p));
    if (!b) throw enoent(p);
    const e = typeof enc === 'string' ? enc : enc && enc.encoding;
    return e ? b.toString(e) : b;
  },
  writeFileSync(p, d) {
    const b = Buffer.isBuffer(d) ? d : d instanceof Uint8Array ? Buffer.from(d) : Buffer.from(String(d));
    files.set(norm(p), b);
    save(norm(p), b);
  },
  unlinkSync(p) {
    if (!files.delete(norm(p))) throw enoent(p);
    try { localStorage.removeItem(PREFIX + norm(p)); } catch (e) {}
  },
  readdirSync(p) {
    const base = norm(p) + '/';
    return [...files.keys()].filter(k => k.startsWith(base)).map(k => k.slice(base.length).split('/')[0]);
  },
  statSync(p) {
    const b = files.get(norm(p));
    if (!b) throw enoent(p);
    return { size: b.length, isFile: () => true, isDirectory: () => false, mtimeMs: Date.now() };
  }
};
