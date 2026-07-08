import axios from 'axios';
import type { PlanMarketing } from '@/api/admin/subscriptions';

const BASE = import.meta.env.VITE_API_URL ?? 'https://checktunisia-backend-production.up.railway.app/api/v1';

const publicApi = axios.create({ baseURL: BASE });

export interface RegisterPayload {
  // Organization
  entity_type: 'company' | 'individual';
  org_name: string;
  org_registration_number?: string;
  org_phone?: string;

  // Admin account
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;

  // Subscription
  plan_slug: string;
  billing_cycle?: 'monthly' | 'yearly';
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  scope: 'hotel' | 'organization';
  min_rooms: number;
  max_rooms: number | null;
  price_monthly: string;
  price_yearly: string | null;
  /** price_yearly if set, else 11 × monthly (one month free) — computed by the backend. */
  effective_price_yearly: string;
  features: { max_users: number; ocr_scans_per_month: number };
  marketing: PlanMarketing | null;
}

export const registerOrganization = (payload: RegisterPayload) =>
  publicApi.post<{
    data: {
      organization: { id: string; name: string };
      user: { id: string; email: string; name: string };
      trial_ends_at: string;
      plan: string;
    };
    message: string;
  }>('/public/register', payload).then((r) => r.data);

export const registerHotel = registerOrganization;

export const fetchPlans = () =>
  publicApi.get<{ data: SubscriptionPlan[] }>('/public/plans').then((r) => r.data.data);

export interface PlatformSettings {
  company_name:         string | null;
  company_mf:           string | null;
  company_rc:           string | null;
  company_address:      string | null;
  flouci_enabled:       boolean;
  virement_enabled:     boolean;
  virement_rib:         string | null;
  virement_iban:        string | null;
  virement_bank_name:   string | null;
  virement_beneficiary: string | null;
  virement_details:     string | null;
}

export const fetchPlatformSettings = () =>
  publicApi.get<{ data: PlatformSettings }>('/public/settings').then((r) => r.data.data);
