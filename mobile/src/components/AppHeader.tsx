import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, shadow } from '@/theme/theme';
import { useAuthStore } from '@/stores/authStore';
import { QayedSeal } from './QayedSeal';

/**
 * Persistent header (§5.0): قيد seal + active establishment name + screen title,
 * language chip (FR), and logout. Manager-only notification bell lands in Phase 3.
 */
export function AppHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const activeName = useAuthStore((s) => s.activePropertyName);
  const hotelName = useAuthStore((s) => s.user?.hotel?.name);
  const logout = useAuthStore((s) => s.logout);
  const establishment = activeName || hotelName || 'Qayed';

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        <QayedSeal size={34} />
        <View style={styles.titles}>
          <Text style={styles.establishment} numberOfLines={1}>
            {establishment}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={styles.langChip}>
          <Text style={styles.langText}>FR</Text>
        </View>
        <Pressable
          onPress={() => logout()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
        >
          <Ionicons name="log-out-outline" size={24} color={colors.fiche} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titles: { flex: 1 },
  establishment: {
    fontSize: fontSize.xs,
    color: colors.fiche,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: { fontSize: fontSize.lg, color: colors.encre, fontWeight: fontWeight.bold },
  langChip: {
    borderWidth: 1,
    borderColor: colors.ligne,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  langText: { fontSize: fontSize.xs, color: colors.fiche, fontWeight: fontWeight.bold },
});
