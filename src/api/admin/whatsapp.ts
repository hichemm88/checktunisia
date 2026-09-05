import { api } from '@/lib/api';

/**
 * MODULE PROVISOIRE — relais WhatsApp check-in (à retirer après homologation MI).
 * Voir PROMPT-CLAUDE-CODE-QAYED-AUTORITE.md
 *
 * Client de l'écran d'administration du relais WhatsApp : santé, journal
 * filtrable, renvoi, message test, pause d'urgence.
 */

/**
 * `logged_out` manquait ici, et le repli de l'écran de santé affichait donc en
 * pastille ambre « Initialisation… » l'état le plus grave de tous : WhatsApp a
 * révoqué l'appareil, plus une seule fiche ne partira tant qu'un QR n'aura pas
 * été scanné. La panne la plus alarmante se présentait sous les traits de la
 * plus rassurante.
 */
export type WhatsappSession = 'initializing' | 'ready' | 'disconnected' | 'logged_out' | 'auth_failure';
export type WhatsappStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface WhatsappHealth {
  enabled: boolean;
  session: WhatsappSession;
  /**
   * `session` ne décrit que le relais Web historique (session appairée par
   * QR) : sur le canal Cloud API — actif par défaut depuis la bascule —, il
   * reste figé sur son dernier état d'avant bascule (typiquement
   * `logged_out`, depuis le bannissement du numéro) et ne veut plus rien
   * dire. `session_relevant` dit si `session` décrit encore le canal
   * réellement utilisé.
   *
   * Optionnel : l'écran doit rester lisible si le front est déployé avant l'API.
   */
  session_relevant?: boolean;
  channel?: string;
  reason: string | null;
  paused: boolean;
  last_ready_at: string | null;
  heartbeat_at: string | null;
  // `stuck` = fiches que « Renvoyer tout » débloquerait : échouées + en
  // attente d'un backoff (jusqu'à 4 h après une panne).
  queue: { pending: number; sent: number; failed: number; cancelled: number; stuck: number };
  /**
   * Cadence en vigueur (garde-fous anti-restriction Meta). Sans elle, une file
   * bridée par le plafond horaire est indiscernable d'une file en panne :
   * « 14 en attente » et rien qui part, sans explication à l'écran.
   *
   * Optionnel : l'écran doit rester lisible si le front est déployé avant l'API.
   */
  throttle?: {
    sending: boolean;
    warmup: boolean;
    sent_last_hour: number;
    max_per_hour: number;
    min_interval_seconds: number;
    next_slot_at: string | null;
    paired_at: string | null;
  };
  /**
   * Pourquoi rien ne part. Sans ça, un canal retenu par un garde-fou est
   * indiscernable d'un canal qui n'a rien à envoyer — c'est ainsi qu'une file
   * gonfle en silence.
   *
   * Optionnel : l'écran doit rester lisible si le front est déployé avant l'API.
   */
  sending_blocked?: boolean;
  blocked_reason?: string | null;
  /**
   * État du modèle de message chez Meta.
   *
   * Un modèle non approuvé n'est pas une panne : c'est une attente, et elle ne
   * se corrige pas, elle se subit. Le dire explicitement évite qu'on cherche
   * une panne qui n'existe pas — ou pire, qu'on force les envois.
   */
  template?: {
    name: string;
    language: string;
    status: string | null;
    approved: boolean;
    checked_at: string | null;
    error: string | null;
  };
}

export interface WhatsappLog {
  id: string;
  hotel: string | null;
  hotel_id: string | null;
  guest: string | null;
  check_in_id: string | null;
  status: WhatsappStatus;
  attempts: number;
  last_error: string | null;
  is_test: boolean;
  has_photo: boolean;
  recipient_number: string | null;
  recipient_name: string | null;
  recipient_org: string | null;
  message_id_whatsapp: string | null;
  queued_at: string;
  sent_at: string | null;
  next_attempt_at: string | null;
}

export interface WhatsappLogParams {
  hotel_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  page?: number;
}

interface LogsResponse {
  data: WhatsappLog[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export const adminWhatsappApi = {
  health: () => api.get<{ data: WhatsappHealth }>('/admin/whatsapp/health').then((r) => r.data.data),
  logs: (params?: WhatsappLogParams) =>
    api.get<LogsResponse>('/admin/whatsapp/logs', { params }).then((r) => r.data),
  resend: (id: string) => api.post(`/admin/whatsapp/logs/${id}/resend`).then((r) => r.data),
  resendAll: () =>
    api.post<{ data: { ok: boolean; requeued: number } }>('/admin/whatsapp/logs/resend-all').then((r) => r.data.data),
  test: (property_name?: string) => api.post('/admin/whatsapp/test', { property_name }).then((r) => r.data),
  pause: () => api.post('/admin/whatsapp/pause').then((r) => r.data),
  resume: () => api.post('/admin/whatsapp/resume').then((r) => r.data),
};
