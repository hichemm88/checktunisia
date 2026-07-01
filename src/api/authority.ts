import { api } from '@/lib/api';
import { AuthorityGuest, AuthorityGuestProfile, AuthorityHotel, ApiList } from '@/types';

export interface SearchParams {
  first_name?: string; last_name?: string; document_number?: string;
  nationality_code?: string; date_of_birth?: string;
  check_in_from?: string; check_in_to?: string; hotel_governorate?: string;
  page?: number; per_page?: number;
}

export const authorityApi = {
  // Guest search — backend: GET /authority/search
  search: (params: SearchParams) =>
    api.get<ApiList<AuthorityGuest>>('/authority/search', { params }).then((r) => r.data),

  // Guest profile — backend: GET /authority/guests/{id}
  getProfile: (guestId: string) =>
    api.get<{ data: AuthorityGuestProfile }>(`/authority/guests/${guestId}`)
      .then((r) => r.data.data),

  // Hotels list — backend: GET /authority/hotels
  getHotels: (params?: { search?: string; governorate?: string; page?: number }) =>
    api.get<ApiList<AuthorityHotel>>('/authority/hotels', { params }).then((r) => r.data),

  // Hotel detail — backend: GET /authority/hotels/{id}
  getHotel: (hotelId: string) =>
    api.get<{ data: AuthorityHotel }>(`/authority/hotels/${hotelId}`).then((r) => r.data.data),
};
