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

export const adminActivityApi = {
  list: (params?: { page?: number; per_page?: number; actor_id?: string; hotel_id?: string; action?: string; from?: string; to?: string }) =>
    api.get<{ data: AuditLogEntry[]; meta: { total: number; current_page: number; per_page: number } }>('/admin/audit-logs', { params }).then((r) => r.data),
};
