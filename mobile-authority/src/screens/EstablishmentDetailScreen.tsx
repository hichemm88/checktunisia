import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, type, radius } from '../theme/tokens';
import { bodyFont, monoStyle, textStart } from '../theme/typography';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { FreshnessTag } from '../components/FreshnessTag';
import { formatDate } from '../lib/dates';
import { nationalityName } from '../lib/countries';
import { getEstablishment, getPresentTravelers } from '../api/services';
import { captureLocation } from '../lib/geo';
import { recordAudit } from '../api/auditStore';
import { Establishment, PresentTraveler } from '../api/types';
import { EstablishmentsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<EstablishmentsStackParamList, 'EstablishmentDetail'>;

/** Fiche établissement (F4) — voyageurs présents, fraîcheur, contrôle terrain. */
export const EstablishmentDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { establishmentId } = route.params;
  const { t, i18n } = useTranslation();
  const [est, setEst] = useState<Establishment | null>(null);
  const [travelers, setTravelers] = useState<PresentTraveler[]>([]);
  const [loading, setLoading] = useState(true);
  const [controlled, setControlled] = useState(false);
  const nowMs = Date.now();

  useEffect(() => {
    (async () => {
      const [e, tvs] = await Promise.all([
        getEstablishment(establishmentId),
        getPresentTravelers(establishmentId),
      ]);
      setEst(e);
      setTravelers(tvs);
      setLoading(false);
    })();
  }, [establishmentId]);

  const callManager = useCallback(() => {
    if (est?.manager_phone) Linking.openURL(`tel:${est.manager_phone}`);
  }, [est]);

  const markControl = useCallback(async () => {
    if (!est) return;
    const loc = await captureLocation();
    recordAudit({
      action: 'control',
      subject: est.name,
      has_location: loc != null,
      place_label: loc ? `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}` : null,
    });
    setControlled(true);
  }, [est]);

  if (loading) {
    return (
      <Screen title={t('establishments.detailTitle')} scroll={false} onBack={() => navigation.goBack()}>
        <View style={styles.center}><ActivityIndicator color={colors.cachet} /></View>
      </Screen>
    );
  }
  if (!est) return <Screen title={t('establishments.detailTitle')} onBack={() => navigation.goBack()}><Text style={styles.empty}>{t('establishments.empty')}</Text></Screen>;

  return (
    <Screen title={est.name} onBack={() => navigation.goBack()}>
      <Text style={styles.type}>{est.type_label} · {est.city}</Text>

      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.addrRow}>
          <Ionicons name="location-outline" size={18} color={colors.cachet} />
          <Text style={styles.addr}>{est.address}</Text>
        </View>
        <View style={styles.freshness}>
          <FreshnessTag lastSheetAt={est.last_sheet_at} lang={i18n.language} nowMs={nowMs} />
        </View>
        <View style={styles.managerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.managerLabel}>{t('establishments.manager')}</Text>
            <Text style={styles.managerName}>{est.manager_name}</Text>
            <Text style={[styles.managerPhone, monoStyle]}>{est.manager_phone}</Text>
          </View>
          <Button label={t('establishments.callManager')} icon="call" variant="secondary" size="md" fullWidth={false} onPress={callManager} />
        </View>
      </Card>

      {/* Voyageurs présents — l'agent compare avec la réalité sur place */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{t('establishments.presentTravelers')}</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{travelers.length}</Text>
        </View>
      </View>

      {travelers.length === 0 ? (
        <Text style={styles.empty}>{t('establishments.noTravelers')}</Text>
      ) : (
        <Card padded={false}>
          {travelers.map((tv, i) => (
            <View key={tv.id} style={[styles.travelerRow, i > 0 && styles.divider]}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={18} color={colors.cachet} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.travelerName} numberOfLines={1}>{tv.first_name} {tv.last_name}</Text>
                <Text style={styles.travelerSub} numberOfLines={1}>
                  {nationalityName(tv.nationality_code, i18n.language)} · {t('establishments.arrivedOn', { date: formatDate(tv.check_in_date, i18n.language) })}
                </Text>
              </View>
              {tv.room_number ? (
                <View style={styles.roomTag}>
                  <Text style={styles.roomLabel}>{t('common.roomShort')}</Text>
                  <Text style={[styles.roomNum, monoStyle]}>{tv.room_number}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </Card>
      )}

      {/* Traçabilité du contrôle (F4.5) */}
      {controlled ? (
        <View style={styles.controlledCard}>
          <Ionicons name="checkmark-circle" size={22} color={colors.conforme} />
          <View style={{ flex: 1 }}>
            <Text style={styles.controlledTitle}>{t('establishments.controlMarked')}</Text>
            <Text style={styles.controlledHint}>{t('establishments.controlMarkedHint')}</Text>
          </View>
        </View>
      ) : (
        <Button label={t('establishments.markControl')} icon="clipboard-outline" onPress={markControl} style={{ marginTop: spacing.lg }} />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  type: { fontFamily: bodyFont('medium'), fontSize: type.label, color: colors.fiche, textAlign: textStart },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  addr: { flex: 1, fontFamily: bodyFont('regular'), fontSize: type.label, color: colors.encre, textAlign: textStart, lineHeight: 21 },
  freshness: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ligne },
  managerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ligne },
  managerLabel: { fontFamily: bodyFont('medium'), fontSize: type.caption, color: colors.fiche, textAlign: textStart },
  managerName: { fontFamily: bodyFont('bold'), fontSize: type.label, color: colors.encre, textAlign: textStart },
  managerPhone: { fontSize: type.caption, marginTop: 2, color: colors.cachet },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { fontFamily: bodyFont('bold'), fontSize: type.heading, color: colors.encre, textAlign: textStart },
  countPill: { minWidth: 26, height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: colors.cachetDilue, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: bodyFont('bold'), fontSize: type.caption, color: colors.cachetFonce },
  travelerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ligne },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.cachetDilue, alignItems: 'center', justifyContent: 'center' },
  travelerName: { fontFamily: bodyFont('bold'), fontSize: type.label, color: colors.encre, textAlign: textStart },
  travelerSub: { fontFamily: bodyFont('regular'), fontSize: type.caption, color: colors.fiche, marginTop: 2, textAlign: textStart },
  roomTag: { alignItems: 'center', backgroundColor: colors.papier, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 4, minWidth: 44 },
  roomLabel: { fontFamily: bodyFont('medium'), fontSize: 10, color: colors.fiche },
  roomNum: { fontSize: type.label, color: colors.encre },
  controlledCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.conformeFond, borderRadius: radius.card, padding: spacing.lg, marginTop: spacing.lg },
  controlledTitle: { fontFamily: bodyFont('bold'), fontSize: type.label, color: colors.conformeTexte, textAlign: textStart },
  controlledHint: { fontFamily: bodyFont('regular'), fontSize: type.caption, color: colors.conformeTexte, textAlign: textStart, lineHeight: 18 },
  empty: { fontFamily: bodyFont('regular'), fontSize: type.label, color: colors.fiche, textAlign: 'center', marginTop: spacing.lg },
});
