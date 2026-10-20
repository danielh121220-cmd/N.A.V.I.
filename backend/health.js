const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { db } = require('./database');

const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const SEVERITY = ['LEVE', 'MODERADA', 'GRAVE'];

const parse = (s, d = []) => {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : d;
  } catch (e) {
    return d;
  }
};
const str = (v, n) => (v == null ? '' : String(v).trim().slice(0, n));

function shape(row) {
  if (!row) return null;
  return {
    ...row,
    allergies: parse(row.allergies),
    conditions: parse(row.conditions),
    medications: parse(row.medications),
    contacts: parse(row.contacts),
    consent: Boolean(row.consent)
  };
}

function get(studentId) {
  return shape(db.q('SELECT * FROM student_health WHERE student_id = ?').get(studentId));
}

function clean(b) {
  const list = (arr, fn, max = 12) => (Array.isArray(arr) ? arr.slice(0, max).map(fn).filter(Boolean) : []);
  return {
    birth_date: /^\d{4}-\d{2}-\d{2}$/.test(b.birth_date || '') ? b.birth_date : null,
    blood_type: BLOOD.includes(b.blood_type) ? b.blood_type : null,
    allergies: list(b.allergies, a => (str(a && a.name, 60) ? { name: str(a.name, 60), severity: SEVERITY.includes(a.severity) ? a.severity : 'MODERADA', reaction: str(a.reaction, 160) } : null)),
    conditions: list(b.conditions, c => (str(c && c.name, 80) ? { name: str(c.name, 80), notes: str(c.notes, 200) } : null)),
    medications: list(b.medications, m => (str(m && m.name, 80) ? { name: str(m.name, 80), dose: str(m.dose, 160) } : null)),
    contacts: list(b.contacts, c => (str(c && c.name, 80) || str(c && c.phone, 30) ? { name: str(c.name, 80), relation: str(c.relation, 40), phone: str(c.phone, 30) } : null), 4),
    instructions: str(b.instructions, 800) || null,
    doctor: str(b.doctor, 120) || null,
    insurance: str(b.insurance, 80) || null,
    consent: b.consent ? 1 : 0,
    consent_by: str(b.consent_by, 80) || null
  };
}

