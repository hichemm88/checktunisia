import { View, Text, Pressable, ScrollView, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';
import { unregisterPushToken } from '@/lib/push';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '@/theme/theme';
import { fr } from '@/i18n/fr';
import { toMobileRole } from '@/types';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() : '';
  const roleLabel = user
    ? toMobileRole(user.role) === 'manager'
      ? 'Manager'
      : 'Réceptionniste'
    : '';

  async function handleLogout() {
    await unregisterPushToken();
    await authApi.logout();
    await logout();
  }

  return (
    <View style={styles.screen}>
      <AppHeader title={fr.settings.title} />
      <ScrollView contentContainerStyle={styles.body}>
        {/* Profile */}
        <View style={styles.profileCard}>
          <Avatar name={fullName} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.roleChip}>
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {/* Onglets Société / Équipe / Activité / Abonnement (§5.7) */}
        <View style={styles.card}>
          <Row icon="business-outline" label={fr.settings.company} />
          <Divider />
          <Row icon="people-outline" label={fr.settings.team} />
          <Divider />
          <Row icon="pulse-outline" label={fr.settings.activity} />
          <Divider />
          <Row icon="card-outline" label={fr.settings.subscription} />
        </View>

        {/* Abonnement — web only, no in-app payment (§5.7) */}
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={20} color={colors.cachet} />
          <Text style={styles.noticeText}>{fr.settings.subscriptionWebOnly}</Text>
        </View>

        <Pressable style={styles.webBtn} onPress={() => Linking.openURL('https://qayed.tn')}>
          <Ionicons name="open-outline" size={18} color={colors.cachet} />
          <Text style={styles.webBtnText}>{fr.settings.openWeb}</Text>
        </Pressable>

        <Pressable style={styles.logoutBtn} onPress={handleLogout} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>{fr.settings.logout}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Row({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.cachet} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.fiche} />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.papier },
  body: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadow.card,
  },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.encre },
  email: { fontSize: fontSize.sm, color: colors.fiche, marginTop: 1 },
  roleChip: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.cachetDilue,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleText: { color: colors.cachet, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, paddingHorizontal: spacing.lg, ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  rowLabel: { flex: 1, fontSize: fontSize.base, color: colors.encre, fontWeight: fontWeight.medium },
  divider: { height: 1, backgroundColor: colors.ligne },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.cachetDilue,
    borderRadius: radius.input,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  noticeText: { flex: 1, fontSize: fontSize.sm, color: colors.encre },
  webBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cachet,
    borderRadius: radius.btn,
    paddingVertical: spacing.md,
  },
  webBtnText: { color: colors.cachet, fontWeight: fontWeight.bold, fontSize: fontSize.base },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  logoutText: { color: colors.danger, fontWeight: fontWeight.bold, fontSize: fontSize.base },
});
