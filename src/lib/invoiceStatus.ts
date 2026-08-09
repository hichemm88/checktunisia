/**
 * Présentation des statuts de facture.
 *
 * L'onglet Factures rendait la valeur brute du backend — « sent », « void » —
 * dans une interface par ailleurs entièrement traduite. Les libellés
 * existaient pourtant déjà en fr/en/ar pour l'écran d'administration : ils
 * sont réutilisés ici plutôt que traduits une seconde fois, pour qu'un
 * changement de formulation ne puisse pas diverger entre les deux surfaces.
 *
 * Rien ici ne touche aux valeurs du backend : ce module ne fait que les
 * habiller.
 */

/** Les seuls statuts que l'API sait produire (voir la validation côté admin). */
export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'void'] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Teintes du composant Badge existant. */
export type InvoiceStatusTone = 'active' | 'draft' | 'suspended' | 'expired';

const LABEL_KEYS: Record<InvoiceStatus, string> = {
  draft:   'adminFacturation.statusDraft',
  sent:    'adminFacturation.statusSent',
  paid:    'adminFacturation.statusPaid',
  overdue: 'adminFacturation.statusOverdue',
  void:    'adminFacturation.statusVoid',
};

const TONES: Record<InvoiceStatus, InvoiceStatusTone> = {
  draft:   'draft',
  sent:    'draft',
  paid:    'active',
  overdue: 'expired',
  void:    'suspended',
};

/**
 * Clé de traduction du statut, ou `null` s'il est inconnu — à charge de
 * l'appelant d'afficher alors la valeur brute. Un statut ajouté demain doit
 * rester visible, pas disparaître dans un libellé vide.
 */
export const invoiceStatusLabelKey = (status: string): string | null =>
  LABEL_KEYS[status as InvoiceStatus] ?? null;

/** Un statut inconnu n'est jamais présenté comme réglé. */
export const invoiceStatusTone = (status: string): InvoiceStatusTone =>
  TONES[status as InvoiceStatus] ?? 'suspended';

/** La facture attend-elle encore un règlement ? */
export const isInvoiceOpen = (status: string): boolean => status !== 'paid' && status !== 'void';
