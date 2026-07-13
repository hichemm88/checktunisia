import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, type } from '../theme/tokens';
import { bodyFont, textStart } from '../theme/typography';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { OfflineNotice } from '../components/OfflineNotice';
import { runVerification } from '../mrz/runVerification';
import { VerifyStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<VerifyStackParamList, 'ManualEntry'>;

/** Saisie manuelle (F2.3) — fallback document abîmé. Même écran de résultat. */
export const ManualEntryScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [doc, setDoc] = useState('');
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);

  const onVerify = async () => {
    if (doc.trim().length < 4 || busy) return;
    setBusy(true);
    const outcome = await runVerification({ documentNumber: doc.trim() });
    setBusy(false);
    if (outcome.offline) { setOffline(true); return; }
    if (outcome.result) navigation.replace('Result', { result: outcome.result });
  };

  return (
    <Screen title={t('verify.manualTitle')} onBack={() => navigation.goBack()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
        <View style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={18} color={colors.cachet} />
          <Text style={styles.hint}>{t('verify.manualHint')}</Text>
        </View>

        {/* Champ IBM Plex Mono (F2.3) */}
        <TextField
          label={t('verify.docNumberLabel')}
          placeholder={t('verify.docNumberPlaceholder')}
          value={doc}
          onChangeText={(v) => setDoc(v.toUpperCase())}
          mono
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={onVerify}
        />

        <Button
          label={t('verify.verifyNow')}
          icon="search"
          onPress={onVerify}
          loading={busy}
          disabled={doc.trim().length < 4}
        />
      </KeyboardAvoidingView>

      <OfflineNotice visible={offline} onClose={() => setOffline(false)} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingTop: spacing.md },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  hint: { flex: 1, fontFamily: bodyFont('regular'), fontSize: type.label, color: colors.fiche, textAlign: textStart, lineHeight: 21 },
});
