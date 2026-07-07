import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Smartphone, CheckCircle, Copy, KeyRound } from 'lucide-react';
import QRCode from 'react-qr-code';
import { authApi } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { QayedStamp } from '@/components/ui/QayedStamp';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { extractErrors } from '@/lib/api';

type Step = 'loading' | 'show_qr' | 'confirm' | 'done';

/**
 * Mandatory 2FA setup page for authority_users.
 * Shown when the backend returns 2FA_SETUP_REQUIRED (403).
 *
 * Flow:
 *   1. Fetch secret + QR URI from GET /auth/2fa/setup
 *   2. User scans QR in their authenticator app
 *   3. User enters the first 6-digit code to confirm setup
 *   4. Redirect to /authority/search
 */
export const TwoFactorSetupPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep]           = useState<Step>('loading');
  const [secret, setSecret]       = useState('');
  const [qrUri, setQrUri]         = useState('');
  const [code, setCode]           = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    authApi.get2FASetup()
      .then(({ secret, qr_uri, already_enabled }) => {
        if (already_enabled) {
          navigate('/authority/search', { replace: true });
          return;
        }
        setSecret(secret);
        setQrUri(qr_uri);
        setStep('show_qr');
      })
      .catch(() => {
        setError(t('authority2fa.loadError'));
        setStep('show_qr');
      });
  }, [navigate]);

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = async () => {
    if (code.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      await authApi.confirm2FASetup(code);
      setStep('done');
    } catch (err) {
      setError(extractErrors(err));
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-qayed-cachet border-t-transparent" />
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: 'var(--qayed-papier)' }}>
        <div className="card w-full max-w-sm p-8 flex flex-col items-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--qayed-conforme-fond)' }}>
            <CheckCircle className="h-8 w-8" style={{ color: 'var(--qayed-conforme)' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('authority2fa.enabledTitle')}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t('authority2fa.enabledHint')}
            </p>
          </div>
          <Button fullWidth size="lg" onClick={() => navigate('/authority/search', { replace: true })}>
            {t('authority2fa.goToPlatform')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8" style={{ background: 'var(--qayed-papier)' }}>
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <QayedStamp size={56} />
          <div>
            <h1 className="qayed-display text-xl text-qayed-encre">{t('authority2fa.title')}</h1>
            <p className="text-sm text-gray-500">
              {t('authority2fa.subtitle')}
            </p>
          </div>
        </div>

        <div className="card p-6 flex flex-col gap-6">
          {/* Step 1 */}
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-qayed-cachet text-xs font-bold text-white">1</div>
            <div>
              <p className="text-sm font-medium text-gray-900">{t('authority2fa.step1Title')}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {t('authority2fa.step1Hint')}
              </p>
            </div>
          </div>

          {/* Step 2 — QR Code */}
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-qayed-cachet text-xs font-bold text-white">2</div>
            <div className="flex flex-col gap-3 w-full">
              <p className="text-sm font-medium text-gray-900">{t('authority2fa.step2Title')}</p>

              {step === 'show_qr' && qrUri && (
                <div className="flex justify-center rounded-xl bg-white p-4 border border-gray-200">
                  <QRCode value={qrUri} size={180} level="M" />
                </div>
              )}

              {/* Manual entry key */}
              {secret && (
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                  <KeyRound className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="flex-1 font-mono text-xs text-gray-700 break-all">{secret}</span>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="shrink-0 rounded p-1 hover:bg-gray-200 transition-colors"
                    title={t('authority2fa.copyKey')}
                  >
                    {copied
                      ? <CheckCircle className="h-4 w-4" style={{ color: 'var(--qayed-conforme)' }} />
                      : <Copy className="h-4 w-4 text-gray-500" />
                    }
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Step 3 — Confirm */}
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-qayed-cachet text-xs font-bold text-white">3</div>
            <div className="flex flex-col gap-3 w-full">
              <p className="text-sm font-medium text-gray-900">{t('authority2fa.step3Title')}</p>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(v);
                }}
                maxLength={6}
                placeholder="000000"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.5em] text-gray-900 outline-none focus:border-qayed-cachet focus:ring-2 focus:ring-qayed-cachet/20 placeholder:text-gray-300 placeholder:tracking-[0.5em]"
              />

              <Button
                fullWidth
                onClick={handleConfirm}
                loading={loading}
                disabled={code.length !== 6}
                size="lg"
              >
                <Smartphone className="h-4 w-4 me-2" />
                {t('authority2fa.activateButton')}
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} {t('auth.footer')}
        </p>
      </div>
    </div>
  );
};
