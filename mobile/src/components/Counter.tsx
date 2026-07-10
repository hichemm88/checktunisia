import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight } from '@/theme/theme';

/** Adults / children stepper counter used in step 1 of the wizard. */
export function Counter({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <Pressable
          style={[styles.btn, value <= min && styles.btnDisabled]}
          onPress={() => value > min && onChange(value - 1)}
          disabled={value <= min}
          accessibilityLabel={`Diminuer ${label}`}
        >
          <Ionicons name="remove" size={20} color={value <= min ? colors.fiche : colors.cachet} />
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable style={styles.btn} onPress={() => onChange(value + 1)} accessibilityLabel={`Augmenter ${label}`}>
          <Ionicons name="add" size={20} color={colors.cachet} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: fontSize.base, color: colors.encre, fontWeight: fontWeight.medium },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.ligne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  value: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.encre, minWidth: 24, textAlign: 'center' },
});
