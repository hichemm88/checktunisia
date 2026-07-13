import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, type } from '../theme/tokens';
import { bodyFont, monoStyle, textStart } from '../theme/typography';

interface Props {
  label: string;
  value?: string | null;
  /** Donnée à afficher en IBM Plex Mono, LTR (MRZ, n° document, ID). */
  mono?: boolean;
  /** Sur fond sombre (carte rouge) — texte clair. */
  onDark?: boolean;
}

/** Ligne label/valeur — libellés complets, JAMAIS tronqués (bug web à éviter, §F3). */
export const DataRow: React.FC<Props> = ({ label, value, mono = false, onDark = false }) => {
  const labelColor = onDark ? 'rgba(255,255,255,0.7)' : colors.fiche;
  const valueColor = onDark ? colors.blanc : colors.encre;
  const border = onDark ? 'rgba(255,255,255,0.18)' : colors.ligne;
  return (
    <View style={[styles.row, { borderBottomColor: border }]}>
      <Text style={[styles.label, { color: labelColor }]} allowFontScaling={false}>
        {label}
      </Text>
      <Text
        style={[styles.value, { color: valueColor }, mono ? { ...monoStyle, color: valueColor } : null]}
        selectable
      >
        {value && value.length > 0 ? value : '—'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    gap: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontFamily: bodyFont('medium'),
    fontSize: type.label,
    textAlign: textStart,
    flexShrink: 0,
  },
  value: {
    fontFamily: bodyFont('bold'),
    fontSize: type.label,
    textAlign: 'right',
    flex: 1,
    flexWrap: 'wrap',
  },
});
