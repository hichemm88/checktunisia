import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight } from '@/theme/theme';
import { initials } from '@/lib/format';

export function Avatar({ name, size = 40 }: { name?: string | null; size?: number }) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.cachetDilue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.cachet,
    fontWeight: fontWeight.bold,
  },
});
