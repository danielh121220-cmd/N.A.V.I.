const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(ROOT, '.env'));

const secretsFile = path.join(DATA_DIR, 'secrets.json');
let secrets = {};
try {
  secrets = JSON.parse(fs.readFileSync(secretsFile, 'utf8'));
} catch (e) {
  secrets = {};
}
let changed = false;
if (!secrets.tokenSecret) {
  secrets.tokenSecret = crypto.randomBytes(32).toString('hex');
  changed = true;
}
if (!secrets.terminalKey) {
  secrets.terminalKey = 'navi-' + crypto.randomBytes(9).toString('base64url');
  changed = true;
}
if (changed) fs.writeFileSync(secretsFile, JSON.stringify(secrets, null, 2));

const bool = (v, def) => (v === undefined || v === '' ? def : /^(1|true|si|sí|yes|on)$/i.test(v));

module.exports = {
  ROOT,
  DATA_DIR,
  port: parseInt(process.env.PORT || '3000', 10),
  dbFile: path.join(DATA_DIR, 'navi.sqlite'),
  tokenSecret: process.env.NAVI_TOKEN_SECRET || secrets.tokenSecret,
  terminalKey: process.env.NAVI_TERMINAL_KEY || secrets.terminalKey,
  demoMode: bool(process.env.NAVI_DEMO, true),
  photoRetentionDays: parseInt(process.env.NAVI_PHOTO_DAYS || '7', 10),
  cameraObstructedBytes: parseInt(process.env.NAVI_CAM_MIN_BYTES || '7000', 10),
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || ''
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || ''
  },
  institutionName: process.env.NAVI_INSTITUCION || 'Unidad Educativa N.A.V.I',
  publicUrl: (process.env.NAVI_PUBLIC_URL || '').replace(/\/+$/, '')
};
