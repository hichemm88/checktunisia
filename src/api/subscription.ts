import { api } from '@/lib/api';

/**
 * Gestion de l'abonnement en self-service.
 *
 * Règle transverse : AUCUN montant, quota, tarif de dépassement ou date
 * d'effet n'est calculé ici. Tout arrive déjà chiffré du backend, qui est
 * seul à connaître le plan réellement applicable et les conditions
 * particulières du client. Le front affiche et confirme, il ne décide pas.
 */

/** Simulation d'un changement de plan pour CE client — le contenu de l'écran de confirmation. */
export interface PlanChangePreview {
  /** `subscribe` : premier règlement (fin d'essai) ou reprise d'un compte retombé. */
  kind: 'upgrade' | 'downgrade' | 'subscribe';
  allowed: boolean;
  reason: string | null;
  /** `on_payment` : effet dès le paiement confirmé · `next_cycle` : à la fin de la période payée. */
  effective: 'on_payment' | 'next_cycle';
  effective_at: string | null;
  amount_due_now: number;
  credit_applied: number;
  current_cycle_amount: number;
  next_renewal_amount: number;
  billing_cycle: 'monthly' | 'yearly';
  quota_from: number | null;
  quota_to: number | null;
  usage: number;
  usage_exceeds_new_quota: boolean;
  overage_unit_price_from: number | null;
  overage_unit_price_to: number | null;
  /** Le client perdrait des conditions négociées : confirmation explicite exigée. */
  loses_historic_conditions: boolean;
  historic_conditions: {
    checkins_per_month?: number | null;
    checkins_label?: string;
    custom_price?: number;
    legacy_plan?: boolean;
  } | null;
}

export interface SelectablePlan {
  id: number;
  slug: string;
  name: string;
  marketing: { display_name?: Record<string, string>; tagline?: Record<string, string>; badge?: Record<string, string>; featured?: boolean; bullets?: { included: boolean; text: Record<string, string> }[] } | null;
  price_monthly: string | number;
  features: Record<string, number | boolean | null> | null;
  overage_price: string | number | null;
  overage_bundle_size: number | null;
  is_current: boolean;
  change: PlanChangePreview | null;
}

export interface PendingPlanChange {
  id: string;
  /** `subscribe` : premier règlement (fin d'essai) ou reprise d'un compte retombé. */
  kind: 'upgrade' | 'downgrade' | 'subscribe';
  status: 'pending_payment' | 'scheduled';
  to_plan: { id: number; slug: string; name: string; price_monthly: string } | null;
  from_plan: { id: number; slug: string; name: string; price_monthly: string } | null;
  effective_at: string | null;
  amount_due: number;
  credit_applied: number;
  next_renewal_amount: number;
  invoice: { id: string; invoice_number: string; total_amount: string; status: string } | null;
}

export interface SubscriptionHistoryEntry {
  id: number;
  event_type: string;
  created_at: string;
  previous_plan: string | null;
  new_plan: string | null;
  notes: string | null;
  by: string | null;
}

export const subscriptionApi = {
  /** Les offres souscriptibles, chacune déjà simulée pour ce client. */
  getPlans: () =>
    api.get<{ data: {
      current: { plan_id: number; plan_slug: string | null; billing_cycle: string; expires_at: string } | null;
      plans: SelectablePlan[];
    } }>('/hotel/subscription/plans').then((r) => r.data.data),

  /** Simulation d'un changement précis, avant confirmation. */
  previewChange: (plan_id: number) =>
    api.post<{ data: PlanChangePreview }>('/hotel/subscription/preview-change', { plan_id })
      .then((r) => r.data.data),

  /**
   * Demande de changement.
   *
   * `idempotency_key` identifie l'INTENTION, pas la requête : la même clé
   * renvoyée après un double clic, un rejeu réseau ou un second onglet
   * retombe sur la même demande — donc sur la même facture, jamais sur un
   * second prélèvement.
   */
  changePlan: (payload: { plan_id: number; idempotency_key: string; accept_conditions_change?: boolean }) =>
    api.post<{ data: {
      id: string; kind: 'upgrade' | 'downgrade' | 'subscribe'; status: string;
      effective_at: string | null; amount_due: number; credit_applied: number; applied_at: string | null;
      invoice: { id: string; invoice_number: string; total_amount: string; status: string } | null;
    } }>('/hotel/subscription/change', payload).then((r) => r.data.data),

  cancelChange: () =>
    api.post<{ data: { id: string; status: string } }>('/hotel/subscription/change/cancel')
      .then((r) => r.data.data),

  /** Résiliation : arrêt du renouvellement. Aucune donnée supprimée, accès maintenu jusqu'au terme payé. */
  cancelSubscription: (reason?: string) =>
    api.post<{ data: { auto_renew: boolean; cancellation_requested_at: string | null; ends_at: string } }>(
      '/hotel/subscription/cancel', { reason },
    ).then((r) => r.data.data),

  reactivate: () =>
    api.post<{ data: { auto_renew: boolean; cancellation_requested_at: string | null; ends_at: string } }>(
      '/hotel/subscription/reactivate',
    ).then((r) => r.data.data),

  getHistory: () =>
    api.get<{ data: SubscriptionHistoryEntry[] }>('/hotel/subscription/history').then((r) => r.data.data),
};
