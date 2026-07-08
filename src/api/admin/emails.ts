import { api } from '@/lib/api';

export interface EmailTemplateItem {
  key: string;
  label: string;
  subject: string;
  body_html: string;
  is_custom: boolean;
}

export const adminEmailsApi = {
  list: () => api.get<{ data: EmailTemplateItem[] }>('/admin/emails').then((r) => r.data.data),
  update: (key: string, data: { subject: string; body_html: string }) =>
    api.patch<{ data: EmailTemplateItem }>(`/admin/emails/${key}`, data).then((r) => r.data.data),
  preview: (key: string) => api.get<{ data: { subject: string; html: string } }>(`/admin/emails/${key}/preview`).then((r) => r.data.data),
  sendTest: (key: string) => api.post<{ data: { sent_to: string } }>(`/admin/emails/${key}/send-test`).then((r) => r.data.data),
  sendReminders: () => api.post<{ data: { candidates: number; sent: number } }>('/admin/emails/send-reminders').then((r) => r.data.data),
};
