var staticCacheName = 'v5;
 
self.addEventListener('install', function(e) {
    e.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      return cache.addAll([
        'index.html',
        'assets/main.js',
        'assets/main.css',
        'favicon.ico',
        'icon.png',
        'icon-512.png',
        'https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css',
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
    
  e.respondWith(
    caches.match(e.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
            
        console.log("response");
          return response;
        }

        // IMPORTANT: Clone the request. A request is a stream and
        // can only be consumed once. Since we are consuming this
        // once by cache and once by the browser for fetch, we need
        // to clone the response.
        var fetchRequest = e.request.clone();

        return fetch(fetchRequest).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              //console.log(response);
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            var responseToCache = response.clone();

            caches.open(staticCacheName)
              .then(function(cache) {
                
              console.log("cloned");
                cache.put(e.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});