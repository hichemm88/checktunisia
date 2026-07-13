import { api } from '@/lib/api';
import { Room, ApiList, ApiItem } from '@/types';

export interface RoomAvailability extends Room {
  /** free = selectable · occupied = stay overlaps the requested nights · unavailable = maintenance/inactive */
  state: 'free' | 'occupied' | 'unavailable';
  /** Active stay leaves exactly on the arrival date — available, but shown with the amber "to verify" dot. */
  departing_same_day: boolean;
  conflict: { reference: string; guest_name: string | null; check_in_date: string; departure_date: string } | null;
}

export const roomsApi = {
  list: (params?: Record<string, string>) =>
    api.get<ApiList<Room>>('/hotel/rooms', { params }).then((r) => r.data),

  availability: (from: string, to: string) =>
    api.get<ApiList<RoomAvailability>>('/hotel/rooms/availability', { params: { from, to } }).then((r) => r.data.data),

  create: (payload: Omit<Room, 'id'>) =>
    api.post<ApiItem<Room>>('/hotel/rooms', payload).then((r) => r.data.data),

  update: (id: string, payload: Partial<Room>) =>
    api.put<ApiItem<Room>>(`/hotel/rooms/${id}`, payload).then((r) => r.data.data),

  delete: (id: string) => api.delete(`/hotel/rooms/${id}`),
};
