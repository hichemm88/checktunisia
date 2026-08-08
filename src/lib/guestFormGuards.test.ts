import { describe, it, expect } from 'vitest';
import { guestFormBlockers, canSubmitGuest } from './guestFormGuards';

const complete = {
  first_name: 'Yasmine',
  last_name: 'Gharbi',
  date_of_birth: '1991-04-12',
  document_number: 'TN4455667',
  issuing_country_code: 'TUN',
};

describe('guestFormBlockers', () => {
  it('laisse passer un voyageur complet', () => {
    expect(guestFormBlockers(complete)).toEqual([]);
    expect(canSubmitGuest(complete)).toBe(true);
  });

  it('bloque la saisie manuelle tant que le document est incomplet', () => {
    // Cas réel : l'agent clique « saisie manuelle » et ne remplit que l'identité.
    // Le backend exige le document ; sans ce garde-fou, la requête partait et
    // revenait en 422 avec un message de validation brut.
    const blockers = guestFormBlockers({
      first_name: 'Yasmine',
      last_name: 'Gharbi',
      date_of_birth: '1991-04-12',
    });

    expect(blockers).toContain('document_number');
    expect(blockers).toContain('issuing_country_code');
  });

  it('traite une chaîne d\'espaces comme un champ vide', () => {
    expect(guestFormBlockers({ ...complete, document_number: '   ' })).toEqual(['document_number']);
  });

  it('bloque quand un champ lu en confiance faible reste vide', () => {
    expect(guestFormBlockers(complete, { hasUnfilledLowConfidence: true }))
      .toEqual(['low_confidence_field']);
  });

  it('bloque quand aucun document n\'a été photographié', () => {
    expect(guestFormBlockers(complete, { documentPhotoMissing: true }))
      .toEqual(['document_photo']);
  });

  it('remonte toutes les causes à la fois, pas seulement la première', () => {
    expect(guestFormBlockers({}, { documentPhotoMissing: true })).toEqual([
      'first_name', 'last_name', 'date_of_birth',
      'document_number', 'issuing_country_code', 'document_photo',
    ]);
  });
});
