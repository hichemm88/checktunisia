import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '@/stores/authStore';
import { useQueueStore } from '@/stores/queueStore';
import { configureNotifications, addNotificationListeners } from '@/lib/push';
import { colors } from '@/theme/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrateQueue = useQueueStore((s) => s.hydrate);
  const processQueue = useQueueStore((s) => s.processAll);

  useEffect(() => {
    void hydrate();
    void hydrateQueue();
  }, [hydrate, hydrateQueue]);

  // Flush the offline check-in queue whenever connectivity is (re)gained (§8).
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) void processQueue();
    });
    return unsubscribe;
  }, [processQueue]);

  // Notifications: foreground/tap behaviour + keep the centre fresh on receipt (§6.4).
  useEffect(() => {
    void configureNotifications();
    const remove = addNotificationListeners(() => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    return remove;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {hydrated ? (
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="fiche/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="scan-mrz" options={{ presentation: 'card' }} />
            <Stack.Screen name="checkin-manual" options={{ presentation: 'card' }} />
            <Stack.Screen name="room-select" options={{ presentation: 'card' }} />
            <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
            <Stack.Screen name="notify-team" options={{ presentation: 'card' }} />
            <Stack.Screen name="notifications-permission" options={{ presentation: 'modal' }} />
          </Stack>
        ) : (
          <View style={styles.splash}>
            <ActivityIndicator color={colors.cachet} size="large" />
          </View>
        )}
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.encre, alignItems: 'center', justifyContent: 'center' },
});
