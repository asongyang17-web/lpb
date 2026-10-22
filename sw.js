const CACHE_NAME = 'church-reg-cache-v1';

// ໄຟລ໌ຫຼັກທີ່ຕ້ອງການ Cache ໄວ້ເພື່ອໃຫ້ເປີດໄດ້ໄວ ແລະ ໃຊ້ງານ Offline ໄດ້
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon.svg'
];

// ເມື່ອຕິດຕັ້ງ Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ເມື່ອ Service Worker ເປີດໃຊ້ງານ (ລຶບ Cache ເກົ່າອອກ)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ຈັດການການດຶງຂໍ້ມູນ (Fetch)
self.addEventListener('fetch', (event) => {
  // ຮັບສະເພາະ GET requests ເທົ່ານັ້ນ (POST ຂອງຟອມຈະບໍ່ຖືກ Cache)
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // ບໍ່ຈັດການ chrome-extension ຫຼື protocol ອື່ນໆ
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Network-First ສຳລັບໜ້າ HTML ເພື່ອໃຫ້ໄດ້ຂໍ້ມູນຫຼ້າສຸດສະເໝີ
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  // Stale-While-Revalidate ສຳລັບ Static Assets (ໄຟລ໌ css, ຮູບພາບ, ໄອຄອນ)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // ຖ້າ offline ແລະ ບໍ່ມີໃນ cache ຈະປ່ອຍຜ່ານ
        });

      return cachedResponse || fetchPromise;
    })
  );
});
