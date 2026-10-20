const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const config = require('./config');
const { db } = require('./database');

let onSent = () => {};
let onUpdate = () => {};
function setListener(fn, upd) {
  onSent = fn;
  if (upd) onUpdate = upd;
}

const URGENT = ['ABSENT', 'NOT_IN_CLASS', 'EMERGENCY'];
const PROVIDERS = {
  gmail: { host: 'smtp.gmail.com', port: 587 },
  outlook: { host: 'smtp.office365.com', port: 587 },
  yahoo: { host: 'smtp.mail.yahoo.com', port: 465 }
};
const DEFAULTS = {
  mail_provider: 'gmail',
  mail_host: '',
  mail_port: 587,
  mail_user: '',
  mail_pass: '',
  mail_from_name: '',
  inst_email: '',
  inst_cc: 'URGENT',
  inst_phone: '',
  signature: '',
  wa_mode: 'LINK',
  wa_token: '',
  wa_phone_id: '',
  wa_template: 'navi_aviso',
  wa_lang: 'es',
  wa_urgent: true
};
const SECRET_KEYS = ['mail_pass', 'wa_token'];

function readStored() {
  const row = db.q("SELECT value FROM settings WHERE key = 'messaging'").get();
  if (!row) return {};
  try {
    return JSON.parse(row.value) || {};
  } catch (e) {
    return {};
  }
}

function getConfig() {
  const c = { ...DEFAULTS, ...readStored() };
  c.mail_source = c.mail_user && c.mail_pass ? 'app' : config.smtp.user && config.smtp.pass ? 'env' : null;
  if (c.mail_source === 'env') {
    c.mail_host = config.smtp.host;
    c.mail_port = config.smtp.port;
    c.mail_user = config.smtp.user;
    c.mail_pass = config.smtp.pass;
  } else if (PROVIDERS[c.mail_provider]) {
    c.mail_host = PROVIDERS[c.mail_provider].host;
    c.mail_port = PROVIDERS[c.mail_provider].port;
  }
  c.mail_port = Number(c.mail_port) || 587;
  return c;
}

