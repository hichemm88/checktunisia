import type { PlanChangePreview } from '@/api/subscription';

/**
 * Décisions d'affichage du parcours de changement de plan.
 *
 * Ces fonctions ne calculent AUCUN montant : elles répondent à des questions
 * de parcours (« faut-il payer ? », « faut-il une confirmation renforcée ? »)
 * à partir de la simulation renvoyée par le backend. Les chiffres affichés
 * viennent tous, sans retouche, de cette même simulation.
 */

/** Le changement prend-il effet tout de suite (upgrade payé) ou au cycle suivant (downgrade) ? */
export const isImmediate = (preview: Pick<PlanChangePreview, 'effective'>): boolean =>
  preview.effective === 'on_payment';

/**
 * Une facture doit-elle être réglée pour que le changement s'applique ?
 * Un upgrade dont le crédit couvre tout le prix ne coûte rien et s'applique
 * directement — il ne faut pas promettre un paiement qui n'aura pas lieu.
 */
export const requiresPayment = (preview: Pick<PlanChangePreview, 'effective' | 'amount_due_now'>): boolean =>
  isImmediate(preview) && preview.amount_due_now > 0;

/**
 * Le client a-t-il des conditions négociées à perdre ? Si oui, un simple
 * clic ne suffit pas : il doit cocher qu'il a compris ce qu'il abandonne.
 */
export const requiresHistoricConfirmation = (
  preview: Pick<PlanChangePreview, 'loses_historic_conditions'>,
): boolean => preview.loses_historic_conditions;

/** Le changement est-il proposable ? (un plan non éligible reste visible, avec son motif). */
export const isSelectable = (preview: PlanChangePreview | null): boolean => preview?.allowed === true;

/**
 * Clé d'idempotence d'une INTENTION de changement.
 *
 * Générée une seule fois à l'ouverture de l'écran de confirmation et
 * conservée pendant tout le parcours : double clic sur « Confirmer », rejeu
 * après un timeout ou second onglet renvoient la même clé, donc retombent
 * sur la même demande côté serveur. Une nouvelle intention (autre plan, ou
 * reprise après annulation) génère une nouvelle clé.
 */
export const newIdempotencyKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Quota d'un pack en libellé court : `null` = illimité. */
export const quotaLabel = (quota: number | null | undefined, unlimitedLabel: string): string =>
  quota === null || quota === undefined ? unlimitedLabel : String(quota);
