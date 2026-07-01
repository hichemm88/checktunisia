import { api } from '@/lib/api';
import { AuthorityGuest, AuthorityGuestProfile, ApiList } from '@/types';

export interface SearchParams {
  first_name?: string; last_name?: string; document_number?: string;
  nationality_code?: string; date_of_birth?: string;
  check_in_from?: string; check_in_to?: string; hotel_governorate?: string;
  page?: number; per_page?: number;
}

export const authorityApi = {
  search: (params: SearchParams) =>
    api.get<ApiList<AuthorityGuest>>('/authority/guests/search', { params }).then((r) => r.data),

  getProfile: (guestId: string) =>
    api.get<{ data: AuthorityGuestProfile }>(`/authority/guests/${guestId}/profile`)
      .then((r) => r.data.data),
};
