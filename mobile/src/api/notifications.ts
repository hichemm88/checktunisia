import { api } from '@/lib/api';
import type { ApiList, ApiItem } from '@/types';

export type NotificationType =
  | 'check_in'
  | 'check_out'
  | 'fiche_updated'
  | 'fiche_cancelled'
  | 'fiche_pending';

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
};
