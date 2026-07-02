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
  setAuth: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    { name: 'checktunisia-auth', partialize: (s) => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated }) },
  ),
);
