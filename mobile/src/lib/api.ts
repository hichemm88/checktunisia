import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/authStore';

const baseURL =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'https://checktunisia-backend-production.up.railway.app/api/v1';

export const api = axios.create({
  baseURL,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  timeout: 20000,
});

// Attach bearer token + active-property header on every request — same contract as web.
api.interceptors.request.use((config) => {
  const { token, activePropertyId } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (activePropertyId) config.headers['X-Property-Id'] = activePropertyId;
  return config;
});

// On 401 → drop the session. The root layout watches auth state and redirects to /login.
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      void useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  },
);

/** Extract the first backend error message from Qayed's { errors: [{ message }] } envelope. */
export function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const errors = (err.response?.data as { errors?: Array<{ message: string }> } | undefined)
      ?.errors;
    if (Array.isArray(errors) && errors.length > 0) return errors[0].message;
    return (
      (err.response?.data as { message?: string } | undefined)?.message ??
      (err.code === 'ECONNABORTED'
        ? 'Délai dépassé — vérifiez votre connexion.'
        : 'Une erreur réseau est survenue.')
    );
  }
  return 'Une erreur inattendue est survenue.';
}
