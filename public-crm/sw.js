/**
 * Service worker du CRM de prospection — sert uniquement à recevoir les
 * notifications Web Push (§ Notifications push). Pas de cache applicatif :
 * cet outil interne n'a pas de besoin hors-ligne, un cache mal invalidé
 * ferait plus de mal (écran figé sur une ancienne version) que de bien.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Qayed CRM', body: event.data.text() };
  }

  const title = payload.title || 'Qayed CRM';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});
