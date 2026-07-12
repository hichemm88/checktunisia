import { api } from '@/lib/api';
import type { ApiList, ApiItem } from '@/types';

export type NotificationType =
  | 'check_in'
  | 'check_out'
  | 'fiche_updated'
  | 'fiche_cancelled'
  | 'fiche_pending'
  | 'manager_message'
  | 'departure_due';

/** One notification as rendered by the notification centre (server is source of truth). */
export interface AppNotification {
  id: string;
  type: NotificationType;
  /** Server-formatted French title/body (§6.1) so wording stays consistent everywhere. */
  title: string;
  body: string;
  property_id: string | null;
  property_name: string | null;
  check_in_id: string | null;
  actor_name: string | null;
  created_at: string;
  read_at: string | null;
}

export interface NotificationQuery {
  type?: NotificationType;
  property?: string;
  page?: number;
}

export const notificationsApi = {
  /** Register/refresh this device's Expo push token. */
  registerDevice: (token: string, platform: 'ios' | 'android') =>
    api.post<ApiItem<{ id: string }>>('/devices', { token, platform }).then((r) => r.data.data),

  /** Remove the token on logout so the device stops receiving pushes. */
  removeDevice: (token: string) => api.delete(`/devices/${encodeURIComponent(token)}`),

  list: (params?: NotificationQuery) =>
    api.get<ApiList<AppNotification>>('/notifications', { params }).then((r) => r.data),

  unreadCount: () =>
    api.get<ApiItem<{ count: number }>>('/notifications/unread-count').then((r) => r.data.data.count),

  markRead: (id: string) =>
    api.post<ApiItem<{ read_at: string }>>(`/notifications/${id}/read`).then((r) => r.data.data),

  markAllRead: () => api.post<ApiItem<{ updated: number }>>('/notifications/read-all').then((r) => r.data.data),

  /** Manager's receptionists across their properties, for the broadcast recipient picker (§9). */
  recipients: () =>
    api.get<ApiList<Recipient>>('/notifications/recipients').then((r) => r.data.data),

  /**
   * Manager → receptionists broadcast. `recipientIds` narrows the audience; omit (or empty)
   * to send to all receptionists — preserving the one-tap default behaviour.
   */
  broadcast: (message: string, propertyId?: string | null, recipientIds?: string[]) =>
    api
      .post<ApiItem<{ sent: number }>>('/notifications/broadcast', {
        message,
        property_id: propertyId ?? undefined,
        recipient_ids: recipientIds && recipientIds.length > 0 ? recipientIds : undefined,
      })
      .then((r) => r.data.data),
};

/** A receptionist the manager can target, with every property they're assigned to. */
export interface Recipient {
  id: string;
  first_name: string;
  last_name: string;
  properties: { id: string; name: string }[];
}
