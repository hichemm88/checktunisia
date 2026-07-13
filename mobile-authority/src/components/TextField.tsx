import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors, radius, spacing, type } from '../theme/tokens';
import { bodyFont, monoStyle, textStart } from '../theme/typography';

interface Props extends TextInputProps {
  label?: string;
  /** Saisie de données (n° document) — IBM Plex Mono, LTR même en RTL. */
  mono?: boolean;
}

export const TextField: React.FC<Props> = ({ label, mono = false, style, ...rest }) => (
  <View style={styles.wrap}>
    {label ? (
      <Text style={styles.label} allowFontScaling={false}>
        {label}
      </Text>
    ) : null}
    <TextInput
      placeholderTextColor={colors.fiche}
      style={[styles.input, mono ? monoStyle : styles.text, style]}
      {...rest}
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, width: '100%' },
  label: {
    fontFamily: bodyFont('medium'),
    fontSize: type.label,
    color: colors.encre,
    textAlign: textStart,
  },
  input: {
    height: 54,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.ligne,
    backgroundColor: colors.blanc,
    paddingHorizontal: spacing.lg,
    fontSize: type.body,
    color: colors.encre,
  },
  text: { fontFamily: bodyFont('regular'), textAlign: textStart },
});
