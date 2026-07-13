import { describe, it, expect } from 'vitest';
import { tunisianMonthToNumber, parseTunisianBirthDate, TUNISIAN_MONTHS } from './tunisianMonths';

describe('mois tunisiens', () => {
  // Critère d'acceptation : فيفري → 02, tests sur les 12 mois.
  const cases: Array<[string, number]> = [
    ['جانفي', 1],
    ['فيفري', 2],
    ['مارس', 3],
    ['أفريل', 4],
    ['ماي', 5],
    ['جوان', 6],
    ['جويلية', 7],
    ['أوت', 8],
    ['سبتمبر', 9],
    ['أكتوبر', 10],
    ['نوفمبر', 11],
    ['ديسمبر', 12],
  ];

  it.each(cases)('%s → %i', (name, num) => {
    expect(tunisianMonthToNumber(name)).toBe(num);
  });

  it('couvre exactement 12 mois canoniques', () => {
    expect(Object.keys(TUNISIAN_MONTHS)).toHaveLength(12);
  });

  it('فيفري vaut bien 02', () => {
    expect(tunisianMonthToNumber('فيفري')).toBe(2);
  });

  it('tolère les variantes sans hamza (افريل, اوت, اكتوبر)', () => {
    expect(tunisianMonthToNumber('افريل')).toBe(4);
    expect(tunisianMonthToNumber('اوت')).toBe(8);
    expect(tunisianMonthToNumber('اكتوبر')).toBe(10);
  });

  it('renvoie null pour un mot inconnu', () => {
    expect(tunisianMonthToNumber('xyz')).toBeNull();
    expect(tunisianMonthToNumber('كلمة')).toBeNull();
  });
});

describe('parseTunisianBirthDate', () => {
  it('carte de référence : « 21 فيفري 1962 » → 1962-02-21', () => {
    expect(parseTunisianBirthDate('21 فيفري 1962')).toBe('1962-02-21');
  });

  it('normalise chaque mois dans la forme « JJ MOIS AAAA »', () => {
    expect(parseTunisianBirthDate('1 جانفي 1990')).toBe('1990-01-01');
    expect(parseTunisianBirthDate('9 أوت 2000')).toBe('2000-08-09');
    expect(parseTunisianBirthDate('31 ديسمبر 1975')).toBe('1975-12-31');
  });

  it('accepte une date déjà ISO', () => {
    expect(parseTunisianBirthDate('1962-02-21')).toBe('1962-02-21');
  });

  it('accepte la forme numérique JJ/MM/AAAA', () => {
    expect(parseTunisianBirthDate('21/02/1962')).toBe('1962-02-21');
    expect(parseTunisianBirthDate('21-02-1962')).toBe('1962-02-21');
  });

  it('rejette une année invraisemblable', () => {
    expect(parseTunisianBirthDate('21 فيفري 1850')).toBeNull();
    expect(parseTunisianBirthDate('21 فيفري 3000')).toBeNull();
  });

  it('rejette un jour hors bornes', () => {
    expect(parseTunisianBirthDate('45 فيفري 1962')).toBeNull();
  });

  it('renvoie null pour une entrée vide ou illisible', () => {
    expect(parseTunisianBirthDate(null)).toBeNull();
    expect(parseTunisianBirthDate('')).toBeNull();
    expect(parseTunisianBirthDate('illisible')).toBeNull();
  });
});
