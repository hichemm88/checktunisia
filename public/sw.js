/* Service worker minimal — rend Qayed installable (Chrome/Android : vraie app,
   permission caméra permanente, plein écran). Volontairement SANS cache : le
   navigateur récupère chaque ressource normalement, donc aucun risque de
   contenu périmé après un déploiement. skipWaiting + clients.claim → les
   nouvelles versions du service worker prennent effet immédiatement. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
// Un handler fetch doit exister pour l'installabilité, mais on ne répond pas
// nous-mêmes (passthrough) → comportement réseau natif, aucune mise en cache.
self.addEventListener('fetch', () => {});
