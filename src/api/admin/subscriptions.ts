import { api } from '@/lib/api';

/** Trilingual text — fr is the required source language, en/ar fall back to fr at render. */
export interface I18nText {
  fr: string;
  en?: string | null;
  ar?: string | null;
}

export interface PlanBullet {
  included: boolean;
  text: I18nText;
}

/** Public display content of a plan (pricing cards) — separate from functional `features`. */
export interface PlanMarketing {
  tier?: I18nText;
  display_name?: I18nText;
  tagline?: I18nText;
  price_note?: I18nText;
  price_note_yearly?: I18nText;
  badge?: I18nText | null;
  featured?: boolean;
  cta_label?: I18nText;
  bullets?: PlanBullet[];
}

export interface AdminPlan {
  id: number;
  name: string;
  slug: string;
  scope: 'hotel' | 'organization';
  min_rooms: number;
  max_rooms: number | null;
  price_monthly: string;
  price_yearly: string | null;
  /** price_yearly if set, else 11 × monthly (one month free) — computed by the backend. */
  effective_price_yearly: string;
  currency: string;
  features: Record<string, number>;
  marketing: PlanMarketing | null;
  is_active: boolean;
  sort_order: number;
}

export interface AdminSubscription {
  id: string;
  hotel_id: string | null;
  organization_id: string | null;
  plan_id: number;
  plan?: AdminPlan;
  custom_price: string | null;
  status: string;
  billing_cycle: string;
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
}

export interface AdminInvoice {
  id: string;
  invoice_number: string;
  amount: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  status: string;
  due_at: string | null;
  paid_at: string | null;
  payment_method: string | null;
}

export interface AdminInvoiceListItem extends AdminInvoice {
  created_at: string;
  organization: { id: string; name: string } | null;
  hotel_name: string | null;
}

export const adminPlansApi = {
  list: () => api.get<{ data: AdminPlan[] }>('/admin/plans').then((r) => r.data.data),
  create: (data: object) => api.post<{ data: AdminPlan }>('/admin/plans', data).then((r) => r.data.data),
  update: (id: number, data: object) => api.patch<{ data: AdminPlan }>(`/admin/plans/${id}`, data).then((r) => r.data.data),
  remove: (id: number) => api.delete(`/admin/plans/${id}`),
};

export const adminSubscriptionsApi = {
  // Hébergeur-scoped (subscriptions/invoices are org-level)
  listForHost: (hostId: string) => api.get<{ data: AdminSubscription[] }>(`/admin/hosts/${hostId}/subscriptions`).then((r) => r.data.data),
  createForHost: (hostId: string, data: object) => api.post<{ data: AdminSubscription }>(`/admin/hosts/${hostId}/subscriptions`, data).then((r) => r.data.data),
  updateForHost: (hostId: string, id: string, data: object) => api.patch<{ data: AdminSubscription }>(`/admin/hosts/${hostId}/subscriptions/${id}`, data).then((r) => r.data.data),
  invoicesForHost: (hostId: string) => api.get<{ data: AdminInvoice[] }>(`/admin/hosts/${hostId}/invoices`).then((r) => r.data.data),
  createInvoiceForHost: (hostId: string, data: object) => api.post<{ data: AdminInvoice }>(`/admin/hosts/${hostId}/invoices`, data).then((r) => r.data.data),
  updateInvoiceForHost: (hostId: string, id: string, data: object) => api.patch<{ data: AdminInvoice }>(`/admin/hosts/${hostId}/invoices/${id}`, data).then((r) => r.data.data),
  deleteInvoiceForHost: (hostId: string, id: string) => api.delete(`/admin/hosts/${hostId}/invoices/${id}`),

  allInvoices: (params?: { status?: string; organization_id?: string; from?: string; to?: string; page?: number; per_page?: number }) =>
    api.get<{ data: AdminInvoiceListItem[]; meta: { total: number; current_page: number; per_page: number } }>('/admin/invoices', { params }).then((r) => r.data),

  downloadInvoicePdf: async (hostId: string, id: string, filename: string) => {
    const res = await api.get(`/admin/hosts/${hostId}/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
