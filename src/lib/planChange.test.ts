import { describe, expect, it } from 'vitest';
import type { PlanChangePreview } from '@/api/subscription';
import {
  isImmediate, isSelectable, newIdempotencyKey, planChangeKind, planChangeLabelKey,
  quotaLabel, requiresHistoricConfirmation, requiresPayment,
} from './planChange';

/**
 * Décisions de parcours du changement de plan.
 *
 * Ce que ces tests protègent : le client ne doit jamais se voir promettre un
 * paiement qui n'aura pas lieu, ni perdre des conditions négociées sans
 * l'avoir explicitement accepté — et une même intention ne doit jamais
 * produire deux demandes.
 */

const preview = (over: Partial<PlanChangePreview> = {}): PlanChangePreview => ({
  kind: 'upgrade',
  allowed: true,
  reason: null,
  effective: 'on_payment',
  effective_at: null,
  amount_due_now: 79.4,
  credit_applied: 39.6,
  current_cycle_amount: 59,
  next_renewal_amount: 119,
  billing_cycle: 'monthly',
  quota_from: 100,
  quota_to: 300,
  usage: 87,
  usage_exceeds_new_quota: false,
  overage_unit_price_from: 0.6,
  overage_unit_price_to: 0.4,
  loses_historic_conditions: false,
  historic_conditions: null,
  ...over,
});

describe('isImmediate', () => {
  it('un upgrade prend effet au paiement', () => {
    expect(isImmediate(preview())).toBe(true);
  });

  it('un downgrade attend la fin de la période payée', () => {
    expect(isImmediate(preview({ kind: 'downgrade', effective: 'next_cycle' }))).toBe(false);
  });
});

describe('requiresPayment', () => {
  it('annonce un paiement quand il y a réellement un montant dû', () => {
    expect(requiresPayment(preview())).toBe(true);
  });

  it('ne promet aucun paiement pour un downgrade', () => {
    expect(requiresPayment(preview({ effective: 'next_cycle', amount_due_now: 0 }))).toBe(false);
  });

  it('ne promet aucun paiement quand le crédit couvre tout le prix', () => {
    // Le changement s'applique alors directement : annoncer une facture
    // serait une fausse promesse.
    expect(requiresPayment(preview({ amount_due_now: 0, credit_applied: 119 }))).toBe(false);
  });
});

describe('requiresHistoricConfirmation', () => {
  it('exige une confirmation renforcée quand des conditions négociées sont en jeu', () => {
    const historic = preview({
      loses_historic_conditions: true,
      historic_conditions: { checkins_per_month: null, checkins_label: 'illimité' },
    });
    expect(requiresHistoricConfirmation(historic)).toBe(true);
  });

  it('ne bloque pas un client sans conditions particulières', () => {
    expect(requiresHistoricConfirmation(preview())).toBe(false);
  });
});

describe('isSelectable', () => {
  it('un plan éligible est proposable', () => {
    expect(isSelectable(preview())).toBe(true);
  });

  it('un plan refusé reste affiché mais non sélectionnable', () => {
    expect(isSelectable(preview({ allowed: false, reason: 'Votre compte est déjà sur ce plan.' }))).toBe(false);
  });

  it('le plan courant (sans simulation) n’est pas sélectionnable', () => {
    expect(isSelectable(null)).toBe(false);
  });
});

describe('newIdempotencyKey', () => {
  it('produit une clé différente par intention', () => {
    const keys = new Set(Array.from({ length: 50 }, () => newIdempotencyKey()));
    expect(keys.size).toBe(50);
  });

  it('produit une clé assez longue pour la validation serveur (min 8)', () => {
    expect(newIdempotencyKey().length).toBeGreaterThanOrEqual(8);
  });
});

describe('quotaLabel', () => {
  it('rend le quota inclus tel quel', () => {
    expect(quotaLabel(300, 'illimité')).toBe('300');
  });

  it('nomme l’illimité au lieu d’afficher un vide', () => {
    expect(quotaLabel(null, 'illimité')).toBe('illimité');
    expect(quotaLabel(undefined, 'illimité')).toBe('illimité');
  });
});

describe('cohérence de l’exemple de référence (Essentiel → Professionnel)', () => {
  it('effet immédiat, paiement du solde après crédit, renouvellement au plein tarif', () => {
    const p = preview();

    expect(isImmediate(p)).toBe(true);
    expect(requiresPayment(p)).toBe(true);
    // 119 (plein tarif) − 39,6 (reliquat) = 79,4 dus maintenant.
    expect(p.amount_due_now + p.credit_applied).toBeCloseTo(p.next_renewal_amount, 3);
  });
});

describe('nommer l’opération telle que le client la vit', () => {
  it('reconnaît les trois natures produites par le backend', () => {
    expect(planChangeKind('subscribe')).toBe('subscribe');
    expect(planChangeKind('upgrade')).toBe('upgrade');
    expect(planChangeKind('downgrade')).toBe('downgrade');
  });

  it('retombe sur le générique pour tout le reste, sans jamais rendre un vide', () => {
    for (const unknown of ['', 'migration', null, undefined]) {
      expect(planChangeKind(unknown)).toBeNull();
      expect(planChangeLabelKey('confirmCta', unknown)).toBe('subscriptionPage.confirmCta');
    }
  });

  it('spécialise le libellé par nature d’opération', () => {
    expect(planChangeLabelKey('confirmCta', 'subscribe')).toBe('subscriptionPage.confirmCtaSubscribe');
    expect(planChangeLabelKey('confirmCta', 'upgrade')).toBe('subscriptionPage.confirmCtaUpgrade');
    expect(planChangeLabelKey('confirmCta', 'downgrade')).toBe('subscriptionPage.confirmCtaDowngrade');
  });

  it('donne une clé distincte à chaque nature, pour un même libellé', () => {
    const keys = ['subscribe', 'upgrade', 'downgrade'].map((k) => planChangeLabelKey('pendingPaymentTitle', k));

    expect(new Set(keys).size).toBe(3);
  });

  it('activer son abonnement ne s’appelle jamais « changement »', () => {
    // La régression exacte constatée : un essai qui règle sa formule lisait
    // « Confirmer le changement » alors qu'il ne change de rien.
    expect(planChangeLabelKey('confirmCta', 'subscribe'))
      .not.toBe(planChangeLabelKey('confirmCta', 'upgrade'));
  });
});
