const { Buffer } = require('buffer');
const { hmac } = require('@noble/hashes/hmac');
const { sha256 } = require('@noble/hashes/sha256');
const { scrypt } = require('@noble/hashes/scrypt');
const te = s => new TextEncoder().encode(s);
const bytes = v => (typeof v === 'string' ? te(v) : new Uint8Array(v));
exports.randomBytes = n => {
  const a = new Uint8Array(n);
  globalThis.crypto.getRandomValues(a);
  return Buffer.from(a);
};
exports.createHmac = (alg, key) => {
  const chunks = [];
  const o = {
    update(d) { chunks.push(bytes(d)); return o; },
    digest(enc) {
      const len = chunks.reduce((n, c) => n + c.length, 0);
      const data = new Uint8Array(len);
      let off = 0;
      for (const c of chunks) { data.set(c, off); off += c.length; }
      const out = Buffer.from(hmac(sha256, bytes(key), data));
      return enc ? out.toString(enc) : out;
    }
  };
  return o;
};
exports.scryptSync = (pw, salt, len) => Buffer.from(scrypt(bytes(pw), bytes(salt), { N: 2048, r: 8, p: 1, dkLen: len }));
exports.timingSafeEqual = (a, b) => {
  if (a.length !== b.length) throw new RangeError('Input buffers must have the same byte length');
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
};
exports.randomUUID = () => globalThis.crypto.randomUUID();
