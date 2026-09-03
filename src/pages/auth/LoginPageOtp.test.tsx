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
const otpRequest = vi.fn();
const otpVerify = vi.fn();
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
    request: (phone: string) => otpRequest(phone),
    verify: (phone: string, code: string) => otpVerify(phone, code),
  },
}));

vi.mock('@/api/passkeys', () => ({
  passkeysApi: {
    login: () => new Promise(() => {}), // le remplissage conditionnel n'aboutit jamais
    register: () => registerPasskey(),
  },
}));

vi.mock('@/api/auth', () => ({ authApi: { login: vi.fn() } }));
vi.mock('@/lib/api', () => ({ api: {}, extractErrors: () => 'Erreur.' }));
vi.mock('@/cms/useSeoMeta', () => ({ useSeoMeta: () => {} }));

// Aucun authentificateur intégré : la proposition de passkey ne s'affiche pas,
// et le succès va donc DIRECTEMENT à la navigation. C'est le chemin par défaut,
// celui qu'il faut protéger en premier.
vi.mock('@/lib/webauthn', async () => {
  const actual = await vi.importActual<typeof import('@/lib/webauthn')>('@/lib/webauthn');

  return {
    ...actual,
    isWebAuthnSupported: () => false,
    hasPlatformAuthenticator: async () => false,
    isConditionalMediationAvailable: async () => false,
  };
});

import { LoginPage } from './LoginPage';

void i18n.use(initReactI18next).init({
  lng: 'fr',
  resources: { fr: { translation: fr } },
  interpolation: { escapeValue: false },
});

/**
 * Le raccordement de la connexion par code à la page de connexion.
 *
 * Un seul point compte vraiment ici, et il n'est visible qu'à ce niveau : le
 * succès doit passer par `finishLogin`, comme le mot de passe et les passkeys.
 * C'est `finishLogin` qui honore la destination visée (`next`) — un agent qui
 * arrive du bouton d'un message WhatsApp doit atterrir SUR SA FICHE, pas sur le
 * tableau de bord. Sans cela, le premier clic n'aboutit pas ; et sur un levier
 * d'adoption, il n'y a pas de second clic.
 */
const session = {
  token: 'tok-123',
  token_type: 'Bearer',
  expires_at: '2026-10-01T00:00:00Z',
  user: { id: 'u1', role: 'authority_user', permissions: [], security: { passkeys_count: 0 } },
};

const renderLogin = (url = '/login?next=%2Fauthority%2Fguests%2Fabc') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <LoginPage />
    </MemoryRouter>,
  );

/** Va jusqu'à la session ouverte : entrée OTP, numéro, code. */
const signInWithCode = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: new RegExp(fr.auth.otp.entry) }));
  await user.type(screen.getByLabelText(fr.auth.otp.phoneLabel), '20123456');
  await user.click(screen.getByRole('button', { name: new RegExp(fr.auth.otp.sendCode) }));
  await screen.findByLabelText(fr.auth.otp.codeLabel);
  await user.type(screen.getByLabelText(fr.auth.otp.codeLabel), '123456');
  await user.click(screen.getByRole('button', { name: fr.auth.otp.verify }));
};

beforeEach(() => {
  navigate.mockReset();
  setAuth.mockReset();
  otpRequest.mockReset().mockResolvedValue(undefined);
  otpVerify.mockReset().mockResolvedValue(session);
  registerPasskey.mockReset().mockResolvedValue(undefined);
  localStorage.clear();
});

describe('connexion par code, depuis la page de connexion', () => {
  it('propose le chemin WhatsApp sans le cacher derrière un repli', () => {
    renderLogin();

    // C'est le SEUL chemin praticable pour un agent autorité : son adresse
    // e-mail est fictive, il n'a jamais eu de mot de passe. Une porte cachée le
    // laisserait dehors.
    expect(screen.getByRole('button', { name: new RegExp(fr.auth.otp.entry) })).toBeInTheDocument();
  });

  it('remplace le formulaire par les écrans de code, et sait revenir', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: new RegExp(fr.auth.otp.entry) }));

    expect(screen.getByLabelText(fr.auth.otp.phoneLabel)).toBeInTheDocument();
    expect(screen.queryByLabelText(fr.auth.passwordLabel)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: new RegExp(fr.auth.otp.backToPassword) }));

    expect(screen.getByLabelText(fr.auth.passwordLabel)).toBeInTheDocument();
  });

  it('ouvre la session et part sur la destination visée', async () => {
    const user = userEvent.setup();
    renderLogin();

    await signInWithCode(user);

    await waitFor(() =>
      expect(setAuth).toHaveBeenCalledWith('tok-123', expect.objectContaining({
        id: 'u1',
        _token_expires_at: '2026-10-01T00:00:00Z',
      })),
    );

    // Le point de tout ce parcours : la fiche, et non l'accueil du rôle.
    expect(navigate).toHaveBeenCalledWith('/authority/guests/abc');
  });

  it('retombe sur l\'accueil du rôle quand aucune destination n\'était visée', async () => {
    const user = userEvent.setup();
    renderLogin('/login');

    await signInWithCode(user);

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalledWith('/authority/guests/abc');
  });
});

describe('destination visée incompatible avec le rôle nouvellement authentifié', () => {
  it("ignore un `next` qui vise une route d'un autre rôle et repart sur l'accueil du rôle réel", async () => {
    const user = userEvent.setup();
    // Le `next` vise le portail autorité, mais le compte qui se connecte est
    // un admin plateforme — ex. `/hotel/dashboard` ou `/authority/...` resté
    // dans l'URL après une déconnexion suivie d'une connexion sous un autre
    // rôle. Sans ce contrôle, RequireRole aurait aussitôt renvoyé vers ce
    // même /login?next=..., et la connexion aurait semblé figée.
    otpVerify.mockReset().mockResolvedValue({
      ...session,
      user: { ...session.user, role: 'platform_admin' },
    });
    renderLogin('/login?next=%2Fauthority%2Fguests%2Fabc');

    await signInWithCode(user);

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith('/admin/dashboard');
    expect(navigate).not.toHaveBeenCalledWith('/authority/guests/abc');
  });
});

describe('proposition de passkey après une connexion par code', () => {
  it('ne propose rien quand l\'appareil n\'a pas d\'authentificateur intégré', async () => {
    const user = userEvent.setup();
    renderLogin();

    await signInWithCode(user);

    // Rien ne doit s'interposer : sans biométrie, la proposition n'aurait de
    // sens qu'avec une clé de sécurité, que l'agent ne possède pas.
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/authority/guests/abc'));
    expect(screen.queryByText(fr.auth.otp.passkeyOfferTitle)).not.toBeInTheDocument();
  });
});
