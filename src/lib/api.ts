import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
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

// ── Global 401 handler → logout ───────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
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
