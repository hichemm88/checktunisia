import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * Landing page when Flouci redirects after a cancelled / failed payment.
 * Flouci sends the user here (fail_url) — no payment_id verification needed,
 * since the user abandoned the flow.
 */
export const PaymentFailedPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-sm p-8 flex flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t('paymentResult.cancelledTitle')}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {t('paymentResult.cancelledHint')}
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full">
          <Button fullWidth size="lg" onClick={() => navigate('/hotel/settings', { replace: true })}>
            {t('paymentResult.retry')}
          </Button>
          <Button
            fullWidth
            variant="ghost"
            size="lg"
            onClick={() => navigate('/hotel/dashboard', { replace: true })}
          >
            {t('paymentResult.backHome')}
          </Button>
        </div>
      </div>
    </div>
  );
};
