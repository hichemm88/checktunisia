import { useEffect, useRef } from 'react';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';
import { hasPushPermission, registerPushToken } from '@/lib/push';
import { PUSH_PROMPT_SEEN_KEY } from '../notifications-permission';
import { toMobileRole } from '@/types';
import { colors, fontSize, fontWeight } from '@/theme/theme';
import { fr } from '@/i18n/fr';

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IoniconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

/** 5-tab bottom navigation, identical to the web (§5.0). Auth-gated. */
export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const router = useRouter();
  const didBootstrap = useRef(false);

  // Managers: show the permission explainer once (§6.4), then keep the token fresh.
  useEffect(() => {
    if (!isAuthenticated || !role || didBootstrap.current) return;
    if (toMobileRole(role) !== 'manager') return;
    didBootstrap.current = true;
    (async () => {
      const seen = await AsyncStorage.getItem(PUSH_PROMPT_SEEN_KEY);
      if (!seen) {
        router.push('/notifications-permission');
      } else if (await hasPushPermission()) {
        await registerPushToken();
      }
    })();
  }, [isAuthenticated, role, router]);

  if (!isAuthenticated) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.cachet,
        tabBarInactiveTintColor: colors.fiche,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.ligne, height: 64, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
      }}
    >
      <Tabs.Screen name="index" options={{ title: fr.nav.home, tabBarIcon: tabIcon('home-outline') }} />
      <Tabs.Screen name="check-in" options={{ title: fr.nav.checkin, tabBarIcon: tabIcon('add-circle-outline') }} />
      <Tabs.Screen name="history" options={{ title: fr.nav.history, tabBarIcon: tabIcon('time-outline') }} />
      <Tabs.Screen name="properties" options={{ title: fr.nav.properties, tabBarIcon: tabIcon('business-outline') }} />
      <Tabs.Screen name="settings" options={{ title: fr.nav.settings, tabBarIcon: tabIcon('settings-outline') }} />
    </Tabs>
  );
}
