const crypto = require('crypto');
const config = require('./config');
const { db } = require('./database');

const PREFIX = 'NAVI1';
const KEY = crypto.createHmac('sha256', config.tokenSecret).update('navi-card-credential-v1').digest();

const cleanUid = uid => String(uid || '').toUpperCase().replace(/[^0-9A-F]/g, '');

function signature(code, uid, ver) {
  return crypto.createHmac('sha256', KEY).update(`${PREFIX}|${code}|${cleanUid(uid)}|${ver}`).digest('base64url').slice(0, 22);
}

function make(student) {
  if (!student.card_ver) return null;
  return `${PREFIX}.${student.student_code}.${student.card_ver}.${signature(student.student_code, student.nfc_uid, student.card_ver)}`;
}

function parse(text) {
  const t = String(text || '').trim();
  if (!t.startsWith(PREFIX + '.')) return null;
  const parts = t.slice(PREFIX.length + 1).split('.');
  if (parts.length < 3) return null;
  const sig = parts.pop();
  const ver = Number(parts.pop());
  const code = parts.join('.');
  if (!code || !Number.isInteger(ver) || ver < 1 || !/^[A-Za-z0-9_-]{22}$/.test(sig)) return null;
  return { code, ver, sig };
}

function equal(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function verify(text, uid) {
  const p = parse(text);
  if (!p) return { ok: false, reason: 'FORMATO' };
  const student = db.q('SELECT * FROM students WHERE student_code = ? AND active = 1').get(p.code);
  if (!student) return { ok: false, reason: 'DESCONOCIDO' };
  const u = cleanUid(uid);
  if (u && u !== student.nfc_uid) return { ok: false, reason: 'OTRA_TARJETA', student };
  if (!equal(signature(p.code, student.nfc_uid, p.ver), p.sig)) return { ok: false, reason: 'FIRMA', student };
  if (p.ver !== student.card_ver) return { ok: false, reason: 'REVOCADA', student };
  return { ok: true, student };
}

function issue(studentId, rotate) {
  const s = db.q('SELECT * FROM students WHERE id = ?').get(studentId);
  if (!s) return null;
  if (!s.card_ver || rotate) {
    db.q('UPDATE students SET card_ver = card_ver + 1 WHERE id = ?').run(studentId);
    s.card_ver += 1;
  }
  return { cred: make(s), ver: s.card_ver, uid: s.nfc_uid };
}

const REASON_TEXT = {
  FORMATO: 'La tarjeta no tiene una credencial de N.A.V.I',
  DESCONOCIDO: 'La credencial es de un estudiante que no existe',
  OTRA_TARJETA: 'La credencial fue copiada de otra tarjeta',
  FIRMA: 'La firma de la credencial no es válida',
  REVOCADA: 'Esta credencial fue reemplazada por una nueva'
};

module.exports = { make, verify, issue, parse, cleanUid, REASON_TEXT, PREFIX };
