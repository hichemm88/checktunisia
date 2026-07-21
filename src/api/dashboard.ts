import { api } from '@/lib/api';
import { type DashboardData } from '@/types';

export const dashboardApi = {
  get: () => api.get<{ data: DashboardData }>('/hotel/dashboard').then((r) => r.data.data),
};
