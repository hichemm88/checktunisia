import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Download, X } from 'lucide-react';
import { TourismeLayout } from '@/components/layout/TourismeLayout';
import { Card } from '@/components/ui/Card';
import { FilterBar, useFiltresApi } from '@/components/observatoire/FilterBar';
import { CoverageBanner } from '@/components/observatoire/CoverageBanner';
import { LineChart, HBarChart } from '@/components/observatoire/Charts';
import { observatoireApi, estSousSeuil } from '@/api/observatoire';
import { formatMesure, formatVariation, nomPays, flagUrl } from '@/lib/observatoire';
import { api } from '@/lib/api';
import i18n from '@/i18n';

const SEUIL_EMERGENT = 50; // croissance > 50% => marche emergent

export function NationalitesPage() {
  const { t } = useTranslation();
  const langue = i18n.resolvedLanguage ?? 'fr';
  const f = useFiltresApi();
  const [emergentSeul, setEmergentSeul] = useState(false);
  const [selection, setSelection] = useState<string | null>(null);

  const top = useQuery({
    queryKey: ['obs', 'nat-table', f],
    queryFn: () => observatoireApi.topNationalites({ ...f, limit: 50 }),
  });

  const lignes = (top.data ?? []).filter((n) =>
    !emergentSeul || (n.variation_pct !== null && n.variation_pct > SEUIL_EMERGENT),
  );

  const exportCsv = async () => {
    // Telechargement via le client authentifie (le token est ajoute par
    // l'intercepteur axios) : un window.open ne porterait pas l'en-tete Bearer.
    const res = await api.get(observatoireApi.exportCsvUrl(f), { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'observatoire-nationalites.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TourismeLayout title={t('observatoire.nav.nationalities')}>
      <div className="flex flex-col gap-5">
        <FilterBar />
        <CoverageBanner />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--qayed-encre)' }}>
            <input type="checkbox" checked={emergentSeul} onChange={(e) => setEmergentSeul(e.target.checked)}
                   className="h-4 w-4 rounded" style={{ accentColor: 'var(--qayed-cachet)' }} />
            <TrendingUp className="h-4 w-4" style={{ color: 'var(--qayed-conforme)' }} />
            {t('observatoire.nationalities.emergingFilter')}
          </label>
          <button onClick={exportCsv}
                  className="flex items-center gap-1.5 rounded-btn px-3 py-1.5 text-xs font-medium"
                  style={{ background: 'var(--qayed-cachet-dilue)', color: 'var(--qayed-cachet)' }}>
            <Download className="h-3.5 w-3.5" /> {t('observatoire.export.csv')}
          </button>
        </div>

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-start text-xs uppercase tracking-wide"
                    style={{ borderColor: 'var(--qayed-ligne)', color: 'var(--qayed-fiche)' }}>
                  <th className="px-4 py-3 text-start">{t('observatoire.table.nationality')}</th>
                  <th className="px-4 py-3 text-end">{t('observatoire.kpi.arrivees')}</th>
                  <th className="px-4 py-3 text-end">{t('observatoire.kpi.nuitees')}</th>
                  <th className="px-4 py-3 text-end">{t('observatoire.kpi.dureeMoyenne')}</th>
                  <th className="px-4 py-3 text-end">{t('observatoire.table.variation')}</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((n) => (
                  <tr key={n.nationalite_iso}
                      onClick={() => setSelection(n.nationalite_iso)}
                      className="cursor-pointer border-b transition-colors hover:bg-[var(--qayed-cachet-dilue)]"
                      style={{ borderColor: 'var(--qayed-ligne)' }}>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <img src={flagUrl(n.nationalite_iso)} alt="" width={20} height={15}
                             className="rounded-sm" loading="lazy" />
                        <span className="font-medium" style={{ color: 'var(--qayed-encre)' }}>
                          {nomPays(n.nationalite_iso, langue)}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end font-semibold" style={{ color: 'var(--qayed-encre)' }}>
                      {formatMesure(n.arrivees, langue)}
                    </td>
                    <td className="px-4 py-3 text-end" style={{ color: 'var(--qayed-encre)' }}>
                      {formatMesure(n.nuitees, langue)}
                    </td>
                    <td className="px-4 py-3 text-end" style={{ color: 'var(--qayed-encre)' }}>
                      {estSousSeuil(n.duree_moyenne) ? formatMesure(n.duree_moyenne, langue)
                        : `${n.duree_moyenne} ${t('observatoire.kpi.nights')}`}
                    </td>
                    <td className="px-4 py-3 text-end font-medium"
                        style={{ color: (n.variation_pct ?? 0) >= 0 ? 'var(--qayed-conforme-texte)' : 'var(--qayed-encre)' }}>
                      {formatVariation(n.variation_pct)}
                    </td>
                  </tr>
                ))}
                {lignes.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--qayed-fiche)' }}>
                    {top.isLoading ? t('common.loading') : t('observatoire.charts.empty')}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {selection && <NationaliteDetail iso={selection} onClose={() => setSelection(null)} />}
      </div>
    </TourismeLayout>
  );
}

// ─── Detail au clic ─────────────────────────────────────────────────────────
function NationaliteDetail({ iso, onClose }: { iso: string; onClose: () => void }) {
  const { t } = useTranslation();
  const langue = i18n.resolvedLanguage ?? 'fr';
  const base = useFiltresApi();
  const f = { ...base, nationalite: iso };

  const serie = useQuery({ queryKey: ['obs', 'nat-serie', f], queryFn: () => observatoireApi.series({ ...f, granularite: 'mois' }) });
  const zones = useQuery({ queryKey: ['obs', 'nat-zones', f], queryFn: () => observatoireApi.comparaisonZones(f) });

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={flagUrl(iso)} alt="" width={22} height={16} className="rounded-sm" />
          <p className="text-sm font-semibold" style={{ color: 'var(--qayed-cachet)' }}>{nomPays(iso, langue)}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100" aria-label={t('common.close')}>
          <X className="h-4 w-4" style={{ color: 'var(--qayed-fiche)' }} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium uppercase" style={{ color: 'var(--qayed-fiche)' }}>
            {t('observatoire.overview.timeSeries')}
          </p>
          <LineChart points={serie.data?.points ?? []} height={180} />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase" style={{ color: 'var(--qayed-fiche)' }}>
            {t('observatoire.zones.byZone')}
          </p>
          <HBarChart langue={langue}
                     items={(zones.data ?? []).map((z) => ({
                       label: langue === 'ar' ? z.nom_ar : z.nom_fr, value: z.arrivees,
                     }))} />
        </div>
      </div>
    </Card>
  );
}
