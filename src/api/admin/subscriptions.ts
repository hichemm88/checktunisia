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
  /** Établissements inclus dans le prix de base (grille tarifaire par établissement). */
  included_properties: number;
  /** Prix/mois par établissement supplémentaire (null = pas d'extension, pack plafonné aux inclus). */
  extra_property_price: string | null;
  /** Dépassement : prix par tranche entamée au-delà du quota (null = pas de facturation). */
  overage_price: string | null;
  /** Taille de tranche du dépassement (ex. 50 check-ins). */
  overage_bundle_size: number | null;
  /** Limites/fonctions réellement appliquées par l'app (null ou -1 = illimité). */
  features: {
    max_properties?: number | null;
    max_users?: number | null;
    ocr_scans_per_month?: number | null;
    /** Quota mensuel de check-ins — jamais bloquant. */
    checkins_per_month?: number | null;
    whatsapp_relay?: boolean;
  } | null;
  marketing: PlanMarketing | null;
  is_active: boolean;
  /** Grille publique : false = plan legacy, conservé pour ses abonnés mais non souscriptible. */
  is_public: boolean;
  sort_order: number;
}

/** État du quota de check-ins d'une organisation sur le mois en cours (CheckinQuota::status). */
export interface QuotaStatus {
  quota: number | null;
  used: number;
  remaining: number | null;
  percent: number | null;
  overage_count: number;
  bundle_size: number | null;
  bundle_count: number;
  unit_price: number | null;
  overage_amount: number | null;
  billable: boolean;
  legacy: boolean;
  unlimited: boolean;
}

export interface AdminQuotaRow extends QuotaStatus {
  organization_id: string;
  name: string;
  contact_email: string | null;
  plan: string | null;
  plan_slug: string | null;
  billing_cycle: string | null;
  upsell_flagged_at: string | null;
}

export interface AdminOverageCharge {
  id: number;
  period: string; // YYYY-MM
  organization: { id: string; name: string } | null;
  plan: string | null;
  checkins_count: number;
  quota: number;
  overage_count: number;
  bundle_size: number;
  bundle_count: number;
  unit_price: string;
  amount: string;
  status: 'pending' | 'invoiced' | 'excluded_legacy' | 'waived';
  invoice_number: string | null;
  invoice_status: string | null;
}

export interface AdminSubscription {
  id: string;
  hotel_id: string | null;
  organization_id: string | null;
  plan_id: number;
  plan?: AdminPlan;
  custom_price: string | null;
  /** Grandfathering grille V2 : le compte conserve les conditions de l'ancienne grille. */
  is_legacy_plan?: boolean;
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

/** Pilotage des quotas de check-ins (grille V2) — écran Quotas + export. */
export const adminQuotasApi = {
  list: (filter?: 'warning' | 'overage') =>
    api.get<{ data: AdminQuotaRow[]; meta: { month: string; total: number; warning_count: number; overage_count: number } }>('/admin/quotas', { params: filter ? { filter } : undefined }).then((r) => r.data),
  overages: (params?: { month?: string; status?: string; page?: number; per_page?: number }) =>
    api.get<{ data: AdminOverageCharge[]; meta: { total: number; current_page: number; per_page: number } }>('/admin/quotas/overages', { params }).then((r) => r.data),
  exportCsv: async (month: string) => {
    const res = await api.get('/admin/quotas/export', { params: { month }, responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `depassements-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const adminSubscriptionsApi = {
  // Hébergeur-scoped (subscriptions/invoices are org-level)
  listForHost: (hostId: string) => api.get<{ data: AdminSubscription[] }>(`/admin/hosts/${hostId}/subscriptions`).then((r) => r.data.data),
  createForHost: (hostId: string, data: object) => api.post<{ data: AdminSubscription }>(`/admin/hosts/${hostId}/subscriptions`, data).then((r) => r.data.data),
  updateForHost: (hostId: string, id: string, data: object) => api.patch<{ data: AdminSubscription }>(`/admin/hosts/${hostId}/subscriptions/${id}`, data).then((r) => r.data.data),
  /** Migration MANUELLE d'un compte legacy vers la grille V2 (action explicite, jamais automatique). */
  migrateToV2: (hostId: string, id: string, planId: number) =>
    api.post<{ data: AdminSubscription }>(`/admin/hosts/${hostId}/subscriptions/${id}/migrate-to-v2`, { plan_id: planId }).then((r) => r.data.data),
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
