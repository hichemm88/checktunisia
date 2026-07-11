import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi } from '@/api/notifications';
import { extractError } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme/theme';
import { fr, plural, interp } from '@/i18n/fr';

/**
 * Manager → receptionists broadcast (§4 addition). Sends a free-text message to the
 * receptionists of the active establishment; they receive it as a push + in their centre.
 */
export default function NotifyTeamScreen() {
  const router = useRouter();
  const activePropertyId = useAuthStore((s) => s.activePropertyId);
  const activeName = useAuthStore((s) => s.activePropertyName);
  const hotelName = useAuthStore((s) => s.user?.hotel?.name);
  const establishment = activeName || hotelName || '';
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const canSend = message.trim().length > 0 && !busy;

  async function send() {
    if (!canSend) return;
    setBusy(true);
    try {
      const { sent } = await notificationsApi.broadcast(message.trim(), activePropertyId);
      if (sent > 0) {
        Alert.alert('Qayed', plural(fr.notifications, 'composeSent', sent));
      } else {
        Alert.alert('Qayed', fr.notifications.composeNoRecipients);
      }
      router.back();
    } catch (err) {
      Alert.alert(fr.common.error, extractError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={fr.common.back}>
          <Ionicons name="chevron-back" size={26} color={colors.encre} />
        </Pressable>
        <Text style={styles.topTitle}>{fr.notifications.composeTitle}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.body}>
          <Text style={styles.subtitle}>
            {interp(fr.notifications.composeSubtitle, { name: establishment })}
          </Text>

          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder={fr.notifications.composePlaceholder}
            placeholderTextColor={colors.fiche}
            multiline
            maxLength={500}
            autoFocus
            textAlignVertical="top"
          />
          <Text style={styles.count}>{message.length}/500</Text>

          <Pressable style={[styles.sendBtn, !canSend && styles.disabled]} onPress={send} disabled={!canSend}>
            {busy ? (
              <ActivityIndicator color={colors.blanc} />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color={colors.blanc} />
                <Text style={styles.sendText}>{fr.notifications.composeSend}</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.papier },
  flex: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.encre },
  body: { padding: spacing.lg, gap: spacing.md },
  subtitle: { fontSize: fontSize.sm, color: colors.fiche },
  input: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.ligne,
    borderRadius: radius.input,
    padding: spacing.md,
    backgroundColor: colors.surface,
    fontSize: fontSize.md,
    color: colors.encre,
  },
  count: { alignSelf: 'flex-end', fontSize: fontSize.xs, color: colors.fiche },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cachet,
    borderRadius: radius.btn,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  disabled: { opacity: 0.5 },
  sendText: { color: colors.blanc, fontWeight: fontWeight.bold, fontSize: fontSize.md },
});
