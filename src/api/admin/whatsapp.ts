import { api } from '@/lib/api';

/**
 * MODULE PROVISOIRE — relais WhatsApp check-in (à retirer après homologation MI).
 * Voir PROMPT-CLAUDE-CODE-QAYED-AUTORITE.md
 *
 * Client de l'écran d'administration du relais WhatsApp : santé, journal
 * filtrable, renvoi, message test, pause d'urgence.
 */

export type WhatsappSession = 'initializing' | 'ready' | 'disconnected' | 'auth_failure';
export type WhatsappStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface WhatsappHealth {
  enabled: boolean;
  session: WhatsappSession;
  reason: string | null;
  paused: boolean;
  last_ready_at: string | null;
  heartbeat_at: string | null;
  queue: { pending: number; sent: number; failed: number; cancelled: number };
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
  test: (property_name?: string) => api.post('/admin/whatsapp/test', { property_name }).then((r) => r.data),
  pause: () => api.post('/admin/whatsapp/pause').then((r) => r.data),
  resume: () => api.post('/admin/whatsapp/resume').then((r) => r.data),
};
