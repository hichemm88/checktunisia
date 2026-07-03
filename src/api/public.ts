import axios from 'axios';

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
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  min_rooms: number;
  max_rooms: number | null;
  price_monthly: string;
  price_yearly: string | null;
  features: { max_users: number; ocr_scans_per_month: number };
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
  publicApi.get<{ data: SubscriptionPlan[] }>('/subscriptions/plans').then((r) => r.data.data);
