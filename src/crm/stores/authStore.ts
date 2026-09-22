import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CrmUser } from '@/crm/types';

/**
 * Session du CRM de prospection — store dédié, clé localStorage distincte de
 * `useAuthStore` (app principale) : les deux sont des espaces d'auth
 * totalement séparés (voir backend, guard 'prospection').
 *
 * Pas de refresh automatique comme l'app principale : le jeton de
 * prospection est volontairement longue durée (1 an, § Authentification),
 * la reconnexion se fait simplement en cas d'expiration réelle (401).
 */
interface CrmAuthState {
  token: string | null;
  user: CrmUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: CrmUser) => void;
  setUser: (user: CrmUser) => void;
  logout: () => void;
}

export const useCrmAuthStore = create<CrmAuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    { name: 'qayed-crm-auth' },
  ),
);
