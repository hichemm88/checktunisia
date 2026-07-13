import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, type } from '../theme/tokens';
import { bodyFont } from '../theme/typography';
import { MrzScannerView } from '../mrz/MrzScannerView';
import { runVerification } from '../mrz/runVerification';
import { OfflineNotice } from '../components/OfflineNotice';
import { ARROW_BACK } from '../components/icons';
import { MrzData } from '../api/types';
import { VerifyStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<VerifyStackParamList, 'MrzScan'>;

export const MrzScanScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(false);
  const [offline, setOffline] = useState(false);

  const onDetected = useCallback(
    async (mrz: MrzData) => {
      setChecking(true);
      const outcome = await runVerification(mrz);
      setChecking(false);
      if (outcome.offline) {
        setOffline(true);
        return;
      }
      if (outcome.result) {
        navigation.replace('Result', { result: outcome.result });
      }
    },
    [navigation],
  );

  return (
    <View style={styles.root}>
      <MrzScannerView onDetected={onDetected} />

      {/* Bouton retour flottant (sur fond caméra sombre) */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={[styles.back, { top: insets.top + spacing.sm }]}
        hitSlop={12}
        accessibilityRole="button"
      >
        <Ionicons name={ARROW_BACK} size={24} color={colors.papier} />
      </Pressable>

      {checking ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.papier} size="large" />
          <Text style={styles.overlayText}>{t('verify.checking')}</Text>
        </View>
      ) : null}

      <OfflineNotice visible={offline} onClose={() => navigation.goBack()} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.encre },
  back: {
    position: 'absolute',
    start: spacing.lg,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,34,46,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  overlayText: { fontFamily: bodyFont('medium'), fontSize: type.body, color: colors.papier },
});
