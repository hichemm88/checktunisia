import { api } from '@/lib/api';
import {
  AuthorityGuest, AuthorityGuestProfile, AuthorityHotel,
  AuthorityDashboard, AuthorityAlert, AuthorityActivity,
  ApiList,
} from '@/types';

export interface SearchParams {
  first_name?: string; last_name?: string; document_number?: string;
  nationality_code?: string; date_of_birth?: string;
  check_in_from?: string; check_in_to?: string; hotel_governorate?: string;
  page?: number; per_page?: number;
}

export interface ActivityParams {
  page?: number; per_page?: number; from?: string; to?: string;
}

export const authorityApi = {
  // ── Dashboard ─────────────────────────────────────────────────────────────
  getDashboard: () =>
    api.get<{ data: AuthorityDashboard }>('/authority/dashboard').then((r) => r.data.data),

  // ── Alerts (expiring documents) ──────────────────────────────────────────
  getAlerts: () =>
    api.get<{ data: AuthorityAlert[]; meta: { governorate: string | null; is_national: boolean } }>(
      '/authority/alerts'
    ).then((r) => r.data),

  // ── Activity log ──────────────────────────────────────────────────────────
  getActivity: (params?: ActivityParams) =>
    api.get<ApiList<AuthorityActivity> & { meta: { is_national: boolean } }>(
      '/authority/activity', { params }
    ).then((r) => r.data),

  // ── Guest search ──────────────────────────────────────────────────────────
  search: (params: SearchParams) =>
    api.get<ApiList<AuthorityGuest>>('/authority/search', { params }).then((r) => r.data),

  // ── Guest profile ─────────────────────────────────────────────────────────
  getProfile: (guestId: string) =>
    api.get<{ data: AuthorityGuestProfile }>(`/authority/guests/${guestId}`)
      .then((r) => r.data.data),

  // ── Hotels list ───────────────────────────────────────────────────────────
  getHotels: (params?: { search?: string; governorate?: string; page?: number }) =>
    api.get<ApiList<AuthorityHotel>>('/authority/hotels', { params }).then((r) => r.data),

  // ── Hotel detail ──────────────────────────────────────────────────────────
  getHotel: (hotelId: string) =>
    api.get<{ data: AuthorityHotel }>(`/authority/hotels/${hotelId}`).then((r) => r.data.data),
};
