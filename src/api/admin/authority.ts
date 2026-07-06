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
    list: () => api.get<{ data: AdminAuthorityUser[] }>('/admin/authority-users').then((r) => r.data.data),
    create: (data: object) => api.post('/admin/authority-users', data).then((r) => r.data.data),
    update: (id: string, data: object) => api.patch(`/admin/authority-users/${id}`, data).then((r) => r.data.data),
    remove: (id: string) => api.delete(`/admin/authority-users/${id}`),
  },
  organizations: {
    list: (params?: { search?: string; include_inactive?: boolean }) =>
      api.get<{ data: AdminAuthorityOrganization[] }>('/admin/authority-organizations', { params }).then((r) => r.data.data),
    create: (data: object) => api.post('/admin/authority-organizations', data).then((r) => r.data.data),
    update: (id: number, data: object) => api.patch(`/admin/authority-organizations/${id}`, data).then((r) => r.data.data),
    remove: (id: number) => api.delete(`/admin/authority-organizations/${id}`),
  },
};
