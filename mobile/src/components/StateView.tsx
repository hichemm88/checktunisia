import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme/theme';
import { fr } from '@/i18n/fr';

export function LoadingView() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.cachet} size="large" />
      <Text style={styles.muted}>{fr.common.loading}</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorTitle}>{fr.common.error}</Text>
      {message ? <Text style={styles.muted}>{message}</Text> : null}
      {onRetry ? (
        <Pressable style={styles.retry} onPress={onRetry} accessibilityRole="button">
          <Text style={styles.retryText}>{fr.common.retry}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyView({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    gap: spacing.sm,
  },
  muted: { color: colors.fiche, fontSize: fontSize.sm, textAlign: 'center' },
  errorTitle: { color: colors.danger, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  emptyTitle: { color: colors.encre, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  retry: {
    marginTop: spacing.sm,
    backgroundColor: colors.cachet,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.btn,
  },
  retryText: { color: colors.blanc, fontWeight: fontWeight.semibold },
});
