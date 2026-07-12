import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { dashboardApi } from '@/api/dashboard';
import { useAuthStore } from '@/stores/authStore';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingView, ErrorView } from '@/components/StateView';
import { extractError } from '@/lib/api';
import { shortDate } from '@/lib/format';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '@/theme/theme';
import { fr, plural, interp } from '@/i18n/fr';
import type { DashboardData } from '@/types';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return fr.dashboard.greetingMorning;
  if (h < 18) return fr.dashboard.greetingAfternoon;
  return fr.dashboard.greetingEvening;
}

export default function DashboardScreen() {
  const router = useRouter();
  const firstName = useAuthStore((s) => s.user?.first_name ?? '');
  const activePropertyId = useAuthStore((s) => s.activePropertyId);
  const activePropertyName = useAuthStore((s) => s.activePropertyName ?? '');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', activePropertyId],
    queryFn: dashboardApi.get,
  });

  return (
    <View style={styles.screen}>
      <AppHeader title={fr.dashboard.title} />
      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorView message={extractError(error)} onRetry={refetch} />
      ) : data ? (
        <DashboardBody
          data={data}
          firstName={firstName}
          propertyName={activePropertyName}
          onNewCheckin={() => router.push('/check-in')}
          onSeeAll={() => router.push('/history')}
          onOpenFiche={(id) => router.push(`/fiche/${id}`)}
          refreshing={isRefetching}
          onRefresh={refetch}
        />
      ) : null}
    </View>
  );
}

