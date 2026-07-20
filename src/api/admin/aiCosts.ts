import { api } from '@/lib/api';

/**
 * Client HTTP du tracking des coûts IA (Claude vision : scan CIN + repli passeport).
 *
 * Ces endpoints vivent sur le backend Laravel, sous le namespace admin existant,
 * protégés par les mêmes guards que les métriques MRR. Les montants sont en USD
 * (la facture Anthropic est en USD) et transitent en chaîne décimale, comme le MRR.
 */

export type AiFeature = 'cin_scan' | 'passport_scan';
export type AiCostPeriod = 'current_month' | 'last_month' | 'last_30d';
export type AiFeatureFilter = 'all' | AiFeature;

export interface AiFeatureSummary {
  feature: AiFeature;
  success_count: number;
  api_error_count: number;
  parse_error_count: number;
  cost_usd: string;
  /** Coût moyen par scan réussi (USD). */
  avg_cost_per_success_usd: string;
  input_tokens: number;
  output_tokens: number;
}

export interface AiCostsSummary {
  period: AiCostPeriod;
  total_cost_usd: string;
  /** Toujours les deux features (cin_scan puis passport_scan), même à zéro. */
  features: AiFeatureSummary[];
  /**
   * false tant qu'un tarif actif est à 0 -> le widget affiche l'avertissement
   * "Tarifs non configurés" et les coûts sont considérés faux.
   */
  pricing_configured: boolean;
}

export interface AiCostByEstablishment {
  establishment_id: string;
  establishment_name: string | null;
  cin_scans: number;
  passport_scans: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: string;
  avg_cost_per_scan_usd: string;
}

export interface AiCostDailyPoint {
  date: string; // YYYY-MM-DD
  cin_cost_usd: string;
  passport_cost_usd: string;
  cin_count: number;
  passport_count: number;
}

export interface ScanComparisonPoint {
  date: string; // YYYY-MM-DD
  mrz_local: number;
  vision: number;
  vision_cin: number;
  vision_passport: number;
}

export interface ScanComparison {
  days: number;
  series: ScanComparisonPoint[];
  total_mrz_local: number;
  total_vision: number;
  total_passports: number;
  /** Part des passeports partis en Claude vision (l'OCR MRZ local a echoue). */
  passport_fallback_rate: number;
}

export interface AiPricing {
  id: string;
  model: string;
  input_price_per_mtok_usd: string;
  output_price_per_mtok_usd: string;
  active: boolean;
  updated_at: string | null;
}

export interface UpdateAiPricingPayload {
  input_price_per_mtok_usd: string;
  output_price_per_mtok_usd: string;
  active?: boolean;
}

export const adminAiCostsApi = {
  summary: (period: AiCostPeriod = 'current_month') =>
    api
      .get<{ data: AiCostsSummary }>('/admin/ai-costs/summary', { params: { period } })
      .then((r) => r.data.data),

  byEstablishment: (period: AiCostPeriod = 'current_month', feature: AiFeatureFilter = 'all') =>
    api
      .get<{ data: AiCostByEstablishment[] }>('/admin/ai-costs/by-establishment', { params: { period, feature } })
      .then((r) => r.data.data),

  daily: (days = 30, feature: AiFeatureFilter = 'all') =>
    api
      .get<{ data: AiCostDailyPoint[] }>('/admin/ai-costs/daily', { params: { days, feature } })
      .then((r) => r.data.data),

  scanComparison: (days = 30) =>
    api
      .get<{ data: ScanComparison }>('/admin/ai-costs/scan-comparison', { params: { days } })
      .then((r) => r.data.data),

  pricing: () =>
    api.get<{ data: AiPricing[] }>('/admin/ai-pricing').then((r) => r.data.data),

  updatePricing: (id: string, payload: UpdateAiPricingPayload) =>
    api.put<{ data: AiPricing }>(`/admin/ai-pricing/${id}`, payload).then((r) => r.data.data),
};
