import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { QayedStamp } from '@/components/ui/QayedStamp';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { extractErrors } from '@/lib/api';
import { useSeoMeta } from '@/cms/useSeoMeta';

export const LoginPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useSeoMeta({
    title: t('seo.loginTitle'),
    description: t('seo.loginDescription'),
    lang: i18n.language,
    canonicalPath: '/login',
  });
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authApi.login(email, password);
      // Authority user with 2FA enabled → go to TOTP verification step
      if (result.requires_2fa) {
        navigate('/auth/2fa/verify', { state: { partialToken: result.partial_token } });
        return;
      }
      // Store token expiry so auto-refresh can trigger before the 8h token expires
      setAuth(result.token, { ...result.user, _token_expires_at: result.expires_at });
      // Role-based redirect
      if (result.user.role === 'authority_user') navigate('/authority/search');
      else if (result.user.role === 'platform_admin') navigate('/admin/dashboard');
      else navigate('/hotel/dashboard');
    } catch (err) {
      setError(extractErrors(err));
    } finally {
      setLoading(false);
    }
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
            <p className="text-sm text-gray-500">{t('auth.tagline')}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">
          <h2 className="text-center text-base font-semibold text-gray-900">{t('auth.loginTitle')}</h2>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Input
            label={t('auth.emailLabel')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            required
            autoComplete="email"
          />

          <Input
            label={t('auth.passwordLabel')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          <Button type="submit" fullWidth loading={loading} size="lg">
            {t('auth.loginButton')}
          </Button>

          <Link
            to="/forgot-password"
            className="text-center text-sm font-medium hover:underline"
            style={{ color: 'var(--qayed-cachet)' }}
          >
            {t('auth.forgotPassword')}
          </Link>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} {t('auth.footer')}
        </p>
      </div>
    </div>
  );
};
