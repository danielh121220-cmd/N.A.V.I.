const express = require('express');
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const dgram = require('dgram');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const config = require('./config');
const { db, getSettings, setSetting, nextMascot } = require('./database');
const auth = require('./auth');
const notifier = require('./notifier');
const A = require('./attendance');
const T = require('./time');
const H = require('./health');
const ST = require('./student');
const C = require('./credential');
const P = require('./pet');

const app = express();
const server = http.createServer(app);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
const wss = new WebSocketServer({ noServer: true });

app.disable('x-powered-by');
app.use(express.json({ limit: '3mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ws: wss:; media-src 'self' blob:; frame-ancestors 'none'");
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
});

const acceptsGzip = req => /\bgzip\b/.test((req.headers && req.headers['accept-encoding']) || '');
app.use('/api', (req, res, next) => {
  if (!acceptsGzip(req)) return next();
  res.json = body => {
    const text = JSON.stringify(body === undefined ? null : body);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (text.length < 1400) return res.send(text);
    const gz = zlib.gzipSync(text, { level: 5 });
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('Content-Length', gz.length);
    return res.end(gz);
  };
  next();
});

const PUBLIC = path.join(__dirname, 'public');
const fileHash = buf => crypto.createHash('sha1').update(buf).digest('base64url').slice(0, 16);
let swCache = null;
function serviceWorker() {
  const src = fs.readFileSync(path.join(PUBLIC, 'sw.js'), 'utf8');
  const m = /const SHELL = (\[[^\]]*\]);/.exec(src);
  const files = m ? (m[1].match(/'[^']*'/g) || []).map(x => x.slice(1, -1)) : [];
  const stamp = [src.length].concat(files.map(f => { try { return fs.statSync(path.join(PUBLIC, f === '/' ? 'index.html' : f)).mtimeMs; } catch (e) { return 0; } })).join('|');
  if (swCache && swCache.stamp === stamp) return swCache.body;
  const h = crypto.createHash('sha1').update(src);
  for (const f of files) { try { h.update(fs.readFileSync(path.join(PUBLIC, f === '/' ? 'index.html' : f))); } catch (e) {} }
  const body = src.replace(/const VERSION = '[^']*';/, `const VERSION = 'navi-${h.digest('base64url').slice(0, 12)}';`);
  swCache = { stamp, body };
  return body;
}
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  res.send(serviceWorker());
});
const GZ_TYPES = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json; charset=utf-8' };
const gzCache = new Map();
app.use((req, res, next) => {
  if ((req.method !== 'GET' && req.method !== 'HEAD') || !acceptsGzip(req)) return next();
  let rel;
  try { rel = decodeURIComponent(req.path); } catch (e) { return next(); }
  if (rel === '/') rel = '/index.html';
  const type = GZ_TYPES[path.extname(rel)];
  if (!type || rel.startsWith('/api/')) return next();
  const file = path.join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC + path.sep)) return next();
  let st;
  try { st = fs.statSync(file); } catch (e) { return next(); }
  if (!st.isFile() || st.size < 1024) return next();
  let c = gzCache.get(file);
  if (!c || c.mtime !== st.mtimeMs || c.size !== st.size) {
    const raw = fs.readFileSync(file);
    c = { mtime: st.mtimeMs, size: st.size, etag: `"${fileHash(raw)}"`, gz: zlib.gzipSync(raw, { level: 9 }) };
    gzCache.set(file, c);
  }
  res.setHeader('Vary', 'Accept-Encoding');
  res.setHeader('ETag', c.etag);
  res.setHeader('Cache-Control', 'no-cache');
  if (req.headers['if-none-match'] === c.etag) return res.status(304).end();
  res.setHeader('Content-Type', type);
  res.setHeader('Content-Encoding', 'gzip');
  res.setHeader('Content-Length', c.gz.length);
  if (req.method === 'HEAD') return res.end();
  res.end(c.gz);
});
app.use(express.static(PUBLIC, { maxAge: 0, etag: true, setHeaders(res, file) { if (file.includes(`${path.sep}fonts${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); } }));

function scopeOf(user) {
  if (!user || user.role === 'ADMINISTRADOR' || config.demoMode) return null;
  return db.q('SELECT course_id FROM course_teachers WHERE user_id = ?').all(user.id).map(r => r.course_id);
}
const allowed = (scope, courseId) => !scope || scope.includes(Number(courseId));
const deny = res => res.status(403).json({ error: 'Este curso no está asignado a tu cuenta. Pídeselo al administrador.' });
function ownStudent(req, res, next) {
  const st = db.q('SELECT course_id FROM students WHERE id = ?').get(Number(req.params.id));
  if (st && !allowed(scopeOf(req.user), st.course_id)) return deny(res);
  next();
}
function ownCourse(req, res, next) {
  if (!allowed(scopeOf(req.user), req.params.courseId || req.params.id)) return deny(res);
  next();
}
function ownAttendance(req, res, next) {
  const a = db.q('SELECT course_id FROM attendances WHERE id = ?').get(Number(req.params.id));
  if (a && !allowed(scopeOf(req.user), a.course_id)) return deny(res);
  next();
}
function wsScope(ws) {
  if (!ws.userId) return null;
  if (!ws.scopeAt || Date.now() - ws.scopeAt > 30000) {
    ws.scope = scopeOf(db.q('SELECT id, role FROM users WHERE id = ?').get(ws.userId));
    ws.scopeAt = Date.now();
  }
  return ws.scope;
}
function payloadCourse(type, p) {
  if (!p) return null;
  if (type === 'attendance' || type === 'student') return p.course_id != null ? p.course_id : p.id != null && type === 'student' ? (db.q('SELECT course_id FROM students WHERE id = ?').get(p.id) || {}).course_id : null;
  if (type === 'notification' || type === 'mascot_died' || type === 'mascot_revived' || type === 'mascot_adopted' || type === 'mascot_unlocked') {
    const sid = p.student_id;
    return sid ? (db.q('SELECT course_id FROM students WHERE id = ?').get(sid) || {}).course_id : null;
  }
  return null;
}

function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload, at: new Date().toISOString() });
  let course;
  let resolved = false;
  for (const client of wss.clients) {
    if (client.readyState !== 1) continue;
    const scope = wsScope(client);
    if (scope) {
      if (!resolved) { course = payloadCourse(type, payload); resolved = true; }
      if (course != null && !scope.includes(Number(course))) continue;
    }
    client.send(msg);
  }
}
function resetScopes() {
  for (const client of wss.clients) client.scopeAt = 0;
}
A.setBroadcast(broadcast);
P.setHooks({
  died(s, run) {
    broadcast('mascot_died', { student_id: s.id, first_name: s.first_name, last_name: s.last_name, mascot: s.mascot, run });
    const recent = db.q("SELECT 1 FROM notifications WHERE student_id = ? AND kind = 'ABSENT_STREAK' AND created_at > ?").get(s.id, new Date(Date.now() - 7 * 86400000).toISOString().replace('T', ' ').slice(0, 19));
    if (getSettings().notify_on_absent && !recent) setImmediate(() => notifier.notify('ABSENT_STREAK', s.id, null));
  },
  revived(s) {
    broadcast('mascot_revived', { student_id: s.id, first_name: s.first_name, mascot: s.mascot });
  }
});
notifier.setListener(n => broadcast('notification', n), u => broadcast('notification_update', u));

const wrap = fn => (req, res) => {
  try {
    const out = fn(req, res);
    if (out && typeof out.catch === 'function') out.catch(e => fail(res, e));
  } catch (e) {
    fail(res, e);
  }
};

function fail(res, e) {
  console.error(e);
  if (res.headersSent) return;
  const msg = String(e.message || e);
  if (msg.includes('UNIQUE') && msg.includes('nfc_uid')) return res.status(409).json({ error: 'Esa tarjeta ya está asignada a otro estudiante' });
  if (msg.includes('UNIQUE') && msg.includes('student_code')) return res.status(409).json({ error: 'Ese código de estudiante ya existe' });
  if (msg.includes('UNIQUE') && msg.includes('code')) return res.status(409).json({ error: 'Ese código de curso ya existe' });
  res.status(500).json({ error: 'Error interno del servidor' });
}

const loginAttempts = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of loginAttempts) if (!list.some(t => now - t < 5 * 60000)) loginAttempts.delete(ip);
}, 10 * 60000).unref();
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (loginAttempts.get(ip) || []).filter(t => now - t < 5 * 60000);
  loginAttempts.set(ip, list);
  return list.length >= 12;
}
function noteAttempt(ip) {
  const list = loginAttempts.get(ip) || [];
  list.push(Date.now());
  loginAttempts.set(ip, list);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const AVATARS = ['pebble', 'triangle', 'cloud', 'circle', 'capsule', 'clover'];

function issue(res, userId, status = 200) {
  const user = db.q(auth.publicUserSql).get(userId);
  res.status(status).json({ user, token: auth.createToken(userId) });
}

app.post('/api/auth/register', wrap((req, res) => {
  const { name, email, password, institution_name, avatar } = req.body || {};
  const fields = [];
  if (!name || !String(name).trim()) fields.push('name');
  if (!email || !String(email).trim()) fields.push('email');
  if (!password) fields.push('password');
  if (fields.length) return res.status(400).json({ error: 'Completa los campos marcados', code: 'EMPTY', fields });
  const cleanEmail = String(email).toLowerCase().trim();
  if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ error: 'Ese correo no parece válido', code: 'BAD_EMAIL', fields: ['email'] });
  if (String(password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres', code: 'SHORT_PASSWORD', fields: ['password'] });
  if (db.q('SELECT 1 FROM users WHERE email = ?').get(cleanEmail)) return res.status(409).json({ error: 'Ese correo ya tiene una cuenta', code: 'EMAIL_TAKEN', fields: ['email'] });
  const realUsers = db.q("SELECT COUNT(*) AS c FROM users WHERE email != 'demo@navi.local'").get().c;
  const role = realUsers === 0 ? 'ADMINISTRADOR' : 'DOCENTE';
  const id = db.q('INSERT INTO users (name, email, password_hash, role, institution_name, avatar) VALUES (?, ?, ?, ?, ?, ?)')
    .run(String(name).trim().slice(0, 80), cleanEmail, auth.hashPassword(String(password)), role, String(institution_name || config.institutionName).trim().slice(0, 100), AVATARS.includes(avatar) ? avatar : 'triangle').lastInsertRowid;
  issue(res, id, 201);
}));

app.post('/api/auth/login', wrap((req, res) => {
  const ip = req.socket.remoteAddress;
  if (tooManyAttempts(ip)) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.', code: 'LOCKED' });
  const { email, password } = req.body || {};
  const fields = [];
  if (!email || !String(email).trim()) fields.push('email');
  if (!password) fields.push('password');
  if (fields.length) return res.status(400).json({ error: fields.length === 2 ? 'Escribe tu correo y contraseña' : fields[0] === 'email' ? 'Te faltó tu correo' : 'Te faltó tu contraseña', code: 'EMPTY', fields });
  const cleanEmail = String(email).toLowerCase().trim();
  if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ error: 'Ese correo no parece válido', code: 'BAD_EMAIL', fields: ['email'] });
  const user = db.q('SELECT * FROM users WHERE email = ?').get(cleanEmail);
  if (!user) {
    noteAttempt(ip);
    return res.status(404).json({ error: 'No encuentro una cuenta con ese correo', code: 'NO_USER', fields: ['email'] });
  }
  if (!auth.verifyPassword(String(password), user.password_hash)) {
    noteAttempt(ip);
    return res.status(401).json({ error: 'Contraseña incorrecta', code: 'BAD_PASSWORD', fields: ['password'] });
  }
  issue(res, user.id);
}));

app.post('/api/auth/demo', wrap((req, res) => {
  if (!config.demoMode) return res.status(403).json({ error: 'El modo demostración está desactivado' });
  let user = db.q("SELECT id FROM users WHERE email = 'demo@navi.local'").get();
  if (!user) {
    const id = db.q('INSERT INTO users (name, email, password_hash, role, institution_name, avatar) VALUES (?, ?, ?, ?, ?, ?)')
      .run('Docente Demo', 'demo@navi.local', auth.hashPassword(require('crypto').randomBytes(16).toString('hex')), 'DOCENTE', config.institutionName, 'capsule').lastInsertRowid;
    user = { id };
  }
  issue(res, user.id);
}));

app.get('/api/auth/me', auth.requireUser, (req, res) => res.json({ user: req.user }));

app.patch('/api/auth/me', auth.requireUser, wrap((req, res) => {
  const { name, institution_name, avatar } = req.body || {};
  db.q('UPDATE users SET name = COALESCE(?, name), institution_name = COALESCE(?, institution_name), avatar = COALESCE(?, avatar) WHERE id = ?')
    .run(name ? String(name).trim().slice(0, 80) : null, institution_name ? String(institution_name).trim().slice(0, 100) : null, AVATARS.includes(avatar) ? avatar : null, req.user.id);
  res.json({ user: db.q(auth.publicUserSql).get(req.user.id) });
}));

app.post('/api/auth/tour', auth.requireUser, wrap((req, res) => {
  db.q("UPDATE users SET tour_at = datetime('now', 'localtime') WHERE id = ?").run(req.user.id);
  res.json({ ok: true });
}));

app.post('/api/auth/password', auth.requireUser, wrap((req, res) => {
  const { current, next } = req.body || {};
  const row = db.q('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!auth.verifyPassword(String(current || ''), row.password_hash)) return res.status(401).json({ error: 'La contraseña actual no coincide', code: 'BAD_PASSWORD' });
  if (!next || String(next).length < 6) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres', code: 'SHORT_PASSWORD' });
  db.q('UPDATE users SET password_hash = ? WHERE id = ?').run(auth.hashPassword(String(next)), req.user.id);
  res.json({ ok: true });
}));

app.get('/api/users', auth.requireAdmin, (req, res) => {
  res.json(db.q("SELECT id, name, email, role, avatar, created_at FROM users WHERE email != 'demo@navi.local' ORDER BY id").all());
});

app.patch('/api/users/:id', auth.requireAdmin, wrap((req, res) => {
  const role = req.body && req.body.role;
  if (!['ADMINISTRADOR', 'DOCENTE', 'INSPECTOR'].includes(role)) return res.status(400).json({ error: 'Rol no válido' });
  const id = Number(req.params.id);
  if (id === req.user.id && role !== 'ADMINISTRADOR') return res.status(400).json({ error: 'No puedes quitarte tu propio rol de administrador' });
  db.q('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  res.json({ ok: true });
}));

app.get('/api/info', (req, res) => {
  res.json({
    demo_mode: config.demoMode,
    institution: config.institutionName,
    setup: db.q("SELECT COUNT(*) AS c FROM users WHERE email != 'demo@navi.local'").get().c === 0
  });
});

app.get('/api/status', auth.requireUser, (req, res) => {
  const date = req.query.date || T.localDate();
  res.json({
    date,
    server_time: new Date().toISOString(),
    stats: A.stats(date, scopeOf(req.user)),
    channels: notifier.status(),
    demo_mode: config.demoMode,
    public_url: config.publicUrl || null,
    lan_ip: lanAddresses()[0] || null,
    port: config.port,
    settings: getSettings()
  });
});

app.get('/api/settings', auth.requireUser, (req, res) => res.json(getSettings()));

app.patch('/api/settings', auth.requireUser, wrap((req, res) => {
  if (req.user.role !== 'ADMINISTRADOR' && !config.demoMode) return res.status(403).json({ error: 'Solo un administrador puede hacer esto.' });
  const allowed = ['notify_on_arrival', 'notify_on_late', 'notify_on_absent', 'auto_absences'];
  for (const k of allowed) if (typeof req.body[k] === 'boolean') setSetting(k, req.body[k]);
  res.json(getSettings());
}));

const canConfigure = req => req.user.role === 'ADMINISTRADOR' || config.demoMode;

app.get('/api/messaging', auth.requireUser, (req, res) => {
  if (!canConfigure(req)) return res.status(403).json({ error: 'Solo un administrador puede ver esto.' });
  res.json({ config: notifier.publicConfig(), status: notifier.status() });
});

app.put('/api/messaging', auth.requireUser, wrap(async (req, res) => {
  if (!canConfigure(req)) return res.status(403).json({ error: 'Solo un administrador puede hacer esto.' });
  let cfg;
  try {
    cfg = notifier.saveConfig(req.body || {});
  } catch (e) {
    return res.status(400).json({ error: e.message, fields: e.fields });
  }
  const b = req.body || {};
  const mailTouched = ['mail_provider', 'mail_host', 'mail_port', 'mail_user', 'mail_pass'].some(k => b[k] !== undefined);
  const verify = mailTouched && cfg.mail_source === 'app' ? await notifier.verifyMail() : null;
  broadcast('channels', notifier.status());
  res.json({ config: cfg, status: notifier.status(), verify });
}));

app.post('/api/messaging/test', auth.requireUser, wrap(async (req, res) => {
  if (!canConfigure(req)) return res.status(403).json({ error: 'Solo un administrador puede hacer esto.' });
  const b = req.body || {};
  const out = b.channel === 'whatsapp' ? await notifier.testWhatsapp(b.to) : b.channel === 'sms' ? await notifier.testSms(b.to) : await notifier.testEmail(b.to, b.kind);
  res.status(out.ok ? 200 : 400).json(out.ok ? out : { ...out, error: out.error });
}));

app.get('/api/terminal/key', auth.requireAdmin, (req, res) => res.json({ key: config.terminalKey }));

app.get('/api/courses', auth.requireUser, (req, res) => {
  const date = req.query.date || T.localDate();
  const scope = scopeOf(req.user);
  const courses = db.q('SELECT * FROM courses ORDER BY id').all().filter(c => allowed(scope, c.id));
  const links = db.q('SELECT ct.course_id, u.id, u.name FROM course_teachers ct JOIN users u ON u.id = ct.user_id ORDER BY u.name').all();
  const totals = db.q('SELECT course_id, COUNT(*) AS c FROM students WHERE active = 1 GROUP BY course_id').all();
  const att = db.q('SELECT course_id, status, COUNT(*) AS c FROM attendances WHERE date = ? GROUP BY course_id, status').all(date);
  const tmap = Object.fromEntries(totals.map(t => [t.course_id, t.c]));
  res.json(courses.map(c => {
    const rows = att.filter(a => a.course_id === c.id);
    const get = s => (rows.find(r => r.status === s) || { c: 0 }).c;
    const present = get('A_TIEMPO') + get('TARDE');
    const total = tmap[c.id] || 0;
    return { ...c, teachers: links.filter(l => l.course_id === c.id).map(l => ({ id: l.id, name: l.name })), total_students: total, present, late: get('TARDE'), absent: get('AUSENTE'), percentage: total ? Math.round((present / total) * 100) : 0 };
  }));
});

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function courseInput(b) {
  const out = {};
  if (b.name !== undefined) out.name = String(b.name).trim().slice(0, 100);
  if (b.code !== undefined) out.code = String(b.code).trim().toUpperCase().slice(0, 20);
  if (b.teacher !== undefined) out.teacher = String(b.teacher).trim().slice(0, 80);
  if (b.classroom !== undefined) out.classroom = String(b.classroom).trim().slice(0, 80);
  if (b.schedule_start !== undefined) {
    if (!TIME_RE.test(b.schedule_start)) throw Object.assign(new Error('Hora de entrada no válida (usa HH:MM)'), { http: 400 });
    out.schedule_start = b.schedule_start;
  }
  if (b.late_tolerance_min !== undefined) out.late_tolerance_min = Math.max(0, Math.min(120, parseInt(b.late_tolerance_min, 10) || 0));
  if (b.absent_limit_min !== undefined) out.absent_limit_min = Math.max(5, Math.min(480, parseInt(b.absent_limit_min, 10) || 45));
  if (b.days !== undefined) out.days = String(b.days).split(',').map(Number).filter(n => n >= 1 && n <= 7).join(',') || '1,2,3,4,5';
  if (b.theme !== undefined) out.theme = ['blue', 'green', 'orange', 'purple', 'pink', 'teal'].includes(b.theme) ? b.theme : 'blue';
  return out;
}

app.post('/api/courses', auth.requireAdmin, wrap((req, res) => {
  let data;
  try {
    data = courseInput(req.body || {});
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  if (!data.name || !data.code) return res.status(400).json({ error: 'Nombre y código del curso son obligatorios' });
  const cols = Object.keys(data);
  const id = db.q(`INSERT INTO courses (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map(c => data[c])).lastInsertRowid;
  res.status(201).json(db.q('SELECT * FROM courses WHERE id = ?').get(id));
}));

app.put('/api/courses/:id/teachers', auth.requireAdmin, wrap((req, res) => {
  const id = Number(req.params.id);
  if (!db.q('SELECT 1 FROM courses WHERE id = ?').get(id)) return res.status(404).json({ error: 'Curso no encontrado' });
  const ids = (Array.isArray(req.body && req.body.user_ids) ? req.body.user_ids : []).map(Number).filter(n => db.q('SELECT 1 FROM users WHERE id = ?').get(n));
  db.transaction(() => {
    db.q('DELETE FROM course_teachers WHERE course_id = ?').run(id);
    for (const u of ids) db.q('INSERT OR IGNORE INTO course_teachers (course_id, user_id) VALUES (?, ?)').run(id, u);
  })();
  resetScopes();
  broadcast('courses', {});
  res.json({ ok: true, teachers: db.q('SELECT u.id, u.name FROM course_teachers ct JOIN users u ON u.id = ct.user_id WHERE ct.course_id = ? ORDER BY u.name').all(id) });
}));

app.patch('/api/courses/:id', auth.requireUser, ownCourse, wrap((req, res) => {
  let data;
  try {
    data = courseInput(req.body || {});
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const cols = Object.keys(data);
  if (cols.length) db.q(`UPDATE courses SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`).run(...cols.map(c => data[c]), req.params.id);
  const course = db.q('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (data.schedule_start || data.absent_limit_min || data.days) {
    const today = T.localDate();
    db.q('DELETE FROM course_runs WHERE course_id = ? AND date = ?').run(req.params.id, today);
    db.q("DELETE FROM attendances WHERE course_id = ? AND date = ? AND status = 'AUSENTE' AND source = 'AUTO'").run(req.params.id, today);
  }
  broadcast('courses', {});
  res.json(course);
}));

app.delete('/api/courses/:id', auth.requireAdmin, wrap((req, res) => {
  const n = db.q('SELECT COUNT(*) AS c FROM students WHERE course_id = ? AND active = 1').get(req.params.id).c;
  if (n > 0) return res.status(409).json({ error: 'Primero mueve o desactiva a los estudiantes de este curso' });
  db.q('DELETE FROM course_runs WHERE course_id = ?').run(req.params.id);
  db.q('DELETE FROM courses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));

const studentSelect = `SELECT s.id, s.student_code, s.first_name, s.last_name, s.course_id, s.nfc_uid, s.parent_name, s.parent_phone, s.parent_email, s.mascot, s.mascot_name, s.mascot_dead_on, s.card_ver, CASE WHEN s.pin_hash IS NULL THEN 0 ELSE 1 END AS has_pin,
  CASE WHEN s.parent_telegram IS NULL THEN 0 ELSE 1 END AS telegram_linked, s.face_photo, s.active, s.created_at, c.name AS course_name, c.code AS course_code,
  CASE WHEN h.allergies IS NOT NULL AND h.allergies != '[]' THEN 1 ELSE 0 END AS has_allergy,
  CASE WHEN h.conditions IS NOT NULL AND h.conditions != '[]' THEN 1 ELSE 0 END AS has_condition,
  CASE WHEN h.allergies LIKE '%GRAVE%' THEN 1 ELSE 0 END AS severe_allergy,
  CASE WHEN h.student_id IS NULL THEN 0 ELSE 1 END AS has_health,
  COALESCE(h.consent, 0) AS health_public
  FROM students s JOIN courses c ON c.id = s.course_id LEFT JOIN student_health h ON h.student_id = s.id`;

function saveFace(studentId, dataUrl) {
  if (dataUrl === null) {
    try {
      fs.unlinkSync(path.join(A.FACE_DIR, `${studentId}.jpg`));
    } catch (e) {}
    db.q('UPDATE students SET face_photo = NULL WHERE id = ?').run(studentId);
    return;
  }
  const m = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return;
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 2 * 1024 * 1024) return;
  fs.writeFileSync(path.join(A.FACE_DIR, `${studentId}.jpg`), buf);
  db.q('UPDATE students SET face_photo = ? WHERE id = ?').run(String(Date.now()), studentId);
}

function studentInput(b) {
  const out = {};
  const str = (v, n) => (v === undefined ? undefined : v === null ? null : String(v).trim().slice(0, n) || null);
  if (b.first_name !== undefined) out.first_name = str(b.first_name, 60);
  if (b.last_name !== undefined) out.last_name = str(b.last_name, 60);
  if (b.course_id !== undefined) out.course_id = Number(b.course_id);
  if (b.nfc_uid !== undefined) out.nfc_uid = String(b.nfc_uid || '').toUpperCase().replace(/[^0-9A-F]/g, '') || null;
  if (b.parent_name !== undefined) out.parent_name = str(b.parent_name, 80);
  if (b.parent_phone !== undefined) out.parent_phone = str(b.parent_phone, 30);
  if (b.parent_email !== undefined) out.parent_email = str(b.parent_email, 200);
  if (b.student_code !== undefined) out.student_code = str(b.student_code, 20);
  return out;
}

function contactError(d) {
  if (d.parent_email) {
    if (!notifier.validEmails(d.parent_email)) return { error: 'El correo del representante no es válido. Si son dos, sepáralos con una coma.', fields: ['parent_email'] };
    d.parent_email = notifier.splitEmails(d.parent_email).join(', ');
  }
  if (d.parent_phone && !notifier.normalizePhone(d.parent_phone)) return { error: 'El celular no parece válido. Usa 09XXXXXXXX o +593 9X XXX XXXX', fields: ['parent_phone'] };
  return null;
}

app.get('/api/students', auth.requireUser, (req, res) => {
  const scope = scopeOf(req.user);
  res.json(db.q(`${studentSelect} WHERE s.active = 1 ORDER BY s.last_name, s.first_name`).all().filter(st => allowed(scope, st.course_id)));
});

app.post('/api/students', auth.requireUser, wrap((req, res) => {
  const d = studentInput(req.body || {});
  const fields = [];
  if (!d.first_name) fields.push('first_name');
  if (!d.last_name) fields.push('last_name');
  if (!d.course_id) fields.push('course_id');
  if (!d.nfc_uid) fields.push('nfc_uid');
  if (fields.length) return res.status(400).json({ error: 'Faltan datos obligatorios', fields });
  if (d.nfc_uid.length < 8 || d.nfc_uid.length > 20) return res.status(400).json({ error: 'El UID debe tener entre 8 y 20 caracteres hexadecimales', fields: ['nfc_uid'] });
  const bad = contactError(d);
  if (bad) return res.status(400).json(bad);
  if (!db.q('SELECT 1 FROM courses WHERE id = ?').get(d.course_id)) return res.status(400).json({ error: 'Curso no válido', fields: ['course_id'] });
  if (!allowed(scopeOf(req.user), d.course_id)) return deny(res);
  const inactive = db.q('SELECT id FROM students WHERE nfc_uid = ? AND active = 0').get(d.nfc_uid);
  if (inactive) db.q("UPDATE students SET nfc_uid = nfc_uid || '-OLD' || id WHERE id = ?").run(inactive.id);
  if (!d.student_code) {
    const n = db.q('SELECT COUNT(*) AS c FROM students').get().c + 1;
    d.student_code = `NAVI-${String(n).padStart(3, '0')}`;
    while (db.q('SELECT 1 FROM students WHERE student_code = ?').get(d.student_code)) d.student_code = `NAVI-${Math.floor(Math.random() * 9000 + 1000)}`;
  }
  d.mascot = nextMascot(d.course_id);
  const cols = Object.keys(d);
  const id = db.q(`INSERT INTO students (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map(c => d[c])).lastInsertRowid;
  if (req.body.face_photo) saveFace(id, req.body.face_photo);
  const s = db.q(`${studentSelect} WHERE s.id = ?`).get(id);
  broadcast('student', s);
  res.status(201).json(s);
}));

app.patch('/api/students/:id', auth.requireUser, ownStudent, wrap((req, res) => {
  const d = studentInput(req.body || {});
  const bad = contactError(d);
  if (bad) return res.status(400).json(bad);
  if (d.nfc_uid !== undefined && (!d.nfc_uid || d.nfc_uid.length < 8)) return res.status(400).json({ error: 'UID no válido', fields: ['nfc_uid'] });
  for (const k of ['first_name', 'last_name']) if (k in d && !d[k]) return res.status(400).json({ error: 'El nombre no puede quedar vacío', fields: [k] });
  if (d.course_id && !allowed(scopeOf(req.user), d.course_id)) return deny(res);
  if (d.course_id) {
    const cur = db.q('SELECT course_id, mascot FROM students WHERE id = ?').get(req.params.id);
    if (cur && cur.course_id !== d.course_id && db.q('SELECT 1 FROM students WHERE course_id = ? AND mascot = ? AND active = 1 AND id != ?').get(d.course_id, cur.mascot, req.params.id)) d.mascot = nextMascot(d.course_id, Number(req.params.id));
  }
  const cols = Object.keys(d);
  if (cols.length) db.q(`UPDATE students SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`).run(...cols.map(c => d[c]), req.params.id);
  if (req.body.face_photo !== undefined) saveFace(Number(req.params.id), req.body.face_photo);
  const s = db.q(`${studentSelect} WHERE s.id = ?`).get(req.params.id);
  broadcast('student', s);
  res.json(s);
}));

app.delete('/api/students/:id', auth.requireUser, ownStudent, wrap((req, res) => {
  db.q('UPDATE students SET active = 0 WHERE id = ?').run(req.params.id);
  broadcast('student', { id: Number(req.params.id), active: 0 });
  res.json({ ok: true });
}));

app.get('/api/students/:id/links', auth.requireUser, ownStudent, wrap((req, res) => {
  const s = db.q('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'No encontrado' });
  res.json({ telegram: notifier.telegramLink(s), whatsapp: notifier.whatsappLink(s.parent_phone, `Estimado/a ${s.parent_name || 'representante'}, le escribimos de ${config.institutionName} sobre ${s.first_name}.`), phone: notifier.normalizePhone(s.parent_phone) });
}));

app.post('/api/students/:id/message', auth.requireUser, ownStudent, wrap(async (req, res) => {
  try {
    const results = await notifier.sendCustom(Number(req.params.id), req.body || {});
    res.json({ results });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message, fields: e.fields });
    throw e;
  }
}));

app.post('/api/students/:id/preview', auth.requireUser, ownStudent, wrap((req, res) => {
  const b = req.body || {};
  const kind = ['ARRIVAL', 'LATE', 'ABSENT', 'NOT_IN_CLASS', 'EMERGENCY', 'CUSTOM'].includes(b.kind) ? b.kind : 'CUSTOM';
  const p = notifier.preview(kind, Number(req.params.id), { subject: b.subject, text: b.text || ' ' });
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  res.json(p);
}));

app.post('/api/students/:id/credential', auth.requireUser, ownStudent, wrap((req, res) => {
  const out = C.issue(Number(req.params.id), Boolean(req.body && req.body.rotate));
  if (!out) return res.status(404).json({ error: 'No encontrado' });
  const h = H.get(Number(req.params.id));
  const base = config.publicUrl || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
  res.json({ ...out, url: h && h.consent && h.token ? `${base}/e/${h.token}` : `${base}/` });
}));

app.get('/api/students/:id/access', auth.requireUser, ownStudent, (req, res) => res.json(ST.accessInfo(Number(req.params.id))));

app.post('/api/students/:id/reset-access', auth.requireUser, ownStudent, wrap((req, res) => {
  ST.resetAccess(Number(req.params.id));
  res.json(ST.accessInfo(Number(req.params.id)));
}));

function publicBase(req) {
  if (config.publicUrl) return config.publicUrl;
  if (req && req.headers && req.headers.host && !/^(localhost|127\.)/.test(req.headers.host)) return `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
  const ip = lanAddresses()[0];
  return ip ? `http://${ip}:${config.port}` : `http://localhost:${config.port}`;
}

A.setWriteBuilder(st => {
  const out = C.issue(st.id, false);
  const h = H.get(st.id);
  const base = lastBase || publicBase();
  return { cred: out.cred, url: h && h.consent && h.token ? `${base}/e/${h.token}` : `${base}/` };
});
let lastBase = null;

app.post('/api/students/:id/write-card', auth.requireUser, ownStudent, wrap((req, res) => {
  const s = db.q('SELECT id FROM students WHERE id = ? AND active = 1').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'No encontrado' });
  lastBase = publicBase(req);
  res.json(A.armWrite(s.id, req.user.id, Boolean(req.body && req.body.assign)));
}));

app.delete('/api/write-card', auth.requireUser, (req, res) => {
  A.disarmWrite();
  res.json({ ok: true });
});

app.post('/api/terminal/written', auth.requireTerminalOrUser, wrap((req, res) => {
  const b = req.body || {};
  const done = A.writeDone(String(b.job || ''), String(b.uid || '').toUpperCase(), b.ok === true, b.error);
  res.json({ ok: done });
}));

app.post('/api/student/code-login', wrap((req, res) => {
  const ip = req.socket.remoteAddress;
  if (tooManyAttempts('st:' + ip)) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.', code: 'LOCKED' });
  const out = ST.codeLogin(req.body || {});
  if (out.status !== 200) noteAttempt('st:' + ip);
  res.status(out.status).json(out.body);
}));

app.post('/api/student/demo-unlock', ST.requireStudent, wrap((req, res) => {
  if (!config.demoMode) return res.status(403).json({ error: 'Solo en modo demostración' });
  res.json(ST.demoUnlock(req.student.id));
}));

app.post('/api/student/card-login', wrap((req, res) => {
  const ip = req.socket.remoteAddress;
  if (tooManyAttempts('st:' + ip)) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.', code: 'LOCKED' });
  const out = ST.cardLogin(req.body || {});
  if (out.status !== 200) noteAttempt('st:' + ip);
  res.status(out.status).json(out.body);
}));

app.get('/api/student/demo-list', (req, res) => {
  if (!config.demoMode) return res.status(403).json({ error: 'Solo en modo demostración' });
  res.json(db.q('SELECT s.id, s.first_name, s.last_name, s.mascot, s.mascot_name, c.code AS course_code FROM students s JOIN courses c ON c.id = s.course_id WHERE s.active = 1 ORDER BY c.id, s.last_name').all());
});

app.post('/api/student/demo-login', wrap((req, res) => {
  if (!config.demoMode) return res.status(403).json({ error: 'Solo en modo demostración' });
  const out = ST.demoLogin(Number(req.body && req.body.student_id));
  res.status(out.status).json(out.body);
}));

app.get('/api/student/me', ST.requireStudent, (req, res) => {
  const out = ST.me(req.student.id);
  const renew = ST.renewal(req);
  res.json(renew ? { ...out, renew } : out);
});
app.post('/api/student/adopt', ST.requireStudent, wrap((req, res) => {
  const out = ST.adopt(req.student.id, (req.body || {}).mascot);
  if (out.status === 200) broadcast('mascot_adopted', { student_id: req.student.id, mascot: out.body.student.mascot });
  res.status(out.status).json(out.body);
}));
app.get('/api/early-warning', auth.requireUser, (req, res) => {
  const scope = scopeOf(req.user);
  res.json(P.atRisk(3).filter(r => allowed(scope, r.course_id)));
});
app.patch('/api/student/me', ST.requireStudent, wrap((req, res) => res.json(ST.update(req.student.id, req.body || {}))));
app.get('/api/student/health', ST.requireStudent, (req, res) => res.json({ health: H.get(req.student.id) }));

app.get('/api/students/:id/health', auth.requireUser, ownStudent, wrap((req, res) => {
  const id = Number(req.params.id);
  const h = H.get(id);
  if (req.query.view) H.logAccess(id, 'APP', req, req.user.id);
  res.json({ health: h, access: H.accessLog(id) });
}));

app.put('/api/students/:id/health', auth.requireUser, ownStudent, wrap((req, res) => {
  const id = Number(req.params.id);
  if (!db.q('SELECT 1 FROM students WHERE id = ?').get(id)) return res.status(404).json({ error: 'Estudiante no encontrado' });
  const h = H.save(id, req.body, req.user.id);
  broadcast('student', { id });
  res.json({ health: h, access: H.accessLog(id) });
}));

app.post('/api/students/:id/health/token', auth.requireUser, ownStudent, wrap((req, res) => {
  const token = H.rotateToken(Number(req.params.id));
  if (!token) return res.status(404).json({ error: 'Primero guarda la ficha médica' });
  res.json({ token });
}));

app.post('/api/emergency/arm', auth.requireUser, wrap((req, res) => {
  const a = A.armEmergency(req.user.id, 60);
  res.json({ until: a.until });
}));

app.post('/api/emergency/disarm', auth.requireUser, wrap((req, res) => {
  A.disarmEmergency();
  res.json({ ok: true });
}));

const emergencyNotified = new Map();
app.get('/e/:token', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const data = H.byToken(req.params.token);
  if (!data || !data.health.consent) return res.status(404).type('html').send(H.unavailable());
  const s = data.student;
  H.logAccess(s.id, 'PUBLICO', req);
  broadcast('emergency_view', { student_id: s.id, student_name: `${s.first_name} ${s.last_name}`, at: new Date().toISOString() });
  const last = emergencyNotified.get(s.id) || 0;
  if (Date.now() - last > 10 * 60000) {
    emergencyNotified.set(s.id, Date.now());
    setImmediate(() => notifier.notify('EMERGENCY', s.id, null));
  }
  res.type('html').send(H.page(data, req.params.token));
});

app.get('/e/:token/foto', (req, res) => {
  const data = H.byToken(req.params.token);
  if (!data || !data.health.consent) return res.status(404).end();
  const f = H.photoFile(data.student.id);
  if (!f) return res.status(404).end();
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(f);
});

function imageAuth(req, res, next) {
  const id = auth.readToken(String(req.query.t || ''));
  if (!id) return res.status(401).end();
  req.user = db.q('SELECT id, role FROM users WHERE id = ?').get(id) || null;
  if (!req.user) return res.status(401).end();
  next();
}

app.get('/api/faces/:id', imageAuth, (req, res) => {
  const file = path.join(A.FACE_DIR, `${Number(req.params.id)}.jpg`);
  if (!fs.existsSync(file)) return res.status(404).end();
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.sendFile(file);
});

app.get('/api/snapshots/:id', imageAuth, (req, res) => {
  const row = db.q('SELECT snapshot_photo FROM attendances WHERE id = ?').get(Number(req.params.id));
  if (!row || !row.snapshot_photo) return res.status(404).end();
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.sendFile(path.join(A.SNAP_DIR, row.snapshot_photo));
});

app.get('/api/attendance', auth.requireUser, (req, res) => {
  const scope = scopeOf(req.user);
  res.json(A.listByDate(req.query.date || T.localDate()).filter(r => allowed(scope, r.course_id)));
});

function dataUrlToBuffer(s) {
  const m = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/.exec(s || '');
  return m ? Buffer.from(m[2], 'base64') : null;
}

const tapCache = new Map();
app.post('/api/attendance/scan', auth.requireTerminalOrUser, wrap((req, res) => {
  const b = req.body || {};
  const terminalId = String(b.terminal_id || 'ESP32-AULA-1').slice(0, 40);
  const tapKey = req.viaTerminal && b.tap ? `${terminalId}|${String(b.tap).slice(0, 40)}` : null;
  const cached = tapKey && tapCache.get(tapKey);
  if (cached && Date.now() - cached.at < 120000) return res.status(cached.code).json(cached.body);
  const out = A.scan({
    uid: b.uid,
    terminalId,
    ts: b.ts || null,
    presenceId: b.presence_id != null ? String(b.presence_id) : null,
    snapshotBuffer: dataUrlToBuffer(b.snapshot_photo),
    source: 'NFC',
    cred: typeof b.cred === 'string' ? b.cred.slice(0, 200) : null,
    ntag: b.ntag === true,
    simulated: !req.viaTerminal
  });
  if (tapKey) {
    tapCache.set(tapKey, { code: out.code, body: out.body, at: Date.now() });
    if (tapCache.size > 300) tapCache.delete(tapCache.keys().next().value);
  }
  res.status(out.code).json(out.body);
  if (req.viaTerminal) {
    const photo = out.body && !['DUPLICADO', 'GRABADO', 'ERROR_GRABAR', 'REPETIDO'].includes(out.body.status);
    setImmediate(() => {
      touchTerminal(terminalId, 'LECTOR', req, b);
      if (photo) askCamera(terminalId);
    });
  }
}));

const camWaiters = new Map();
const camPending = new Map();

function askCamera(terminalId) {
  const waiter = camWaiters.get(terminalId);
  if (waiter) {
    camWaiters.delete(terminalId);
    clearTimeout(waiter.timer);
    if (!waiter.res.writableEnded) waiter.res.json({ foto: true });
    return;
  }
  camPending.set(terminalId, Date.now());
  const cam = db.q('SELECT ip, last_seen FROM terminals WHERE id = ?').get(`${terminalId}#CAM`);
  if (!cam || !cam.ip || Date.now() - Date.parse(cam.last_seen) > 120000 || typeof fetch !== 'function') return;
  const ip = /^[0-9a-f.:]+$/i.test(cam.ip) ? cam.ip : null;
  if (!ip) return;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1500);
  fetch(`http://${ip.includes(':') ? `[${ip}]` : ip}/foto`, { headers: { 'X-Terminal-Key': config.terminalKey }, signal: ctrl.signal }).catch(() => {}).finally(() => clearTimeout(timer));
}

app.post('/api/attendance/batch', auth.requireTerminalOrUser, wrap((req, res) => {
  const b = req.body || {};
  const terminalId = String(b.terminal_id || 'ESP32-AULA-1').slice(0, 40);
  const records = Array.isArray(b.records) ? b.records.slice(0, 500) : [];
  const results = db.transaction(() => records.map(r => {
    try { return A.scan({ uid: r.uid, terminalId, ts: r.ts, source: 'OFFLINE', cred: typeof r.cred === 'string' ? r.cred.slice(0, 200) : null, ntag: r.ntag === true }).body.status; } catch (e) { return 'ERROR'; }
  }))();
  res.json({ processed: results.length, results });
  if (req.viaTerminal) setImmediate(() => touchTerminal(terminalId, 'LECTOR', req, b));
}));

app.get('/api/roll/:courseId', auth.requireUser, ownCourse, (req, res) => {
  res.json(A.rollForCourse(Number(req.params.courseId), req.query.date || T.localDate()));
});

app.post('/api/roll/:courseId/confirm', auth.requireUser, ownCourse, wrap((req, res) => {
  const entries = Array.isArray(req.body.students) ? req.body.students : [];
  res.json(A.confirmRoll(Number(req.params.courseId), req.body.date || T.localDate(), entries, req.user.id));
}));

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
app.get('/api/export.csv', imageAuth, (req, res) => {
  const to = DATE_RE.test(req.query.to || '') ? req.query.to : T.localDate();
  const from = DATE_RE.test(req.query.from || '') ? req.query.from : to;
  const rows = db.q(`SELECT a.course_id, a.date, a.time_recorded, s.student_code, s.last_name, s.first_name, c.name AS course, a.status, a.source, a.review_state, a.in_class
    FROM attendances a JOIN students s ON s.id = a.student_id JOIN courses c ON c.id = a.course_id
    WHERE a.date BETWEEN ? AND ? ORDER BY a.date, c.name, s.last_name, s.first_name`).all(from, to).filter(r => allowed(scopeOf(req.user), r.course_id));
  const ST = { A_TIEMPO: 'Puntual', TARDE: 'Atraso', AUSENTE: 'Ausente' };
  const SRC = { NFC: 'Tarjeta', MANUAL: 'Docente', AUTO: 'Automático', OFFLINE: 'Sin conexión' };
  const REV = { PENDIENTE: 'Pendiente', OK: 'Correcto', FRAUDE: 'Suplantación' };
  const cell = v => {
    const t = String(v == null ? '' : v);
    return /[;"\n]/.test(t) || /^[=+\-@]/.test(t) ? `"${t.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : t;
  };
  const lines = [['Fecha', 'Hora', 'Código', 'Apellidos', 'Nombres', 'Curso', 'Estado', 'Origen', 'Revisión', 'Visto en el aula'].join(';')];
  for (const r of rows) lines.push([r.date, r.time_recorded.slice(0, 5), r.student_code, r.last_name, r.first_name, r.course, ST[r.status] || r.status, SRC[r.source] || r.source, REV[r.review_state] || '', r.in_class == null ? '' : r.in_class ? 'Sí' : 'No'].map(cell).join(';'));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="asistencia_${from}${from === to ? '' : '_' + to}.csv"`);
  res.send('\uFEFF' + lines.join('\r\n'));
});

app.post('/api/attendance/:id/justify', auth.requireUser, ownAttendance, wrap((req, res) => {
  const b = req.body || {};
  const r = A.justify(Number(req.params.id), b.justified !== false, b.note, req.user.id);
  if (!r) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json(r);
}));

app.get('/api/review', auth.requireUser, (req, res) => {
  const scope = scopeOf(req.user);
  res.json(A.listPendingReview().filter(r => allowed(scope, r.course_id)));
});

app.post('/api/review/:id', auth.requireUser, ownAttendance, wrap((req, res) => {
  const decision = req.body && req.body.decision;
  if (!['OK', 'FRAUDE'].includes(decision)) return res.status(400).json({ error: 'Decisión no válida' });
  res.json(A.decideReview(Number(req.params.id), decision, req.user.id));
}));

app.get('/api/notifications/pending', auth.requireUser, (req, res) => {
  const scope = scopeOf(req.user);
  const rows = notifier.pending(2);
  if (!scope) return res.json(rows);
  const ok = new Set(db.q(`SELECT id FROM students WHERE course_id IN (${scope.map(Number).join(',') || '0'})`).all().map(r => r.id));
  res.json(rows.filter(n => ok.has(n.student_id)));
});

app.post('/api/notifications/:id/sent', auth.requireUser, wrap((req, res) => {
  const n = notifier.markManual(Number(req.params.id), req.user.id);
  if (!n) return res.status(404).json({ error: 'Aviso no encontrado' });
  res.json({ id: n.id, status: n.status });
}));

app.post('/api/notifications/:id/resend', auth.requireUser, wrap(async (req, res) => {
  try {
    res.json(await notifier.resend(Number(req.params.id)));
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    throw e;
  }
}));

app.get('/api/notifications', auth.requireUser, (req, res) => {
  const limit = Math.min(200, parseInt(req.query.limit || '60', 10));
  const scope = scopeOf(req.user);
  const where = scope ? `WHERE s.course_id IN (${scope.map(Number).join(',') || '0'})` : '';
  res.json(db.q(`SELECT n.*, s.first_name || ' ' || s.last_name AS student_name FROM notifications n LEFT JOIN students s ON s.id = n.student_id ${where} ORDER BY n.id DESC LIMIT ?`).all(limit));
});

const terminalSeen = new Map();
const reportedIp = new Map();
function touchTerminal(id, kind, req, b = {}) {
  const key = kind === 'CAMARA' ? `${id}#CAM` : id;
  const seen = terminalSeen.get(key);
  const now = Date.now();
  const own = typeof b.ip === 'string' && /^\d{1,3}(\.\d{1,3}){3}$/.test(b.ip) && b.ip !== '0.0.0.0' ? b.ip : null;
  if (own) reportedIp.set(key, own);
  const ip = own || reportedIp.get(key) || (req.socket.remoteAddress || '').replace('::ffff:', '');
  db.q(`INSERT INTO terminals (id, kind, ip, firmware, rssi, last_seen) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET ip = excluded.ip, firmware = COALESCE(excluded.firmware, firmware), rssi = COALESCE(excluded.rssi, rssi), last_seen = excluded.last_seen, kind = excluded.kind`)
    .run(key, kind, ip, b.firmware || null, b.rssi != null ? Number(b.rssi) : null, new Date(now).toISOString());
  if (!seen || now - seen.at > 30000 || seen.ip !== ip || (b.firmware && seen.fw !== b.firmware)) {
    terminalSeen.set(key, { at: now, ip, fw: b.firmware || (seen && seen.fw) || null });
    broadcast('terminal', { id: key, kind, online: true });
  }
}

app.post('/api/terminal/ping', wrap((req, res) => {
  if (!auth.isTerminal(req)) return res.status(401).json({ error: 'Clave de terminal incorrecta' });
  const b = req.body || {};
  const kind = b.kind === 'CAMARA' ? 'CAMARA' : 'LECTOR';
  touchTerminal(String(b.terminal_id || 'ESP32-AULA-1').slice(0, 40), kind, req, b);
  res.json({ ok: true, server_time: Math.floor(Date.now() / 1000) });
}));

app.get('/api/camera/wait', (req, res) => {
  if (!auth.isTerminal(req)) return res.status(401).json({ error: 'Clave de terminal incorrecta' });
  const terminalId = String(req.query.terminal_id || 'ESP32-AULA-1').slice(0, 40);
  const ip = String(req.query.ip || '');
  touchTerminal(terminalId, 'CAMARA', req, { firmware: req.query.fw ? String(req.query.fw).slice(0, 30) : null, ip, rssi: req.query.rssi != null && req.query.rssi !== '' ? Number(req.query.rssi) || null : null });
  const pending = camPending.get(terminalId);
  camPending.delete(terminalId);
  if (pending && Date.now() - pending < 4000) return res.json({ foto: true });
  const old = camWaiters.get(terminalId);
  if (old) {
    clearTimeout(old.timer);
    if (!old.res.writableEnded) old.res.status(204).end();
  }
  const waiter = { res, timer: null };
  waiter.timer = setTimeout(() => {
    if (camWaiters.get(terminalId) === waiter) camWaiters.delete(terminalId);
    if (!res.writableEnded) res.status(204).end();
  }, 20000);
  camWaiters.set(terminalId, waiter);
  res.on('close', () => {
    clearTimeout(waiter.timer);
    if (camWaiters.get(terminalId) === waiter) camWaiters.delete(terminalId);
  });
});

app.get('/api/terminals', auth.requireUser, (req, res) => {
  const rows = db.q('SELECT t.*, c.name AS course_name, c.code AS course_code FROM terminals t LEFT JOIN courses c ON c.id = t.course_id ORDER BY t.id').all();
  res.json(rows.map(r => ({ ...r, online: r.last_seen ? Date.now() - Date.parse(r.last_seen) < 90000 : false })));
});

app.patch('/api/terminals/:id', auth.requireAdmin, wrap((req, res) => {
  const id = String(req.params.id).slice(0, 60);
  if (!db.q('SELECT 1 FROM terminals WHERE id = ?').get(id)) return res.status(404).json({ error: 'Lector no encontrado' });
  const b = req.body || {};
  if (b.course_id !== undefined) {
    const cid = b.course_id ? Number(b.course_id) : null;
    if (cid && !db.q('SELECT 1 FROM courses WHERE id = ?').get(cid)) return res.status(400).json({ error: 'Curso no válido' });
    db.q('UPDATE terminals SET course_id = ? WHERE id = ?').run(cid, id);
  }
  if (b.label !== undefined) db.q('UPDATE terminals SET label = ? WHERE id = ?').run(String(b.label).trim().slice(0, 60) || null, id);
  broadcast('terminal', { id });
  res.json(db.q('SELECT t.*, c.name AS course_name, c.code AS course_code FROM terminals t LEFT JOIN courses c ON c.id = t.course_id WHERE t.id = ?').get(id));
}));
app.delete('/api/terminals/:id', auth.requireAdmin, wrap((req, res) => {
  db.q('DELETE FROM terminals WHERE id = ?').run(String(req.params.id).slice(0, 60));
  broadcast('terminal', { id: req.params.id });
  res.json({ ok: true });
}));

app.post('/api/camera/snapshot', express.raw({ type: ['image/jpeg', 'application/octet-stream'], limit: '2mb' }), auth.requireTerminalOrUser, wrap((req, res) => {
  const terminalId = String(req.headers['x-terminal-id'] || (req.body && req.body.terminal_id) || 'ESP32-AULA-1').slice(0, 40);
  let buffer = Buffer.isBuffer(req.body) ? req.body : dataUrlToBuffer(req.body && req.body.image_base64);
  if (!buffer || buffer.length < 100) return res.status(400).json({ error: 'No llegó ninguna imagen' });
  if (req.viaTerminal) touchTerminal(terminalId, 'CAMARA', req);
  res.json({ ok: true, bytes: buffer.length, ...A.receiveSnapshot(terminalId, buffer) });
}));

app.post('/api/demo/reset-today', auth.requireUser, wrap((req, res) => {
  if (!config.demoMode && req.user.role !== 'ADMINISTRADOR') return res.status(403).json({ error: 'Solo un administrador puede reiniciar el día' });
  const date = T.localDate();
  const rows = db.q('SELECT id, snapshot_photo FROM attendances WHERE date = ?').all(date);
  for (const r of rows) {
    if (r.snapshot_photo) {
      try {
        fs.unlinkSync(path.join(A.SNAP_DIR, r.snapshot_photo));
      } catch (e) {}
    }
  }
  db.q('DELETE FROM attendances WHERE date = ?').run(date);
  db.q('DELETE FROM course_runs WHERE date = ?').run(date);
  broadcast('reset', { date });
  res.json({ deleted: rows.length });
}));

app.post('/api/absences/run', auth.requireUser, wrap((req, res) => res.json({ marked: A.runAbsences() })));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname !== '/ws' || !auth.readToken(url.searchParams.get('token'))) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  const uid = auth.readToken(url.searchParams.get('token'));
  wss.handleUpgrade(req, socket, head, ws => { ws.userId = uid; wss.emit('connection', ws, req); });
});

let smsGateway = null;
function sendToGateway(job) {
  if (!smsGateway || smsGateway.readyState !== 1) return false;
  smsGateway.send(JSON.stringify({ type: 'sms_job', payload: job, at: new Date().toISOString() }));
  return true;
}
notifier.setSmsSender(sendToGateway, () => (smsGateway && smsGateway.readyState === 1 ? smsGateway.smsDevice : null));
function flushSms() {
  for (const job of notifier.smsJobs(6)) if (sendToGateway(job)) notifier.markSmsSending(job.id);
}
setInterval(() => { if (smsGateway) flushSms(); }, 60000);

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
  ws.on('message', m => {
    const raw = String(m);
    if (raw === 'ping') return ws.send('pong');
    let msg = null;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'sms_gateway') {
      if (msg.on) {
        ws.smsDevice = String(msg.device || 'Celular Android').slice(0, 60);
        smsGateway = ws;
        broadcast('channels', notifier.status());
        flushSms();
      } else if (smsGateway === ws) {
        smsGateway = null;
        broadcast('channels', notifier.status());
      }
    } else if (msg.type === 'sms_result' && ws === smsGateway) {
      if (String(msg.id).startsWith('t')) broadcast('sms_test', { ok: Boolean(msg.ok), error: msg.error || null });
      else notifier.smsResult(msg.id, Boolean(msg.ok), msg.error);
    }
  });
  ws.on('close', () => {
    if (smsGateway === ws) {
      smsGateway = null;
      broadcast('channels', notifier.status());
    }
  });
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

setInterval(() => {
  try {
    A.runAbsences();
  } catch (e) {
    console.error('Ausencias:', e.message);
  }
}, 30000);
setInterval(() => A.purgeOldPhotos(), 6 * 3600000);

function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    if (/vbox|virtual|vmware|hyper-v|vethernet|docker|wsl|loopback|tailscale|zerotier/i.test(name)) continue;
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.')) out.push({ name, address: i.address });
  }
  const rank = x => (/wi-?fi|wlan|wireless|inal/i.test(x.name) ? 0 : /ethernet|eth|en\d/i.test(x.name) ? 1 : 2) * 10 + (x.address.startsWith('192.168.') ? 0 : x.address.startsWith('10.') ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b)).map(x => x.address);
}

function writeFirmwareConfig(host) {
  const fw = path.join(config.ROOT, '..', 'firmware');
  if (!host || !fs.existsSync(fw)) return [];
  const body = `#pragma once\n\n#define SERVER_HOST "${host}"\n#define SERVER_PORT ${config.port}\n#define TERMINAL_KEY "${config.terminalKey}"\n`;
  const done = [];
  for (const d of ['navi_esp32_pn532', 'navi_esp32_cam']) {
    const dir = path.join(fw, d);
    if (!fs.existsSync(dir)) continue;
    const f = path.join(dir, 'servidor.h');
    const mine = path.join(dir, 'mis_datos.h');
    try {
      if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== body) fs.writeFileSync(f, body);
      if (!fs.existsSync(mine)) fs.writeFileSync(mine, `#pragma once\n\n#define WIFI_SSID "TU_RED_WIFI"\n#define WIFI_PASS "TU_CONTRASENA_WIFI"\n\n#define WIFI_SSID_2 ""\n#define WIFI_PASS_2 ""\n\n#define WIFI_SSID_3 ""\n#define WIFI_PASS_3 ""\n\n#define TERMINAL_ID "ESP32-AULA-1"\n${d === 'navi_esp32_pn532' ? '\n#define PN532_UART 0\n' : ''}`);
      done.push(d);
    } catch (e) {}
  }
  return done;
}

const DISCOVERY_PORT = 41234;
function startDiscovery() {
  let sock;
  try { sock = dgram.createSocket({ type: 'udp4', reuseAddr: true }); } catch (e) { return; }
  sock.on('message', (msg, rinfo) => {
    if (msg.length > 200) return;
    const text = msg.toString('utf8');
    if (!text.startsWith('NAVI?')) return;
    const nonce = text.slice(5).trim().slice(0, 64);
    const name = (db.q("SELECT institution_name FROM users WHERE institution_name IS NOT NULL AND email != 'demo@navi.local' ORDER BY id LIMIT 1").get() || {}).institution_name || config.institutionName;
    const out = { navi: 1, port: config.port, name, demo: config.demoMode };
    if (nonce) out.proof = crypto.createHmac('sha256', config.terminalKey).update(nonce).digest('hex');
    sock.send(JSON.stringify(out), rinfo.port, rinfo.address, () => {});
  });
  sock.on('error', e => console.log(`  Búsqueda automática en la red no disponible (${e.code || e.message}). Los lectores usarán la IP de servidor.h.`));
  sock.bind(DISCOVERY_PORT);
}

if (require.main === module) {
  server.listen(config.port, () => {
    startDiscovery();
    if (typeof fetch === 'function') fetch(`http://127.0.0.1:${config.port}/api/info`).catch(() => {});
    A.purgeOldPhotos();
    setTimeout(() => A.runAbsences(), 3000);
    notifier.startTelegram();
    const ips = lanAddresses();
    const ch = notifier.status();
    console.log('');
    console.log(config.demoMode ? '  N.A.V.I listo · MODO DEMOSTRACIÓN (datos de ejemplo, separados de los reales)' : '  N.A.V.I listo');
    console.log(`  En esta PC:      http://localhost:${config.port}`);
    for (const ip of ips) console.log(`  En tu red WiFi:  http://${ip}:${config.port}`);
    console.log('');
    console.log(`  Clave de terminal para el firmware: ${config.terminalKey}`);
    const fw = writeFirmwareConfig(ips[0]);
    if (fw.length) console.log(`  Firmware listo: la IP ${ips[0]} y la clave ya están en firmware/${fw.join('/servidor.h y firmware/')}/servidor.h`);
    if (fw.length) console.log('  Tu WiFi y el nombre de cada lector van en mis_datos.h, junto a servidor.h (no se suben a GitHub).');
    console.log(`  Correo: ${ch.email ? 'configurado (' + ch.email_from + ')' : (config.demoMode ? 'no configurado (se simula)' : 'no configurado')} · Telegram: ${config.telegram.token ? 'configurando...' : 'no configurado'}`);
    console.log('');
  });
}

module.exports = { app, server };
