// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from '@/i18n/locales/fr.json';

const navigate = vi.fn();
const setAuth = vi.fn();
const registerPasskey = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return { ...actual, useNavigate: () => navigate };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ setAuth }),
}));

vi.mock('@/api/whatsappOtp', () => ({
  whatsappOtpApi: {
    request: async () => undefined,
    verify: async () => session,
  },
}));

vi.mock('@/api/passkeys', () => ({
  passkeysApi: {
    login: () => new Promise(() => {}),
    register: () => registerPasskey(),
  },
}));

vi.mock('@/api/auth', () => ({ authApi: { login: vi.fn() } }));
vi.mock('@/lib/api', () => ({ api: {}, extractErrors: () => 'Erreur.' }));
vi.mock('@/cms/useSeoMeta', () => ({ useSeoMeta: () => {} }));

/*
 * Fichier séparé de LoginPageOtp.test.tsx pour une seule raison : `vi.mock` est
 * appliqué au fichier entier. Ici l'appareil SAIT faire de la biométrie, là il
 * ne sait pas — deux mondes, deux fichiers.
 */
vi.mock('@/lib/webauthn', async () => {
  const actual = await vi.importActual<typeof import('@/lib/webauthn')>('@/lib/webauthn');

  return {
    ...actual,
    isWebAuthnSupported: () => true,
    hasPlatformAuthenticator: async () => true,
    isConditionalMediationAvailable: async () => false,
    // Saveur figée : la vraie détection lit l'user-agent, et celui de jsdom
    // n'est ni un iPhone ni un Mac. Sans cela, le libellé du bouton dépendrait
    // de la version de jsdom.
    detectPasskeyFlavor: () => 'faceid',
  };
});

import { LoginPage } from './LoginPage';

void i18n.use(initReactI18next).init({
  lng: 'fr',
  resources: { fr: { translation: fr } },
  interpolation: { escapeValue: false },
});

/**
 * « Plus besoin de code la prochaine fois » — proposé après une connexion par
 * code, sur un appareil qui sait reconnaître son porteur.
 *
 * La règle qui gouverne cet écran : il ne bloque JAMAIS. « Plus tard », un refus
 * système, une panne réseau — dans les trois cas la fiche s'ouvre. Une
 * proposition de confort ne doit pas pouvoir retenir un policier devant la
 * fiche qu'il est venu consulter.
 */
const session = {
  token: 'tok-123',
  token_type: 'Bearer',
  expires_at: '2026-10-01T00:00:00Z',
  user: { id: 'u1', role: 'authority_user', permissions: [], security: { passkeys_count: 0 } },
};

const signInWithCode = async (user: ReturnType<typeof userEvent.setup>) => {
  const view = render(
    <MemoryRouter initialEntries={['/login?next=%2Fauthority%2Fguests%2Fabc']}>
      <LoginPage />
    </MemoryRouter>,
  );

  await user.click(screen.getByRole('button', { name: new RegExp(fr.auth.otp.entry) }));
  await user.type(screen.getByLabelText(fr.auth.otp.phoneLabel), '20123456');
  await user.click(screen.getByRole('button', { name: new RegExp(fr.auth.otp.sendCode) }));
  await screen.findByLabelText(fr.auth.otp.codeLabel);
  await user.type(screen.getByLabelText(fr.auth.otp.codeLabel), '123456');
  await user.click(screen.getByRole('button', { name: fr.auth.otp.verify }));
  await screen.findByText(fr.auth.otp.passkeyOfferTitle);

  return view;
};

beforeEach(() => {
  navigate.mockReset();
  setAuth.mockReset();
  registerPasskey.mockReset().mockResolvedValue(undefined);
  localStorage.clear();
});

describe('proposition de passkey après une connexion par code', () => {
  it('ouvre la session AVANT de proposer, sans encore naviguer', async () => {
    const user = userEvent.setup();
    await signInWithCode(user);

    // La cérémonie WebAuthn appelle /auth/passkeys/options, qui exige d'être
    // authentifié : la session doit être posée avant la proposition, pas après.
    expect(setAuth).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('« Plus tard » ouvre la fiche sans rien enregistrer', async () => {
    const user = userEvent.setup();
    await signInWithCode(user);

    await user.click(screen.getByRole('button', { name: fr.auth.otp.later }));

    expect(registerPasskey).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/authority/guests/abc');
  });

  it('l\'activation enregistre la passkey puis ouvre la fiche', async () => {
    const user = userEvent.setup();
    await signInWithCode(user);

    await user.click(screen.getByRole('button', { name: new RegExp(fr.passkeys.addWithFaceId) }));

    await waitFor(() => expect(registerPasskey).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith('/authority/guests/abc');
  });

  it('un refus de l\'appareil n\'empêche pas d\'ouvrir la fiche', async () => {
    registerPasskey.mockRejectedValue(new Error('NotAllowedError'));

    const user = userEvent.setup();
    await signInWithCode(user);

    await user.click(screen.getByRole('button', { name: new RegExp(fr.passkeys.addWithFaceId) }));

    // Le point le plus important de cet écran : l'agent n'a rien demandé, c'est
    // nous qui avons proposé. Un échec ne peut pas devenir son problème.
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/authority/guests/abc'));
  });

  it("ne propose qu'une fois par appareil", async () => {
    const user = userEvent.setup();
    const view = await signInWithCode(user);
    await user.click(screen.getByRole('button', { name: fr.auth.otp.later }));

    // `navigate` est un bouchon : la première page reste montée après l'appel.
    // Sans ce démontage, la proposition qu'on vient d'écarter serait encore
    // dans le document, et l'assertion finale la trouverait — en croyant
    // qu'elle vient de la seconde connexion.
    view.unmount();
    navigate.mockReset();

    // Deuxième connexion sur le même appareil : la proposition ne revient pas,
    // et la fiche s'ouvre directement. Refuser doit vouloir dire quelque chose.
    const user2 = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/login?next=%2Fauthority%2Fguests%2Fabc']}>
        <LoginPage />
      </MemoryRouter>,
    );
    await user2.click(screen.getByRole('button', { name: new RegExp(fr.auth.otp.entry) }));
    await user2.type(screen.getByLabelText(fr.auth.otp.phoneLabel), '20123456');
    await user2.click(screen.getByRole('button', { name: new RegExp(fr.auth.otp.sendCode) }));
    await screen.findByLabelText(fr.auth.otp.codeLabel);
    await user2.type(screen.getByLabelText(fr.auth.otp.codeLabel), '123456');
    await user2.click(screen.getByRole('button', { name: fr.auth.otp.verify }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/authority/guests/abc'));
    expect(screen.queryByText(fr.auth.otp.passkeyOfferTitle)).not.toBeInTheDocument();
  });
});
