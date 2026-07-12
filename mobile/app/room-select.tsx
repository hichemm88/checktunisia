import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, SectionList, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { roomsApi } from '@/api/rooms';
import { checkInsApi } from '@/api/checkIns';
import { classifyRooms, type RoomAvailability, type RoomOccupancy } from '@/lib/availability';
import { useRoomPickStore } from '@/stores/roomPickStore';
import { useAuthStore } from '@/stores/authStore';
import { LoadingView } from '@/components/StateView';
import { showToast } from '@/lib/toast';
import { shortDate, timeOfDay } from '@/lib/format';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '@/theme/theme';
import { fr, interp } from '@/i18n/fr';

/** Above this many units, show a search bar (small dars list everything directly — §1). */
const SEARCH_THRESHOLD = 8;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RoomSelectScreen() {
  const router = useRouter();
  const { arrival, departure } = useLocalSearchParams<{ arrival: string; departure: string }>();
  const activePropertyId = useAuthStore((s) => s.activePropertyId);
  const setPick = useRoomPickStore((s) => s.setPick);
  const [search, setSearch] = useState('');

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms', activePropertyId],
    queryFn: () => roomsApi.list(),
  });
  const { data: checkInsData, isLoading: ciLoading } = useQuery({
    queryKey: ['check-ins', activePropertyId],
    queryFn: () => checkInsApi.list({ per_page: 200 }),
  });

  const rooms = roomsData?.data ?? [];
  const checkIns = checkInsData?.data ?? [];

  const { available, occupied } = useMemo(
    () => classifyRooms(rooms, checkIns, arrival ?? todayStr(), departure ?? todayStr(), todayStr()),
    [rooms, checkIns, arrival, departure],
  );

  const showSearch = rooms.length > SEARCH_THRESHOLD;
  const q = search.trim().toLowerCase();
  const match = (n: string) => !q || n.toLowerCase().includes(q);

  const sections = useMemo(() => {
    const av = available.filter((a) => match(a.room.number));
    const oc = occupied.filter((o) => match(o.room.number));
    const out: { key: 'available' | 'occupied'; title: string; count: number; data: (RoomAvailability | RoomOccupancy)[] }[] = [];
    if (av.length) out.push({ key: 'available', title: fr.roomSelect.available, count: av.length, data: av });
    if (oc.length) out.push({ key: 'occupied', title: fr.roomSelect.occupied, count: oc.length, data: oc });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, occupied, q]);

  function chooseRoom(roomId: string, roomNumber: string) {
    setPick({ roomId, roomNumber });
    router.back();
  }

  function chooseNone() {
    setPick({});
    router.back();
  }

  function onOccupiedPress(o: RoomOccupancy) {
    const date = shortDate(o.until);
    showToast(
      o.guest
        ? interp(fr.roomSelect.occupiedToast, { date, guest: o.guest })
        : interp(fr.roomSelect.occupiedToastNoGuest, { date }),
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={fr.common.back}>
          <Ionicons name="chevron-back" size={26} color={colors.encre} />
        </Pressable>
        <Text style={styles.topTitle}>{fr.roomSelect.title}</Text>
        <View style={{ width: 26 }} />
      </View>

      {showSearch ? (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.fiche} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={fr.roomSelect.searchPlaceholder}
            placeholderTextColor={colors.fiche}
            autoCorrect={false}
          />
        </View>
      ) : null}

      {roomsLoading || ciLoading ? (
        <LoadingView />
      ) : (
        <SectionList
          sections={sections as never}
          keyExtractor={(item: RoomAvailability | RoomOccupancy) => item.room.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <Text style={styles.empty}>{rooms.length === 0 ? fr.roomSelect.noRooms : fr.roomSelect.noMatch}</Text>
          }
          renderSectionHeader={({ section }) => {
            const s = section as unknown as { title: string; count: number };
            return (
              <Text style={styles.sectionTitle}>
                {s.title} · {s.count}
              </Text>
            );
          }}
          renderItem={({ item, section }) =>
            (section as unknown as { key: string }).key === 'available' ? (
              <AvailableCard item={item as RoomAvailability} onPress={chooseRoom} />
            ) : (
              <OccupiedCard item={item as RoomOccupancy} onPress={onOccupiedPress} />
            )
          }
          renderSectionFooter={({ section }) =>
            (section as unknown as { key: string }).key === (sections[sections.length - 1]?.key ?? '') ? (
              <Pressable style={styles.noneLink} onPress={chooseNone}>
                <Text style={styles.noneText}>{fr.roomSelect.continueWithout}</Text>
              </Pressable>
            ) : null
          }
          ListFooterComponent={
            sections.length === 0 && rooms.length === 0 ? (
              <Pressable style={styles.noneLink} onPress={chooseNone}>
                <Text style={styles.noneText}>{fr.roomSelect.continueWithout}</Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function AvailableCard({
  item,
  onPress,
}: {
  item: RoomAvailability;
  onPress: (roomId: string, roomNumber: string) => void;
}) {
  const { room, departureDueToday, freeHint } = item;
  let sub = '';
  if (departureDueToday) sub = fr.roomSelect.departureDueToday;
  else if (freeHint?.kind === 'since') sub = interp(fr.roomSelect.freeSince, { date: shortDate(freeHint.date) });
  else if (freeHint?.kind === 'freedToday') sub = interp(fr.roomSelect.freedToday, { time: timeOfDay(freeHint.iso) });

  return (
    <Pressable
      style={[styles.card, styles.cardAvailable, departureDueToday && styles.cardAmber]}
      onPress={() => onPress(room.id, room.number)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.roomName}>Ch. {room.number}</Text>
        {sub ? <Text style={[styles.roomSub, departureDueToday && styles.amberText]}>{sub}</Text> : null}
      </View>
      {departureDueToday ? <View style={styles.amberDot} /> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.fiche} />
    </Pressable>
  );
}

function OccupiedCard({ item, onPress }: { item: RoomOccupancy; onPress: (o: RoomOccupancy) => void }) {
  const { room, until, guest } = item;
  const sub = guest
    ? interp(fr.roomSelect.occupiedWithGuest, { guest, date: shortDate(until) })
    : interp(fr.roomSelect.occupiedNoGuest, { date: shortDate(until) });
  return (
    <Pressable style={[styles.card, styles.cardOccupied]} onPress={() => onPress(item)}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.roomName, styles.mutedText]}>Ch. {room.number}</Text>
        <Text style={styles.roomSubMuted}>{sub}</Text>
      </View>
      <Ionicons name="lock-closed" size={16} color={colors.fiche} />
    </Pressable>
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.ligne,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.encre },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing['3xl'] },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.fiche,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  cardAvailable: { borderLeftWidth: 3, borderLeftColor: colors.conforme },
  cardAmber: { borderLeftColor: colors.vigilance },
  cardOccupied: { opacity: 0.7 },
  roomName: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.encre },
  roomSub: { fontSize: fontSize.sm, color: colors.fiche, marginTop: 1 },
  roomSubMuted: { fontSize: fontSize.sm, color: colors.fiche, marginTop: 1 },
  mutedText: { color: colors.fiche },
  amberText: { color: colors.vigilanceTexte, fontWeight: fontWeight.semibold },
  amberDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.vigilance },
  noneLink: { alignSelf: 'center', paddingVertical: spacing.lg, marginTop: spacing.sm },
  noneText: { color: colors.cachet, fontWeight: fontWeight.semibold, textDecorationLine: 'underline' },
  empty: { textAlign: 'center', color: colors.fiche, paddingVertical: spacing['2xl'] },
});
