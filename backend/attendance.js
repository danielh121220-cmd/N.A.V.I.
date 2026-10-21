const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const config = require('./config');
const { db, getSettings } = require('./database');
const { notify } = require('./notifier');
const C = require('./credential');
const M = require('./mascot');
const ST = require('./student');
const P = require('./pet');
const T = require('./time');

const SNAP_DIR = path.join(config.DATA_DIR, 'snapshots');
const FACE_DIR = path.join(config.DATA_DIR, 'faces');
fs.mkdirSync(SNAP_DIR, { recursive: true });
fs.mkdirSync(FACE_DIR, { recursive: true });

let broadcast = () => {};
let emergencyArm = null;
function armEmergency(userId, seconds = 60) {
  emergencyArm = { userId, until: Date.now() + seconds * 1000 };
  return emergencyArm;
}
function disarmEmergency() {
  emergencyArm = null;
}
function setBroadcast(fn) {
  broadcast = fn;
}

let writeArm = null;
let writeBuilder = null;
function setWriteBuilder(fn) {
  writeBuilder = fn;
}
function armWrite(studentId, userId, assign, seconds = 90) {
  writeArm = { studentId, userId, assign: Boolean(assign), until: Date.now() + seconds * 1000, job: crypto.randomBytes(6).toString('hex') };
  return { job: writeArm.job, until: new Date(writeArm.until).toISOString(), assign: writeArm.assign };
}
function disarmWrite() {
  writeArm = null;
}
const writeActive = () => Boolean(writeArm && Date.now() < writeArm.until);
function writeDone(job, uid, ok, error) {
  if (!writeArm || writeArm.job !== job) return false;
  const sid = writeArm.studentId;
  if (ok) writeArm = null;
  broadcast('card_written', { student_id: sid, ok: Boolean(ok), uid: uid || null, error: ok ? null : String(error || 'No se pudo grabar').slice(0, 120) });
  return true;
}

function handleWrite(student, uid, ntag, simulated) {
  const target = db.q('SELECT * FROM students WHERE id = ? AND active = 1').get(writeArm.studentId);
  if (!target) {
    writeArm = null;
    return null;
  }
  const name = ascii(target.first_name).toUpperCase().slice(0, 14);
  const fail = (l1, l2, why) => {
    broadcast('card_written', { student_id: target.id, ok: false, uid, error: why });
    return { code: 200, body: { status: 'ERROR_GRABAR', display: { line1: l1, line2: l2 } } };
  };
  if (student && student.id !== target.id) return null;
  if (!student && !writeArm.assign) return null;
  if (!simulated && !ntag) return fail('USE TARJETA', 'NTAG213 O NTAG215', 'Esta tarjeta no es NTAG: sirve para asistencia, pero no guarda la credencial');
  if (!student) {
    const old = db.q('SELECT id FROM students WHERE nfc_uid = ? AND active = 0').get(uid);
    if (old) db.q("UPDATE students SET nfc_uid = nfc_uid || '-OLD' || id WHERE id = ?").run(old.id);
    db.q('UPDATE students SET nfc_uid = ?, card_ver = card_ver + 1 WHERE id = ?').run(uid, target.id);
    broadcast('student', { id: target.id });
  }
  const fresh = db.q('SELECT * FROM students WHERE id = ?').get(target.id);
  const built = writeBuilder ? writeBuilder(fresh) : null;
  if (!built) return fail('ERROR', 'DEL SERVIDOR', 'No se pudo preparar la credencial');
  let ndef;
  try {
    ndef = C.ndefHex(built.url, built.cred);
  } catch (e) {
    return fail('DATOS MUY', 'GRANDES', e.message);
  }
  if (simulated) {
    writeDone(writeArm.job, uid, true);
    return { code: 200, body: { status: 'GRABADO', student_name: `${fresh.first_name} ${fresh.last_name}`, display: { line1: 'TARJETA', line2: 'GRABADA' } } };
  }
  return { code: 200, body: { status: 'GRABAR', job: writeArm.job, ndef, cred: built.cred, student_name: `${fresh.first_name} ${fresh.last_name}`, display: { line1: 'GRABANDO', line2: name } } };
}

