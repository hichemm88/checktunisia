import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Receipt, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import {
  adminMetaCostsApi,
  type MetaCostPeriod,
  type MetaCategoryFilter,
  type MetaCategorySummary,
  type MetaCostSource,
} from '@/api/admin/metaCosts';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { formatUSD, formatTNDAmount } from '@/lib/money';

const PERIODS: MetaCostPeriod[] = ['current_month', 'last_month', 'last_30d'];
const CATEGORIES: MetaCategoryFilter[] = ['all', 'utility', 'authentication', 'marketing', 'service'];

/**
 * Badge de provenance des montants.
 *
 * Il ne décore pas : « réel Meta » et « estimation » ne se décident pas
 * pareil. L'estimation applique un tarif Tunisie uniforme et ignore les
 * paliers de volume ; elle peut se tromper de plusieurs pourcents sans que
 * rien ne le signale. Afficher la source à côté du chiffre est le minimum
 * pour qu'on sache ce qu'on regarde.
 */
const SourceBadge = ({ source }: { source: MetaCostSource }) => {
  const { t } = useTranslation();
  const real = source === 'meta';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold"
      style={
        real
          ? { background: 'var(--qayed-conforme)18', color: 'var(--qayed-conforme)' }
          : { background: 'var(--qayed-vigilance-fond)', color: 'var(--qayed-vigilance-texte)' }
      }
    >
      {t(real ? 'metaCosts.sourceMeta' : 'metaCosts.sourceEstimate')}
    </span>
  );
};

