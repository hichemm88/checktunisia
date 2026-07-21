import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MailCheck, ArrowLeft } from 'lucide-react';
import { authApi } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { QayedStamp } from '@/components/ui/QayedStamp';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { extractErrors } from '@/lib/api';

export const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Backend always returns the same generic message (no account enumeration).
      await authApi.forgotPassword(email);
      setSent(true);
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

        {sent ? (
          <div className="card p-6 flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--qayed-conforme-fond)' }}>
              <MailCheck className="h-7 w-7" style={{ color: 'var(--qayed-conforme)' }} />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{t('auth.forgotSentTitle')}</h2>
            <p className="text-sm text-gray-500">{t('auth.forgotSentBody')}</p>
            <Link to="/login" className="text-sm font-semibold" style={{ color: 'var(--qayed-cachet)' }}>
              {t('auth.backToLogin')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">
            <h2 className="text-center text-base font-semibold text-gray-900">{t('auth.forgotTitle')}</h2>
            <p className="text-center text-sm text-gray-500 -mt-3">{t('auth.forgotSubtitle')}</p>

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

            <Button type="submit" fullWidth loading={loading} size="lg">
              {t('auth.forgotSubmit')}
            </Button>

            <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-3.5 w-3.5" /> {t('auth.backToLogin')}
            </Link>
          </form>
        )}

        <p className="mt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} {t('auth.footer')}
        </p>
      </div>
    </div>
  );
};
