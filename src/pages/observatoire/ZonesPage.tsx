import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { TourismeLayout } from '@/components/layout/TourismeLayout';
import { Card } from '@/components/ui/Card';
import { CoverageBanner } from '@/components/observatoire/CoverageBanner';
import { Heatmap, HBarChart } from '@/components/observatoire/Charts';
import { observatoireApi, type Mesure } from '@/api/observatoire';
import i18n from '@/i18n';

const MOIS_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
const MOIS_AR = ['ج', 'ف', 'م', 'أ', 'م', 'ج', 'ج', 'أ', 'س', 'أ', 'ن', 'د'];

export function ZonesPage() {
  const { t } = useTranslation();
  const langue = i18n.resolvedLanguage ?? 'fr';
  const annee = new Date().getFullYear();
  const [anneeSel, setAnneeSel] = useState(annee);

  const saison = useQuery({
    queryKey: ['obs', 'saison', anneeSel],
    queryFn: () => observatoireApi.saisonnalite(anneeSel),
  });

  // Comparaison inter-zones sur l'annee courante.
  const compFiltres = { debut: `${anneeSel}-01-01`, fin: `${anneeSel}-12-31` };
  const comparaison = useQuery({
    queryKey: ['obs', 'zones-comp', compFiltres],
    queryFn: () => observatoireApi.comparaisonZones(compFiltres),
  });

  const zonesListe = useQuery({ queryKey: ['obs', 'zones-liste'], queryFn: observatoireApi.zones });

  const moisLabels = langue === 'ar' ? MOIS_AR : MOIS_FR;
  const heatmapRows = (saison.data?.zones ?? []).map((z) => ({
    label: langue === 'ar' ? z.nom_ar : z.nom_fr,
    valeurs: Array.from({ length: 12 }, (_, i) => (z.mois[i + 1] ?? 0) as Mesure),
  }));

  return (
    <TourismeLayout title={t('observatoire.nav.zones')}>
      <div className="flex flex-col gap-5">
        <CoverageBanner />

        {/* Heatmap saisonnalite */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: 'var(--qayed-cachet)' }}>
              {t('observatoire.zones.seasonality')}
            </p>
            <select
              value={anneeSel}
              onChange={(e) => setAnneeSel(Number(e.target.value))}
              className="input-field h-9 appearance-none bg-white py-1 pe-8 text-xs"
            >
              {[annee, annee - 1, annee - 2].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <Heatmap rows={heatmapRows} moisLabels={moisLabels} langue={langue} />
          <p className="mt-3 text-xs" style={{ color: 'var(--qayed-fiche)' }}>
            {t('observatoire.zones.heatmapLegend')}
          </p>
        </Card>

        {/* Comparaison inter-zones */}
        <Card>
          <p className="mb-4 text-sm font-semibold" style={{ color: 'var(--qayed-cachet)' }}>
            {t('observatoire.zones.comparison')}
          </p>
          <HBarChart
            langue={langue}
            items={(comparaison.data ?? []).map((z) => ({
              label: langue === 'ar' ? z.nom_ar : z.nom_fr,
              value: z.arrivees,
            }))}
          />
        </Card>

        {/* Zones couvertes (niveau delegation, pas de geolocalisation fine) */}
        <Card>
          <p className="mb-4 text-sm font-semibold" style={{ color: 'var(--qayed-cachet)' }}>
            {t('observatoire.zones.covered')}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(zonesListe.data ?? []).map((z) => (
              <div key={z.id} className="flex items-start gap-2 rounded-btn border px-3 py-2"
                   style={{ borderColor: 'var(--qayed-ligne)' }}>
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--qayed-cachet)' }} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" style={{ color: 'var(--qayed-encre)' }}>
                    {langue === 'ar' ? z.nom_ar : z.nom_fr}
                  </p>
                  <p className="truncate text-xs" style={{ color: 'var(--qayed-fiche)' }}>{z.gouvernorat}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs" style={{ color: 'var(--qayed-fiche)' }}>
            {t('observatoire.zones.delegationOnly')}
          </p>
        </Card>
      </div>
    </TourismeLayout>
  );
}
