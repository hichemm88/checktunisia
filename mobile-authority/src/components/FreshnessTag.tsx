import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, type } from '../theme/tokens';
import { bodyFont } from '../theme/typography';
import { formatElapsed, STALE_THRESHOLD_MS } from '../lib/dates';

interface Props {
  lastSheetAt: string | null;
  lang: string;
  nowMs: number;
}

/**
 * Indicateur de fraîcheur (F4) — un établissement silencieux depuis longtemps
 * est un signal en soi. Ambre si > seuil, gris sinon, rouge si jamais reçu.
 */
export const FreshnessTag: React.FC<Props> = ({ lastSheetAt, lang, nowMs }) => {
  const { t } = useTranslation();

  if (!lastSheetAt) {
    return (
      <Tag color={colors.critique} icon="alert-circle-outline">
        {t('establishments.freshnessNever')}
      </Tag>
    );
  }

  const elapsed = nowMs - new Date(lastSheetAt).getTime();
  const value = formatElapsed(lastSheetAt, lang, nowMs);
  const stale = elapsed > STALE_THRESHOLD_MS;

  return (
    <Tag color={stale ? colors.vigilanceTexte : colors.fiche} icon={stale ? 'warning-outline' : 'time-outline'}>
      {stale ? t('establishments.freshnessStale', { value }) : t('establishments.freshness', { value })}
    </Tag>
  );
};

const Tag: React.FC<{ color: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }> = ({
  color, icon, children,
}) => (
  <View style={styles.row}>
    <Ionicons name={icon} size={14} color={color} />
    <Text style={[styles.text, { color }]} numberOfLines={1}>
      {children}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  text: { fontFamily: bodyFont('medium'), fontSize: type.caption, flexShrink: 1 },
});
