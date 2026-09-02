import { api } from '@/lib/api';

/**
 * Client HTTP du suivi des coûts Meta / WhatsApp (messages template livrés).
 *
 * Même forme que `aiCosts.ts`, délibérément : mêmes périodes, même exposition
 * de l'établissement, mêmes montants USD en chaîne décimale. Deux écrans de
 * coûts qui se liraient différemment seraient deux écrans qu'on ne peut pas
 * comparer.
 *
 * La seule différence de fond est structurelle : les montants ont DEUX
 * SOURCES. `meta` porte les montants réels lus chez Meta par la commande
 * quotidienne, `estimate` le calcul local à partir de la grille tarifaire.
 * Chaque réponse dit laquelle elle sert — un coût dont on ignore la provenance
 * ne vaut rien pour une décision de marge.
 */

/** Catégories de facturation Meta. `service` est à 0 jusqu'au 01/10/2026. */
export type MetaCategory = 'utility' | 'authentication' | 'marketing' | 'service';
export type MetaCostPeriod = 'current_month' | 'last_month' | 'last_30d';
export type MetaCategoryFilter = 'all' | MetaCategory;

/** Origine des montants servis. */
export type MetaCostSource = 'meta' | 'estimate';

export interface MetaCategorySummary {
  category: MetaCategory;
  messages: number;
  cost_usd: string;
  /** Tarif unitaire courant (USD / message livré). */
  unit_price_usd: string;
}

export interface MetaCostsSummary {
  period: MetaCostPeriod;
  source: MetaCostSource;
  total_cost_usd: string;
  total_messages: number;
  avg_cost_per_message_usd: string;
  previous_month_cost_usd: string;
  /** Toujours les quatre catégories, même à zéro. */
  categories: MetaCategorySummary[];
  /** Taux d'affichage. Le stockage reste en USD, comme la facture Meta. */
  usd_to_tnd: string;
  total_cost_tnd: string;
  /** null tant qu'aucune synchro Meta n'a abouti. */
  last_meta_sync_at: string | null;
  /**
   * false si un tarif utility/authentication est à 0 -> les coûts affichés
   * sont faux, l'écran affiche le bandeau d'avertissement.
   */
  pricing_configured: boolean;
}

export interface MetaCostByEstablishment {
  /** null = hors établissement : codes de connexion des agents (autorité). */
  establishment_id: string | null;
  establishment_name: string | null;
  utility_messages: number;
  authentication_messages: number;
  marketing_messages: number;
  service_messages: number;
  messages: number;
  cost_usd: string;
  avg_cost_per_message_usd: string;
}

export interface MetaCostDailyPoint {
  date: string; // YYYY-MM-DD
  utility_cost_usd: string;
  authentication_cost_usd: string;
  marketing_cost_usd: string;
  service_cost_usd: string;
  utility_count: number;
  authentication_count: number;
  marketing_count: number;
  service_count: number;
  total_cost_usd: string;
  total_count: number;
}

export interface MetaCostDaily {
  source: MetaCostSource;
  series: MetaCostDailyPoint[];
}

export const adminMetaCostsApi = {
  summary: (period: MetaCostPeriod = 'current_month') =>
    api
      .get<{ data: MetaCostsSummary }>('/admin/meta-costs/summary', { params: { period } })
      .then((r) => r.data.data),

  byEstablishment: (period: MetaCostPeriod = 'current_month', category: MetaCategoryFilter = 'all') =>
    api
      .get<{ data: MetaCostByEstablishment[] }>('/admin/meta-costs/by-establishment', { params: { period, category } })
      .then((r) => r.data.data),

  daily: (days = 30, category: MetaCategoryFilter = 'all') =>
    api
      .get<{ data: MetaCostDaily }>('/admin/meta-costs/daily', { params: { days, category } })
      .then((r) => r.data.data),
};
