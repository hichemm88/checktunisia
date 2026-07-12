import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { checkInsApi } from '@/api/checkIns';
import { useAuthStore } from '@/stores/authStore';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { LoadingView, ErrorView } from '@/components/StateView';
import { extractError } from '@/lib/api';
import { shortDate, flagEmoji } from '@/lib/format';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '@/theme/theme';
import { fr } from '@/i18n/fr';
import type { Guest } from '@/types';

export default function FicheDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.role === 'hotel_admin');

  const { data: fiche, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['check-in', id],
    queryFn: () => checkInsApi.get(id),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['check-in', id] });
    void queryClient.invalidateQueries({ queryKey: ['check-ins'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const complete = useMutation({
    mutationFn: () => checkInsApi.complete(id),
    onSuccess: invalidate,
    onError: (e) => Alert.alert(fr.common.error, extractError(e)),
  });

  const checkout = useMutation({
    mutationFn: () => checkInsApi.checkout(id, new Date().toISOString()),
    onSuccess: invalidate,
    onError: (e) => Alert.alert(fr.common.error, extractError(e)),
  });

  const remove = useMutation({
    mutationFn: () => checkInsApi.deleteCheckIn(id),
    onSuccess: () => {
      invalidate();
      router.back();
    },
    onError: (e) => Alert.alert(fr.common.error, extractError(e)),
  });

  const confirmDelete = () =>
    Alert.alert(fr.history.deleteTitle, fr.history.deleteConfirm, [
      { text: fr.common.cancel, style: 'cancel' },
      { text: fr.history.delete, style: 'destructive', onPress: () => remove.mutate() },
    ]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={fr.common.back}>
          <Ionicons name="chevron-back" size={26} color={colors.encre} />
        </Pressable>
        <Text style={styles.topTitle}>{fr.history.title}</Text>
        <View style={{ width: 26 }} />
      </View>

      {isLoading ? (
        <LoadingView />
      ) : isError || !fiche ? (
        <ErrorView message={extractError(error)} onRetry={refetch} />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.reference}>{fiche.reference}</Text>
            <StatusBadge status={fiche.status} />
          </View>

          {/* Séjour */}
          <View style={styles.card}>
            <InfoLine label="Chambre" value={fiche.room?.number ? `Ch. ${fiche.room.number}` : fr.history.noUnit} />
            <InfoLine label="Arrivée" value={shortDate(fiche.check_in_date)} />
            <InfoLine label={fr.history.departure} value={shortDate(fiche.expected_check_out_date)} />
            {fiche.booking_reference ? <InfoLine label="Réservation" value={fiche.booking_reference} /> : null}
            <InfoLine label="Voyageurs" value={`${fiche.adults_count} adulte(s) · ${fiche.children_count} enfant(s)`} />
            {fiche.created_by ? (
              <InfoLine label="Saisi par" value={`${fiche.created_by.first_name} ${fiche.created_by.last_name}`} />
            ) : null}
          </View>

          {/* Voyageurs */}
          {fiche.guests && fiche.guests.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Voyageurs</Text>
              {fiche.guests.map((g) => (
                <GuestRow key={g.id} guest={g} />
              ))}
            </View>
          ) : null}

          {/* Actions selon statut (§5.5) */}
          {fiche.status === 'draft' ? (
            <Pressable
              style={styles.primaryBtn}
              onPress={() => complete.mutate()}
              disabled={complete.isPending}
            >
              <Text style={styles.primaryBtnText}>Terminer le brouillon</Text>
            </Pressable>
          ) : null}
          {fiche.status === 'active' ? (
            <Pressable
              style={styles.primaryBtn}
              onPress={() =>
                Alert.alert('Check-out', 'Confirmer le départ de ce voyageur ?', [
                  { text: fr.common.cancel, style: 'cancel' },
                  { text: 'Check-out', onPress: () => checkout.mutate() },
                ])
              }
              disabled={checkout.isPending}
            >
              <Ionicons name="exit-outline" size={18} color={colors.blanc} />
              <Text style={styles.primaryBtnText}>Check-out</Text>
            </Pressable>
          ) : null}

          {/* Suppression — réservée aux gérants (soft delete côté serveur, comme le web). */}
          {isAdmin ? (
            <Pressable style={styles.deleteBtn} onPress={confirmDelete} disabled={remove.isPending}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={styles.deleteBtnText}>
                {fiche.status === 'draft' ? fr.history.deleteDraft : fr.history.delete}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function GuestRow({ guest }: { guest: Guest }) {
  const name = `${guest.first_name} ${guest.last_name}`.trim();
  return (
    <View style={styles.guestRow}>
      <Avatar name={name} size={38} />
      <View style={{ flex: 1 }}>
        <Text style={styles.guestName}>
          {guest.nationality_code ? `${flagEmoji(guest.nationality_code)} ` : ''}
          {name}
        </Text>
        <Text style={styles.guestMeta}>
          {guest.sex} · {shortDate(guest.date_of_birth)}
          {guest.is_primary ? ' · principal' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.papier },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.encre },
  body: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reference: { fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.encre },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md, ...shadow.card },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.encre, marginBottom: spacing.xs },
  infoLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  infoLabel: { color: colors.fiche, fontSize: fontSize.sm },
  infoValue: { color: colors.encre, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, flexShrink: 1, textAlign: 'right' },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  guestName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.encre },
  guestMeta: { fontSize: fontSize.xs, color: colors.fiche, marginTop: 1 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cachet,
    borderRadius: radius.btn,
    paddingVertical: spacing.lg,
  },
  primaryBtnText: { color: colors.blanc, fontWeight: fontWeight.bold, fontSize: fontSize.md },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: spacing.lg,
  },
  deleteBtnText: { color: colors.danger, fontWeight: fontWeight.bold, fontSize: fontSize.md },
});
