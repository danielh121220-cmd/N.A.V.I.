const crypto = require('crypto');
const config = require('./config');
const { db } = require('./database');
const auth = require('./auth');
const C = require('./credential');
const T = require('./time');
const P = require('./pet');
const M = require('./mascot');

const DAYS = 180;
const RENEW_AFTER = 30;
const CODE_HOURS = 12;
const GOAL = 0.9;

function sign(data) {
  return crypto.createHmac('sha256', config.tokenSecret).update('student:' + data).digest('base64url');
}

function createToken(studentId) {
  const exp = Date.now() + DAYS * 86400000;
  const payload = `S.${studentId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

function tokenInfo(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'S') return null;
  const payload = parts.slice(0, 3).join('.');
  const a = Buffer.from(sign(payload));
  const b = Buffer.from(parts[3]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(parts[2]) < Date.now()) return null;
  return { id: Number(parts[1]), exp: Number(parts[2]) };
}

function readToken(token) {
  const t = tokenInfo(token);
  return t ? t.id : null;
}

function renewal(req) {
  const header = req.headers.authorization || '';
  const t = tokenInfo(header.startsWith('Bearer ') ? header.slice(7) : null);
  if (!t) return null;
  return t.exp - Date.now() < (DAYS - RENEW_AFTER) * 86400000 ? createToken(t.id) : null;
}

function requireStudent(req, res, next) {
  const header = req.headers.authorization || '';
  const id = readToken(header.startsWith('Bearer ') ? header.slice(7) : null);
  const s = id ? db.q('SELECT * FROM students WHERE id = ? AND active = 1').get(id) : null;
  if (!s) return res.status(401).json({ error: 'Tu sesión terminó. Acerca otra vez tu tarjeta.' });
  req.student = s;
  next();
}

const deviceHash = id => crypto.createHash('sha256').update('dev:' + String(id)).digest('hex');

function brief(s) {
  return { first_name: s.first_name, mascot: s.mascot, mascot_name: s.mascot_name };
}

function bind(s, deviceId, label) {
  db.q(`INSERT INTO student_devices (student_id, device_hash, label, last_seen) VALUES (?, ?, ?, ?)
        ON CONFLICT(student_id, device_hash) DO UPDATE SET last_seen = excluded.last_seen`)
    .run(s.id, deviceHash(deviceId), String(label || '').slice(0, 60) || null, new Date().toISOString());
}

function session(s) {
  return { token: createToken(s.id), student: brief(s) };
}

function fail(status, error, code, extra) {
  return { status, body: { error, code, ...(extra || {}) } };
}

function cardLogin(b) {
  const deviceId = String(b.device_id || '');
  if (deviceId.length < 16) return fail(400, 'Falta el identificador del dispositivo', 'DEVICE');
  const v = C.verify(b.cred, b.uid);
  if (!v.ok) return fail(401, C.REASON_TEXT[v.reason] || 'Credencial no válida', 'CRED_' + v.reason);
  return finishLogin(v.student, b, deviceId);
}

const codeHash = code => crypto.createHmac('sha256', config.tokenSecret).update('code:' + code).digest('hex');
const needsCode = s => Boolean(s && !s.pin_hash);

function issueCode(studentId) {
  db.q('DELETE FROM student_codes WHERE student_id = ? OR expires_at < ?').run(studentId, Date.now());
  let code;
  let hash;
  do {
    code = String(crypto.randomInt(100000, 1000000));
    hash = codeHash(code);
  } while (db.q('SELECT 1 FROM student_codes WHERE code_hash = ?').get(hash));
  db.q('INSERT INTO student_codes (student_id, code_hash, expires_at) VALUES (?, ?, ?)').run(studentId, hash, Date.now() + CODE_HOURS * 3600000);
  return code;
}

const codeFails = [];
function codePaused() {
  const now = Date.now();
  while (codeFails.length && now - codeFails[0] > 15 * 60000) codeFails.shift();
  return codeFails.length >= 25;
}

function codeLogin(b) {
  const deviceId = String(b.device_id || '');
  if (deviceId.length < 16) return fail(400, 'Falta el identificador del dispositivo', 'DEVICE');
  if (codePaused()) return fail(429, 'Hubo muchos códigos equivocados. Espera 15 minutos o pide ayuda a tu docente.', 'LOCKED');
  const code = String(b.code || '').replace(/\D/g, '');
  const entry = code.length === 6 ? db.q('SELECT * FROM student_codes WHERE code_hash = ?').get(codeHash(code)) : null;
  if (!entry || entry.expires_at < Date.now()) {
    codeFails.push(Date.now());
    return fail(401, 'Ese código no existe o ya venció. Acerca otra vez tu tarjeta al lector.', 'BAD_CODE');
  }
  const s = db.q('SELECT * FROM students WHERE id = ? AND active = 1').get(entry.student_id);
  if (!s) return fail(401, 'Estudiante no encontrado', 'BAD_CODE');
  const out = finishLogin(s, b, deviceId);
  if (out.body && out.body.token) db.q('DELETE FROM student_codes WHERE student_id = ?').run(s.id);
  return out;
}

function finishLogin(s, b, deviceId) {
  const known = db.q('SELECT id FROM student_devices WHERE student_id = ? AND device_hash = ?').get(s.id, deviceHash(deviceId));
  if (known) {
    bind(s, deviceId, b.device_label);
    return { status: 200, body: session(s) };
  }
  if (s.pin_locked_until && s.pin_locked_until > Date.now()) {
    const min = Math.ceil((s.pin_locked_until - Date.now()) / 60000);
    return fail(429, `Demasiados intentos. Espera ${min} min o pide al docente que restablezca tu PIN.`, 'LOCKED');
  }
  if (!s.pin_hash) {
    if (!b.new_pin) return { status: 200, body: { need: 'SET_PIN', student: brief(s) } };
    if (!/^\d{4,6}$/.test(String(b.new_pin))) return fail(400, 'El PIN debe tener de 4 a 6 números', 'PIN_FORMAT');
    db.q('UPDATE students SET pin_hash = ?, pin_fails = 0, pin_locked_until = NULL WHERE id = ?').run(auth.hashPassword(String(b.new_pin)), s.id);
    bind(s, deviceId, b.device_label);
    return { status: 200, body: session(s) };
  }
  if (!b.pin) return { status: 200, body: { need: 'PIN', student: brief(s) } };
  if (!auth.verifyPassword(String(b.pin), s.pin_hash)) {
    const fails = (s.pin_fails || 0) + 1;
    const lock = fails >= 5 ? Date.now() + 10 * 60000 : null;
    db.q('UPDATE students SET pin_fails = ?, pin_locked_until = ? WHERE id = ?').run(lock ? 0 : fails, lock, s.id);
    return fail(401, lock ? 'PIN incorrecto. Se bloqueó por 10 minutos.' : `PIN incorrecto. Te quedan ${5 - fails} intentos.`, 'BAD_PIN');
  }
  db.q('UPDATE students SET pin_fails = 0, pin_locked_until = NULL WHERE id = ?').run(s.id);
  bind(s, deviceId, b.device_label);
  return { status: 200, body: session(s) };
}

function demoLogin(studentId) {
  const s = db.q('SELECT * FROM students WHERE id = ? AND active = 1').get(studentId);
  if (!s) return fail(404, 'Estudiante no encontrado', 'NOT_FOUND');
  return { status: 200, body: session(s) };
}

function addDays(date, n) {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return T.localDate(d);
}

function schoolDays(course, until, count) {
  const days = String(course.days || '1,2,3,4,5').split(',').map(Number);
  const out = [];
  let d = until;
  for (let guard = 0; out.length < count && guard < count * 4; guard++) {
    if (days.includes(T.isoWeekday(new Date(d + 'T12:00:00')))) out.push(d);
    d = addDays(d, -1);
  }
  return out;
}

function kindOf(r) {
  if (!r) return 'NONE';
  if (r.review_state === 'FRAUDE') return 'AUSENTE';
  if (r.justified && r.status !== 'A_TIEMPO') return 'JUSTIFICADO';
  return r.status;
}

const BADGES = [
  ['nacio', 'Nació tu mascota', 'egg'],
  ['primer_dia', 'Primer registro', 'flag'],
  ['racha_3', 'Tres días seguidos a tiempo', 'flame'],
  ['racha_5', 'Una semana a tiempo', 'star'],
  ['madrugador', 'Madrugador: 3 llegadas temprano', 'sun'],
  ['puntual_10', '10 días puntuales', 'medal'],
  ['verificado', 'Tarjeta con firma verificada', 'shield'],
  ['puntual_25', '25 días puntuales', 'trophy']
];

function me(studentId) {
  P.check(studentId);
  const s = db.q('SELECT * FROM students WHERE id = ?').get(studentId);
  const pet = P.status(s);
  const course = db.q('SELECT * FROM courses WHERE id = ?').get(s.course_id);
  const today = T.localDate();
  const recs = db.q('SELECT * FROM attendances WHERE student_id = ? AND date >= ? ORDER BY date DESC').all(s.id, addDays(today, -120));
  const byDate = new Map(recs.map(r => [r.date, r]));
  const todayRec = byDate.get(today) || null;
  const days = schoolDays(course, today, 10);
  const isSchoolToday = days[0] === today;
  const week = days.slice(0, 5).reverse().map(d => ({ date: d, weekday: T.isoWeekday(new Date(d + 'T12:00:00')), kind: d === today && !todayRec ? 'HOY' : kindOf(byDate.get(d)) }));
  const allDays = schoolDays(course, today, 60);
  let streak = 0;
  for (const d of allDays) {
    const r = byDate.get(d);
    const k = kindOf(r);
    if (d === today && !r) continue;
    if (k === 'A_TIEMPO') streak++;
    else if (k === 'JUSTIFICADO') continue;
    else break;
  }
  const punctualAll = db.q("SELECT COUNT(*) AS c FROM attendances WHERE student_id = ? AND status = 'A_TIEMPO' AND (review_state IS NULL OR review_state != 'FRAUDE')").get(s.id).c;
  const punctual = db.q("SELECT COUNT(*) AS c FROM attendances WHERE student_id = ? AND date >= ? AND status = 'A_TIEMPO' AND (review_state IS NULL OR review_state != 'FRAUDE')").get(s.id, s.mascot_born_on || '0000-00-00').c;
  const present = db.q("SELECT COUNT(*) AS c FROM attendances WHERE student_id = ? AND status IN ('A_TIEMPO','TARDE')").get(s.id).c;
  const startMin = T.hhmmToMinutes(course.schedule_start);
  const early = recs.filter(r => r.status === 'A_TIEMPO' && T.hhmmToMinutes(r.time_recorded.slice(0, 5)) <= startMin - 10).length;
  const verified = recs.some(r => r.card_verified === 1);
  const level = 1 + Math.floor(punctual / 5);
  const got = {
    nacio: Boolean(s.mascot_hatched),
    primer_dia: present > 0,
    racha_3: streak >= 3,
    racha_5: streak >= 5,
    madrugador: early >= 3,
    puntual_10: punctualAll >= 10,
    verificado: verified,
    puntual_25: punctualAll >= 25
  };
  const monday = (() => {
    const wd = T.isoWeekday(new Date(today + 'T12:00:00'));
    return addDays(today, 1 - wd);
  })();
  const weekDays = schoolDays(course, today, 7).filter(d => d >= monday);
  const total = db.q('SELECT COUNT(*) AS c FROM students WHERE course_id = ? AND active = 1').get(course.id).c;
  const presentWeek = weekDays.length ? db.q(`SELECT COUNT(*) AS c FROM attendances WHERE course_id = ? AND date >= ? AND status IN ('A_TIEMPO','TARDE')`).get(course.id, monday).c : 0;
  const expected = total * weekDays.length;
  const rate = expected ? presentWeek / expected : 0;
  const k = kindOf(todayRec);
  let mood = 'thinking';
  let line = isSchoolToday ? `${s.mascot_name || 'Tu mascota'} te espera en clase.` : 'Hoy no hay clases. ¡A descansar!';
  if (k === 'A_TIEMPO') { mood = 'happy'; line = `¡Llegaste a tiempo a las ${todayRec.time_recorded.slice(0, 5)}!`; }
  else if (k === 'TARDE') { mood = 'wink'; line = `Llegaste a las ${todayRec.time_recorded.slice(0, 5)}. Mañana un poquito antes y sumas un día puntual.`; }
  else if (k === 'JUSTIFICADO') { mood = 'sleepy'; line = 'Tu falta está justificada. Tu mascota también descansa.'; }
  else if (k === 'AUSENTE') { mood = 'sleepy'; line = 'Hoy te extrañamos en clase. Mañana es un nuevo día.'; }
  else if (!isSchoolToday) mood = 'sleepy';
  const petName = s.mascot_name || M.name(s.mascot);
  if (pet.dead) { mood = 'sleepy'; line = `${petName} se fue después de ${P.LIFE} días de clase sin verte.`; }
  else if (k !== 'A_TIEMPO' && k !== 'TARDE' && pet.run >= 1) {
    mood = pet.mood;
    const left = P.LIFE - pet.run;
    line = pet.run === 1 ? `${petName} te extrañó en la última clase. Te espera.` : left === 1 ? `${petName} está muy débil. Si faltas un día más sin justificar, se va.` : `${petName} está ${pet.label.toLowerCase()}: lleva ${pet.run} días de clase sin verte. Le quedan ${left} corazones.`;
  }
  return {
    student: { id: s.id, first_name: s.first_name, last_name: s.last_name, student_code: s.student_code, mascot: s.mascot, mascot_name: s.mascot_name, mascot_hatched: Boolean(s.mascot_hatched), mascot_unlocked: Boolean(s.mascot_unlocked), course_name: course.name, schedule_start: course.schedule_start },
    pet,
    today: { date: today, school: isSchoolToday, kind: k, time: todayRec ? todayRec.time_recorded.slice(0, 5) : null, verified: todayRec ? todayRec.card_verified === 1 : false },
    mood,
    line,
    week,
    streak,
    punctual,
    level,
    next_level_in: 5 - (punctual % 5),
    badges: BADGES.map(([id, title, icon]) => ({ id, title, icon, got: got[id] })),
    course_goal: { rate, goal: GOAL, reached: rate >= GOAL && weekDays.length > 0, days: weekDays.length }
  };
}

function update(studentId, b) {
  if (typeof b.mascot_name === 'string') {
    const name = b.mascot_name.trim().replace(/\s+/g, ' ').slice(0, 18);
    db.q('UPDATE students SET mascot_name = ? WHERE id = ?').run(name || null, studentId);
  }
  if (b.hatched === true) db.q('UPDATE students SET mascot_hatched = 1 WHERE id = ?').run(studentId);
  return me(studentId);
}

function adopt(studentId, index) {
  const r = P.adopt(studentId, index);
  if (r.error) return fail(400, r.error, 'ADOPT');
  return { status: 200, body: me(studentId) };
}

function resetAccess(studentId) {
  db.q('UPDATE students SET pin_hash = NULL, pin_fails = 0, pin_locked_until = NULL WHERE id = ?').run(studentId);
  db.q('DELETE FROM student_codes WHERE student_id = ?').run(studentId);
  db.q('DELETE FROM student_devices WHERE student_id = ?').run(studentId);
}

function accessInfo(studentId) {
  const s = db.q('SELECT card_ver, pin_hash FROM students WHERE id = ?').get(studentId);
  const devices = db.q('SELECT label, created_at, last_seen FROM student_devices WHERE student_id = ? ORDER BY last_seen DESC').all(studentId);
  return { card_ver: s ? s.card_ver : 0, has_pin: Boolean(s && s.pin_hash), devices };
}

function demoUnlock(studentId) {
  db.q('UPDATE students SET mascot_unlocked = 1 WHERE id = ?').run(studentId);
  return me(studentId);
}

module.exports = { requireStudent, cardLogin, codeLogin, issueCode, needsCode, renewal, adopt, demoLogin, demoUnlock, me, update, resetAccess, accessInfo, readToken };
