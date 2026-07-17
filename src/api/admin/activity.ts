import { api } from '@/lib/api';

export interface AuditLogEntry {
  id: number;
  action: string;
  subject_type: string | null;
  subject_id: string | null;
  actor: { id: string; first_name: string; last_name: string; email: string } | null;
  hotel: { id: string; name: string } | null;
  created_at: string;
}

export interface ActivityFilters {
  actor_id?: string;
  hotel_id?: string;
  action?: string;
  from?: string;
  to?: string;
}

export const adminActivityApi = {
  list: (params?: ActivityFilters & { page?: number; per_page?: number }) =>
    api.get<{ data: AuditLogEntry[]; meta: { total: number; current_page: number; per_page: number } }>('/admin/audit-logs', { params }).then((r) => r.data),
  actions: () => api.get<{ data: string[] }>('/admin/audit-logs/actions').then((r) => r.data.data),
  exportCsv: async (params?: ActivityFilters) => {
    const res = await api.get('/admin/audit-logs/export', { params, responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-activite-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
