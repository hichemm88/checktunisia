import { api } from '@/lib/api';

export interface AdminPlan {
  id: number;
  name: string;
  slug: string;
  min_rooms: number;
  max_rooms: number | null;
  price_monthly: string;
  price_yearly: string | null;
  currency: string;
  features: Record<string, number>;
  is_active: boolean;
  sort_order: number;
}

export interface AdminSubscription {
  id: string;
  hotel_id: string | null;
  organization_id: string | null;
  plan_id: number;
  plan?: AdminPlan;
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

export const adminPlansApi = {
  list: () => api.get<{ data: AdminPlan[] }>('/admin/plans').then((r) => r.data.data),
  create: (data: object) => api.post<{ data: AdminPlan }>('/admin/plans', data).then((r) => r.data.data),
  update: (id: number, data: object) => api.patch<{ data: AdminPlan }>(`/admin/plans/${id}`, data).then((r) => r.data.data),
  remove: (id: number) => api.delete(`/admin/plans/${id}`),
};

export const adminSubscriptionsApi = {
  list: (hotelId: string) => api.get<{ data: AdminSubscription[] }>(`/admin/hotels/${hotelId}/subscriptions`).then((r) => r.data.data),
  create: (hotelId: string, data: object) => api.post(`/admin/hotels/${hotelId}/subscriptions`, data).then((r) => r.data.data),
  update: (hotelId: string, id: string, data: object) => api.patch(`/admin/hotels/${hotelId}/subscriptions/${id}`, data).then((r) => r.data.data),
  invoices: (hotelId: string) => api.get<{ data: AdminInvoice[] }>(`/admin/hotels/${hotelId}/invoices`).then((r) => r.data.data),
  createInvoice: (hotelId: string, data: object) => api.post(`/admin/hotels/${hotelId}/invoices`, data).then((r) => r.data.data),
  updateInvoice: (hotelId: string, id: string, data: object) => api.patch(`/admin/hotels/${hotelId}/invoices/${id}`, data).then((r) => r.data.data),
};
