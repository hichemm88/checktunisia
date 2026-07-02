import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck, Users, DoorOpen, Calendar, ChevronRight,
  TrendingUp, FileWarning, Percent, AlertCircle, Plus, ShieldAlert,
} from 'lucide-react';
import { dashboardApi } from '@/api/dashboard';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import type { DashboardData } from '@/types';

// ── SVG occupancy ring ───────────────────────────────────────────────────────
const OccupancyRing = ({ pct }: { pct: number }) => {
  const r = 44, circ = 2 * Math.PI * r;
  const filled = ((Math.min(pct, 100)) / 100) * circ;
  const color  = pct >= 80 ? '#22c55e' : pct >= 50 ? '#C8943A' : '#1B3A5F';
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="#E5E7EB" strokeWidth="10" />
      <circle
        cx="55" cy="55" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="55" y="51" textAnchor="middle" className="font-bold" fill="#111827" style={{ fontSize: 18, fontWeight: 800 }}>
        {pct}%
      </text>
      <text x="55" y="65" textAnchor="middle" fill="#9CA3AF" style={{ fontSize: 10 }}>
        occupation
      </text>
    </svg>
  );
};

// ── Mini bar chart ───────────────────────────────────────────────────────────
const WeeklyChart = ({ data }: { data: { label: string; count: number }[] }) => {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-20 w-full">
      {data.map((d, i) => {
        const pct = Math.max((d.count / max) * 100, 3);
        const isToday = i === data.length - 1;
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            {d.count > 0 && (
              <span className="text-[10px] font-semibold leading-none" style={{ color: isToday ? '#1B3A5F' : '#9CA3AF' }}>
                {d.count}
              </span>
            )}
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: `${pct}%`,
                background: isToday ? '#1B3A5F' : '#D4E1F4',
              }}
            />
            <span className="text-[9px] leading-none truncate" style={{ color: isToday ? '#1B3A5F' : '#9CA3AF', fontWeight: isToday ? 700 : 400 }}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ── Compact stat tile ────────────────────────────────────────────────────────
const StatTile = ({
  icon: Icon, label, value, accent,
}: {
  icon: React.ElementType; label: string; value: number | string; accent: string;
}) => (
  <Card className="flex flex-col gap-2 p-4">
    <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: accent + '20' }}>
      <Icon className="h-4 w-4" style={{ color: accent }} />
    </div>
    <p className="text-2xl font-black" style={{ color: '#111827' }}>{value}</p>
    <p className="text-[11px] font-medium leading-snug" style={{ color: '#6B7280' }}>{label}</p>
  </Card>
);

// ── Greeting helper ──────────────────────────────────────────────────────────
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

// ── Dashboard ────────────────────────────────────────────────────────────────
const EMPTY_DASH: DashboardData = {
  today: { arrivals_expected: 0, arrivals_done: 0, currently_present: 0, departures_today: 0, occupancy_rate: 0 },
  month: { check_ins_total: 0 },
  weekly_trend:    [],
  expiry_alerts:   [],
  subscription:    { status: 'none', expires_at: undefined, days_remaining: undefined, plan: undefined },
  recent_check_ins: [],
};

