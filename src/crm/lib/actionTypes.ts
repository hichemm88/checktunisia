import type { ActionType } from '@/crm/types';

/** Libellés FR des types d'action (§ Journal) — mêmes valeurs que StoreActionRequest côté backend. */
export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  message_envoye: 'Message envoyé',
  reponse_recue: 'Réponse reçue',
  appel: 'Appel',
  demo_planifiee: 'Démo planifiée',
  demo_faite: 'Démo faite',
  essai_active: 'Essai activé',
  relance: 'Relance',
  note: 'Note',
  changement_statut: 'Changement de statut',
};

/**
 * Boutons proposés dans le formulaire d'ajout rapide (§ Fiche prospect,
 * "2 taps max") : un sous-ensemble volontairement court des types possibles —
 * `demo_planifiee`/`demo_faite`/`changement_statut` passent par le sélecteur
 * de statut (qui journalise déjà automatiquement), pas par ce formulaire.
 */
export const QUICK_ACTION_TYPES: ActionType[] = ['appel', 'reponse_recue', 'relance', 'note'];
