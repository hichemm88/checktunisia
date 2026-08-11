import { api } from '@/lib/api';

export interface PlatformSettings {
  company_name: string | null;
  company_mf: string | null;
  company_rc: string | null;
  company_address: string | null;
  konnect_enabled: boolean;
  konnect_environment: 'sandbox' | 'production' | null;
  /**
   * Aperçu masqué des identifiants enregistrés : extrémités visibles, milieu
   * jamais. `null` signifie réellement « rien d'enregistré » — c'est ce qui
   * distingue un champ vide d'un secret simplement caché. Réservé à l'écran
   * d'administration ; la route publique n'en livre aucun.
   */
  konnect_api_key_hint: string | null;
  konnect_wallet_id_hint: string | null;
  flouci_app_token_hint: string | null;
  flouci_app_secret_hint: string | null;
  /** Canal historique, remplacé par Konnect. */
  flouci_enabled: boolean;
  /**
   * Le règlement en ligne peut-il RÉELLEMENT aboutir ? Calculé par le serveur
   * (drapeau levé ET identifiants complets), sans nommer le prestataire.
   */
  online_payment_enabled: boolean;
  virement_enabled: boolean;
  virement_rib: string | null;
  virement_iban: string | null;
  virement_bank_name: string | null;
  virement_beneficiary: string | null;
  virement_details: string | null;
  tax_rate: string | null;
  timbre_fiscal: string | null;
}

export interface AdminPayment {
  id: string;
  provider: string;
  status: string;
  amount: string;
  currency: string;
  hotel_name: string | null;
  invoice_number: string | null;
  declared_reference: string | null;
  declared_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export const adminPaymentsApi = {
  getSettings: () => api.get<{ data: PlatformSettings }>('/admin/platform-settings').then((r) => r.data.data),
  updateSettings: (data: object) => api.patch<{ data: PlatformSettings }>('/admin/platform-settings', data).then((r) => r.data.data),
  list: (params?: { status?: string; provider?: string; page?: number; per_page?: number }) =>
    api.get<{ data: AdminPayment[]; meta: { total: number; current_page: number; per_page: number } }>('/admin/payments', { params }).then((r) => r.data),
  validateVirement: (paymentId: string) =>
    api.post<{ data: { id: string; status: string } }>(`/admin/payments/${paymentId}/validate-virement`).then((r) => r.data.data),
  rejectVirement: (paymentId: string, reason: string) =>
    api.post<{ data: { id: string; status: string } }>(`/admin/payments/${paymentId}/reject-virement`, { reason }).then((r) => r.data.data),
};
