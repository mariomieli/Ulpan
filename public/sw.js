// Service worker di Ulpan.
// - Pagine: prima la rete, poi la copia salvata (uso offline).
// - File in /assets/: hanno un nome con hash e non cambiano mai → prima la cache.
// - Solo risposte valide finiscono in cache; le cache delle versioni vecchie vengono eliminate.
const CACHE = 'ulpan-v3';
// Riempito durante la build con i file dell'app (vite.config.ts)
const PRECACHE = [];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await c.addAll(['./', './index.html']);
    // il resto in background, senza bloccare l'installazione se un file manca
    await Promise.all(PRECACHE.map((f) => c.add(f).catch(() => {})));
  }).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function save(req, res) {
  if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin) return;

  if (sameOrigin && url.pathname.includes('/assets/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => save(req, res))));
    return;
  }

  e.respondWith(
    fetch(req)
      .then((res) => (res.ok ? save(req, res) : caches.match(req, { ignoreSearch: true }).then((hit) => hit || res)))
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
        .then((hit) => hit || Response.error())),
  );
});
