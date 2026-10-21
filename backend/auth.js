const crypto = require('crypto');
const config = require('./config');
const { db } = require('./database');

const TOKEN_DAYS = 30;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, saltB64, hashB64] = stored.split('$');
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

function sign(data) {
  return crypto.createHmac('sha256', config.tokenSecret).update(data).digest('base64url');
}

function createToken(userId) {
  const exp = Date.now() + TOKEN_DAYS * 86400000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payload = `${parts[0]}.${parts[1]}`;
  const good = Buffer.from(sign(payload));
  const given = Buffer.from(parts[2]);
  if (good.length !== given.length || !crypto.timingSafeEqual(good, given)) return null;
  if (Number(parts[1]) < Date.now()) return null;
  return Number(parts[0]);
}

const publicUserSql = 'SELECT id, name, email, role, institution_name, avatar, tour_at, created_at FROM users WHERE id = ?';

function userFromRequest(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const id = readToken(token);
  if (!id) return null;
  return db.q(publicUserSql).get(id) || null;
}

function isTerminal(req) {
  const key = req.headers['x-terminal-key'];
  if (!key || typeof key !== 'string') return false;
  const a = Buffer.from(key);
  const b = Buffer.from(config.terminalKey);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireUser(req, res, next) {
  const user = userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  requireUser(req, res, () => {
    if (req.user.role !== 'ADMINISTRADOR') return res.status(403).json({ error: 'Solo un administrador puede hacer esto.' });
    next();
  });
}

function requireTerminalOrUser(req, res, next) {
  if (isTerminal(req)) {
    req.viaTerminal = true;
    return next();
  }
  const user = userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Terminal o usuario no autorizado' });
  req.user = user;
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  createToken,
  readToken,
  publicUserSql,
  requireUser,
  requireAdmin,
  requireTerminalOrUser,
  isTerminal
};
