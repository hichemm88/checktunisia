import { api } from '@/lib/api';
import type { CheckIn, ApiList, ApiItem } from '@/types';

export const checkInsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<ApiList<CheckIn>>('/hotel/check-ins', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<ApiItem<CheckIn>>(`/hotel/check-ins/${id}`).then((r) => r.data.data),

  complete: (id: string) =>
    api.post<ApiItem<CheckIn>>(`/hotel/check-ins/${id}/complete`).then((r) => r.data.data),

  checkout: (id: string, actual_check_out_date: string) =>
    api
      .post<ApiItem<CheckIn>>(`/hotel/check-ins/${id}/checkout`, { actual_check_out_date })
      .then((r) => r.data.data),
};
