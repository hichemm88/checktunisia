import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';
import { VerificationState } from '../api/types';

const ICON: Record<VerificationState, keyof typeof Ionicons.glyphMap> = {
  vert: 'checkmark-sharp',
  ambre: 'help-sharp',
  rouge: 'warning-sharp',
};
const RING: Record<VerificationState, string> = {
  vert: colors.conforme,
  ambre: colors.vigilance,
  rouge: colors.critique,
};

/**
 * Animation du cachet au résultat de vérification — SEULE animation décorative
 * autorisée (§2). Courte (< 600 ms) : le sceau « tombe » en s'inclinant à −6°,
 * comme un tampon officiel apposé sur le registre.
 */
export const ResultStamp: React.FC<{ state: VerificationState; size?: number; onDark?: boolean }> = ({
  state, size = 96, onDark = false,
}) => {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scale.setValue(1.35);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.back(2.2)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [state, scale, opacity]);

  const color = onDark ? colors.blanc : RING[state];

  return (
    <Animated.View
      style={[
        styles.stamp,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
          opacity,
          transform: [{ scale }, { rotate: '-6deg' }],
        },
      ]}
    >
      <View style={styles.inner}>
        <Ionicons name={ICON[state]} size={size * 0.5} color={color} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  stamp: {
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  inner: { alignItems: 'center', justifyContent: 'center' },
});
