import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radius } from './tokens';

interface Props {
  size?: number;
  onDark?: boolean;
  /** Affiche le sous-titre الداخلية (variant autorité). */
  showMinistry?: boolean;
  /** Empile keycap + sous-titre verticalement (splash / login). */
  vertical?: boolean;
}

/**
 * Sceau قيد — toujours incliné à −6° (BRAND.md). Variant AUTORITÉ : sous-titre
 * الداخلية sous le keycap pour différencier de l'app hébergeur (§2).
 */
export const QayedLogo: React.FC<Props> = ({
  size = 44,
  onDark = false,
  showMinistry = true,
  vertical = false,
}) => {
  const keycap = (
    <View
      style={[
        styles.keycap,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.24),
          transform: [{ rotate: '-6deg' }],
        },
      ]}
    >
      <Text style={[styles.qayed, { fontSize: size * 0.42 }]} allowFontScaling={false}>
        قيد
      </Text>
    </View>
  );

  const ministry = showMinistry ? (
    <Text
      style={[
        styles.ministry,
        {
          fontSize: Math.max(11, size * 0.26),
          color: onDark ? colors.papier : colors.encre,
          marginTop: vertical ? size * 0.18 : 0,
          marginStart: vertical ? 0 : size * 0.22,
        },
      ]}
      allowFontScaling={false}
    >
      الداخلية
    </Text>
  ) : null;

  return (
    <View style={vertical ? styles.col : styles.row}>
      {keycap}
      {ministry}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  col: { flexDirection: 'column', alignItems: 'center' },
  keycap: {
    backgroundColor: colors.cachet,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.cachetFonce,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  qayed: {
    color: colors.blanc,
    fontFamily: fonts.arabicBold,
    includeFontPadding: false,
    textAlign: 'center',
  },
  ministry: {
    fontFamily: fonts.arabic,
    letterSpacing: 1.5,
    includeFontPadding: false,
  },
});
