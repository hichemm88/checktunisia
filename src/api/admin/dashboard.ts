import { api } from '@/lib/api';

export interface AdminDashboardStats {
  hotels: { total: number; active: number; suspended: number; pending: number };
  check_ins: { today: number; this_month: number };
  alerts: {
    expiring_subscriptions: { id: string; name: string; plan: string | null; expires_at: string }[];
    failed_payments: { id: string; hotel_name: string | null; amount: string; created_at: string }[];
    recently_suspended: { id: string; name: string; updated_at: string }[];
  };
}

export const adminDashboardApi = {
  stats: () => api.get<{ data: AdminDashboardStats }>('/admin/dashboard').then((r) => r.data.data),
};
