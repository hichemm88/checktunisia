import { api } from '@/lib/api';

export interface AdminHost {
  id: string;
  name: string;
  entity_type: 'company' | 'individual';
  registration_number: string | null;
  contact_email: string;
  contact_phone: string | null;
  status: 'active' | 'suspended';
  properties_count: number;
  subscription: { plan: string; status: string; expires_at: string } | null;
  created_at: string;
}

export interface AdminHostDetail extends Omit<AdminHost, 'properties_count' | 'subscription'> {
  properties: { id: string; name: string; status: string }[];
  active_subscription: {
    id: string; status: string; expires_at: string; plan_id: number; custom_price: string | null;
    billing_cycle?: string;
    plan?: { id: number; name: string; price_monthly: string; price_yearly: string | null };
  } | null;
  users: { id: string; first_name: string; last_name: string; email: string; role: string; status: string }[];
  metrics: { last_check_in_at: string | null; check_ins_this_month: number; mrr: string | null };
  /** Fonctionnalités effectives (pack + overrides) avec usage réel. */
  entitlements: Record<string, { limit?: number | null; used?: number; enabled?: boolean; label: string }>;
  /** Overrides négociés bruts de l'abonnement actif ({} si aucun). */
  feature_overrides: Record<string, number | boolean | null>;
}

export const adminHostsApi = {
  list: (params?: { search?: string; status?: string; entity_type?: string; page?: number; per_page?: number }) =>
    api.get<{ data: AdminHost[]; meta: { total: number; current_page: number; per_page: number } }>('/admin/hosts', { params }).then((r) => r.data),
  show: (id: string) => api.get<{ data: AdminHostDetail }>(`/admin/hosts/${id}`).then((r) => r.data.data),
  create: (data: object) => api.post<{ data: AdminHost }>('/admin/hosts', data).then((r) => r.data.data),
  update: (id: string, data: object) => api.patch<{ data: AdminHost }>(`/admin/hosts/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/admin/hosts/${id}`),
  suspend: (id: string, reason: string) => api.post(`/admin/hosts/${id}/suspend`, { reason }),
  activate: (id: string) => api.post(`/admin/hosts/${id}/activate`),
};
