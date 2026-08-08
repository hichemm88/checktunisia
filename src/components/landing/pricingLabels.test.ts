import { describe, expect, it } from 'vitest';
import {
  compactPrice, extraLabel, includedLabel, overageLabel, overageReassurance,
} from './pricingLabels';

/**
 * Libellés de la grille tarifaire publique.
 *
 * Ce que ces tests protègent : ce que la page annonce au visiteur doit être
 * la stricte mise en forme de ce que le backend applique. Les valeurs
 * utilisées ici sont celles de la grille V3 servie par /public/plans —
 * Essentiel 0,600 · Pro 0,400 · Grand Flux 0,250, tranche de 1.
 */

describe('compactPrice', () => {
  it('rend les tarifs de dépassement à la virgule, sans zéros parasites', () => {
    expect(compactPrice(0.6)).toBe('0,6');
    expect(compactPrice(0.4)).toBe('0,4');
    expect(compactPrice(0.25)).toBe('0,25');
  });

  it('laisse les prix ronds tels quels', () => {
    expect(compactPrice(59)).toBe('59');
    expect(compactPrice(119)).toBe('119');
    expect(compactPrice(299)).toBe('299');
  });
});

describe('overageLabel', () => {
  it('annonce un prix AU CHECK-IN quand la tranche vaut 1 (grille V3)', () => {
    expect(overageLabel(0.6, 1, 'fr')).toBe('0,6 TND / check-in supplémentaire');
    expect(overageLabel(0.4, 1, 'fr')).toBe('0,4 TND / check-in supplémentaire');
    expect(overageLabel(0.25, 1, 'fr')).toBe('0,25 TND / check-in supplémentaire');
  });

  it('ne parle jamais de « tranche de 1 » — une formulation qui ne veut rien dire', () => {
    for (const lang of ['fr', 'en', 'ar']) {
      const label = overageLabel(0.6, 1, lang);
      expect(label).not.toMatch(/tranche|bundle|شريحة/);
    }
  });

  it('conserve la formulation par lot si un pack repasse à un bundle', () => {
    expect(overageLabel(10, 50, 'fr')).toBe('+10 TND par tranche de 50 check-ins supplémentaires');
    expect(overageLabel(10, 50, 'en')).toBe('+10 TND per bundle of 50 additional check-ins');
  });

  it('est traduit dans les trois langues servies', () => {
    expect(overageLabel(0.6, 1, 'en')).toBe('0,6 TND per additional check-in');
    expect(overageLabel(0.6, 1, 'ar')).toContain('0,6');
  });
});

describe('overageReassurance', () => {
  it('dit en clair que le dépassement ne bloque rien et qu’il est facturé', () => {
    const fr = overageReassurance('fr');
    expect(fr).toContain('Continuez à enregistrer vos voyageurs');
    expect(fr).toContain('automatiquement facturés');
  });

  it('existe dans les trois langues', () => {
    expect(overageReassurance('en')).toContain('Keep registering');
    expect(overageReassurance('ar').length).toBeGreaterThan(20);
  });
});

describe('includedLabel / extraLabel', () => {
  it('accorde le pluriel des établissements inclus', () => {
    expect(includedLabel(1, 'fr')).toBe('1 établissement inclus');
    expect(includedLabel(3, 'fr')).toBe('3 établissements inclus');
    expect(includedLabel(1, 'en')).toBe('1 property included');
    expect(includedLabel(3, 'en')).toBe('3 properties included');
  });

  it('rend le supplément par établissement depuis la configuration', () => {
    expect(extraLabel(99, 'fr')).toBe('Option multi-établissements : +99 TND/mois par établissement');
  });
});
