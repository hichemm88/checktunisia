import { api } from '@/lib/api';

export interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'hotel_admin' | 'receptionist';
  status: string;
  organization: string | null;
  hotels: { id: string; name: string }[];
  last_login_at: string | null;
  created_at: string;
}

export const adminUsersApi = {
  list: (params?: { search?: string; role?: string; status?: string; organization_id?: string; hotel_id?: string; page?: number; per_page?: number }) =>
    api.get<{ data: AdminUser[]; meta: { total: number; current_page: number; per_page: number } }>('/admin/users', { params }).then((r) => r.data),
  create: (data: { first_name: string; last_name: string; email: string; role: string; hotel_id: string }) =>
    api.post('/admin/users', data).then((r) => r.data.data),
  update: (id: string, data: object) => api.patch(`/admin/users/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/admin/users/${id}`),
  resendInvite: (id: string) => api.post<{ data: { id: string; email_sent: boolean } }>(`/admin/users/${id}/resend-invite`).then((r) => r.data.data),
};
