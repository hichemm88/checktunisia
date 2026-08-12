import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { ChevronNext, ChevronPrev } from '@/components/ui/DirectionalIcon';

interface PaginationMeta {
  total: number;
  current_page: number;
  per_page: number;
}

interface PaginationProps {
  meta: PaginationMeta;
  currentCount: number;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Contrôle de pagination partagé (admin, autorité, portail établissement).
 *
 * Les boutons faisaient ~26px de haut et affichaient des flèches littérales
 * `←` / `→` : sous le seuil tactile, et pointant dans le mauvais sens en
 * arabe sans possibilité de les retourner en CSS.
 */
export const Pagination = ({ meta, currentCount, onPrev, onNext }: PaginationProps) => {
  const { t } = useTranslation();
  if (meta.total <= meta.per_page) return null;

  const totalPages = Math.ceil(meta.total / meta.per_page);

  return (
    <nav className="flex justify-center items-center gap-3" aria-label={t('common.pagination')}>
      <Button
        variant="secondary"
        size="sm"
        disabled={meta.current_page === 1}
        onClick={onPrev}
      >
        <ChevronPrev className="h-4 w-4" /> {t('common.previous')}
      </Button>
      <span className="text-xs font-medium text-qayed-fiche" aria-live="polite">
        {meta.current_page} / {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={currentCount < meta.per_page}
        onClick={onNext}
      >
        {t('common.next')} <ChevronNext className="h-4 w-4" />
      </Button>
    </nav>
  );
};
