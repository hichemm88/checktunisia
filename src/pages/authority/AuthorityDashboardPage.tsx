import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, ArrowDownToLine, ArrowUpFromLine, Building2,
  AlertTriangle, Globe2, TrendingUp, Clock, MapPin,
} from 'lucide-react';
import { AuthorityLayout } from '@/components/layout/AuthorityLayout';
import { Card } from '@/components/ui/Card';
import { authorityApi } from '@/api/authority';
import { AuthorityDashboardMinistry, AuthorityDashboardPolice } from '@/types';
import { useAuthStore } from '@/stores/authStore';

// ─── Shared KPI tile ─────────────────────────────────────────────────────────
const KpiTile = ({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) => (
  <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-card">
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
      style={{ background: `${color}18` }}
    >
      <Icon className="h-6 w-6" style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide truncate">{label}</p>
      <p className="mt-0.5 text-2xl font-bold" style={{ color: '#5346A8' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Weekly trend bar chart ───────────────────────────────────────────────────
const WeeklyTrend = ({ trend }: { trend: Array<{ date: string; label: string; count: number }> }) => {
  const max = Math.max(...trend.map((t) => t.count), 1);
  return (
    <div className="flex items-end justify-between gap-2 h-24">
      {trend.map((t) => (
        <div key={t.date} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] text-gray-400">{t.count}</span>
          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: `${Math.max((t.count / max) * 80, 4)}px`,
              background: 'var(--qayed-cachet)',
            }}
          />
          <span className="text-[10px] text-gray-400 capitalize">{t.label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Nationality pill row ─────────────────────────────────────────────────────
const NationalityList = ({ items }: { items: Array<{ nationality_code: string; count: number }> }) => {
  const total = items.reduce((s, n) => s + n.count, 0);
  return (
    <div className="flex flex-col gap-2">
      {items.map((n) => (
        <div key={n.nationality_code} className="flex items-center gap-3">
          <span className="w-10 text-xs font-mono font-semibold text-gray-700">{n.nationality_code}</span>
          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round((n.count / total) * 100)}%`,
                background: 'var(--qayed-cachet)',
              }}
            />
          </div>
          <span className="w-8 text-right text-xs text-gray-500">{n.count}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Ministry view ───────────────────────────────────────────────────────────
const MinistryDashboard = ({ data }: { data: AuthorityDashboardMinistry }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile icon={Users}          label="Voyageurs présents" value={data.active_guests}    color="#5346A8" />
        <KpiTile icon={ArrowDownToLine} label="Arrivées aujourd'hui" value={data.check_ins_today}  color="#137453" />
        <KpiTile icon={ArrowUpFromLine} label="Départs aujourd'hui" value={data.check_outs_today} color="#8B7FE0" />
        <KpiTile icon={Building2}      label="Établissements actifs" value={data.active_hotels}   color="#5346A8" />
        <KpiTile
          icon={AlertTriangle}
          label="Docs expirant ≤ 30j"
          value={data.expiring_docs_30d}
          color={data.expiring_docs_30d > 0 ? '#5346A8' : '#6B7280'}
          sub={data.expiring_docs_30d > 0 ? 'Voir alertes →' : undefined}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Weekly trend */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4" style={{ color: '#5346A8' }} />
            <p className="text-sm font-semibold" style={{ color: '#5346A8' }}>Tendance 7 jours</p>
          </div>
          <WeeklyTrend trend={data.weekly_trend} />
        </Card>

        {/* Top nationalities */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Globe2 className="h-4 w-4" style={{ color: '#5346A8' }} />
            <p className="text-sm font-semibold" style={{ color: '#5346A8' }}>Nationalités présentes</p>
          </div>
          <NationalityList items={data.top_nationalities} />
        </Card>
      </div>

      {/* By governorate */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" style={{ color: '#5346A8' }} />
            <p className="text-sm font-semibold" style={{ color: '#5346A8' }}>Répartition par gouvernorat</p>
          </div>
          <span className="text-xs text-gray-400">{data.by_governorate.length} gouvernorats</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-2 text-left text-xs font-medium text-gray-400">Gouvernorat</th>
                <th className="py-2 text-right text-xs font-medium text-gray-400">Établissements</th>
                <th className="py-2 text-right text-xs font-medium text-gray-400">Voyageurs présents</th>
              </tr>
            </thead>
            <tbody>
              {data.by_governorate.map((row) => (
                <tr
                  key={row.governorate}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/authority/hotels?governorate=${encodeURIComponent(row.governorate)}`)}
                >
                  <td className="py-2.5 font-medium text-gray-800">{row.governorate || '—'}</td>
                  <td className="py-2.5 text-right text-gray-500">{row.hotels}</td>
                  <td className="py-2.5 text-right">
                    <span
                      className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ background: '#EEEBFA', color: '#5346A8' }}
                    >
                      {row.active_guests}
                    </span>
                  </td>
                </tr>
              ))}
              {data.by_governorate.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-400 text-sm">
                    Aucune donnée disponible
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─── Police view ─────────────────────────────────────────────────────────────
const PoliceDashboard = ({ data }: { data: AuthorityDashboardPolice }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      {/* Zone header */}
      {data.governorate && (
        <div
          className="flex items-center gap-3 rounded-2xl px-5 py-4"
          style={{ background: 'var(--qayed-cachet)' }}
        >
          <MapPin className="h-5 w-5 text-white/70 shrink-0" />
          <div>
            <p className="text-xs text-white/60 font-medium uppercase tracking-wide">Zone de compétence</p>
            <p className="text-lg font-bold text-white">{data.governorate}</p>
          </div>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiTile icon={Users}          label="Voyageurs présents" value={data.active_guests}    color="#5346A8" />
        <KpiTile icon={ArrowDownToLine} label="Arrivées aujourd'hui" value={data.check_ins_today}  color="#137453" />
        <KpiTile icon={ArrowUpFromLine} label="Départs aujourd'hui" value={data.check_outs_today} color="#8B7FE0" />
        <KpiTile icon={Building2}      label="Établissements zone" value={data.hotels_in_zone}   color="#5346A8" />
      </div>

      {/* Alert card for expiring docs */}
      {data.expiring_docs_30d > 0 && (
        <button
          onClick={() => navigate('/authority/alerts')}
          className="flex items-center gap-4 rounded-2xl p-5 text-left transition-shadow hover:shadow-md w-full"
          style={{ background: '#FFF8EE', border: '1px solid #5346A855' }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: '#5346A820' }}
          >
            <AlertTriangle className="h-5 w-5" style={{ color: '#5346A8' }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: '#8A6206' }}>
              {data.expiring_docs_30d} document{data.expiring_docs_30d > 1 ? 's' : ''} expirant dans 30 jours
            </p>
            <p className="text-sm" style={{ color: '#B07820' }}>Cliquer pour voir les alertes →</p>
          </div>
        </button>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Nationalities present */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Globe2 className="h-4 w-4" style={{ color: '#5346A8' }} />
            <p className="text-sm font-semibold" style={{ color: '#5346A8' }}>Nationalités dans la zone</p>
          </div>
          {data.nationalities.length > 0
            ? <NationalityList items={data.nationalities} />
            : <p className="text-sm text-gray-400 py-4 text-center">Aucun voyageur présent</p>
          }
        </Card>

        {/* Recent arrivals */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4" style={{ color: '#5346A8' }} />
            <p className="text-sm font-semibold" style={{ color: '#5346A8' }}>Arrivées récentes (24h)</p>
          </div>
          <div className="flex flex-col gap-2">
            {data.recent_arrivals.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">Aucune arrivée dans les 24 dernières heures</p>
            )}
            {data.recent_arrivals.map((arrival) => (
              <button
                key={arrival.check_in_id}
                onClick={() => navigate(`/authority/guests`)}
                className="flex items-center justify-between rounded-xl p-3 text-left hover:bg-gray-50 transition-colors w-full"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: '#5346A8' }}
                  >
                    {arrival.guest_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{arrival.guest_name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {arrival.hotel}{arrival.room ? ` · Ch. ${arrival.room}` : ''}
                      {arrival.guests_count > 1 ? ` · ${arrival.guests_count} pers.` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-2">{arrival.check_in_date}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export const AuthorityDashboardPage = () => {
  const { user } = useAuthStore();
  const profile   = user?.authority_profile;
  const isMinistry = profile?.org_type === 'ministry';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['authority-dashboard'],
    queryFn: () => authorityApi.getDashboard(),
    staleTime: 2 * 60 * 1000, // 2 min
  });

  const pageTitle = isMinistry
    ? 'Tableau de bord national'
    : `Tableau de bord — ${profile?.governorate ?? 'Zone'}`;

  return (
    <AuthorityLayout title={pageTitle}>
      {isLoading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/60" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-red-600 font-medium">Impossible de charger le tableau de bord.</p>
          <p className="text-sm text-red-400 mt-1">Vérifiez votre connexion et réessayez.</p>
        </div>
      )}

      {data && data.type === 'ministry' && (
        <MinistryDashboard data={data as AuthorityDashboardMinistry} />
      )}
      {data && data.type === 'police' && (
        <PoliceDashboard data={data as AuthorityDashboardPolice} />
      )}
    </AuthorityLayout>
  );
};
