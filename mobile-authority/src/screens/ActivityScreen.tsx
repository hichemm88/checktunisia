import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, type, radius } from '../theme/tokens';
import { bodyFont, textStart } from '../theme/typography';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { formatDate, formatTime } from '../lib/dates';
import { getAuditEntries, subscribeAudit, seedAuditOnce } from '../api/auditStore';
import { AuditEntry, AuditActionType, VerificationState } from '../api/types';

const ACTION_META: Record<AuditActionType, { icon: keyof typeof Ionicons.glyphMap; key: string }> = {
  verify: { icon: 'shield-checkmark-outline', key: 'activity.actionVerify' },
  control: { icon: 'clipboard-outline', key: 'activity.actionControl' },
  report: { icon: 'flag-outline', key: 'activity.actionReport' },
};
const RESULT_COLOR: Record<VerificationState, string> = {
  vert: colors.conforme, ambre: colors.vigilance, rouge: colors.critique,
};
const RESULT_KEY: Record<VerificationState, string> = {
  vert: 'activity.resultConforme', ambre: 'activity.resultNonDeclare', rouge: 'activity.resultWatchlist',
};

/** Mon activité (F6) — journal d'audit embarqué, LECTURE SEULE. */
export const ActivityScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    seedAuditOnce();
    setEntries(getAuditEntries());
    return subscribeAudit(() => setEntries(getAuditEntries()));
  }, []);

  return (
    <Screen title={t('activity.title')} onBack={() => navigation.goBack()}>
      <Text style={styles.subtitle}>{t('activity.subtitle')}</Text>

      {entries.length === 0 ? (
        <Text style={styles.empty}>{t('activity.empty')}</Text>
      ) : (
        <Card padded={false} style={{ marginTop: spacing.md }}>
          {entries.map((e, i) => {
            const meta = ACTION_META[e.action];
            return (
              <View key={e.id} style={[styles.row, i > 0 && styles.divider]}>
                <View style={styles.iconWrap}>
                  <Ionicons name={meta.icon} size={18} color={colors.cachet} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.action}>{t(meta.key)}</Text>
                  {e.subject ? <Text style={styles.subject} numberOfLines={1}>{e.subject}</Text> : null}
                  <View style={styles.metaLine}>
                    <Ionicons
                      name={e.has_location ? 'location' : 'location-outline'}
                      size={12}
                      color={e.has_location ? colors.fiche : colors.ligne}
                    />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {e.has_location && e.place_label
                        ? t('activity.at', { place: e.place_label })
                        : t('activity.noLocation')}
                    </Text>
                  </View>
                </View>
                <View style={styles.right}>
                  {e.result ? (
                    <Text style={[styles.result, { color: RESULT_COLOR[e.result] }]}>{t(RESULT_KEY[e.result])}</Text>
                  ) : null}
                  <Text style={styles.time}>{formatTime(e.created_at)}</Text>
                  <Text style={styles.date}>{formatDate(e.created_at, i18n.language)}</Text>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      <View style={styles.note}>
        <Ionicons name="lock-closed-outline" size={14} color={colors.fiche} />
        <Text style={styles.noteText}>{t('activity.transparencyNote')}</Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  subtitle: { fontFamily: bodyFont('regular'), fontSize: type.label, color: colors.fiche, textAlign: textStart },
  empty: { fontFamily: bodyFont('regular'), fontSize: type.label, color: colors.fiche, textAlign: 'center', marginTop: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, alignItems: 'flex-start' },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ligne },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.cachetDilue, alignItems: 'center', justifyContent: 'center' },
  action: { fontFamily: bodyFont('bold'), fontSize: type.label, color: colors.encre, textAlign: textStart },
  subject: { fontFamily: bodyFont('regular'), fontSize: type.caption, color: colors.encre, marginTop: 1, textAlign: textStart },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 3 },
  metaText: { fontFamily: bodyFont('regular'), fontSize: type.caption, color: colors.fiche, flexShrink: 1 },
  right: { alignItems: 'flex-end' },
  result: { fontFamily: bodyFont('bold'), fontSize: type.caption },
  time: { fontFamily: bodyFont('medium'), fontSize: type.caption, color: colors.encre, marginTop: 2 },
  date: { fontFamily: bodyFont('regular'), fontSize: 11, color: colors.fiche },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.xs },
  noteText: { flex: 1, fontFamily: bodyFont('regular'), fontSize: type.caption, color: colors.fiche, lineHeight: 18, textAlign: textStart },
});