function save(studentId, body, userId) {
  const d = clean(body || {});
  const prev = db.q('SELECT consent, consent_at, token FROM student_health WHERE student_id = ?').get(studentId);
  const now = new Date().toISOString();
  const consentAt = d.consent ? (prev && prev.consent ? prev.consent_at : now) : null;
  const token = (prev && prev.token) || crypto.randomBytes(12).toString('base64url');
  db.q(`INSERT INTO student_health (student_id, birth_date, blood_type, allergies, conditions, medications, contacts, instructions, doctor, insurance, consent, consent_by, consent_at, token, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id) DO UPDATE SET birth_date = excluded.birth_date, blood_type = excluded.blood_type, allergies = excluded.allergies, conditions = excluded.conditions,
      medications = excluded.medications, contacts = excluded.contacts, instructions = excluded.instructions, doctor = excluded.doctor, insurance = excluded.insurance,
      consent = excluded.consent, consent_by = excluded.consent_by, consent_at = excluded.consent_at, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
    .run(studentId, d.birth_date, d.blood_type, JSON.stringify(d.allergies), JSON.stringify(d.conditions), JSON.stringify(d.medications), JSON.stringify(d.contacts), d.instructions, d.doctor, d.insurance, d.consent, d.consent_by, consentAt, token, now, userId);
  return get(studentId);
}

function rotateToken(studentId) {
  const token = crypto.randomBytes(12).toString('base64url');
  const r = db.q('UPDATE student_health SET token = ? WHERE student_id = ?').run(token, studentId);
  return r.changes ? token : null;
}

function byToken(token) {
  if (!token || !/^[A-Za-z0-9_-]{10,40}$/.test(token)) return null;
  const h = db.q('SELECT * FROM student_health WHERE token = ?').get(token);
  if (!h) return null;
  const s = db.q(`SELECT s.*, c.name AS course_name FROM students s JOIN courses c ON c.id = s.course_id WHERE s.id = ?`).get(h.student_id);
  if (!s || !s.active) return null;
  return { health: shape(h), student: s };
}

function logAccess(studentId, via, req, userId = null) {
  const ip = String((req && (req.headers['cf-connecting-ip'] || req.socket.remoteAddress)) || '').replace('::ffff:', '').slice(0, 60);
  const agent = String((req && req.headers['user-agent']) || '').slice(0, 160);
  db.q('INSERT INTO health_access (student_id, via, user_id, ip, agent, at) VALUES (?, ?, ?, ?, ?, ?)').run(studentId, via, userId, ip, agent, new Date().toISOString());
}

function accessLog(studentId, limit = 20) {
  return db.q(`SELECT a.via, a.ip, a.agent, a.at, u.name AS user_name FROM health_access a LEFT JOIN users u ON u.id = a.user_id WHERE a.student_id = ? ORDER BY a.id DESC LIMIT ?`).all(studentId, limit);
}

function age(birth) {
  if (!birth) return null;
  const b = new Date(birth + 'T12:00:00');
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a >= 0 && a < 120 ? a : null;
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const tel = p => String(p || '').replace(/[^\d+]/g, '');

function page(data, token) {
  const { health: h, student: s } = data;
  const name = `${s.first_name} ${s.last_name}`;
  const years = age(h.birth_date);
  const sev = { GRAVE: 'Grave', MODERADA: 'Moderada', LEVE: 'Leve' };
  const photo = s.face_photo ? `<img class="ph" src="/e/${esc(token)}/foto" alt="">` : `<div class="ph ini">${esc((s.first_name[0] || '') + (s.last_name[0] || ''))}</div>`;
  const allergies = h.allergies.length
    ? h.allergies.map(a => `<div class="al ${a.severity === 'GRAVE' ? 'grave' : ''}"><div><b>${esc(a.name)}</b>${a.reaction ? `<span>${esc(a.reaction)}</span>` : ''}</div><em>${sev[a.severity] || ''}</em></div>`).join('')
    : '<p class="none">Sin alergias registradas</p>';
  const rows = (arr, f) => arr.map(f).join('');
  const contacts = h.contacts.filter(c => c.phone);
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#FF3B30"><title>Ficha médica · ${esc(name)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif;background:#F2F2F7;color:#000;-webkit-font-smoothing:antialiased;padding-bottom:calc(30px + env(safe-area-inset-bottom))}
.top{background:#FF3B30;color:#fff;padding:calc(18px + env(safe-area-inset-top)) 20px 64px;text-align:center}.top .k{font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.9}.top h1{font-size:15px;font-weight:600;margin-top:4px;opacity:.9}
.card{max-width:560px;margin:-48px auto 0;padding:0 16px}.id{background:#fff;border-radius:18px;padding:18px;display:flex;gap:16px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.08)}
.ph{width:84px;height:84px;border-radius:50%;object-fit:cover;flex:none;background:#E5E5EA}.ini{display:grid;place-items:center;font-size:30px;font-weight:700;color:#fff;background:linear-gradient(160deg,#FF6961,#FF3B30)}
.id h2{font-size:24px;letter-spacing:-.02em;line-height:1.15}.id p{color:rgba(60,60,67,.65);font-size:15px;margin-top:3px}.blood{display:inline-flex;align-items:center;gap:6px;margin-top:8px;background:#FFE5E3;color:#D70015;font-weight:700;border-radius:10px;padding:4px 10px;font-size:15px}
h3{font-size:13px;text-transform:uppercase;color:rgba(60,60,67,.6);font-weight:600;margin:24px 4px 8px;letter-spacing:.02em}.box{background:#fff;border-radius:14px;overflow:hidden}
.al{display:flex;justify-content:space-between;gap:12px;padding:13px 16px;border-top:.5px solid rgba(60,60,67,.18)}.al:first-child{border-top:0}.al b{font-size:17px;display:block}.al span{font-size:14px;color:rgba(60,60,67,.65);display:block;margin-top:2px}.al em{font-style:normal;font-size:13px;font-weight:700;color:#C25E00;background:#FFF2E0;border-radius:8px;padding:3px 8px;height:fit-content;white-space:nowrap}
.al.grave{background:#FFF1F0}.al.grave b{color:#D70015}.al.grave em{color:#fff;background:#FF3B30}
.row{padding:13px 16px;border-top:.5px solid rgba(60,60,67,.18)}.row:first-child{border-top:0}.row b{font-size:17px;display:block}.row span{font-size:14px;color:rgba(60,60,67,.65);display:block;margin-top:2px}
.do{background:#fff;border-radius:14px;padding:16px;font-size:17px;line-height:1.45;border-left:5px solid #FF9500}.none{padding:14px 16px;color:rgba(60,60,67,.6);font-size:15px}
.btn{display:flex;align-items:center;justify-content:center;gap:8px;height:54px;border-radius:14px;font-size:17px;font-weight:600;text-decoration:none;margin-top:10px}.call{background:#FF3B30;color:#fff}.alt{background:#fff;color:#007AFF}
.note{font-size:13px;color:rgba(60,60,67,.6);text-align:center;margin:22px 16px 0;line-height:1.4}
@media (prefers-color-scheme:dark){body{background:#000;color:#fff}.id,.box,.do,.alt{background:#1C1C1E}.id p,.al span,.row span,h3,.none,.note{color:rgba(235,235,245,.6)}.al,.row{border-color:rgba(84,84,88,.6)}.al.grave{background:#3A1110}.blood{background:#3A1110;color:#FF6961}.al em{background:#3A2A10;color:#FF9F0A}}
</style></head><body>
<div class="top"><div class="k">Ficha médica de emergencia</div><h1>${esc(config.institutionName)}</h1></div>
<div class="card">
<div class="id">${photo}<div><h2>${esc(name)}</h2><p>${years != null ? years + ' años · ' : ''}${esc(s.course_name)}</p>${h.blood_type ? `<span class="blood">Sangre ${esc(h.blood_type)}</span>` : ''}</div></div>
<a class="btn call" href="tel:911">Llamar al ECU 911</a>
${contacts.map(c => `<a class="btn alt" href="tel:${esc(tel(c.phone))}">Llamar a ${esc(c.name || c.relation)}${c.relation && c.name ? ` (${esc(c.relation)})` : ''}</a>`).join('')}
${h.instructions ? `<h3>Qué hacer</h3><div class="do">${esc(h.instructions).replace(/\n/g, '<br>')}</div>` : ''}
<h3>Alergias</h3><div class="box">${allergies}</div>
${h.conditions.length ? `<h3>Condiciones médicas</h3><div class="box">${rows(h.conditions, c => `<div class="row"><b>${esc(c.name)}</b>${c.notes ? `<span>${esc(c.notes)}</span>` : ''}</div>`)}</div>` : ''}
${h.medications.length ? `<h3>Medicamentos</h3><div class="box">${rows(h.medications, m => `<div class="row"><b>${esc(m.name)}</b>${m.dose ? `<span>${esc(m.dose)}</span>` : ''}</div>`)}</div>` : ''}
${h.doctor || h.insurance ? `<h3>Atención médica</h3><div class="box">${h.doctor ? `<div class="row"><b>${esc(h.doctor)}</b><span>Médico</span></div>` : ''}${h.insurance ? `<div class="row"><b>${esc(h.insurance)}</b><span>Seguro</span></div>` : ''}</div>` : ''}
<p class="note">El colegio y el representante fueron avisados de que se abrió esta ficha. Información autorizada por ${esc(h.consent_by || 'el representante')} solo para emergencias.</p>
</div></body></html>`;
}

function unavailable() {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Ficha no disponible</title><style>body{font-family:-apple-system,"Segoe UI",Roboto,sans-serif;background:#F2F2F7;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center}div{max-width:360px}b{font-size:22px;display:block;margin-bottom:8px}p{color:#666;line-height:1.45}a{display:block;margin-top:18px;background:#FF3B30;color:#fff;border-radius:14px;padding:16px;font-weight:600;text-decoration:none}</style></head><body><div><b>Ficha no disponible</b><p>Esta tarjeta no tiene una ficha médica activa o el enlace fue cambiado. Si es una emergencia, llama al ECU 911.</p><a href="tel:911">Llamar al ECU 911</a></div></body></html>`;
}

function photoFile(studentId) {
  const f = path.join(config.DATA_DIR, 'faces', `${Number(studentId)}.jpg`);
  return fs.existsSync(f) ? f : null;
}

module.exports = { get, save, rotateToken, byToken, logAccess, accessLog, page, unavailable, photoFile, BLOOD };
