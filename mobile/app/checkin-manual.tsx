import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePendingGuestStore } from '@/stores/pendingGuestStore';
import type { AddGuestPayload } from '@/api/checkIns';
import { COMMON_NATIONALITIES } from '@/lib/countries';
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme/theme';
import { fr } from '@/i18n/fr';

type DocType = 'passport' | 'cin';
const SEXES: AddGuestPayload['sex'][] = ['M', 'F', 'X'];

/**
 * Manual traveller entry AND the mandatory post-scan validation screen (§5.3 / §7).
 * Pre-filled from a validated MRZ scan when present; each field is editable. Tunisian CIN
 * (8 digits) has no MRZ → typed here. A clear reminder warns about name transliteration.
 */
export default function CheckInManualScreen() {
  const router = useRouter();
  // Consume any scanned guest to seed the form (peek + clear the transient store).
  const [seed] = useState(() => usePendingGuestStore.getState().consume());
  const setGuest = usePendingGuestStore((s) => s.setGuest);

  const scanned = Boolean(seed);
  const [docType, setDocType] = useState<DocType>((seed?.document_type as DocType) ?? 'passport');
  const [firstName, setFirstName] = useState(seed?.first_name ?? '');
  const [lastName, setLastName] = useState(seed?.last_name ?? '');
  const [dob, setDob] = useState(seed?.date_of_birth ?? '');
  const [sex, setSex] = useState<AddGuestPayload['sex']>(seed?.sex ?? 'M');
  const [nationality, setNationality] = useState(seed?.nationality_code ?? 'TUN');
  const [docNumber, setDocNumber] = useState(seed?.document_number ?? '');
  const [expiry, setExpiry] = useState(seed?.expiry_date ?? '');
  const [error, setError] = useState('');

  function handleSave() {
    setError('');
    if (!firstName.trim() || !lastName.trim() || !dob.trim()) {
      setError(fr.manual.required);
      return;
    }
    if (docType === 'cin' && !/^\d{8}$/.test(docNumber.trim())) {
      setError(fr.manual.cinInvalid);
      return;
    }
    const payload: AddGuestPayload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      date_of_birth: dob.trim(),
      sex,
      nationality_code: docType === 'cin' ? 'TUN' : nationality,
      document_type: docType,
      document_number: docNumber.trim(),
      issuing_country_code: docType === 'cin' ? 'TUN' : (seed?.issuing_country_code ?? nationality),
      expiry_date: docType === 'passport' ? expiry.trim() || undefined : undefined,
    };
    setGuest(payload);
    router.back();
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.encre} />
        </Pressable>
        <Text style={styles.topTitle}>{scanned ? fr.checkin.reviewTitle : fr.manual.title}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.reviewNote}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.vigilanceTexte} />
            <Text style={styles.reviewNoteText}>{fr.checkin.reviewHint}</Text>
          </View>

          {/* Document type */}
          <Text style={styles.label}>{fr.manual.documentType}</Text>
          <View style={styles.segment}>
            {(['passport', 'cin'] as DocType[]).map((t) => (
              <Pressable
                key={t}
                style={[styles.segBtn, docType === t && styles.segBtnOn]}
                onPress={() => setDocType(t)}
              >
                <Text style={[styles.segText, docType === t && styles.segTextOn]}>
                  {t === 'passport' ? fr.manual.passport : fr.manual.cin}
                </Text>
              </Pressable>
            ))}
          </View>

          <Field label={fr.manual.lastName} value={lastName} onChange={setLastName} autoCap="characters" />
          <Field label={fr.manual.firstName} value={firstName} onChange={setFirstName} autoCap="words" />
          <Field label={fr.manual.dob} value={dob} onChange={setDob} placeholder="AAAA-MM-JJ" />

          {/* Sex */}
          <Text style={styles.label}>{fr.manual.sex}</Text>
          <View style={styles.segment}>
            {SEXES.map((s) => (
              <Pressable key={s} style={[styles.segBtn, sex === s && styles.segBtnOn]} onPress={() => setSex(s)}>
                <Text style={[styles.segText, sex === s && styles.segTextOn]}>
                  {s === 'M' ? 'M' : s === 'F' ? 'F' : 'X'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Field
            label={docType === 'cin' ? fr.manual.cinNumber : fr.manual.documentNumber}
            value={docNumber}
            onChange={setDocNumber}
            keyboard={docType === 'cin' ? 'number-pad' : 'default'}
            autoCap="characters"
          />

          {docType === 'passport' ? (
            <>
              <Text style={styles.label}>{fr.manual.nationality}</Text>
              <View style={styles.natWrap}>
                {COMMON_NATIONALITIES.map((n) => (
                  <Pressable
                    key={n.code}
                    style={[styles.natChip, nationality === n.code && styles.natChipOn]}
                    onPress={() => setNationality(n.code)}
                  >
                    <Text style={[styles.natText, nationality === n.code && styles.natTextOn]}>{n.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label="Expiration (AAAA-MM-JJ)" value={expiry} onChange={setExpiry} placeholder="AAAA-MM-JJ" />
            </>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>{fr.manual.save}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard = 'default',
  autoCap = 'none',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'number-pad';
  autoCap?: 'none' | 'words' | 'characters';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.fiche}
        keyboardType={keyboard}
        autoCapitalize={autoCap}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.papier },
  flex: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.encre },
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  reviewNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.vigilanceFond,
    borderRadius: radius.input,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  reviewNoteText: { flex: 1, color: colors.vigilanceTexte, fontSize: fontSize.sm },
  fieldWrap: { gap: spacing.xs },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.encre, marginTop: spacing.xs },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.ligne,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    fontSize: fontSize.md,
    color: colors.encre,
  },
  segment: { flexDirection: 'row', gap: spacing.sm },
  segBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: colors.ligne,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  segBtnOn: { backgroundColor: colors.cachet, borderColor: colors.cachet },
  segText: { color: colors.encre, fontWeight: fontWeight.semibold },
  segTextOn: { color: colors.blanc },
  natWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  natChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ligne,
    backgroundColor: colors.surface,
  },
  natChipOn: { backgroundColor: colors.cachetDilue, borderColor: colors.cachet },
  natText: { fontSize: fontSize.sm, color: colors.fiche },
  natTextOn: { color: colors.cachet, fontWeight: fontWeight.bold },
  error: { color: colors.danger, fontSize: fontSize.sm },
  saveBtn: {
    backgroundColor: colors.cachet,
    borderRadius: radius.btn,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveText: { color: colors.blanc, fontWeight: fontWeight.bold, fontSize: fontSize.md },
});
