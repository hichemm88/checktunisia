import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { authApi } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { QayedStamp } from '@/components/ui/QayedStamp';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { extractErrors } from '@/lib/api';

export const SetPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const missingLink = !email || !token;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError(t('auth.setPassword.mismatch'));
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ email, token, password, password_confirmation: confirm });
      setDone(true);
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
        <div className="mb-8 flex flex-col items-center gap-3">
          <QayedStamp size={56} />
          <div className="text-center">
            <h1 className="qayed-display text-2xl text-qayed-encre">QAYED</h1>
            <p className="text-sm text-gray-500">{t('auth.tagline')}</p>
          </div>
        </div>

        {done ? (
          <div className="card p-6 flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--qayed-conforme-fond)' }}>
              <CheckCircle2 className="h-7 w-7" style={{ color: 'var(--qayed-conforme)' }} />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{t('auth.setPassword.successTitle')}</h2>
            <p className="text-sm text-gray-500">{t('auth.setPassword.successBody')}</p>
            <Button fullWidth size="lg" onClick={() => navigate('/login')}>{t('auth.setPassword.goToLogin')}</Button>
          </div>
        ) : missingLink ? (
          <div className="card p-6 flex flex-col gap-3 text-center">
            <h2 className="text-base font-semibold text-gray-900">{t('auth.setPassword.invalidTitle')}</h2>
            <p className="text-sm text-gray-500">{t('auth.setPassword.invalidBody')}</p>
            <Link to="/login" className="text-sm font-semibold" style={{ color: 'var(--qayed-cachet)' }}>
              {t('auth.setPassword.goToLogin')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">
            <h2 className="text-center text-base font-semibold text-gray-900">{t('auth.setPassword.title')}</h2>
            <p className="text-center text-sm text-gray-500 -mt-3">{email}</p>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Input
              label={t('register.passwordLabel')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={t('register.passwordHint')}
              required
              autoComplete="new-password"
            />
            <Input
              label={t('register.passwordConfirmLabel')}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />

            <Button type="submit" fullWidth loading={loading} size="lg">
              {t('auth.setPassword.submit')}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} {t('auth.footer')}
        </p>
      </div>
    </div>
  );
};
