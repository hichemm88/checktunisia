import { useState, FormEvent, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, KeyRound } from 'lucide-react';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { extractErrors } from '@/lib/api';

/**
 * Step 2 of authority-user login.
 * Receives `partialToken` via location state (set by LoginPage after password auth).
 * Submits TOTP code → exchanges for full token.
 */
export const TwoFactorVerifyPage = () => {
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
      setAuth(result.token, result.user);
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 shadow-lg">
            <Shield className="h-7 w-7 text-gold-500" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">CheckTunisia</h1>
            <p className="text-sm text-gray-500">Vérification en deux étapes</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <KeyRound className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Code d'authentification</h2>
            <p className="text-sm text-gray-500">
              Saisissez le code à 6 chiffres affiché dans votre application d'authentification.
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
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-4 text-center text-3xl font-mono font-bold tracking-[0.5em] text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-300 placeholder:tracking-[0.5em]"
          />

          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={code.length !== 6}
            size="lg"
          >
            Vérifier
          </Button>

          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="text-center text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Retour à la connexion
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} CheckTunisia — Plateforme agréée MdI
        </p>
      </div>
    </div>
  );
};
