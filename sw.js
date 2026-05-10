const CACHE = 'ad-login-assist-v4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', (event)=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event)=>{
  event.waitUntil((async ()=>{
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k === CACHE ? null : caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event)=>{
  event.respondWith(caches.match(event.request).then(resp=> resp || fetch(event.request)));
});
