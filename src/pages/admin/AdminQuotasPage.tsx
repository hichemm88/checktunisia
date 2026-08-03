import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Gauge, Download, TrendingUp } from 'lucide-react';
import { adminQuotasApi, type AdminQuotaRow } from '@/api/admin/subscriptions';
import { formatTNDAmount } from '@/lib/money';
import { ListSkeleton } from '@/components/admin/ListSkeleton';
import { ErrorState } from '@/components/admin/ErrorState';

/**
 * Écran « Quotas » (grille V2) — pilotage commercial de l'upsell : comptes à
 * ≥80 % de leur quota de check-ins ce mois-ci et comptes en dépassement,
 * triés par volume, plus l'historique des dépassements clôturés (facturés ou
 * exclus legacy) avec export CSV.
 */

const QuotaBar = ({ row }: { row: AdminQuotaRow }) => {
  const pct = Math.min(100, row.percent ?? 0);
  const over = row.quota != null && row.used > row.quota;
  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: over ? '#E3A008' : pct >= 80 ? 'var(--qayed-cachet)' : 'var(--qayed-conforme, #1F9D6B)',
          }}
        />
      </div>
      <span className="font-mono text-xs text-gray-600 whitespace-nowrap">{row.used}/{row.quota ?? '∞'}</span>
    </div>
  );
};

const OveragesSection = () => {
  const { t } = useTranslation();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  });
  const { data } = useQuery({
    queryKey: ['admin-quota-overages', month],
    queryFn: () => adminQuotasApi.overages({ month }),
  });

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('adminQuotas.closedOverages')}</p>
        <div className="flex items-center gap-2">
          <input type="month" className="input text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button
            onClick={() => adminQuotasApi.exportCsv(month)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[--qayed-cachet] hover:bg-[--qayed-cachet-dilue]"
          >
            <Download className="h-3.5 w-3.5" /> {t('adminQuotas.exportCsv')}
          </button>
        </div>
      </div>
      {!data?.data?.length && <p className="text-sm text-gray-400 py-2">{t('adminQuotas.noOverage')}</p>}
      {data?.data?.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0 text-sm flex-wrap">
          <div className="min-w-0">
            <Link to="/admin/hosts" className="font-medium text-gray-900 hover:text-[--qayed-cachet]">{c.organization?.name ?? '—'}</Link>
            <p className="text-xs text-gray-400">
              {c.plan ?? '—'} · {t('adminQuotas.overageDetail', { count: c.overage_count, quota: c.quota, bundles: c.bundle_count, size: c.bundle_size })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-semibold">{formatTNDAmount(c.amount)} TND</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              c.status === 'invoiced' ? 'bg-green-50 text-green-700'
              : c.status === 'excluded_legacy' ? 'bg-gray-100 text-gray-500'
              : c.status === 'waived' ? 'bg-gray-100 text-gray-400'
              : 'bg-[--qayed-vigilance-fond] text-[--qayed-vigilance-texte]'
            }`}>
              {t(`adminQuotas.status.${c.status}`)}
            </span>
            {c.invoice_number && <span className="font-mono text-xs text-gray-400">{c.invoice_number}</span>}
          </div>
        </div>
      ))}
    </div>
  );
};

export const AdminQuotasPage = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'warning' | 'overage'>('all');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-quotas', filter],
    queryFn: () => adminQuotasApi.list(filter === 'all' ? undefined : filter),
  });

  return (
    <div className="flex flex-col gap-4 w-full">
      <h1 className="qayed-display text-xl text-gray-900">{t('adminQuotas.title')}</h1>
      <p className="text-sm text-gray-500 -mt-2">{t('adminQuotas.subtitle', { month: data?.meta?.month ?? '' })}</p>

      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--qayed-ligne)' }}>
        {([
          ['all', t('adminQuotas.filterAll')],
          ['warning', `${t('adminQuotas.filterWarning')}${data?.meta ? ` (${data.meta.warning_count})` : ''}`],
          ['overage', `${t('adminQuotas.filterOverage')}${data?.meta ? ` (${data.meta.overage_count})` : ''}`],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading && <ListSkeleton rows={4} />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {data && !data.data.length && (
        <div className="card p-8 text-center text-sm text-gray-400">
          <Gauge className="h-8 w-8 mx-auto mb-3 text-gray-200" />
          {t('adminQuotas.empty')}
        </div>
      )}

      {data?.data?.map((row) => (
        <div key={row.organization_id} className="card p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 truncate">{row.name}</p>
              {row.legacy && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{t('adminQuotas.legacy')}</span>
              )}
              {row.upsell_flagged_at && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--qayed-cachet-dilue, #EEEBFA)', color: 'var(--qayed-cachet, #5346A8)' }}>
                  <TrendingUp className="h-3 w-3" /> {t('adminQuotas.upsellCandidate')}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">{row.plan ?? '—'} · {row.contact_email ?? '—'}</p>
          </div>
          <QuotaBar row={row} />
          <div className="text-end min-w-[130px]">
            {row.quota != null && row.used > row.quota ? (
              <>
                <p className="text-sm font-semibold" style={{ color: '#8A6206' }}>
                  {t('adminQuotas.overageCount', { count: row.overage_count })}
                </p>
                {row.overage_amount != null && (
                  <p className="font-mono text-xs text-gray-500">
                    {t('adminQuotas.estimated', { amount: formatTNDAmount(row.overage_amount) })}
                    {!row.billable && ` · ${t('adminQuotas.notBilled')}`}
                  </p>
                )}
              </>
            ) : (
              <p className="font-mono text-xs text-gray-400">{row.percent}%</p>
            )}
          </div>
        </div>
      ))}

      <OveragesSection />
    </div>
  );
};
