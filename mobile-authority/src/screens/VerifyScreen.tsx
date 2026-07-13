import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, type, radius } from '../theme/tokens';
import { bodyFont, textStart } from '../theme/typography';
import { Screen } from '../components/Screen';
import { CHEVRON_FORWARD } from '../components/icons';
import { VerifyStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<VerifyStackParamList, 'VerifyMain'>;

/** Onglet Vérifier — écran central : un bouton, une tâche (§4 F2). */
export const VerifyScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();

  return (
    <Screen title={t('verify.title')} scroll={false}>
      <View style={styles.body}>
        {/* Bouton unique plein écran : « Scanner un document » */}
        <Pressable
          style={({ pressed }) => [styles.scanCard, pressed && { opacity: 0.92 }]}
          onPress={() => navigation.navigate('MrzScan')}
          accessibilityRole="button"
        >
          <View style={styles.scanIcon}>
            <Ionicons name="scan" size={64} color={colors.blanc} />
          </View>
          <Text style={styles.scanLabel}>{t('verify.scanButton')}</Text>
          <Text style={styles.scanHint}>{t('verify.scanHint')}</Text>
        </Pressable>

        {/* Saisie manuelle en fallback (document abîmé / illisible) */}
        <Pressable
          style={({ pressed }) => [styles.manualRow, pressed && { opacity: 0.8 }]}
          onPress={() => navigation.navigate('ManualEntry')}
          accessibilityRole="button"
        >
          <Ionicons name="keypad-outline" size={22} color={colors.cachet} />
          <View style={styles.manualTextWrap}>
            <Text style={styles.manualLabel}>{t('verify.manualEntry')}</Text>
            <Text style={styles.manualHint}>{t('verify.manualHint')}</Text>
          </View>
          <Ionicons name={CHEVRON_FORWARD} size={20} color={colors.fiche} />
        </Pressable>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.lg, paddingTop: spacing.md },
  scanCard: {
    flex: 1,
    backgroundColor: colors.cachet,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  scanIcon: {
    width: 128, height: 128, borderRadius: 64,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  scanLabel: {
    fontFamily: bodyFont('bold'),
    fontSize: type.title,
    color: colors.blanc,
    textAlign: 'center',
  },
  scanHint: {
    fontFamily: bodyFont('regular'),
    fontSize: type.label,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.blanc,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ligne,
    padding: spacing.lg,
  },
  manualTextWrap: { flex: 1, gap: 2 },
  manualLabel: { fontFamily: bodyFont('bold'), fontSize: type.body, color: colors.encre, textAlign: textStart },
  manualHint: { fontFamily: bodyFont('regular'), fontSize: type.caption, color: colors.fiche, textAlign: textStart, lineHeight: 18 },
});
