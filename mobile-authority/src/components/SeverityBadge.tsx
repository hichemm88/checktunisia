import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '../theme/tokens';
import { bodyFont } from '../theme/typography';
import { WatchlistSeverity, WatchlistSource } from '../api/types';

const SEV_COLOR: Record<WatchlistSeverity, { bg: string; fg: string }> = {
  critique: { bg: colors.critique, fg: colors.blanc },
  eleve: { bg: colors.vigilance, fg: colors.blanc },
  moyen: { bg: colors.cachetDilue, fg: colors.cachetFonce },
};

/** Badge coloré (jamais d'emoji — icône vectorielle + code couleur). */
export const SeverityBadge: React.FC<{ severity: WatchlistSeverity; large?: boolean }> = ({
  severity, large = false,
}) => {
  const { t } = useTranslation();
  const c = SEV_COLOR[severity];
  const label = t(
    severity === 'critique'
      ? 'result.severityCritique'
      : severity === 'eleve'
        ? 'result.severityEleve'
        : 'result.severityMoyen',
  );
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, paddingVertical: large ? 6 : 3 }]}>
      <Ionicons name="shield-half" size={large ? 16 : 13} color={c.fg} />
      <Text
        style={[styles.text, { color: c.fg, fontSize: large ? type.label : type.caption }]}
        allowFontScaling={false}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
};

const SOURCE_KEY: Record<WatchlistSource, string> = {
  interpol: 'result.sourceInterpol',
  onu: 'result.sourceInterpol',
  locale: 'result.sourceLocale',
};

export const SourceTag: React.FC<{ source: WatchlistSource }> = ({ source }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.source}>
      <Ionicons name="globe-outline" size={13} color={colors.fiche} />
      <Text style={styles.sourceText} allowFontScaling={false}>
        {t(SOURCE_KEY[source])}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { fontFamily: bodyFont('bold'), letterSpacing: 0.5, includeFontPadding: false },
  source: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sourceText: { fontFamily: bodyFont('medium'), fontSize: type.caption, color: colors.fiche },
});
