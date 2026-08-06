import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QayedStamp } from '@/components/ui/QayedStamp';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';

/**
 * Écran d'attente pour un « admin » dont l'organisation n'a encore aucun
 * établissement : seul le propriétaire du compte peut faire l'onboarding.
 * Le statut est re-vérifié périodiquement — dès qu'un établissement existe
 * (ou que ce compte devient propriétaire), on redirige.
 */
export const PendingSetupPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: () => api.get('/hotel/onboarding/status').then((r) => r.data.data),
    staleTime: 0,
    refetchInterval: 30_000,
  });

  if (data?.has_property) return <Navigate to="/hotel/dashboard" replace />;
  if (data && data.role_org !== 'admin') return <Navigate to="/hotel/onboarding" replace />;

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: 'var(--qayed-papier)' }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-header text-center">
        <div className="flex justify-center mb-4"><QayedStamp size={40} /></div>
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: 'var(--qayed-cachet-dilue)' }}
        >
          <Clock className="h-6 w-6" style={{ color: 'var(--qayed-cachet)' }} />
        </div>
        <h1 className="qayed-display text-lg text-gray-900 mb-2">{t('pendingSetup.title')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('pendingSetup.message')}</p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => refetch()} loading={isFetching} className="gap-2 justify-center">
            <RefreshCw className="h-4 w-4" /> {t('pendingSetup.refresh')}
          </Button>
          <Button variant="ghost" onClick={handleLogout} className="gap-2 justify-center">
            <LogOut className="h-4 w-4" /> {t('common.logout')}
          </Button>
        </div>
      </div>
    </div>
  );
};
