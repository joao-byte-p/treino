// Service worker: cache-first para a app, network-first para fontes externas. Sobe a versão a cada deploy.
const VERSION = 'treino-v0.6.1';
const CORE = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/config.js', './js/store.js', './js/timer.js',
  './js/data/exercises.js', './js/engine/planner.js', './js/engine/progression.js',
  './js/ui/components.js', './js/ui/views.js', './js/ui/session.js', './js/ui/figure.js', './js/data/poses.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.search) return; // não guardar variantes com query string na cache
  if (url.origin === location.origin) {
    // rede primeiro: online mostra sempre a versão mais recente; offline cai na cache
    e.respondWith(caches.open(VERSION).then(async c => {
      try {
        const r = await fetch(e.request);
        if (r.ok) c.put(e.request, r.clone());
        return r;
      } catch {
        const cached = await c.match(e.request, { ignoreSearch: true });
        return cached || c.match('./index.html') || Response.error();
      }
    }));
  } else if (url.hostname.includes('fonts.g')) {
    e.respondWith(caches.open(VERSION + '-fonts').then(async c => {
      const cached = await c.match(e.request);
      if (cached) return cached;
      try { const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r; } catch { return new Response('', { status: 503 }); }
    }));
  }
});
