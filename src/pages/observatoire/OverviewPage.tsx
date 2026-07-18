import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowDownToLine, Moon, Clock, Globe2, TrendingUp, TrendingDown } from 'lucide-react';
import { TourismeLayout } from '@/components/layout/TourismeLayout';
import { Card } from '@/components/ui/Card';
import { CoverageBanner } from '@/components/observatoire/CoverageBanner';
import { FilterBar, useFiltresApi } from '@/components/observatoire/FilterBar';
import { LineChart, HBarChart, Donut } from '@/components/observatoire/Charts';
import { observatoireApi, type Mesure, estSousSeuil } from '@/api/observatoire';
import { formatMesure, nomPays, nomType } from '@/lib/observatoire';
import i18n from '@/i18n';

// ─── Carte KPI ────────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, label, value, precedent, unit,
}: {
  icon: React.ElementType;
  label: string;
  value: Mesure;
  precedent?: Mesure;
  unit?: string;
}) {
  const langue = i18n.resolvedLanguage ?? 'fr';
  // Variation : verte si hausse, encre nuit si baisse (jamais de rouge — pas une alerte).
  let variation: number | null = null;
  if (!estSousSeuil(value) && !estSousSeuil(precedent) && typeof precedent === 'number' && precedent > 0) {
    variation = Math.round(((Number(value) - precedent) / precedent) * 1000) / 10;
  }
  const hausse = (variation ?? 0) >= 0;

  return (
    <Card padding="md" className="flex items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
           style={{ background: 'var(--qayed-cachet-dilue)' }}>
        <Icon className="h-6 w-6" style={{ color: 'var(--qayed-cachet)' }} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--qayed-fiche)' }}>
          {label}
        </p>
        <p className="mt-0.5 text-2xl font-bold" style={{ color: 'var(--qayed-cachet)' }}>
          {formatMesure(value, langue)}{!estSousSeuil(value) && unit ? ` ${unit}` : ''}
        </p>
        {variation !== null && (
          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium"
             style={{ color: hausse ? 'var(--qayed-conforme-texte)' : 'var(--qayed-encre)' }}>
            {hausse ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {variation > 0 ? '+' : ''}{variation} %
          </p>
        )}
      </div>
    </Card>
  );
}

export function OverviewPage() {
  const { t } = useTranslation();
  const langue = i18n.resolvedLanguage ?? 'fr';
  const f = useFiltresApi();

  const kpis = useQuery({ queryKey: ['obs', 'kpis', f], queryFn: () => observatoireApi.kpis(f) });
  const serie = useQuery({ queryKey: ['obs', 'serie', f], queryFn: () => observatoireApi.series(f) });
  const top = useQuery({ queryKey: ['obs', 'top', f], queryFn: () => observatoireApi.topNationalites({ ...f, limit: 10 }) });
  const types = useQuery({ queryKey: ['obs', 'types', f], queryFn: () => observatoireApi.types(f) });

  return (
    <TourismeLayout title={t('observatoire.nav.overview')}>
      <div className="flex flex-col gap-5">
        <FilterBar />
        <CoverageBanner />

        {/* 4 cartes KPI */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard icon={ArrowDownToLine} label={t('observatoire.kpi.arrivees')}
                   value={kpis.data?.kpis.arrivees ?? '<seuil'} precedent={kpis.data?.precedent.arrivees} />
          <KpiCard icon={Moon} label={t('observatoire.kpi.nuitees')}
                   value={kpis.data?.kpis.nuitees ?? '<seuil'} precedent={kpis.data?.precedent.nuitees} />
          <KpiCard icon={Clock} label={t('observatoire.kpi.dureeMoyenne')}
                   value={kpis.data?.kpis.duree_moyenne_sejour ?? '<seuil'}
                   precedent={kpis.data?.precedent.duree_moyenne_sejour}
                   unit={t('observatoire.kpi.nights')} />
          <KpiCard icon={Globe2} label={t('observatoire.kpi.nationalites')}
                   value={kpis.data?.kpis.nationalites_actives ?? 0} />
        </div>

        {/* Serie temporelle */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" style={{ color: 'var(--qayed-cachet)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--qayed-cachet)' }}>
              {t('observatoire.overview.timeSeries')}
            </p>
          </div>
          <LineChart points={serie.data?.points ?? []} />
        </Card>

        {/* Top nationalites + repartition par type */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <p className="mb-4 text-sm font-semibold" style={{ color: 'var(--qayed-cachet)' }}>
              {t('observatoire.overview.topNationalities')}
            </p>
            <HBarChart
              langue={langue}
              items={(top.data ?? []).map((n) => ({
                label: nomPays(n.nationalite_iso, langue),
                value: n.arrivees,
                variation: n.variation_pct,
                iso: n.nationalite_iso,
              }))}
            />
          </Card>

          <Card>
            <p className="mb-4 text-sm font-semibold" style={{ color: 'var(--qayed-cachet)' }}>
              {t('observatoire.overview.byType')}
            </p>
            <Donut segments={(types.data ?? []).map((x) => ({ label: nomType(x.type, langue), value: x.arrivees }))} />
          </Card>
        </div>
      </div>
    </TourismeLayout>
  );
}
