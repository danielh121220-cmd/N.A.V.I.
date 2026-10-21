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

const URI_PREFIXES = [['https://www.', 2], ['http://www.', 1], ['https://', 4], ['http://', 3]];

function record(flags, type, payload) {
  const short = payload.length < 256;
  const head = Buffer.from([flags | (short ? 0x10 : 0) | 0x01, type.length]);
  const len = short ? Buffer.from([payload.length]) : Buffer.from([(payload.length >>> 24) & 255, (payload.length >>> 16) & 255, (payload.length >>> 8) & 255, payload.length & 255]);
  return Buffer.concat([head, len, Buffer.from(type, 'ascii'), payload]);
}

function ndefHex(url, text) {
  let code = 0;
  let rest = String(url || '');
  for (const [p, c] of URI_PREFIXES) {
    if (rest.startsWith(p)) {
      code = c;
      rest = rest.slice(p.length);
      break;
    }
  }
  const uri = Buffer.concat([Buffer.from([code]), Buffer.from(rest, 'utf8')]);
  const lang = Buffer.from('es', 'ascii');
  const txt = Buffer.concat([Buffer.from([lang.length]), lang, Buffer.from(String(text || ''), 'utf8')]);
  const msg = Buffer.concat([record(0x80, 'U', uri), record(0x40, 'T', txt)]);
  const tlv = msg.length < 255 ? Buffer.from([0x03, msg.length]) : Buffer.from([0x03, 0xff, msg.length >> 8, msg.length & 255]);
  const all = Buffer.concat([tlv, msg, Buffer.from([0xfe])]);
  if (all.length > 144) throw new Error(`El enlace y la credencial ocupan ${all.length} bytes y una NTAG213 guarda 144. Usa una dirección más corta.`);
  return all.toString('hex').toUpperCase();
}

const REASON_TEXT = {
  FORMATO: 'La tarjeta no tiene una credencial de N.A.V.I',
  DESCONOCIDO: 'La credencial es de un estudiante que no existe',
  OTRA_TARJETA: 'La credencial fue copiada de otra tarjeta',
  FIRMA: 'La firma de la credencial no es válida',
  REVOCADA: 'Esta credencial fue reemplazada por una nueva'
};

module.exports = { make, verify, issue, parse, cleanUid, ndefHex, REASON_TEXT, PREFIX };