function mascotPart(student, happy) {
  if (student.mascot == null || student.mascot_dead_on) return {};
  return { mascot: M.bitmap(student.mascot, happy ? 'happy' : 'neutral'), mascot_index: student.mascot, mascot_name: student.mascot_name || M.name(student.mascot) };
}

function petName(s) {
  return ascii(s.mascot_name || M.name(s.mascot)).toUpperCase().slice(0, 9);
}

function tapResult(studentId, base, src, opts = {}) {
  let s = db.q('SELECT * FROM students WHERE id = ?').get(studentId);
  if (src === 'OFFLINE') return { display: base, code: null, extra: mascotPart(s, opts.happy) };
  let first = false;
  if (s.mascot_dead_on && ST.needsCode(s)) {
    const r = P.adopt(s.id);
    if (!r.error) {
      s = db.q('SELECT * FROM students WHERE id = ?').get(studentId);
      broadcast('mascot_adopted', { student_id: s.id, mascot: s.mascot, auto: true });
      first = true;
    }
  }
  if (s.mascot_dead_on) return { display: { line1: base.line1, line2: 'ELIGE MASCOTA' }, code: null, extra: {}, gone: true };
  if (!s.mascot_unlocked) {
    db.q('UPDATE students SET mascot_unlocked = 1 WHERE id = ?').run(s.id);
    broadcast('mascot_unlocked', { student_id: s.id });
    first = true;
  }
  const code = ST.needsCode(s) ? ST.issueCode(s.id) : null;
  let d = { ...base };
  if (first) d = { line1: `NACIO ${petName(s)}!`, line2: code ? 'CODIGO APP:' : 'ABRE LA APP' };
  else if (code) d = { line1: base.line1, line2: 'CODIGO APP:' };
  else if (opts.saved) d = { line1: base.line1, line2: 'ME SALVASTE!' };
  if (code) d.line3 = code;
  return { display: d, code, first, extra: mascotPart(s, opts.happy || first || opts.saved) };
}

const lastSnapshots = new Map();
const waitingForCamera = new Map();
const lastTapByTerminal = new Map();

const PRESENT = ['A_TIEMPO', 'TARDE'];

const recordSql = `
  SELECT a.*, s.first_name, s.last_name, s.student_code, s.face_photo, s.mascot, s.parent_phone, s.parent_email,
         c.name AS course_name, c.classroom, c.code AS course_code
  FROM attendances a
  JOIN students s ON s.id = a.student_id
  JOIN courses c ON c.id = a.course_id`;

function shape(r) {
  if (!r) return null;
  return {
    ...r,
    student_name: `${r.first_name} ${r.last_name}`,
    review_reasons: r.review_reasons ? JSON.parse(r.review_reasons) : [],
    has_snapshot: Boolean(r.snapshot_photo),
    has_face: Boolean(r.face_photo)
  };
}

function getRecord(id) {
  return shape(db.q(`${recordSql} WHERE a.id = ?`).get(id));
}

function listByDate(date) {
  return db.q(`${recordSql} WHERE a.date = ? ORDER BY a.timestamp DESC`).all(date).map(shape);
}

function listPendingReview() {
  return db.q(`${recordSql} WHERE a.review_state = 'PENDIENTE' ORDER BY a.timestamp DESC LIMIT 200`).all().map(shape);
}

function emitRecord(id) {
  const r = getRecord(id);
  if (r) {
    broadcast('attendance', r);
    P.check(r.student_id);
  }
  return r;
}

function addReason(id, code, text) {
  const row = db.q('SELECT review_reasons, review_state FROM attendances WHERE id = ?').get(id);
  if (!row) return;
  const reasons = row.review_reasons ? JSON.parse(row.review_reasons) : [];
  if (reasons.some(r => r.code === code)) return;
  reasons.push({ code, text });
  const state = row.review_state === 'OK' || row.review_state === 'FRAUDE' ? row.review_state : 'PENDIENTE';
  db.q('UPDATE attendances SET review_reasons = ?, review_state = ? WHERE id = ?').run(JSON.stringify(reasons), state, id);
  emitRecord(id);
}

