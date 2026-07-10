import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerPushToken } from '@/lib/push';
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme/theme';
import { fr } from '@/i18n/fr';

export const PUSH_PROMPT_SEEN_KEY = 'qayed.pushPromptSeen';

/**
 * In-app explainer shown BEFORE the OS permission prompt (§6.4) — better opt-in rates.
 * Only reached for managers who haven't yet been asked.
 */
export default function NotificationsPermissionScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function enable() {
    setBusy(true);
    try {
      await registerPushToken();
      await AsyncStorage.setItem(PUSH_PROMPT_SEEN_KEY, '1');
    } finally {
      setBusy(false);
      router.back();
    }
  }

  async function later() {
    await AsyncStorage.setItem(PUSH_PROMPT_SEEN_KEY, '1');
    router.back();
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Ionicons name="notifications" size={44} color={colors.cachet} />
        </View>
        <Text style={styles.title}>{fr.notifications.permissionTitle}</Text>
        <Text style={styles.subtitle}>{fr.notifications.permissionBody}</Text>
        <Text style={styles.examples}>{fr.notifications.permissionExamples}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.enableBtn} onPress={enable} disabled={busy}>
          <Text style={styles.enableText}>{fr.notifications.permissionEnable}</Text>
        </Pressable>
        <Pressable style={styles.laterBtn} onPress={later} disabled={busy}>
          <Text style={styles.laterText}>{fr.notifications.permissionLater}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.papier, justifyContent: 'space-between' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'], gap: spacing.lg },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.cachetDilue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.encre, textAlign: 'center' },
  subtitle: { fontSize: fontSize.base, color: colors.fiche, textAlign: 'center', lineHeight: 22 },
  examples: { fontSize: fontSize.sm, color: colors.cachet, textAlign: 'center', fontWeight: fontWeight.semibold },
  actions: { padding: spacing['2xl'], gap: spacing.md },
  enableBtn: { backgroundColor: colors.cachet, borderRadius: radius.btn, paddingVertical: spacing.lg, alignItems: 'center' },
  enableText: { color: colors.blanc, fontWeight: fontWeight.bold, fontSize: fontSize.md },
  laterBtn: { paddingVertical: spacing.md, alignItems: 'center' },
  laterText: { color: colors.fiche, fontWeight: fontWeight.semibold },
});
