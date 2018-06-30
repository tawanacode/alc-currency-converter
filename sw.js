var staticCacheName = 'currency-converter-v1';

self.addEventListener('install', function(e) {
    e.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      return cache.addAll([
          './',
        'assets/main.js',
        'assets/main.css',
        'favicon.ico',
        'https://stackpath.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css',
        'https://use.fontawesome.com/releases/v5.1.0/css/all.css',
        'https://fonts.googleapis.com/css?family=Jura|Poppins:300,400,700'
      ]);
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
          cacheNames.filter(function(cacheName) {
          console.log("delete old cached files");
          return cacheName !== staticCacheName;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', function(e) {
 // var requestUrl = new URL(e.request.url);

  //if (requestUrl.origin === location.origin) {
    //if (requestUrl.pathname === '/') {
      //event.respondWith(caches.match('/skeleton'));
      //return;
//    }
  //}

//  e.respondWith(
  //  caches.match(e.request).then(function(response) {
    //  return response || fetch(e.request);
//    })
//  );
});