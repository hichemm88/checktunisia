import { api } from '@/lib/api';

/** Langues de communication supportees (emails). 'fr' est la langue de repli. */
export type EmailLocale = 'fr' | 'en' | 'ar';
export const EMAIL_LOCALES: EmailLocale[] = ['fr', 'en', 'ar'];

export interface EmailTemplateItem {
  key: string;
  label: string;
  subject: string;
  body_html: string;
  is_custom: boolean;
}

export const adminEmailsApi = {
  list: (locale: EmailLocale = 'fr') =>
    api.get<{ data: EmailTemplateItem[] }>('/admin/emails', { params: { locale } }).then((r) => r.data.data),
  update: (key: string, data: { subject: string; body_html: string; locale: EmailLocale }) =>
    api.patch<{ data: EmailTemplateItem }>(`/admin/emails/${key}`, data).then((r) => r.data.data),
  preview: (key: string, locale: EmailLocale = 'fr') =>
    api.get<{ data: { subject: string; html: string } }>(`/admin/emails/${key}/preview`, { params: { locale } }).then((r) => r.data.data),
  sendTest: (key: string, locale: EmailLocale = 'fr') =>
    api.post<{ data: { sent_to: string } }>(`/admin/emails/${key}/send-test`, { locale }).then((r) => r.data.data),
  sendReminders: () => api.post<{ data: { candidates: number; sent: number } }>('/admin/emails/send-reminders').then((r) => r.data.data),
};
