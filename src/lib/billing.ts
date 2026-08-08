export type BillingCycle = 'monthly' | 'yearly';

interface PlanPricing {
  price_monthly: string | number;
  price_yearly?: string | number | null;
  effective_price_yearly?: string;
}

/** Yearly price with the "one month free" offer: explicit plan yearly price if set, else 11 × monthly. */
export const effectiveYearlyPrice = (p: PlanPricing): number =>
  p.effective_price_yearly != null ? Number(p.effective_price_yearly)
    : p.price_yearly != null && p.price_yearly !== '' ? Number(p.price_yearly)
    : Number(p.price_monthly) * 11;

export const priceForCycle = (p: PlanPricing, cycle: BillingCycle): number =>
  cycle === 'yearly' ? effectiveYearlyPrice(p) : Number(p.price_monthly);

// ─── Quota de check-ins ───────────────────────────────────────────────────────

/**
 * Payload de quota servi par le backend (CheckinQuota::status). Le front ne
 * recalcule JAMAIS un montant de facturation : `overage_amount` et
 * `estimated_total` arrivent déjà calculés. Ce qui suit ne dérive que de
 * l'affichage (palier de couleur, formulation).
 */
export interface QuotaStatus {
  quota: number | null;
  used: number;
  remaining?: number | null;
  percent?: number | null;
  overage_count: number;
  bundle_size: number | null;
  bundle_count: number;
  unit_price?: number | null;
  overage_amount: number | null;
  estimated_total?: number | null;
  billable: boolean;
  unlimited: boolean;
}

/** Palier d'affichage de la consommation. Un seul endroit décide des seuils. */
export type QuotaLevel = 'unlimited' | 'ok' | 'warning' | 'reached' | 'over';

/**
 * `warning` à partir de 80 % (mêmes seuils que les alertes serveur),
 * `reached` pile au quota, `over` au-delà. Un compte illimité n'a pas de
 * palier — il n'affiche pas de jauge.
 */
export const quotaLevel = (q: QuotaStatus): QuotaLevel => {
  if (q.unlimited || q.quota == null || q.quota < 1) return 'unlimited';
  if (q.used > q.quota) return 'over';
  if (q.used === q.quota) return 'reached';
  return q.used * 5 >= q.quota * 4 ? 'warning' : 'ok';
};

/** Remplissage de la jauge, plafonné à 100 % (le dépassement se lit au texte, pas à la barre). */
export const quotaPercent = (q: QuotaStatus): number =>
  q.quota == null || q.quota < 1 ? 0 : Math.min(100, Math.floor((q.used * 100) / q.quota));

/**
 * Le dépassement se facture-t-il au check-in (tranche de 1) ou par lot ?
 * Décide de la formulation partout — « 12 × 0,4 TND » plutôt que
 * « 12 tranche(s) de 1 », qui ne veut rien dire pour un client.
 */
export const isPerUnitOverage = (q: Pick<QuotaStatus, 'bundle_size'>): boolean =>
  (q.bundle_size ?? 1) === 1;

/** Le bloc de facturation du dépassement a-t-il quelque chose à dire ? */
export const showsOverageBilling = (q: QuotaStatus): boolean =>
  q.billable && q.overage_amount != null && q.overage_amount > 0;

/** Default subscription end date: start + 1 month (monthly) or + 1 year (yearly). Noon avoids TZ day-shift. */
export const cycleEndDate = (start: string, cycle: BillingCycle): string => {
  const d = new Date(`${start}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};
