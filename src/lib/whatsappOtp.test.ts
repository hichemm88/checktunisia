import { describe, it, expect } from 'vitest';
import {
  formatCountdown,
  isCompleteCode,
  isPlausiblePhone,
  normalizePhone,
  sanitizeCode,
} from './whatsappOtp';

/**
 * Règles de saisie de la connexion par code WhatsApp.
 *
 * Ce qui est vérifié ici décide si une requête part, et sous quelle forme. Une
 * divergence avec la normalisation du serveur (`formatRecipient()`, chiffres
 * seuls, international, sans « + ») refuserait un code à un agent parfaitement
 * enregistré — sans le moindre message pour l'expliquer, et sans qu'il ait
 * d'autre moyen de se connecter.
 */
describe('normalizePhone', () => {
  it('colle l\'indicatif au numéro local, chiffres seuls', () => {
    expect(normalizePhone('+216', '20 123 456')).toBe('21620123456');
  });

  it('retire le zéro de tête, convention nationale sans valeur à l\'international', () => {
    // « 020 123 456 » composé depuis la Tunisie vaut « 20 123 456 » chez Meta :
    // garder le zéro produirait un numéro rejeté sur une saisie correcte.
    expect(normalizePhone('+216', '020 123 456')).toBe('21620123456');
  });

  it('ne préfixe pas deux fois un numéro déjà international', () => {
    // Cas du collage depuis le carnet d'adresses, fréquent sur téléphone.
    expect(normalizePhone('+216', '+216 20 123 456')).toBe('21620123456');
    expect(normalizePhone('+216', '21620123456')).toBe('21620123456');
  });

  it('ignore la ponctuation de mise en forme', () => {
    expect(normalizePhone('+33', '(0)6-12.34.56.78')).toBe('33612345678');
  });
});

describe('isPlausiblePhone', () => {
  it('refuse une saisie visiblement inachevée', () => {
    expect(isPlausiblePhone('+216', '20 12')).toBe(false);
    expect(isPlausiblePhone('+216', '')).toBe(false);
  });

  it('accepte un numéro de longueur normale', () => {
    expect(isPlausiblePhone('+216', '20123456')).toBe(true);
  });

  it('refuse au-delà de la norme E.164', () => {
    expect(isPlausiblePhone('+216', '1234567890123456')).toBe(false);
  });
});

describe('sanitizeCode', () => {
  it('ne garde que les chiffres, au plus six', () => {
    expect(sanitizeCode('123456')).toBe('123456');
    expect(sanitizeCode('12 34 56')).toBe('123456');
  });

  it('extrait le code d\'un collage trop large', () => {
    // Le bouton « Copier le code » de WhatsApp met le code au presse-papiers,
    // mais ce qui atterrit dans le champ dépend de ce que l'utilisateur a
    // réellement sélectionné. Sans ce filtre, un collage un peu large donnerait
    // « code invalide » sur un code parfaitement bon — indiagnostiquable.
    expect(sanitizeCode('Votre code est 123456')).toBe('123456');
    expect(sanitizeCode('123456\n')).toBe('123456');
  });

  it('tronque au-delà de six chiffres plutôt que de tout rejeter', () => {
    expect(sanitizeCode('1234567890')).toBe('123456');
  });
});

describe('isCompleteCode', () => {
  it('exige exactement six chiffres', () => {
    expect(isCompleteCode('123456')).toBe(true);
    expect(isCompleteCode('12345')).toBe(false);
    expect(isCompleteCode('12345a')).toBe(false);
  });
});

describe('formatCountdown', () => {
  it('affiche minutes:secondes sur deux chiffres', () => {
    expect(formatCountdown(300)).toBe('5:00');
    expect(formatCountdown(59)).toBe('0:59');
    expect(formatCountdown(9)).toBe('0:09');
  });

  it('ne descend pas sous zéro', () => {
    expect(formatCountdown(-3)).toBe('0:00');
  });
});
