// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from '@/i18n/locales/fr.json';
import type { ReactNode } from 'react';
import type { DashboardData } from '@/types';

const get = vi.fn();

vi.mock('@/api/dashboard', () => ({
  dashboardApi: {
    get: () => get(),
    occupancy: vi.fn(),
  },
}));

// Le layout (header, nav, cloche de notifications) a ses propres requêtes et
// n'est pas le sujet de ce test : seul le contenu du dashboard, qui restait
// bloqué en skeleton sur une connexion dégradée, est visé ici.
vi.mock('@/components/layout/HotelLayout', () => ({
  HotelLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { useAuthStore } from '@/stores/authStore';
import { DashboardPage } from './DashboardPage';

void i18n.use(initReactI18next).init({
  lng: 'fr',
  resources: { fr: { translation: fr } },
  interpolation: { escapeValue: false },
});

const DASH: DashboardData = {
  today: {
    arrivals_expected: 3, arrivals_done: 2, currently_present: 5,
    departures_today: 1, departures_tomorrow: 2, drafts_pending: 0,
    occupancy_rate: 62,
  },
  month: { check_ins_total: 40 },
  weekly_trend: [],
  expiry_alerts: [],
  subscription: { status: 'active', days_remaining: 20 },
  recent_check_ins: [
    { id: 'c1', reference: 'REF-1', status: 'active', primary_guest: 'Amira Ben Salah', check_in_date: '2026-09-03' },
  ],
};

/**
 * Bloqué sur une connexion 4G dégradée : le dashboard restait figé en
 * skeleton pour toujours.
 *
 * ── La cause ────────────────────────────────────────────────────────────
 *
 * L'instance axios (`src/lib/api.ts`) n'avait aucun `timeout` : sur une
 * requête qui reste en attente (paquets perdus, connexion instable), la
 * promesse ne se résolvait ni ne rejetait jamais. React Query restait donc
 * bloqué en `isLoading` indéfiniment — les skeletons n'avaient tout
 * simplement aucune façon de disparaître. La page ne lisait par ailleurs
 * jamais `isError`, donc un échec réel (une fois obtenu) retombait
 * silencieusement sur un tableau de bord à zéro, sans aucun message ni
 * moyen de réessayer.
 *
 * ── Ce que ces tests vérifient ─────────────────────────────────────────
 *
 * Le comportement observable, pas l'implémentation : un premier chargement
 * affiche un skeleton puis les données ; un échec sans donnée en cache
 * affiche un message clair avec un bouton Réessayer (jamais un skeleton
 * infini, jamais un tableau de bord à zéro silencieux) ; un refetch en
 * arrière-plan qui échoue ne fait pas disparaître des données déjà
 * affichées.
 */
describe('DashboardPage — comportement en connexion dégradée', () => {
  beforeEach(() => {
    get.mockReset();
    useAuthStore.setState({
      token: 'tok', isAuthenticated: true, activePropertyId: null, activePropertyName: null,
      user: {
        id: 'u1', email: 'a@a.com', first_name: 'Achwak', last_name: 'G',
        role: 'receptionist', permissions: [],
      } as never,
    });
  });

  const wrap = (queryClient?: QueryClient) => {
    const qc = queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    return qc;
  };

  it('affiche un skeleton pendant le chargement puis les données une fois reçues — jamais bloqué', async () => {
    let resolveGet: (v: DashboardData) => void;
    get.mockReturnValue(new Promise((resolve) => { resolveGet = resolve; }));

    wrap();

    // Pendant le chargement : des skeletons, aucune donnée, aucune erreur.
    await waitFor(() => expect(document.body.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0));
    expect(screen.queryByText('Amira Ben Salah')).toBeNull();
    expect(screen.queryByText(/Impossible de charger/)).toBeNull();

    resolveGet!(DASH);

    // Une fois la requête résolue, les données remplacent le skeleton.
    expect(await screen.findByText('Amira Ben Salah')).toBeTruthy();
    expect(document.body.querySelectorAll('.animate-pulse').length).toBe(0);
  });

  it("affiche un état d'erreur explicite avec un bouton Réessayer quand la requête échoue sans donnée en cache", async () => {
    get.mockRejectedValue(new Error('Network Error'));
    wrap();

    expect(await screen.findByText('Impossible de charger le tableau de bord.')).toBeTruthy();
    const retryButton = screen.getByRole('button', { name: 'Réessayer' });
    expect(retryButton).toBeTruthy();

    // Jamais de skeleton bloqué indéfiniment une fois l'échec constaté.
    expect(document.body.querySelectorAll('.animate-pulse').length).toBe(0);

    get.mockResolvedValueOnce(DASH);
    retryButton.click();

    expect(await screen.findByText('Amira Ben Salah')).toBeTruthy();
  });

  it('conserve les données déjà affichées pendant un refetch en arrière-plan qui échoue', async () => {
    get.mockResolvedValueOnce(DASH);
    const qc = wrap();

    expect(await screen.findByText('Amira Ben Salah')).toBeTruthy();

    // Refetch en arrière-plan (ex. l'intervalle de 60s, ou un retour de
    // connexion) qui échoue cette fois : les données déjà affichées ne
    // doivent pas disparaître, et aucun écran d'erreur ne doit les remplacer.
    get.mockRejectedValueOnce(new Error('Network Error'));
    await qc.refetchQueries({ queryKey: ['dashboard', null] });

    expect(screen.getByText('Amira Ben Salah')).toBeTruthy();
    expect(screen.queryByText('Impossible de charger le tableau de bord.')).toBeNull();
  });
});
