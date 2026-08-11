import { api } from '@/lib/api';
import { type HotelUser, type CreateUserPayload, type UpdateProfilePayload, type ChangePasswordPayload, type HotelProfile, type UpdateHotelPayload, type ActivityLogEntry } from '@/types';

export interface WhatsappRecipientOption {
  id: number;
  name: string;
  organization: string | null;
  rank: string | null;
  number_masked: string;
  selected: boolean;
}

export const settingsApi = {
  // Profile
  updateProfile: (payload: UpdateProfilePayload) =>
    api.patch<{ data: { first_name: string; last_name: string; email: string } }>('/profile', payload)
      .then((r) => r.data.data),

  changePassword: (payload: ChangePasswordPayload) =>
    api.post('/profile/password', payload),

  // Hotel users (hotel_admin only)
  getUsers: () =>
    api.get<{ data: HotelUser[] }>('/hotel/users').then((r) => r.data.data),

  createUser: (payload: CreateUserPayload) =>
    api.post<{ data: HotelUser }>('/hotel/users', payload).then((r) => r.data.data),

  updateUser: (id: string, payload: Partial<CreateUserPayload & { is_active: boolean }>) =>
    api.patch<{ data: HotelUser }>(`/hotel/users/${id}`, payload).then((r) => r.data.data),

  deleteUser: (id: string) =>
    api.delete(`/hotel/users/${id}`),

  resendInvite: (id: string) =>
    api.post<{ data: { id: string; email_sent: boolean } }>(`/hotel/users/${id}/resend-invite`).then((r) => r.data.data),

  // Transfert d'ownership (owner uniquement) — confirmation forte par mot de passe.
  transferOwnership: (payload: { user_id: string; password: string }) =>
    api.post<{ data: { previous_owner: { id: string }; new_owner: { id: string } } }>(
      '/hotel/organization/transfer-ownership', payload,
    ).then((r) => r.data.data),

  // Destinataires WhatsApp des fiches (hotel_admin) — voir/cocher les agents.
  getWhatsappRecipients: () =>
    api.get<{ data: WhatsappRecipientOption[] }>('/hotel/whatsapp-recipients').then((r) => r.data.data),

  setWhatsappRecipients: (recipient_ids: number[]) =>
    api.put<{ data: { count: number } }>('/hotel/whatsapp-recipients', { recipient_ids }).then((r) => r.data.data),

  // Subscription info — backend returns plan as nested SubscriptionPlan object
  getSubscription: () =>
    api.get<{ data: {
      status: string;
      plan: { id?: number; name: string; slug?: string } | string | null;
      billing_cycle?: 'monthly' | 'yearly';
      expires_at: string;
      days_remaining: number;
      /** Reconduction : Qayed émettra la facture à l'échéance (pas un prélèvement). */
      auto_renew?: boolean;
      /** Détail du prix : base + suppléments par établissement (formule unique serveur). */
      pricing?: {
        base: number; included_properties: number; property_count: number;
        extra_count: number; extra_property_price: number | null;
        extra_total: number; monthly_total: number; cycle_total: number; negotiated: boolean;
      } | null;
      /**
       * Quota mensuel de check-ins — TOUS les montants viennent du backend
       * (CheckinQuota::status). Le front n'en recalcule aucun : il affiche.
       * null/unlimited = pas de carte de consommation.
       */
      quota?: {
        period: string; quota: number | null; used: number; cancelled: number;
        remaining: number | null; percent: number | null;
        overage_count: number; bundle_size: number | null; bundle_count: number;
        unit_price: number | null; overage_amount: number | null;
        monthly_base: number | null; estimated_total: number | null;
        billable: boolean; legacy: boolean; unlimited: boolean;
      } | null;
      /** Grandfathering : le compte conserve les conditions de l'ancienne grille. */
      is_legacy_plan?: boolean;
      /** Conditions négociées que le client perdrait en changeant de plan. */
      historic_conditions?: {
        checkins_per_month?: number | null; checkins_label?: string;
        custom_price?: number; legacy_plan?: boolean;
      } | null;
      /**
       * Échéance dépassée, recouvrement en cours : le service continue
       * jusqu'à `ends_at` (terme des relances), puis l'abonnement est
       * suspendu. Le statut reste « actif » pendant cette période — sans ce
       * bloc, le client lirait « actif » avec une date d'échéance passée et
       * n'aurait aucun moyen de savoir quand il sera réellement coupé.
       *
       * Calculé par le backend : le front ne dérive aucune date de coupure.
       */
      grace?: { active: boolean; ends_at: string | null; days_left: number | null };
      /** Résiliation programmée : le service court jusqu'à `ends_at`. */
      cancellation?: { requested_at: string | null; scheduled: boolean; ends_at: string | null };
      /** Changement de plan en cours (attente de paiement, ou programmé). */
      pending_change?: import('./subscription').PendingPlanChange | null;
      /**
       * Prochaine échéance, chiffrée par le backend.
       *
       * `auto_invoiced` dit ce que Qayed fait réellement : émettre la
       * facture et prévenir. La passerelle en ligne (Konnect) ne permet aucun
       * prélèvement récurrent — l'interface ne doit jamais laisser croire le
       * contraire.
       */
      next_renewal?: {
        due_at: string | null; amount: number; billing_cycle: 'monthly' | 'yearly';
        plan_name: string | null; auto_invoiced: boolean; invoice_lead_days: number;
      } | null;
      /**
       * La période en cours reste-t-elle à régler (essai, expiré, suspendu) ?
       * Tranché par le backend — le front ne rejoue pas la liste des statuts,
       * elle finirait par diverger.
       */
      awaiting_payment?: boolean;
      /**
       * Compte interne : utilise Qayed sans facturation commerciale. L'écran
       * masque alors tout ce qui relève du commerce (prix à payer, factures à
       * régler, changement de plan, dépassement facturable) et ne garde que
       * l'opérationnel. Ce n'est ni un rôle ni un privilège.
       */
      is_internal?: boolean;
      billing_mode?: 'commercial' | 'internal';
    } }>('/hotel/subscription')
      .then((r) => r.data.data),

  /** Grille V2 : demande d'upgrade vers un plan supérieur — notifie l'admin (effet au cycle suivant). */
  requestUpgrade: (plan_slug: string, message?: string) =>
    api.post<{ data: { status: string; target_plan: { id: number; name: string; slug: string; price_monthly: string } } }>(
      '/hotel/subscription/upgrade-request', { plan_slug, message },
    ).then((r) => r.data.data),

  // Hotel profile (hotel_admin only)
  getHotelProfile: () =>
    api.get<{ data: HotelProfile }>('/hotel/profile').then((r) => r.data.data),

  updateHotelProfile: (payload: UpdateHotelPayload) =>
    api.patch<{ data: HotelProfile }>('/hotel/profile', payload).then((r) => r.data.data),

  // Staff activity feed (hotel_admin only)
  getActivity: (params: { page?: number; role?: string }) =>
    api.get<{ data: ActivityLogEntry[]; meta: { total: number; current_page: number; last_page: number } }>('/hotel/activity', { params })
      .then((r) => r.data),

  // Invoices (hotel_admin only) — org-scoped, reachable before any property exists
  getInvoices: (params?: { page?: number; per_page?: number }) =>
    api.get<{ data: HotelInvoice[]; meta: { total: number; current_page: number; per_page: number } }>('/hotel/invoices', { params })
      .then((r) => r.data),

  downloadInvoicePdf: async (id: string, filename: string) => {
    const res = await api.get(`/hotel/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  declareVirement: (payload: { invoice_id: string; reference: string; date: string }) =>
    api.post<{ data: { id: string; status: string } }>('/hotel/payments/declare-virement', payload).then((r) => r.data.data),
};

export interface HotelInvoice {
  id: string;
  invoice_number: string;
  amount: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  status: string;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
}
