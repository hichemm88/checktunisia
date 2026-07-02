import { api } from '@/lib/api';

export interface WatchlistHitItem {
  id: string;
  check_in_reference: string | null;
  check_in_date:      string | null;
  room_number:        string | null;
  notified_at:        string | null;
}

export const hotelApi = {
  getWatchlistHits: () =>
    api.get<{ data: WatchlistHitItem[]; meta: { total: number } }>('/hotel/watchlist-hits')
       .then((r) => r.data),

  acknowledgeHit: (id: string) =>
    api.post<{ data: { acknowledged_at: string } }>(`/hotel/watchlist-hits/${id}/acknowledge`)
       .then((r) => r.data.data),
};
