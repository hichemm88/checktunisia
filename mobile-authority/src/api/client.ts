import axios from 'axios';
import Constants from 'expo-constants';

const baseURL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? 'https://api.qayed.tn';

/**
 * Client HTTP autorités — même backend que le dashboard web.
 * Le token est injecté par le contexte d'auth (session courte, 15 min — F1).
 * Toutes les vérifications watchlist passent par le réseau : aucun cache local.
 */
export const api = axios.create({
  baseURL,
  timeout: 12_000,
  headers: { Accept: 'application/json' },
});

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

/** Mode démo ministérielle : les services renvoient le jeu seedé (§8). */
export const DEMO_MODE = Boolean(Constants.expoConfig?.extra?.demoMode ?? true);

export class OfflineError extends Error {
  constructor() {
    super('offline');
    this.name = 'OfflineError';
  }
}
