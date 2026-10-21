const { db, MASCOT_COUNT } = require('./database');
const T = require('./time');

const LIFE = 5;
const STATES = [
  { key: 'gone', label: 'Se fue', mood: 'sleepy' },
  { key: 'weak', label: 'Muy débil', mood: 'sad' },
  { key: 'sick', label: 'Enferma', mood: 'sad' },
  { key: 'sad', label: 'Triste', mood: 'worried' },
  { key: 'miss', label: 'Te extraña', mood: 'thinking' },
  { key: 'ok', label: 'Con energía', mood: 'happy' }
];

let hooks = { died: () => {}, revived: () => {} };
function setHooks(h) {
  hooks = { ...hooks, ...h };
}

const isAbsent = r => r.status === 'AUSENTE' || r.review_state === 'FRAUDE';

function absenceRun(s, until) {
  const rows = db.q('SELECT date, course_id, status, justified, review_state FROM attendances WHERE student_id = ? AND date >= ? AND date <= ? ORDER BY date DESC LIMIT 60')
    .all(s.id, s.mascot_born_on || '0000-00-00', until || '9999-12-31');
  const held = db.q("SELECT 1 FROM attendances WHERE course_id = ? AND date = ? AND status IN ('A_TIEMPO', 'TARDE') LIMIT 1");
  let n = 0;
  let last = null;
  for (const r of rows) {
    if (!isAbsent(r)) break;
    if (r.justified || !held.get(r.course_id, r.date)) continue;
    n++;
    if (!last) last = r.date;
  }
  return { n, last };
}

function seeded(seed) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function choices(s, count = 3) {
  const used = new Set(db.q('SELECT mascot FROM students WHERE course_id = ? AND active = 1 AND mascot IS NOT NULL AND id != ?').all(s.course_id, s.id).map(r => r.mascot));
  const gone = new Set(db.q('SELECT mascot FROM mascot_history WHERE student_id = ?').all(s.id).map(r => r.mascot));
  let free = [];
  for (let i = 0; i < MASCOT_COUNT; i++) if (!used.has(i) && i !== s.mascot && !gone.has(i)) free.push(i);
  if (free.length < count) for (let i = 0; i < MASCOT_COUNT; i++) if (!used.has(i) && i !== s.mascot && !free.includes(i)) free.push(i);
  const rnd = seeded(s.id * 7919 + String(s.mascot_dead_on || '').split('-').join('') * 1);
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  return free.slice(0, count);
}

function check(studentId) {
  const s = db.q('SELECT * FROM students WHERE id = ?').get(studentId);
  if (!s || s.mascot == null) return null;
  if (!s.mascot_born_on) {
    db.q('UPDATE students SET mascot_born_on = ? WHERE id = ?').run(T.localDate(), s.id);
    return { run: 0, dead: false };
  }
  if (s.mascot_dead_on) {
    const r = absenceRun(s, s.mascot_dead_on);
    if (r.n < LIFE) {
      db.transaction(() => {
        db.q('UPDATE students SET mascot_dead_on = NULL WHERE id = ?').run(s.id);
        db.q('DELETE FROM mascot_history WHERE id = (SELECT id FROM mascot_history WHERE student_id = ? AND died_on = ? ORDER BY id DESC LIMIT 1)').run(s.id, s.mascot_dead_on);
      })();
      hooks.revived(s);
      return { run: absenceRun(s).n, dead: false, revived: true };
    }
    return { run: r.n, dead: true };
  }
  const r = absenceRun(s);
  if (r.n >= LIFE) {
    const punctual = db.q("SELECT COUNT(*) AS c FROM attendances WHERE student_id = ? AND date >= ? AND status = 'A_TIEMPO' AND (review_state IS NULL OR review_state != 'FRAUDE')").get(s.id, s.mascot_born_on).c;
    db.transaction(() => {
      db.q('UPDATE students SET mascot_dead_on = ? WHERE id = ?').run(r.last, s.id);
      db.q('INSERT INTO mascot_history (student_id, mascot, mascot_name, born_on, died_on, punctual_days, absences) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(s.id, s.mascot, s.mascot_name, s.mascot_born_on, r.last, punctual, r.n);
    })();
    hooks.died({ ...s, mascot_dead_on: r.last }, r.n);
    return { run: r.n, dead: true, died: true };
  }
  return { run: r.n, dead: false };
}

function adopt(studentId, index) {
  const s = db.q('SELECT * FROM students WHERE id = ?').get(studentId);
  if (!s || !s.mascot_dead_on) return { error: 'Tu mascota está bien, no necesitas otra.' };
  const opts = choices(s);
  const pick = index == null ? opts[0] : Number(index);
  if (!opts.includes(pick)) return { error: 'Elige uno de los huevos disponibles.' };
  db.q('UPDATE students SET mascot = ?, mascot_name = NULL, mascot_hatched = 0, mascot_born_on = ?, mascot_dead_on = NULL WHERE id = ?').run(pick, T.localDate(), s.id);
  return { mascot: pick };
}

function status(s) {
  const dead = Boolean(s.mascot_dead_on);
  const run = dead ? LIFE : Math.min(LIFE, absenceRun(s).n);
  const health = dead ? 0 : LIFE - run;
  const st = STATES[health];
  const history = db.q('SELECT mascot, mascot_name, born_on, died_on, punctual_days FROM mascot_history WHERE student_id = ? ORDER BY id DESC').all(s.id);
  return { life: LIFE, health, run, dead, state: st.key, label: st.label, mood: st.mood, dead_on: s.mascot_dead_on || null, born_on: s.mascot_born_on || null, choices: dead ? choices(s) : [], history };
}

function atRisk(min = 3) {
  const rows = db.q('SELECT * FROM students WHERE active = 1 AND mascot IS NOT NULL').all();
  const out = [];
  for (const s of rows) {
    const p = status(s);
    if (p.dead || p.run >= min) out.push({ student_id: s.id, first_name: s.first_name, last_name: s.last_name, course_id: s.course_id, mascot: s.mascot, run: p.dead ? absenceRun(s, s.mascot_dead_on).n : p.run, health: p.health, dead: p.dead, dead_on: p.dead_on });
  }
  return out.sort((a, b) => a.health - b.health || b.run - a.run);
}

module.exports = { LIFE, check, adopt, status, choices, atRisk, setHooks, absenceRun };
