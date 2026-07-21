import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { fetchPlans, type SubscriptionPlan } from '@/api/public';
import { pickI18n } from '@/lib/i18nContent';
import { type BillingCycle, priceForCycle } from '@/lib/billing';

/** 59 → "59", 59.5 → "59,5" — the landing shows compact prices. */
const compactPrice = (n: number): string =>
  Number.isInteger(n) ? String(n) : String(n).replace('.', ',');

/** "X établissement(s) inclus" — dérivé de la config tarifaire (jamais codé en dur). */
const includedLabel = (n: number, lang: string): string => {
  if (lang === 'en') return `${n} propert${n > 1 ? 'ies' : 'y'} included`;
  if (lang === 'ar') return `${n} مؤسسة مشمولة`;
  return `${n} établissement${n > 1 ? 's' : ''} inclus`;
};

/** "+39 TND/mois par établissement supplémentaire" — dérivé de extra_property_price. */
const extraLabel = (price: number, lang: string): string => {
  const p = compactPrice(price);
  if (lang === 'en') return `+${p} TND/month per extra property`;
  if (lang === 'ar') return `+${p} د.ت/شهر لكل مؤسسة إضافية`;
  return `+${p} TND/mois par établissement supplémentaire`;
};

const PricingCard = ({ plan, lang, cycle }: { plan: SubscriptionPlan; lang: string; cycle: BillingCycle }) => {
  const m = plan.marketing;
  const badge = m?.badge ? pickI18n(m.badge, lang) : '';
  const price = priceForCycle(plan, cycle);
  const fullYearly = Number(plan.price_monthly) * 12;
  const showWas = cycle === 'yearly' && price < fullYearly;
  const note = cycle === 'yearly'
    ? pickI18n(m?.price_note_yearly ?? m?.price_note, lang)
    : pickI18n(m?.price_note, lang);

  // Grille par établissement : sous-texte "N inclus" et bullet supplément,
  // rendus depuis la config en base — pas de montant codé en dur.
  const included = plan.included_properties ?? 1;
  const extraPrice = plan.extra_property_price != null ? Number(plan.extra_property_price) : null;
  const hasTieredProperties = extraPrice != null && extraPrice > 0;

  return (
    <div className={`pricing-card${m?.featured ? ' featured' : ''}`}>
      {badge && <div className="pricing-pill">{badge}</div>}
      {m?.tier && <p className="pricing-tier">{pickI18n(m.tier, lang)}</p>}
      <p className="pricing-name">{m?.display_name ? pickI18n(m.display_name, lang) : plan.name}</p>
      {m?.tagline && <p className="pricing-tagline">{pickI18n(m.tagline, lang)}</p>}
      <div className="pricing-sep"></div>
      <div className="price-row">
        <span className="price-num">{compactPrice(price)}</span>
        <span className="price-cur">TND</span>
        {showWas && <span className="price-was">{compactPrice(fullYearly)} TND</span>}
      </div>
      {note && <div className="price-per">{note}</div>}
      {hasTieredProperties && <div className="price-per" style={{ fontWeight: 600 }}>{includedLabel(included, lang)}</div>}
      <ul className="feat-list">
        {(m?.bullets ?? []).map((b, i) => (
          <li key={i} className={b.included ? undefined : 'off'}>{pickI18n(b.text, lang)}</li>
        ))}
        {hasTieredProperties && <li>{extraLabel(extraPrice!, lang)}</li>}
      </ul>
      <Link to="/register" className={`btn ${m?.featured ? 'btn-primary' : 'btn-ghost'} btn-full`}>
        {m?.cta_label ? pickI18n(m.cta_label, lang) : 'Essayer 7 jours gratuit'}
      </Link>
    </div>
  );
};

/**
 * Section tarifs de la homepage — data-driven depuis GET /public/plans
 * (source de vérité unique, éditable dans Admin › Abonnements › Packs).
 * Rendue dans le wrapper .qayed-landing : réutilise le CSS scopé existant.
 * La bascule Mensuel/Annuel (1 mois offert : annuel = 11 × mensuel) est de
 * l'état React — pas le script vanilla de la landing.
 */
export interface PricingSectionProps {
  eyebrow?: string;
  title?: string;
  lead?: string;
  monthlyLabel?: string;
  yearlyLabel?: string;
  yearlyBadge?: string;
  footnote?: string;
}

export const PricingSection = ({
  eyebrow = 'Abonnement',
  title = 'Simple et transparent.',
  lead = 'Sans engagement. Sans frais cachés. Changez de plan à tout moment.',
  monthlyLabel = 'Mensuel',
  yearlyLabel = 'Annuel',
  yearlyBadge = '1 mois offert',
  footnote = "Aucune carte bancaire requise pour démarrer l'essai · Résiliable à tout moment",
}: PricingSectionProps) => {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? 'fr';
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const { data: plans } = useQuery({
    queryKey: ['public-plans'],
    queryFn: fetchPlans,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="section section-alt" id="tarifs">
      <div className="wrap">
        <div className="eyebrow fade-in" style={{ justifyContent: 'center' }}>{eyebrow}</div>
        <h2 className="section-h2 fade-in" style={{ textAlign: 'center' }}>{title}</h2>
        <p className="section-lead fade-in" style={{ textAlign: 'center', margin: '0 auto 32px', maxWidth: 480 }}>
          {lead}
        </p>
        <div className="pricing-toggle fade-in">
          <button type="button" className={`pt-btn${cycle === 'monthly' ? ' active' : ''}`} onClick={() => setCycle('monthly')}>
            {monthlyLabel}
          </button>
          <button type="button" className={`pt-btn${cycle === 'yearly' ? ' active' : ''}`} onClick={() => setCycle('yearly')}>
            {yearlyLabel} <span className="pt-badge">{yearlyBadge}</span>
          </button>
        </div>
        <div className="pricing-grid fade-in">
          {(plans ?? []).map((p) => <PricingCard key={p.id} plan={p} lang={lang} cycle={cycle} />)}
        </div>
        {footnote && (
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--fiche)' }}>{footnote}</p>
        )}
      </div>
    </section>
  );
};