function statusForTime(course, date) {
  const diff = T.minutesOfDay(date) - T.hhmmToMinutes(course.schedule_start);
  return diff > course.late_tolerance_min ? 'TARDE' : 'A_TIEMPO';
}

function saveSnapshot(attendanceId, buffer) {
  const file = `${attendanceId}.jpg`;
  fs.writeFileSync(path.join(SNAP_DIR, file), buffer);
  db.q('UPDATE attendances SET snapshot_photo = ?, snapshot_bytes = ? WHERE id = ?').run(file, buffer.length, attendanceId);
  if (buffer.length < config.cameraObstructedBytes) {
    addReason(attendanceId, 'CAMARA_TAPADA', 'La foto salió casi negra o uniforme: cámara tapada u oscura');
  } else {
    emitRecord(attendanceId);
  }
}

function cameraPaired(terminalId) {
  const cam = db.q('SELECT last_seen FROM terminals WHERE id = ?').get(`${terminalId}#CAM`);
  return Boolean(cam && cam.last_seen && Date.now() - Date.parse(cam.last_seen) < 3 * 60000);
}

function receiveSnapshot(terminalId, buffer) {
  const waiting = waitingForCamera.get(terminalId);
  if (waiting && Date.now() - waiting.at < 7000) {
    waitingForCamera.delete(terminalId);
    clearTimeout(waiting.timer);
    saveSnapshot(waiting.attendanceId, buffer);
    return { attached: waiting.attendanceId };
  }
  lastSnapshots.set(terminalId, { buffer, at: Date.now() });
  broadcast('camera', { terminal_id: terminalId, bytes: buffer.length, at: new Date().toISOString() });
  return { attached: null };
}

function riskChecks(att, student, presenceId, when) {
  const prev = db.q(`
    SELECT id, student_id, presence_id, timestamp FROM attendances
    WHERE terminal_id = ? AND source IN ('NFC','OFFLINE') AND student_id != ? AND id != ?
    ORDER BY timestamp DESC LIMIT 1`).get(att.terminal_id, student.id, att.id);
  if (!prev) return;
  const gapMs = when.getTime() - Date.parse(prev.timestamp);
  if (gapMs < 0 || gapMs > 20000) return;

  if (presenceId) {
    if (prev.presence_id && prev.presence_id === presenceId) {
      const text = 'Dos tarjetas distintas mientras la misma persona estaba frente al lector';
      addReason(att.id, 'MULTI_TARJETA', text);
      addReason(prev.id, 'MULTI_TARJETA', text);
    }
  } else if (gapMs < 1500) {
    addReason(att.id, 'RAFAGA', `Dos tarjetas en ${(gapMs / 1000).toFixed(1)} s (sin sensor de presencia para confirmar)`);
  }

  const days = db.q(`
    SELECT COUNT(DISTINCT a.date) AS n FROM attendances a
    JOIN attendances b ON b.date = a.date AND b.student_id = ? AND b.terminal_id = a.terminal_id
    WHERE a.student_id = ? AND a.date >= ? AND a.date < ?
      AND ABS(julianday(a.timestamp) - julianday(b.timestamp)) * 86400 <= 20`)
    .get(prev.student_id, student.id, T.daysAgo(14, when), att.date).n;
  if (days >= 2) {
    const text = `Estas dos tarjetas se marcan juntas con frecuencia (${days + 1} días en 2 semanas)`;
    addReason(att.id, 'PATRON', text);
    addReason(prev.id, 'PATRON', text);
  }
}

const ascii = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '');

