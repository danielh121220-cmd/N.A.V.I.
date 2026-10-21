let data = { names: [], neutral: [], happy: [] };
try {
  data = require('./mascot-bitmaps.json');
} catch (e) {}

const COUNT = 40;
const wrap = i => ((Number(i) % COUNT) + COUNT) % COUNT;

module.exports = {
  name: i => data.names[wrap(i)] || 'Mascota',
  bitmap: (i, mood) => (data[mood] || data.neutral || [])[wrap(i)] || ''
};
