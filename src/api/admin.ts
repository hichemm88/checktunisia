import { api } from '@/lib/api';

export interface AdminHotel {
  id: string;
  name: string;
  type: string;
  room_count: number;
  status: 'active' | 'suspended' | 'pending' | 'closed';
  registration_number: string | null;
  subscription: { plan: string; status: string; expires_at: string } | null;
  check_ins_count: number;
  created_at: string;
}

export interface AdminStats {
  hotels: { total: number; active: number; suspended: number; pending: number };
  check_ins: { today: number; this_month: number };
}

export const adminApi = {
  dashboard:    () => api.get<{ data: AdminStats }>('/admin/dashboard').then((r) => r.data.data),
  hotels:       (params?: { status?: string; search?: string; per_page?: number; page?: number }) =>
    api.get<{ data: AdminHotel[]; meta: { total: number; current_page: number; per_page: number } }>('/admin/hotels', { params }).then((r) => r.data),
  suspend:      (id: string, reason: string) => api.post(`/admin/hotels/${id}/suspend`, { reason }),
  activate:     (id: string) => api.post(`/admin/hotels/${id}/activate`),
  getUsers:     (hotelId: string) => api.get(`/admin/hotels/${hotelId}/users`).then((r) => r.data.data),
  addSub:       (hotelId: string, data: object) => api.post(`/admin/hotels/${hotelId}/subscriptions`, data),
  getSubs:      (hotelId: string) => api.get(`/admin/hotels/${hotelId}/subscriptions`).then((r) => r.data.data),
  getInvoices:  (hotelId: string) => api.get(`/admin/hotels/${hotelId}/invoices`).then((r) => r.data.data),
  plans:        () => api.get('/admin/plans').then((r) => r.data.data),
  updatePlan:   (id: number, data: object) => api.patch(`/admin/plans/${id}`, data).then((r) => r.data.data),

  // Platform settings (payment methods, Flouci config, RIB)
  getPlatformSettings:    () => api.get('/admin/platform-settings').then((r) => r.data.data),
  updatePlatformSettings: (data: object) => api.patch('/admin/platform-settings', data).then((r) => r.data.data),
};
