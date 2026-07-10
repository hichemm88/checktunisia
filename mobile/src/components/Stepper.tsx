import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight } from '@/theme/theme';

/** 3-step progress indicator for the check-in wizard (§5.3). */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View style={styles.row}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={label} style={styles.step}>
            <View style={[styles.dot, (active || done) && styles.dotOn]}>
              <Text style={[styles.num, (active || done) && styles.numOn]}>{done ? '✓' : i + 1}</Text>
            </View>
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  step: { flex: 1, alignItems: 'center', gap: spacing.xs },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.cachetDilue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: colors.cachet },
  num: { color: colors.cachet, fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  numOn: { color: colors.blanc },
  label: { fontSize: fontSize.xs, color: colors.fiche, textAlign: 'center' },
  labelActive: { color: colors.encre, fontWeight: fontWeight.bold },
});
