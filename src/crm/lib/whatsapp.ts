import type { Establishment, MessageTemplate } from '@/crm/types';

/**
 * Rendu de template + construction du lien wa.me (§ Écran "bouton WhatsApp").
 *
 * Reproduit volontairement `MessageTemplate::render()` côté backend
 * (app/Models/Prospection/MessageTemplate.php) plutôt que de faire un aller-
 * retour serveur pour un simple remplacement de texte : {prenom}/
 * {etablissement} → valeurs, toute variable non reconnue reste visible telle
 * quelle (faute de frappe dans le template = visible à la relecture, pas
 * supprimée en silence).
 */
export function renderTemplate(body: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce(
    (text, [key, value]) => text.split(`{${key}}`).join(value),
    body,
  );
}

export function templateVariablesFor(establishment: Pick<Establishment, 'name' | 'decision_maker_name'>): Record<string, string> {
  return {
    etablissement: establishment.name,
    prenom: establishment.decision_maker_name ?? '',
  };
}

/**
 * wa.me n'accepte que des chiffres dans le chemin (pas de « + », espaces...) —
 * le numéro est déjà stocké en E.164 (+216XXXXXXXX) côté backend, il suffit
 * de retirer les caractères non numériques.
 *
 * Le message est encodé en query string : `encodeURIComponent` gère accents
 * et apostrophes correctement, contrairement à `escape`/une concaténation
 * brute qui casserait le lien sur "démo" ou "aujourd'hui".
 */
export function buildWaMeUrl(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/\D/g, '');

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function activeTemplatesForSegment(
  templates: MessageTemplate[],
  segment: Establishment['segment'],
): MessageTemplate[] {
  return templates.filter((t) => t.active && (t.segment === null || t.segment === segment));
}
