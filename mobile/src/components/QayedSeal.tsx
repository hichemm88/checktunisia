import { View, Text, StyleSheet } from 'react-native';
import { colors, fontWeight } from '@/theme/theme';

/**
 * The قيد seal mark — "l'encre du cachet officiel". A simple rounded-square stamp
 * standing in for the brand logo asset (real SVG/PNG lands in Phase 4 polish).
 */
export function QayedSeal({ size = 32, onDark = false }: { size?: number; onDark?: boolean }) {
  const fg = onDark ? colors.blanc : colors.cachet;
  const bg = onDark ? 'rgba(255,255,255,0.14)' : colors.cachetDilue;
  return (
    <View
      style={[
        styles.seal,
        { width: size, height: size, borderRadius: size * 0.28, backgroundColor: bg, borderColor: fg },
      ]}
    >
      <Text style={[styles.mark, { color: fg, fontSize: size * 0.5 }]}>قيد</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  seal: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  mark: {
    fontWeight: fontWeight.bold,
    includeFontPadding: false,
  },
});