/** Carte de synthèse d'une catégorie (messages, coût, tarif unitaire). */
const CategoryCard = ({ c, titleKey }: { c: MetaCategorySummary | undefined; titleKey: string }) => {
  const { t } = useTranslation();
  const free = Number(c?.unit_price_usd ?? 0) === 0;
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{t(titleKey)}</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-400">{t('metaCosts.deliveredMessages')}</p>
          <p className="font-mono text-2xl font-extrabold text-gray-900">{c?.messages ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">{t('metaCosts.cost')}</p>
          <p className="font-mono text-2xl font-extrabold text-gray-900">{formatUSD(c?.cost_usd, 4)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">{t('metaCosts.unitPrice')}</p>
          <p className="font-mono text-sm font-semibold text-gray-700">{formatUSD(c?.unit_price_usd, 4)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">{t('metaCosts.billingRule')}</p>
          <p
            className="font-mono text-sm font-semibold"
            style={{ color: free ? 'var(--qayed-conforme)' : 'var(--qayed-cachet)' }}
          >
            {t(free ? 'metaCosts.freeToday' : 'metaCosts.perDelivered')}
          </p>
        </div>
      </div>
    </div>
  );
};

export const AdminMetaCostsPage = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<MetaCostPeriod>('current_month');
  const [category, setCategory] = useState<MetaCategoryFilter>('all');

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['admin-meta-costs-summary', period],
    queryFn: () => adminMetaCostsApi.summary(period),
  });
  const { data: byEstab } = useQuery({
    queryKey: ['admin-meta-costs-by-establishment', period, category],
    queryFn: () => adminMetaCostsApi.byEstablishment(period, category),
  });
  const { data: daily } = useQuery({
    queryKey: ['admin-meta-costs-daily', 30, category],
    queryFn: () => adminMetaCostsApi.daily(30, category),
  });

  const byCategory = (name: MetaCategorySummary['category']) =>
    summary?.categories.find((c) => c.category === name);
  const utility = byCategory('utility');
  const authentication = byCategory('authentication');

  const days = daily?.series ?? [];
  const maxCount = Math.max(1, ...days.map((d) => d.total_count));

  // Variation contre le mois précédent. Sans base, une variation en pourcentage
  // n'a aucun sens : on n'en affiche pas plutôt que d'afficher « +∞ ».
  const previous = Number(summary?.previous_month_cost_usd ?? 0);
  const current = Number(summary?.total_cost_usd ?? 0);
  const delta = previous > 0 ? ((current - previous) / previous) * 100 : null;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center gap-2">
        <Receipt className="h-5 w-5" style={{ color: 'var(--qayed-cachet)' }} />
        <h1 className="qayed-display text-xl text-gray-900">{t('metaCosts.pageTitle')}</h1>
      </div>

      {summary && !summary.pricing_configured && (
        <div
          className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: 'var(--qayed-vigilance-fond)', color: 'var(--qayed-vigilance-texte)' }}
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{t('metaCosts.pricingNotConfiguredLong')}</span>
        </div>
      )}

      {/* Sélecteurs période + catégorie */}
      <div className="flex flex-wrap gap-3">
        <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-white p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${period === p ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
              style={period === p ? { background: 'var(--qayed-cachet)' } : undefined}
            >
              {t(`metaCosts.period.${p}`)}
            </button>
          ))}
        </div>
        <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-white p-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${category === c ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
              style={category === c ? { background: 'var(--qayed-cachet)' } : undefined}
            >
              {t(`metaCosts.category.${c}`)}
            </button>
          ))}
        </div>
      </div>

      {loadingSummary && <ListSkeleton rows={2} height="h-28" />}

      {summary && (
        <>
          {/* Total + provenance + dernière synchro */}
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('metaCosts.totalCost')}</p>
              <div className="flex items-center gap-2">
                <SourceBadge source={summary.source} />
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <RefreshCw className="h-3 w-3" />
                  {summary.last_meta_sync_at
                    ? t('metaCosts.lastSyncAt', { date: new Date(summary.last_meta_sync_at).toLocaleString('fr-FR') })
                    : t('metaCosts.neverSynced')}
                </span>
              </div>
            </div>
            <p className="font-mono text-4xl font-extrabold text-gray-900">{formatUSD(summary.total_cost_usd, 4)}</p>
            {/* Le stockage et la facture Meta sont en USD : la valeur en dinars
                est une commodité de lecture, et le « ≈ » le dit. */}
            <p className="mt-1 font-mono text-sm text-gray-500">
              ≈ {formatTNDAmount(summary.total_cost_tnd)} TND
              <span className="ms-2 text-xs font-normal text-gray-400">
                {t('metaCosts.rateHint', { rate: summary.usd_to_tnd })}
              </span>
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {t('metaCosts.messagesDelivered', { count: summary.total_messages })}
              {'  ·  '}
              {t('metaCosts.avgPerMessage', { amount: formatUSD(summary.avg_cost_per_message_usd, 5) })}
              {delta !== null && (
                <>
                  {'  ·  '}
                  <span style={{ color: delta > 0 ? 'var(--qayed-vigilance-texte)' : 'var(--qayed-conforme)' }}>
                    {t('metaCosts.vsPreviousMonth', { rate: `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` })}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Les deux catégories que nous envoyons réellement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CategoryCard c={utility} titleKey="metaCosts.utilityLabel" />
            <CategoryCard c={authentication} titleKey="metaCosts.authenticationLabel" />
          </div>

          {/* Graphique de la période */}
          <div className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-bold text-gray-800">{t('metaCosts.chartTitle')}</p>
              {daily && <SourceBadge source={daily.source} />}
            </div>
            {days.length === 0 || maxCount === 1 ? (
              <p className="text-xs text-gray-400 py-8 text-center">{t('metaCosts.noData')}</p>
            ) : (
              <div className="flex items-end gap-1 h-28">
                {days.map((d) => {
                  const total = d.total_count;
                  const utilityPct = total > 0 ? (d.utility_count / total) * 100 : 0;
                  return (
                    <div key={d.date} className="flex-1 group relative flex flex-col justify-end h-full">
                      <div
                        className="w-full rounded-sm overflow-hidden flex flex-col"
                        style={{ height: `${Math.max(3, (total / maxCount) * 100)}%`, opacity: total === 0 ? 0.15 : 1 }}
                      >
                        <div style={{ height: `${100 - utilityPct}%`, background: 'var(--qayed-conforme)' }} />
                        <div style={{ height: `${utilityPct}%`, background: 'var(--qayed-cachet)' }} />
                      </div>
                      <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-xs text-white z-10">
                        <span className="font-mono">
                          {t('metaCosts.utilityLabel')} {d.utility_count} · {t('metaCosts.authenticationLabel')} {d.authentication_count}
                        </span>
                        <span className="font-mono">{formatUSD(d.total_cost_usd, 4)}</span>
                        <span>{d.date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: 'var(--qayed-cachet)' }} />
                {t('metaCosts.utilityLabel')}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: 'var(--qayed-conforme)' }} />
                {t('metaCosts.authenticationLabel')}
              </span>
            </div>
          </div>

          {/* Tableau par établissement */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-sm font-bold text-gray-800">{t('metaCosts.byEstablishment')}</p>
            </div>
            {/* Cette vue reste TOUJOURS servie depuis l'estimation locale :
                Meta facture un compte, pas nos clients, et ses analytics ne
                portent aucune ventilation par établissement. */}
            <div className="flex items-start gap-2 px-5 pb-3 text-xs text-gray-400">
              <Info className="h-4 w-4 shrink-0" />
              <span>{t('metaCosts.byEstablishmentNote')}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-5 py-2 font-semibold">{t('metaCosts.establishment')}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t('metaCosts.utilityLabel')}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t('metaCosts.authenticationLabel')}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t('metaCosts.messages')}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t('metaCosts.cost')}</th>
                    <th className="px-5 py-2 text-right font-semibold">{t('metaCosts.avgPerMessageShort')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(byEstab ?? []).map((e) => (
                    <tr key={e.establishment_id ?? 'authority'} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2.5 font-medium text-gray-800 truncate max-w-[220px]">
                        {/* Ligne sans établissement : les codes de connexion des
                            agents, portés par le compte autorité. */}
                        {e.establishment_name ?? (e.establishment_id ? e.establishment_id : t('metaCosts.authorityLine'))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-600">{e.utility_messages}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-600">{e.authentication_messages}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-500">{e.messages}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-900">{formatUSD(e.cost_usd, 4)}</td>
                      <td className="px-5 py-2.5 text-right font-mono text-gray-600">{formatUSD(e.avg_cost_per_message_usd, 5)}</td>
                    </tr>
                  ))}
                  {(byEstab?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">{t('metaCosts.noData')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grille tarifaire — lecture seule, contrairement aux coûts IA :
              elle vient des variables d'environnement, pas d'une table. La
              modifier depuis l'écran donnerait deux sources de vérité pour un
              prix que nous ne fixons pas. */}
          <div className="card p-5">
            <p className="text-sm font-bold text-gray-800 mb-1">{t('metaCosts.pricingTitle')}</p>
            <p className="text-xs text-gray-400 mb-3">{t('metaCosts.pricingHint')}</p>
            {summary.categories.map((c) => (
              <div
                key={c.category}
                className="flex items-center justify-between border-b border-gray-100 py-2.5 last:border-0"
              >
                <p className="text-sm font-semibold text-gray-800">{t(`metaCosts.category.${c.category}`)}</p>
                <span className="font-mono text-sm text-gray-700">
                  {formatUSD(c.unit_price_usd, 4)}
                  <span className="ms-1 text-xs text-gray-400">{t('metaCosts.perMessageUnit')}</span>
                </span>
              </div>
            ))}
            <p className="mt-3 text-xs text-gray-400">{t('metaCosts.serviceNote')}</p>
          </div>
        </>
      )}
    </div>
  );
};
