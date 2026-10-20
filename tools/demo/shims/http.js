module.exports = {
  createServer(app) {
    const h = {};
    return { app, on(e, f) { h[e] = f; return this; }, emit(e, ...a) { if (h[e]) h[e](...a); }, listen(p, cb) { if (cb) cb(); return this; }, _h: h };
  }
};
