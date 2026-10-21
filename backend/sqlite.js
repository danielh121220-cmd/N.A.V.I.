const emit = process.emitWarning;
process.emitWarning = function (warning, ...rest) {
  const text = String((warning && warning.message) || warning);
  if (/SQLite is an experimental feature/.test(text)) return;
  return emit.call(this, warning, ...rest);
};

let native = null;
try { native = require('node:sqlite'); } catch (e) { native = null; }

const fix = v => (v === undefined ? null : v === true ? 1 : v === false ? 0 : v);
const fixArgs = args => args.map(a => (a && typeof a === 'object' && !Buffer.isBuffer(a) && !ArrayBuffer.isView(a) ? Object.fromEntries(Object.entries(a).map(([k, v]) => [k, fix(v)])) : fix(a)));
const plain = row => (row ? Object.assign({}, row) : row);

class Statement {
  constructor(st) { this.st = st; }
  run(...args) { return this.st.run(...fixArgs(args)); }
  get(...args) { return plain(this.st.get(...fixArgs(args))); }
  all(...args) { return this.st.all(...fixArgs(args)).map(plain); }
}

class Database {
  constructor(file) {
    this.db = new native.DatabaseSync(file);
    this.depth = 0;
  }
  prepare(sql) { return new Statement(this.db.prepare(sql)); }
  exec(sql) { this.db.exec(sql); return this; }
  pragma(text) { return this.db.prepare('PRAGMA ' + text).all().map(plain); }
  close() { this.db.close(); }
  transaction(fn) {
    const self = this;
    return function (...args) {
      const nested = self.depth > 0;
      const name = 'navi_sp' + self.depth;
      self.db.exec(nested ? `SAVEPOINT ${name}` : 'BEGIN');
      self.depth++;
      try {
        const out = fn.apply(this, args);
        self.depth--;
        self.db.exec(nested ? `RELEASE ${name}` : 'COMMIT');
        return out;
      } catch (e) {
        self.depth--;
        try { self.db.exec(nested ? `ROLLBACK TO ${name}; RELEASE ${name}` : 'ROLLBACK'); } catch (x) {}
        throw e;
      }
    };
  }
}

module.exports = native && native.DatabaseSync ? Database : require('better-sqlite3');
