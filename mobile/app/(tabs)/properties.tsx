import { View, Text, Pressable, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { organizationApi } from '@/api/organization';
import { useAuthStore } from '@/stores/authStore';
import { AppHeader } from '@/components/AppHeader';
import { LoadingView, ErrorView, EmptyView } from '@/components/StateView';
import { extractError } from '@/lib/api';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '@/theme/theme';
import { fr, plural } from '@/i18n/fr';
import { getPropertyTypeName, type Property } from '@/types';

export default function PropertiesScreen() {
  const activePropertyId = useAuthStore((s) => s.activePropertyId);
  const setActiveProperty = useAuthStore((s) => s.setActiveProperty);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['organization'],
    queryFn: organizationApi.get,
  });

  return (
    <View style={styles.screen}>
      <AppHeader title={fr.properties.myProperties} />
      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorView message={extractError(error)} onRetry={refetch} />
      ) : !data ? null : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.cachet} />
          }
        >
          {/* Company card */}
          <View style={styles.orgCard}>
            <Text style={styles.orgName}>{data.name || fr.properties.myOrganization}</Text>
            <Text style={styles.orgMeta}>
              {plural(fr.properties, 'propertiesCount', data.properties.length)} ·{' '}
              {plural(fr.properties, 'unitsTotalCount', data.total_rooms)}
            </Text>
          </View>

          <Text style={styles.hint}>{fr.properties.selectActiveProperty}</Text>

          {data.properties.length === 0 ? (
            <EmptyView title={fr.properties.noPropertyRegistered} />
          ) : (
            data.properties.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                isActive={activePropertyId === p.id}
                onSelect={() => setActiveProperty(p.id, p.name)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function PropertyCard({
  property,
  isActive,
  onSelect,
}: {
  property: Property;
  isActive: boolean;
  onSelect: () => void;
}) {
  const city = property.address?.city;
  return (
    <View style={[styles.card, isActive && styles.cardActive]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{property.name}</Text>
          <Text style={styles.cardType}>
            {getPropertyTypeName(property.type)}
            {city ? ` · ${city}` : ''}
          </Text>
          <Text style={styles.cardUnits}>{plural(fr.properties, 'unitsCount', property.room_count)}</Text>
        </View>
        {isActive ? (
          <View style={styles.activeBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.conformeTexte} />
            <Text style={styles.activeBadgeText}>{fr.properties.activeBadge}</Text>
          </View>
        ) : null}
      </View>

      {isActive ? (
        <Text style={styles.selectedNote}>{fr.properties.propertySelected}</Text>
      ) : (
        <Pressable style={styles.selectBtn} onPress={onSelect} accessibilityRole="button">
          <Text style={styles.selectBtnText}>{fr.properties.setAsActive}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.papier },
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  orgCard: { backgroundColor: colors.encre, borderRadius: radius.card, padding: spacing.xl, gap: 4 },
  orgName: { color: colors.blanc, fontSize: fontSize.lg, fontWeight: fontWeight.black },
  orgMeta: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm },
  hint: { color: colors.fiche, fontSize: fontSize.sm, marginTop: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md, ...shadow.card },
  cardActive: { borderWidth: 2, borderColor: colors.cachet },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.encre },
  cardType: { fontSize: fontSize.sm, color: colors.fiche, marginTop: 2 },
  cardUnits: { fontSize: fontSize.sm, color: colors.fiche, marginTop: 2 },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.conformeFond,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadgeText: { color: colors.conformeTexte, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  selectBtn: {
    backgroundColor: colors.cachetDilue,
    borderRadius: radius.btn,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  selectBtnText: { color: colors.cachet, fontWeight: fontWeight.bold, fontSize: fontSize.base },
  selectedNote: { color: colors.conformeTexte, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
