import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Alert, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, type, radius } from '../theme/tokens';
import { bodyFont, monoStyle, textStart } from '../theme/typography';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { CHEVRON_FORWARD } from '../components/icons';
import { changeLanguage, Lang } from '../i18n';
import { loadNotifPrefs, saveNotifPrefs, NotifPrefs } from '../notifications/prefs';
import { CENTRAL_PHONE } from '../api/seed';
import { useAuth } from '../auth/AuthContext';
import { SettingsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsMain'>;

const LANGS: { code: Lang; key: string }[] = [
  { code: 'ar', key: 'settings.languageArabic' },
  { code: 'fr', key: 'settings.languageFrench' },
  { code: 'en', key: 'settings.languageEnglish' },
];

/** Paramètres (F7) — minimal : langue, notifications, activité, central, déconnexion. */
export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { agent, logout } = useAuth();
  const [prefs, setPrefs] = useState<NotifPrefs>({ critique: true, eleve: false, moyen: false });

  useEffect(() => { loadNotifPrefs().then(setPrefs); }, []);

  const onPickLang = async (code: Lang) => {
    if (code === i18n.language) return;
    const { needsRestart } = await changeLanguage(code);
    if (needsRestart) {
      // Le flip RTL/LTR impose un redémarrage — l'annoncer clairement (§6).
      Alert.alert(t('settings.restartNeeded'), t('settings.restartNeededBody'));
    }
  };

  const updatePref = (patch: Partial<NotifPrefs>) => {
    const next = { ...prefs, ...patch, critique: true as const };
    setPrefs(next);
    saveNotifPrefs(next);
  };

  const confirmLogout = () => {
    Alert.alert('', t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: logout },
    ]);
  };

  const version = (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

  return (
    <Screen title={t('settings.title')}>
      {agent ? (
        <Card style={styles.agentCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{agent.name.split(' ').map((s) => s[0]).join('').slice(0, 2)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.agentName}>{agent.name}</Text>
            <Text style={[styles.agentBadge, monoStyle]}>{agent.badge_number} · {agent.zone}</Text>
          </View>
        </Card>
      ) : null}

      {/* Langue */}
      <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
      <View style={styles.langRow}>
        {LANGS.map((l) => {
          const active = i18n.language === l.code;
          return (
            <Pressable
              key={l.code}
              onPress={() => onPickLang(l.code)}
              style={[styles.langChip, active && styles.langChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.langText, active && styles.langTextActive]}>{t(l.key)}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Notifications */}
      <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
      <Card padded={false}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>{t('settings.notifCritical')}</Text>
            <Text style={styles.toggleHint}>{t('settings.notifCriticalHint')}</Text>
          </View>
          <Switch value disabled trackColor={{ true: colors.critique }} thumbColor={colors.blanc} />
        </View>
        <View style={[styles.toggleRow, styles.divider]}>
          <Text style={styles.toggleLabel}>{t('settings.notifHigh')}</Text>
          <Switch
            value={prefs.eleve}
            onValueChange={(v) => updatePref({ eleve: v })}
            trackColor={{ true: colors.cachet, false: colors.ligne }}
            thumbColor={colors.blanc}
          />
        </View>
        <View style={[styles.toggleRow, styles.divider]}>
          <Text style={styles.toggleLabel}>{t('settings.notifMedium')}</Text>
          <Switch
            value={prefs.moyen}
            onValueChange={(v) => updatePref({ moyen: v })}
            trackColor={{ true: colors.cachet, false: colors.ligne }}
            thumbColor={colors.blanc}
          />
        </View>
      </Card>

      {/* Mon activité + central */}
      <Card padded={false} style={{ marginTop: spacing.lg }}>
        <Pressable style={styles.linkRow} onPress={() => navigation.navigate('Activity')} accessibilityRole="button">
          <Ionicons name="receipt-outline" size={22} color={colors.cachet} />
          <View style={{ flex: 1 }}>
            <Text style={styles.linkLabel}>{t('settings.myActivity')}</Text>
            <Text style={styles.linkHint}>{t('settings.myActivityHint')}</Text>
          </View>
          <Ionicons name={CHEVRON_FORWARD} size={20} color={colors.fiche} />
        </Pressable>
        <View style={[styles.linkRow, styles.divider]}>
          <Ionicons name="call-outline" size={22} color={colors.cachet} />
          <View style={{ flex: 1 }}>
            <Text style={styles.linkLabel}>{t('settings.central')}</Text>
            <Text style={styles.linkHint}>{t('settings.centralHint')}</Text>
          </View>
          <Text style={[styles.centralNum, monoStyle]}>{CENTRAL_PHONE}</Text>
        </View>
      </Card>

      {/* Déconnexion */}
      <Pressable style={styles.logout} onPress={confirmLogout} accessibilityRole="button">
        <Ionicons name="log-out-outline" size={20} color={colors.critique} />
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </Pressable>

      <Text style={styles.version}>{t('settings.version', { version })}</Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  agentCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.cachet, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: bodyFont('bold'), fontSize: type.body, color: colors.blanc },
  agentName: { fontFamily: bodyFont('bold'), fontSize: type.body, color: colors.encre, textAlign: textStart },
  agentBadge: { fontSize: type.caption, color: colors.fiche, marginTop: 2 },
  sectionTitle: { fontFamily: bodyFont('bold'), fontSize: type.label, color: colors.fiche, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing.xl, marginBottom: spacing.md, textAlign: textStart },
  langRow: { flexDirection: 'row', gap: spacing.sm },
  langChip: { flex: 1, height: 48, borderRadius: radius.btn, borderWidth: 1.5, borderColor: colors.ligne, backgroundColor: colors.blanc, alignItems: 'center', justifyContent: 'center' },
  langChipActive: { borderColor: colors.cachet, backgroundColor: colors.cachetDilue },
  langText: { fontFamily: bodyFont('medium'), fontSize: type.label, color: colors.encre },
  langTextActive: { fontFamily: bodyFont('bold'), color: colors.cachetFonce },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ligne },
  toggleLabel: { fontFamily: bodyFont('medium'), fontSize: type.body, color: colors.encre, textAlign: textStart },
  toggleHint: { fontFamily: bodyFont('regular'), fontSize: type.caption, color: colors.fiche, marginTop: 2, textAlign: textStart },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  linkLabel: { fontFamily: bodyFont('bold'), fontSize: type.body, color: colors.encre, textAlign: textStart },
  linkHint: { fontFamily: bodyFont('regular'), fontSize: type.caption, color: colors.fiche, marginTop: 2, textAlign: textStart },
  centralNum: { fontSize: type.label, color: colors.cachet },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xxl, paddingVertical: spacing.lg, borderRadius: radius.btn, borderWidth: 1.5, borderColor: colors.critique },
  logoutText: { fontFamily: bodyFont('bold'), fontSize: type.body, color: colors.critique },
  version: { fontFamily: bodyFont('regular'), fontSize: type.caption, color: colors.fiche, textAlign: 'center', marginTop: spacing.lg },
});
