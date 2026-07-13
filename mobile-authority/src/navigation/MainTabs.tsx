import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, type } from '../theme/tokens';
import {
  MainTabParamList, HomeStackParamList, VerifyStackParamList,
  EstablishmentsStackParamList, SettingsStackParamList,
} from './types';

import { HomeScreen } from '../screens/HomeScreen';
import { AlertDetailScreen } from '../screens/AlertDetailScreen';
import { VerifyScreen } from '../screens/VerifyScreen';
import { MrzScanScreen } from '../screens/MrzScanScreen';
import { ManualEntryScreen } from '../screens/ManualEntryScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { EstablishmentsScreen } from '../screens/EstablishmentsScreen';
import { EstablishmentDetailScreen } from '../screens/EstablishmentDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ActivityScreen } from '../screens/ActivityScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const VerifyStack = createNativeStackNavigator<VerifyStackParamList>();
const EstStack = createNativeStackNavigator<EstablishmentsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

const stackOptions = { headerShown: false } as const;

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackOptions}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="AlertDetail" component={AlertDetailScreen} />
    </HomeStack.Navigator>
  );
}

function VerifyNavigator() {
  return (
    <VerifyStack.Navigator screenOptions={stackOptions}>
      <VerifyStack.Screen name="VerifyMain" component={VerifyScreen} />
      <VerifyStack.Screen name="MrzScan" component={MrzScanScreen} />
      <VerifyStack.Screen name="ManualEntry" component={ManualEntryScreen} />
      <VerifyStack.Screen name="Result" component={ResultScreen} options={{ gestureEnabled: false }} />
    </VerifyStack.Navigator>
  );
}

function EstablishmentsNavigator() {
  return (
    <EstStack.Navigator screenOptions={stackOptions}>
      <EstStack.Screen name="EstablishmentsList" component={EstablishmentsScreen} />
      <EstStack.Screen name="EstablishmentDetail" component={EstablishmentDetailScreen} />
    </EstStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={stackOptions}>
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStack.Screen name="Activity" component={ActivityScreen} />
    </SettingsStack.Navigator>
  );
}

const ICONS: Record<keyof MainTabParamList, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  HomeTab: { on: 'home', off: 'home-outline' },
  VerifyTab: { on: 'scan', off: 'scan-outline' },
  EstablishmentsTab: { on: 'business', off: 'business-outline' },
  SettingsTab: { on: 'settings', off: 'settings-outline' },
};

/** Navigation à 4 onglets (§3) — pas de 5e onglet, pas de hamburger. */
export const MainTabs: React.FC = () => {
  const { t } = useTranslation();
  const labels: Record<keyof MainTabParamList, string> = {
    HomeTab: t('tabs.home'),
    VerifyTab: t('tabs.verify'),
    EstablishmentsTab: t('tabs.establishments'),
    SettingsTab: t('tabs.settings'),
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.cachet,
        tabBarInactiveTintColor: colors.fiche,
        tabBarStyle: {
          backgroundColor: colors.blanc,
          borderTopColor: colors.ligne,
          height: Platform.OS === 'ios' ? 86 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: type.caption - 1 },
        tabBarIcon: ({ focused, color }) => {
          const ic = ICONS[route.name as keyof MainTabParamList];
          return <Ionicons name={focused ? ic.on : ic.off} size={24} color={color} />;
        },
        tabBarLabel: labels[route.name as keyof MainTabParamList],
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeNavigator} />
      <Tab.Screen name="VerifyTab" component={VerifyNavigator} />
      <Tab.Screen name="EstablishmentsTab" component={EstablishmentsNavigator} />
      <Tab.Screen name="SettingsTab" component={SettingsNavigator} />
    </Tab.Navigator>
  );
};
