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

/** Default subscription end date: start + 1 month (monthly) or + 1 year (yearly). Noon avoids TZ day-shift. */
export const cycleEndDate = (start: string, cycle: BillingCycle): string => {
  const d = new Date(`${start}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};
