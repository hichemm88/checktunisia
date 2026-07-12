import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { dashboardApi } from '@/api/dashboard';
import { checkInsApi } from '@/api/checkIns';
import { useAuthStore } from '@/stores/authStore';
import { useDraftSeedStore } from '@/stores/draftSeedStore';
import { toMobileRole } from '@/types';
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
  const queryClient = useQueryClient();
  const firstName = useAuthStore((s) => s.user?.first_name ?? '');
  const role = useAuthStore((s) => s.user?.role);
  const activePropertyId = useAuthStore((s) => s.activePropertyId);
  const activePropertyName = useAuthStore((s) => s.activePropertyName ?? '');
  const setActiveProperty = useAuthStore((s) => s.setActiveProperty);
  const isManager = role ? toMobileRole(role) === 'manager' : false;

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', activePropertyId],
    queryFn: dashboardApi.get,
  });

  const checkout = useMutation({
    mutationFn: (id: string) => checkInsApi.checkout(id, new Date().toISOString()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['check-ins'] });
    },
    onError: (e) => Alert.alert(fr.common.error, extractError(e)),
  });

  function confirmCheckout(id: string) {
    Alert.alert('Check-out', 'Confirmer le départ de ce voyageur ?', [
      { text: fr.common.cancel, style: 'cancel' },
      { text: 'Check-out', onPress: () => checkout.mutate(id) },
    ]);
  }

  function startArrival(a: NonNullable<DashboardData['arrivals_today']>[number]) {
    useDraftSeedStore.getState().setSeed({
      draftId: a.id,
      roomId: a.room_id ?? undefined,
      roomNumber: a.room ?? undefined,
      bookingRef: a.booking_reference ?? undefined,
      checkInDate: a.check_in_date.slice(0, 10),
      checkOutDate: a.expected_check_out_date.slice(0, 10),
      adults: a.adults_count,
      children: a.children_count,
    });
    router.push('/check-in');
  }

  async function switchProperty(id: string, name: string) {
    if (id === activePropertyId) return;
    await setActiveProperty(id, name);
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['check-ins'] });
  }

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
          isManager={isManager}
          onNewCheckin={() => router.push('/check-in')}
          onSeeAll={() => router.push('/history')}
          onOpenFiche={(id) => router.push(`/fiche/${id}`)}
          onOpenPresent={() => router.push({ pathname: '/history', params: { filter: 'active' } })}
          onOpenProperties={() => router.push('/properties')}
          onStartArrival={startArrival}
          onCheckout={confirmCheckout}
          onSwitchProperty={switchProperty}
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
  isManager,
  onNewCheckin,
  onSeeAll,
  onOpenFiche,
  onOpenPresent,
  onOpenProperties,
  onStartArrival,
  onCheckout,
  onSwitchProperty,
  refreshing,
  onRefresh,
}: {
  data: DashboardData;
  firstName: string;
  propertyName: string;
  isManager: boolean;
  onNewCheckin: () => void;
  onSeeAll: () => void;
  onOpenFiche: (id: string) => void;
  onOpenPresent: () => void;
  onOpenProperties: () => void;
  onStartArrival: (a: NonNullable<DashboardData['arrivals_today']>[number]) => void;
  onCheckout: (id: string) => void;
  onSwitchProperty: (id: string, name: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { today, month, occupancy_7d, recent_check_ins } = data;
  const present = today.currently_present;
  const arrivals = data.arrivals_today ?? [];
  const departures = data.departures_today_list ?? [];
  const summary = data.properties_summary ?? [];
  const other = data.other_properties;
  const afterTwoPm = new Date().getHours() >= 14;

  // §4/§5: Présents + Taux d'occupation for everyone; Check-ins ce mois for managers only.
  const tiles = useMemo(() => {
    const t: { icon: string; label: string; value: string | number }[] = [
      { icon: 'people-outline', label: fr.dashboard.statPresent, value: present },
      { icon: 'pie-chart-outline', label: fr.dashboard.statOccupancyRate, value: `${today.occupancy_rate}%` },
    ];
    if (isManager) {
      t.push({ icon: 'calendar-outline', label: fr.dashboard.statCheckinsMonth, value: month.check_ins_total });
    }
    return t;
  }, [today, month, present, isManager]);

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
          <Pressable style={styles.ring} onPress={onOpenPresent} accessibilityRole="button">
            <Text style={styles.ringPct}>{today.occupancy_rate}%</Text>
            <Text style={styles.ringSub}>{plural(fr.dashboard, 'presentCount', present)}</Text>
          </Pressable>
        </View>
        <Pressable style={styles.bannerBtn} onPress={onNewCheckin} accessibilityRole="button">
          <Ionicons name="add" size={20} color={colors.cachet} />
          <Text style={styles.bannerBtnText}>{fr.dashboard.newCheckin}</Text>
        </Pressable>
      </View>

      {/* Multi-establishment switcher (§5) — any user with more than one property */}
      {summary.length > 1 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{fr.dashboard.switcherTitle}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherRow}>
            {summary.map((p) => (
              <Pressable
                key={p.id}
                style={[styles.propChip, p.is_active && styles.propChipOn]}
                onPress={() => onSwitchProperty(p.id, p.name)}
              >
                <Text style={[styles.propChipName, p.is_active && styles.propChipNameOn]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.propChipMeta, p.is_active && styles.propChipMetaOn]}>
                  {p.occupancy_rate}% · {plural(fr.dashboard, 'presentCount', p.present)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

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

      {/* Arrivées aujourd'hui (§4) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {fr.dashboard.arrivalsToday} · {arrivals.length}
        </Text>
        {arrivals.length === 0 ? (
          <Text style={styles.emptyRecent}>{fr.dashboard.noArrivalsToday}</Text>
        ) : (
          arrivals.map((a) => (
            <View key={a.id} style={styles.actionRow}>
              <Avatar name={a.guest_name || a.booking_reference || a.reference} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={styles.actionName} numberOfLines={1}>
                  {a.guest_name || a.booking_reference || a.reference}
                </Text>
                <Text style={styles.actionMeta} numberOfLines={1}>
                  {a.room ? interp(fr.dashboard.room, { room: a.room }) : fr.dashboard.noRoom}
                </Text>
              </View>
              <Pressable style={styles.rowBtn} onPress={() => onStartArrival(a)}>
                <Text style={styles.rowBtnText}>{fr.dashboard.doCheckin}</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* Départs aujourd'hui (§4) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {fr.dashboard.departuresToday} · {departures.length}
        </Text>
        {departures.length === 0 ? (
          <Text style={styles.emptyRecent}>{fr.dashboard.noDeparturesToday}</Text>
        ) : (
          departures.map((d) => (
            <View key={d.id} style={styles.actionRow}>
              {afterTwoPm ? <View style={styles.amberDot} /> : null}
              <Avatar name={d.guest_name || d.reference} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={styles.actionName} numberOfLines={1}>
                  {d.guest_name || d.reference}
                </Text>
                <Text style={styles.actionMeta} numberOfLines={1}>
                  {d.room ? interp(fr.dashboard.room, { room: d.room }) : fr.dashboard.noRoom}
                </Text>
              </View>
              <Pressable style={[styles.rowBtn, styles.rowBtnOutline]} onPress={() => onCheckout(d.id)}>
                <Ionicons name="exit-outline" size={15} color={colors.cachet} />
                <Text style={styles.rowBtnTextOutline}>{fr.dashboard.doCheckout}</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* Autres établissements (§4) */}
      {other && other.arrivals + other.departures > 0 ? (
        <Pressable style={styles.otherLine} onPress={onOpenProperties}>
          <Ionicons name="business-outline" size={16} color={colors.fiche} />
          <Text style={styles.otherText}>
            {interp(fr.dashboard.otherProperties, { arrivals: other.arrivals, departures: other.departures })}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.fiche} />
        </Pressable>
      ) : null}

      {/* Occupation 7 jours (§2) — managers only (§5) */}
      {isManager && occupancy_7d && occupancy_7d.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{fr.dashboard.occupancy7d}</Text>
          <Text style={styles.chartSub}>
            {interp(fr.dashboard.occupancySub, { name: propertyName || '—', count: data.room_count ?? 0 })}
          </Text>
          <View style={styles.chart}>
            {occupancy_7d.map((d) => {
              const h = Math.max((d.rate / 100) * 72, 3);
              return (
                <View key={d.date} style={styles.chartCol}>
                  <Text style={[styles.chartCount, d.is_today && styles.todayText]}>{d.rate}%</Text>
                  {d.is_future ? (
                    <View style={[styles.bar, styles.barFuture, { height: h }]} />
                  ) : (
                    <View style={[styles.bar, { height: h, backgroundColor: d.is_today ? colors.cachet : colors.cachetDilue }]} />
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

  switcherRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  propChip: {
    minWidth: 140,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.ligne,
    backgroundColor: colors.surface,
    gap: 2,
  },
  propChipOn: { backgroundColor: colors.cachetDilue, borderColor: colors.cachet },
  propChipName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.encre },
  propChipNameOn: { color: colors.cachet },
  propChipMeta: { fontSize: fontSize.xs, color: colors.fiche },
  propChipMetaOn: { color: colors.cachet },

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

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  actionName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.encre },
  actionMeta: { fontSize: fontSize.sm, color: colors.fiche, marginTop: 1 },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cachet,
    borderRadius: radius.btn,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowBtnText: { color: colors.blanc, fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  rowBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.cachet },
  rowBtnTextOutline: { color: colors.cachet, fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  amberDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.vigilance },

  otherLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    padding: spacing.md,
    ...shadow.card,
  },
  otherText: { flex: 1, fontSize: fontSize.sm, color: colors.fiche },

  chartSub: { fontSize: fontSize.xs, color: colors.fiche, marginTop: -spacing.xs },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, height: 104 },
  chartCol: { flex: 1, alignItems: 'center', gap: 4 },
  chartCount: { fontSize: 10, color: colors.fiche, fontWeight: fontWeight.semibold },
  bar: { width: '70%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barFuture: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.cachet, borderStyle: 'dashed' },
  chartLabel: { fontSize: 9, color: colors.fiche },
  todayText: { color: colors.cachet, fontWeight: fontWeight.bold },

  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  recentName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.encre },
  recentMeta: { fontSize: fontSize.sm, color: colors.fiche, marginTop: 1 },
  recentRight: { alignItems: 'flex-end', gap: 4 },
  recentDate: { fontSize: fontSize.xs, color: colors.fiche },
  emptyRecent: { color: colors.fiche, fontSize: fontSize.sm, paddingVertical: spacing.md },
});
