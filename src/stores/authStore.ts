import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'platform_admin' | 'hotel_admin' | 'receptionist' | 'authority_user';

export interface AuthorityProfile {
  org_id: number;
  org_name: string;
  org_type: 'ministry' | 'police';
  governorate: string | null;
  badge_number: string | null;
  rank: string | null;
  expires_at: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  hotel?: {
    id: string;
    name: string;
    slug: string;
    type?: string;
    subscription_status: string;
    subscription_expires_at?: string;
  } | null;
  authority_profile?: AuthorityProfile | null;
  permissions: string[];
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** UUID of the currently active property (hotel). null = first property (default). */
  activePropertyId: string | null;
  /** Display name of the active property. Kept in sync with activePropertyId. */
  activePropertyName: string | null;
  setAuth: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  setActiveProperty: (propertyId: string | null, propertyName?: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      activePropertyId: null,
      activePropertyName: null,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      setActiveProperty: (propertyId, propertyName = null) =>
        set({ activePropertyId: propertyId, activePropertyName: propertyName }),
      logout: () =>
        set({ token: null, user: null, isAuthenticated: false, activePropertyId: null, activePropertyName: null }),
    }),
    {
      name: 'checktunisia-auth',
      partialize: (s) => ({
        token: s.token,
        user: s.user,
        isAuthenticated: s.isAuthenticated,
        activePropertyId: s.activePropertyId,
        activePropertyName: s.activePropertyName,
      }),
    },
  ),
);
