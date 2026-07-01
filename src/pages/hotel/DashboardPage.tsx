import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck, Users, DoorOpen, Calendar, AlertCircle,
  ChevronRight, TrendingUp, FileWarning, Percent,
} from 'lucide-react';
import { dashboardApi } from '@/api/dashboard';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

// ── Mini bar chart (pure SVG, no external lib) ──────────────────────────────
const WeeklyChart = ({ data }: { data: { label: string; count: number }[] }) => {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-20 w-full">
      {data.map((d, i) => {
        const pct = Math.max((d.count / max) * 100, 2);
        const isToday = i === data.length - 1;
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-gray-700 leading-none">
              {d.count > 0 ? d.count : ''}
            </span>
            <div
              className={`w-full rounded-t-md transition-all ${isToday ? 'bg-primary-600' : 'bg-primary-200'}`}
              style={{ height: `${pct}%` }}
            />
            <span className={`text-[9px] leading-none truncate ${isToday ? 'text-primary-700 font-semibold' : 'text-gray-400'}`}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({
  icon: Icon, label, value, sub, color,
}: { icon: React.ElementType; label: string; value: number | string; sub?: string; color: string }) => (
  <Card className="flex flex-col gap-1.5">
    <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${color}`}>
      <Icon className="h-4 w-4 text-white" />
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500 leading-tight">{label}</p>
    {sub && <p className="text-xs text-gray-400">{sub}</p>}
  </Card>
);

// ── Dashboard ────────────────────────────────────────────────────────────────
const EMPTY_DASH = {
  today: { arrivals_expected: 0, arrivals_done: 0, currently_present: 0, departures_today: 0, occupancy_rate: 0 },
  month: { check_ins_total: 0 },
  weekly_trend:   [] as DashboardData['weekly_trend'],
  expiry_alerts:  [] as DashboardData['expiry_alerts'],
  subscription:   { status: 'none', expires_at: undefined, days_remaining: undefined, plan: undefined } as DashboardData['subscription'],
  recent_check_ins: [] as DashboardData['recent_check_ins'],
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 60_000,
  });

  const d   = data ?? EMPTY_DASH;
  const sub = d.subscription;
  const isSubWarning = sub.status !== 'none' && (sub.status !== 'active' || (sub.days_remaining ?? 99) <= 7);
  const hasAlerts = d.expiry_alerts.length > 0;

  return (
    <HotelLayout title="Tableau de bord">
      <div className="p-4 flex flex-col gap-5">

        {/* Subscription warning */}
        {isSubWarning && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {sub.status !== 'active' ? 'Abonnement inactif' : `Expire dans ${sub.days_remaining} jour${sub.days_remaining !== 1 ? 's' : ''}`}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Contactez support@checktunisia.tn pour renouveler.</p>
            </div>
          </div>
        )}

        {/* Quick action */}
        <Button size="lg" fullWidth onClick={() => navigate('/hotel/check-ins/new')} className="gap-3">
          <UserCheck className="h-5 w-5" /> Nouveau check-in
        </Button>

        {/* Stats grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-28 animate-pulse rounded-card bg-gray-100" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={UserCheck} label="Arrivées prévues" value={d.today.arrivals_expected} color="bg-primary-600" />
            <StatCard icon={Users}     label="Check-ins faits"  value={d.today.arrivals_done}     color="bg-green-500" />
            <StatCard icon={DoorOpen}  label="Présents"         value={d.today.currently_present} color="bg-navy-700" />
            <StatCard icon={Calendar}  label="Départs auj."     value={d.today.departures_today}  color="bg-gold-500" />
            <StatCard
              icon={Percent}
              label="Taux d'occupation"
              value={`${d.today.occupancy_rate}%`}
              color={d.today.occupancy_rate >= 80 ? 'bg-green-600' : d.today.occupancy_rate >= 50 ? 'bg-amber-500' : 'bg-gray-400'}
            />
            <StatCard icon={TrendingUp} label="Check-ins ce mois" value={d.month.check_ins_total} color="bg-purple-500" />
          </div>
        )}

        {/* Weekly trend */}
        {d.weekly_trend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                  Tendance — 7 derniers jours
                </div>
              </CardTitle>
            </CardHeader>
            <div className="pt-2">
              <WeeklyChart data={d.weekly_trend} />
            </div>
          </Card>
        )}

        {/* Document expiry alerts */}
        {hasAlerts && (
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <FileWarning className="h-4 w-4 text-amber-500" />
                  Documents expirant bientôt
                </div>
              </CardTitle>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                {d.expiry_alerts.length} alerte{d.expiry_alerts.length > 1 ? 's' : ''}
              </span>
            </CardHeader>
            <div className="flex flex-col gap-2 mt-1">
              {d.expiry_alerts.map((alert, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/hotel/history/${alert.check_in_id}`)}
                  className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2.5 text-left hover:bg-amber-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{alert.guest_name}</p>
                    <p className="text-xs text-gray-500">{alert.document_number} · Réf. {alert.reference}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={`text-xs font-semibold ${alert.days_until_expiry <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                      {alert.days_until_expiry <= 0 ? 'Expiré' : `J-${alert.days_until_expiry}`}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(alert.expiry_date).toLocaleDateString('fr-TN')}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Recent check-ins */}
        <Card padding="none">
          <CardHeader className="px-5 pt-5 pb-4">
            <CardTitle>Récents</CardTitle>
            <button onClick={() => navigate('/hotel/history')} className="text-xs text-primary-600 font-medium">
              Voir tout
            </button>
          </CardHeader>
          <div className="divide-y divide-gray-100">
            {d.recent_check_ins.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/hotel/history/${c.id}`)}
                className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-gray-50 text-left"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {c.primary_guest ?? 'Sans nom'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {c.room ? `Ch. ${c.room}` : 'Sans chambre'} · {c.reference}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(c.status)}
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </button>
            ))}
            {!isLoading && !d.recent_check_ins.length && (
              <p className="px-5 py-6 text-center text-sm text-gray-400">Aucun check-in récent</p>
            )}
          </div>
        </Card>

      </div>
    </HotelLayout>
  );
};
