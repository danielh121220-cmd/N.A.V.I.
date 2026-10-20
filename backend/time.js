const pad = n => String(n).padStart(2, '0');

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localTime(d = new Date()) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function minutesOfDay(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function hhmmToMinutes(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isoWeekday(d = new Date()) {
  const w = d.getDay();
  return w === 0 ? 7 : w;
}

function daysAgo(n, d = new Date()) {
  const c = new Date(d);
  c.setDate(c.getDate() - n);
  return localDate(c);
}

module.exports = { localDate, localTime, minutesOfDay, hhmmToMinutes, isoWeekday, daysAgo, pad };
