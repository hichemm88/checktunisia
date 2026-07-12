import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi, type Recipient } from '@/api/notifications';
import { Avatar } from '@/components/Avatar';
import { extractError } from '@/lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme/theme';
import { fr, plural } from '@/i18n/fr';

/**
 * Manager → receptionists broadcast with recipient targeting (§9). Pick who receives the
 * message (default: everyone, one tap), then compose. Receptionists are listed across all of
 * the manager's establishments, grouped by their first establishment, shown once even when
 * assigned to several.
 */
export default function NotifyTeamScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [touched, setTouched] = useState(false);

  const { data: recipients, isLoading } = useQuery({
    queryKey: ['broadcast-recipients'],
    queryFn: () => notificationsApi.recipients(),
  });

  // Default to everyone selected (one-tap "send to all"), until the manager changes it.
  useEffect(() => {
    if (recipients && !touched) setSelected(new Set(recipients.map((r) => r.id)));
  }, [recipients, touched]);

  const groups = useMemo(() => groupByEstablishment(recipients ?? []), [recipients]);
  const total = recipients?.length ?? 0;
  const allSelected = total > 0 && selected.size === total;

  function toggle(id: string) {
    setTouched(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setTouched(true);
    setSelected(allSelected ? new Set() : new Set((recipients ?? []).map((r) => r.id)));
  }

  const canSend = message.trim().length > 0 && selected.size > 0 && !busy;

  async function send() {
    if (!canSend) return;
    setBusy(true);
    try {
      // When everyone is selected, omit the id list so the backend keeps its "all" default;
      // otherwise send the explicit subset. Don't scope by active property — the audience is
      // the chosen receptionists across the manager's establishments.
      const ids = allSelected ? undefined : Array.from(selected);
      const { sent } = await notificationsApi.broadcast(message.trim(), null, ids);
      Alert.alert(
        'Qayed',
        sent > 0 ? plural(fr.notifications, 'composeSent', sent) : fr.notifications.composeNoRecipients,
      );
      router.back();
    } catch (err) {
      Alert.alert(fr.common.error, extractError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={fr.common.back}>
          <Ionicons name="chevron-back" size={26} color={colors.encre} />
        </Pressable>
        <Text style={styles.topTitle}>{fr.notifications.composeTitle}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Recipient picker */}
          <Text style={styles.sectionLabel}>{fr.notifications.recipientsTitle}</Text>
          <Text style={styles.hint}>{fr.notifications.recipientsHint}</Text>

          {isLoading ? (
            <ActivityIndicator color={colors.cachet} style={{ marginVertical: spacing.lg }} />
          ) : total === 0 ? (
            <Text style={styles.empty}>{fr.notifications.noRecipientsToPick}</Text>
          ) : (
            <View style={styles.pickerCard}>
              <CheckRow
                label={fr.notifications.allRecipients.replace('{{count}}', String(total))}
                checked={allSelected}
                onPress={toggleAll}
                bold
              />
              {groups.map((g) => (
                <View key={g.name}>
                  <Text style={styles.groupTitle}>{g.name}</Text>
                  {g.people.map((r) => (
                    <RecipientRow key={r.id} recipient={r} checked={selected.has(r.id)} onPress={() => toggle(r.id)} />
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Message */}
          <Text style={styles.sectionLabel}>Message</Text>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder={fr.notifications.composePlaceholder}
            placeholderTextColor={colors.fiche}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.count}>{message.length}/500</Text>

          <Pressable style={[styles.sendBtn, !canSend && styles.disabled]} onPress={send} disabled={!canSend}>
            {busy ? (
              <ActivityIndicator color={colors.blanc} />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color={colors.blanc} />
                <Text style={styles.sendText}>{plural(fr.notifications, 'sendToCount', selected.size)}</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Group receptionists under their first establishment; keep affectation list for the subtitle. */
function groupByEstablishment(recipients: Recipient[]): { name: string; people: Recipient[] }[] {
  const order: string[] = [];
  const byName = new Map<string, Recipient[]>();
  for (const r of recipients) {
    const name = r.properties[0]?.name ?? '—';
    if (!byName.has(name)) {
      byName.set(name, []);
      order.push(name);
    }
    byName.get(name)!.push(r);
  }
  return order.map((name) => ({ name, people: byName.get(name)! }));
}

function RecipientRow({
  recipient,
  checked,
  onPress,
}: {
  recipient: Recipient;
  checked: boolean;
  onPress: () => void;
}) {
  const name = `${recipient.first_name} ${recipient.last_name}`.trim();
  const affectations = recipient.properties.length > 1 ? recipient.properties.map((p) => p.name).join(' · ') : null;
  return (
    <Pressable style={styles.recipientRow} onPress={onPress}>
      <Avatar name={name} size={36} />
      <View style={{ flex: 1 }}>
        <Text style={styles.recipientName}>{name}</Text>
        {affectations ? (
          <Text style={styles.recipientSub} numberOfLines={1}>
            {affectations}
          </Text>
        ) : null}
      </View>
      <Checkbox checked={checked} />
    </Pressable>
  );
}

function CheckRow({
  label,
  checked,
  onPress,
  bold,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  bold?: boolean;
}) {
  return (
    <Pressable style={styles.checkRow} onPress={onPress}>
      <Text style={[styles.checkRowLabel, bold && styles.checkRowBold]}>{label}</Text>
      <Checkbox checked={checked} />
    </Pressable>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.checkbox, checked && styles.checkboxOn]}>
      {checked ? <Ionicons name="checkmark" size={16} color={colors.blanc} /> : null}
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
  body: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing['3xl'] },
  sectionLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.encre, marginTop: spacing.md },
  hint: { fontSize: fontSize.sm, color: colors.fiche },
  empty: { fontSize: fontSize.sm, color: colors.fiche, paddingVertical: spacing.md },
  pickerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ligne,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  groupTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.fiche,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ligne,
  },
  checkRowLabel: { fontSize: fontSize.md, color: colors.encre },
  checkRowBold: { fontWeight: fontWeight.bold },
  recipientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  recipientName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.encre },
  recipientSub: { fontSize: fontSize.xs, color: colors.fiche, marginTop: 1 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.ligne,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxOn: { backgroundColor: colors.cachet, borderColor: colors.cachet },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.ligne,
    borderRadius: radius.input,
    padding: spacing.md,
    backgroundColor: colors.surface,
    fontSize: fontSize.md,
    color: colors.encre,
  },
  count: { alignSelf: 'flex-end', fontSize: fontSize.xs, color: colors.fiche },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cachet,
    borderRadius: radius.btn,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  disabled: { opacity: 0.5 },
  sendText: { color: colors.blanc, fontWeight: fontWeight.bold, fontSize: fontSize.md },
});
