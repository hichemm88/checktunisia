import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, fonts, type } from '../theme/tokens';
import { bodyFont, textStart } from '../theme/typography';

interface Props {
  value: number | string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/** Carte stat simple — libellé complet, jamais tronqué (F3, bug web à éviter). */
export const StatCard: React.FC<Props> = ({ value, label, icon }) => (
  <View style={styles.card}>
    <View style={styles.iconWrap}>
      <Ionicons name={icon} size={18} color={colors.cachet} />
    </View>
    <Text style={styles.value} allowFontScaling={false}>
      {value}
    </Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.blanc,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ligne,
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: 118,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.cachetDilue,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.encre,
    textAlign: textStart,
    includeFontPadding: false,
  },
  label: {
    fontFamily: bodyFont('medium'),
    fontSize: type.caption,
    color: colors.fiche,
    textAlign: textStart,
    lineHeight: 16,
  },
});
