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

// ─── Nommer l'opération telle que le client la vit ───────────────────────────
//
// Activer son abonnement, monter de gamme et redescendre sont trois gestes
// différents. L'interface les appelait tous « changement » : un hôtelier en
// essai qui réglait sa formule lisait « Confirmer le changement », puis
// « Passage à Essentiel » — alors qu'il ne changeait précisément de rien.
//
// Le backend distingue déjà ces trois cas (`kind`) ; il suffit de ne pas
// perdre l'information à l'affichage.

export type PlanChangeKind = 'subscribe' | 'upgrade' | 'downgrade';

const KINDS: readonly PlanChangeKind[] = ['subscribe', 'upgrade', 'downgrade'] as const;

/**
 * Nature de l'opération, ramenée aux trois cas connus. Un `kind` inattendu
 * retombe sur la formulation générique « changement de plan » : neutre et
 * toujours vraie, jamais un libellé vide.
 */
export const planChangeKind = (kind: string | null | undefined): PlanChangeKind | null =>
  KINDS.includes(kind as PlanChangeKind) ? (kind as PlanChangeKind) : null;

/**
 * Clé de traduction d'un libellé du parcours, spécialisée par nature
 * d'opération. `base` est la clé générique ; la variante par nature s'appelle
 * `base` + `Subscribe|Upgrade|Downgrade`.
 */
export const planChangeLabelKey = (base: string, kind: string | null | undefined): string => {
  const resolved = planChangeKind(kind);

  if (resolved === null) {
    return `subscriptionPage.${base}`;
  }

  return `subscriptionPage.${base}${resolved.charAt(0).toUpperCase()}${resolved.slice(1)}`;
};

/** Quota d'un pack en libellé court : `null` = illimité. */
export const quotaLabel = (quota: number | null | undefined, unlimitedLabel: string): string =>
  quota === null || quota === undefined ? unlimitedLabel : String(quota);
