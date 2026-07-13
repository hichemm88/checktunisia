import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { colors } from '../theme/tokens';
import { useAuth } from '../auth/AuthContext';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { LockScreen } from '../screens/LockScreen';
import { MainTabs } from './MainTabs';
import { navigationRef, openAlertFromPush } from './navigationRef';
import { parseAlertData, configurePushChannel } from '../notifications/push';

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.papier, primary: colors.cachet },
};

/** Réinitialise le minuteur d'inactivité sur toute interaction (session courte, F1). */
const ActivityTracker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { touch } = useAuth();
  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => { touch(); return false; }}
    >
      {children}
    </View>
  );
};

/** Écoute les taps sur notification push → ouvre le détail de l'alerte (F5). */
const PushDeepLinks: React.FC = () => {
  useEffect(() => {
    configurePushChannel();

    // App ouverte depuis une notification (cold start).
    Notifications.getLastNotificationResponseAsync().then((res) => {
      const data = parseAlertData(res?.notification.request.content.data);
      if (data) setTimeout(() => openAlertFromPush(data.alertId), 400);
    });

    // App déjà lancée : tap sur la notification.
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = parseAlertData(res.notification.request.content.data);
      if (data) openAlertFromPush(data.alertId);
    });
    return () => sub.remove();
  }, []);
  return null;
};

export const RootNavigator: React.FC = () => {
  const { status } = useAuth();

  if (status === 'loading') return <SplashScreen />;
  if (status === 'needsLogin') return <LoginScreen />;
  if (status === 'locked') return <LockScreen />;

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <ActivityTracker>
        <MainTabs />
      </ActivityTracker>
      <PushDeepLinks />
    </NavigationContainer>
  );
};
