import { api } from '@/lib/api';

export interface AdminAuthorityUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  organization: string | null;
  badge_number: string | null;
  last_login_at: string | null;
  two_factor_confirmed_at: string | null;
}

export interface AdminAuthorityOrganization {
  id: number;
  name: string;
  type: string;
  code: string | null;
  governorate: string | null;
  description: string | null;
  is_active: boolean;
  user_profiles_count?: number;
}

export const adminAuthorityApi = {
  users: {
    list: (params?: { page?: number; per_page?: number }) =>
      api.get<{ data: AdminAuthorityUser[]; meta: { total: number; current_page: number; per_page: number } }>('/admin/authority-users', { params }).then((r) => r.data),
    create: (data: object) => api.post('/admin/authority-users', data).then((r) => r.data.data),
    update: (id: string, data: object) => api.patch(`/admin/authority-users/${id}`, data).then((r) => r.data.data),
    remove: (id: string) => api.delete(`/admin/authority-users/${id}`),
  },
  organizations: {
    list: (params?: { search?: string; include_inactive?: boolean; page?: number; per_page?: number }) =>
      api.get<{ data: AdminAuthorityOrganization[]; meta: { total: number; current_page: number; per_page: number } }>('/admin/authority-organizations', { params }).then((r) => r.data),
    create: (data: object) => api.post('/admin/authority-organizations', data).then((r) => r.data.data),
    update: (id: number, data: object) => api.patch(`/admin/authority-organizations/${id}`, data).then((r) => r.data.data),
    remove: (id: number) => api.delete(`/admin/authority-organizations/${id}`),
  },
};
