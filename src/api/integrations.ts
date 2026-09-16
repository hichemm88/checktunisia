import { api } from '@/lib/api';

export interface EstablishmentIntegration {
  id: string;
  hotel_id: string;
  hotel_name: string;
  partner_name: string;
  linked_at: string;
  revoked_at: string | null;
  active: boolean;
}

export const integrationsApi = {
  list: () => api.get<{ data: EstablishmentIntegration[] }>('/hotel/integrations').then((r) => r.data.data),

  generateLinkCode: (hotelId: string) =>
    api.post<{ data: { code: string; expires_at: string } }>('/hotel/integrations/link-codes', { hotel_id: hotelId })
      .then((r) => r.data.data),

  revoke: (linkId: string) => api.delete(`/hotel/integrations/${linkId}`),
};
