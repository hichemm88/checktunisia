import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme/theme';
import { fr } from '@/i18n/fr';

const STEPS = [fr.checkin.stepBooking, fr.checkin.stepDocuments, fr.checkin.stepValidation];

/**
 * Check-in tab. The 3-step flow (Réservation → Documents → Validation) with native
 * MRZ scanning + manual CIN entry + human validation lands in Phase 2 (§5.3, §7).
 * This screen frames that structure so navigation and the tab are wired end-to-end.
 */
export default function CheckInScreen() {
  return (
    <View style={styles.screen}>
      <AppHeader title={fr.checkin.title} />
      <View style={styles.body}>
        <View style={styles.stepper}>
          {STEPS.map((label, i) => (
            <View key={label} style={styles.step}>
              <View style={[styles.dot, i === 0 && styles.dotActive]}>
                <Text style={[styles.dotNum, i === 0 && styles.dotNumActive]}>{i + 1}</Text>
              </View>
              <Text style={styles.stepLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.notice}>
          <Ionicons name="scan-outline" size={40} color={colors.cachet} />
          <Text style={styles.noticeTitle}>{fr.checkin.phase2Notice}</Text>
          <Text style={styles.noticeSub}>{fr.checkin.phase2Sub}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.papier },
  body: { padding: spacing.lg, gap: spacing['2xl'] },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  step: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cachetDilue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: { backgroundColor: colors.cachet },
  dotNum: { color: colors.cachet, fontWeight: fontWeight.bold },
  dotNumActive: { color: colors.blanc },
  stepLabel: { fontSize: fontSize.xs, color: colors.encre, fontWeight: fontWeight.semibold, textAlign: 'center' },
  notice: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ligne,
    borderStyle: 'dashed',
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  noticeTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.encre, textAlign: 'center' },
  noticeSub: { fontSize: fontSize.sm, color: colors.fiche, textAlign: 'center' },
});
