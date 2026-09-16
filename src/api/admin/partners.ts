import { api } from '@/lib/api';

export interface AdminPartner {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  establishment_links_count: number;
  fiche_sessions_count: number;
  created_at: string;
}

export interface AdminPartnerKey {
  id: string;
  mode: 'live' | 'test';
  prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface AdminPartnerDetail extends Omit<AdminPartner, 'establishment_links_count' | 'fiche_sessions_count'> {
  allowed_widget_origins: string[];
  keys: AdminPartnerKey[];
}

export interface AdminPartnerLink {
  id: string;
  hotel_id: string;
  hotel_name: string;
  linked_at: string;
  revoked_at: string | null;
}

export interface AdminPartnerMetrics {
  sessions_created: number;
  fiches_submitted: number;
  completion_rate: number | null;
  webhook_errors: number;
}

export interface AdminWebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  consecutive_failures: number;
  created_at: string;
}

export interface AdminWebhookDelivery {
  id: number;
  event_type: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  last_response_status: number | null;
  last_error: string | null;
  queued_at: string;
  sent_at: string | null;
  payload: Record<string, unknown>;
}

export const adminPartnersApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<{ data: AdminPartner[]; meta: { total: number; current_page: number; per_page: number } }>('/admin/partners', { params }).then((r) => r.data),

  show: (id: string) => api.get<{ data: AdminPartnerDetail }>(`/admin/partners/${id}`).then((r) => r.data.data),

  create: (data: { name: string; allowed_widget_origins?: string[] }) =>
    api.post<{ data: AdminPartnerDetail }>('/admin/partners', data).then((r) => r.data.data),

  update: (id: string, data: Partial<{ name: string; status: string; allowed_widget_origins: string[] }>) =>
    api.patch<{ data: AdminPartnerDetail }>(`/admin/partners/${id}`, data).then((r) => r.data.data),

  issueKey: (id: string, mode: 'live' | 'test') =>
    api.post<{ data: AdminPartnerKey & { plaintext: string } }>(`/admin/partners/${id}/keys`, { mode }).then((r) => r.data.data),

  revokeKey: (id: string, keyId: string) => api.post(`/admin/partners/${id}/keys/${keyId}/revoke`),

  links: (id: string) => api.get<{ data: AdminPartnerLink[] }>(`/admin/partners/${id}/links`).then((r) => r.data.data),

  revokeLink: (id: string, linkId: string) => api.post(`/admin/partners/${id}/links/${linkId}/revoke`),

  metrics: (id: string) => api.get<{ data: AdminPartnerMetrics }>(`/admin/partners/${id}/metrics`).then((r) => r.data.data),

  webhooks: (id: string) => api.get<{ data: AdminWebhookEndpoint[] }>(`/admin/partners/${id}/webhooks`).then((r) => r.data.data),

  createWebhook: (id: string, data: { url: string; events?: string[] }) =>
    api.post<{ data: AdminWebhookEndpoint & { secret: string } }>(`/admin/partners/${id}/webhooks`, data).then((r) => r.data.data),

  updateWebhook: (id: string, endpointId: string, data: Partial<{ url: string; events: string[]; active: boolean }>) =>
    api.patch<{ data: AdminWebhookEndpoint }>(`/admin/partners/${id}/webhooks/${endpointId}`, data).then((r) => r.data.data),

  deleteWebhook: (id: string, endpointId: string) => api.delete(`/admin/partners/${id}/webhooks/${endpointId}`),

  deliveries: (id: string, endpointId: string, params?: Record<string, string | number>) =>
    api.get<{ data: AdminWebhookDelivery[]; meta: { total: number; current_page: number } }>(
      `/admin/partners/${id}/webhooks/${endpointId}/deliveries`, { params },
    ).then((r) => r.data),

  redrive: (id: string, endpointId: string, deliveryId: number) =>
    api.post(`/admin/partners/${id}/webhooks/${endpointId}/deliveries/${deliveryId}/redrive`),
};
