import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, type, radius } from '../theme/tokens';
import { bodyFont, textStart } from '../theme/typography';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { DataRow } from '../components/DataRow';
import { SeverityBadge, SourceTag } from '../components/SeverityBadge';
import { formatDate } from '../lib/dates';
import { nationalityName } from '../lib/countries';
import { getAlert } from '../api/services';
import { CENTRAL_PHONE } from '../api/seed';
import { ActiveAlert } from '../api/types';
import { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'AlertDetail'>;

/**
 * Détail d'une alerte watchlist (§7.9) — cible du deep-link push (F5).
 *
 * ATTENTION (§9.1 / F5) : bug connu de l'app hébergeur = deep-link cassé
 * « Ressource not found ». Ici le cas « alerte introuvable / autre contexte »
 * est géré PROPREMENT : on affiche un message clair, jamais un crash.
 */
export const AlertDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { alertId } = route.params;
  const { t, i18n } = useTranslation();
  const back = () => navigation.goBack();
  const [alert, setAlert] = useState<ActiveAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [ack, setAck] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const a = await getAlert(alertId);
        if (active) { setAlert(a); setAck(a?.acknowledged ?? false); }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [alertId]);

  if (loading) {
    return (
      <Screen title={t('alert.detailTitle')} scroll={false} onBack={back}>
        <View style={styles.center}><ActivityIndicator color={colors.cachet} /></View>
      </Screen>
    );
  }

  // Deep-link vers une alerte disparue / hors zone → message clair (pas de crash).
  if (!alert) {
    return (
      <Screen title={t('alert.detailTitle')} scroll={false} onBack={back}>
        <View style={styles.center}>
          <Ionicons name="help-buoy-outline" size={54} color={colors.fiche} />
          <Text style={styles.notFoundTitle}>{t('alert.notFound')}</Text>
          <Text style={styles.notFoundHint}>{t('alert.notFoundHint')}</Text>
        </View>
      </Screen>
    );
  }

  const isCritical = alert.severity === 'critique';
  const call = () => Linking.openURL(`tel:${CENTRAL_PHONE}`);

  return (
    <Screen title={t('alert.detailTitle')} onBack={back}>
      <View style={styles.badges}>
        <SeverityBadge severity={alert.severity} large />
        <SourceTag source={alert.source} />
      </View>

      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.sectionLabel}>{t('alert.person')}</Text>
        <DataRow label={t('result.name')} value={alert.person_name} />
        <DataRow label={t('result.nationality')} value={nationalityName(alert.nationality_code, i18n.language)} />
        <DataRow label={t('alert.establishment')} value={alert.establishment_name} />
      </Card>

      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={14} color={colors.fiche} />
        <Text style={styles.meta}>{t('alert.matchedAt', { date: formatDate(alert.matched_at, i18n.language) })}</Text>
      </View>

      {/* Consigne opérationnelle */}
      <View style={[styles.consigne, isCritical ? styles.consigneCritical : styles.consigneNormal]}>
        <Ionicons name={isCritical ? 'warning' : 'information-circle'} size={22} color={isCritical ? colors.blanc : colors.cachetFonce} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.consigneLabel, { color: isCritical ? 'rgba(255,255,255,0.85)' : colors.cachetFonce }]}>{t('alert.consigne')}</Text>
          <Text style={[styles.consigneText, { color: isCritical ? colors.blanc : colors.encre }]}>{alert.consigne}</Text>
        </View>
      </View>

      <Button label={t('result.callCentral')} icon="call" variant={isCritical ? 'danger' : 'primary'} onPress={call} style={{ marginTop: spacing.lg }} />

      {ack ? (
        <View style={styles.ackRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.conforme} />
          <Text style={styles.ackText}>{t('alert.acknowledged')}</Text>
        </View>
      ) : (
        <Button label={t('alert.acknowledge')} variant="secondary" icon="checkmark" onPress={() => setAck(true)} style={{ marginTop: spacing.sm }} />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  notFoundTitle: { fontFamily: bodyFont('bold'), fontSize: type.heading, color: colors.encre, textAlign: 'center' },
  notFoundHint: { fontFamily: bodyFont('regular'), fontSize: type.label, color: colors.fiche, textAlign: 'center', lineHeight: 22 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  sectionLabel: { fontFamily: bodyFont('bold'), fontSize: type.caption, color: colors.fiche, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs, textAlign: textStart },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  meta: { fontFamily: bodyFont('regular'), fontSize: type.caption, color: colors.fiche },
  consigne: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderRadius: radius.card, padding: spacing.lg, marginTop: spacing.lg },
  consigneCritical: { backgroundColor: colors.critique },
  consigneNormal: { backgroundColor: colors.cachetDilue },
  consigneLabel: { fontFamily: bodyFont('bold'), fontSize: type.caption, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4, textAlign: textStart },
  consigneText: { fontFamily: bodyFont('medium'), fontSize: type.body, lineHeight: 24, textAlign: textStart },
  ackRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, justifyContent: 'center', marginTop: spacing.md },
  ackText: { fontFamily: bodyFont('medium'), fontSize: type.label, color: colors.conformeTexte },
});
