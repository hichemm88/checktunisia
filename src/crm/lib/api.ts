import axios from 'axios';
import { useCrmAuthStore } from '@/crm/stores/authStore';

/**
 * Client HTTP du CRM de prospection. Même origine que crm.qayed.tn en
 * production (l'API tourne dans le même service Railway que le backend
 * principal, sous /api/v1/prospection — voir le README pour le pourquoi) :
 * VITE_CRM_API_URL n'a donc besoin d'être posée qu'en développement, où le
 * frontend et l'API ne sont pas servis depuis le même port.
 */
export const crmApi = axios.create({
  baseURL: import.meta.env.VITE_CRM_API_URL ?? '/api/v1/prospection',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  timeout: 20_000,
});

crmApi.interceptors.request.use((config) => {
  const { token } = useCrmAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Jeton révoqué, expiré, ou compte désactivé entre-temps : on ramène au
// login plutôt que de laisser l'app dans un état à moitié authentifié.
crmApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      useCrmAuthStore.getState().logout();
      if (!window.location.pathname.endsWith('/connexion')) {
        window.location.href = '/connexion';
      }
    }

    return Promise.reject(error);
  },
);

/** Enveloppe {data, errors} standard de l'API Qayed. */
export interface ApiError {
  code: string;
  message: string;
  field: string | null;
}

export function firstApiErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  const errors = (error as { response?: { data?: { errors?: ApiError[] } } })?.response?.data?.errors;

  return errors?.[0]?.message ?? fallback;
}
