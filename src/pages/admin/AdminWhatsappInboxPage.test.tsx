// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from '@/i18n/locales/fr.json';
import type { InboxConversation, InboxThread, InboxListMeta } from '@/api/admin/whatsappInbox';

const list = vi.fn();
const thread = vi.fn();
const reply = vi.fn();

vi.mock('@/api/admin/whatsappInbox', () => ({
  adminWhatsappInboxApi: {
    list: (params: unknown) => list(params),
    thread: (id: string) => thread(id),
    reply: (id: string, message: string) => reply(id, message),
  },
}));

import { AdminWhatsappInboxPage } from './AdminWhatsappInboxPage';

void i18n.use(initReactI18next).init({
  lng: 'fr',
  resources: { fr: { translation: fr } },
  interpolation: { escapeValue: false },
});

/**
 * L'écran « Réponses des autorités ».
 *
 * Ce qui est vérifié ici, ce sont les trois choses que cet écran doit dire
 * juste, parce qu'elles engagent :
 *
 *  1. la FENÊTRE DE RÉPONSE. Un champ de saisie actif hors des 24 h promet un
 *     envoi que Meta refusera — et, sur un canal qui porte une obligation
 *     légale, laisse croire qu'une consigne est partie ;
 *  2. l'IDENTITÉ de l'interlocuteur. Un nom de profil WhatsApp est choisi par
 *     la personne elle-même : il ne doit jamais passer pour l'identité
 *     vérifiée d'un agent enregistré ;
 *  3. le CONTENU d'un média sans légende. Rien ne doit être inventé à la
 *     place du texte que l'agent n'a pas écrit.
 */

const META: InboxListMeta = { current_page: 1, last_page: 1, per_page: 25, total: 2, unread_total: 3 };

const CONVERSATIONS: InboxConversation[] = [
  {
    id: 'c-1',
    phone: '21620123456',
    contact_name: 'Lac 2',
    authority: {
      profile_id: 1,
      name: 'BEN SALAH Karim',
      badge_number: 'PN-4412',
      rank: 'Brigadier',
      organization: 'Poste de police du Lac',
    },
    unread_count: 3,
    last_message_at: '2026-09-02T14:32:00Z',
    last_message_direction: 'inbound',
    last_message_preview: 'Merci, bien reçu',
    last_inbound_at: '2026-09-02T14:32:00Z',
    last_outbound_at: '2026-09-02T14:25:00Z',
    service_window_open: true,
    service_window_closes_at: '2026-09-03T14:32:00Z',
  },
  {
    id: 'c-2',
    phone: '21655000222',
    contact_name: null,
    authority: null,
    unread_count: 0,
    last_message_at: '2026-09-01T09:00:00Z',
    last_message_direction: 'outbound',
    last_message_preview: 'Fiche de police transmise',
    last_inbound_at: null,
    last_outbound_at: '2026-09-01T09:00:00Z',
    service_window_open: false,
    service_window_closes_at: null,
  },
];

const OPEN_THREAD: InboxThread = {
  conversation: CONVERSATIONS[0],
  timeline: [
    {
      kind: 'fiche',
      id: 'f-1',
      direction: 'outbound',
      at: '2026-09-02T14:25:00Z',
      wamid: 'wamid.F1',
      guest: 'DUPONT Jean',
      establishment: 'Dar el Kenz',
      check_in_id: 'ci-1',
      is_test: false,
      status: 'sent',
      delivery_status: 'read',
      queued_at: '2026-09-02T14:24:00Z',
      sent_at: '2026-09-02T14:25:00Z',
      delivered_at: '2026-09-02T14:25:30Z',
      read_at: '2026-09-02T14:26:00Z',
      error: null,
    },
    {
      kind: 'message',
      id: 'm-1',
      direction: 'inbound',
      at: '2026-09-02T14:32:00Z',
      wamid: 'wamid.M1',
      type: 'text',
      body: 'Merci, bien reçu',
      has_media: false,
      media_mime: null,
      media_filename: null,
      context_wamid: 'wamid.F1',
      status: null,
      delivered_at: null,
      read_at: null,
      error: null,
      sent_by: null,
    },
  ],
  reply: { allowed: true, window_closes_at: '2026-09-03T14:32:00Z', max_length: 4096, reason: null },
};

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AdminWhatsappInboxPage />
    </QueryClientProvider>,
  );
};

