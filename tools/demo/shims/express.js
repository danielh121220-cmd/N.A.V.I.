const MIME = { json: 'application/json', html: 'text/html; charset=utf-8', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', csv: 'text/csv; charset=utf-8', js: 'application/javascript', css: 'text/css', svg: 'image/svg+xml', txt: 'text/plain' };
function compile(path) {
  const keys = [];
  const src = path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\/:(\w+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; });
  return { re: new RegExp('^' + src + '/?$'), keys };
}
class Res {
  constructor(done) { this.statusCode = 200; this.headers = {}; this.headersSent = false; this.body = null; this._done = done; }
  status(c) { this.statusCode = c; return this; }
  setHeader(k, v) { this.headers[String(k).toLowerCase()] = String(v); return this; }
  getHeader(k) { return this.headers[String(k).toLowerCase()]; }
  set(k, v) { if (typeof k === 'object') { for (const [a, b] of Object.entries(k)) this.setHeader(a, b); } else this.setHeader(k, v); return this; }
  header(k, v) { return this.set(k, v); }
  type(t) { return this.setHeader('content-type', t.includes('/') ? t : MIME[t.replace(/^\./, '')] || t); }
  json(o) { this.setHeader('content-type', 'application/json'); return this.end(JSON.stringify(o)); }
  send(b) {
    if (b != null && typeof b === 'object' && !(b instanceof Uint8Array)) return this.json(b);
    if (!this.headers['content-type']) this.setHeader('content-type', typeof b === 'string' ? 'text/html; charset=utf-8' : 'application/octet-stream');
    return this.end(b);
  }
  sendStatus(c) { return this.status(c).end(''); }
  sendFile(p) {
    const fs = require('fs');
    try {
      const d = fs.readFileSync(p);
      if (!this.headers['content-type']) this.type(String(p).split('.').pop());
      this.end(d);
    } catch (e) {
      this.status(404).json({ error: 'No encontrado' });
    }
  }
  redirect(a, b) { const url = b || a; this.status(typeof a === 'number' ? a : 302).setHeader('location', url); return this.end(''); }
  end(b) { if (this.headersSent) return this; this.headersSent = true; this.body = b == null ? null : b; if (this._done) this._done(this); return this; }
}
function express() {
  const stack = [];
  const app = {};
  app.disable = () => app;
  app.enable = () => app;
  app.set = () => app;
  app.use = (a, ...fns) => {
    if (typeof a === 'string') fns.forEach(fn => stack.push({ prefix: a.replace(/\/$/, ''), fn }));
    else [a, ...fns].forEach(fn => stack.push({ fn }));
    return app;
  };
  for (const m of ['get', 'post', 'put', 'patch', 'delete']) {
    app[m] = (path, ...fns) => { const c = compile(path); fns.forEach(fn => stack.push({ method: m.toUpperCase(), route: c, fn })); return app; };
  }
  app.handle = req => new Promise(resolve => {
    const res = new Res(resolve);
    let i = 0;
    const fail = e => { console.error(e); if (!res.headersSent) res.status(500).json({ error: 'Error interno del servidor' }); };
    const next = err => {
      if (err) return fail(err);
      while (i < stack.length) {
        const l = stack[i++];
        if (l.method && l.method !== req.method && !(l.method === 'GET' && req.method === 'HEAD')) continue;
        if (l.route) {
          const m = l.route.re.exec(req.path);
          if (!m) continue;
          req.params = {};
          l.route.keys.forEach((k, j) => { req.params[k] = decodeURIComponent(m[j + 1]); });
        }
        if (l.prefix && !(req.path === l.prefix || req.path.startsWith(l.prefix + '/'))) continue;
        try {
          const r = l.fn(req, res, next);
          if (r && typeof r.catch === 'function') r.catch(fail);
        } catch (e) { fail(e); }
        return;
      }
      if (!res.headersSent) res.status(404).json({ error: 'Ruta no encontrada' });
    };
    next();
  });
  return app;
}
const pass = () => (req, res, next) => next();
express.json = pass;
express.raw = pass;
express.urlencoded = pass;
express.static = pass;
express.Router = express;
module.exports = express;