export const DashboardPage = () => {
  const navigate    = useNavigate();
  const { user }    = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 60_000,
  });

  const d   = data ?? EMPTY_DASH;
  const sub = d.subscription;
  const isSubWarning       = sub.status !== 'none' && (sub.status !== 'active' || (sub.days_remaining ?? 99) <= 7);
  const hasAlerts          = d.expiry_alerts.length > 0;
  const securityHitCount   = d.pending_watchlist_hits ?? 0;

  return (
    <HotelLayout title="Tableau de bord">
      <div className="flex flex-col gap-4 pb-4">

        {/* ── Hero: greeting + occupancy ring ── */}
        <div
          className="px-4 pt-5 pb-4 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, #1B3A5F 0%, #2A5090 100%)',
          }}
        >
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C8943A' }}>
              {greeting()}
            </p>
            <h1 className="text-xl font-black text-white leading-tight">
              {user?.first_name ?? 'Bienvenue'}
            </h1>
            <p className="text-sm text-blue-200 mt-1">
              {new Date().toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <button
              onClick={() => navigate('/hotel/check-ins/new')}
              className="mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95"
              style={{ background: '#C8943A', color: '#fff', boxShadow: '0 4px 14px rgba(200,148,58,0.50)' }}
            >
              <Plus className="h-4 w-4" />
              Nouveau check-in
            </button>
          </div>
          <div className="shrink-0">
            {isLoading
              ? <div className="h-[110px] w-[110px] rounded-full animate-pulse bg-white/10" />
              : <OccupancyRing pct={d.today.occupancy_rate} />
            }
          </div>
        </div>

        <div className="px-4 flex flex-col gap-4">

          {/* Security alert banner */}
          {securityHitCount > 0 && (
            <div
              className="flex items-start gap-3 rounded-xl p-4"
              style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: '#EF444420' }}
              >
                <ShieldAlert className="h-5 w-5" style={{ color: '#DC2626' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: '#7F1D1D' }}>
                  Notification de sécurité
                </p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: '#991B1B' }}>
                  {securityHitCount} alerte{securityHitCount > 1 ? 's' : ''} en attente
                </p>
                <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>
                  Veuillez contacter les autorités compétentes immédiatement.
                </p>
              </div>
            </div>
          )}

          {/* Subscription warning */}
          {isSubWarning && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {sub.status !== 'active'
                    ? 'Abonnement inactif'
                    : `Expire dans ${sub.days_remaining} jour${sub.days_remaining !== 1 ? 's' : ''}`}
                </p>
                <p className="text-xs text-amber-600 mt-0.5">Contactez support@checktunisia.tn</p>
              </div>
            </div>
          )}

          {/* Stats grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 animate-pulse rounded-card bg-gray-100" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatTile icon={UserCheck}  label="Arrivées prévues"  value={d.today.arrivals_expected} accent="#1B3A5F" />
              <StatTile icon={Users}      label="Check-ins faits"   value={d.today.arrivals_done}     accent="#22c55e" />
              <StatTile icon={DoorOpen}   label="Présents"          value={d.today.currently_present} accent="#2A5090" />
              <StatTile icon={Calendar}   label="Départs auj."      value={d.today.departures_today}  accent="#C8943A" />
              <StatTile icon={Percent}    label="Taux d'occupation" value={`${d.today.occupancy_rate}%`} accent={d.today.occupancy_rate >= 80 ? '#22c55e' : '#C8943A'} />
              <StatTile icon={TrendingUp} label="Check-ins ce mois" value={d.month.check_ins_total}   accent="#8b5cf6" />
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
              <div className="pt-1">
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
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200">
                  {d.expiry_alerts.length} alerte{d.expiry_alerts.length > 1 ? 's' : ''}
                </span>
              </CardHeader>
              <div className="flex flex-col gap-2 mt-1">
                {d.expiry_alerts.map((alert, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(`/hotel/history/${alert.check_in_id}`)}
                    className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5 text-left hover:bg-amber-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{alert.guest_name}</p>
                      <p className="text-xs text-gray-500">{alert.document_number} · Réf. {alert.reference}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={`text-xs font-bold ${alert.days_until_expiry <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
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
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle>Récents</CardTitle>
              <button
                onClick={() => navigate('/hotel/history')}
                className="text-xs font-semibold"
                style={{ color: '#1B3A5F' }}
              >
                Voir tout →
              </button>
            </CardHeader>
            <div className="divide-y divide-gray-50">
              {d.recent_check_ins.map((c) => {
                const initials = c.primary_guest
                  ? c.primary_guest.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                  : '?';
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/hotel/history/${c.id}`)}
                    className="flex w-full items-center justify-between px-5 py-3 hover:bg-warm-100 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: '#E8EEFB', color: '#1B3A5F' }}
                      >
                        {initials}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {c.primary_guest ?? 'Sans nom'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {c.room ? `Ch. ${c.room}` : 'Sans chambre'} · {c.reference}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {statusBadge(c.status)}
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </button>
                );
              })}
              {!isLoading && !d.recent_check_ins.length && (
                <div className="flex flex-col items-center gap-3 px-5 py-10">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center"
                    style={{ background: '#E8EEFB' }}
                  >
                    <UserCheck className="h-5 w-5" style={{ color: '#1B3A5F' }} />
                  </div>
                  <p className="text-sm text-gray-400">Aucun check-in récent</p>
                  <Button size="sm" onClick={() => navigate('/hotel/check-ins/new')}>
                    Commencer un check-in
                  </Button>
                </div>
              )}
            </div>
          </Card>

        </div>
      </div>
    </HotelLayout>
  );
};
