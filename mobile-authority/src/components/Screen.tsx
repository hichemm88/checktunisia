import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, type } from '../theme/tokens';
import { bodyFont, textStart } from '../theme/typography';
import { ARROW_BACK } from './icons';

interface Props {
  children: React.ReactNode;
  title?: string;
  scroll?: boolean;
  /** Fond encre nuit (écrans sombres : splash, login). */
  dark?: boolean;
  headerRight?: React.ReactNode;
  onBack?: () => void;
  contentStyle?: object;
}

/**
 * Conteneur d'écran — un écran = une tâche. Padding safe-area, titre sobre.
 * Aucun emoji, aucune décoration : contrastes forts, lisible dehors.
 */
export const Screen: React.FC<Props> = ({
  children, title, scroll = true, dark = false, headerRight, onBack, contentStyle,
}) => {
  const insets = useSafeAreaInsets();
  const bg = dark ? colors.encre : colors.papier;

  const header = title ? (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} accessibilityRole="button">
          <Ionicons name={ARROW_BACK} size={24} color={dark ? colors.papier : colors.encre} />
        </Pressable>
      ) : null}
      <Text
        style={[styles.title, { color: dark ? colors.papier : colors.encre }]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {title}
      </Text>
      {headerRight}
    </View>
  ) : null;

  const body = (
    <View style={[styles.body, contentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.root, { backgroundColor: bg, paddingTop: insets.top }]}>
      <StatusBar
        barStyle={dark ? 'light-content' : 'dark-content'}
        backgroundColor={bg}
        translucent={Platform.OS === 'android'}
      />
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: { marginEnd: spacing.sm, marginStart: -spacing.xs },
  title: {
    fontFamily: bodyFont('bold'),
    fontSize: type.title,
    flex: 1,
    textAlign: textStart,
    includeFontPadding: false,
  },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
