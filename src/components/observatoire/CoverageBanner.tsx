import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { observatoireApi } from '@/api/observatoire';

/**
 * Bandeau de couverture PERMANENT (regle §4, ecran 1). Rappelle en continu la
 * representativite partielle des donnees — jamais masquable. Fond ambre clair
 * quand la couverture estimee est faible (< 30%). Argument d'honnetete
 * institutionnelle : ne jamais retirer.
 */
export function CoverageBanner() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ['observatoire', 'couverture'],
    queryFn: observatoireApi.couverture,
    staleTime: 5 * 60 * 1000,
  });

  const actifs = data?.nb_etablissements_actifs ?? 0;
  const zones = data?.nb_zones_couvertes ?? 0;
  const taux = data?.taux_couverture_pct ?? 0;
  const partiel = taux < 30;

  return (
    <div
      className="flex items-start gap-3 rounded-card border px-4 py-3"
      style={{
        background: partiel ? 'var(--qayed-vigilance-fond)' : 'var(--qayed-cachet-dilue)',
        borderColor: partiel ? 'var(--qayed-vigilance)' : 'var(--qayed-ligne)',
      }}
      role="status"
    >
      <Info
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{ color: partiel ? 'var(--qayed-vigilance-texte)' : 'var(--qayed-cachet)' }}
      />
      <p className="text-xs leading-relaxed" style={{ color: partiel ? 'var(--qayed-vigilance-texte)' : 'var(--qayed-encre)' }}>
        {t('observatoire.coverage.banner', { count: actifs, zones })}
        {' '}
        <span className="font-semibold">{t('observatoire.coverage.partial')}</span>
      </p>
    </div>
  );
}
