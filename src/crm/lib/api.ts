import axios from 'axios';
import { useCrmAuthStore } from '@/crm/stores/authStore';

/**
 * Client HTTP du CRM de prospection. crm.qayed.tn (ce frontend) et
 * api.qayed.tn (le backend) sont deux services Railway DISTINCTS — voir
 * docs/deploiement-crm.md — donc pas de chemin relatif possible en
 * production : VITE_CRM_API_URL doit y être posée (build-arg du service
 * Railway du frontend, voir Dockerfile.crm). Le repli sur un chemin relatif
 * ne sert qu'au développement local, où vite.crm.config.ts proxifie /api
 * vers l'API tournant sur un autre port.
 *
 * `||` et non `??` : une variable de build absente donne une chaîne VIDE
 * (pas `undefined`) une fois passée par le Dockerfile, que `??` laisserait
 * passer telle quelle — une baseURL vide romprait silencieusement tous les
 * appels en production.
 */
export const crmApi = axios.create({
  baseURL: import.meta.env.VITE_CRM_API_URL || '/api/v1/prospection',
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
