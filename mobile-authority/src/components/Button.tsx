import React from 'react';
import {
  Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '../theme/tokens';
import { bodyFont } from '../theme/typography';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'lg' | 'md';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

const BG: Record<Variant, string> = {
  primary: colors.cachet,
  secondary: colors.blanc,
  danger: colors.critique,
  ghost: 'transparent',
};
const FG: Record<Variant, string> = {
  primary: colors.blanc,
  secondary: colors.encre,
  danger: colors.blanc,
  ghost: colors.cachet,
};

/** Gros boutons, gros textes, contrastes forts — l'agent est debout, dehors. */
export const Button: React.FC<Props> = ({
  label, onPress, variant = 'primary', size = 'lg', icon,
  loading = false, disabled = false, style, fullWidth = true,
}) => {
  const isDisabled = disabled || loading;
  const height = size === 'lg' ? 58 : 48;
  const fontSize = size === 'lg' ? type.body : type.label;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: BG[variant],
          borderColor: variant === 'secondary' ? colors.ligne : 'transparent',
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.5 : pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={fontSize + 5} color={FG[variant]} /> : null}
          <Text
            style={[styles.label, { color: FG[variant], fontSize, fontFamily: bodyFont('bold') }]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.btn,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { includeFontPadding: false },
});
