import { api } from '@/lib/api';
import type { Data } from '@measured/puck';
import type { CmsLang, CmsPageMeta } from '@/api/cms';

export interface AdminPageListItem {
  id: string;
  slug: string;
  status: 'draft' | 'published';
  languages: CmsLang[];
  updated_at: string;
}

export interface AdminPage {
  id: string;
  slug: string;
  status: 'draft' | 'published';
  content: Partial<Record<CmsLang, Data>> | null;
  meta: Partial<Record<CmsLang, CmsPageMeta>> | null;
  created_at: string;
  updated_at: string;
}

export interface AdminMenuItem {
  id: string;
  location: 'navbar' | 'footer';
  label: { fr: string; en?: string | null; ar?: string | null };
  page_id: string | null;
  external_url: string | null;
  sort_order: number;
  is_active: boolean;
  page?: { id: string; slug: string; status: string } | null;
}

export interface AdminMedia {
  id: string;
  filename: string;
  mime: string;
  size: number;
  url: string;
  created_at: string;
}

export const adminPagesApi = {
  list: () => api.get<{ data: AdminPageListItem[]; meta: object }>('/admin/pages').then((r) => r.data.data),
  create: (data: { slug: string; status?: string }) => api.post<{ data: AdminPage }>('/admin/pages', data).then((r) => r.data.data),
  show: (id: string) => api.get<{ data: AdminPage }>(`/admin/pages/${id}`).then((r) => r.data.data),
  update: (id: string, data: Partial<Pick<AdminPage, 'slug' | 'status' | 'content' | 'meta'>>) =>
    api.patch<{ data: AdminPage }>(`/admin/pages/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/admin/pages/${id}`),
};

export const adminMenuItemsApi = {
  list: () => api.get<{ data: AdminMenuItem[] }>('/admin/menu-items').then((r) => r.data.data),
  create: (data: object) => api.post<{ data: AdminMenuItem }>('/admin/menu-items', data).then((r) => r.data.data),
  update: (id: string, data: object) => api.patch<{ data: AdminMenuItem }>(`/admin/menu-items/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/admin/menu-items/${id}`),
};

export const adminMediaApi = {
  list: () => api.get<{ data: AdminMedia[]; meta: object }>('/admin/media').then((r) => r.data.data),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ data: AdminMedia }>('/admin/media', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data);
  },
  remove: (id: string) => api.delete(`/admin/media/${id}`),
};
