// Racine — Service worker sans cache applicatif durable.
// Objectif : laisser le réseau servir les nouveaux fichiers et nettoyer les vieux caches.

const CACHE_NAME = "racine-no-cache";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Pas de cache applicatif ici volontairement.
// Les lectures repassent par le réseau; les données utilisateur restent locales.

self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;
  // L'image de splash ne change quasi jamais : la laisser passer par le cache
  // HTTP normal du navigateur évite un re-téléchargement réseau à chaque
  // ouverture (lent sur mobile) sans affecter le reste de l'app, qui doit
  // rester toujours à jour.
  if(event.request.url.indexOf("splash-racine") !== -1){
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(fetch(event.request, { cache: "reload" }));
});
