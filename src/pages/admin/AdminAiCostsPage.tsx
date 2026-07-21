import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Cpu, AlertTriangle, Info } from 'lucide-react';
import {
  adminAiCostsApi,
  type AiCostPeriod,
  type AiFeatureFilter,
  type AiFeatureSummary,
  type AiPricing,
} from '@/api/admin/aiCosts';
import { ListSkeleton } from '@/components/admin/ListSkeleton';
import { Button } from '@/components/ui/Button';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { formatUSD } from '@/lib/money';

const PERIODS: AiCostPeriod[] = ['current_month', 'last_month', 'last_30d'];
const FEATURES: AiFeatureFilter[] = ['all', 'cin_scan', 'passport_scan'];

const errorsOf = (f?: AiFeatureSummary) => (f?.api_error_count ?? 0) + (f?.parse_error_count ?? 0);
const attemptsOf = (f?: AiFeatureSummary) => (f?.success_count ?? 0) + errorsOf(f);
const failureRateOf = (f?: AiFeatureSummary) => {
  const a = attemptsOf(f);
  return a > 0 ? (errorsOf(f) / a) * 100 : 0;
};

/** Carte de synthèse d'une feature (scans, coût, coût moyen, taux d'échec). */
const FeatureCard = ({ f, titleKey }: { f: AiFeatureSummary | undefined; titleKey: string }) => {
  const { t } = useTranslation();
  const rate = failureRateOf(f);
  const amber = rate > 5;
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{t(titleKey)}</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] text-gray-400">{t('aiCosts.successfulScans')}</p>
          <p className="font-mono text-2xl font-extrabold text-gray-900">{f?.success_count ?? 0}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400">{t('aiCosts.cost')}</p>
          <p className="font-mono text-2xl font-extrabold text-gray-900">{formatUSD(f?.cost_usd, 4)}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400">{t('aiCosts.avgCostPerScan')}</p>
          <p className="font-mono text-sm font-semibold text-gray-700">{formatUSD(f?.avg_cost_per_success_usd, 4)}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400">{t('aiCosts.failureRateLabel')}</p>
          <p
            className="font-mono text-sm font-semibold"
            style={{ color: amber ? 'var(--qayed-vigilance-texte)' : 'var(--qayed-conforme)' }}
          >
            {rate.toFixed(1)}%
            <span className="ms-1 text-[11px] font-normal text-gray-400">
              ({f?.api_error_count ?? 0} api · {f?.parse_error_count ?? 0} parse)
            </span>
          </p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-gray-400">
        {t('aiCosts.tokensInOut', {
          in: (f?.input_tokens ?? 0).toLocaleString('en-US'),
          out: (f?.output_tokens ?? 0).toLocaleString('en-US'),
        })}
      </p>
    </div>
  );
};

/** Édition inline d'un tarif avec confirmation avant sauvegarde. */
const PricingRow = ({ row }: { row: AiPricing }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [input, setInput] = useState(row.input_price_per_mtok_usd);
  const [output, setOutput] = useState(row.output_price_per_mtok_usd);

  const save = useAdminMutation({
    mutationFn: () => adminAiCostsApi.updatePricing(row.id, { input_price_per_mtok_usd: input, output_price_per_mtok_usd: output }),
    successMessage: t('aiCosts.pricingSaved'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ai-pricing'] });
      qc.invalidateQueries({ queryKey: ['admin-ai-costs-summary'] });
      setEditing(false);
      setConfirming(false);
    },
  });

  const cancel = () => {
    setInput(row.input_price_per_mtok_usd);
    setOutput(row.output_price_per_mtok_usd);
    setEditing(false);
    setConfirming(false);
  };

  return (
    <div className="flex flex-col gap-2 border-b border-gray-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-sm font-semibold text-gray-800">{row.model}</p>
        {row.updated_at && (
          <p className="text-[11px] text-gray-400">{t('aiCosts.updatedAt', { date: new Date(row.updated_at).toLocaleString('fr-FR') })}</p>
        )}
      </div>

      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[11px] text-gray-400">
            {t('aiCosts.inputPrice')}
            <input className="input-field ms-1 w-28 py-1 font-mono text-sm" value={input} onChange={(e) => setInput(e.target.value)} inputMode="decimal" />
          </label>
          <label className="text-[11px] text-gray-400">
            {t('aiCosts.outputPrice')}
            <input className="input-field ms-1 w-28 py-1 font-mono text-sm" value={output} onChange={(e) => setOutput(e.target.value)} inputMode="decimal" />
          </label>
          {confirming ? (
            <>
              <span className="text-[11px] text-gray-500">{t('aiCosts.confirmSave')}</span>
              <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>{t('aiCosts.confirm')}</Button>
              <Button size="sm" variant="ghost" onClick={cancel}>{t('common.cancel')}</Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => setConfirming(true)}>{t('common.save')}</Button>
              <Button size="sm" variant="ghost" onClick={cancel}>{t('common.cancel')}</Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm text-gray-700">
            {formatUSD(row.input_price_per_mtok_usd, 4)} <span className="text-[11px] text-gray-400">/ Mtok in</span>
          </span>
          <span className="font-mono text-sm text-gray-700">
            {formatUSD(row.output_price_per_mtok_usd, 4)} <span className="text-[11px] text-gray-400">/ Mtok out</span>
          </span>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>{t('common.edit')}</Button>
        </div>
      )}
    </div>
  );
};

