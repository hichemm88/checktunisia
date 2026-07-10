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
import { getPropertyTypeName, toMobileRole, type Property } from '@/types';

export default function PropertiesScreen() {
  const activePropertyId = useAuthStore((s) => s.activePropertyId);
  const setActiveProperty = useAuthStore((s) => s.setActiveProperty);
  const role = useAuthStore((s) => s.user?.role);
  const isManager = role ? toMobileRole(role) === 'manager' : false;

  // Managers get the full organisation (GET /hotel/organization — admin-only).
  // Receptionists get only their assigned properties (GET /hotel/my-properties — both roles),
  // so they can still switch the active establishment without a 403.
  const orgQuery = useQuery({ queryKey: ['organization'], queryFn: organizationApi.get, enabled: isManager });
  const myQuery = useQuery({ queryKey: ['my-properties'], queryFn: organizationApi.myProperties, enabled: !isManager });
  const query = isManager ? orgQuery : myQuery;

  return (
    <View style={styles.screen}>
      <AppHeader title={fr.properties.myProperties} />
      {query.isLoading ? (
        <LoadingView />
      ) : query.isError ? (
        <ErrorView message={extractError(query.error)} onRetry={query.refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={colors.cachet} />
          }
        >
          {isManager && orgQuery.data ? (
            <>
              <View style={styles.orgCard}>
                <Text style={styles.orgName}>{orgQuery.data.name || fr.properties.myOrganization}</Text>
                <Text style={styles.orgMeta}>
                  {plural(fr.properties, 'propertiesCount', orgQuery.data.properties.length)} ·{' '}
                  {plural(fr.properties, 'unitsTotalCount', orgQuery.data.total_rooms)}
                </Text>
              </View>
              <Text style={styles.hint}>{fr.properties.selectActiveProperty}</Text>
              {orgQuery.data.properties.length === 0 ? (
                <EmptyView title={fr.properties.noPropertyRegistered} />
              ) : (
                orgQuery.data.properties.map((p) => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    isActive={activePropertyId === p.id}
                    onSelect={() => setActiveProperty(p.id, p.name)}
                  />
                ))
              )}
            </>
          ) : null}

          {!isManager && myQuery.data ? (
            <>
              <Text style={styles.hint}>{fr.properties.selectActiveProperty}</Text>
              {myQuery.data.length === 0 ? (
                <EmptyView title={fr.properties.noPropertyAssigned} />
              ) : (
                myQuery.data.map((p) => (
                  <SimplePropertyCard
                    key={p.id}
                    name={p.name}
                    isActive={activePropertyId === p.id}
                    onSelect={() => setActiveProperty(p.id, p.name)}
                  />
                ))
              )}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function SimplePropertyCard({
  name,
  isActive,
  onSelect,
}: {
  name: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <View style={[styles.card, isActive && styles.cardActive]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{name}</Text>
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
