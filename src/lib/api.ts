import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { twoFactorSetupPathForRole } from '@/lib/roleRoutes';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  // Sans ceci, une requête qui reste en attente sur une connexion dégradée
  // (paquets perdus, 4G instable) ne se résout ni ne rejette jamais : la
  // promesse axios pend indéfiniment et React Query reste bloqué en
  // `isLoading` pour toujours — c'est ce qui laissait les skeletons du
  // dashboard tourner sans fin en mauvaise connexion.
  timeout: 15_000,
});

// Attach token + active property on every request
api.interceptors.request.use((config) => {
  const { token, activePropertyId } = useAuthStore.getState();
  // NE PAS écraser un Authorization explicitement fourni par l'appel (ex. le
  // token partiel de la vérification 2FA) : sinon, quand une session est déjà
  // ouverte (ex. admin), la vérif 2FA d'un AUTRE compte partait avec le token
  // stocké → « Full token already issued ».
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  if (activePropertyId) config.headers['X-Property-Id'] = activePropertyId;
  return config;
});

// ── Token auto-refresh ────────────────────────────────────────────────────────
// Refresh if the stored token is within 30 minutes of expiry
let refreshPromise: Promise<void> | null = null;

function shouldRefresh(): boolean {
  const user = useAuthStore.getState().user;
  const expiresAt = (user as any)?._token_expires_at as string | undefined;
  if (!expiresAt) return false;
  const msLeft = new Date(expiresAt).getTime() - Date.now();
  return msLeft > 0 && msLeft < 30 * 60 * 1000; // within 30 min
}

async function refreshToken(): Promise<void> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = api
    .post<{ data: { token: string; expires_at: string } }>('/auth/refresh')
    .then((res) => {
      const { token, expires_at } = res.data.data;
      const store = useAuthStore.getState();
      const updatedUser = { ...(store.user as any), _token_expires_at: expires_at };
      store.setAuth(token, updatedUser);
    })
    .catch(() => {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

api.interceptors.request.use(async (config) => {
  if (shouldRefresh()) await refreshToken();
  return config;
});

// ── Global error handlers ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const errors: Array<{ code: string }> = err.response?.data?.errors ?? [];
    const code = errors[0]?.code;

    if (status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    } else if (status === 403 && code === '2FA_SETUP_REQUIRED') {
      // 2FA obligatoire non configurée — la page de setup dépend du rôle :
      // les comptes autorité et les admins plateforme y sont tous deux soumis.
      const role = useAuthStore.getState().user?.role;
      window.location.href = twoFactorSetupPathForRole(role);
    }
    return Promise.reject(err);
  },
);

export const extractErrors = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const errors = err.response?.data?.errors;
    if (Array.isArray(errors) && errors.length > 0) return errors[0].message;
    return err.response?.data?.message ?? err.message;
  }
  return 'An unexpected error occurred.';
};

/**
 * Cause technique éventuelle, quand le serveur la juge utile à celui qui la
 * lit (aujourd'hui : l'enregistrement d'une passkey par son propre
 * propriétaire). Affichée en second, discrètement — c'est ce qui permet de
 * rapporter un incident sans avoir à ouvrir un journal.
 */
export const extractErrorDetail = (err: unknown): string | null => {
  if (!axios.isAxiosError(err)) return null;
  const errors = err.response?.data?.errors;
  if (Array.isArray(errors) && errors.length > 0 && typeof errors[0].detail === 'string') {
    return errors[0].detail;
  }
  return null;
};
