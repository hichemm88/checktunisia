import { api } from '@/lib/api';
import { type HotelUser, type CreateUserPayload, type UpdateProfilePayload, type ChangePasswordPayload, type HotelProfile, type UpdateHotelPayload, type ActivityLogEntry } from '@/types';

export const settingsApi = {
  // Profile
  updateProfile: (payload: UpdateProfilePayload) =>
    api.patch<{ data: { first_name: string; last_name: string; email: string } }>('/profile', payload)
      .then((r) => r.data.data),

  changePassword: (payload: ChangePasswordPayload) =>
    api.post('/profile/password', payload),

  // Hotel users (hotel_admin only)
  getUsers: () =>
    api.get<{ data: HotelUser[] }>('/hotel/users').then((r) => r.data.data),

  createUser: (payload: CreateUserPayload) =>
    api.post<{ data: HotelUser }>('/hotel/users', payload).then((r) => r.data.data),

  updateUser: (id: string, payload: Partial<CreateUserPayload & { is_active: boolean }>) =>
    api.patch<{ data: HotelUser }>(`/hotel/users/${id}`, payload).then((r) => r.data.data),

  deleteUser: (id: string) =>
    api.delete(`/hotel/users/${id}`),

  resendInvite: (id: string) =>
    api.post<{ data: { id: string; email_sent: boolean } }>(`/hotel/users/${id}/resend-invite`).then((r) => r.data.data),

  // Subscription info — backend returns plan as nested SubscriptionPlan object
  getSubscription: () =>
    api.get<{ data: {
      status: string;
      plan: { name: string } | string | null;
      billing_cycle?: 'monthly' | 'yearly';
      expires_at: string;
      days_remaining: number;
      /** Détail du prix : base + suppléments par établissement (formule unique serveur). */
      pricing?: {
        base: number; included_properties: number; property_count: number;
        extra_count: number; extra_property_price: number | null;
        extra_total: number; monthly_total: number; cycle_total: number; negotiated: boolean;
      } | null;
    } }>('/hotel/subscription')
      .then((r) => r.data.data),

  // Hotel profile (hotel_admin only)
  getHotelProfile: () =>
    api.get<{ data: HotelProfile }>('/hotel/profile').then((r) => r.data.data),

  updateHotelProfile: (payload: UpdateHotelPayload) =>
    api.patch<{ data: HotelProfile }>('/hotel/profile', payload).then((r) => r.data.data),

  // Staff activity feed (hotel_admin only)
  getActivity: (params: { page?: number; role?: string }) =>
    api.get<{ data: ActivityLogEntry[]; meta: { total: number; current_page: number; last_page: number } }>('/hotel/activity', { params })
      .then((r) => r.data),

  // Invoices (hotel_admin only) — org-scoped, reachable before any property exists
  getInvoices: (params?: { page?: number; per_page?: number }) =>
    api.get<{ data: HotelInvoice[]; meta: { total: number; current_page: number; per_page: number } }>('/hotel/invoices', { params })
      .then((r) => r.data),

  downloadInvoicePdf: async (id: string, filename: string) => {
    const res = await api.get(`/hotel/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  declareVirement: (payload: { invoice_id: string; reference: string; date: string }) =>
    api.post<{ data: { id: string; status: string } }>('/hotel/payments/declare-virement', payload).then((r) => r.data.data),
};

export interface HotelInvoice {
  id: string;
  invoice_number: string;
  amount: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  status: string;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
}
