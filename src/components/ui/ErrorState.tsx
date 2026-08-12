import { AlertTriangle, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

/**
 * Etat d'erreur reutilisable pour les requetes admin. Avant, une requete en
 * echec laissait un squelette perpetuel ou un ecran vide silencieux
 * (indistinct de "aucune donnee"). Ce composant affiche un message clair et un
 * bouton Reessayer (refetch).
 */
export const ErrorState = ({ onRetry, message }: { onRetry?: () => void; message?: string }) => {
  const { t } = useTranslation();
  return (
    <div className="relative flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-qayed-vigilance-fond">
        <AlertTriangle className="h-5 w-5 text-qayed-vigilance-texte" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-qayed-gris-700">{message ?? t('adminShared.loadError')}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry} className="gap-2">
          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" /> {t('common.retry')}
        </Button>
      )}
    </div>
  );
};
