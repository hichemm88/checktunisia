import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  UserCheck, DoorOpen, ChevronRight, ChevronLeft, LogIn, LogOut,
  TrendingUp, FileWarning, AlertCircle, Plus, ShieldAlert, Building2,
  CalendarClock, CalendarCheck, Globe, Moon, Gauge,
} from 'lucide-react';
import { dashboardApi, type OccupancyDay } from '@/api/dashboard';
import { formatTNDAmount } from '@/lib/money';
import { getFlagUrl } from '@/lib/flags';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import type { DashboardData } from '@/types';

const localeFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-FR');

// "20 → 26 juil. 2026" — plage compacte (parse date-only, sans décalage UTC).
const fmtRangeLabel = (start: string, end: string, locale: string): string => {
  if (!start || !end) return '';
  const [ys, ms, ds] = start.split('-').map(Number);
  const [ye, me, de] = end.split('-').map(Number);
  const s = new Date(ys, ms - 1, ds);
  const e = new Date(ye, me - 1, de);
  const sameYear  = ys === ye;
  const sameMonth = sameYear && ms === me;
  if (sameMonth) return `${ds} → ${e.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  if (sameYear)  return `${s.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} → ${e.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return `${s.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })} → ${e.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

// ── SVG occupancy ring ───────────────────────────────────────────────────────
const OccupancyRing = ({ pct, present, total }: { pct: number; present: number; total?: number }) => {
  const { t } = useTranslation();
  const r = 42, circ = 2 * Math.PI * r;
  const filled = ((Math.min(pct, 100)) / 100) * circ;
  const color  = pct >= 80 ? '#4ade80' : pct >= 50 ? '#fbbf24' : '#93c5fd';
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="104" height="104" viewBox="0 0 106 106" className="block">
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

// ── Occupation 7 jours — rendu des barres ────────────────────────────────────
// Passé : violet clair plein · aujourd'hui : violet cachet · futur : pointillés (projection).
const OccupancyChart = ({ data }: { data: OccupancyDay[] }) => (
  <div className="flex items-end gap-1.5 h-28 w-full">
    {data.map((d) => {
      const pct = Math.max(Math.min(d.rate, 100), 2);
      const color = d.is_today ? '#5346A8' : '#AFA9EC';
      return (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1 h-full justify-end">
          <span
            className="text-[10px] font-semibold leading-none tabular-nums"
            style={{ color: d.is_today ? '#5346A8' : d.is_future ? '#C4BFF0' : '#9CA3AF' }}
          >
            {Math.round(d.rate)}%
          </span>
          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: `${pct}%`,
              ...(d.is_future
                ? { border: '2px dashed #AFA9EC', background: 'transparent' }
                : { background: color }),
            }}
          />
          <span
            className="text-[9px] leading-none truncate"
            style={{ color: d.is_today ? '#5346A8' : '#9CA3AF', fontWeight: d.is_today ? 700 : 400, opacity: d.is_future ? 0.7 : 1 }}
          >
            {d.label}
          </span>
        </div>
      );
    })}
  </div>
);

// ── Occupation — carte navigable semaine par semaine ─────────────────────────
const OccupancyCard = ({ initial, property, roomCount }: {
  initial: OccupancyDay[]; property: string; roomCount: number;
}) => {
  const { t, i18n } = useTranslation();
  const locale = localeFor(i18n.language);
  const [offset, setOffset] = useState(0);

  // offset 0 = fenêtre courante déjà fournie par le dashboard (aucune requête).
  // Semaines passées : fetch dédié (offset < 0), sans projection.
  const { data: win, isFetching } = useQuery({
    queryKey: ['occupancy', offset],
    queryFn: () => dashboardApi.occupancy(offset),
    enabled: offset !== 0,
    placeholderData: (prev) => prev,
  });

  const days  = offset === 0 ? initial : (win?.occupancy ?? []);
  const start = days[0]?.date ?? '';
  const end   = days[days.length - 1]?.date ?? '';

  const goOlder = () => setOffset((o) => o - 1);
  const goNewer = () => setOffset((o) => Math.min(0, o + 1));

  // Swipe horizontal : vers la droite = passé, vers la gauche = revenir.
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx > 0) goOlder(); else goNewer();
  };

  const subtitle = offset === 0
    ? t('hotelDashboard.occupancy7dSubtitle', { property, count: roomCount })
    : t('hotelDashboard.occupancy7dSubtitlePast', { property, count: roomCount });

  const iconBtn = 'flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <Card>
      <CardHeader className="mb-2">
        <CardTitle>
          <button
            type="button"
            onClick={() => setOffset(0)}
            disabled={offset === 0}
            className="flex items-center gap-2 disabled:cursor-default"
            title={offset !== 0 ? t('hotelDashboard.occThisWeek') : undefined}
          >
            <TrendingUp className="h-4 w-4 text-gray-400" />
            {t('hotelDashboard.occupancy7d')}
          </button>
        </CardTitle>
        <div className="flex items-center gap-1">
          {offset !== 0 && (
            <button
              type="button"
              onClick={() => setOffset(0)}
              className="rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{ background: '#EEEBFA', color: '#5346A8' }}
            >
              {t('hotelDashboard.occThisWeek')}
            </button>
          )}
          <button type="button" onClick={goOlder} aria-label={t('hotelDashboard.occPrevWeek')} className={`${iconBtn} hover:bg-warm-100`}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={goNewer} disabled={offset === 0} aria-label={t('hotelDashboard.occNextWeek')} className={`${iconBtn} hover:bg-warm-100`}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>

      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs text-gray-400 truncate">{subtitle}</p>
        <p className="text-xs font-semibold shrink-0" style={{ color: '#5346A8' }}>{fmtRangeLabel(start, end, locale)}</p>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="pt-1"
        style={{ touchAction: 'pan-y', opacity: isFetching ? 0.45 : 1, transition: 'opacity 0.2s ease' }}
      >
        {days.length > 0
          ? <OccupancyChart data={days} />
          : <div className="h-28 animate-pulse rounded-md bg-gray-100" />}
      </div>
    </Card>
  );
};

// ── Compact stat tile (compliance-oriented) ──────────────────────────────────
const StatTile = ({
  icon: Icon, label, value, accent, emphasis, onClick,
}: {
  icon: React.ElementType; label: string; value: number | string; accent: string;
  emphasis?: boolean; onClick?: () => void;
}) => {
  const inner = (
    <>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: accent + '20' }}>
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-black leading-none tabular-nums" style={{ color: emphasis ? accent : '#111827' }}>{value}</p>
        <p className="text-[11px] font-medium leading-snug mt-1" style={{ color: '#6B7280' }}>{label}</p>
      </div>
    </>
  );
  const base = 'flex items-center gap-3 rounded-card bg-white p-3 shadow-card text-start';
  return onClick
    ? (
      <button
        onClick={onClick}
        className={`${base} w-full transition-transform active:scale-[0.98]`}
        style={emphasis ? { border: `1px solid ${accent}66` } : undefined}
      >
        {inner}
      </button>
    )
    : <div className={base}>{inner}</div>;
};

// ── Récap par propriété — commun aux deux rôles (règle transverse n°1) ──────
// Hauteur fixe : 5 établissements max visibles, scroll interne au-delà, l'actif
// est toujours ramené dans la vue à l'ouverture.
const PropertiesSummaryCard = ({
  summary, others, onSwitch,
}: {
  summary: NonNullable<DashboardData['properties_summary']>;
  others?: DashboardData['other_properties'];
  onSwitch: (id: string, name: string) => void;
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const overflowing = summary.length > 5;

  useEffect(() => {
    if (overflowing && activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [overflowing]);

  return (
    <Card>
      <p className="label mb-2">{t('hotelDashboard.propertiesRecap')}</p>
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex flex-col gap-1.5 overflow-y-auto scrollbar-none"
          // ~5 lignes visibles ; au-delà, scroll interne.
          style={{ maxHeight: '17.5rem' }}
        >
          {summary.map((p) => (
            <button
              key={p.id}
              ref={p.is_active ? activeRef : undefined}
              onClick={() => !p.is_active && onSwitch(p.id, p.name)}
              className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-start transition-all shrink-0"
              style={{
                border: p.is_active ? '2px solid #5346A8' : '1px solid #F3F4F6',
                background: p.is_active ? 'rgba(83,70,168,0.06)' : '#fff',
                cursor: p.is_active ? 'default' : 'pointer',
              }}
            >
              <span className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 shrink-0" style={{ color: p.is_active ? '#5346A8' : '#9CA3AF' }} />
                <span className="text-sm font-semibold text-gray-900 truncate">{p.name}</span>
              </span>
              <span className="flex items-center gap-2.5 shrink-0 text-xs">
                <span className="font-bold tabular-nums" style={{ color: p.occupancy_rate >= 80 ? '#1F9D6B' : '#5346A8' }}>{p.occupancy_rate}%</span>
                <span className="text-gray-400">{t('hotelDashboard.presentCount', { count: p.present })}</span>
                {p.is_active
                  ? <span className="h-4 w-4 shrink-0" />
                  : <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />}
              </span>
            </button>
          ))}
        </div>
        {/* Dégradé bas — indique qu'il y a plus de contenu à faire défiler. */}
        {overflowing && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-xl"
            style={{ background: 'linear-gradient(to top, #fff, rgba(255,255,255,0))' }}
          />
        )}
      </div>
      {others && (others.arrivals > 0 || others.departures > 0) && (
        <p className="text-xs text-gray-400 mt-2">
          {t('hotelDashboard.otherPropsToday', { arrivals: others.arrivals, departures: others.departures })}
        </p>
      )}
    </Card>
  );
};

// ── Arrivées / Départs du jour — listes actionnables ────────────────────────
const MovementRow = ({
  name, sub, badge, onClick,
}: { name: string; sub: string; badge?: React.ReactNode; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-start hover:bg-warm-100 transition-colors"
    style={{ border: '1px solid #F3F4F6' }}
  >
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
      <p className="text-xs text-gray-400 truncate">{sub}</p>
    </div>
    {badge}
    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
  </button>
);

const ArrivalsDeparturesCard = ({ d }: { d: DashboardData }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const arrivals   = d.arrivals_today ?? [];
  const departures = d.departures_today_list ?? [];

  // Ligne compacte unique quand il n'y a ni arrivée ni départ (évite deux gros
  // blocs vides qui prennent toute la hauteur).
  if (!arrivals.length && !departures.length) {
    return (
      <Card className="flex items-center gap-3 py-3.5">
        <CalendarCheck className="h-5 w-5 shrink-0" style={{ color: '#5346A8' }} />
        <p className="text-sm text-gray-500">{t('hotelDashboard.todayNoMovement')}</p>
      </Card>
    );
  }

  const Column = ({
    icon: Icon, title, count, children,
  }: { icon: React.ElementType; title: string; count: number; children: React.ReactNode }) => (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: '#5346A8' }} />
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#EEEBFA', color: '#5346A8' }}>{count}</span>
      </div>
      {children}
    </div>
  );

  return (
    <Card>
      <div className="flex flex-col md:flex-row gap-5">
        <Column icon={LogIn} title={t('hotelDashboard.arrivalsToday')} count={arrivals.length}>
          {arrivals.map((a) => (
            <MovementRow
              key={a.id}
              name={a.guest_name || a.reference}
              sub={`${a.room ?? t('hotelDashboard.noRoom')}${a.booking_reference ? ` · ${a.booking_reference}` : ''} · ${t('hotelDashboard.personsCount', { count: a.adults_count + a.children_count })}`}
              // Brouillon → reprise du check-in ; fiche active → détail de la fiche.
              onClick={() => navigate(a.status === 'draft' ? `/hotel/check-ins/new?resume=${a.id}` : `/hotel/history/${a.id}`)}
            />
          ))}
          {!arrivals.length && <p className="text-sm text-gray-400 py-3 text-center">{t('hotelDashboard.noArrivalToday')}</p>}
        </Column>
        <div className="hidden md:block w-px self-stretch" style={{ background: '#F3F4F6' }} />
        <Column icon={LogOut} title={t('hotelDashboard.departuresToday')} count={departures.length}>
          {departures.map((dep) => (
            <MovementRow
              key={dep.id}
              name={dep.guest_name || dep.reference}
              sub={`${dep.room ?? t('hotelDashboard.noRoom')} · ${dep.reference}`}
              badge={
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: '#FBF0D7', color: '#8A6206' }}>
                  {t('hotelDashboard.departureNotConfirmed')}
                </span>
              }
              onClick={() => navigate(`/hotel/history/${dep.id}`)}
            />
          ))}
          {!departures.length && <p className="text-sm text-gray-400 py-3 text-center">{t('hotelDashboard.noDepartureToday')}</p>}
        </Column>
      </div>
    </Card>
  );
};

// ── Aperçu du mois — analytique, Manager uniquement (non actionnable) ───────
// Deux indicateurs discrets sous le graphe : ils informent sans encombrer la
// grille de conformité.
const MonthInsightsCard = ({ insights }: { insights: NonNullable<DashboardData['month_insights']> }) => {
  const { t, i18n } = useTranslation();
  const nat    = insights.top_nationality;
  const nights = insights.avg_stay_nights;
  const flag   = nat ? getFlagUrl(nat.code) : null;

  // Durée moyenne de séjour (nuits) — nombre localisé + unité.
  const stayText = nights == null
    ? '—'
    : `${Number(nights).toLocaleString(localeFor(i18n.language))} ${t('hotelDashboard.nightsUnit')}`;

  return (
    <Card>
      <p className="label mb-2.5">{t('hotelDashboard.monthInsights')}</p>
      <div className="grid grid-cols-2 gap-3">
        {/* Top nationalité */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden" style={{ background: '#EEEBFA' }}>
            {flag
              ? <img src={flag} alt={nat!.code} width={22} className="rounded-sm" style={{ border: '1px solid rgba(0,0,0,0.1)' }} />
              : <Globe className="h-4 w-4" style={{ color: '#5346A8' }} />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {nat ? nat.code : '—'}
              {nat && <span className="ms-1.5 text-xs font-semibold text-gray-400 tabular-nums">{nat.count}</span>}
            </p>
            <p className="text-[11px] text-gray-400 leading-snug">{t('hotelDashboard.topNationality')}</p>
          </div>
        </div>

        {/* Durée moyenne de séjour */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: '#E4F5EC' }}>
            <Moon className="h-4 w-4" style={{ color: '#1F9D6B' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{stayText}</p>
            <p className="text-[11px] text-gray-400 leading-snug">{t('hotelDashboard.avgStay')}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

// ── Dashboard ────────────────────────────────────────────────────────────────
const EMPTY_DASH: DashboardData = {
  today: { arrivals_expected: 0, arrivals_done: 0, currently_present: 0, departures_today: 0, departures_tomorrow: 0, drafts_pending: 0, occupancy_rate: 0 },
  month: { check_ins_total: 0 },
  weekly_trend:    [],
  expiry_alerts:   [],
  subscription:    { status: 'none', expires_at: undefined, days_remaining: undefined, plan: undefined },
  recent_check_ins: [],
};

export const DashboardPage = () => {
  const { t, i18n } = useTranslation();
  const navigate    = useNavigate();
  const { user, activePropertyId, activePropertyName, setActiveProperty } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', activePropertyId],
    queryFn: dashboardApi.get,
    refetchInterval: 60_000,
  });

  const d   = data ?? EMPTY_DASH;
  const sub = d.subscription;
  const isTrial = sub.status === 'trial';
  const isSubWarning =
    sub.status !== 'none' &&
    ((sub.status !== 'active' && sub.status !== 'trial')
      || (isTrial && (sub.days_remaining ?? 99) <= 2)
      || (sub.status === 'active' && (sub.days_remaining ?? 99) <= 7));
  const hasAlerts          = d.expiry_alerts.length > 0;
  const securityHitCount   = d.pending_watchlist_hits ?? 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('hotelDashboard.greetingMorning');
    if (h < 18) return t('hotelDashboard.greetingAfternoon');
    return t('hotelDashboard.greetingEvening');
  };

  const dateLocale = localeFor(i18n.language);

  // Brouillons non soumis = fiches non transmises → conformité prioritaire.
  const drafts = d.today.drafts_pending;

  // Aperçu analytique du mois — réservé au Manager (absent du DOM réceptionniste).
  const isManager = user?.role === 'hotel_admin';
  const insights = d.month_insights;
  const hasInsights = !!insights && (insights.top_nationality != null || insights.avg_stay_nights != null);

  return (
    <HotelLayout title={t('hotelDashboard.title')}>
      <div className="flex flex-col gap-4 pb-4">

        {/* ── Hero: greeting + occupancy ring + CTA plein largeur ── */}
        <div className="px-4 pt-5 pb-5 flex flex-col gap-4" style={{ background: 'var(--qayed-cachet)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {greeting()}
              </p>
              <h1 className="qayed-display text-xl text-white truncate">
                {user?.first_name ?? t('hotelDashboard.welcome')}
              </h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>

              {/* Quick stats row */}
              <div className="flex gap-4 mt-3">
                <div className="flex flex-col" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  <span className="text-lg font-black leading-none tabular-nums">{d.today.arrivals_expected}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wide mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{t('hotelDashboard.arrivals')}</span>
                </div>
                <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.15)' }} />
                <div className="flex flex-col" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  <span className="text-lg font-black leading-none tabular-nums">{d.today.departures_today}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wide mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{t('hotelDashboard.departures')}</span>
                </div>
              </div>
            </div>

            {/* Occupancy ring — entièrement visible, aligné en haut */}
            <div className="shrink-0">
              {isLoading
                ? <div className="h-[104px] w-[104px] rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} />
                : <OccupancyRing
                    pct={d.today.occupancy_rate}
                    present={d.today.currently_present}
                    total={user?.hotel?.room_count ?? undefined}
                  />
              }
            </div>
          </div>

          {/* CTA principal — plein largeur, centré, blanc sur violet, tactile ≥ 48px */}
          <button
            onClick={() => navigate('/hotel/check-ins/new')}
            className="flex w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
            style={{ background: '#fff', color: '#5346A8', minHeight: 48, boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}
          >
            <Plus className="h-5 w-5" />
            {t('hotelDashboard.newCheckin')}
          </button>
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
                  {sub.status !== 'active' && sub.status !== 'trial'
                    ? t('hotelDashboard.subInactive')
                    : isTrial
                      ? t('hotelDashboard.trialExpiresIn', { count: sub.days_remaining })
                      : t('hotelDashboard.subExpiresIn', { count: sub.days_remaining })}
                </p>
                <p className="text-xs text-amber-600 mt-0.5">{t('hotelDashboard.contactSupport')}</p>
              </div>
            </div>
          )}

          {/* Bandeau quota check-ins (grille V2) — jamais bloquant : à 80 %
              informatif, à 100 %+ persistant (ambre vigilance) avec compteur
              de dépassement et CTA plan supérieur. Comptes illimités : rien. */}
          {(() => {
            const q = d.quota;
            if (!q || q.unlimited || q.quota == null || q.quota < 1) return null;
            const reached = q.used >= q.quota;
            const warn80 = !reached && q.used * 5 >= q.quota * 4;
            if (!reached && !warn80) return null;
            return (
              <div
                className="flex items-start gap-3 rounded-xl p-3"
                style={reached
                  ? { background: '#FBF0D7', border: '1px solid #E3A008' }
                  : { background: '#EEEBFA', border: '1px solid #C9C1EE' }}
              >
                <Gauge className="mt-0.5 h-4 w-4 shrink-0" style={{ color: reached ? '#E3A008' : '#5346A8' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: reached ? '#8A6206' : '#443896' }}>
                    {reached
                      ? (q.used > q.quota
                        ? t('hotelDashboard.quotaOverage', { over: q.used - q.quota, quota: q.quota })
                        : t('hotelDashboard.quotaReached', { quota: q.quota }))
                      : t('hotelDashboard.quotaWarning', { used: q.used, quota: q.quota })}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: reached ? '#8A6206' : '#5346A8' }}>
                    {reached
                      ? (q.billable && q.overage_amount != null && q.overage_amount > 0
                        ? t('hotelDashboard.quotaOverageBilled', { bundles: q.bundle_count, amount: formatTNDAmount(q.overage_amount) })
                        : t('hotelDashboard.quotaNeverBlocked'))
                      : t('hotelDashboard.quotaWarningHint')}
                  </p>
                  {reached && (
                    <button
                      onClick={() => navigate('/hotel/settings?tab=abonnement')}
                      className="mt-2 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all active:scale-[0.98]"
                      style={{ background: '#5346A8' }}
                    >
                      {t('hotelDashboard.quotaUpgradeCta')}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Récap par propriété — sélecteur unique d'établissement (chips supprimés) */}
          {(d.properties_summary?.length ?? 0) > 1 && (
            <PropertiesSummaryCard
              summary={d.properties_summary!}
              others={d.other_properties}
              onSwitch={setActiveProperty}
            />
          )}

          {/* Arrivées / Départs du jour — listes actionnables (ou ligne compacte si vide) */}
          {isLoading
            ? <div className="h-20 animate-pulse rounded-card bg-gray-100" />
            : <ArrivalsDeparturesCard d={d} />}

          {/* Rangée de stats compacte — orientée conformité */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-16 animate-pulse rounded-card bg-gray-100" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                icon={FileWarning}
                label={t('hotelDashboard.statDraftsPending')}
                value={drafts}
                accent={drafts > 0 ? '#E3A008' : '#1F9D6B'}
                emphasis={drafts > 0}
                onClick={drafts > 0 ? () => navigate('/hotel/history?status=draft') : undefined}
              />
              <StatTile icon={DoorOpen}      label={t('hotelDashboard.statPresent')}            value={d.today.currently_present}   accent="#443896" />
              <StatTile icon={CalendarClock} label={t('hotelDashboard.statDeparturesTomorrow')} value={d.today.departures_tomorrow} accent="#5346A8" />
              <StatTile icon={TrendingUp}    label={t('hotelDashboard.statCheckinsMonth')}      value={d.month.check_ins_total}     accent="#8B7FE0" />
            </div>
          )}

          {/* Occupation 7 jours — navigable semaine par semaine */}
          {(d.occupancy_7d?.length ?? 0) > 0 && (
            <OccupancyCard
              initial={d.occupancy_7d!}
              property={activePropertyName ?? user?.hotel?.name ?? ''}
              roomCount={d.room_count ?? user?.hotel?.room_count ?? 0}
            />
          )}

          {/* Aperçu du mois — analytique, Manager uniquement */}
          {isManager && hasInsights && <MonthInsightsCard insights={insights!} />}

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
