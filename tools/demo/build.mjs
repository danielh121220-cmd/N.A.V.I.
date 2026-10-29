import * as esbuild from 'esbuild';
import path from 'path';
const S = p => path.resolve('shims', p);
await esbuild.build({
  entryPoints: ['entry.js'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020', 'safari14'],
  minify: true,
  legalComments: 'none',
  outfile: 'dist/backend.js',
  alias: {
    'better-sqlite3': S('better-sqlite3.js'),
    'node:sqlite': S('empty.js'),
    zlib: S('empty.js'),
    dgram: S('empty.js'),
    fs: S('fs.js'),
    crypto: S('crypto.js'),
    os: S('os.js'),
    http: S('http.js'),
    ws: S('ws.js'),
    express: S('express.js'),
    nodemailer: S('nodemailer.js'),
    path: 'path-browserify'
  },
  inject: [S('globals.js')],
  define: { __dirname: '"/app"', __filename: '"/app/index.js"', 'require.main': 'undefined' },
  nodePaths: [path.resolve('node_modules')],
  logLevel: 'warning'
});
console.log('built');
