import { View, Text, StyleSheet } from 'react-native';
import { statusColors, radius, fontSize, fontWeight } from '@/theme/theme';
import { fr } from '@/i18n/fr';

const LABELS = fr.status as Record<string, string>;

export function StatusBadge({ status }: { status: string }) {
  const c = statusColors[status] ?? statusColors.draft;
  const label = LABELS[status] ?? status;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
});
