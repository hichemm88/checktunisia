import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueueStore } from '@/stores/queueStore';
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme/theme';
import { fr, plural } from '@/i18n/fr';

/** Visible indicator that offline check-ins are queued for sending (§8). */
export function PendingBanner() {
  const items = useQueueStore((s) => s.items);
  const processing = useQueueStore((s) => s.processing);
  const processAll = useQueueStore((s) => s.processAll);

  if (items.length === 0) return null;

  return (
    <Pressable style={styles.banner} onPress={() => processAll()} accessibilityRole="button">
      <Ionicons name={processing ? 'sync' : 'cloud-upload-outline'} size={18} color={colors.vigilanceTexte} />
      <Text style={styles.text}>
        {processing ? fr.offline.sending : plural(fr.offline, 'pending', items.length)}
      </Text>
      {!processing ? <Text style={styles.retry}>{fr.offline.retry}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.vigilanceFond,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  text: { flex: 1, color: colors.vigilanceTexte, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  retry: { color: colors.vigilanceTexte, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
