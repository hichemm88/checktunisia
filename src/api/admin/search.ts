import { api } from '@/lib/api';

export interface GlobalSearchResult { id: string; label: string; type: 'organization' | 'hotel' | 'user' | 'check_in' }
export interface GlobalSearchResponse { organizations: GlobalSearchResult[]; hotels: GlobalSearchResult[]; users: GlobalSearchResult[]; check_ins: GlobalSearchResult[] }

export const adminSearchApi = {
  search: (q: string) => api.get<{ data: GlobalSearchResponse }>('/admin/search', { params: { q } }).then((r) => r.data.data),
};
