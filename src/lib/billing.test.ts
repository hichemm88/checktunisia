import { describe, expect, it } from 'vitest';
import {
  type QuotaStatus,
  isPerUnitOverage,
  quotaLevel,
  quotaPercent,
  showsOverageBilling,
} from './billing';

/**
 * Dérivation d'affichage du quota de check-ins.
 *
 * Ce que ces tests protègent : les trois écrans qui affichent la
 * consommation (Abonnement, tableau de bord hôtelier, fiche hébergeur admin)
 * lisent les MÊMES seuils et la MÊME formulation. Les montants, eux, ne sont
 * jamais recalculés ici — ils arrivent du backend.
 */

/** Statut « Professionnel » (300 inclus, 0,400 TND / check-in supplémentaire). */
const pro = (used: number, over = 0): QuotaStatus => ({
  quota: 300,
  used,
  remaining: Math.max(0, 300 - used),
  overage_count: over,
  bundle_size: 1,
  bundle_count: over,
  unit_price: 0.4,
  overage_amount: Number((over * 0.4).toFixed(3)),
  estimated_total: Number((119 + over * 0.4).toFixed(3)),
  billable: true,
  unlimited: false,
});

describe('quotaLevel', () => {
  it('reste vert tant que la consommation est normale', () => {
    expect(quotaLevel(pro(0))).toBe('ok');
    expect(quotaLevel(pro(239))).toBe('ok'); // 79,6 %
  });

  it('bascule en alerte à 80 %, seuil identique aux alertes serveur', () => {
    expect(quotaLevel(pro(240))).toBe('warning'); // pile 80 %
    expect(quotaLevel(pro(287))).toBe('warning');
    expect(quotaLevel(pro(299))).toBe('warning');
  });

  it('distingue « quota atteint » de « quota dépassé »', () => {
    expect(quotaLevel(pro(300))).toBe('reached');
    expect(quotaLevel(pro(301, 1))).toBe('over');
    expect(quotaLevel(pro(312, 12))).toBe('over');
  });

  it('n’affiche pas de jauge pour un compte illimité', () => {
    expect(quotaLevel({ ...pro(5000), quota: null, unlimited: true })).toBe('unlimited');
    // Quota à 0 ou absent : pas de jauge non plus, jamais de division par zéro.
    expect(quotaLevel({ ...pro(10), quota: 0 })).toBe('unlimited');
  });
});

describe('quotaPercent', () => {
  it('rend le remplissage réel en deçà du quota', () => {
    expect(quotaPercent(pro(0))).toBe(0);
    expect(quotaPercent(pro(240))).toBe(80);
    expect(quotaPercent(pro(287))).toBe(95);
    expect(quotaPercent(pro(300))).toBe(100);
  });

  it('plafonne la barre à 100 % : le dépassement se lit au texte, pas à la jauge', () => {
    expect(quotaPercent(pro(312, 12))).toBe(100);
    expect(quotaPercent(pro(9000, 8700))).toBe(100);
  });

  it('ne divise jamais par zéro', () => {
    expect(quotaPercent({ ...pro(10), quota: 0 })).toBe(0);
    expect(quotaPercent({ ...pro(10), quota: null })).toBe(0);
  });
});

describe('isPerUnitOverage', () => {
  it('parle en check-ins quand la tranche vaut 1 (grille V3)', () => {
    expect(isPerUnitOverage({ bundle_size: 1 })).toBe(true);
    // Pack sans configuration de dépassement : on ne parle pas de « tranches ».
    expect(isPerUnitOverage({ bundle_size: null })).toBe(true);
  });

  it('conserve la formulation par lot si un pack repasse à un bundle', () => {
    expect(isPerUnitOverage({ bundle_size: 50 })).toBe(false);
  });
});

describe('showsOverageBilling', () => {
  it('annonce la facturation uniquement quand il y a un montant réellement dû', () => {
    expect(showsOverageBilling(pro(312, 12))).toBe(true);
    expect(showsOverageBilling(pro(300))).toBe(false);
  });

  it('n’annonce jamais de facturation à un compte qui ne sera pas facturé', () => {
    // Compte grandfathered : le dépassement existe, la facture non.
    expect(showsOverageBilling({ ...pro(312, 12), billable: false })).toBe(false);
  });
});

describe('cohérence de l’exemple de référence (Professionnel 312/300)', () => {
  it('12 check-ins supplémentaires facturés 4,800 TND pour un total de 123,800', () => {
    const q = pro(312, 12);

    expect(quotaLevel(q)).toBe('over');
    expect(isPerUnitOverage(q)).toBe(true);
    expect(q.overage_amount).toBe(4.8);
    expect(q.estimated_total).toBe(123.8);
  });
});
