import { api } from '@/lib/api';
import { type DashboardData } from '@/types';

export interface OccupancyDay { date: string; label: string; rate: number; is_today: boolean; is_future: boolean }
export interface OccupancyWindow {
  occupancy: OccupancyDay[];
  start: string;
  end: string;
  offset: number;
  is_current: boolean;
}

export const dashboardApi = {
  get: () => api.get<{ data: DashboardData }>('/hotel/dashboard').then((r) => r.data.data),

  // Occupation navigable semaine par semaine (offset <= 0 : passé uniquement).
  occupancy: (offset: number) =>
    api.get<{ data: OccupancyWindow }>('/hotel/dashboard/occupancy', { params: { offset } }).then((r) => r.data.data),
};
