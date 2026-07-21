import { api } from '@/lib/api';
import {
  type AuthorityGuest, type AuthorityGuestProfile, type AuthorityHotel, type AuthorityCheckIn,
  type AuthorityDashboard, type AuthorityAlert, type AuthorityActivity, type AuthorityRecentCheckIn,
  type WatchlistEntry, type WatchlistImportResult,
  type ApiList,
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

  // ── Recent check-ins (one row per traveler) ──────────────────────────────
  getRecentCheckIns: (params?: { page?: number; per_page?: number }) =>
    api.get<ApiList<AuthorityRecentCheckIn>>('/authority/recent-check-ins', { params }).then((r) => r.data),

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

  // ── Hotel check-ins (ministry view) ──────────────────────────────────────
  getHotelCheckIns: (hotelId: string, params?: { search?: string; status?: string; page?: number }) =>
    api.get<ApiList<AuthorityCheckIn>>(`/authority/hotels/${hotelId}/check-ins`, { params }).then((r) => r.data),

  // ── Watchlist ─────────────────────────────────────────────────────────────
  getWatchlist: (params?: { severity?: string; status?: string; search?: string; page?: number }) =>
    api.get<ApiList<WatchlistEntry>>('/authority/watchlist', { params }).then((r) => r.data),

  addWatchlistEntry: (data: Partial<WatchlistEntry> & { severity: string; reason_code: string }) =>
    api.post<{ data: WatchlistEntry }>('/authority/watchlist', data).then((r) => r.data.data),

  updateWatchlistEntry: (id: string, data: Partial<WatchlistEntry>) =>
    api.patch<{ data: WatchlistEntry }>(`/authority/watchlist/${id}`, data).then((r) => r.data.data),

  deleteWatchlistEntry: (id: string) =>
    api.delete(`/authority/watchlist/${id}`),

  importWatchlist: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ data: WatchlistImportResult }>('/authority/watchlist/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data);
  },

  downloadTemplate: () =>
    api.get('/authority/watchlist/template', { responseType: 'blob' }),
};
