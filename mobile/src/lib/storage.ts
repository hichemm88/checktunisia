import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The auth token is sensitive → expo-secure-store (Keychain / Keystore).
 * Non-sensitive preferences (active property, cached user) → AsyncStorage.
 * SecureStore values are capped at ~2 KB, so only the short token lives there.
 */
const TOKEN_KEY = 'qayed.token';
const USER_KEY = 'qayed.user';
const ACTIVE_PROPERTY_KEY = 'qayed.activeProperty';

export const secureStorage = {
  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

export const prefStorage = {
  async getUser<T>(): Promise<T | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async setUser(user: unknown): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  async getActiveProperty(): Promise<{ id: string; name: string } | null> {
    const raw = await AsyncStorage.getItem(ACTIVE_PROPERTY_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  async setActiveProperty(value: { id: string; name: string } | null): Promise<void> {
    if (value) await AsyncStorage.setItem(ACTIVE_PROPERTY_KEY, JSON.stringify(value));
    else await AsyncStorage.removeItem(ACTIVE_PROPERTY_KEY);
  },
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([USER_KEY, ACTIVE_PROPERTY_KEY]);
  },
};
