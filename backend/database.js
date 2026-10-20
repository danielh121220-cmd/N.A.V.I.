const Database = require('better-sqlite3');
const config = require('./config');

const db = new Database(config.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

const stmtCache = new Map();
db.q = sql => {
  let st = stmtCache.get(sql);
  if (!st) {
    st = db.prepare(sql);
    stmtCache.set(sql, st);
  }
  return st;
};

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'DOCENTE',
    institution_name TEXT,
    avatar TEXT NOT NULL DEFAULT 'triangle',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    teacher TEXT NOT NULL DEFAULT '',
    classroom TEXT NOT NULL DEFAULT '',
    schedule_start TEXT NOT NULL DEFAULT '07:00',
    late_tolerance_min INTEGER NOT NULL DEFAULT 10,
    absent_limit_min INTEGER NOT NULL DEFAULT 45,
    days TEXT NOT NULL DEFAULT '1,2,3,4,5',
    theme TEXT NOT NULL DEFAULT 'blue'
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_code TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    course_id INTEGER NOT NULL REFERENCES courses(id),
    nfc_uid TEXT NOT NULL UNIQUE,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    parent_telegram TEXT,
    face_photo TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id),
    course_id INTEGER NOT NULL REFERENCES courses(id),
    terminal_id TEXT,
    date TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    time_recorded TEXT NOT NULL,
    status TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'NFC',
    presence_id TEXT,
    snapshot_photo TEXT,
    snapshot_bytes INTEGER,
    review_state TEXT,
    review_reasons TEXT,
    in_class INTEGER,
    verified_by INTEGER,
    verified_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, date)
  );
  CREATE INDEX IF NOT EXISTS idx_att_date ON attendances(date);
  CREATE INDEX IF NOT EXISTS idx_att_terminal_ts ON attendances(terminal_id, timestamp);
  CREATE INDEX IF NOT EXISTS idx_att_review ON attendances(review_state);

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attendance_id INTEGER REFERENCES attendances(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id),
    kind TEXT NOT NULL,
    channel TEXT NOT NULL,
    recipient TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS terminals (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL DEFAULT 'LECTOR',
    ip TEXT,
    firmware TEXT,
    rssi INTEGER,
    last_seen TEXT
  );

  CREATE TABLE IF NOT EXISTS course_runs (
    course_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    absences_done INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (course_id, date)
  );

  CREATE TABLE IF NOT EXISTS student_health (
    student_id INTEGER PRIMARY KEY REFERENCES students(id),
    birth_date TEXT,
    blood_type TEXT,
    allergies TEXT NOT NULL DEFAULT '[]',
    conditions TEXT NOT NULL DEFAULT '[]',
    medications TEXT NOT NULL DEFAULT '[]',
    contacts TEXT NOT NULL DEFAULT '[]',
    instructions TEXT,
    doctor TEXT,
    insurance TEXT,
    consent INTEGER NOT NULL DEFAULT 0,
    consent_by TEXT,
    consent_at TEXT,
    token TEXT UNIQUE,
    updated_at TEXT,
    updated_by INTEGER
  );

  CREATE TABLE IF NOT EXISTS health_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    via TEXT NOT NULL,
    user_id INTEGER,
    ip TEXT,
    agent TEXT,
    at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_health_access ON health_access(student_id, at);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

function addColumns(table, defs) {
  const have = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  for (const [name, def] of defs) if (!have.includes(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
}
addColumns('students', [['mascot', 'INTEGER'], ['mascot_name', 'TEXT'], ['mascot_hatched', 'INTEGER NOT NULL DEFAULT 0'], ['card_ver', 'INTEGER NOT NULL DEFAULT 0'], ['pin_hash', 'TEXT'], ['pin_fails', 'INTEGER NOT NULL DEFAULT 0'], ['pin_locked_until', 'INTEGER']]);
addColumns('attendances', [['card_verified', 'INTEGER'], ['justified', 'INTEGER NOT NULL DEFAULT 0'], ['justification', 'TEXT'], ['justified_by', 'INTEGER'], ['justified_at', 'TEXT']]);
db.exec(`CREATE TABLE IF NOT EXISTS student_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  device_hash TEXT NOT NULL,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen TEXT,
  UNIQUE(student_id, device_hash)
)`);

const MASCOT_COUNT = 40;
function nextMascot(courseId, exceptId) {
  const used = new Set(db.prepare('SELECT mascot FROM students WHERE course_id = ? AND active = 1 AND mascot IS NOT NULL AND id != ?').all(courseId, exceptId || 0).map(r => r.mascot));
  for (let i = 0; i < MASCOT_COUNT; i++) if (!used.has(i)) return i;
  return Math.floor(Math.random() * MASCOT_COUNT);
}
function assignMascots() {
  const rows = db.prepare('SELECT id, course_id FROM students WHERE mascot IS NULL ORDER BY id').all();
  for (const r of rows) db.prepare('UPDATE students SET mascot = ? WHERE id = ?').run(nextMascot(r.course_id, r.id), r.id);
}

const notifCols = db.prepare('PRAGMA table_info(notifications)').all().map(c => c.name);
if (!notifCols.includes('subject')) db.exec('ALTER TABLE notifications ADD COLUMN subject TEXT');
if (!notifCols.includes('custom_text')) db.exec('ALTER TABLE notifications ADD COLUMN custom_text TEXT');

const defaultSettings = {
  notify_on_arrival: '0',
  notify_on_late: '1',
  notify_on_absent: '1',
  auto_absences: '1'
};
const insSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(defaultSettings)) insSetting.run(k, v);

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) if (r.key !== 'messaging') out[r.key] = r.value === '1' ? true : r.value === '0' ? false : r.value;
  return out;
}

