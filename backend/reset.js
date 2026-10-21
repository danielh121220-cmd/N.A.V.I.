const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const readline = require('readline');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const DEMO = path.join(ROOT, 'data-demo');
const SECRETS = path.join(DATA, 'secrets.json');
const SALT = 'xwDrYh2ncUW1pEvlMHgT/Q==';
const HASH = 'KjgsAuRMkaMdIFZYf5P9U7kCfClVGRvj6uqu1vuU8E8=';

const C = process.stdout.isTTY ? { r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', b: '\x1b[1m', d: '\x1b[2m', x: '\x1b[0m' } : { r: '', g: '', y: '', b: '', d: '', x: '' };
const out = s => process.stdout.write(s + '\n');
const wait = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function port() {
  if (process.env.PORT) return Number(process.env.PORT);
  try {
    const m = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').match(/^\s*PORT\s*=\s*["']?(\d+)/m);
    if (m) return Number(m[1]);
  } catch (e) {}
  return 3000;
}

function serverRunning() {
  return new Promise(resolve => {
    const req = http.get({ host: '127.0.0.1', port: port(), path: '/api/info', timeout: 1200 }, res => { res.resume(); resolve(true); });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

function ask(q) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, a => { rl.close(); resolve(a); });
  });
}

function askHidden(q) {
  const stdin = process.stdin;
  if (!stdin.isTTY) return ask(q);
  return new Promise(resolve => {
    process.stdout.write(q);
    let buf = '';
    let ended = false;
    const finish = () => {
      ended = true;
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write('\n');
      resolve(buf);
    };
    const onData = chunk => {
      for (const c of chunk) {
        if (ended) return;
        if (c === '\r' || c === '\n') return finish();
        if (c === '\u0003') { stdin.setRawMode(false); process.stdout.write('\n'); process.exit(1); }
        if (c === '\u007f' || c === '\b') {
          if (buf.length) { buf = buf.slice(0, -1); process.stdout.write('\b \b'); }
          continue;
        }
        if (c < ' ') continue;
        buf += c;
        process.stdout.write('*');
      }
    };
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.on('data', onData);
  });
}

function passwordOk(text) {
  const actual = crypto.scryptSync(norm(text), Buffer.from(SALT, 'base64'), 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return crypto.timingSafeEqual(actual, Buffer.from(HASH, 'base64'));
}

function size(p) {
  let st;
  try { st = fs.statSync(p); } catch (e) { return 0; }
  if (!st.isDirectory()) return st.size;
  return fs.readdirSync(p).reduce((n, f) => n + size(path.join(p, f)), 0);
}

function targets() {
  const list = [];
  if (fs.existsSync(DATA)) for (const f of fs.readdirSync(DATA)) if (f !== 'secrets.json') list.push(path.join(DATA, f));
  if (fs.existsSync(DEMO)) list.push(DEMO);
  return list;
}

const human = n => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? Math.round(n / 1024) + ' KB' : n + ' B');

(async () => {
  out('');
  out(`${C.b}N.A.V.I · Borrar toda la información${C.x}`);
  out(`${C.d}Cuentas, cursos, estudiantes, asistencias, fotos, avisos y la demostración.${C.x}`);
  out('');

  if (await serverRunning()) {
    out(`${C.y}El servidor de N.A.V.I está abierto.${C.x} Cierra su ventana (o presiona Ctrl + C en ella) y vuelve a escribir el comando.`);
    process.exit(1);
  }

  let ok = false;
  for (let n = 1; n <= 3 && !ok; n++) {
    ok = passwordOk(await askHidden('Contraseña: '));
    if (!ok) {
      await wait(1200);
      out(`${C.r}Contraseña incorrecta.${C.x}${n < 3 ? ` Te quedan ${3 - n} intento${3 - n === 1 ? '' : 's'}.` : ''}`);
    }
  }
  if (!ok) {
    out('No se borró nada.');
    process.exit(1);
  }

  const list = targets();
  if (!list.length) {
    out(`${C.g}No hay nada que borrar: N.A.V.I ya está desde cero.${C.x}`);
    process.exit(0);
  }
  out('');
  out('Se va a borrar:');
  for (const p of list) out(`  ${C.r}•${C.x} ${path.relative(path.dirname(ROOT), p)} ${C.d}(${human(size(p))})${C.x}`);
  out(`${C.d}Se conserva la clave de terminal, así que los lectores ESP32 siguen funcionando sin volver a programarlos.${C.x}`);
  out('');

  const a1 = norm(await ask(`${C.b}1/2${C.x} ¿Seguro que quieres borrar TODO? Escribe ${C.b}SI${C.x}: `));
  if (a1 !== 'si') { out('Cancelado. No se borró nada.'); process.exit(0); }
  const a2 = norm(await ask(`${C.b}2/2${C.x} Última pregunta, esto ${C.r}no se puede deshacer${C.x}. Escribe ${C.b}BORRAR${C.x}: `));
  if (a2 !== 'borrar') { out('Cancelado. No se borró nada.'); process.exit(0); }

  const failed = [];
  for (const p of list) {
    try { fs.rmSync(p, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch (e) { failed.push(path.relative(path.dirname(ROOT), p)); }
  }
  if (failed.length) {
    out(`${C.r}No pude borrar:${C.x} ${failed.join(', ')}`);
    out('Algún programa los tiene abiertos. Cierra el servidor de N.A.V.I y vuelve a intentarlo.');
    process.exit(1);
  }

  let secrets = {};
  try { secrets = JSON.parse(fs.readFileSync(SECRETS, 'utf8')); } catch (e) {}
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(SECRETS, JSON.stringify({ tokenSecret: crypto.randomBytes(32).toString('hex'), ...(secrets.terminalKey ? { terminalKey: secrets.terminalKey } : {}) }, null, 2));

  out('');
  out(`${C.g}${C.b}Listo. N.A.V.I quedó desde cero.${C.x}`);
  out('  1. Abre INICIAR_NAVI.bat.');
  out('  2. La primera cuenta que crees será la del administrador.');
  out('  3. Los celulares y computadoras que tenían la sesión abierta vuelven solos a la pantalla de inicio.');
  out('');
  process.exit(0);
})();
