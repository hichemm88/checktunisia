import { api } from '@/lib/api';

export interface PaymentInitiateResult {
  payment_id: string;
  payment_url: string;
  expires_at: string;
  amount: string;
  currency: string;
}

export interface PaymentVerifyResult {
  status: 'pending' | 'completed' | 'failed' | 'expired';
  payment_id: string;
}

export const paymentApi = {
  /**
   * Initiate a Flouci payment for an invoice.
   * Returns a payment_url — redirect the user to this URL.
   */
  initiate: (invoiceId: string) =>
    api
      .post<{ data: PaymentInitiateResult }>('/hotel/payments/initiate', { invoice_id: invoiceId })
      .then((r) => r.data.data),

  /**
   * Verify payment status after the user returns from Flouci.
   * Call this on the success/failed redirect pages.
   */
  verify: (paymentId: string) =>
    api
      .get<{ data: PaymentVerifyResult }>(`/hotel/payments/${paymentId}/verify`)
      .then((r) => r.data.data),
};
