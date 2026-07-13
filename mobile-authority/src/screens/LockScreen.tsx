import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, type, radius } from '../theme/tokens';
import { bodyFont, monoStyle } from '../theme/typography';
import { QayedLogo } from '../theme/QayedLogo';
import { Button } from '../components/Button';
import { useAuth } from '../auth/AuthContext';

const PIN_LENGTH = 6;

/** Écran de verrouillage — ré-authentification biométrique + fallback PIN (F1). */
export const LockScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { agent, expiredByInactivity, unlockWithBiometric, unlockWithPin, logout } = useAuth();
  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tryBiometric = useCallback(async () => {
    setError(null);
    const ok = await unlockWithBiometric();
    if (!ok) setError(t('login.biometricFailed'));
  }, [unlockWithBiometric, t]);

  // Prompt biométrique automatique à l'ouverture (biométrie obligatoire).
  useEffect(() => {
    if (!pinMode) tryBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDigit = async (d: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPin(next);
    setError(null);
    if (next.length === PIN_LENGTH) {
      const ok = await unlockWithPin(next);
      if (!ok) {
        setError(t('login.pinError'));
        setPin('');
      }
    }
  };

  const onDelete = () => setPin((p) => p.slice(0, -1));

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.top}>
        <QayedLogo size={60} onDark vertical />
        {agent ? <Text style={styles.name}>{agent.name}</Text> : null}
        {expiredByInactivity ? (
          <View style={styles.expiredRow}>
            <Ionicons name="time-outline" size={15} color={colors.vigilance} />
            <Text style={styles.expired}>{t('login.sessionExpired')}</Text>
          </View>
        ) : (
          <Text style={styles.unlockHint}>{t('login.unlockHint')}</Text>
        )}
      </View>

      {pinMode ? (
        <View style={styles.pinArea}>
          <Text style={styles.pinPrompt}>{t('login.pinPrompt')}</Text>
          <View style={styles.dots}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: i < pin.length ? colors.cachetSombre : 'transparent' }]}
              />
            ))}
          </View>
          {error ? <Text style={styles.pinError}>{error}</Text> : null}
          <Keypad onDigit={onDigit} onDelete={onDelete} />
        </View>
      ) : (
        <View style={styles.bioArea}>
          <Pressable onPress={tryBiometric} style={styles.bioButton} accessibilityRole="button">
            <Ionicons name="finger-print" size={56} color={colors.cachetSombre} />
          </Pressable>
          {error ? <Text style={styles.pinError}>{error}</Text> : null}
          <Button
            label={t('login.usePin')}
            variant="ghost"
            icon="keypad-outline"
            onPress={() => { setPinMode(true); setError(null); }}
            fullWidth={false}
          />
        </View>
      )}

      <Pressable onPress={logout} hitSlop={12} style={styles.logout}>
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </Pressable>
    </View>
  );
};

const Keypad: React.FC<{ onDigit: (d: string) => void; onDelete: () => void }> = ({ onDigit, onDelete }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  return (
    <View style={styles.keypad}>
      {keys.map((k, i) => {
        if (k === '') return <View key={i} style={styles.key} />;
        if (k === 'del') {
          return (
            <Pressable key={i} style={styles.key} onPress={onDelete} accessibilityRole="button">
              <Ionicons name="backspace-outline" size={26} color={colors.papier} />
            </Pressable>
          );
        }
        return (
          <Pressable key={i} style={({ pressed }) => [styles.key, styles.keyDigit, pressed && styles.keyPressed]} onPress={() => onDigit(k)}>
            {/* Chiffres occidentaux — LTR même en RTL */}
            <Text style={[styles.keyText, monoStyle]} allowFontScaling={false}>{k}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.encre, paddingHorizontal: spacing.xl, justifyContent: 'space-between', alignItems: 'center' },
  top: { alignItems: 'center', gap: spacing.md },
  name: { fontFamily: bodyFont('bold'), fontSize: type.heading, color: colors.papier, marginTop: spacing.sm },
  unlockHint: { fontFamily: bodyFont('regular'), fontSize: type.label, color: '#9BA7B4' },
  expiredRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  expired: { fontFamily: bodyFont('medium'), fontSize: type.caption, color: colors.vigilance, textAlign: 'center' },
  bioArea: { alignItems: 'center', gap: spacing.lg },
  bioButton: {
    width: 108, height: 108, borderRadius: 54,
    borderWidth: 2, borderColor: colors.cachet,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(83,70,168,0.12)',
  },
  pinArea: { alignItems: 'center', gap: spacing.lg, width: '100%' },
  pinPrompt: { fontFamily: bodyFont('medium'), fontSize: type.label, color: colors.papier },
  dots: { flexDirection: 'row', gap: spacing.md },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.cachetSombre },
  pinError: { fontFamily: bodyFont('medium'), fontSize: type.caption, color: colors.critique },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'space-between', rowGap: spacing.md },
  key: { width: 74, height: 66, alignItems: 'center', justifyContent: 'center' },
  keyDigit: { borderRadius: radius.card },
  keyPressed: { backgroundColor: 'rgba(255,255,255,0.08)' },
  keyText: { fontSize: 28, color: colors.papier },
  logout: { paddingVertical: spacing.md },
  logoutText: { fontFamily: bodyFont('medium'), fontSize: type.label, color: '#9BA7B4' },
});
