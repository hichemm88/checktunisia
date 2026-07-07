import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, XCircle, Clock, TrendingUp, Users, AlertTriangle, CreditCard, Ban } from 'lucide-react';
import { adminDashboardApi } from '@/api/admin/dashboard';
import { ListSkeleton } from '@/components/admin/ListSkeleton';

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const Stat = ({ icon: Icon, label, value, color }: { icon: typeof Building2; label: string; value?: number; color: string }) => (
  <div className="card p-5">
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}18` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
    </div>
    <p className="text-3xl font-extrabold text-gray-900">{value ?? '—'}</p>
  </div>
);

const AlertCard = ({ icon: Icon, title, color, children, empty }: { icon: typeof AlertTriangle; title: string; color: string; children: React.ReactNode; empty: boolean }) => (
  <div className="card p-4">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4" style={{ color }} />
      <p className="text-sm font-bold text-gray-800">{title}</p>
    </div>
    {empty ? <p className="text-xs text-gray-400 py-2">Rien à signaler</p> : <div className="flex flex-col gap-2">{children}</div>}
  </div>
);

export const AdminDashboardPage = () => {
  const { data: stats, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: adminDashboardApi.stats });

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>

      {isLoading && <ListSkeleton rows={4} height="h-20" />}

      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={Building2}    label="Établissements" value={stats.hotels.total}     color="#5346A8" />
            <Stat icon={CheckCircle2} label="Actifs"         value={stats.hotels.active}    color="#1F9D6B" />
            <Stat icon={XCircle}      label="Suspendus"      value={stats.hotels.suspended} color="#ef4444" />
            <Stat icon={Clock}        label="En attente"     value={stats.hotels.pending}   color="#E3A008" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Stat icon={TrendingUp} label="Check-ins aujourd'hui" value={stats.check_ins.today}      color="#8B7FE0" />
            <Stat icon={Users}      label="Check-ins ce mois"     value={stats.check_ins.this_month} color="#8B7FE0" />
          </div>

          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">À surveiller</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AlertCard icon={CreditCard} title="Abonnements qui expirent (30j)" color="#E3A008" empty={!stats.alerts.expiring_subscriptions.length}>
                {stats.alerts.expiring_subscriptions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-gray-800">{s.name}</span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{fmtDate(s.expires_at)}</span>
                  </div>
                ))}
              </AlertCard>
              <AlertCard icon={AlertTriangle} title="Paiements en échec (30j)" color="#ef4444" empty={!stats.alerts.failed_payments.length}>
                {stats.alerts.failed_payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-gray-800">{p.hotel_name ?? '—'}</span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{p.amount}</span>
                  </div>
                ))}
              </AlertCard>
              <AlertCard icon={Ban} title="Suspendus récemment (7j)" color="#9ca3af" empty={!stats.alerts.recently_suspended.length}>
                {stats.alerts.recently_suspended.map((h) => (
                  <Link key={h.id} to={`/admin/hotels`} className="flex items-center justify-between text-sm hover:text-gray-900">
                    <span className="truncate font-medium text-gray-800">{h.name}</span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{fmtDate(h.updated_at)}</span>
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
