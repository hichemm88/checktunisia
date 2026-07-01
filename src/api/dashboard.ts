import { api } from '@/lib/api';
import { DashboardData } from '@/types';

export const dashboardApi = {
  get: () => api.get<{ data: DashboardData }>('/hotel/dashboard').then((r) => r.data.data),
};