function publicConfig() {
  const c = getConfig();
  const out = { ...c };
  for (const k of SECRET_KEYS) {
    out[k + '_set'] = Boolean(c[k]);
    delete out[k];
  }
  if (c.mail_source === 'env') out.mail_user = c.mail_user;
  return out;
}

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;
function splitEmails(raw) {
  return String(raw || '').split(/[,;\s]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
}
function validEmails(raw) {
  const list = splitEmails(raw);
  return list.length > 0 && list.every(e => EMAIL_RE.test(e));
}

function saveConfig(input) {
  const cur = { ...DEFAULTS, ...readStored() };
  const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const next = { ...cur };
  if (input.mail_provider !== undefined) next.mail_provider = ['gmail', 'outlook', 'yahoo', 'custom'].includes(input.mail_provider) ? input.mail_provider : 'gmail';
  if (input.mail_host !== undefined) next.mail_host = str(input.mail_host, 120);
  if (input.mail_port !== undefined) next.mail_port = Math.max(1, Math.min(65535, parseInt(input.mail_port, 10) || 587));
  if (input.mail_user !== undefined) next.mail_user = str(input.mail_user, 120).toLowerCase();
  if (input.mail_pass) next.mail_pass = String(input.mail_pass).replace(/\s+/g, '').slice(0, 200);
  if (input.mail_pass === null) next.mail_pass = '';
  if (input.mail_from_name !== undefined) next.mail_from_name = str(input.mail_from_name, 80);
  if (input.inst_email !== undefined) next.inst_email = splitEmails(input.inst_email).join(', ');
  if (input.inst_cc !== undefined) next.inst_cc = ['NONE', 'URGENT', 'ALL'].includes(input.inst_cc) ? input.inst_cc : 'URGENT';
  if (input.inst_phone !== undefined) next.inst_phone = str(input.inst_phone, 30);
  if (input.signature !== undefined) next.signature = str(input.signature, 160);
  if (input.wa_mode !== undefined) next.wa_mode = input.wa_mode === 'API' ? 'API' : 'LINK';
  if (input.wa_token) next.wa_token = str(input.wa_token, 600);
  if (input.wa_token === null) next.wa_token = '';
  if (input.wa_phone_id !== undefined) next.wa_phone_id = str(input.wa_phone_id, 40).replace(/\D/g, '');
  if (input.wa_template !== undefined) next.wa_template = str(input.wa_template, 60).toLowerCase().replace(/[^a-z0-9_]/g, '') || 'navi_aviso';
  if (input.wa_lang !== undefined) next.wa_lang = str(input.wa_lang, 10) || 'es';
  if (typeof input.wa_urgent === 'boolean') next.wa_urgent = input.wa_urgent;
  const errors = [];
  if (next.mail_user && !EMAIL_RE.test(next.mail_user)) errors.push(['mail_user', 'El correo que envía no es válido']);
  if (next.inst_email && !validEmails(next.inst_email)) errors.push(['inst_email', 'El correo institucional no es válido']);
  if (next.mail_provider === 'custom' && next.mail_user && !next.mail_host) errors.push(['mail_host', 'Falta el servidor SMTP']);
  if (errors.length) {
    const e = new Error(errors[0][1]);
    e.fields = errors.map(x => x[0]);
    throw e;
  }
  db.q("INSERT INTO settings (key, value) VALUES ('messaging', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(next));
  transporterKey = '';
  return publicConfig();
}

let transporter = null;
let transporterKey = '';
function getTransporter(c) {
  if (!c.mail_source) return null;
  const key = [c.mail_host, c.mail_port, c.mail_user, c.mail_pass].join('|');
  if (key !== transporterKey) {
    transporter = nodemailer.createTransport({
      host: c.mail_host,
      port: c.mail_port,
      secure: c.mail_port === 465,
      auth: { user: c.mail_user, pass: c.mail_pass },
      connectionTimeout: 12000,
      greetingTimeout: 10000,
      socketTimeout: 20000
    });
    transporterKey = key;
  }
  return transporter;
}

function friendlyError(e) {
  const msg = String((e && e.message) || e || '');
  const code = (e && (e.code || e.responseCode)) || '';
  if (code === 'EAUTH' || /535|Invalid login|Username and Password not accepted|authentication/i.test(msg)) return 'El correo o la contraseña no coinciden. En Gmail usa una contraseña de aplicación de 16 letras, no tu contraseña normal.';
  if (code === 'ENOTFOUND' || code === 'EDNS') return 'No se encontró el servidor de correo. Revisa el internet de la PC o el nombre del servidor.';
  if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ESOCKET' || /timeout/i.test(msg)) return 'No se pudo conectar al servidor de correo. Revisa el internet o el puerto (587 o 465).';
  if (/550|5\.1\.1|recipient|no such user/i.test(msg)) return 'El correo del destinatario no existe o lo rechazó su servidor.';
  if (/554|spam/i.test(msg)) return 'El servidor marcó el mensaje como no deseado. Prueba más tarde.';
  if (/Unsupported|template|132001|132000/i.test(msg)) return 'La plantilla de WhatsApp no existe o no está aprobada en Meta.';
  if (/190|access token|OAuth/i.test(msg)) return 'El token de WhatsApp venció o no es válido.';
  if (/131030|not in allowed list|recipient phone number not in allowed/i.test(msg)) return 'Ese número no está en la lista de prueba de tu cuenta de WhatsApp Business.';
  return msg.slice(0, 200) || 'Error desconocido';
}

function transient(e) {
  const code = (e && e.code) || '';
  return ['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'ECONNRESET', 'EAI_AGAIN'].includes(code) || /^4\d\d/.test(String((e && e.responseCode) || ''));
}

const KIND_INFO = {
  ARRIVAL: { title: 'Ingreso registrado', short: 'Ingreso', emoji: '✅', color: '#1E9E52' },
  LATE: { title: 'Llegada con atraso', short: 'Atraso', emoji: '⏰', color: '#C77700' },
  LATE_AFTER_ABSENT: { title: 'Llegó después del límite', short: 'Atraso', emoji: '⏰', color: '#C77700' },
  ABSENT: { title: 'No ha llegado a clases', short: 'Ausencia', emoji: '❗', color: '#D70015' },
  NOT_IN_CLASS: { title: 'No se encuentra en el aula', short: 'No está en el aula', emoji: '❗', color: '#D70015' },
  EMERGENCY: { title: 'Se abrió su ficha médica', short: 'Emergencia', emoji: '🚑', color: '#FF3B30' },
  CUSTOM: { title: 'Mensaje de la institución', short: 'Mensaje', emoji: '✉️', color: '#0A84FF' },
  TEST: { title: 'Correo de prueba', short: 'Prueba', emoji: '✅', color: '#0A84FF' }
};

function hhmm(t) {
  return String(t || '').slice(0, 5);
}
function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function longDate() {
  try {
    const s = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
}

function compose(kind, s, course, att, custom) {
  const k = KIND_INFO[kind] || KIND_INFO.CUSTOM;
  const c = getConfig();
  const name = `${s.first_name} ${s.last_name}`;
  const time = att && att.time_recorded ? hhmm(att.time_recorded) : nowHHMM();
  let lead = '';
  let action = '';
  if (kind === 'ARRIVAL') lead = `${name} ingresó a clases a las ${time}.`;
  if (kind === 'LATE') lead = `${name} ingresó con atraso a las ${time}. La hora de entrada es ${course.schedule_start}.`;
  if (kind === 'LATE_AFTER_ABSENT') lead = `${name} llegó a las ${time}, después del límite de asistencia. Queda registrado como atraso.`;
  if (kind === 'ABSENT') {
    lead = `${name} no ha registrado su ingreso a clases hoy.`;
    action = 'Si su representado está con usted o hay un error, comuníquese con la institución.';
  }
  if (kind === 'NOT_IN_CLASS') {
    lead = `La tarjeta de ${name} se registró hoy, pero el docente confirmó que no está en el aula.`;
    action = 'Comuníquese con la institución lo antes posible.';
  }
  if (kind === 'EMERGENCY') {
    lead = `Alguien abrió la ficha médica de emergencia de ${name} a las ${nowHHMM()}, posiblemente porque necesita ayuda.`;
    action = 'Comuníquese de inmediato con la institución.';
  }
  if (kind === 'CUSTOM' || kind === 'TEST') lead = String((custom && custom.text) || '').trim();
  const title = kind === 'CUSTOM' && custom && custom.subject ? custom.subject : k.title;
  const details = [];
  if (kind !== 'CUSTOM' && kind !== 'TEST') {
    details.push(['Estudiante', name]);
    details.push(['Curso', course.name]);
    if (course.classroom) details.push(['Aula', course.classroom]);
    details.push(['Fecha', longDate()]);
    if (att && ['ARRIVAL', 'LATE', 'LATE_AFTER_ABSENT'].includes(kind)) details.push(['Hora de llegada', time]);
    if (['LATE', 'ABSENT'].includes(kind)) details.push(['Hora de entrada', course.schedule_start]);
  }
  const greet = `Estimado/a ${s.parent_name || 'representante'}:`;
  const inst = config.institutionName;
  const sign = c.signature || inst;
  const plain = [`${k.emoji} ${title}`, '', greet, lead];
  if (action) plain.push('', action);
  if (details.length) plain.push('', ...details.filter(d => d[0] !== 'Estudiante').map(d => `${d[0]}: ${d[1]}`));
  if (c.inst_phone && action) plain.push(`Teléfono: ${c.inst_phone}`);
  plain.push('', sign);
  const wa = [`*${k.emoji} ${title}*`, '', greet, lead];
  if (action) wa.push('', `_${action}_`);
  if (details.length) wa.push('', ...details.filter(d => d[0] !== 'Estudiante' && d[0] !== 'Aula').map(d => `${d[0] === 'Curso' ? '📚' : d[0] === 'Fecha' ? '📅' : '🕒'} ${d[1]}`));
  if (c.inst_phone && action) wa.push(`📞 ${c.inst_phone}`);
  wa.push('', `— ${sign}`);
  return {
    kind,
    title,
    subject: kind === 'CUSTOM' || kind === 'TEST' ? `${title} · ${inst}` : `${k.emoji} ${k.short}: ${name} · ${inst}`,
    color: k.color,
    emoji: k.emoji,
    greet,
    lead,
    action,
    details,
    text: plain.join('\n'),
    wa: wa.join('\n'),
    sign
  };
}

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function initials(s) {
  return ((s.first_name || '?')[0] + (s.last_name || '')[0]).toUpperCase();
}

function buildHtml(m, s, hasPhoto) {
  const c = getConfig();
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const avatar = hasPhoto
    ? `<img src="cid:foto" width="56" height="56" alt="" style="display:block;width:56px;height:56px;border-radius:28px;object-fit:cover">`
    : `<div style="width:56px;height:56px;border-radius:28px;background:${m.color};color:#fff;font:600 20px/56px ${font};text-align:center">${esc(initials(s))}</div>`;
  const rows = m.details
    .filter(d => d[0] !== 'Estudiante')
    .map((d, i) => `<tr><td style="padding:11px 0;${i ? 'border-top:1px solid #EFEFF4;' : ''}color:#8A8A8E;font:400 14px ${font}">${esc(d[0])}</td><td align="right" style="padding:11px 0;${i ? 'border-top:1px solid #EFEFF4;' : ''}color:#1C1C1E;font:500 14px ${font}">${esc(d[1])}</td></tr>`)
    .join('');
  const student = m.details.length
    ? `<tr><td style="padding:0 28px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F6F9;border-radius:16px"><tr><td style="padding:16px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td valign="middle">${avatar}</td><td valign="middle" style="padding-left:14px"><div style="font:600 17px ${font};color:#1C1C1E">${esc(s.first_name)} ${esc(s.last_name)}</div><div style="font:400 13px ${font};color:#8A8A8E;margin-top:2px">${esc(s.student_code || '')}</div></td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px">${rows}</table></td></tr></table></td></tr>`
    : '';
  const action = m.action
    ? `<tr><td style="padding:14px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${m.color}12;border-radius:14px;border:1px solid ${m.color}33"><tr><td style="padding:14px 16px;font:500 14px/1.5 ${font};color:${m.color}">${esc(m.action)}${c.inst_phone ? `<br><a href="tel:${esc(c.inst_phone.replace(/[^\d+]/g, ''))}" style="color:${m.color};font-weight:700;text-decoration:none">📞 ${esc(c.inst_phone)}</a>` : ''}</td></tr></table></td></tr>`
    : '';
  const lead = esc(m.lead).replace(/\n/g, '<br>');
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(m.subject)}</title></head>
<body style="margin:0;padding:0;background:#F2F2F7">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(m.lead.slice(0, 120))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F2F7"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 6px 14px;font:600 13px ${font};color:#8A8A8E;letter-spacing:.3px">${esc(config.institutionName).toUpperCase()}</td></tr>
<tr><td style="background:#FFFFFF;border-radius:22px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="height:6px;background:${m.color};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:26px 28px 6px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="width:40px;height:40px;border-radius:12px;background:${m.color}1A;text-align:center;font-size:20px;line-height:40px">${m.emoji}</td><td style="padding-left:12px;font:700 21px ${font};color:#1C1C1E;letter-spacing:-.2px">${esc(m.title)}</td></tr></table></td></tr>
<tr><td style="padding:16px 28px 4px;font:400 15px/1.55 ${font};color:#3A3A3C">${esc(m.greet)}</td></tr>
<tr><td style="padding:2px 28px 18px;font:400 16px/1.55 ${font};color:#1C1C1E">${lead}</td></tr>
${student}
${action}
<tr><td style="padding:22px 28px 26px;font:400 14px/1.5 ${font};color:#3A3A3C">Atentamente,<br><b>${esc(m.sign)}</b></td></tr>
</table></td></tr>
<tr><td style="padding:16px 10px;text-align:center;font:400 12px/1.5 ${font};color:#A1A1A6">Aviso enviado por N.A.V.I · Asistencia con NFC${c.inst_email ? `<br>Para responder escriba a <a href="mailto:${esc(splitEmails(c.inst_email)[0])}" style="color:#8A8A8E">${esc(splitEmails(c.inst_email)[0])}</a>` : ''}</td></tr>
</table></td></tr></table></body></html>`;
}

function normalizePhone(raw) {
  const str = String(raw || '').trim();
  let d = str.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  else if (!str.startsWith('+')) {
    if (d.length === 10 && d.startsWith('0')) d = '593' + d.slice(1);
    else if (d.length === 9 && d.startsWith('9')) d = '593' + d;
  }
  if (d.startsWith('5930')) d = '593' + d.slice(4);
  if (d.length < 10 || d.length > 15) return null;
  return d;
}

function whatsappLink(phone, text) {
  const d = normalizePhone(phone);
  if (!d) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

function telegramLinkCode(student) {
  const sig = crypto.createHmac('sha256', config.tokenSecret).update('tg:' + student.student_code).digest('hex').slice(0, 8);
  return `${student.student_code}_${sig}`;
}

const telegramReady = Boolean(config.telegram.token);
let telegramBotName = '';
function telegramLink(student) {
  if (!telegramReady || !telegramBotName) return null;
  return `https://t.me/${telegramBotName}?start=${telegramLinkCode(student)}`;
}

function insertLog(att, s, m, channel, recipient, message, status, error) {
  const kind = m.kind;
  const customText = kind === 'CUSTOM' ? m.lead : null;
  const info = db
    .q('INSERT INTO notifications (attendance_id, student_id, kind, channel, recipient, message, status, error, subject, custom_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(att ? att.id : null, s.id, kind, channel, recipient || null, message, status, error || null, m.subject, customText);
  const row = { id: Number(info.lastInsertRowid), student_id: s.id, student_name: `${s.first_name} ${s.last_name}`, kind, channel, recipient: recipient || null, message, subject: m.subject, status, error: error || null, created_at: new Date().toISOString().replace('T', ' ').slice(0, 19) };
  onSent(row);
  return row;
}

function facePath(s) {
  const p = path.join(config.DATA_DIR, 'faces', `${s.id}.jpg`);
  try {
    return s.face_photo && fs.existsSync(p) ? p : null;
  } catch (e) {
    return null;
  }
}

async function deliverEmail(to, m, s, opts = {}) {
  const c = getConfig();
  const tr = getTransporter(c);
  if (!tr) throw Object.assign(new Error('Correo no configurado'), { code: 'NOCONF' });
  const photo = s && s.id ? facePath(s) : null;
  const fromName = c.mail_from_name || config.institutionName;
  const msg = {
    from: { name: fromName, address: c.mail_user },
    to,
    subject: m.subject,
    text: m.text,
    html: buildHtml(m, s || {}, Boolean(photo)),
    headers: { 'X-Mailer': 'NAVI' }
  };
  if (opts.cc && opts.cc.length) msg.cc = opts.cc;
  const reply = splitEmails(c.inst_email)[0];
  if (reply) msg.replyTo = reply;
  if (photo) msg.attachments = [{ filename: 'foto.jpg', path: photo, cid: 'foto' }];
  let last;
  for (const wait of opts.retry === false ? [0] : [0, 4000, 15000]) {
    if (wait) await new Promise(r => setTimeout(r, wait));
    try {
      return await tr.sendMail(msg);
    } catch (e) {
      last = e;
      if (!transient(e)) break;
    }
  }
  throw last;
}

async function deliverWhatsappApi(phone, m, s) {
  const c = getConfig();
  const to = normalizePhone(phone);
  if (!to) throw new Error('Número de WhatsApp no válido');
  const template = { name: c.wa_template || 'navi_aviso', language: { code: c.wa_lang || 'es' } };
  if (template.name !== 'hello_world') {
    const clean = v => String(v || '').replace(/[\n\t]+/g, ' ').replace(/\s{4,}/g, '   ').slice(0, 900);
    template.components = [{ type: 'body', parameters: [{ type: 'text', text: clean((s && s.parent_name) || 'representante') }, { type: 'text', text: clean([m.lead, m.action].filter(Boolean).join(' ')) }] }];
  }
  const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(c.wa_phone_id)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.wa_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error((data.error && `${data.error.code || ''} ${data.error.message || ''}`.trim()) || `HTTP ${res.status}`);
  return to;
}

async function sendTelegram(chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${config.telegram.token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || 'Telegram rechazó el mensaje');
}

function waApiReady(c) {
  return c.wa_mode === 'API' && Boolean(c.wa_token && c.wa_phone_id);
}

function ccFor(kind, c) {
  if (!c.inst_email) return [];
  if (c.inst_cc === 'ALL' || (c.inst_cc === 'URGENT' && URGENT.includes(kind))) return splitEmails(c.inst_email);
  return [];
}

async function dispatch(kind, s, course, att, custom, channels) {
  const c = getConfig();
  const m = compose(kind, s, course, att, custom);
  const want = channels || { email: true, telegram: true, whatsapp: 'auto' };
  const results = [];
  let delivered = false;

  if (want.email && s.parent_email) {
    const to = splitEmails(s.parent_email);
    const cc = ccFor(kind, c).filter(e => !to.includes(e));
    const recip = [...to, ...cc.map(e => `cc:${e}`)].join(', ');
    if (c.mail_source) {
      try {
        await deliverEmail(to, m, s, { cc });
        results.push(insertLog(att, s, m, 'EMAIL', recip, m.text, 'ENVIADO'));
        delivered = true;
      } catch (e) {
        results.push(insertLog(att, s, m, 'EMAIL', recip, m.text, 'FALLIDO', friendlyError(e)));
      }
    } else {
      results.push(insertLog(att, s, m, 'EMAIL', recip, m.text, 'SIMULADO', 'Configura el correo en Ajustes → Correo'));
    }
  }

  if (want.telegram && s.parent_telegram && telegramReady) {
    try {
      await sendTelegram(s.parent_telegram, m.text);
      results.push(insertLog(att, s, m, 'TELEGRAM', s.parent_telegram, m.text, 'ENVIADO'));
      delivered = true;
    } catch (e) {
      results.push(insertLog(att, s, m, 'TELEGRAM', s.parent_telegram, m.text, 'FALLIDO', friendlyError(e)));
    }
  }

  const waWanted = want.whatsapp === true || (want.whatsapp === 'auto' && (!delivered || (c.wa_urgent && URGENT.includes(kind))));
  if (waWanted && s.parent_phone) {
    const link = whatsappLink(s.parent_phone, m.wa);
    let sentApi = false;
    if (waApiReady(c) && want.whatsapp !== 'link') {
      try {
        const to = await deliverWhatsappApi(s.parent_phone, m, s);
        results.push(insertLog(att, s, m, 'WHATSAPP', `+${to}`, m.wa, 'ENVIADO'));
        sentApi = true;
      } catch (e) {
        if (!link) results.push(insertLog(att, s, m, 'WHATSAPP', s.parent_phone, m.wa, 'FALLIDO', friendlyError(e)));
        else results.push(insertLog(att, s, m, 'WHATSAPP', link, m.wa, 'ENLACE', `Automático falló: ${friendlyError(e)}`));
        sentApi = true;
      }
    }
    if (!sentApi) {
      if (link) results.push(insertLog(att, s, m, 'WHATSAPP', link, m.wa, 'ENLACE', null));
      else results.push(insertLog(att, s, m, 'WHATSAPP', s.parent_phone, m.wa, 'FALLIDO', 'El número no parece válido. Usa 09XXXXXXXX o +593…'));
    }
  }
  return { message: m, results };
}

function loadStudent(studentId) {
  const s = db.q('SELECT * FROM students WHERE id = ?').get(studentId);
  if (!s) return null;
  const course = db.q('SELECT * FROM courses WHERE id = ?').get(s.course_id);
  return { s, course };
}

async function notify(kind, studentId, attendanceId) {
  try {
    const r = loadStudent(studentId);
    if (!r) return;
    const att = attendanceId ? db.q('SELECT * FROM attendances WHERE id = ?').get(attendanceId) : null;
    await dispatch(kind, r.s, r.course, att, null, null);
  } catch (e) {
    console.error('Notificador:', e.message);
  }
}

async function sendCustom(studentId, input) {
  const r = loadStudent(studentId);
  if (!r) throw Object.assign(new Error('Estudiante no encontrado'), { status: 404 });
  const text = String((input && input.text) || '').trim().slice(0, 2000);
  if (!text) throw Object.assign(new Error('Escribe el mensaje'), { status: 400, fields: ['text'] });
  const subject = String((input && input.subject) || '').trim().slice(0, 120) || 'Mensaje de la institución';
  const ch = (input && input.channels) || {};
  const channels = { email: ch.email !== false, telegram: ch.telegram !== false, whatsapp: ch.whatsapp === false ? false : true };
  const out = await dispatch('CUSTOM', r.s, r.course, null, { subject, text }, channels);
  return out.results;
}

function preview(kind, studentId, input) {
  const r = loadStudent(studentId);
  if (!r) return null;
  const m = compose(kind, r.s, r.course, null, input);
  return { subject: m.subject, text: m.text, wa: m.wa, html: buildHtml(m, r.s, false) };
}

function sampleStudent() {
  return { id: 0, first_name: 'Mateo', last_name: 'Andrade', student_code: 'NAVI-001', parent_name: 'Carlos Andrade' };
}
function sampleCourse() {
  return { name: '3ro Bachillerato Técnico A · Mecatrónica', classroom: 'Laboratorio de Mecatrónica', schedule_start: '07:00' };
}

async function verifyMail() {
  const c = getConfig();
  const tr = getTransporter(c);
  if (!tr) return { ok: false, error: 'Falta el correo y la contraseña de aplicación' };
  try {
    await tr.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

async function testEmail(to, kind) {
  const list = splitEmails(to);
  if (!list.length || !list.every(e => EMAIL_RE.test(e))) return { ok: false, error: 'Escribe un correo válido para la prueba', fields: ['to'] };
  const k = KIND_INFO[kind] && kind !== 'CUSTOM' ? kind : 'LATE';
  const m = compose(k, sampleStudent(), sampleCourse(), { time_recorded: '07:14:00' }, { text: 'Si estás leyendo esto, N.A.V.I ya puede enviar correos a los representantes.' });
  m.subject = `[Prueba] ${m.subject}`;
  try {
    await deliverEmail(list, m, sampleStudent(), { retry: false });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

async function testWhatsapp(phone) {
  const c = getConfig();
  const m = compose('LATE', sampleStudent(), sampleCourse(), { time_recorded: '07:14:00' });
  const link = whatsappLink(phone, `*[Prueba]* ${m.wa}`);
  if (!normalizePhone(phone)) return { ok: false, error: 'El número no parece válido. Usa 09XXXXXXXX o +593…', fields: ['to'] };
  if (!waApiReady(c)) return { ok: true, link };
  try {
    const to = await deliverWhatsappApi(phone, m, sampleStudent());
    return { ok: true, to };
  } catch (e) {
    return { ok: false, error: friendlyError(e), link };
  }
}

function markManual(id, userId) {
  const n = db.q('SELECT * FROM notifications WHERE id = ?').get(id);
  if (!n) return null;
  if (n.channel === 'WHATSAPP' && n.status === 'ENLACE') {
    db.q("UPDATE notifications SET status = 'MANUAL', error = NULL WHERE id = ?").run(id);
    n.status = 'MANUAL';
    n.error = null;
    onUpdate({ id: n.id, status: 'MANUAL', error: null });
  }
  return n;
}

async function resend(id) {
  const n = db.q('SELECT * FROM notifications WHERE id = ?').get(id);
  if (!n) throw Object.assign(new Error('Aviso no encontrado'), { status: 404 });
  if (n.channel !== 'EMAIL') throw Object.assign(new Error('Solo se pueden reintentar correos'), { status: 400 });
  const r = loadStudent(n.student_id);
  if (!r) throw Object.assign(new Error('Estudiante no encontrado'), { status: 404 });
  const att = n.attendance_id ? db.q('SELECT * FROM attendances WHERE id = ?').get(n.attendance_id) : null;
  const custom = n.kind === 'CUSTOM' ? { subject: String(n.subject || '').split(' · ')[0] || 'Mensaje de la institución', text: n.custom_text || '' } : null;
  const out = await dispatch(n.kind, r.s, r.course, att, custom, { email: true, telegram: false, whatsapp: false });
  return out.results[0] || null;
}

function pending(days = 2) {
  return db
    .q(`SELECT n.*, s.first_name || ' ' || s.last_name AS student_name FROM notifications n LEFT JOIN students s ON s.id = n.student_id
        WHERE n.channel = 'WHATSAPP' AND n.status = 'ENLACE' AND n.created_at >= datetime('now', ?) ORDER BY n.id DESC LIMIT 100`)
    .all(`-${Number(days) || 2} days`);
}

async function startTelegram() {
  if (!telegramReady) return;
  try {
    const me = await (await fetch(`https://api.telegram.org/bot${config.telegram.token}/getMe`)).json();
    if (me.ok) telegramBotName = me.result.username;
  } catch (e) {
    console.warn('Telegram no disponible:', e.message);
    return;
  }
  let offset = 0;
  const poll = async () => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${config.telegram.token}/getUpdates?timeout=25&offset=${offset}`);
      const data = await res.json();
      if (data.ok) {
        for (const u of data.result) {
          offset = u.update_id + 1;
          const msg = u.message;
          if (!msg || !msg.text) continue;
          const m = msg.text.match(/^\/start\s+(\S+)/);
          if (!m) continue;
          const code = m[1];
          const studentCode = code.split('_')[0];
          const s = db.q('SELECT * FROM students WHERE student_code = ?').get(studentCode);
          if (s && telegramLinkCode(s) === code) {
            db.q('UPDATE students SET parent_telegram = ? WHERE id = ?').run(String(msg.chat.id), s.id);
            await sendTelegram(msg.chat.id, `Listo. Recibirá aquí los avisos de asistencia de ${s.first_name} ${s.last_name}.`);
          } else {
            await sendTelegram(msg.chat.id, 'Este enlace no es válido. Pídale uno nuevo al docente.');
          }
        }
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 5000));
    }
    setImmediate(poll);
  };
  poll();
}

function status() {
  const c = getConfig();
  return {
    email: Boolean(c.mail_source),
    email_from: c.mail_source ? c.mail_user : null,
    email_source: c.mail_source,
    inst_email: c.inst_email || null,
    inst_cc: c.inst_cc,
    whatsapp: waApiReady(c) ? 'API' : 'LINK',
    wa_urgent: c.wa_urgent,
    telegram: telegramReady && Boolean(telegramBotName),
    telegramBot: telegramBotName || null
  };
}

module.exports = {
  notify,
  sendCustom,
  preview,
  setListener,
  startTelegram,
  telegramLink,
  status,
  whatsappLink,
  normalizePhone,
  validEmails,
  splitEmails,
  publicConfig,
  saveConfig,
  verifyMail,
  testEmail,
  testWhatsapp,
  markManual,
  resend,
  pending,
  compose,
  buildHtml
};
