// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from '@/i18n/locales/fr.json';

const navigate = vi.fn();
const setAuth = vi.fn();
const verify2FA = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return { ...actual, useNavigate: () => navigate };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ setAuth }),
}));

vi.mock('@/api/auth', () => ({ authApi: { verify2FA: (t: string, c: string) => verify2FA(t, c) } }));
vi.mock('@/api/passkeys', () => ({ recoveryCodesApi: { verify: vi.fn() } }));
vi.mock('@/lib/api', () => ({ extractErrors: () => 'Erreur.' }));

import { TwoFactorVerifyPage } from './TwoFactorVerifyPage';

void i18n.use(initReactI18next).init({
  lng: 'fr',
  resources: { fr: { translation: fr } },
  interpolation: { escapeValue: false },
});

/**
 * Étape 2 (TOTP) de la connexion admin plateforme / autorité.
 *
 * Un compte qui se déconnecte puis se reconnecte sous un AUTRE rôle dans le
 * même onglet peut arriver ici avec un `next` hérité de l'URL précédente
 * (ex. `/hotel/dashboard`, resté après une déconnexion). Ce `next` doit être
 * ignoré s'il ne correspond pas au rôle qui vient réellement de s'authentifier
 * — sinon RequireRole renvoie aussitôt vers /login?next=..., et la connexion
 * semble ne jamais aboutir (symptôme rapporté : « l'écran de connexion reste
 * figé »).
 */
describe('TwoFactorVerifyPage — destination visée vs rôle réel', () => {
  beforeEach(() => {
    navigate.mockReset();
    setAuth.mockReset();
    verify2FA.mockReset();
  });

  const renderPage = (next: string | null) =>
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/auth/2fa/verify', state: { partialToken: 'partial-tok', next } }]}
      >
        <Routes>
          <Route path="/auth/2fa/verify" element={<TwoFactorVerifyPage />} />
        </Routes>
      </MemoryRouter>,
    );

  const submitCode = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByRole('textbox'), '123456');
  };

  it("ignore un `next` hérité d'un autre rôle (ex. /hotel/dashboard pour un admin plateforme)", async () => {
    const user = userEvent.setup();
    verify2FA.mockResolvedValue({
      token: 'tok', expires_at: '2026-10-01T00:00:00Z',
      user: { id: 'u1', role: 'platform_admin', permissions: [] },
    });
    renderPage('/hotel/dashboard');

    await submitCode(user);

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith('/admin/dashboard', { replace: true });
    expect(navigate).not.toHaveBeenCalledWith('/hotel/dashboard', expect.anything());
  });

  it('honore un `next` compatible avec le rôle réellement authentifié', async () => {
    const user = userEvent.setup();
    verify2FA.mockResolvedValue({
      token: 'tok', expires_at: '2026-10-01T00:00:00Z',
      user: { id: 'u2', role: 'authority_user', permissions: [] },
    });
    renderPage('/authority/guests/abc');

    await submitCode(user);

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith('/authority/guests/abc', { replace: true });
  });
});