function DashboardBody({
  data,
  firstName,
  propertyName,
  onNewCheckin,
  onSeeAll,
  onOpenFiche,
  refreshing,
  onRefresh,
}: {
  data: DashboardData;
  firstName: string;
  propertyName: string;
  onNewCheckin: () => void;
  onSeeAll: () => void;
  onOpenFiche: (id: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { today, month, occupancy_7d, recent_check_ins } = data;
  const present = today.currently_present;

  const tiles = useMemo(
    () => [
      { icon: 'airplane-outline', label: fr.dashboard.statArrivalsExpected, value: today.arrivals_expected },
      { icon: 'checkmark-done-outline', label: fr.dashboard.statCheckinsDone, value: today.arrivals_done },
      { icon: 'people-outline', label: fr.dashboard.statPresent, value: present },
      { icon: 'exit-outline', label: fr.dashboard.statDeparturesToday, value: today.departures_today },
      { icon: 'pie-chart-outline', label: fr.dashboard.statOccupancyRate, value: `${today.occupancy_rate}%` },
      { icon: 'calendar-outline', label: fr.dashboard.statCheckinsMonth, value: month.check_ins_total },
    ],
    [today, month, present],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.body}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cachet} />}
    >
      {/* Bandeau violet */}
      <View style={styles.banner}>
        <View style={styles.bannerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {greeting()}, {firstName}
            </Text>
            <Text style={styles.bannerCounts}>
              {today.arrivals_expected} {fr.dashboard.arrivals} · {today.departures_today} {fr.dashboard.departures}
            </Text>
          </View>
          <View style={styles.ring}>
            <Text style={styles.ringPct}>{today.occupancy_rate}%</Text>
            <Text style={styles.ringSub}>{plural(fr.dashboard, 'presentCount', present)}</Text>
          </View>
        </View>
        <Pressable style={styles.bannerBtn} onPress={onNewCheckin} accessibilityRole="button">
          <Ionicons name="add" size={20} color={colors.cachet} />
          <Text style={styles.bannerBtnText}>{fr.dashboard.newCheckin}</Text>
        </Pressable>
      </View>

      {/* KPI tiles */}
      <View style={styles.tileGrid}>
        {tiles.map((t) => (
          <View key={t.label} style={styles.tile}>
            <Ionicons name={t.icon as never} size={18} color={colors.cachet} />
            <Text style={styles.tileValue}>{t.value}</Text>
            <Text style={styles.tileLabel}>{t.label}</Text>
          </View>
        ))}
      </View>

      {/* Occupation — 7 jours (§2) */}
      {occupancy_7d && occupancy_7d.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{fr.dashboard.occupancy7d}</Text>
          {propertyName || data.room_count != null ? (
            <Text style={styles.chartSub}>
              {interp(fr.dashboard.occupancySub, {
                name: propertyName || '—',
                count: data.room_count ?? 0,
              })}
            </Text>
          ) : null}
          <View style={styles.chart}>
            {occupancy_7d.map((d) => {
              const h = Math.max((d.rate / 100) * 72, 3);
              const barColor = d.is_today ? colors.cachet : colors.cachetDilue;
              return (
                <View key={d.date} style={styles.chartCol}>
                  <Text style={[styles.chartCount, d.is_today && styles.todayText]}>{d.rate}%</Text>
                  {d.is_future ? (
                    // Projection — dashed outline instead of a solid fill.
                    <View style={[styles.bar, styles.barFuture, { height: h }]} />
                  ) : (
                    <View style={[styles.bar, { height: h, backgroundColor: barColor }]} />
                  )}
                  <Text style={[styles.chartLabel, d.is_today && styles.todayText]}>{d.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Récents */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{fr.dashboard.recent}</Text>
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text style={styles.seeAll}>{fr.dashboard.seeAll}</Text>
          </Pressable>
        </View>
        {recent_check_ins.length === 0 ? (
          <Text style={styles.emptyRecent}>{fr.dashboard.noRecentCheckin}</Text>
        ) : (
          recent_check_ins.map((c) => (
            <Pressable key={c.id} style={styles.recentRow} onPress={() => onOpenFiche(c.id)}>
              <Avatar name={c.primary_guest} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.recentName} numberOfLines={1}>
                  {c.primary_guest || fr.dashboard.noName}
                </Text>
                <Text style={styles.recentMeta} numberOfLines={1}>
                  {c.room ? interp(fr.dashboard.room, { room: c.room }) : fr.dashboard.noRoom} · {c.reference}
                </Text>
              </View>
              <View style={styles.recentRight}>
                <StatusBadge status={c.status} />
                <Text style={styles.recentDate}>{shortDate(c.check_in_date)}</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.papier },
  body: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },

  banner: { backgroundColor: colors.cachet, borderRadius: radius.card, padding: spacing.xl, gap: spacing.lg },
  bannerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  greeting: { color: colors.blanc, fontSize: fontSize.xl, fontWeight: fontWeight.black },
  bannerCounts: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.sm, marginTop: 2 },
  ring: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: { color: colors.blanc, fontSize: fontSize.lg, fontWeight: fontWeight.black },
  ringSub: { color: 'rgba(255,255,255,0.75)', fontSize: 9 },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.blanc,
    borderRadius: radius.btn,
    paddingVertical: spacing.md,
  },
  bannerBtnText: { color: colors.cachet, fontWeight: fontWeight.bold, fontSize: fontSize.md },

  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    padding: spacing.md,
    gap: 2,
    ...shadow.card,
  },
  tileValue: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.encre },
  tileLabel: { fontSize: fontSize.xs, color: colors.fiche },

  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md, ...shadow.card },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.encre },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { color: colors.cachet, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },

  chartSub: { fontSize: fontSize.xs, color: colors.fiche, marginTop: -spacing.xs },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, height: 104 },
  chartCol: { flex: 1, alignItems: 'center', gap: 4 },
  chartCount: { fontSize: 10, color: colors.fiche, fontWeight: fontWeight.semibold },
  bar: { width: '70%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barFuture: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.cachet,
    borderStyle: 'dashed',
  },
  chartLabel: { fontSize: 9, color: colors.fiche },
  todayText: { color: colors.cachet, fontWeight: fontWeight.bold },

  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  recentName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.encre },
  recentMeta: { fontSize: fontSize.sm, color: colors.fiche, marginTop: 1 },
  recentRight: { alignItems: 'flex-end', gap: 4 },
  recentDate: { fontSize: fontSize.xs, color: colors.fiche },
  emptyRecent: { color: colors.fiche, fontSize: fontSize.sm, paddingVertical: spacing.md },
});
