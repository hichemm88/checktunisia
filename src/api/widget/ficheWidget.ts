import axios from 'axios';

/**
 * Instance axios DÉDIÉE au widget embarqué — jamais l'instance partagée
 * `lib/api.ts` (qui injecte un Bearer Sanctum + X-Property-Id et redirige
 * globalement sur 401, deux comportements incompatibles avec un contexte
 * anonyme/iframe authentifié par jeton opaque).
 */
const widgetApi = axios.create({
  baseURL: import.meta.env.VITE_WIDGET_API_URL ?? '/widget/v1',
  headers: { Accept: 'application/json' },
  timeout: 20_000,
});

let widgetToken: string | null = null;
export const setWidgetToken = (token: string) => { widgetToken = token; };

widgetApi.interceptors.request.use((config) => {
  if (widgetToken) config.headers.Authorization = `Bearer ${widgetToken}`;
  return config;
});

export interface BootstrapResponse {
  session_id: string;
  widget_token: string;
  mode: 'create' | 'amend';
  establishment_name: string;
  booking_ref: string;
  arrival_date: string | null;
  departure_date: string | null;
  room: string | null;
  prefill_guests: Array<{
    first_name?: string;
    last_name?: string;
    nationality?: string;
    id_document_number?: string;
    id_document_type?: string;
  }>;
  existing_guests: Array<{
    id: string;
    first_name: string;
    last_name: string;
    nationality_code: string;
    is_primary: boolean;
  }>;
}

export interface GuestDocument {
  type: string;
  document_number: string;
  issuing_country_code: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  mrz_line1?: string | null;
  mrz_line2?: string | null;
}

export interface GuestInput {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: 'M' | 'F' | 'X';
  nationality_code: string;
  country_of_birth?: string | null;
  place_of_birth?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary?: boolean;
  scan_id?: string | null;
  document: GuestDocument;
}

export interface ApiErrorPayload {
  error: { code: string; message: string; doc_url: string };
}

export const ficheWidgetApi = {
  bootstrap: (token: string) =>
    widgetApi.get<BootstrapResponse>(`/bootstrap?token=${encodeURIComponent(token)}`).then((r) => r.data),

  addGuest: (data: GuestInput) =>
    widgetApi.post<{ data: { id: string; first_name: string; last_name: string; nationality_code: string } }>('/guests', data)
      .then((r) => r.data.data),

  removeGuest: (guestId: string) => widgetApi.delete(`/guests/${guestId}`),

  uploadScan: (file: Blob) => {
    const form = new FormData();
    form.append('passport_image', file, 'document.jpg');
    return widgetApi
      .post<{ data: { scan_id: string; status: string } }>('/scan', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data);
  },

  scanStatus: (scanId: string) =>
    widgetApi.get<{ data: { scan_id: string; status: string; confidence?: number; extracted?: Record<string, unknown>; error?: string } }>(
      `/scan/${scanId}/status`,
    ).then((r) => r.data.data),

  submit: () =>
    widgetApi.post<{ session_id: string; fiche_id: string; guest_count: number }>('/submit').then((r) => r.data),
};

export const extractWidgetError = (err: unknown): { code: string; message: string } => {
  if (axios.isAxiosError(err) && err.response?.data?.error) {
    const e = (err.response.data as ApiErrorPayload).error;
    return { code: e.code, message: e.message };
  }
  return { code: 'unknown', message: 'Une erreur inattendue est survenue.' };
};
