import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // @ts-expect-error — propriété non standard, seule façon de le savoir sur iOS Safari.
    window.navigator.standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * Aide à l'installation (§ Écran Réglages, PWA installable). Chrome/Edge
 * (Android, desktop) proposent un événement natif qu'on peut déclencher
 * nous-mêmes ; Safari iOS n'expose RIEN de programmable — "Partager →
 * Sur l'écran d'accueil" reste le seul chemin, d'où l'instruction statique.
 */
export function InstallAppCard() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setInstallEvent(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  return (
    <div className="mb-6 rounded-card border border-qayed-ligne bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-qayed-encre">Installer l'application</h2>

      {installEvent && (
        <>
          <p className="mb-3 text-sm text-qayed-fiche">
            Ajoutez Qayed CRM à votre écran d'accueil pour l'ouvrir comme une app, notifications comprises.
          </p>
          <button
            type="button"
            onClick={async () => {
              await installEvent.prompt();
              const { outcome } = await installEvent.userChoice;
              if (outcome === 'accepted') setInstalled(true);
              setInstallEvent(null);
            }}
            className="h-btn-md w-full rounded-btn bg-qayed-cachet text-sm font-semibold text-white"
          >
            Installer
          </button>
        </>
      )}

      {!installEvent && isIos() && (
        <p className="text-sm text-qayed-fiche">
          Dans Safari : appuyez sur <strong>Partager</strong>, puis{' '}
          <strong>Sur l'écran d'accueil</strong>.
        </p>
      )}

      {!installEvent && !isIos() && (
        <p className="text-sm text-qayed-fiche">
          Depuis le menu du navigateur : « Installer l'application » (ou « Ajouter à l'écran d'accueil »).
        </p>
      )}
    </div>
  );
}
