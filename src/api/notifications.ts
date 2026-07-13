import { api } from '@/lib/api';

export interface AppNotification {
  id: string;
  /** check_in | check_out | fiche_updated | fiche_cancelled | fiche_pending | manager_message | departure_due */
  type: string;
  title: string;
  body: string;
  property_id: string | null;
  property_name: string | null;
  check_in_id: string | null;
  actor_name: string | null;
  created_at: string;
  read_at: string | null;
}

export const notificationsApi = {
  list: (params?: { type?: string; property?: string; page?: number; per_page?: number }) =>
    api.get<{ data: AppNotification[]; meta?: { total: number } }>('/notifications', { params }).then((r) => r.data),

  unreadCount: () =>
    api.get('/notifications/unread-count').then((r) => (r.data?.data?.count ?? r.data?.count ?? 0) as number),

  markRead: (id: string) => api.post(`/notifications/${id}/read`),

  readAll: () => api.post('/notifications/read-all'),
};