function display(status, student, time, review) {
  const first = student ? ascii(student.first_name).toUpperCase().slice(0, 14) : '';
  if (status === 'A_TIEMPO') return { line1: `HOLA ${first}`, line2: review ? 'REGISTRO EN REVISION' : `A TIEMPO ${time.slice(0, 5)}` };
  if (status === 'TARDE') return { line1: `HOLA ${first}`, line2: review ? 'REGISTRO EN REVISION' : `ATRASO ${time.slice(0, 5)}` };
  if (status === 'DUPLICADO') return { line1: first, line2: `YA MARCO ${time.slice(0, 5)}` };
  if (status === 'DESCONOCIDO') return { line1: 'TARJETA NO REGISTRADA', line2: 'AVISE AL DOCENTE' };
  return { line1: '', line2: '' };
}

function scan({ uid, terminalId = 'ESP32-AULA-1', ts = null, presenceId = null, snapshotBuffer = null, source = 'NFC', cred = null, ntag = false, simulated = false }) {
  const cleanUid = String(uid || '').toUpperCase().replace(/[^0-9A-F]/g, '');
  if (!cleanUid) return { code: 400, body: { error: 'UID vacío' } };

  let when = new Date();
  let src = source;
  let validTs = false;
  if (ts) {
    const t = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts);
    const age = Date.now() - t.getTime();
    if (!isNaN(t) && age > -120000 && age < 72 * 3600000) {
      when = t;
      validTs = true;
      if (age > 30000) src = 'OFFLINE';
    }
  }
  if (source === 'OFFLINE' && !validTs) return { code: 422, body: { status: 'FUERA_DE_RANGO' } };

  const held = lastTapByTerminal.get(terminalId);
  if (src !== 'OFFLINE' && !(emergencyArm && Date.now() < emergencyArm.until) && !writeActive() && held && held.uid === cleanUid && when.getTime() - held.at < 4000) {
    return { code: 200, body: { status: 'REPETIDO', display: display('REPETIDO') } };
  }
  if (src !== 'OFFLINE') lastTapByTerminal.set(terminalId, { uid: cleanUid, at: when.getTime() });

  const student = db.q('SELECT * FROM students WHERE nfc_uid = ? AND active = 1').get(cleanUid);
  if (writeActive() && src !== 'OFFLINE') {
    const w = handleWrite(student, cleanUid, ntag, simulated);
    if (w) return w;
  }
  if (!student) {
    broadcast('unknown_card', { uid: cleanUid, terminal_id: terminalId, at: when.toISOString() });
    return { code: 404, body: { status: 'DESCONOCIDO', uid: cleanUid, display: display('DESCONOCIDO') } };
  }
  if (emergencyArm && Date.now() < emergencyArm.until && src !== 'OFFLINE') {
    const userId = emergencyArm.userId;
    emergencyArm = null;
    db.q('INSERT INTO health_access (student_id, via, user_id, at) VALUES (?, ?, ?, ?)').run(student.id, 'LECTOR', userId, new Date().toISOString());
    broadcast('emergency_card', { student_id: student.id, user_id: userId, terminal_id: terminalId });
    return { code: 200, body: { status: 'EMERGENCIA', student_name: `${student.first_name} ${student.last_name}`, display: { line1: 'FICHA MEDICA', line2: 'ABIERTA EN LA APP' } } };
  }
  const course = db.q('SELECT * FROM courses WHERE id = ?').get(student.course_id);
  const date = T.localDate(when);
  const time = T.localTime(when);
  const existing = db.q('SELECT * FROM attendances WHERE student_id = ? AND date = ?').get(student.id, date);
  const settings = getSettings();
  if (src === 'OFFLINE' && date !== T.localDate()) {
    settings.notify_on_late = false;
    settings.notify_on_arrival = false;
  }

  if (existing && existing.status !== 'AUSENTE') {
    broadcast('duplicate', { student_name: `${student.first_name} ${student.last_name}`, first_time: existing.time_recorded, terminal_id: terminalId });
    const t = tapResult(student.id, display('DUPLICADO', student, existing.time_recorded), src);
    return { code: 200, body: { status: 'DUPLICADO', student_name: `${student.first_name} ${student.last_name}`, time: existing.time_recorded, login_code: t.code, display: t.display, ...t.extra } };
  }

  const before = P.absenceRun(student).n;
  let attId;
  let status;
  if (existing) {
    status = 'TARDE';
    db.q(`UPDATE attendances SET status = 'TARDE', source = ?, terminal_id = ?, timestamp = ?, time_recorded = ?, presence_id = ? WHERE id = ?`)
      .run(src, terminalId, when.toISOString(), time, presenceId, existing.id);
    attId = existing.id;
    if (settings.notify_on_late) setImmediate(() => notify('LATE_AFTER_ABSENT', student.id, attId));
  } else {
    status = statusForTime(course, when);
    attId = db.q(`
      INSERT INTO attendances (student_id, course_id, terminal_id, date, timestamp, time_recorded, status, source, presence_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(student.id, course.id, terminalId, date, when.toISOString(), time, status, src, presenceId).lastInsertRowid;
    if (status === 'TARDE' && settings.notify_on_late) setImmediate(() => notify('LATE', student.id, attId));
    if (status === 'A_TIEMPO' && settings.notify_on_arrival) setImmediate(() => notify('ARRIVAL', student.id, attId));
  }

  const att = db.q('SELECT * FROM attendances WHERE id = ?').get(attId);
  riskChecks(att, student, presenceId, when);
  checkCard(attId, student, cleanUid, cred, ntag);

  if (snapshotBuffer) {
    saveSnapshot(attId, snapshotBuffer);
  } else if (src !== 'OFFLINE') {
    const snap = lastSnapshots.get(terminalId);
    if (snap && Date.now() - snap.at < 5000) {
      lastSnapshots.delete(terminalId);
      saveSnapshot(attId, snap.buffer);
    } else if (cameraPaired(terminalId)) {
      const timer = setTimeout(() => {
        const w = waitingForCamera.get(terminalId);
        if (w && w.attendanceId === attId) {
          waitingForCamera.delete(terminalId);
          addReason(attId, 'SIN_FOTO', 'La cámara no envió foto de este registro');
        }
      }, 6000);
      waitingForCamera.set(terminalId, { attendanceId: attId, at: Date.now(), timer });
    }
  }

  const record = emitRecord(attId);
  const review = record.review_state === 'PENDIENTE';
  const t = tapResult(student.id, display(status, student, time, review), src, { happy: status === 'A_TIEMPO' && !review, saved: before >= 2 && !review });
  return {
    code: 200,
    body: {
      status,
      attendance_id: attId,
      student_name: record.student_name,
      time,
      review,
      login_code: t.code,
      mascot_gone: Boolean(t.gone),
      display: t.display,
      ...t.extra
    }
  };
}

function checkCard(attId, student, uid, cred, ntag) {
  if (!cred && !(ntag && student.card_ver > 0)) return;
  const v = cred ? C.verify(cred, uid) : { ok: false, reason: 'FORMATO' };
  const ok = v.ok && v.student.id === student.id;
  db.q('UPDATE attendances SET card_verified = ? WHERE id = ?').run(ok ? 1 : 0, attId);
  if (!ok && student.card_ver > 0) addReason(attId, 'TARJETA_NO_VERIFICADA', `${C.REASON_TEXT[v.reason] || 'La firma no coincide'}: puede ser una copia de la tarjeta`);
}

function justify(id, justified, note, userId) {
  const r = db.q('SELECT * FROM attendances WHERE id = ?').get(id);
  if (!r) return null;
  db.q('UPDATE attendances SET justified = ?, justification = ?, justified_by = ?, justified_at = ? WHERE id = ?')
    .run(justified ? 1 : 0, justified ? String(note || '').trim().slice(0, 300) || null : null, justified ? userId : null, justified ? new Date().toISOString() : null, id);
  return emitRecord(id);
}

function rollForCourse(courseId, date) {
  const students = db.q(`SELECT id, first_name, last_name, student_code, face_photo, mascot FROM students WHERE course_id = ? AND active = 1 ORDER BY last_name, first_name`).all(courseId);
  const recs = db.q(`SELECT * FROM attendances WHERE course_id = ? AND date = ?`).all(courseId, date);
  const byStudent = new Map(recs.map(r => [r.student_id, r]));
  return students.map(s => {
    const r = byStudent.get(s.id);
    return {
      student_id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      first_name: s.first_name,
      last_name: s.last_name,
      student_code: s.student_code,
      has_face: Boolean(s.face_photo),
      face_photo: s.face_photo,
      mascot: s.mascot,
      attendance: r ? { id: r.id, status: r.status, time: r.time_recorded, source: r.source, in_class: r.in_class, review_state: r.review_state, justified: r.justified } : null
    };
  });
}

function confirmRoll(courseId, date, entries, userId) {
  const course = db.q('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!course) throw new Error('Curso no encontrado');
  const settings = getSettings();
  const now = new Date();
  const changed = [];
  const tx = db.transaction(() => {
    for (const e of entries) {
      const s = db.q('SELECT * FROM students WHERE id = ? AND course_id = ?').get(e.id, courseId);
      if (!s) continue;
      const r = db.q('SELECT * FROM attendances WHERE student_id = ? AND date = ?').get(s.id, date);
      const stamp = now.toISOString();
      if (e.in_class) {
        if (!r) {
          const id = db.q(`INSERT INTO attendances (student_id, course_id, date, timestamp, time_recorded, status, source, in_class, verified_by, verified_at) VALUES (?, ?, ?, ?, ?, ?, 'MANUAL', 1, ?, ?)`)
            .run(s.id, courseId, date, stamp, T.localTime(now), statusForTime(course, now), userId, stamp).lastInsertRowid;
          changed.push(id);
        } else {
          const status = r.status === 'AUSENTE' ? 'TARDE' : r.status;
          const source = r.status === 'AUSENTE' ? 'MANUAL' : r.source;
          db.q('UPDATE attendances SET in_class = 1, status = ?, source = ?, verified_by = ?, verified_at = ? WHERE id = ?').run(status, source, userId, stamp, r.id);
          changed.push(r.id);
        }
      } else if (!r) {
        const id = db.q(`INSERT INTO attendances (student_id, course_id, date, timestamp, time_recorded, status, source, in_class, verified_by, verified_at) VALUES (?, ?, ?, ?, ?, 'AUSENTE', 'MANUAL', 0, ?, ?)`)
          .run(s.id, courseId, date, stamp, T.localTime(now), userId, stamp).lastInsertRowid;
        changed.push(id);
        if (settings.notify_on_absent) setImmediate(() => notify('ABSENT', s.id, id));
      } else {
        db.q('UPDATE attendances SET in_class = 0, verified_by = ?, verified_at = ? WHERE id = ?').run(userId, stamp, r.id);
        changed.push(r.id);
        if (PRESENT.includes(r.status)) changed.push({ flag: r.id });
      }
    }
  });
  tx();
  for (const c of changed) {
    if (typeof c === 'object') addReason(c.flag, 'NO_EN_AULA', 'Su tarjeta marcó asistencia, pero el docente no lo vio en el aula');
    else emitRecord(c);
  }
  return rollForCourse(courseId, date);
}

function decideReview(id, decision, userId) {
  const r = db.q('SELECT * FROM attendances WHERE id = ?').get(id);
  if (!r) throw new Error('Registro no encontrado');
  const stamp = new Date().toISOString();
  if (decision === 'OK') {
    db.q(`UPDATE attendances SET review_state = 'OK', verified_by = ?, verified_at = ? WHERE id = ?`).run(userId, stamp, id);
  } else {
    db.q(`UPDATE attendances SET review_state = 'FRAUDE', status = 'AUSENTE', in_class = 0, verified_by = ?, verified_at = ? WHERE id = ?`).run(userId, stamp, id);
    if (getSettings().notify_on_absent) setImmediate(() => notify('NOT_IN_CLASS', r.student_id, id));
  }
  return emitRecord(id);
}

function runAbsences(now = new Date()) {
  if (!getSettings().auto_absences) return 0;
  const date = T.localDate(now);
  const weekday = String(T.isoWeekday(now));
  const minutes = T.minutesOfDay(now);
  let total = 0;
  const courses = db.q('SELECT * FROM courses').all();
  for (const c of courses) {
    if (!c.days.split(',').includes(weekday)) continue;
    if (minutes < T.hhmmToMinutes(c.schedule_start) + c.absent_limit_min) continue;
    const done = db.q('SELECT absences_done FROM course_runs WHERE course_id = ? AND date = ?').get(c.id, date);
    if (done && done.absences_done) continue;
    const missing = db.q(`
      SELECT s.id FROM students s
      WHERE s.course_id = ? AND s.active = 1
        AND NOT EXISTS (SELECT 1 FROM attendances a WHERE a.student_id = s.id AND a.date = ?)`).all(c.id, date);
    const ids = [];
    db.transaction(() => {
      for (const m of missing) {
        ids.push(db.q(`INSERT INTO attendances (student_id, course_id, date, timestamp, time_recorded, status, source) VALUES (?, ?, ?, ?, ?, 'AUSENTE', 'AUTO')`)
          .run(m.id, c.id, date, now.toISOString(), T.localTime(now)).lastInsertRowid);
      }
      db.q('INSERT INTO course_runs (course_id, date, absences_done) VALUES (?, ?, 1) ON CONFLICT(course_id, date) DO UPDATE SET absences_done = 1').run(c.id, date);
    })();
    const notifyAbsent = getSettings().notify_on_absent;
    ids.forEach((id, i) => {
      emitRecord(id);
      if (notifyAbsent) setTimeout(() => notify('ABSENT', missing[i].id, id), i * 150);
    });
    total += ids.length;
  }
  return total;
}

function purgeOldPhotos() {
  const limit = T.daysAgo(config.photoRetentionDays);
  const rows = db.q('SELECT id, snapshot_photo FROM attendances WHERE snapshot_photo IS NOT NULL AND date < ?').all(limit);
  for (const r of rows) {
    try {
      fs.unlinkSync(path.join(SNAP_DIR, r.snapshot_photo));
    } catch (e) {}
    db.q('UPDATE attendances SET snapshot_photo = NULL WHERE id = ?').run(r.id);
  }
  return rows.length;
}

function stats(date) {
  const total = db.q('SELECT COUNT(*) AS c FROM students WHERE active = 1').get().c;
  const rows = db.q('SELECT status, COUNT(*) AS c FROM attendances WHERE date = ? GROUP BY status').all(date);
  const by = Object.fromEntries(rows.map(r => [r.status, r.c]));
  const pending = db.q(`SELECT COUNT(*) AS c FROM attendances WHERE review_state = 'PENDIENTE'`).get().c;
  const verified = db.q(`SELECT COUNT(*) AS c FROM attendances WHERE date = ? AND in_class IS NOT NULL`).get(date).c;
  const present = (by.A_TIEMPO || 0) + (by.TARDE || 0);
  return {
    total,
    present,
    on_time: by.A_TIEMPO || 0,
    late: by.TARDE || 0,
    absent: by.AUSENTE || 0,
    unmarked: Math.max(0, total - present - (by.AUSENTE || 0)),
    pending_review: pending,
    verified
  };
}

module.exports = {
  justify,
  armWrite,
  disarmWrite,
  writeDone,
  setWriteBuilder,
  armEmergency,
  disarmEmergency,
  SNAP_DIR,
  FACE_DIR,
  setBroadcast,
  scan,
  receiveSnapshot,
  listByDate,
  listPendingReview,
  getRecord,
  rollForCourse,
  confirmRoll,
  decideReview,
  runAbsences,
  purgeOldPhotos,
  stats
};
