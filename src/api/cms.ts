import axios from 'axios';
import type { Data } from '@measured/puck';

const BASE = import.meta.env.VITE_API_URL ?? 'https://checktunisia-backend-production.up.railway.app/api/v1';
const publicApi = axios.create({ baseURL: BASE });

export type CmsLang = 'fr' | 'en' | 'ar';

export interface CmsPageMeta {
  title?: string | null;
  description?: string | null;
}

export interface CmsPagePayload {
  slug: string;
  content: Partial<Record<CmsLang, Data>> | null;
  meta: Partial<Record<CmsLang, CmsPageMeta>> | null;
  updated_at: string;
}

export interface CmsMenuItem {
  id: string;
  location: 'navbar' | 'footer';
  label: { fr: string; en?: string | null; ar?: string | null };
  slug: string | null;
  url: string | null;
}

export const fetchCmsPage = (slug: string) =>
  publicApi.get<{ data: CmsPagePayload }>(`/public/pages/${slug}`).then((r) => r.data.data);

export const fetchCmsMenus = () =>
  publicApi.get<{ data: { navbar: CmsMenuItem[]; footer: CmsMenuItem[] } }>('/public/menus').then((r) => r.data.data);
