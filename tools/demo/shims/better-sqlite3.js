const KEY = 'navi_demo_db_v1';
function toB64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b) {
  const s = atob(b);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
function clean(v) {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'bigint') return Number(v);
  if (v instanceof Uint8Array) return new Uint8Array(v);
  return v;
}
class Statement {
  constructor(db, sql) { this.db = db; this.sql = sql; }
  params(args) {
    if (args.length === 1 && Array.isArray(args[0])) return args[0].map(clean);
    if (args.length === 1 && args[0] && typeof args[0] === 'object' && !(args[0] instanceof Uint8Array)) {
      const o = {};
      for (const [k, v] of Object.entries(args[0])) { o['@' + k] = clean(v); o[':' + k] = clean(v); o['$' + k] = clean(v); }
      return o;
    }
    return args.map(clean);
  }
  run(...args) {
    const s = this.db.raw.prepare(this.sql);
    try { s.run(this.params(args)); } finally { s.free(); }
    const changes = this.db.raw.getRowsModified();
    const r = this.db.raw.exec('SELECT last_insert_rowid()');
    this.db.touch();
    return { changes, lastInsertRowid: r.length ? r[0].values[0][0] : 0 };
  }
  get(...args) {
    const s = this.db.raw.prepare(this.sql);
    try {
      s.bind(this.params(args));
      return s.step() ? s.getAsObject() : undefined;
    } finally { s.free(); }
  }
  all(...args) {
    const s = this.db.raw.prepare(this.sql);
    const out = [];
    try {
      s.bind(this.params(args));
      while (s.step()) out.push(s.getAsObject());
    } finally { s.free(); }
    return out;
  }
  iterate(...args) { return this.all(...args)[Symbol.iterator](); }
}
class Database {
  constructor() {
    const SQL = globalThis.__SQL;
    let data = null;
    try { const b = localStorage.getItem(KEY); if (b) data = fromB64(b); } catch (e) {}
    try { this.raw = data ? new SQL.Database(data) : new SQL.Database(); } catch (e) { this.raw = new SQL.Database(); }
    this.raw.exec('PRAGMA foreign_keys = ON');
    this.depth = 0;
    this.timer = 0;
  }
  pragma(s) { if (/journal_mode|synchronous/i.test(s)) return []; this.raw.exec('PRAGMA ' + s); return []; }
  exec(sql) { this.raw.exec(sql); this.touch(); return this; }
  prepare(sql) { return new Statement(this, sql); }
  transaction(fn) {
    return (...a) => {
      if (this.depth > 0) return fn(...a);
      this.raw.exec('BEGIN');
      this.depth++;
      try {
        const r = fn(...a);
        this.depth--;
        this.raw.exec('COMMIT');
        this.touch();
        return r;
      } catch (e) {
        this.depth--;
        try { this.raw.exec('ROLLBACK'); } catch (x) {}
        throw e;
      }
    };
  }
  touch() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.save(), 700);
  }
  save() {
    if (this.depth > 0) return this.touch();
    try {
      const bytes = this.raw.export();
      this.raw.exec('PRAGMA foreign_keys = ON');
      localStorage.setItem(KEY, toB64(bytes));
    } catch (e) {}
  }
  close() {}
}
Database.KEY = KEY;
module.exports = Database;
