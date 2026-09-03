import { describe, it, expect } from 'vitest';
import { computeCheckDigit, verifyTd3Line2 } from './mrzCheckDigits';

/**
 * Corpus SYNTHÉTIQUE, dérivé du spécimen de démonstration « EL FOULANI /
 * FOULEN », document fictif sans valeur légale. Aucune donnée personnelle
 * réelle n'entre dans ce fichier — et ne doit jamais y entrer : un test se lit,
 * se copie et se partage.
 *
 * Ligne 2 du spécimen :
 *   X0000000<1TUN9001011M3101012<<<<<<<<<<<<04
 *
 * Ses trois chiffres de contrôle de champ sont justes :
 *   « X0000000< » -> 1   « 900101 » -> 1   « 310101 » -> 2
 *
 * Elle fait 42 caractères au lieu de 44 : des `<` de remplissage manquent en
 * fin de ligne. C'est exactement le défaut qu'on observe sur une MRZ
 * photographiée, et la raison pour laquelle le chiffre COMPOSITE n'est pas
 * exigé — il aurait fait échouer une lecture pourtant juste.
 */

const SPECIMEN_LINE2 = 'X0000000<1TUN9001011M3101012<<<<<<<<<<<<04';

describe('chiffres de contrôle MRZ', () => {
  it('calcule la pondération 7-3-1 de l\'ICAO', () => {
    // X=33 -> 33*7 = 231 -> 231 % 10 = 1
    expect(computeCheckDigit('X0000000<')).toBe(1);
    expect(computeCheckDigit('900101')).toBe(1);
    expect(computeCheckDigit('310101')).toBe(2);
  });

  it('refuse un caractère hors alphabet MRZ plutôt que de l\'ignorer', () => {
    // Ignorer un caractère parasite reviendrait à valider une ligne bruitée.
    expect(computeCheckDigit('90-101')).toBeNull();
  });

  it('valide le spécimen malgré ses caractères de remplissage manquants', () => {
    const result = verifyTd3Line2(SPECIMEN_LINE2);

    expect(result.checked).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.mismatched).toEqual([]);
  });

  it('repère une confusion O/0 dans le numéro de document', () => {
    // Le cas réel : la vision lit « O » là où la MRZ porte « 0 ». Le numéro
    // reste plausible, et sans chiffre de contrôle rien ne le signalerait.
    const corrupted = SPECIMEN_LINE2.replace('X0000000', 'XO000000');

    const result = verifyTd3Line2(corrupted);

    expect(result.valid).toBe(false);
    expect(result.mismatched).toContain('document_number');
  });

  it('repère une erreur sur la date de naissance', () => {
    // 900101 -> 900107 : une date parfaitement plausible, et fausse.
    const corrupted = SPECIMEN_LINE2.replace('9001011M', '9001071M');

    const result = verifyTd3Line2(corrupted);

    expect(result.valid).toBe(false);
    expect(result.mismatched).toContain('date_of_birth');
  });

  it('avoue ne rien pouvoir vérifier sur une ligne tronquée', () => {
    // « checked: false » n'est PAS « valid: false » : l'écran doit pouvoir
    // distinguer « lecture démentie » de « lecture invérifiable ».
    const result = verifyTd3Line2('X0000000<1TUN90');

    expect(result.checked).toBe(false);
    expect(result.valid).toBe(false);
  });

  it('avoue ne rien pouvoir vérifier sans ligne du tout', () => {
    expect(verifyTd3Line2(null).checked).toBe(false);
    expect(verifyTd3Line2('').checked).toBe(false);
  });

  it('tolère les espaces introduits par l\'OCR', () => {
    const spaced = 'X0000000<1TUN900101 1M3101012<<<<<<<<<<<<04';

    expect(verifyTd3Line2(spaced).valid).toBe(true);
  });
});
