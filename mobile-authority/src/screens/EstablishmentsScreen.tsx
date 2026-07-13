import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, type, radius } from '../theme/tokens';
import { bodyFont, textStart } from '../theme/typography';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { FreshnessTag } from '../components/FreshnessTag';
import { CHEVRON_FORWARD } from '../components/icons';
import { getEstablishments, EstablishmentListItem } from '../api/services';
import { getLocationIfGranted, GeoPoint } from '../lib/geo';
import { EstablishmentsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<EstablishmentsStackParamList, 'EstablishmentsList'>;

/** Onglet Établissements (F4) — liste zone, recherche, tri proximité/alpha. */
export const EstablishmentsScreen: React.FC<Props> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  const [items, setItems] = useState<EstablishmentListItem[]>([]);
  const [nowMs, setNowMs] = useState(Date.now());

  // Proximité seulement si permission déjà accordée (pas de prompt au lancement).
  useEffect(() => { getLocationIfGranted().then(setOrigin); }, []);

  const load = useCallback(async () => {
    setNowMs(Date.now());
    const list = await getEstablishments(search, origin);
    setItems(list);
  }, [search, origin]);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen title={t('establishments.title')} scroll={false}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.fiche} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('establishments.searchPlaceholder')}
          placeholderTextColor={colors.fiche}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')} hitSlop={10} accessibilityRole="button">
            <Ionicons name="close-circle" size={20} color={colors.fiche} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.sortRow}>
        <Ionicons name={origin ? 'navigate' : 'text'} size={13} color={colors.fiche} />
        <Text style={styles.sortText}>
          {origin ? t('establishments.sortedByProximity') : t('establishments.sortedAlpha')}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingBottom: spacing.xxxl, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>{t('establishments.empty')}</Text>}
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate('EstablishmentDetail', { establishmentId: item.id })}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {item.type_label} · {item.city}
                  {item.distance_km != null ? ` · ${item.distance_km.toFixed(1)} km` : ''}
                </Text>
              </View>
              <Ionicons name={CHEVRON_FORWARD} size={20} color={colors.fiche} />
            </View>

            <View style={styles.metaRow}>
              <Pill icon="people-outline" text={t('establishments.presentCount', { count: item.present_count })} strong={item.present_count > 0} />
              <Pill icon="bed-outline" text={t('establishments.roomsCount', { count: item.room_count })} />
            </View>

            <View style={styles.freshness}>
              <FreshnessTag lastSheetAt={item.last_sheet_at} lang={i18n.language} nowMs={nowMs} />
            </View>
          </Card>
        )}
      />
    </Screen>
  );
};

const Pill: React.FC<{ icon: keyof typeof Ionicons.glyphMap; text: string; strong?: boolean }> = ({ icon, text, strong }) => (
  <View style={styles.pill}>
    <Ionicons name={icon} size={14} color={strong ? colors.cachet : colors.fiche} />
    <Text style={[styles.pillText, strong && { color: colors.cachet, fontFamily: bodyFont('bold') }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.blanc, borderRadius: radius.input,
    borderWidth: 1.5, borderColor: colors.ligne,
    paddingHorizontal: spacing.md, height: 52, marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontFamily: bodyFont('regular'), fontSize: type.body, color: colors.encre, textAlign: textStart },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  sortText: { fontFamily: bodyFont('medium'), fontSize: type.caption, color: colors.fiche },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  name: { fontFamily: bodyFont('bold'), fontSize: type.body, color: colors.encre, textAlign: textStart },
  sub: { fontFamily: bodyFont('regular'), fontSize: type.caption, color: colors.fiche, marginTop: 2, textAlign: textStart },
  metaRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  pill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pillText: { fontFamily: bodyFont('medium'), fontSize: type.caption, color: colors.fiche },
  freshness: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ligne },
  empty: { fontFamily: bodyFont('regular'), fontSize: type.label, color: colors.fiche, textAlign: 'center', marginTop: spacing.xxl },
});
