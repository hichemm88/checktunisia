import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setSentryUser } from '@/lib/sentry';
import { queryClient } from '@/lib/queryClient';

export type Role = 'platform_admin' | 'hotel_admin' | 'receptionist' | 'authority_user';

/** Rôle intra-organisation (hôtel) : propriétaire unique ou administrateur. */
export type RoleOrg = 'owner' | 'admin';

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
  phone?: string | null;
  role: Role;
  /** Renseigné pour les hotel_admin ; null pour les autres rôles plateforme. */
  role_org?: RoleOrg | null;
  hotel?: {
    id: string;
    name: string;
    slug: string;
    type?: string;
    room_count?: number;
    subscription_status: string;
    subscription_expires_at?: string;
  } | null;
  authority_profile?: AuthorityProfile | null;
  permissions: string[];
  /**
   * État de sécurité du compte, renvoyé par /auth/login, /auth/me et la
   * connexion par passkey. Absent des sessions ouvertes avant la mise en
   * place des passkeys — d'où l'optionalité, qui évite de déconnecter tout
   * le monde au déploiement.
   */
  security?: {
    two_factor_enabled: boolean;
    passkeys_count: number;
    recovery_codes_remaining: number;
    auth_method: 'password' | 'totp' | 'recovery_code' | 'passkey' | 'whatsapp_otp' | null;
  } | null;
  /** Échéance du token, posée côté client au login pour l'auto-refresh (non renvoyée par l'API). */
  _token_expires_at?: string;
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
      setAuth: (token, user) => {
        // Contexte de diagnostic : identifiant opaque et rôle seulement.
        setSentryUser({ id: user.id, role: user.role });
        set({ token, user, isAuthenticated: true });
      },
      setUser: (user) => set({ user }),
      setActiveProperty: (propertyId, propertyName = null) =>
        set({ activePropertyId: propertyId, activePropertyName: propertyName }),
      logout: () => {
        // Ne pas rattacher les erreurs suivantes au compte qui vient de partir.
        setSentryUser(null);
        set({ token: null, user: null, isAuthenticated: false, activePropertyId: null, activePropertyName: null });
        // Sans ceci, une donnée mise en cache sous une clé non scopée par
        // compte (ex. ['onboarding-status']) pouvait survivre à la
        // déconnexion et être resservie — pour un rendu — à la session
        // suivante dans le même onglet (ex. admin plateforme → admin hôtel) :
        // un guard basé dessus redirigeait alors vers un mauvais écran avant
        // que la requête fraîche n'arrive, ce qui donnait l'impression que la
        // connexion « ne passait pas » tant qu'on ne rechargeait pas l'URL.
        queryClient.clear();
      },
    }),
    {
      name: 'qayed-auth',
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
