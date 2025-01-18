const CACHE_NAME = 'ventus-talk-cache-v1';
const urlsToCache = [
  '/',
  '/loading.html',
  '/home/home.html',
  '/home/home.css',
  '/home/addFriend.js',
  '/talk/index.html',
  '/talk/app.js',
  '/talk/decorate.js',
  '/talk/group_window.css',
  '/settings/settings.html',
  '/style.css',
  '/menu.css',
  '/log.js',
  '/log.css',
  '/isLogined.js',
  '/firebase-setup.js',
  '/manifest.json',
  '/menuNavigation.js',
  'https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/ICOhome.png?v=1736752485769',
  'https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/ICOTalk.png?v=1736752489537',
  'https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/ICOsettings.png?v=1736752493753',
  'https://cdn.glitch.global/4c6a40f6-0654-48bd-96e4-a413b8aa1ec0/ICOaddFriend.png?v=1736769966865'
];

// キャッシュのインストール
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to open cache: ', err);
      })
  );
});

// フェッチ処理 (開発モード)
self.addEventListener('fetch', event => {
  console.log('Development mode: Fetch event for ', event.request.url);
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.status === 404) {
          console.error('Resource not found: ', event.request.url);
          return new Response('Not found');
        }
        return response;
      })
      .catch(err => {
        console.error('Fetch failed: ', err);
        return new Response('Service Unavailable', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

/*


self.addEventListener('fetch', event => {
  console.log('Fetch event for ', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('Found ', event.request.url, ' in cache');
          return response;
        }
        console.log('Network request for ', event.request.url);
        return fetch(event.request).then(response => {
          if (response.status === 404) {
            console.error('Resource not found: ', event.request.url);
            return new Response('Not found');
          }
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request.url, response.clone());
            return response;
          });
        });
      })
      .catch(err => {
        console.error('Fetch failed: ', err);
        return new Response('Service Unavailable', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});
*/

/*
self.addEventListener('fetch', event => {
    console.log('Fetch event for ', event.request.url);
    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                console.log('Found ', event.request.url, ' in cache');
                return response;
            }
            console.log('Network request for ', event.request.url);
            return fetch(event.request).then(response => {
                return caches.open('dynamic-cache').then(cache => {
                    cache.put(event.request.url, response.clone());
                    return response;
                });
            });
        }).catch(error => {
            console.error('Fetch failed:', error);
            throw error;
        })
    );
});
*/
