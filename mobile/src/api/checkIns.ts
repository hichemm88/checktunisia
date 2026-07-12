import { api } from '@/lib/api';
import type { CheckIn, Guest, ApiList, ApiItem } from '@/types';

export interface CreateCheckInPayload {
  room_id?: string;
  booking_reference?: string;
  booking_source?: string;
  check_in_date: string;
  expected_check_out_date: string;
  adults_count?: number;
  children_count?: number;
  notes?: string;
}

/** Flat guest payload from the form; document fields are nested before the API call. */
export interface AddGuestPayload {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: 'M' | 'F' | 'X';
  nationality_code: string;
  is_primary?: boolean;
  document_type?: string;
  document_number?: string;
  issuing_country_code?: string;
  issue_date?: string;
  expiry_date?: string;
}

export const checkInsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<ApiList<CheckIn>>('/hotel/check-ins', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<ApiItem<CheckIn>>(`/hotel/check-ins/${id}`).then((r) => r.data.data),

  create: (payload: CreateCheckInPayload) =>
    api.post<ApiItem<CheckIn>>('/hotel/check-ins', payload).then((r) => r.data.data),

  update: (id: string, payload: Partial<CreateCheckInPayload>) =>
    api.patch<ApiItem<CheckIn>>(`/hotel/check-ins/${id}`, payload).then((r) => r.data.data),

  complete: (id: string) =>
    api.post<ApiItem<CheckIn>>(`/hotel/check-ins/${id}/complete`).then((r) => r.data.data),

  checkout: (id: string, actual_check_out_date: string) =>
    api
      .post<ApiItem<CheckIn>>(`/hotel/check-ins/${id}/checkout`, { actual_check_out_date })
      .then((r) => r.data.data),

  // Nest document fields under `document` — exact contract used by the web app.
  addGuest: (checkInId: string, payload: AddGuestPayload) => {
    const {
      document_type,
      document_number,
      issuing_country_code,
      issue_date,
      expiry_date,
      ...guestData
    } = payload;
    const body = {
      ...guestData,
      document: {
        type: document_type || 'passport',
        document_number: document_number || '',
        issuing_country_code: issuing_country_code || '',
        issue_date,
        expiry_date,
      },
    };
    return api
      .post<ApiItem<Guest>>(`/hotel/check-ins/${checkInId}/guests`, body)
      .then((r) => r.data.data);
  },

  removeGuest: (checkInId: string, guestId: string) =>
    api.delete(`/hotel/check-ins/${checkInId}/guests/${guestId}`),

  // Admin-only — any status, soft-deleted (recoverable) server-side. Same contract as the web.
  deleteCheckIn: (id: string) => api.delete(`/hotel/check-ins/${id}`),
};
