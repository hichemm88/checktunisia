import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { notificationsApi } from '@/api/notifications';

/**
 * Push notifications (§6). The manager receives a push for every receptionist action on their
 * properties. The notification centre (server) is the source of truth — pushes are just the
 * real-time nudge — so a missed push never loses an event (§6.4 / critère 6).
 */

const PUSH_TOKEN_KEY = 'qayed.pushToken';

/** Foreground behaviour + Android channel. Call once at app start. */
export async function configureNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // `shouldShowAlert` is the legacy field; banner/list are the SDK 52 successors.
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Qayed',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#5346A8',
    });
  }
}

/** Whether the OS notification permission is already granted. */
export async function hasPushPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Request permission (call AFTER the in-app explainer — §6.4), obtain the Expo push token,
 * and register it with the backend. Returns the token, or null if unavailable/denied.
 */
export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // Push tokens require a physical device.

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId;

  // Obtaining an Expo push token can fail (e.g. Expo Go without a projectId) — never throw.
  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    token = result.data;
  } catch {
    return null;
  }

  try {
    await notificationsApi.registerDevice(token, Platform.OS === 'ios' ? 'ios' : 'android');
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch {
    // Registration failure must never block the user — retried on next app start.
    return token;
  }
  return token;
}

/** Deregister the device's token on logout so pushes stop. */
export async function unregisterPushToken(): Promise<void> {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return;
  try {
    await notificationsApi.removeDevice(token);
  } catch {
    // ignore — token will simply age out server-side
  }
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
}

/** Route a tapped notification to the relevant fiche, or the notification centre (§6.1). */
function handleDeepLink(data: Record<string, unknown> | undefined): void {
  const checkInId = data?.check_in_id as string | undefined;
  if (checkInId) router.push(`/fiche/${checkInId}`);
  else router.push('/notifications');
}

/** Wire foreground + tap listeners. Returns a cleanup function. */
export function addNotificationListeners(onForeground?: () => void): () => void {
  const receivedSub = Notifications.addNotificationReceivedListener(() => {
    onForeground?.();
  });
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    handleDeepLink(response.notification.request.content.data as Record<string, unknown>);
  });
  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
