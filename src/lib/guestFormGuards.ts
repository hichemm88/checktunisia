/**
 * Ce qui empêche encore d'enregistrer un voyageur.
 *
 * Extrait du panneau de scan pour deux raisons : la règle est du métier (ce
 * qu'une fiche de police exige), et elle doit être vérifiable sans navigateur.
 * Tant qu'elle vivait en ligne dans le JSX, le bouton restait actif alors que
 * le backend exigeait déjà un numéro de document — la saisie manuelle partait
 * puis revenait en 422 avec un message de validation brut.
 */
export interface GuestFormShape {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  document_number?: string;
  issuing_country_code?: string;
}

export interface GuestFormContext {
  /** Un champ lu avec une confiance faible et laissé vide bloque la saisie. */
  hasUnfilledLowConfidence?: boolean;
  /** Aucun document photographié et l'agent n'a pas confirmé l'absence de pièce. */
  documentPhotoMissing?: boolean;
}

const blank = (v: string | undefined) => !v || v.trim() === '';

/**
 * Liste des raisons de blocage, dans l'ordre où l'agent les rencontre.
 * Vide = le voyageur peut être enregistré.
 */
export const guestFormBlockers = (
  form: GuestFormShape,
  ctx: GuestFormContext = {},
): string[] => {
  const blockers: string[] = [];

  if (blank(form.first_name)) blockers.push('first_name');
  if (blank(form.last_name)) blockers.push('last_name');
  if (blank(form.date_of_birth)) blockers.push('date_of_birth');
  // Exigés par le backend : une fiche de police sans numéro de document ni
  // pays de délivrance n'est pas exploitable par l'autorité.
  if (blank(form.document_number)) blockers.push('document_number');
  if (blank(form.issuing_country_code)) blockers.push('issuing_country_code');
  if (ctx.hasUnfilledLowConfidence) blockers.push('low_confidence_field');
  if (ctx.documentPhotoMissing) blockers.push('document_photo');

  return blockers;
};

export const canSubmitGuest = (form: GuestFormShape, ctx: GuestFormContext = {}): boolean =>
  guestFormBlockers(form, ctx).length === 0;
