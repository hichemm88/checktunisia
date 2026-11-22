// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from '@/i18n/locales/fr.json';
import type { AdminPurgePreview } from '@/api/admin/partners';

const previewTestDataPurge = vi.fn();
const purgeTestData = vi.fn();
const toast = vi.fn();

vi.mock('@/api/admin/partners', () => ({
  adminPartnersApi: {
    previewTestDataPurge: (id: string) => previewTestDataPurge(id),
    purgeTestData: (id: string, token: string) => purgeTestData(id, token),
  },
}));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

import { PurgeTestDataSection } from './PurgeTestDataSection';

void i18n.use(initReactI18next).init({
  lng: 'fr',
  resources: { fr: { translation: fr } },
  interpolation: { escapeValue: false },
});

const PREVIEW: AdminPurgePreview = {
  counts: {
    sessions: 4, drafts: 1, fiches: 1, guests: 2, travel_documents: 2, scans: 1,
    whatsapp_jobs: 0, notifications: 0, webhook_deliveries: 1, rooms_released: 2, kept_check_ins: 1,
  },
  total: 12,
  confirmation_token: 'a'.repeat(64),
};

const renderSection = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PurgeTestDataSection partnerId="p-1" />
    </QueryClientProvider>,
  );
};

const openPreview = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Purger les données de test/ }));
  return screen.findByRole('dialog');
};

describe('PurgeTestDataSection', () => {
  beforeEach(() => {
    previewTestDataPurge.mockReset();
    purgeTestData.mockReset();
    toast.mockReset();
  });

  it('affiche les nombres de l\'aperçu sans rien supprimer', async () => {
    previewTestDataPurge.mockResolvedValue(PREVIEW);
    renderSection();
    const dialog = await openPreview();

    expect(previewTestDataPurge).toHaveBeenCalledWith('p-1');
    expect(dialog).toHaveTextContent('12 éléments de test seront supprimés définitivement');
    const counts = screen.getByTestId('purge-counts');
    expect(counts).toHaveTextContent('Sessions de fiche4');
    expect(counts).toHaveTextContent('Brouillons1');
    expect(counts).not.toHaveTextContent('Envois WhatsApp'); // 0 : masqué
    expect(dialog).toHaveTextContent('2 chambres libérées');
    expect(dialog).toHaveTextContent('1 fiche conservée');
    expect(purgeTestData).not.toHaveBeenCalled();
  });

  it('exige de recopier le total avant d\'envoyer le jeton de l\'aperçu', async () => {
    previewTestDataPurge.mockResolvedValue(PREVIEW);
    purgeTestData.mockResolvedValue({ counts: PREVIEW.counts, total: 12, purged: true });
    renderSection();
    await openPreview();

    const confirm = screen.getByRole('button', { name: 'Supprimer 12 éléments' });
    expect(confirm).toBeDisabled();

    const input = screen.getByLabelText(/saisissez le nombre/);
    fireEvent.change(input, { target: { value: '11' } });
    expect(confirm).toBeDisabled();

    fireEvent.change(input, { target: { value: '12' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(purgeTestData).toHaveBeenCalledWith('p-1', PREVIEW.confirmation_token));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(toast).toHaveBeenCalledWith('12 éléments de test supprimés.', 'success');
  });

  it('remplace l\'aperçu par les nouveaux comptes quand le serveur refuse (409)', async () => {
    previewTestDataPurge.mockResolvedValue(PREVIEW);
    const fresh: AdminPurgePreview = { ...PREVIEW, total: 13, counts: { ...PREVIEW.counts, sessions: 5 }, confirmation_token: 'b'.repeat(64) };
    purgeTestData.mockRejectedValueOnce({ response: { status: 409, data: { data: fresh } } });
    renderSection();
    await openPreview();

    fireEvent.change(screen.getByLabelText(/saisissez le nombre/), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer 12 éléments' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('ont changé depuis l\'aperçu');
    expect(screen.getByRole('dialog')).toHaveTextContent('13 éléments de test seront supprimés');
    // Confirmation à refaire, sur le nouveau total et le nouveau jeton.
    const confirm = screen.getByRole('button', { name: 'Supprimer 13 éléments' });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/saisissez le nombre/), { target: { value: '13' } });
    purgeTestData.mockResolvedValue({ counts: fresh.counts, total: 13, purged: true });
    fireEvent.click(confirm);
    await waitFor(() => expect(purgeTestData).toHaveBeenLastCalledWith('p-1', fresh.confirmation_token));
  });

  it('n\'offre aucune suppression quand il n\'y a rien à purger', async () => {
    previewTestDataPurge.mockResolvedValue({ ...PREVIEW, total: 0, counts: { ...PREVIEW.counts, sessions: 0, drafts: 0, fiches: 0, guests: 0, travel_documents: 0, scans: 0, webhook_deliveries: 0, rooms_released: 0 } });
    renderSection();
    const dialog = await openPreview();

    expect(dialog).toHaveTextContent('Aucune donnée de test à purger');
    expect(screen.queryByRole('button', { name: /^Supprimer/ })).not.toBeInTheDocument();
  });
});
