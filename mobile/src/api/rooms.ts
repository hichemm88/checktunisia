import { api } from '@/lib/api';
import type { Room, ApiList } from '@/types';

export const roomsApi = {
  /** Rooms of the active property (X-Property-Id) — feeds the check-in room picker. */
  list: (params?: Record<string, string>) =>
    api.get<ApiList<Room>>('/hotel/rooms', { params }).then((r) => r.data),
};
