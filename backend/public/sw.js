const VERSION = 'navi-v12';
const SHELL = ['/', '/index.html', '/style.css', '/app.js', '/bots.js', '/intro.js', '/mascots.js', '/sfx.js', '/vendor/qrcode.js', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/fonts/Inter-Regular.woff2', '/fonts/Inter-Medium.woff2', '/fonts/Inter-SemiBold.woff2', '/fonts/Inter-Bold.woff2', '/fonts/InterDisplay-SemiBold.woff2', '/fonts/InterDisplay-Bold.woff2', '/fonts/InterDisplay-ExtraBold.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname === '/ws') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
  );
});
