import { describe, it, expect } from 'vitest';
import { parseCinResponse } from './cinExtraction';

/**
 * Corpus SYNTHÉTIQUE — mêmes conventions que mrzExtraction.test.ts : aucune
 * CIN réelle, uniquement des valeurs fictives.
 */

const wellFormed = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    side: 'front',
    cardFormat: 'biometric',
    cinNumber: '12345678',
    lastNameAr: 'الفولاني',
    firstNameAr: 'فولان',
    filiationAr: null,
    spouseAr: null,
    lastNameLatin: 'EL FOULANI',
    firstNameLatin: 'FOULEN',
    birthDate: '1990-01-01',
    birthPlaceAr: null,
    birthPlaceLatin: null,
    confidence: { cinNumber: 'high', names: 'high', birthDate: 'high' },
    ...over,
  });

describe('lecture CIN par vision — noms latins plausibles', () => {
  it('conserve la confiance déclarée par le modèle (plafonnée à medium)', () => {
    const r = parseCinResponse(wellFormed());
    expect(r.confidence.names).toBe('medium');
    expect(r.lastNameLatin).toBe('EL FOULANI');
  });
});

describe('lecture CIN par vision — nom latin qui ressemble à une légende imprimée', () => {
  it("retombe à 'low' quand le nom de famille a la forme d'un texte d'étiquette", () => {
    // Même forme que l'incident réel documenté dans namePlausibility.ts.
    const r = parseCinResponse(
      wellFormed({ lastNameLatin: 'REPUBLIQUETUNISIENNECARTEDIDENTITE', confidence: { names: 'high' } }),
    );
    expect(r.confidence.names).toBe('low');
  });

  it("retombe à 'low' quand prénom et nom sont identiques", () => {
    const r = parseCinResponse(
      wellFormed({ firstNameLatin: 'FOULEN', lastNameLatin: 'FOULEN', confidence: { names: 'high' } }),
    );
    expect(r.confidence.names).toBe('low');
  });
});
