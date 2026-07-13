import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, type, radius } from '../theme/tokens';
import { bodyFont, monoStyle } from '../theme/typography';
import { MrzData } from '../api/types';
import { getNextDemoScan } from '../api/seed';

/**
 * Vue caméra de lecture MRZ.
 *
 * INTÉGRATION RÉELLE : remplacer le viewfinder simulé ci-dessous par le module
 * `react-native-vision-camera` + frame processor MRZ RÉUTILISÉ TEL QUEL depuis
 * l'app hébergeur (le parsing MRZ est déjà nettoyé et validé — §1). Le contrat
 * reste identique : appeler `onDetected(mrz)` avec un `MrzData` dès que la zone
 * lisible par machine est décodée. Le reste de l'app est agnostique de la source.
 *
 * En mode démo (pas de frame processor natif), on affiche un cadre de visée
 * réaliste et on déclenche la lecture scriptée au tap (§8).
 */
interface Props {
  onDetected: (mrz: MrzData) => void;
}

export const MrzScannerView: React.FC<Props> = ({ onDetected }) => {
  const { t } = useTranslation();
  const [reading, setReading] = useState(false);
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(scan, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scan]);

  const simulate = () => {
    if (reading) return;
    setReading(true);
    // Latence de lecture réaliste (< 2 s au total avec la vérification réseau).
    setTimeout(() => {
      const mrz = getNextDemoScan();
      setReading(false);
      onDetected(mrz);
    }, 850);
  };

  const translateY = scan.interpolate({ inputRange: [0, 1], outputRange: [0, 92] });

  return (
    <View style={styles.root}>
      {/* Faux fond caméra (encre nuit) — remplacé par le flux Camera en réel. */}
      <View style={styles.viewfinder}>
        <View style={styles.frame}>
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />
          <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
          {/* Gabarit MRZ (2 lignes TD3) — LTR, monospace */}
          <View style={styles.mrzTemplate}>
            <Text style={[styles.mrzText, monoStyle]} numberOfLines={1}>
              P&lt;TUN&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
            </Text>
            <Text style={[styles.mrzText, monoStyle]} numberOfLines={1}>
              0000000000TUN0000000M0000000&lt;&lt;&lt;&lt;
            </Text>
          </View>
        </View>
        <Text style={styles.instruction}>{t('verify.mrzInstruction')}</Text>
      </View>

      <Pressable style={styles.captureZone} onPress={simulate} accessibilityRole="button">
        {reading ? (
          <View style={styles.readingRow}>
            <ActivityIndicator color={colors.papier} />
            <Text style={styles.readingText}>{t('verify.scanning')}</Text>
          </View>
        ) : (
          <View style={styles.readingRow}>
            <Ionicons name="scan-outline" size={20} color={colors.papier} />
            <Text style={styles.readingText}>{t('verify.simulateHint')}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

const Corner: React.FC<{ pos: 'tl' | 'tr' | 'bl' | 'br' }> = ({ pos }) => (
  <View
    style={[
      styles.corner,
      pos === 'tl' && { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 },
      pos === 'tr' && { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 },
      pos === 'bl' && { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 },
      pos === 'br' && { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 },
    ]}
  />
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.encre },
  viewfinder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  frame: {
    width: '82%',
    height: 130,
    borderRadius: radius.input,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: colors.cachetSombre },
  scanLine: {
    position: 'absolute',
    left: 8, right: 8, top: 12,
    height: 2,
    backgroundColor: colors.cachetSombre,
    opacity: 0.8,
  },
  mrzTemplate: { gap: 6, opacity: 0.55 },
  mrzText: { fontSize: 12, color: colors.papier, letterSpacing: 1 },
  instruction: { fontFamily: bodyFont('medium'), fontSize: type.label, color: colors.papier },
  captureZone: {
    margin: spacing.lg,
    height: 58,
    borderRadius: radius.btn,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  readingText: { fontFamily: bodyFont('medium'), fontSize: type.label, color: colors.papier },
});
