import { api } from '@/lib/api';

export interface AdminDashboardStats {
  hotels: { total: number; active: number; suspended: number; pending: number };
  check_ins: { today: number; this_month: number };
  trials: {
    in_progress: number;
    expiring_soon: { id: string; name: string; expires_at: string }[];
    conversion_rate: number | null;
  };
  alerts: {
    expiring_subscriptions: { id: string; name: string; plan: string | null; expires_at: string }[];
    failed_payments: { id: string; hotel_name: string | null; amount: string; created_at: string }[];
    recently_suspended: { id: string; name: string; updated_at: string }[];
    pending_virements: {
      id: string;
      name: string;
      invoice_number: string | null;
      amount: string;
      reference: string | null;
      declared_at: string | null;
    }[];
  };
  mrr: string;
  mrr_breakdown: {
    customer: string;
    plan: string;
    billing_cycle: 'monthly' | 'yearly';
    negotiated: boolean;
    monthly_value: number;
  }[];
  check_ins_chart: { date: string; count: number }[];
  top_hotels: { id: string; name: string; check_ins_count: number }[];
  recent_signups: { id: string; name: string; created_at: string }[];
}

export const adminDashboardApi = {
  stats: () => api.get<{ data: AdminDashboardStats }>('/admin/dashboard').then((r) => r.data.data),
};
