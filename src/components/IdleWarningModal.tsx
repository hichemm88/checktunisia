import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  onStay:   () => void;
  onLogout: () => void;
}

/**
 * Avertissement de session inactive.
 *
 * Le balisage était entièrement en styles inline, sans `role="dialog"` ni
 * piège de focus. Il n'utilise pas le composant Modal : cette boîte ne doit PAS
 * pouvoir être fermée par Échap ou par un clic à côté — le seul moyen d'en
 * sortir est un choix explicite entre rester connecté et se déconnecter.
 */
export const IdleWarningModal = ({ onStay, onLogout }: Props) => {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(120);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-qayed-encre/60 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-title"
        aria-describedby="idle-body"
        className="w-full max-w-sm rounded-card bg-white p-8 shadow-float"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-qayed-vigilance-fond p-2.5" aria-hidden="true">
            <Clock className="h-[22px] w-[22px] text-qayed-vigilance-texte" />
          </div>
          <div>
            <p id="idle-title" className="text-[15px] font-bold text-qayed-encre">{t('idleWarning.title')}</p>
            <p className="text-[13px] text-qayed-fiche">{t('idleWarning.subtitle')}</p>
          </div>
        </div>

        <p
          className={`my-4 text-center text-5xl font-extrabold tabular-nums ${
            seconds <= 30 ? 'text-qayed-erreur' : 'text-qayed-cachet'
          }`}
          aria-live="off"
        >
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
        </p>

        <p id="idle-body" className="mb-6 text-center text-[13px] text-qayed-fiche">
          {t('idleWarning.body')}
        </p>

        <div className="flex gap-2.5">
          <Button variant="secondary" fullWidth onClick={onLogout}>
            {t('idleWarning.logout')}
          </Button>
          <Button fullWidth autoFocus onClick={onStay}>
            {t('idleWarning.stay')}
          </Button>
        </div>
      </div>
    </div>
  );
};
