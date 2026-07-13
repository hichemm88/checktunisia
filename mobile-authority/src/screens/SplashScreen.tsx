import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, type } from '../theme/tokens';
import { bodyFont } from '../theme/typography';
import { QayedLogo } from '../theme/QayedLogo';

/** Splash — logo قيد + الداخلية sur fond encre nuit (§7.1). */
export const SplashScreen: React.FC = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.root}>
      <QayedLogo size={72} onDark vertical />
      <Text style={styles.tagline}>{t('splash.tagline')}</Text>
      <ActivityIndicator color={colors.cachetSombre} style={{ marginTop: spacing.xxl }} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.encre,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  tagline: {
    fontFamily: bodyFont('regular'),
    fontSize: type.label,
    color: colors.cachetSombre,
    marginTop: spacing.sm,
  },
});
