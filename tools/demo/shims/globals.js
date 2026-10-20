import { Buffer as B } from 'buffer';
const origTo = B.prototype.toString;
B.prototype.toString = function (enc, ...rest) {
  if (enc === 'base64url') return origTo.call(this, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return origTo.call(this, enc, ...rest);
};
const origFrom = B.from;
B.from = function (v, enc, ...rest) {
  if (enc === 'base64url' && typeof v === 'string') return origFrom.call(this, v.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return origFrom.call(this, v, enc, ...rest);
};
export const Buffer = B;
export const process = { env: { NAVI_DEMO: '1', NAVI_INSTITUCION: 'Unidad Educativa N.A.V.I' }, platform: 'browser', argv: [], cwd: () => '/', nextTick: (f, ...a) => queueMicrotask(() => f(...a)), on() {}, exit() {} };
export const setImmediate = (f, ...a) => globalThis.setTimeout(f, 0, ...a);
export const setInterval = (f, t, ...a) => {
  const id = globalThis.setInterval(f, t, ...a);
  return { id, unref() { return this; }, ref() { return this; }, [Symbol.toPrimitive]() { return id; } };
};
export const clearInterval = h => globalThis.clearInterval(h && h.id != null ? h.id : h);
