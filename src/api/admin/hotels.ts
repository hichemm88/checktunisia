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

export const adminHotelsApi = {
  list: (params?: { status?: string; search?: string; per_page?: number; page?: number }) =>
    api.get<{ data: AdminHotel[]; meta: { total: number; current_page: number; per_page: number } }>('/admin/hotels', { params }).then((r) => r.data),
  create: (data: object) => api.post<{ data: AdminHotel }>('/admin/hotels', data).then((r) => r.data.data),
  update: (id: string, data: object) => api.patch(`/admin/hotels/${id}`, data),
  remove: (id: string) => api.delete(`/admin/hotels/${id}`),
  suspend: (id: string, reason: string) => api.post(`/admin/hotels/${id}/suspend`, { reason }),
  activate: (id: string) => api.post(`/admin/hotels/${id}/activate`),
  getUsers: (hotelId: string) => api.get(`/admin/hotels/${hotelId}/users`).then((r) => r.data.data),
};
