/**
 * Abonnement Web Push (§ Notifications push) — API navigateur standard,
 * signée VAPID côté backend (voir config/webpush.php). La clé publique est
 * figée au build (Vite, voir Dockerfile.crm) : ce n'est qu'une clé PUBLIQUE,
 * l'embarquer dans le bundle n'a rien de sensible.
 */

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** L'API Push veut la clé VAPID en Uint8Array, pas en base64 URL-safe brute. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function toPayload(subscription: PushSubscription): PushSubscriptionPayload {
  const json = subscription.toJSON();

  return {
    endpoint: json.endpoint!,
    keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
  };
}

/** Demande la permission puis crée l'abonnement navigateur. Ne parle pas au backend (voir crmApi côté appelant). */
export async function subscribeToPush(): Promise<PushSubscriptionPayload> {
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error('Notifications non configurées pour cet environnement.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permission refusée.');
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? (await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  }));

  return toPayload(subscription);
}

/** @returns l'endpoint désabonné (à transmettre au backend), ou null si l'appareil n'était pas abonné. */
export async function unsubscribeFromPush(): Promise<string | null> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) return null;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  return endpoint;
}

export async function currentPushEndpoint(): Promise<string | null> {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  return subscription?.endpoint ?? null;
}
