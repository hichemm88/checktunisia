import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, type, radius } from '../theme/tokens';
import { bodyFont, textStart } from '../theme/typography';
import { Screen } from '../components/Screen';
import { StatCard } from '../components/StatCard';
import { CHEVRON_FORWARD } from '../components/icons';
import { formatTime } from '../lib/dates';
import { getActiveAlerts, getZoneStats, recentChecksFromAudit } from '../api/services';
import { seedAuditOnce } from '../api/auditStore';
import { useAuth } from '../auth/AuthContext';
import { ActiveAlert, ZoneStats, RecentCheck, VerificationState } from '../api/types';
import { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

const RESULT_META: Record<VerificationState, { color: string; icon: keyof typeof Ionicons.glyphMap; key: string }> = {
  vert: { color: colors.conforme, icon: 'checkmark-circle', key: 'home.resultConforme' },
  ambre: { color: colors.vigilance, icon: 'help-circle', key: 'home.resultNonDeclare' },
  rouge: { color: colors.critique, icon: 'warning', key: 'home.resultWatchlist' },
};

/** Accueil (F3) — alertes d'abord, stats ensuite, dernières vérifications. */
export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { agent } = useAuth();
  const [alerts, setAlerts] = useState<ActiveAlert[] | null>(null);
  const [stats, setStats] = useState<ZoneStats | null>(null);
  const [recent, setRecent] = useState<RecentCheck[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      seedAuditOnce();
      (async () => {
        const [a, s] = await Promise.all([getActiveAlerts().catch(() => []), getZoneStats().catch(() => null)]);
        if (!active) return;
        setAlerts(a);
        setStats(s);
        setRecent(recentChecksFromAudit());
      })();
      return () => { active = false; };
    }, []),
  );

  // Match critique non traité dans la zone → bandeau rouge en tête (F3.1).
  const criticalUnhandled = (alerts ?? []).filter((a) => a.severity === 'critique' && !a.acknowledged);

  return (
    <Screen title={agent ? t('home.greeting', { name: agent.name.split(' ')[0] }) : t('tabs.home')}>
      {agent ? <Text style={styles.zone}>{t('home.zone', { zone: agent.zone })}</Text> : null}

      {/* 1. Bandeau alertes — TOUJOURS en premier */}
      {alerts === null ? (
        <View style={styles.loading}><ActivityIndicator color={colors.cachet} /></View>
      ) : criticalUnhandled.length > 0 ? (
        <Pressable
          style={styles.alertCritical}
          onPress={() => navigation.navigate('AlertDetail', { alertId: criticalUnhandled[0].id })}
          accessibilityRole="button"
        >
          <View style={styles.alertIcon}>
            <Ionicons name="warning" size={26} color={colors.blanc} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>{t('home.alertCritical')}</Text>
            <Text style={styles.alertBody}>{t('home.alertCriticalBody', { count: criticalUnhandled.length })}</Text>
            <View style={styles.alertCta}>
              <Text style={styles.alertCtaText}>{t('home.seeAlert')}</Text>
              <Ionicons name={CHEVRON_FORWARD} size={16} color={colors.blanc} />
            </View>
          </View>
        </Pressable>
      ) : (
        <View style={styles.alertNone}>
          <Ionicons name="shield-checkmark" size={20} color={colors.conformeTexte} />
          <Text style={styles.alertNoneText}>{t('home.alertNone')}</Text>
        </View>
      )}

      {/* 2. Stats de zone (3 max, libellés complets) */}
      <Text style={styles.sectionTitle}>{t('home.statsTitle')}</Text>
      <View style={styles.statsRow}>
        <StatCard value={stats?.present ?? '—'} label={t('home.statPresent')} icon="people" />
        <StatCard value={stats?.arrivals_today ?? '—'} label={t('home.statArrivals')} icon="enter" />
        <StatCard value={stats?.active_hotels ?? '—'} label={t('home.statActiveHotels')} icon="business" />
      </View>

      {/* 3. Dernières vérifications de l'agent (5 max) */}
      <Text style={styles.sectionTitle}>{t('home.recentTitle')}</Text>
      {recent.length === 0 ? (
        <Text style={styles.empty}>{t('home.recentEmpty')}</Text>
      ) : (
        <View style={styles.recentCard}>
          {recent.map((r, i) => {
            const meta = RESULT_META[r.result];
            return (
              <View key={r.id} style={[styles.recentRow, i > 0 && styles.recentDivider]}>
                <Ionicons name={meta.icon} size={22} color={meta.color} />
                <Text style={styles.recentName} numberOfLines={1}>{r.name}</Text>
                <View style={styles.recentRight}>
                  <Text style={[styles.recentResult, { color: meta.color }]}>{t(meta.key)}</Text>
                  <Text style={styles.recentTime}>{formatTime(r.at)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  zone: { fontFamily: bodyFont('medium'), fontSize: type.label, color: colors.fiche, marginBottom: spacing.lg, textAlign: textStart },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  alertCritical: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'center',
    backgroundColor: colors.critique, borderRadius: radius.card, padding: spacing.lg,
  },
  alertIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontFamily: bodyFont('bold'), fontSize: type.body, color: colors.blanc, textAlign: textStart },
  alertBody: { fontFamily: bodyFont('regular'), fontSize: type.label, color: 'rgba(255,255,255,0.9)', marginTop: 2, textAlign: textStart, lineHeight: 20 },
  alertCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  alertCtaText: { fontFamily: bodyFont('bold'), fontSize: type.label, color: colors.blanc },
  alertNone: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.conformeFond, borderRadius: radius.card, padding: spacing.lg,
  },
  alertNoneText: { fontFamily: bodyFont('bold'), fontSize: type.label, color: colors.conformeTexte },
  sectionTitle: { fontFamily: bodyFont('bold'), fontSize: type.heading, color: colors.encre, marginTop: spacing.xl, marginBottom: spacing.md, textAlign: textStart },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  empty: { fontFamily: bodyFont('regular'), fontSize: type.label, color: colors.fiche, textAlign: textStart },
  recentCard: { backgroundColor: colors.blanc, borderRadius: radius.card, borderWidth: 1, borderColor: colors.ligne, paddingHorizontal: spacing.lg },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  recentDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ligne },
  recentName: { flex: 1, fontFamily: bodyFont('medium'), fontSize: type.label, color: colors.encre, textAlign: textStart },
  recentRight: { alignItems: 'flex-end' },
  recentResult: { fontFamily: bodyFont('bold'), fontSize: type.caption },
  recentTime: { fontFamily: bodyFont('regular'), fontSize: type.caption, color: colors.fiche },
});
