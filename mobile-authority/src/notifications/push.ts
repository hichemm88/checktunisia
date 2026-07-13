/**
 * Notifications push (F5) — FCM via expo-notifications.
 *
 * - Match watchlist critique dans la zone → push immédiate à l'agent de garde.
 * - Tap → ouvre l'écran de détail de l'alerte (deep-link, cf. navigation).
 * - Aucun emoji dans les notifications (§2 / §F5). Titre sobre.
 *
 * NOTE démo : l'enregistrement du token FCM et l'envoi réel sont côté serveur.
 * Ici on configure le handler, on demande la permission, et on expose un
 * déclencheur local pour SIMULER la réception d'une alerte critique pendant la
 * démonstration (scénario « rouge + push sur un second téléphone » — §8).
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import i18n from '../i18n';

export interface AlertPushData {
  type: 'watchlist_alert';
  alertId: string;
  severity: 'critique' | 'eleve' | 'moyen';
  establishment: string;
}

// Afficher les alertes même app au premier plan (une alerte critique prime).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function configurePushChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('watchlist-critical', {
      name: 'Alertes watchlist critiques',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      lightColor: '#C0392B',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

export async function requestPushPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** Extrait un AlertPushData d'une notification reçue (validation défensive). */
export function parseAlertData(raw: unknown): AlertPushData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (d.type !== 'watchlist_alert' || typeof d.alertId !== 'string') return null;
  return {
    type: 'watchlist_alert',
    alertId: d.alertId,
    severity: (d.severity as AlertPushData['severity']) ?? 'critique',
    establishment: typeof d.establishment === 'string' ? d.establishment : '',
  };
}

/** Simulation de démo : programme une push critique locale (scénario §8). */
export async function simulateCriticalAlert(alertId: string, establishment: string): Promise<void> {
  await configurePushChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('push.criticalTitle'),
      body: i18n.t('push.criticalBody', { establishment }),
      sound: 'default',
      data: { type: 'watchlist_alert', alertId, severity: 'critique', establishment } satisfies AlertPushData,
    },
    trigger: {
      seconds: 2,
      ...(Platform.OS === 'android' ? { channelId: 'watchlist-critical' } : {}),
    } as Notifications.TimeIntervalTriggerInput,
  });
}
