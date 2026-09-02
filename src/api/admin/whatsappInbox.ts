import { api } from '@/lib/api';

/**
 * Boîte de réception des autorités — ce que les agents RÉPONDENT aux fiches.
 *
 * Deux notions à ne pas confondre dans les types :
 *
 *  - une entrée `fiche` vient du journal d'envoi : elle a un cycle de vie de
 *    LIVRAISON (accepté, remis, lu, refusé) et une identité de voyageur ;
 *  - une entrée `message` est un texte — réponse d'un agent, ou réponse
 *    envoyée depuis l'administration.
 *
 * Les deux se lisent dans la même chronologie, fusionnée côté serveur.
 */

export type InboxDirection = 'inbound' | 'outbound';
export type InboxFilter = 'all' | 'unread' | 'awaiting' | 'replied';

/** Pourquoi le champ de réponse est fermé. */
export type ReplyBlockedReason = 'NEVER_REPLIED' | 'WINDOW_EXPIRED';

export interface InboxAuthority {
  profile_id: number;
  name: string | null;
  badge_number: string | null;
  rank: string | null;
  organization: string | null;
}

export interface InboxConversation {
  id: string;
  /** Numéro international nu, tel que Meta le donne. */
  phone: string;
  /** Nom de profil WhatsApp, choisi par l'agent : indicatif, jamais une identité. */
  contact_name: string | null;
  /** null quand aucun agent enregistré ne porte ce numéro (numéro global, tiers). */
  authority: InboxAuthority | null;
  unread_count: number;
  last_message_at: string | null;
  last_message_direction: InboxDirection | null;
  last_message_preview: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  /** Fenêtre de service Meta : hors de ces 24 h, aucun texte libre ne passe. */
  service_window_open: boolean;
  service_window_closes_at: string | null;
}

export interface InboxFicheEntry {
  kind: 'fiche';
  id: string;
  direction: 'outbound';
  at: string | null;
  wamid: string | null;
  guest: string | null;
  establishment: string | null;
  check_in_id: string | null;
  is_test: boolean;
  status: string;
  delivery_status: string | null;
  queued_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  error: string | null;
}

export interface InboxMessageEntry {
  kind: 'message';
  id: string;
  direction: InboxDirection;
  at: string | null;
  wamid: string | null;
  type: string;
  /** null pour un média sans légende : rien n'est inventé à la place. */
  body: string | null;
  has_media: boolean;
  media_mime: string | null;
  media_filename: string | null;
  context_wamid: string | null;
  status: string | null;
  delivered_at: string | null;
  read_at: string | null;
  error: string | null;
  sent_by: string | null;
}

export type InboxEntry = InboxFicheEntry | InboxMessageEntry;

export interface InboxReplyCapability {
  allowed: boolean;
  window_closes_at: string | null;
  max_length: number;
  reason: ReplyBlockedReason | null;
}

export interface InboxThread {
  conversation: InboxConversation;
  timeline: InboxEntry[];
  reply: InboxReplyCapability;
}

export interface InboxListMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  /** Total tous fils confondus : le badge de navigation ne suit ni page ni filtre. */
  unread_total: number;
}

export const adminWhatsappInboxApi = {
  list: (params: { search?: string; filter?: InboxFilter } = {}) =>
    api
      .get<{ data: InboxConversation[]; meta: InboxListMeta }>('/admin/whatsapp/inbox', { params })
      .then((r) => r.data),

  thread: (id: string) =>
    api.get<{ data: InboxThread }>(`/admin/whatsapp/inbox/${id}`).then((r) => r.data.data),

  reply: (id: string, message: string) =>
    api
      .post<{ data: InboxMessageEntry }>(`/admin/whatsapp/inbox/${id}/reply`, { message })
      .then((r) => r.data.data),
};
