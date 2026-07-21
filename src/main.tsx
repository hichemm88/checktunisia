import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import { ToastProvider } from '@/components/ui/Toast';
import { captureAttribution } from '@/lib/analytics';
import { App } from './App';
import './index.css';
import './i18n';

// Capture des UTM / referrer au premier chargement (attribution des signups).
captureAttribution();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

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
  render() {
    if (this.state.error) {
      return (
        <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
          <h2 style={{ color: '#DC2626' }}>Une erreur est survenue</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {(this.state.error as Error).message}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: '#5346A8', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Retour à l'accueil
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <App />
            <Analytics />
          </ToastProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
