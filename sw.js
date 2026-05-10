self.addEventListener('install', (event)=>{
  event.waitUntil(
    caches.open('pwdreset-demo-otp-v2').then(cache=>cache.addAll([
      './',
      './index.html',
      './styles.css',
      './app.js',
      './manifest.json'
    ]))
  );
});

self.addEventListener('fetch', (event)=>{
  event.respondWith(
    caches.match(event.request).then(resp=> resp || fetch(event.request))
  );
});
