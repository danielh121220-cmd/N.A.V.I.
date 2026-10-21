const { chromium } = require('playwright');
const path = require('path');
const DIR = __dirname;
const http = require('http');
const fs = require('fs');
const ROOT = path.resolve(DIR, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.stl': 'application/octet-stream' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  const srv = await serve();
  const URL = `http://127.0.0.1:${srv.address().port}/tools/video/promo.html`;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
  await p.evaluate(() => window.ready);
  const ts = process.argv.slice(2).map(Number);
  const files = [];
  require('fs').mkdirSync(path.join(DIR, 'prev'), { recursive: true });
  for (const t of ts) { await p.evaluate(t => render(t), t); const f = path.join(DIR, 'prev', `t${String(t).replace('.', '_')}.png`); files.push(f); await p.screenshot({ path: f }); }
  require('fs').writeFileSync(path.join(DIR, 'prev', 'list.txt'), files.join('\n'));
  console.log(errs.join('\n') || 'ok');
  await b.close();
  srv.close();
})();
