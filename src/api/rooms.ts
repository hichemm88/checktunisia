import { api } from '@/lib/api';
import { Room, ApiList, ApiItem } from '@/types';

export const roomsApi = {
  list: (params?: Record<string, string>) =>
    api.get<ApiList<Room>>('/hotel/rooms', { params }).then((r) => r.data),

  create: (payload: Omit<Room, 'id'>) =>
    api.post<ApiItem<Room>>('/hotel/rooms', payload).then((r) => r.data.data),

  update: (id: string, payload: Partial<Room>) =>
    api.put<ApiItem<Room>>(`/hotel/rooms/${id}`, payload).then((r) => r.data.data),

  delete: (id: string) => api.delete(`/hotel/rooms/${id}`),
};
