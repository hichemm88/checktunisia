import { useState, FormEvent, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound } from 'lucide-react';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { QayedStamp } from '@/components/ui/QayedStamp';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { extractErrors } from '@/lib/api';

/**
 * Step 2 of authority-user login.
 * Receives `partialToken` via location state (set by LoginPage after password auth).
 * Submits TOTP code → exchanges for full token.
 */
export const TwoFactorVerifyPage = () => {
  const { t } = useTranslation();
  const navigate   = useNavigate();
  const location   = useLocation();
  const setAuth    = useAuthStore((s) => s.setAuth);

  // Partial token passed from LoginPage via navigate state
  const partialToken: string = (location.state as { partialToken?: string })?.partialToken ?? '';

  const [code, setCode]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!partialToken) navigate('/login', { replace: true });
    inputRef.current?.focus();
  }, [partialToken, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(v);
    if (v.length === 6) handleVerify(v);
  };

  const handleVerify = async (otp = code) => {
    if (otp.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      const result = await authApi.verify2FA(partialToken, otp);
      setAuth(result.token, { ...result.user, _token_expires_at: result.expires_at });
      navigate('/authority/search', { replace: true });
    } catch (err) {
      setError(extractErrors(err));
      setCode('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleVerify();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: 'var(--qayed-papier)' }}>
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <QayedStamp size={56} />
          <div className="text-center">
            <h1 className="qayed-display text-2xl text-qayed-encre">QAYED</h1>
            <p className="text-sm text-gray-500">{t('auth.twoFactorTitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-qayed-cachet-dilue">
              <KeyRound className="h-5 w-5 text-qayed-cachet" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{t('auth.twoFactorCodeTitle')}</h2>
            <p className="text-sm text-gray-500">
              {t('auth.twoFactorCodeHint')}
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
              {error}
            </div>
          )}

          {/* OTP input — large, centered */}
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={handleChange}
            maxLength={6}
            placeholder="000000"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-4 text-center text-3xl font-mono font-bold tracking-[0.5em] text-gray-900 outline-none focus:border-qayed-cachet focus:ring-2 focus:ring-qayed-cachet/20 placeholder:text-gray-300 placeholder:tracking-[0.5em]"
          />

          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={code.length !== 6}
            size="lg"
          >
            {t('auth.verify')}
          </Button>

          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="text-center text-sm text-gray-500 hover:text-gray-700 underline"
          >
            {t('auth.backToLogin')}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} {t('auth.footer')}
        </p>
      </div>
    </div>
  );
};
