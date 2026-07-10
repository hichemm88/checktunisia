import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '@/api/auth';
import { extractError } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { QayedSeal } from '@/components/QayedSeal';
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme/theme';
import { fr } from '@/i18n/fr';

export default function LoginScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const result = await authApi.login(email.trim(), password);
      if (result.requires_2fa) {
        // Authority accounts with 2FA are web-only (§4 — authorities out of mobile scope).
        setError(fr.auth.twoFactorWeb);
        return;
      }
      await setAuth(result.token, { ...result.user, _token_expires_at: result.expires_at });
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.brand}>
            <QayedSeal size={72} />
            <Text style={styles.wordmark}>Qayed</Text>
            <Text style={styles.tagline}>{fr.auth.tagline}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>{fr.auth.emailLabel}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={fr.auth.emailPlaceholder}
              placeholderTextColor={colors.fiche}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!loading}
            />

            <Text style={styles.label}>{fr.auth.passwordLabel}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              editable={!loading}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color={colors.blanc} />
              ) : (
                <Text style={styles.buttonText}>{fr.auth.loginButton}</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.footer}>{fr.auth.footer}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.papier },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing['2xl'], justifyContent: 'center', gap: spacing['3xl'] },
  brand: { alignItems: 'center', gap: spacing.sm },
  wordmark: { fontSize: fontSize['2xl'], fontWeight: fontWeight.black, color: colors.encre },
  tagline: { fontSize: fontSize.sm, color: colors.fiche, textAlign: 'center' },
  form: { gap: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.encre, marginTop: spacing.sm },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.ligne,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    fontSize: fontSize.md,
    color: colors.encre,
  },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs },
  button: {
    height: 56,
    backgroundColor: colors.cachet,
    borderRadius: radius.btn,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.blanc, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  footer: { textAlign: 'center', color: colors.fiche, fontSize: fontSize.xs },
});
