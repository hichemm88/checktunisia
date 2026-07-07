import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
const OccupancyRing = ({ pct, present, total }: { pct: number; present: number; total?: number }) => {
  const { t } = useTranslation();
  const r = 42, circ = 2 * Math.PI * r;
  const filled = ((Math.min(pct, 100)) / 100) * circ;
  const color  = pct >= 80 ? '#4ade80' : pct >= 50 ? '#fbbf24' : '#93c5fd';
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="106" height="106" viewBox="0 0 106 106">
        {/* Track */}
        <circle cx="53" cy="53" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9" />
        {/* Fill */}
        <circle
          cx="53" cy="53" r={r} fill="none"
          stroke={color} strokeWidth="9"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
          transform="rotate(-90 53 53)"
          style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
        {/* Percentage */}
        <text x="53" y="48" textAnchor="middle" fill="white" style={{ fontSize: 20, fontWeight: 800 }}>
          {pct}%
        </text>
        {/* Present count */}
        <text x="53" y="63" textAnchor="middle" fill="rgba(255,255,255,0.7)" style={{ fontSize: 11 }}>
          {t('hotelDashboard.presentCount', { count: present })}
        </text>
      </svg>
      {total != null && (
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {t('hotelDashboard.ofTotalUnits', { count: total })}
        </span>
      )}
    </div>
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
              <span className="text-[10px] font-semibold leading-none" style={{ color: isToday ? '#5346A8' : '#9CA3AF' }}>
                {d.count}
              </span>
            )}
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: `${pct}%`,
                background: isToday ? '#5346A8' : '#EEEBFA',
              }}
            />
            <span className="text-[9px] leading-none truncate" style={{ color: isToday ? '#5346A8' : '#9CA3AF', fontWeight: isToday ? 700 : 400 }}>
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
  const { t, i18n } = useTranslation();
  const navigate    = useNavigate();
  const { user, activePropertyId } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', activePropertyId],
    queryFn: dashboardApi.get,
    refetchInterval: 60_000,
  });

  const d   = data ?? EMPTY_DASH;
  const sub = d.subscription;
  const isSubWarning       = sub.status !== 'none' && (sub.status !== 'active' || (sub.days_remaining ?? 99) <= 7);
  const hasAlerts          = d.expiry_alerts.length > 0;
  const securityHitCount   = d.pending_watchlist_hits ?? 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('hotelDashboard.greetingMorning');
    if (h < 18) return t('hotelDashboard.greetingAfternoon');
    return t('hotelDashboard.greetingEvening');
  };

  const dateLocale = i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'en' ? 'en-GB' : 'fr-TN';

  return (
    <HotelLayout title={t('hotelDashboard.title')}>
      <div className="flex flex-col gap-4 pb-4">

        {/* ── Hero: greeting + occupancy ring ── */}
        <div
          className="px-4 pt-5 pb-5 flex items-center justify-between gap-4"
          style={{ background: 'var(--qayed-cachet)' }}
        >
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#5346A8' }}>
              {greeting()}
            </p>
            <h1 className="qayed-display text-xl text-white truncate">
              {user?.first_name ?? t('hotelDashboard.welcome')}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>

            {/* Quick stats row */}
            <div className="flex gap-3 mt-3">
              <div className="flex flex-col" style={{ color: 'rgba(255,255,255,0.9)' }}>
                <span className="text-lg font-black leading-none">{d.today.arrivals_expected}</span>
                <span className="text-[10px] font-medium uppercase tracking-wide mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{t('hotelDashboard.arrivals')}</span>
              </div>
              <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <div className="flex flex-col" style={{ color: 'rgba(255,255,255,0.9)' }}>
                <span className="text-lg font-black leading-none">{d.today.departures_today}</span>
                <span className="text-[10px] font-medium uppercase tracking-wide mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{t('hotelDashboard.departures')}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/hotel/check-ins/new')}
              className="mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95 self-start"
              style={{ background: '#5346A8', color: '#fff', boxShadow: '0 2px 8px rgba(83,70,168,0.3)' }}
            >
              <Plus className="h-4 w-4" />
              {t('hotelDashboard.newCheckin')}
            </button>
          </div>

          {/* Occupancy ring */}
          <div className="shrink-0">
            {isLoading
              ? <div className="h-[106px] w-[106px] rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} />
              : <OccupancyRing
                  pct={d.today.occupancy_rate}
                  present={d.today.currently_present}
                  total={user?.hotel?.room_count ?? undefined}
                />
            }
          </div>
        </div>

        <div className="px-4 flex flex-col gap-4">

          {/* Security alert banner */}
          {securityHitCount > 0 && (
            <button
              onClick={() => navigate('/hotel/security')}
              className="flex items-start gap-3 rounded-xl p-4 w-full text-start transition-opacity hover:opacity-90 active:scale-[.99]"
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
                  {t('hotelDashboard.securityNotification')}
                </p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: '#991B1B' }}>
                  {t('hotelDashboard.pendingAlerts', { count: securityHitCount })}
                </p>
                <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>
                  {t('hotelDashboard.contactAuthorities')}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 mt-1" style={{ color: '#DC2626' }} />
            </button>
          )}

          {/* Subscription warning */}
          {isSubWarning && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {sub.status !== 'active'
                    ? t('hotelDashboard.subInactive')
                    : t('hotelDashboard.subExpiresIn', { count: sub.days_remaining })}
                </p>
                <p className="text-xs text-amber-600 mt-0.5">{t('hotelDashboard.contactSupport')}</p>
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
              <StatTile icon={UserCheck}  label={t('hotelDashboard.statArrivalsExpected')}  value={d.today.arrivals_expected} accent="#5346A8" />
              <StatTile icon={Users}      label={t('hotelDashboard.statCheckinsDone')}   value={d.today.arrivals_done}     accent="#1F9D6B" />
              <StatTile icon={DoorOpen}   label={t('hotelDashboard.statPresent')}          value={d.today.currently_present} accent="#443896" />
              <StatTile icon={Calendar}   label={t('hotelDashboard.statDeparturesToday')}      value={d.today.departures_today}  accent="#5346A8" />
              <StatTile icon={Percent}    label={t('hotelDashboard.statOccupancyRate')} value={`${d.today.occupancy_rate}%`} accent={d.today.occupancy_rate >= 80 ? '#1F9D6B' : '#5346A8'} />
              <StatTile icon={TrendingUp} label={t('hotelDashboard.statCheckinsMonth')} value={d.month.check_ins_total}   accent="#8B7FE0" />
            </div>
          )}

          {/* Weekly trend */}
          {d.weekly_trend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-400" />
                    {t('hotelDashboard.weeklyTrend')}
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
                    {t('hotelDashboard.expiringDocuments')}
                  </div>
                </CardTitle>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200">
                  {t('hotelDashboard.alertCount', { count: d.expiry_alerts.length })}
                </span>
              </CardHeader>
              <div className="flex flex-col gap-2 mt-1">
                {d.expiry_alerts.map((alert, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(`/hotel/history/${alert.check_in_id}`)}
                    className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5 text-start hover:bg-amber-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{alert.guest_name}</p>
                      <p className="text-xs text-gray-500"><span className="font-mono">{alert.document_number}</span> · {t('hotelDashboard.ref')} <span className="font-mono">{alert.reference}</span></p>
                    </div>
                    <div className="text-end shrink-0 ms-3">
                      <p className={`text-xs font-bold ${alert.days_until_expiry <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                        {alert.days_until_expiry <= 0 ? t('hotelDashboard.expired') : t('hotelDashboard.daysUntil', { count: alert.days_until_expiry })}
                      </p>
                      <p className="text-xs text-gray-400">{new Date(alert.expiry_date).toLocaleDateString(dateLocale)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Recent check-ins */}
          <Card padding="none">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle>{t('hotelDashboard.recent')}</CardTitle>
              <button
                onClick={() => navigate('/hotel/history')}
                className="text-xs font-semibold"
                style={{ color: '#5346A8' }}
              >
                {t('hotelDashboard.seeAll')} →
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
                    className="flex w-full items-center justify-between px-5 py-3 hover:bg-warm-100 text-start transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: '#EEEBFA', color: '#5346A8' }}
                      >
                        {initials}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {c.primary_guest ?? t('hotelDashboard.noName')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {c.room ? t('hotelDashboard.room', { room: c.room }) : t('hotelDashboard.noRoom')} · <span className="font-mono">{c.reference}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ms-2">
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
                    style={{ background: '#EEEBFA' }}
                  >
                    <UserCheck className="h-5 w-5" style={{ color: '#5346A8' }} />
                  </div>
                  <p className="text-sm text-gray-400">{t('hotelDashboard.noRecentCheckin')}</p>
                  <Button size="sm" onClick={() => navigate('/hotel/check-ins/new')}>
                    {t('hotelDashboard.startCheckin')}
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
