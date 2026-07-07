import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { paymentApi } from '@/api/payment';
import { Button } from '@/components/ui/Button';

/**
 * Landing page after a successful Flouci payment redirect.
 * Flouci sends the user here with ?payment_id=xxx
 * We verify server-side before showing confirmation.
 */
export const PaymentSuccessPage = () => {
  const { t } = useTranslation();
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const paymentId     = params.get('payment_id') ?? '';

  const [status, setStatus] = useState<'loading' | 'completed' | 'failed' | 'error'>('loading');

  useEffect(() => {
    if (!paymentId) {
      navigate('/hotel/dashboard', { replace: true });
      return;
    }

    paymentApi.verify(paymentId)
      .then((result) => {
        setStatus(result.status === 'completed' ? 'completed' : 'failed');
      })
      .catch(() => setStatus('error'));
  }, [paymentId, navigate]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">{t('paymentResult.verifying')}</p>
        </div>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="card w-full max-w-sm p-8 flex flex-col items-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('paymentResult.confirmedTitle')}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t('paymentResult.confirmedHint')}
            </p>
          </div>
          <Button fullWidth size="lg" onClick={() => navigate('/hotel/dashboard', { replace: true })}>
            {t('paymentResult.backToDashboard')}
          </Button>
        </div>
      </div>
    );
  }

  // failed or error
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-sm p-8 flex flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t('paymentResult.failedTitle')}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {status === 'error'
              ? t('paymentResult.errorHint')
              : t('paymentResult.failedHint')}
          </p>
        </div>
        <Button fullWidth size="lg" onClick={() => navigate('/hotel/settings', { replace: true })}>
          {t('paymentResult.retry')}
        </Button>
      </div>
    </div>
  );
};
