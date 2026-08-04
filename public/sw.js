/* ⚡ All Tools KYY — Service Worker v6.2
   ANTI CACHE MEMBANDEL:
   - Nama cache BARU tiap update → browser otomatis install SW ini & hapus SEMUA cache lama.
   - HTML / CSS / JS  = network-first  → versi terbaru SELALU menang selama ada internet,
     cache cuma dipake pas bener-bener offline.
   - Gambar           = stale-while-revalidate (tetep kenceng).
   - API & video      = tanpa cache, selalu langsung dari server. */

const CACHE_NAME = 'kyy-cache-v62';

// URL di sini HARUS sama persis kayak yang dipanggil index.html (termasuk ?v=62)
const PRECACHE = [
  '/',
  '/index.html',
  '/css/style.css?v=62',
  '/css/void.css?v=62',
  '/js/app.js?v=62',
  '/js/void.js?v=62',
  '/js/gamedata.js?v=62',
  '/js/quizdata.js?v=62',
  '/js/f100data.js?v=62',
  '/manifest.webmanifest?v=62',
  '/img/logo.png',
  '/img/pwa-192.png',
  '/img/pwa-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()) // langsung aktif, gak nunggu tab ditutup
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()) // langsung pegang semua tab yang kebuka
  );
});

// tombol darurat: dari halaman manapun bisa minta SW bersih-bersih total
self.addEventListener('message', (e) => {
  if (e.data === 'KYY_PURGE') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});

function networkFirst(req, cacheKey) {
  return fetch(req)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(cacheKey || req, copy));
      }
      return res;
    })
    .catch(() => caches.match(cacheKey || req));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return; // font/CDN dibiarin ke browser

  // API & video: SELALU dari jaringan, jangan pernah di-cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/video/')) return;

  // dokumen HTML: network-first, fallback /index.html kalo offline
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, '/index.html'));
    return;
  }

  // CSS/JS: network-first → update deploy langsung kebawa tanpa perlu clear cache
  if (/\.(css|js|webmanifest)$/.test(url.pathname)) {
    e.respondWith(networkFirst(req));
    return;
  }

  // gambar & aset lain: stale-while-revalidate (cache dulu, update di belakang)
  e.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    })
  );
});
