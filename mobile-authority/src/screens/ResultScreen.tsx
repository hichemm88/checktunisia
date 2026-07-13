import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, type, radius, resultPalette } from '../theme/tokens';
import { bodyFont, textStart } from '../theme/typography';
import { formatDate, formatTime } from '../lib/dates';
import { nationalityName } from '../lib/countries';
import { ResultStamp } from '../components/ResultStamp';
import { DataRow } from '../components/DataRow';
import { Button } from '../components/Button';
import { SeverityBadge, SourceTag } from '../components/SeverityBadge';
import { recordAudit } from '../api/auditStore';
import { captureLocation } from '../lib/geo';
import { CENTRAL_PHONE } from '../api/seed';
import { VerificationResult } from '../api/types';
import { VerifyStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<VerifyStackParamList, 'Result'>;

/** Écran de résultat à 3 états : vert / ambre / rouge (§4 F2 / §7.6). */
export const ResultScreen: React.FC<Props> = ({ route, navigation }) => {
  const { result } = route.params;
  const state = result.state;
  const palette = state === 'vert' ? resultPalette.vert : state === 'ambre' ? resultPalette.ambre : resultPalette.rouge;

  const newCheck = () => navigation.popToTop();

  if (state === 'rouge') return <RedResult result={result} onNewCheck={newCheck} />;

  return <GreenAmberResult result={result} palette={palette} onNewCheck={newCheck} />;
};

// ─── VERT / AMBRE ────────────────────────────────────────────────────────────
const GreenAmberResult: React.FC<{
  result: VerificationResult;
  palette: { fond: string; fondDoux: string; texte: string };
  onNewCheck: () => void;
}> = ({ result, palette, onNewCheck }) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const lang = i18n.language;
  const isVert = result.state === 'vert';
  const [reported, setReported] = useState(false);

  const name = [result.person.first_name, result.person.last_name].filter(Boolean).join(' ') || '—';

  const onReport = async () => {
    const loc = await captureLocation();
    recordAudit({
      action: 'report',
      subject: name,
      has_location: loc != null,
      place_label: loc ? `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}` : null,
    });
    setReported(true);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.papier }]}>
      <View style={[styles.headerBand, { backgroundColor: palette.fond, paddingTop: insets.top + spacing.lg }]}>
        <ResultStamp state={result.state} onDark size={88} />
        <Text style={styles.headerTitle}>{isVert ? t('result.conformeTitle') : t('result.nonDeclareTitle')}</Text>
        <Text style={styles.headerSubtitle}>{isVert ? t('result.conformeSubtitle') : t('result.nonDeclareSubtitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}>
        <View style={styles.card}>
          {isVert ? (
            <>
              <DataRow label={t('result.name')} value={name} />
              <DataRow label={t('result.nationality')} value={nationalityName(result.person.nationality_code, lang)} />
              <DataRow label={t('result.establishment')} value={result.stay?.hotel_name} />
              <DataRow label={t('result.checkInDate')} value={formatDate(result.stay?.check_in_date, lang)} />
              <DataRow label={t('result.room')} value={result.stay?.room_number ?? undefined} mono />
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>{t('result.documentScanned')}</Text>
              <DataRow label={t('result.name')} value={name} />
              <DataRow label={t('result.nationality')} value={nationalityName(result.person.nationality_code, lang)} />
              <DataRow label={t('result.docNumber')} value={result.person.document_number} mono />
              <DataRow label={t('result.dateOfBirth')} value={formatDate(result.person.date_of_birth, lang)} />
            </>
          )}
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={15} color={colors.fiche} />
          <Text style={styles.meta}>{t('result.loggedAt', { time: formatTime(result.checked_at) })}</Text>
        </View>

        {!isVert &&
          (reported ? (
            <View style={styles.reportedCard}>
              <Ionicons name="checkmark-circle" size={22} color={colors.conforme} />
              <View style={{ flex: 1 }}>
                <Text style={styles.reportedTitle}>{t('result.reported')}</Text>
                <Text style={styles.reportedHint}>{t('result.reportedHint')}</Text>
              </View>
            </View>
          ) : (
            <Button label={t('result.reportButton')} icon="flag-outline" variant="secondary" onPress={onReport} style={{ marginTop: spacing.lg }} />
          ))}

        <Button label={t('result.newCheck')} icon="scan-outline" onPress={onNewCheck} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </View>
  );
};

