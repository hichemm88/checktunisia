import { describe, expect, it } from 'vitest';
import { isSuspiciousName, sameName } from './namePlausibility';

describe('isSuspiciousName', () => {
  it('flags the exact string from the production incident', () => {
    // A transmitted fiche carried this as the surname — printed passport
    // bio-page captions read instead of the actual name.
    expect(isSuspiciousName('ABEEXPEDIGAQIDATEOFISSUEAUTORIDADEAUTHO')).toBe(true);
  });

  it('flags a single unbroken token far longer than any real name component', () => {
    expect(isSuspiciousName('A'.repeat(35))).toBe(true);
  });

  it('flags a field containing digits or symbols', () => {
    expect(isSuspiciousName('DUPONT123')).toBe(true);
    expect(isSuspiciousName('DUPONT/JEAN')).toBe(true);
  });

  it('does not flag ordinary real-world names', () => {
    for (const name of [
      'BEN SALAH', 'DA SILVA HOEPERS', "O'BRIEN", 'JEAN-CLAUDE', 'ERIKSSON',
      'ANNA MARIA', 'AL FOULANI', 'MARIE-ANGE DE LA FONTAINE', 'MOHAMED',
    ]) {
      expect(isSuspiciousName(name)).toBe(false);
    }
  });

  it('does not flag surnames that merely contain a short blacklisted-looking substring', () => {
    // Real English surnames containing "SEX" — this is exactly why the
    // blacklist only uses long, distinctive bureaucratic words.
    expect(isSuspiciousName('ESSEX')).toBe(false);
    expect(isSuspiciousName('SUSSEX')).toBe(false);
  });

  it('treats an absent or empty field as not suspicious — nothing to distrust', () => {
    expect(isSuspiciousName(null)).toBe(false);
    expect(isSuspiciousName(undefined)).toBe(false);
    expect(isSuspiciousName('')).toBe(false);
    expect(isSuspiciousName('   ')).toBe(false);
  });

  it('flags a name that is really an accented bureaucratic label', () => {
    expect(isSuspiciousName('AUTORIDADEEMISSAO')).toBe(true);
  });
});

describe('sameName', () => {
  it('flags two fields that are identical once trimmed/uppercased', () => {
    expect(sameName('DUPONT', 'dupont')).toBe(true);
    expect(sameName(' Dupont ', 'DUPONT')).toBe(true);
  });

  it('does not flag two different names', () => {
    expect(sameName('DUPONT', 'MARTIN')).toBe(false);
  });

  it('does not flag when either side is absent', () => {
    expect(sameName(null, 'DUPONT')).toBe(false);
    expect(sameName('DUPONT', null)).toBe(false);
    expect(sameName('', '')).toBe(false);
  });
});
