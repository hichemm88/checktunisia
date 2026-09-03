import { StrictMode, Suspense, Component, lazy, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/Toast';
import { captureAttribution } from '@/lib/analytics';
import { initSentry, captureError } from '@/lib/sentry';
import { queryClient } from '@/lib/queryClient';
import { App } from './App';

// Mesure d'audience différée : elle n'a aucune raison de disputer la bande
// passante au premier rendu de la landing.
const Analytics = lazy(() => import('@vercel/analytics/react').then((m) => ({ default: m.Analytics })));
import './index.css';
import { i18nReady } from './i18n';

// Avant tout le reste : une erreur survenue pendant l'amorçage doit être
// capturée elle aussi. Inerte sans VITE_SENTRY_DSN.
initSentry();

// Capture des UTM / referrer au premier chargement (attribution des signups).
captureAttribution();

// ── Chunks périmés après un déploiement ─────────────────────────────────────
// Un onglet chargé avant un déploiement référence des chunks lazy (éditeur
// Puck…) dont les fichiers hashés n'existent plus sur Vercel : l'import
// échoue avec « Unable to preload CSS/module ». Vite émet vite:preloadError
// dans ce cas — on recharge une fois pour récupérer l'index.html à jour.
// Garde-fou sessionStorage : si l'erreur persiste après rechargement (vrai
// problème réseau), on laisse l'ErrorBoundary l'afficher au lieu de boucler.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'qayed-chunk-reload';
  if (sessionStorage.getItem(key)) return; // déjà tenté — ne pas boucler
  sessionStorage.setItem(key, '1');
  setTimeout(() => sessionStorage.removeItem(key), 30_000);
  event.preventDefault();
  window.location.reload();
});

// ── PWA : service worker minimal → app installable (Chrome/Android), où
// l'autorisation caméra est demandée une seule fois. Non bloquant.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* non bloquant */ });
  });
}

// ── Error boundary — prevents blank page on React render crash ─────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) {
    // Sans ceci, une casse de rendu React n'atteint jamais le suivi d'erreurs :
    // l'ErrorBoundary l'intercepte et window.onerror ne la voit pas.
    captureError(error, { boundary: 'root' });
  }
  render() {
    if (this.state.error) {
      // Volontairement sans i18n ni composant partagé : cette limite se
      // déclenche aussi quand le rendu casse AVANT que i18next ou le système de
      // design soient prêts. Les styles restent inline, mais sur les tokens de
      // la charte, avec un repli littéral si la feuille n'a pas chargé.
      return (
        <div
          role="alert"
          style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            padding: '2rem',
            maxWidth: '480px',
            margin: '4rem auto',
            textAlign: 'center',
            color: 'var(--qayed-encre, #10222E)',
          }}
        >
          <h1 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: '1.5rem', marginBottom: '0.75rem' }}>
            Une erreur est survenue
          </h1>
          <p style={{ color: 'var(--qayed-fiche, #616B75)', fontSize: '0.875rem', lineHeight: 1.5 }}>
            {(this.state.error as Error).message}
          </p>
          <button
            type="button"
            onClick={() => window.location.href = '/'}
            style={{
              marginTop: '1.5rem',
              minHeight: '48px',
              padding: '0 1.5rem',
              background: 'var(--qayed-cachet, #5346A8)',
              color: '#fff',
              border: 'none',
              borderRadius: '14px',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retour à l'accueil
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/*
 * Le rendu attend que la langue de depart soit chargee.
 *
 * Les traductions ne sont plus dans le chunk d'entree : elles arrivent par un
 * `import()` propre a la langue detectee. Rendre sans attendre afficherait un
 * ecran de clefs brutes le temps de ce chargement — un defaut bien plus visible
 * que les kilo-octets economises.
 *
 * `catch` et non `then` seul : si le fichier de langue ne se charge pas
 * (reseau coupe, chunk perime apres un deploiement), il vaut mieux une
 * interface non traduite qu'une page blanche. i18next rend alors les clefs, et
 * l'application reste utilisable.
 */
i18nReady.catch(() => { /* rendu quand meme, en clefs brutes */ }).then(() => {
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <App />
            <Suspense fallback={null}><Analytics /></Suspense>
          </ToastProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
});
