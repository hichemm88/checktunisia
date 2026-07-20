import { api } from '@/lib/api';

/**
 * Codes promo (remise sur facture). Gérés côté admin ; la remise s'applique à la
 * création d'une facture via le champ coupon_code. Le code est normalisé en
 * MAJUSCULES côté serveur.
 */
export type CouponType = 'percent' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: string;
  description: string | null;
  min_amount: string | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  redemptions_count?: number;
  created_at: string;
}

export interface CouponInput {
  code?: string;
  type?: CouponType;
  value?: number;
  description?: string | null;
  min_amount?: number | null;
  max_uses?: number | null;
  expires_at?: string | null;
  active?: boolean;
}

export const adminCouponsApi = {
  list: () =>
    api
      .get<{ data: Coupon[]; meta: { total: number; current_page: number; per_page: number } }>('/admin/coupons')
      .then((r) => r.data),
  create: (data: CouponInput) => api.post<{ data: Coupon }>('/admin/coupons', data).then((r) => r.data.data),
  update: (id: string, data: CouponInput) => api.patch<{ data: Coupon }>(`/admin/coupons/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/admin/coupons/${id}`).then((r) => r.data),
};
