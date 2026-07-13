import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, type } from '../theme/tokens';
import { bodyFont, textStart } from '../theme/typography';
import { QayedLogo } from '../theme/QayedLogo';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { useAuth } from '../auth/AuthContext';

/** Écran de connexion — identifiant + biométrie (§7.2). Aucune inscription in-app. */
export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      await login(identifier.trim());
    } catch {
      setError(t('login.biometricFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.lg }]}
    >
      <View style={styles.top}>
        <QayedLogo size={64} onDark vertical />
        <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>{t('login.title')}</Text>

        <TextField
          label={t('login.identifier')}
          placeholder={t('login.identifierPlaceholder')}
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />

        {error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={16} color={colors.critique} />
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        <Button
          label={t('login.signIn')}
          icon="finger-print"
          onPress={onSubmit}
          loading={busy}
          disabled={identifier.trim().length === 0}
        />

        <View style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={16} color={colors.cachetSombre} />
          <Text style={styles.hint}>{t('login.noAccountHint')}</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.encre,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  top: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl },
  subtitle: {
    fontFamily: bodyFont('medium'),
    fontSize: type.label,
    color: colors.cachetSombre,
  },
  form: { gap: spacing.lg, marginBottom: spacing.xxxl },
  title: {
    fontFamily: bodyFont('bold'),
    fontSize: type.title,
    color: colors.papier,
    textAlign: textStart,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  error: { fontFamily: bodyFont('medium'), fontSize: type.caption, color: colors.critique },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.sm },
  hint: {
    fontFamily: bodyFont('regular'),
    fontSize: type.caption,
    color: '#9BA7B4',
    flex: 1,
    textAlign: textStart,
    lineHeight: 18,
  },
});
