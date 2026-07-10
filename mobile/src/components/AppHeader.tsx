import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, shadow } from '@/theme/theme';
import { useAuthStore } from '@/stores/authStore';
import { notificationsApi } from '@/api/notifications';
import { unregisterPushToken } from '@/lib/push';
import { toMobileRole } from '@/types';
import { QayedSeal } from './QayedSeal';

/**
 * Persistent header (§5.0): قيد seal + active establishment name + screen title,
 * language chip (FR), a manager-only notification bell (unread badge, §5.2), and logout.
 */
export function AppHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const activeName = useAuthStore((s) => s.activePropertyName);
  const hotelName = useAuthStore((s) => s.user?.hotel?.name);
  const role = useAuthStore((s) => s.user?.role);
  const logout = useAuthStore((s) => s.logout);
  const establishment = activeName || hotelName || 'Qayed';
  const isManager = role ? toMobileRole(role) === 'manager' : false;

  async function handleLogout() {
    await unregisterPushToken();
    await logout();
  }

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: notificationsApi.unreadCount,
    enabled: isManager,
    refetchInterval: 60_000,
  });

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
        {isManager ? (
          <Pressable
            onPress={() => router.push('/notifications')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={24} color={colors.encre} />
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
        <Pressable
          onPress={handleLogout}
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
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.blanc, fontSize: 10, fontWeight: fontWeight.bold },
});
