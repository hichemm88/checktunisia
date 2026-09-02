// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from '@/i18n/locales/fr.json';
import type {
  MetaCostsSummary,
  MetaCostByEstablishment,
  MetaCostDaily,
} from '@/api/admin/metaCosts';

const summary = vi.fn();
const byEstablishment = vi.fn();
const daily = vi.fn();

vi.mock('@/api/admin/metaCosts', () => ({
  adminMetaCostsApi: {
    summary: () => summary(),
    byEstablishment: () => byEstablishment(),
    daily: () => daily(),
  },
}));

import { AdminMetaCostsPage } from './AdminMetaCostsPage';

void i18n.use(initReactI18next).init({
  lng: 'fr',
  resources: { fr: { translation: fr } },
  interpolation: { escapeValue: false },
});

/**
 * L'écran « Coûts Meta ».
 *
 * Ce qui est vérifié ici n'est pas la mise en page — elle est reprise de
 * « Coûts IA » et suivra ses évolutions — mais les deux choses que cet écran
 * dit et que l'autre n'a pas à dire :
 *
 *  1. la PROVENANCE des montants. « Réel Meta » et « estimation » ne se
 *     décident pas pareil, et une estimation présentée comme un montant réel
 *     est un mensonge silencieux sur une décision de marge ;
 *  2. la ligne SANS établissement du tableau. Les codes de connexion
 *     appartiennent au portail autorité ; affichés sous un UUID nu, ou pire
 *     rattachés à un hôtel, ils fausseraient la marge d'un client.
 */
const SUMMARY: MetaCostsSummary = {
  period: 'current_month',
  source: 'estimate',
  total_cost_usd: '1.234500',
  total_messages: 154,
  avg_cost_per_message_usd: '0.008016',
  previous_month_cost_usd: '1.000000',
  categories: [
    { category: 'utility', messages: 140, cost_usd: '1.120000', unit_price_usd: '0.008000' },
    { category: 'authentication', messages: 14, cost_usd: '0.107800', unit_price_usd: '0.007700' },
    { category: 'marketing', messages: 0, cost_usd: '0.000000', unit_price_usd: '0.044800' },
    { category: 'service', messages: 0, cost_usd: '0.000000', unit_price_usd: '0.000000' },
  ],
  usd_to_tnd: '3.0500',
  total_cost_tnd: '3.765',
  last_meta_sync_at: null,
  pricing_configured: true,
};

const ESTABLISHMENTS: MetaCostByEstablishment[] = [
  {
    establishment_id: 'h-1',
    establishment_name: 'Dar el Kenz',
    utility_messages: 140,
    authentication_messages: 0,
    marketing_messages: 0,
    service_messages: 0,
    messages: 140,
    cost_usd: '1.120000',
    avg_cost_per_message_usd: '0.008000',
  },
  {
    establishment_id: null,
    establishment_name: null,
    utility_messages: 0,
    authentication_messages: 14,
    marketing_messages: 0,
    service_messages: 0,
    messages: 14,
    cost_usd: '0.107800',
    avg_cost_per_message_usd: '0.007700',
  },
];

const DAILY: MetaCostDaily = {
  source: 'estimate',
  series: [
    {
      date: '2026-09-01',
      utility_cost_usd: '1.120000',
      authentication_cost_usd: '0.107800',
      marketing_cost_usd: '0.000000',
      service_cost_usd: '0.000000',
      utility_count: 140,
      authentication_count: 14,
      marketing_count: 0,
      service_count: 0,
      total_cost_usd: '1.227800',
      total_count: 154,
    },
  ],
};

const renderPage = () => {
  summary.mockResolvedValue(SUMMARY);
  byEstablishment.mockResolvedValue(ESTABLISHMENTS);
  daily.mockResolvedValue(DAILY);

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={qc}>
      <AdminMetaCostsPage />
    </QueryClientProvider>,
  );
};

describe('écran Coûts Meta', () => {
  it('affiche le total du mois, sa provenance et l\'équivalent en dinars', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('$1.2345')).toBeTruthy());

    // Provenance : le badge dit « estimation », et la mention de synchro dit
    // qu'aucune n'a encore abouti — plutôt que d'inventer une date.
    expect(screen.getAllByText('Estimation').length).toBeGreaterThan(0);
    expect(screen.getByText('Aucune synchro Meta à ce jour')).toBeTruthy();

    // Le stockage reste en USD : le dinar est une commodité de lecture, et le
    // « ≈ » le dit.
    expect(screen.getByText(/≈ 3,765 TND/)).toBeTruthy();
    expect(screen.getByText(/au taux 3.0500 TND\/USD/)).toBeTruthy();
  });

  it('sépare les fiches des connexions', async () => {
    renderPage();

    // Le même montant apparaît sur la carte de catégorie ET dans la ligne
    // d'établissement : c'est attendu, d'où `getAllByText`. Les zéros de
    // queue sont rognés par `formatUSD` (2 décimales minimum, 4 maximum).
    await waitFor(() => expect(screen.getAllByText('$1.12').length).toBeGreaterThan(0));

    // 140 fiches (utility) et 14 codes (authentication) : les deux catégories
    // que nous envoyons réellement, chacune à son tarif.
    expect(screen.getAllByText('140').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$0.1078').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$0.0077').length).toBeGreaterThan(0);
  });

  it('nomme la ligne sans établissement au lieu d\'afficher un identifiant nu', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Dar el Kenz')).toBeTruthy());

    // Les codes de connexion n'appartiennent à aucun client hôtelier.
    expect(screen.getByText('Portail autorité (codes de connexion)')).toBeTruthy();
  });

  it('avertit quand les tarifs ne sont pas renseignés', async () => {
    summary.mockResolvedValue({ ...SUMMARY, pricing_configured: false });
    byEstablishment.mockResolvedValue([]);
    daily.mockResolvedValue({ source: 'estimate', series: [] });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <AdminMetaCostsPage />
      </QueryClientProvider>,
    );

    // Un coût calculé avec un tarif à 0 est faux, pas nul : l'écran doit le
    // dire avant qu'on s'en serve pour arbitrer une marge.
    await waitFor(() =>
      expect(screen.getByText(/Tarifs non configurés/)).toBeTruthy(),
    );
  });

  it('affiche le badge « réel Meta » quand la synchro a rapporté des montants', async () => {
    summary.mockResolvedValue({
      ...SUMMARY,
      source: 'meta',
      last_meta_sync_at: '2026-09-02T05:00:00Z',
    });
    byEstablishment.mockResolvedValue(ESTABLISHMENTS);
    daily.mockResolvedValue({ ...DAILY, source: 'meta' });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <AdminMetaCostsPage />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getAllByText('Réel Meta').length).toBeGreaterThan(0));
    expect(screen.getByText(/Dernière synchro Meta/)).toBeTruthy();
  });
});
