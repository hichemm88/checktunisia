import { describe, it, expect } from 'vitest';
import { formatMesure, formatVariation, bornesPreset, nomPays, nomType } from './observatoire';

describe('formatMesure — seuil de confidentialité (k=10)', () => {
  it('affiche « < seuil » pour le marqueur de seuil', () => {
    expect(formatMesure('<seuil')).toBe('< seuil');
  });

  it('affiche « < seuil » pour null/undefined', () => {
    expect(formatMesure(null)).toBe('< seuil');
    expect(formatMesure(undefined)).toBe('< seuil');
  });

  it('formate un nombre publié', () => {
    expect(formatMesure(0)).toBe('0');
    expect(formatMesure(42)).toBe('42');
  });
});

describe('formatVariation', () => {
  it('préfixe les hausses par +', () => {
    expect(formatVariation(12.3)).toBe('+12.3 %');
  });
  it('garde le signe des baisses', () => {
    expect(formatVariation(-4)).toBe('-4.0 %');
  });
  it('affiche un tiret si indisponible', () => {
    expect(formatVariation(null)).toBe('—');
  });
});

describe('bornesPreset', () => {
  const ref = new Date('2026-07-18T00:00:00Z');
  it('30 jours = fenêtre de 30 jours inclusive', () => {
    const { debut, fin } = bornesPreset('30j', ref);
    expect(fin).toBe('2026-07-18');
    expect(debut).toBe('2026-06-19');
  });
  it('7 jours', () => {
    expect(bornesPreset('7j', ref).debut).toBe('2026-07-12');
  });
});

describe('libellés bilingues', () => {
  it('nom de pays FR/AR', () => {
    expect(nomPays('DE', 'fr')).toBe('Allemagne');
    expect(nomPays('DE', 'ar')).toBe('ألمانيا');
    expect(nomPays('ZZ', 'fr')).toBe('ZZ'); // repli sur le code
  });
  it('type d’établissement FR/AR', () => {
    expect(nomType('maison_hotes', 'fr')).toBe("Maison d'hôtes");
    expect(nomType('dar', 'ar')).toBe('دار');
  });
});