export const AdminAiCostsPage = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<AiCostPeriod>('current_month');
  const [feature, setFeature] = useState<AiFeatureFilter>('all');

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['admin-ai-costs-summary', period],
    queryFn: () => adminAiCostsApi.summary(period),
  });
  const { data: byEstab } = useQuery({
    queryKey: ['admin-ai-costs-by-establishment', period, feature],
    queryFn: () => adminAiCostsApi.byEstablishment(period, feature),
  });
  const { data: pricing } = useQuery({
    queryKey: ['admin-ai-pricing'],
    queryFn: () => adminAiCostsApi.pricing(),
  });

  const cin = summary?.features.find((f) => f.feature === 'cin_scan');
  const passport = summary?.features.find((f) => f.feature === 'passport_scan');

  // Volume total de scans "réussis" côté serveur (CIN + passeport). Le
  // dénominateur idéal — nombre de MRZ tentées côté client — n'est PAS accessible
  // (l'OCR tesseract réussit sans jamais toucher le backend). On affiche donc le
  // volume brut de replis passeport + la part passeport/total, en signalant la limite.
  const passportSuccess = passport?.success_count ?? 0;
  const totalSuccess = (cin?.success_count ?? 0) + passportSuccess;
  const passportShare = totalSuccess > 0 ? (passportSuccess / totalSuccess) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex items-center gap-2">
        <Cpu className="h-5 w-5" style={{ color: 'var(--qayed-cachet)' }} />
        <h1 className="qayed-display text-xl text-gray-900">{t('aiCosts.pageTitle')}</h1>
      </div>

      {summary && !summary.pricing_configured && (
        <div
          className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: 'var(--qayed-vigilance-fond)', color: 'var(--qayed-vigilance-texte)' }}
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{t('aiCosts.pricingNotConfiguredLong')}</span>
        </div>
      )}

      {/* Sélecteurs période + feature */}
      <div className="flex flex-wrap gap-3">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${period === p ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
              style={period === p ? { background: 'var(--qayed-cachet)' } : undefined}
            >
              {t(`aiCosts.period.${p}`)}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          {FEATURES.map((f) => (
            <button
              key={f}
              onClick={() => setFeature(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${feature === f ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
              style={feature === f ? { background: 'var(--qayed-cachet)' } : undefined}
            >
              {t(`aiCosts.feature.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {loadingSummary && <ListSkeleton rows={2} height="h-28" />}

      {summary && (
        <>
          {/* Total + deux cartes par feature */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('aiCosts.totalCost')}</p>
            <p className="font-mono text-4xl font-extrabold text-gray-900">{formatUSD(summary.total_cost_usd, 4)}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureCard f={cin} titleKey="aiCosts.cinLabel" />
            <FeatureCard f={passport} titleKey="aiCosts.passportLabel" />
          </div>

          {/* Indicateur taux de fallback passeport */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-gray-400" />
              <p className="text-sm font-bold text-gray-800">{t('aiCosts.passportFallbackTitle')}</p>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <p className="font-mono text-2xl font-extrabold text-gray-900">{passportSuccess}</p>
              <p className="text-sm text-gray-500">{t('aiCosts.passportShareOfTotal', { rate: passportShare.toFixed(1) })}</p>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">{t('aiCosts.passportFallbackNote')}</p>
          </div>

          {/* Tableau par établissement */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-sm font-bold text-gray-800">{t('aiCosts.byEstablishment')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-400">
                    <th className="px-5 py-2 font-semibold">{t('aiCosts.establishment')}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t('aiCosts.cinLabel')}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t('aiCosts.passportLabel')}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t('aiCosts.tokens')}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t('aiCosts.cost')}</th>
                    <th className="px-5 py-2 text-right font-semibold">{t('aiCosts.avgPerScan')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(byEstab ?? []).map((e) => (
                    <tr key={e.establishment_id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2.5 font-medium text-gray-800 truncate max-w-[220px]">{e.establishment_name ?? e.establishment_id}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-600">{e.cin_scans}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-600">{e.passport_scans}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-500">{(e.input_tokens + e.output_tokens).toLocaleString('en-US')}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-900">{formatUSD(e.cost_usd, 4)}</td>
                      <td className="px-5 py-2.5 text-right font-mono text-gray-600">{formatUSD(e.avg_cost_per_scan_usd, 4)}</td>
                    </tr>
                  ))}
                  {(byEstab?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">{t('aiCosts.noData')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section tarifs */}
          <div className="card p-5">
            <p className="text-sm font-bold text-gray-800 mb-1">{t('aiCosts.pricingTitle')}</p>
            <p className="text-[11px] text-gray-400 mb-3">{t('aiCosts.pricingHint')}</p>
            {(pricing ?? []).map((row) => (
              <PricingRow key={row.id} row={row} />
            ))}
            {(pricing?.length ?? 0) === 0 && <p className="text-sm text-gray-400 py-2">{t('aiCosts.noData')}</p>}
          </div>
        </>
      )}
    </div>
  );
};