describe('écran Réponses des autorités', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue({ data: CONVERSATIONS, meta: META });
    thread.mockResolvedValue(OPEN_THREAD);
    reply.mockResolvedValue(OPEN_THREAD.timeline[1]);
  });

  it("va rechercher les nouveaux messages sans qu'on recharge la page", async () => {
    /*
     * L'ecran n'interrogeait le serveur qu'au chargement. Verifie dans le
     * navigateur sur un message entrant synthetique : la reponse arrivait en
     * base et n'apparaissait jamais a l'ecran — il fallait recharger.
     *
     * Ce n'est pas un simple confort : la reponse libre n'est possible que dans
     * les 24 h qui suivent le message de l'agent (regle de Meta, rappelee en
     * en-tete de l'ecran). Une reponse qu'on ne voit pas consomme en silence la
     * fenetre pendant laquelle on pouvait encore y repondre.
     *
     * Le test avance l'horloge plutot que d'attendre : il verifie que l'ecran
     * REDEMANDE, sans dependre du rythme exact.
     */
    vi.useFakeTimers({ shouldAdvanceTime: true });

    try {
      renderPage();
      await waitFor(() => expect(list).toHaveBeenCalledTimes(1));

      await vi.advanceTimersByTimeAsync(31_000);

      await waitFor(() => expect(list.mock.calls.length).toBeGreaterThan(1));
    } finally {
      vi.useRealTimers();
    }
  });

  it('liste les fils avec leur non-lus et le total global', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('BEN SALAH Karim')).toBeTruthy());

    expect(screen.getByText('Poste de police du Lac')).toBeTruthy();
    expect(screen.getByText(/Merci, bien reçu/)).toBeTruthy();
    // Deux compteurs à « 3 » : celui du fil, et le total global de l'en-tête —
    // qui ne suit ni la page ni le filtre affichés, et se trouve ici valoir la
    // même chose parce qu'un seul fil a des non-lus.
    expect(screen.getAllByText('3')).toHaveLength(2);
  });

  it('préfère l\'agent enregistré au nom de profil WhatsApp', async () => {
    renderPage();

    // « Lac 2 » est choisi par la personne elle-même : il ne doit pas passer
    // pour l'identité vérifiée d'un agent.
    await waitFor(() => expect(screen.getByText('BEN SALAH Karim')).toBeTruthy());
    expect(screen.queryByText('Lac 2')).toBeNull();
  });

  it('retombe sur le numéro quand aucun agent ne porte ce numéro', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('21655000222')).toBeTruthy());
  });

  it('affiche la fiche et la réponse dans le même fil', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('BEN SALAH Karim')).toBeTruthy());
    fireEvent.click(screen.getByText('BEN SALAH Karim'));

    await waitFor(() => expect(screen.getByText('Fiche de police transmise')).toBeTruthy());
    // L'identité du voyageur n'apparaît QUE dans le fil, jamais dans la liste.
    expect(screen.getByText('DUPONT Jean')).toBeTruthy();
    expect(screen.getAllByText('Merci, bien reçu').length).toBeGreaterThan(0);
  });

  it('envoie une réponse quand la fenêtre de 24 h est ouverte', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('BEN SALAH Karim')).toBeTruthy());
    fireEvent.click(screen.getByText('BEN SALAH Karim'));

    const box = await screen.findByLabelText('Votre réponse à l\'autorité…');
    fireEvent.change(box, { target: { value: 'Voici le numéro de passeport.' } });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer/ }));

    await waitFor(() => expect(reply).toHaveBeenCalledWith('c-1', 'Voici le numéro de passeport.'));
  });

  it('ferme la saisie et dit pourquoi hors de la fenêtre de 24 h', async () => {
    thread.mockResolvedValue({
      ...OPEN_THREAD,
      conversation: CONVERSATIONS[1],
      reply: { allowed: false, window_closes_at: null, max_length: 4096, reason: 'NEVER_REPLIED' },
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('21655000222')).toBeTruthy());
    fireEvent.click(screen.getByText('21655000222'));

    // Pas de champ actif : promettre un envoi que Meta refusera serait pire
    // que de refuser tout de suite, et l'écran dit la méthode autorisée.
    await waitFor(() => expect(screen.getByText('Cette autorité n\'a jamais écrit')).toBeTruthy());
    expect(screen.queryByLabelText('Votre réponse à l\'autorité…')).toBeNull();
    expect(screen.getByText(/seul un modèle approuvé passe/)).toBeTruthy();
  });

  it('ne fabrique aucun texte pour un média sans légende', async () => {
    thread.mockResolvedValue({
      ...OPEN_THREAD,
      timeline: [
        {
          ...OPEN_THREAD.timeline[1],
          kind: 'message' as const,
          id: 'm-2',
          type: 'image',
          body: null,
          has_media: true,
          media_mime: 'image/jpeg',
          media_filename: null,
        },
      ],
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('BEN SALAH Karim')).toBeTruthy());
    fireEvent.click(screen.getByText('BEN SALAH Karim'));

    await waitFor(() => expect(screen.getByText('Image')).toBeTruthy());
  });

  it('filtre sur les fils en attente de réponse', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('BEN SALAH Karim')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'En attente' }));

    await waitFor(() =>
      expect(list).toHaveBeenCalledWith(expect.objectContaining({ filter: 'awaiting' })),
    );
  });
});
