import { create } from 'zustand';
import type { AuthUser } from '@/types';
import { secureStorage, prefStorage } from '@/lib/storage';

interface AuthState {
  hydrated: boolean;
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** UUID of the active property (hotel); null = backend default (first property). */
  activePropertyId: string | null;
  activePropertyName: string | null;

  /** Load persisted token/user/active-property on app start. */
  hydrate: () => Promise<void>;
  setAuth: (token: string, user: AuthUser) => Promise<void>;
  setUser: (user: AuthUser) => Promise<void>;
  setActiveProperty: (id: string | null, name?: string | null) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  token: null,
  user: null,
  isAuthenticated: false,
  activePropertyId: null,
  activePropertyName: null,

  hydrate: async () => {
    const [token, user, active] = await Promise.all([
      secureStorage.getToken(),
      prefStorage.getUser<AuthUser>(),
      prefStorage.getActiveProperty(),
    ]);
    set({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      activePropertyId: active?.id ?? null,
      activePropertyName: active?.name ?? null,
      hydrated: true,
    });
  },

  setAuth: async (token, user) => {
    await Promise.all([secureStorage.setToken(token), prefStorage.setUser(user)]);
    set({ token, user, isAuthenticated: true });
  },

  setUser: async (user) => {
    await prefStorage.setUser(user);
    set({ user });
  },

  setActiveProperty: async (id, name = null) => {
    await prefStorage.setActiveProperty(id ? { id, name: name ?? '' } : null);
    set({ activePropertyId: id, activePropertyName: name });
  },

  logout: async () => {
    await Promise.all([secureStorage.clearToken(), prefStorage.clearAll()]);
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      activePropertyId: null,
      activePropertyName: null,
    });
  },
}));
