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
 *
 * `message_envoye` y figure aussi : le bouton WhatsApp journalise déjà ce
 * type pour ses propres envois, mais un contact pris par un AUTRE canal
 * (Messenger, téléphone, sur place) n'a que ce chemin pour être noté.
 */
export const QUICK_ACTION_TYPES: ActionType[] = ['message_envoye', 'appel', 'reponse_recue', 'relance', 'note'];

/** Canaux reconnus par le backend (voir StoreActionRequest) — optionnel, seulement pertinent pour un contact (message/appel/réponse). */
export const ACTION_CHANNELS = ['WhatsApp', 'Messenger', 'téléphone', 'sur place'] as const;

export const CHANNEL_RELEVANT_TYPES: ActionType[] = ['message_envoye', 'appel', 'reponse_recue'];
