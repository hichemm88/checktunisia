import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { checkInsApi } from '@/api/checkIns';
import { useAuthStore } from '@/stores/authStore';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingView, ErrorView, EmptyView } from '@/components/StateView';
import { extractError } from '@/lib/api';
import { shortDate, flagEmoji } from '@/lib/format';
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme/theme';
import { fr } from '@/i18n/fr';
import type { CheckIn } from '@/types';

type Filter = 'all' | 'draft' | 'active' | 'completed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: fr.history.filterAll },
  { key: 'draft', label: fr.status.draft },
  { key: 'active', label: fr.status.active },
  { key: 'completed', label: fr.status.completed },
];

export default function HistoryScreen() {
  const router = useRouter();
  const activePropertyId = useAuthStore((s) => s.activePropertyId);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['check-ins', activePropertyId],
    queryFn: () => checkInsApi.list({ per_page: 100 }),
  });

  const items = useMemo(() => {
    const all = data?.data ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((c) => {
      if (filter !== 'all' && c.status !== filter) return false;
      if (!q) return true;
      const name = `${c.primary_guest?.first_name ?? ''} ${c.primary_guest?.last_name ?? ''}`.toLowerCase();
      return (
        name.includes(q) ||
        c.reference.toLowerCase().includes(q) ||
        (c.room?.number ?? '').toLowerCase().includes(q)
      );
    });
  }, [data, search, filter]);

  return (
    <View style={styles.screen}>
      <AppHeader title={fr.history.title} />

      <View style={styles.controls}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.fiche} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={fr.history.searchPlaceholder}
            placeholderTextColor={colors.fiche}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.filters}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorView message={extractError(error)} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyView title={fr.common.noResults} subtitle={fr.history.tryOtherFilter} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <FicheRow item={item} onPress={() => router.push(`/fiche/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

function FicheRow({ item, onPress }: { item: CheckIn; onPress: () => void }) {
  const name = item.primary_guest
    ? `${item.primary_guest.first_name} ${item.primary_guest.last_name}`.trim()
    : fr.history.noGuest;
  const nat = item.primary_guest?.nationality_code;
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <Avatar name={name} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>
          {nat ? `${flagEmoji(nat)} ` : ''}
          {name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {item.room?.number ? `Ch. ${item.room.number}` : fr.history.noUnit} · {item.reference}
        </Text>
        <Text style={styles.rowDates} numberOfLines={1}>
          {shortDate(item.check_in_date)} → {shortDate(item.expected_check_out_date)}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <StatusBadge status={item.status} />
        <Ionicons name="chevron-forward" size={18} color={colors.fiche} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.papier },
  controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.ligne,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: fontSize.base, color: colors.encre },
  filters: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.ligne,
  },
  chipActive: { backgroundColor: colors.cachet, borderColor: colors.cachet },
  chipText: { fontSize: fontSize.sm, color: colors.fiche, fontWeight: fontWeight.semibold },
  chipTextActive: { color: colors.blanc },
  list: { padding: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  rowName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.encre },
  rowMeta: { fontSize: fontSize.sm, color: colors.fiche, marginTop: 1 },
  rowDates: { fontSize: fontSize.xs, color: colors.fiche, marginTop: 1 },
  rowRight: { alignItems: 'flex-end', gap: spacing.sm },
});
