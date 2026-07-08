import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, CheckCircle2, XCircle, Clock, TrendingUp, Users, AlertTriangle, CreditCard, Ban, Hourglass, TrendingDown } from 'lucide-react';
import { adminDashboardApi } from '@/api/admin/dashboard';
import { ListSkeleton } from '@/components/admin/ListSkeleton';

const dateLocaleFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-FR');

const fmtDate = (d: string | null | undefined, locale: string) =>
  d ? new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const Stat = ({ icon: Icon, label, value, suffix, color }: { icon: typeof Building2; label: string; value?: number | null; suffix?: string; color: string }) => (
  <div className="card p-5">
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}18` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
    </div>
    <p className="text-3xl font-extrabold text-gray-900">{value != null ? `${value}${suffix ?? ''}` : '—'}</p>
  </div>
);

const AlertCard = ({ icon: Icon, title, color, children, empty }: { icon: typeof AlertTriangle; title: string; color: string; children: React.ReactNode; empty: boolean }) => {
  const { t } = useTranslation();
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4" style={{ color }} />
        <p className="text-sm font-bold text-gray-800">{title}</p>
      </div>
      {empty ? <p className="text-xs text-gray-400 py-2">{t('adminDashboard.nothingToReport')}</p> : <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
};

export const AdminDashboardPage = () => {
  const { t, i18n } = useTranslation();
  const locale = dateLocaleFor(i18n.language);
  const { data: stats, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: adminDashboardApi.stats });

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <h1 className="qayed-display text-xl text-gray-900">{t('adminDashboard.title')}</h1>

      {isLoading && <ListSkeleton rows={4} height="h-20" />}

      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={Building2}    label={t('adminDashboard.properties')} value={stats.hotels.total}     color="var(--qayed-cachet)" />
            <Stat icon={CheckCircle2} label={t('adminDashboard.active')}     value={stats.hotels.active}    color="var(--qayed-conforme)" />
            <Stat icon={XCircle}      label={t('adminDashboard.suspended')}  value={stats.hotels.suspended} color="#ef4444" />
            <Stat icon={Clock}        label={t('adminDashboard.pending')}    value={stats.hotels.pending}   color="var(--qayed-vigilance)" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Stat icon={TrendingUp} label={t('adminDashboard.checkinsToday')}     value={stats.check_ins.today}      color="var(--qayed-cachet-sombre)" />
            <Stat icon={Users}      label={t('adminDashboard.checkinsThisMonth')} value={stats.check_ins.this_month} color="var(--qayed-cachet-sombre)" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Stat icon={Hourglass}    label={t('adminDashboard.trialsInProgress')}    value={stats.trials.in_progress}    color="var(--qayed-cachet)" />
            <Stat icon={TrendingDown} label={t('adminDashboard.trialConversionRate')} value={stats.trials.conversion_rate} suffix="%" color="var(--qayed-conforme)" />
          </div>

          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">{t('adminDashboard.toWatch')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <AlertCard icon={CreditCard} title={t('adminDashboard.expiringSubscriptions')} color="var(--qayed-vigilance)" empty={!stats.alerts.expiring_subscriptions.length}>
                {stats.alerts.expiring_subscriptions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-gray-800">{s.name}</span>
                    <span className="text-xs text-gray-400 shrink-0 ms-2">{fmtDate(s.expires_at, locale)}</span>
                  </div>
                ))}
              </AlertCard>
              <AlertCard icon={Hourglass} title={t('adminDashboard.trialsExpiringSoon')} color="var(--qayed-cachet)" empty={!stats.trials.expiring_soon.length}>
                {stats.trials.expiring_soon.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-gray-800">{s.name}</span>
                    <span className="text-xs text-gray-400 shrink-0 ms-2">{fmtDate(s.expires_at, locale)}</span>
                  </div>
                ))}
              </AlertCard>
              <AlertCard icon={AlertTriangle} title={t('adminDashboard.failedPayments')} color="#ef4444" empty={!stats.alerts.failed_payments.length}>
                {stats.alerts.failed_payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-gray-800">{p.hotel_name ?? '—'}</span>
                    <span className="text-xs text-gray-400 shrink-0 ms-2">{p.amount}</span>
                  </div>
                ))}
              </AlertCard>
              <AlertCard icon={Ban} title={t('adminDashboard.recentlySuspended')} color="#9ca3af" empty={!stats.alerts.recently_suspended.length}>
                {stats.alerts.recently_suspended.map((h) => (
                  <Link key={h.id} to={`/admin/hotels`} className="flex items-center justify-between text-sm hover:text-gray-900">
                    <span className="truncate font-medium text-gray-800">{h.name}</span>
                    <span className="text-xs text-gray-400 shrink-0 ms-2">{fmtDate(h.updated_at, locale)}</span>
                  </Link>
                ))}
              </AlertCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