// ─── ROUGE ───────────────────────────────────────────────────────────────────
const RedResult: React.FC<{ result: VerificationResult; onNewCheck: () => void }> = ({ result, onNewCheck }) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const lang = i18n.language;
  const wl = result.watchlist!;
  const name = [result.person.first_name, result.person.last_name].filter(Boolean).join(' ') || '—';

  const call = () => Linking.openURL(`tel:${CENTRAL_PHONE}`);

  return (
    <View style={[styles.root, { backgroundColor: colors.critique }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.lg }}>
        <View style={styles.redTop}>
          <ResultStamp state="rouge" onDark size={92} />
          <Text style={styles.redTitle}>{t('result.watchlistTitle')}</Text>
          <Text style={styles.redSubtitle}>{t('result.watchlistSubtitle')}</Text>
        </View>

        <View style={styles.redBadges}>
          <SeverityBadge severity={wl.severity} large />
          <SourceTagOnDark source={wl.source} />
        </View>

        <View style={styles.redCard}>
          <DataRow label={t('result.name')} value={name} onDark />
          <DataRow label={t('result.nationality')} value={nationalityName(result.person.nationality_code, lang)} onDark />
          <DataRow label={t('result.docNumber')} value={result.person.document_number} mono onDark />
          <DataRow label={t('result.dateOfBirth')} value={formatDate(result.person.date_of_birth, lang)} onDark />
        </View>

        {/* Consigne opérationnelle — bien visible */}
        <View style={styles.consigne}>
          <Ionicons name="warning" size={22} color={colors.blanc} />
          <Text style={styles.consigneText}>{t('result.instructionCritical')}</Text>
        </View>

        {/* Bouton d'appel direct vers le central (numéro configurable) */}
        <Button label={t('result.callCentral')} icon="call" variant="secondary" onPress={call} style={{ marginTop: spacing.lg }} />
        <Button label={t('result.newCheck')} variant="ghost" onPress={onNewCheck} style={{ marginTop: spacing.xs }} />
        <Text style={styles.callHint}>{CENTRAL_PHONE}</Text>
      </ScrollView>
    </View>
  );
};

const SourceTagOnDark: React.FC<{ source: 'interpol' | 'onu' | 'locale' }> = ({ source }) => {
  const { t } = useTranslation();
  const label = source === 'locale' ? t('result.sourceLocale') : t('result.sourceInterpol');
  return (
    <View style={styles.sourceDark}>
      <Ionicons name="globe-outline" size={14} color={colors.blanc} />
      <Text style={styles.sourceDarkText}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBand: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: { fontFamily: bodyFont('bold'), fontSize: type.displayL, color: colors.blanc, marginTop: spacing.sm },
  headerSubtitle: { fontFamily: bodyFont('medium'), fontSize: type.label, color: 'rgba(255,255,255,0.88)' },
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ligne,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  sectionLabel: {
    fontFamily: bodyFont('bold'), fontSize: type.caption, color: colors.fiche,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.md, marginBottom: spacing.xs, textAlign: textStart,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, justifyContent: 'center' },
  meta: { fontFamily: bodyFont('regular'), fontSize: type.caption, color: colors.fiche },
  reportedCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.conformeFond, borderRadius: radius.card,
    padding: spacing.lg, marginTop: spacing.lg,
  },
  reportedTitle: { fontFamily: bodyFont('bold'), fontSize: type.label, color: colors.conformeTexte, textAlign: textStart },
  reportedHint: { fontFamily: bodyFont('regular'), fontSize: type.caption, color: colors.conformeTexte, textAlign: textStart, lineHeight: 18 },
  // ROUGE
  redTop: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  redTitle: { fontFamily: bodyFont('bold'), fontSize: type.displayL, color: colors.blanc, marginTop: spacing.sm, textAlign: 'center' },
  redSubtitle: { fontFamily: bodyFont('medium'), fontSize: type.body, color: 'rgba(255,255,255,0.9)' },
  redBadges: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, justifyContent: 'center', marginBottom: spacing.lg, flexWrap: 'wrap' },
  redCard: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  consigne: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.critiqueSombre,
    borderRadius: radius.card, padding: spacing.lg, marginTop: spacing.lg,
  },
  consigneText: { flex: 1, fontFamily: bodyFont('bold'), fontSize: type.body, color: colors.blanc, lineHeight: 24, textAlign: textStart },
  callHint: { fontFamily: bodyFont('medium'), fontSize: type.caption, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: spacing.sm, letterSpacing: 1 },
  sourceDark: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  sourceDarkText: { fontFamily: bodyFont('bold'), fontSize: type.caption, color: colors.blanc },
});
