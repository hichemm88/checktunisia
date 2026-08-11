import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react';
import { paymentApi } from '@/api/payment';
import { Button } from '@/components/ui/Button';

/**
 * Page d'atterrissage au retour d'un paiement en ligne.
 *
 * Le prestataire ne connaît que SA propre référence et nous la rend en
 * paramètre : Konnect envoie `?payment_ref=`, Flouci envoyait `?payment_id=`.
 * Accepter les deux n'est pas de la prudence décorative — lire le mauvais nom
 * renvoie le client au tableau de bord sans rien vérifier, juste après qu'il a
 * payé. Le serveur, lui, reconnaît la référence du prestataire comme la nôtre.
 *
 * On vérifie côté serveur avant d'afficher la moindre confirmation.
 */
export const PaymentSuccessPage = () => {
  const { t } = useTranslation();
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const paymentId     = params.get('payment_ref') ?? params.get('payment_id') ?? '';

  const [status, setStatus] = useState<'loading' | 'completed' | 'pending' | 'failed' | 'error'>('loading');

  useEffect(() => {
    if (!paymentId) {
      navigate('/hotel/dashboard', { replace: true });
      return;
    }

    // Le client revient parfois avant que la passerelle n'ait tranché : elle
    // répond alors « en attente », ce qui n'est PAS un échec. Annoncer
    // « paiement non abouti » à quelqu'un qui vient de payer l'enverrait
    // payer une seconde fois. On laisse quelques secondes au verdict, puis on
    // dit honnêtement « en cours de confirmation » — le rappel serveur de
    // Konnect, lui, encaissera de son côté quoi qu'il arrive.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempt = 0;
    const MAX_ATTEMPTS = 5;

    const check = () => {
      paymentApi.verify(paymentId)
        .then((result) => {
          if (cancelled) return;

          if (result.status === 'completed') return setStatus('completed');
          if (result.status !== 'pending')   return setStatus('failed');

          attempt += 1;
          if (attempt >= MAX_ATTEMPTS) return setStatus('pending');
          timer = setTimeout(check, 2000);
        })
        .catch(() => { if (!cancelled) setStatus('error'); });
    };

    check();

    return () => { cancelled = true; clearTimeout(timer); };
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

  if (status === 'pending') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="card w-full max-w-sm p-8 flex flex-col items-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('paymentResult.pendingTitle')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('paymentResult.pendingHint')}</p>
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
