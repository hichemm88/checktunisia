import { Platform, ToastAndroid } from 'react-native';

/**
 * Discreet transient toast. Android has a native toast; iOS has none built-in, so the
 * message is silently skipped there (the app targets Android first — the action it
 * accompanies, e.g. an establishment switch, still happens either way).
 */
export function showToast(message: string): void {
  if (Platform.OS === 'android') {
    ToastAndroid.showWithGravity(message, ToastAndroid.SHORT, ToastAndroid.BOTTOM);
  }
}