function setSetting(key, value) {
  const v = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, v);
}

function seed() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM courses').get().c;
  if (count > 0) return;
  const insCourse = db.prepare(`INSERT INTO courses (name, code, teacher, classroom, schedule_start, late_tolerance_min, absent_limit_min, theme) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const insStudent = db.prepare(`INSERT INTO students (student_code, first_name, last_name, course_id, nfc_uid, parent_name, parent_phone, parent_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const tx = db.transaction(() => {
    const c1 = insCourse.run('3ro Bachillerato Técnico A · Mecatrónica', 'MEC-3A', 'Ing. Andrea Villacís', 'Laboratorio de Mecatrónica', '07:00', 10, 45, 'blue').lastInsertRowid;
    const c2 = insCourse.run('2do BGU B', 'BGU-2B', 'Lic. Fernando Zambrano', 'Aula 204', '07:00', 10, 45, 'green').lastInsertRowid;
    const c3 = insCourse.run('1ro Bachillerato Técnico · Electrónica', 'ELE-1A', 'Ing. Paola Mendoza', 'Taller de Electrónica', '07:30', 10, 45, 'orange').lastInsertRowid;
    const students = [
      ['NAVI-001', 'Mateo', 'Andrade', c1, '04A1B2C3', 'Carlos Andrade'],
      ['NAVI-002', 'Valentina', 'Cedeño', c1, '5A99D412', 'Elena Cedeño'],
      ['NAVI-003', 'Santiago', 'Mora', c1, '14F7E3B1', 'Jorge Mora'],
      ['NAVI-004', 'Camila', 'Torres', c1, '8329CB01', 'Lucía Torres'],
      ['NAVI-005', 'Joaquín', 'Bravo', c1, '7B3A92F1', 'Ramiro Bravo'],
      ['NAVI-006', 'Isabella', 'Vera', c1, 'A1C0FFEE', 'Patricia Vera'],
      ['NAVI-007', 'Emilio', 'Castro', c2, 'C2915A77', 'Fernando Castro'],
      ['NAVI-008', 'Sofía', 'Macías', c2, 'D3E4F501', 'Gabriela Macías'],
      ['NAVI-009', 'Thiago', 'Paredes', c3, 'E5F60712', 'Roberto Paredes']
    ];
    students.forEach((s, i) => {
      const n = String(i + 1).padStart(2, '0');
      insStudent.run(s[0], s[1], s[2], s[3], s[4], s[5], `+593 99 000 00${n}`, `representante${n}@example.com`);
    });
  });
  tx();
}

seed();

function seedHealth() {
  const n = db.prepare('SELECT COUNT(*) AS c FROM student_health').get().c;
  if (n > 0) return;
  const crypto = require('crypto');
  const ins = db.prepare(`INSERT INTO student_health (student_id, birth_date, blood_type, allergies, conditions, medications, contacts, instructions, doctor, insurance, consent, consent_by, consent_at, token, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`);
  const find = code => db.prepare('SELECT id, parent_name, parent_phone FROM students WHERE student_code = ?').get(code);
  const now = new Date().toISOString();
  const a = find('NAVI-001');
  if (a) ins.run(a.id, '2009-03-14', 'O+', JSON.stringify([{ name: 'Penicilina', severity: 'GRAVE', reaction: 'Dificultad para respirar e hinchazón' }, { name: 'Maní', severity: 'MODERADA', reaction: 'Urticaria' }]), JSON.stringify([{ name: 'Asma', notes: 'Crisis con ejercicio intenso' }]), JSON.stringify([{ name: 'Salbutamol inhalador', dose: '2 inhalaciones si hay crisis' }]), JSON.stringify([{ name: a.parent_name, relation: 'Padre', phone: a.parent_phone }]), 'Si tiene crisis de asma: sentarlo, aflojar la ropa y darle su inhalador (está en la mochila, bolsillo delantero). Si no mejora en 10 minutos, llamar al 911.', 'Dra. Ana Ruiz · 0990000099', 'IESS', a.parent_name, now, crypto.randomBytes(12).toString('base64url'), now);
  const b = find('NAVI-002');
  if (b) ins.run(b.id, '2009-07-02', 'A+', '[]', JSON.stringify([{ name: 'Diabetes tipo 1', notes: 'Usa sensor de glucosa en el brazo' }]), JSON.stringify([{ name: 'Insulina rápida', dose: 'Según glucosa, la aplica ella misma' }]), JSON.stringify([{ name: b.parent_name, relation: 'Madre', phone: b.parent_phone }]), 'Si está pálida, sudorosa o confundida puede ser hipoglucemia: darle un jugo o 3 caramelos y avisar al DECE. Si pierde el conocimiento no darle nada por la boca y llamar al 911.', '', 'Seguro privado', b.parent_name, now, crypto.randomBytes(12).toString('base64url'), now);
}
seedHealth();
assignMascots();

module.exports = { db, getSettings, setSetting, nextMascot, assignMascots, MASCOT_COUNT };
