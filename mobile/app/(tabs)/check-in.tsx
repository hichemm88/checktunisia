import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AppHeader } from '@/components/AppHeader';
import { Stepper } from '@/components/Stepper';
import { Counter } from '@/components/Counter';
import { PendingBanner } from '@/components/PendingBanner';
import { checkInsApi, type AddGuestPayload, type CreateCheckInPayload } from '@/api/checkIns';
import { detectOta } from '@/lib/ota';
import { extractError } from '@/lib/api';
import { flagEmoji, shortDate } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';
import { useQueueStore } from '@/stores/queueStore';
import { usePendingGuestStore } from '@/stores/pendingGuestStore';
import { useRoomPickStore } from '@/stores/roomPickStore';
import { useDraftSeedStore } from '@/stores/draftSeedStore';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '@/theme/theme';
import { fr, interp } from '@/i18n/fr';

const STEPS = [fr.checkin.stepBooking, fr.checkin.stepDocuments, fr.checkin.stepValidation];

function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function CheckInWizard() {
  const router = useRouter();
  const activePropertyId = useAuthStore((s) => s.activePropertyId);
  const enqueue = useQueueStore((s) => s.enqueue);

  const [step, setStep] = useState(0);
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const [roomNumber, setRoomNumber] = useState<string | undefined>(undefined);
  // The room step must be a conscious choice — a room OR "sans chambre" tapped in the
  // selector. Until then the wizard can't advance (§1).
  const [roomChosen, setRoomChosen] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [checkInDate, setCheckInDate] = useState(isoDate(0));
  const [checkOutDate, setCheckOutDate] = useState(isoDate(1));
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [guests, setGuests] = useState<AddGuestPayload[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dateError, setDateError] = useState('');
  // When set, the wizard completes this existing draft (from a dashboard arrival) instead of
  // creating a new check-in (§4).
  const [completingDraftId, setCompletingDraftId] = useState<string | undefined>(undefined);

  // Departure must be strictly after arrival (blocking).
  function goToDocuments() {
    if (checkOutDate <= checkInDate) {
      setDateError(fr.checkin.dateOrderError);
      return;
    }
    setDateError('');
    if (!roomChosen) {
      setRoomError(fr.checkin.roomRequired);
      return;
    }
    setRoomError('');
    setStep(1);
  }

  // Availability depends on the entered dates, so validate them before opening the selector.
  function openRoomSelect() {
    if (checkOutDate <= checkInDate) {
      setDateError(fr.checkin.dateOrderError);
      return;
    }
    setDateError('');
    router.push({ pathname: '/room-select', params: { arrival: checkInDate, departure: checkOutDate } });
  }

  // Pick up a traveller, a room choice, and/or a draft-arrival seed handed to the wizard.
  useFocusEffect(
    useCallback(() => {
      const g = usePendingGuestStore.getState().consume();
      if (g) setGuests((prev) => [...prev, g]);
      const pick = useRoomPickStore.getState().consume();
      if (pick) {
        setRoomId(pick.roomId);
        setRoomNumber(pick.roomNumber);
        setRoomChosen(true);
        setRoomError('');
      }
      const seed = useDraftSeedStore.getState().consume();
      if (seed) {
        setCompletingDraftId(seed.draftId);
        setRoomId(seed.roomId);
        setRoomNumber(seed.roomNumber);
        setRoomChosen(true);
        setBookingRef(seed.bookingRef ?? '');
        setCheckInDate(seed.checkInDate);
        setCheckOutDate(seed.checkOutDate);
        setAdults(seed.adults);
        setChildren(seed.children);
        setStep(0);
      }
    }, []),
  );

  function reset() {
    setStep(0);
    setRoomId(undefined);
    setRoomNumber(undefined);
    setRoomChosen(false);
    setRoomError('');
    setCompletingDraftId(undefined);
    setBookingRef('');
    setCheckInDate(isoDate(0));
    setCheckOutDate(isoDate(1));
    setAdults(1);
    setChildren(0);
    setGuests([]);
  }

  function removeGuest(index: number) {
    setGuests((prev) => prev.filter((_, i) => i !== index));
  }

  async function finalize() {
    const create: CreateCheckInPayload = {
      room_id: roomId,
      booking_reference: bookingRef.trim() || undefined,
      booking_source: detectOta(bookingRef)?.code,
      check_in_date: checkInDate,
      expected_check_out_date: checkOutDate,
      adults_count: adults,
      children_count: children,
    };
    const guestsPayload = guests.map((g, i) => ({ ...g, is_primary: i === 0 }));

    setSubmitting(true);
    try {
      if (completingDraftId) {
        // Continue an existing draft arrival (§4): update its details, add travellers, complete.
        await checkInsApi.update(completingDraftId, create);
        for (const g of guestsPayload) await checkInsApi.addGuest(completingDraftId, g);
        await checkInsApi.complete(completingDraftId);
      } else {
        const created = await checkInsApi.create(create);
        for (const g of guestsPayload) await checkInsApi.addGuest(created.id, g);
        await checkInsApi.complete(created.id);
      }
      Alert.alert('Qayed', fr.checkin.completedSuccess);
      reset();
      router.push('/history');
    } catch (err) {
      // No server response → treat as offline and queue the whole unit (§8). Draft completion
      // isn't queued (it targets an existing server record) — surface the error instead.
      const isNetwork = axios.isAxiosError(err) && !err.response;
      if (isNetwork && !completingDraftId) {
        await enqueue({ propertyId: activePropertyId, create, guests: guestsPayload });
        Alert.alert('Qayed', fr.checkin.queuedOffline);
        reset();
        router.push('/history');
      } else {
        Alert.alert(fr.common.error, extractError(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canFinalize = guests.length > 0 && !submitting;
  const ota = detectOta(bookingRef);

  return (
    <View style={styles.screen}>
      <AppHeader title={fr.checkin.title} />
      <PendingBanner />
      <View style={styles.stepperWrap}>
        <Stepper steps={STEPS} current={step} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            {/* Room selector — opens a full-screen picker with live availability (§1) */}
            <Text style={styles.label}>{fr.checkin.roomLabel}</Text>
            <Pressable style={styles.roomField} onPress={openRoomSelect}>
              <Ionicons
                name={roomChosen && !roomId ? 'remove-circle-outline' : 'bed-outline'}
                size={20}
                color={roomChosen ? colors.cachet : colors.fiche}
              />
              <Text style={[styles.roomFieldText, !roomChosen && styles.roomFieldPlaceholder]}>
                {!roomChosen
                  ? fr.checkin.roomFieldPlaceholder
                  : roomId
                    ? `Ch. ${roomNumber}`
                    : fr.checkin.noRoomAssigned}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.fiche} />
            </Pressable>
            {roomError ? <Text style={styles.dateError}>{roomError}</Text> : null}

            <Text style={styles.label}>{fr.checkin.bookingRefLabel}</Text>
            <TextInput
              style={styles.input}
              value={bookingRef}
              onChangeText={setBookingRef}
              placeholder={fr.checkin.bookingRefPlaceholder}
              placeholderTextColor={colors.fiche}
              autoCapitalize="characters"
            />
            {ota ? (
              <View style={styles.otaBadge}>
                <Ionicons name="pricetag-outline" size={13} color={colors.cachet} />
                <Text style={styles.otaBadgeText}>{ota.label}</Text>
              </View>
            ) : null}

            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <Text style={styles.label}>{fr.checkin.arrivalLabel}</Text>
                <TextInput style={styles.input} value={checkInDate} onChangeText={setCheckInDate} placeholder="AAAA-MM-JJ" placeholderTextColor={colors.fiche} />
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.label}>{fr.checkin.expectedDepartureLabel}</Text>
                <TextInput style={styles.input} value={checkOutDate} onChangeText={setCheckOutDate} placeholder="AAAA-MM-JJ" placeholderTextColor={colors.fiche} />
              </View>
            </View>

            <View style={styles.card}>
              <Counter label={fr.checkin.adults} value={adults} min={1} onChange={setAdults} />
              <View style={styles.divider} />
              <Counter label={fr.checkin.children} value={children} min={0} onChange={setChildren} />
            </View>

            {dateError ? <Text style={styles.dateError}>{dateError}</Text> : null}

            <Pressable style={styles.primaryBtn} onPress={goToDocuments}>
              <Text style={styles.primaryText}>{fr.checkin.next}</Text>
            </Pressable>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Pressable style={styles.scanBtn} onPress={() => router.push('/scan-mrz')}>
              <Ionicons name="scan" size={22} color={colors.blanc} />
              <Text style={styles.scanText}>{fr.checkin.scanPassport}</Text>
            </Pressable>
            <Pressable style={styles.manualBtn} onPress={() => router.push('/checkin-manual')}>
              <Ionicons name="create-outline" size={20} color={colors.cachet} />
              <Text style={styles.manualText}>{fr.checkin.manualCin}</Text>
            </Pressable>

            {guests.length === 0 ? (
              <Text style={styles.emptyGuests}>{fr.checkin.noGuestsYet}</Text>
            ) : (
              guests.map((g, i) => (
                <View key={`${g.document_number}-${i}`} style={styles.guestCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guestName}>
                      {g.nationality_code ? `${flagEmoji(g.nationality_code)} ` : ''}
                      {g.first_name} {g.last_name}
                    </Text>
                    <Text style={styles.guestMeta}>
                      {i === 0 ? fr.checkin.primaryGuestLabel : interp(fr.checkin.guestN, { n: i + 1 })} ·{' '}
                      {g.document_type === 'cin' ? 'CIN' : 'Passeport'} {g.document_number}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeGuest(i)} hitSlop={8}>
                    <Text style={styles.removeText}>{fr.checkin.removeGuest}</Text>
                  </Pressable>
                </View>
              ))
            )}

            <Text style={styles.hint}>{fr.checkin.adultDocsRequired}</Text>

            <View style={styles.navRow}>
              <Pressable style={styles.secondaryBtn} onPress={() => setStep(0)}>
                <Text style={styles.secondaryText}>{fr.checkin.back}</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, styles.flex1, guests.length === 0 && styles.disabled]}
                disabled={guests.length === 0}
                onPress={() => setStep(2)}
              >
                <Text style={styles.primaryText}>{fr.checkin.next}</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <View style={styles.card}>
              <Review label={fr.checkin.roomLabel} value={roomId ? `Ch. ${roomNumber}` : fr.checkin.noRoomAssigned} />
              <Review label={fr.checkin.arrivalLabel} value={shortDate(checkInDate)} />
              <Review label={fr.checkin.expectedDepartureLabel} value={shortDate(checkOutDate)} />
              {bookingRef ? <Review label={fr.checkin.bookingRefLabel} value={bookingRef} /> : null}
              <Review label={`${fr.checkin.adults} / ${fr.checkin.children}`} value={`${adults} / ${children}`} />
            </View>

            <View style={styles.reviewNote}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.vigilanceTexte} />
              <Text style={styles.reviewNoteText}>{fr.checkin.reviewHint}</Text>
            </View>

            {guests.map((g, i) => (
              <View key={`rev-${i}`} style={styles.guestCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guestName}>
                    {g.nationality_code ? `${flagEmoji(g.nationality_code)} ` : ''}
                    {g.first_name} {g.last_name}
                  </Text>
                  <Text style={styles.guestMeta}>
                    {g.sex} · {g.date_of_birth} · {g.document_type === 'cin' ? 'CIN' : 'Passeport'} {g.document_number}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.navRow}>
              <Pressable style={styles.secondaryBtn} onPress={() => setStep(1)}>
                <Text style={styles.secondaryText}>{fr.checkin.back}</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, styles.flex1, !canFinalize && styles.disabled]}
                disabled={!canFinalize}
                onPress={finalize}
              >
                <Text style={styles.primaryText}>{fr.checkin.finalize}</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewLine}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.papier },
  stepperWrap: { paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.ligne },
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
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
  roomField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 52,
    borderWidth: 1,
    borderColor: colors.ligne,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  roomFieldText: { flex: 1, fontSize: fontSize.md, color: colors.encre, fontWeight: fontWeight.semibold },
  roomFieldPlaceholder: { color: colors.fiche, fontWeight: fontWeight.regular },
  otaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.cachetDilue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  otaBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.cachet },
  dateRow: { flexDirection: 'row', gap: spacing.md },
  dateCol: { flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md, ...shadow.card },
  divider: { height: 1, backgroundColor: colors.ligne },
  primaryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cachet,
    borderRadius: radius.btn,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  primaryText: { color: colors.blanc, fontWeight: fontWeight.bold, fontSize: fontSize.md },
  secondaryBtn: { paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, borderRadius: radius.btn, borderWidth: 1, borderColor: colors.ligne },
  secondaryText: { color: colors.encre, fontWeight: fontWeight.semibold },
  navRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  flex1: { flex: 1 },
  disabled: { opacity: 0.5 },
  scanBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cachet,
    borderRadius: radius.btn,
    paddingVertical: spacing.lg,
  },
  scanText: { color: colors.blanc, fontWeight: fontWeight.bold, fontSize: fontSize.md },
  manualBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cachet,
    borderRadius: radius.btn,
    paddingVertical: spacing.md,
  },
  manualText: { color: colors.cachet, fontWeight: fontWeight.bold },
  emptyGuests: { color: colors.fiche, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.lg },
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    padding: spacing.md,
    ...shadow.card,
  },
  guestName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.encre },
  guestMeta: { fontSize: fontSize.xs, color: colors.fiche, marginTop: 1 },
  removeText: { color: colors.danger, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  hint: { color: colors.fiche, fontSize: fontSize.xs, marginTop: spacing.xs },
  dateError: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs },
  reviewNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.vigilanceFond,
    borderRadius: radius.input,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  reviewNoteText: { flex: 1, color: colors.vigilanceTexte, fontSize: fontSize.sm },
  reviewLine: { flexDirection: 'row', justifyContent: 'space-between' },
  reviewLabel: { color: colors.fiche, fontSize: fontSize.sm },
  reviewValue: { color: colors.encre, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
