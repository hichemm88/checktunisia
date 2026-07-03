import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Smartphone, CheckCircle, Copy, KeyRound } from 'lucide-react';
import QRCode from 'react-qr-code';
import { authApi } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
        setError('Impossible de charger la configuration 2FA. Réessayez.');
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="card w-full max-w-sm p-8 flex flex-col items-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Authentification activée</h2>
            <p className="mt-1 text-sm text-gray-500">
              La vérification en deux étapes est maintenant active sur votre compte.
            </p>
          </div>
          <Button fullWidth size="lg" onClick={() => navigate('/authority/search', { replace: true })}>
            Accéder à la plateforme
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 shadow-lg">
            <Shield className="h-7 w-7 text-gold-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sécurité renforcée requise</h1>
            <p className="text-sm text-gray-500">
              L'accès à la plateforme autorité nécessite une authentification à deux facteurs.
            </p>
          </div>
        </div>

        <div className="card p-6 flex flex-col gap-6">
          {/* Step 1 */}
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">1</div>
            <div>
              <p className="text-sm font-medium text-gray-900">Installer une application d'authentification</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Google Authenticator, Authy, Microsoft Authenticator ou équivalent.
              </p>
            </div>
          </div>

          {/* Step 2 — QR Code */}
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">2</div>
            <div className="flex flex-col gap-3 w-full">
              <p className="text-sm font-medium text-gray-900">Scanner le QR code</p>

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
                    title="Copier la clé"
                  >
                    {copied
                      ? <CheckCircle className="h-4 w-4 text-green-600" />
                      : <Copy className="h-4 w-4 text-gray-500" />
                    }
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Step 3 — Confirm */}
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">3</div>
            <div className="flex flex-col gap-3 w-full">
              <p className="text-sm font-medium text-gray-900">Confirmer avec le premier code</p>

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
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.5em] text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-300 placeholder:tracking-[0.5em]"
              />

              <Button
                fullWidth
                onClick={handleConfirm}
                loading={loading}
                disabled={code.length !== 6}
                size="lg"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Activer l'authentification à deux facteurs
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} CheckTunisia — Plateforme agréée MdI
        </p>
      </div>
    </div>
  );
};
