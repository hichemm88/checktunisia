// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from '@/i18n/locales/fr.json';

const search = vi.fn();
const recentCheckIns = vi.fn();

vi.mock('@/api/authority', () => ({
  authorityApi: {
    search: (p: unknown) => search(p),
    recentCheckIns: (p: unknown) => recentCheckIns(p),
  },
}));

// Le scan MRZ ouvre la caméra : hors sujet ici, et indisponible sous jsdom.
vi.mock('@/components/MrzScanButton', () => ({ MrzScanButton: () => null }));

import { SearchPage } from './SearchPage';

void i18n.use(initReactI18next).init({
  lng: 'fr',
  resources: { fr: { translation: fr } },
  interpolation: { escapeValue: false },
});

const wrap = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

/**
 * Les résultats de recherche du portail autorité doivent être lisibles.
 *
 * ── Le défaut ───────────────────────────────────────────────────────────
 *
 * Constaté dans le navigateur, sur données synthétiques : la liste de
 * résultats affichait les valeurs brutes de la base.
 *
 *   date de naissance   1961-07-09T00:00:00.000000Z
 *   dernier séjour      2026-08-12T00:00:00.000000Z
 *   statut              active
 *
 * Sur le même écran, le panneau « Derniers check-ins » formatait pourtant
 * correctement — l'aide `fmtDate` est définie dans ce fichier et y était
 * utilisée. Elle avait simplement été oubliée dans la branche des résultats,
 * qui affichait aussi le jeton de statut en anglais au milieu d'une interface
 * française.
 *
 * L'écran sert à un officier qui identifie une personne. Une date de naissance
 * rendue en horodatage ISO n'est pas un détail cosmétique : c'est la donnée
 * qu'il doit comparer, donnée sous une forme qu'on ne lit pas d'un coup d'œil.
 *
 * ── Ce que le test vérifie ──────────────────────────────────────────────
 *
 * La forme rendue, pas l'implémentation : on affirme que la date lisible est
 * présente et qu'aucun horodatage ISO ne subsiste. Le test reste valable si la
 * mise en forme change de méthode.
 *
 * Données strictement synthétiques.
 */
describe('recherche autorité — lisibilité des résultats', () => {
  beforeEach(() => {
    search.mockReset();
    recentCheckIns.mockReset();
    recentCheckIns.mockResolvedValue({ data: [], meta: { total: 0, current_page: 1, per_page: 20 } });
    search.mockResolvedValue({
      data: [
        {
          guest_id: 'synth-1',
          first_name: 'Prenom15',
          last_name: 'Nom15',
          date_of_birth: '1961-07-09T00:00:00.000000Z',
          sex: 'F',
          nationality_code: 'ESP',
          document_number: null,
          last_stay: {
            hotel_name: 'Hôtel Synthétique',
            check_in_date: '2026-08-12T00:00:00.000000Z',
            status: 'active',
            hotel: { name: 'Hôtel Synthétique', governorate: null, city: null },
          },
          watchlist_hit: null,
        },
      ],
      meta: { total: 1, current_page: 1, per_page: 20 },
    });
  });

  const lancerRecherche = async () => {
    wrap();
    fireEvent.change(await screen.findByPlaceholderText('Ben Ali'), { target: { value: 'Nom15' } });
    fireEvent.click(screen.getByRole('button', { name: /Rechercher/i }));
    await waitFor(() => expect(search).toHaveBeenCalled());
  };

  it('affiche la date de naissance en clair, pas en horodatage', async () => {
    await lancerRecherche();

    expect(await screen.findByText(/09 juil\. 1961/)).toBeTruthy();
  });

  it('affiche la date du dernier séjour en clair', async () => {
    await lancerRecherche();

    expect(await screen.findByText(/12 août 2026/)).toBeTruthy();
  });

  it('traduit le statut du séjour', async () => {
    await lancerRecherche();

    // « active » est un jeton de base ; l'écran est en français.
    expect(await screen.findByText('Actif')).toBeTruthy();
    expect(screen.queryByText('active')).toBeNull();
  });

  it('ne laisse aucun horodatage ISO dans la page', async () => {
    /*
     * La garde générale : elle attrape aussi les champs qu'on ajouterait
     * demain sans passer par la mise en forme, ce qui est exactement la façon
     * dont ce défaut est apparu.
     */
    await lancerRecherche();

    await screen.findByText(/09 juil\. 1961/);

    expect(document.body.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  });
});
