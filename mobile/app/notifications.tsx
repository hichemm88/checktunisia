import { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi, type AppNotification, type NotificationType } from '@/api/notifications';
import { useAuthStore } from '@/stores/authStore';
import { toMobileRole } from '@/types';
import { LoadingView, ErrorView, EmptyView } from '@/components/StateView';
import { extractError } from '@/lib/api';
import { shortDate, timeOfDay } from '@/lib/format';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '@/theme/theme';
import { fr } from '@/i18n/fr';

const TYPE_META: Record<NotificationType, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  check_in: { icon: 'checkmark-circle', color: colors.conforme, label: fr.notifications.typeCheckIn },
  check_out: { icon: 'repeat', color: colors.cachet, label: fr.notifications.typeCheckOut },
  fiche_updated: { icon: 'create', color: colors.vigilance, label: fr.notifications.typeUpdated },
  fiche_cancelled: { icon: 'close-circle', color: colors.danger, label: fr.notifications.typeCancelled },
  fiche_pending: { icon: 'alert-circle', color: colors.vigilance, label: fr.notifications.typePending },
  manager_message: { icon: 'chatbubble-ellipses', color: colors.cachet, label: fr.notifications.typeMessage },
};

const FILTERS: { key: 'all' | NotificationType; label: string }[] = [
  { key: 'all', label: fr.notifications.filterAll },
  { key: 'check_in', label: fr.notifications.typeCheckIn },
  { key: 'check_out', label: fr.notifications.typeCheckOut },
  { key: 'fiche_updated', label: fr.notifications.typeUpdated },
];

export default function NotificationCenterScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const isManager = role ? toMobileRole(role) === 'manager' : false;
  const [filter, setFilter] = useState<'all' | NotificationType>('all');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const items = useMemo(() => {
    const all = data?.data ?? [];
    return filter === 'all' ? all : all.filter((n) => n.type === filter);
  }, [data, filter]);

  function openItem(n: AppNotification) {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.check_in_id) router.push(`/fiche/${n.check_in_id}`);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={fr.common.back}>
          <Ionicons name="chevron-back" size={26} color={colors.encre} />
        </Pressable>
        <Text style={styles.topTitle}>{fr.notifications.title}</Text>
        <View style={styles.topActions}>
          {isManager ? (
            <Pressable
              onPress={() => router.push('/notify-team')}
              hitSlop={10}
              accessibilityLabel={fr.notifications.composeTitle}
            >
              <Ionicons name="paper-plane-outline" size={22} color={colors.cachet} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => markAll.mutate()} hitSlop={10} disabled={markAll.isPending}>
            <Ionicons name="checkmark-done" size={22} color={colors.cachet} />
          </Pressable>
        </View>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable key={f.key} style={[styles.chip, active && styles.chipOn]} onPress={() => setFilter(f.key)}>
              <Text style={[styles.chipText, active && styles.chipTextOn]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorView message={extractError(error)} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyView title={fr.notifications.empty} subtitle={fr.notifications.emptySub} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <Row n={item} onPress={() => openItem(item)} />}
        />
      )}
    </SafeAreaView>
  );
}

function Row({ n, onPress }: { n: AppNotification; onPress: () => void }) {
  const meta = TYPE_META[n.type] ?? TYPE_META.check_in;
  return (
    <Pressable style={[styles.row, !n.read_at && styles.rowUnread]} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: `${meta.color}22` }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {n.title}
        </Text>
        <Text style={styles.rowBody} numberOfLines={2}>
          {n.body}
        </Text>
        <Text style={styles.rowTime}>
          {shortDate(n.created_at)} · {timeOfDay(n.created_at)}
        </Text>
      </View>
      {!n.read_at ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.papier },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.encre },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  filters: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.ligne,
  },
  chipOn: { backgroundColor: colors.cachet, borderColor: colors.cachet },
  chipText: { fontSize: fontSize.sm, color: colors.fiche, fontWeight: fontWeight.semibold },
  chipTextOn: { color: colors.blanc },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    ...shadow.card,
  },
  rowUnread: { borderWidth: 1, borderColor: colors.cachetDilue },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.encre },
  rowBody: { fontSize: fontSize.sm, color: colors.fiche, marginTop: 1 },
  rowTime: { fontSize: fontSize.xs, color: colors.fiche, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.cachet },
});
