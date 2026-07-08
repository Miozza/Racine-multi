// Racine — Service worker "réseau d'abord, cache en secours".
// En ligne : chaque fichier est revalidé auprès du serveur (jamais de version
// périmée servie silencieusement — un fichier inchangé répond 304, pas un
// re-téléchargement complet). Hors ligne ou réseau défaillant : l'app s'ouvre
// depuis la dernière version mise en cache, puisque toutes les données vivent
// déjà en local.
// Bump CACHE_NAME à chaque release pour purger les caches précédents.

const CACHE_NAME = "racine-v4.3";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if(request.method !== "GET") return;

  const url = new URL(request.url);
  // Ne jamais mettre en cache ce qui ne vient pas de l'app elle-même.
  if(url.origin !== self.location.origin){
    return;
  }

  event.respondWith(
    // "no-cache" force une revalidation serveur (ETag/304) sans re-télécharger
    // les fichiers inchangés : fraîcheur garantie, bande passante préservée.
    fetch(request, { cache: "no-cache" })
      .then(response => {
        if(response && response.ok){
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, copy))
            .catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(cached => {
          if(cached) return cached;
          // Navigation hors ligne sans entrée exacte : servir la coquille.
          if(request.mode === "navigate"){
            return caches.match("./index.html");
          }
          return Response.error();
        })
      )
  );
});
