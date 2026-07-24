/*
  Service worker — Kembo BBQ
  Le service se tient en plein air : la connexion va et vient. La coquille de
  l'application est gardée en cache pour que la caisse s'ouvre toujours, même
  sans réseau. Les ventes saisies hors ligne partent dans IndexedDB, pas ici.
*/

const CACHE = "kembo-v1";
const COQUILLE = ["/hors-ligne", "/manifest.webmanifest", "/icones/kembo-192.png"];

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(COQUILLE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;

  // Les mutations ne sont jamais mises en cache : elles passent ou échouent,
  // et la file d'attente côté application prend le relais.
  if (requete.method !== "GET") return;

  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;

  // Navigation : le réseau d'abord, la page « hors ligne » en dernier recours.
  if (requete.mode === "navigate") {
    evenement.respondWith(
      fetch(requete)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE).then((cache) => cache.put(requete, copie));
          return reponse;
        })
        .catch(() => caches.match(requete).then((c) => c || caches.match("/hors-ligne"))),
    );
    return;
  }

  // Ressources statiques : le cache d'abord, plus rapide et plus économe.
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icones")) {
    evenement.respondWith(
      caches.match(requete).then(
        (cache) =>
          cache ||
          fetch(requete).then((reponse) => {
            const copie = reponse.clone();
            caches.open(CACHE).then((c) => c.put(requete, copie));
            return reponse;
          }),
      ),
    );
  }
});
