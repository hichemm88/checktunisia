// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from '@/i18n/locales/fr.json';

const request = vi.fn();
const verify = vi.fn();

vi.mock('@/api/whatsappOtp', () => ({
  whatsappOtpApi: {
    request: (phone: string) => request(phone),
    verify: (phone: string, code: string) => verify(phone, code),
  },
}));

// `extractErrors` lit la forme d'erreur de l'API ; on ne teste pas sa mécanique
// ici, seulement que son message ressort tel quel — l'écran ne doit JAMAIS
// reformuler un refus du serveur en quelque chose de plus précis.
vi.mock('@/lib/api', () => ({
  api: {},
  extractErrors: () => 'Code invalide ou expiré.',
}));

import { WhatsappOtpLogin } from './WhatsappOtpLogin';

/*
 * i18n minimal, avec les VRAIES chaînes françaises — et non un `t` bouchonné
 * qui renverrait la clé.
 *
 * Ce n'est pas un détail de confort : le test central de cet écran porte sur la
 * FORMULATION du message d'envoi (« Si ce numéro est enregistré… »). Avec un
 * bouchon, on vérifierait qu'une clé s'affiche, pas qu'elle dit ce qu'il faut —
 * et quelqu'un pourrait remplacer la traduction par « Numéro inconnu » sans
 * qu'aucun test ne bronche.
 *
 * L'instance de l'application n'est pas réutilisée : elle détecte la langue
 * depuis le navigateur et le stockage local, ce qui rendrait ces tests
 * dépendants de l'environnement.
 */
void i18n.use(initReactI18next).init({
  lng: 'fr',
  resources: { fr: { translation: fr } },
  interpolation: { escapeValue: false },
});

/**
 * Les deux écrans de connexion par code WhatsApp.
 *
 * Trois choses les distinguent d'un formulaire ordinaire, et ce sont les trois
 * que ces tests protègent :
 *
 *  - le message après envoi reste CONDITIONNEL. Le serveur répond la même chose
 *    pour un numéro connu et un numéro inconnu ; un écran qui afficherait
 *    « numéro inconnu » rendrait cette précaution inutile et ferait de la page
 *    de connexion l'annuaire des agents de police ;
 *  - le collage fonctionne, y compris large. Le bouton « Copier le code » de
 *    WhatsApp est le geste NORMAL ici ;
 *  - le succès remonte la session au parent, qui seul sait où emmener l'agent.
 */

beforeEach(() => {
  request.mockReset().mockResolvedValue(undefined);
  verify.mockReset();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const renderPanel = (overrides: Partial<Parameters<typeof WhatsappOtpLogin>[0]> = {}) => {
  const onAuthenticated = vi.fn();
  const onCancel = vi.fn();

  render(
    <WhatsappOtpLogin onAuthenticated={onAuthenticated} onCancel={onCancel} {...overrides} />,
  );

  return { onAuthenticated, onCancel };
};

/** Amène l'écran 2, code déjà demandé. */
const goToCodeStep = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(fr.auth.otp.phoneLabel), '20123456');
  await user.click(screen.getByRole('button', { name: new RegExp(fr.auth.otp.sendCode) }));
  await screen.findByText(fr.auth.otp.codeSent);
};

describe('écran 1 — le numéro', () => {
  it('présélectionne +216 et n\'envoie rien tant que le numéro est incomplet', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect((screen.getByLabelText(fr.auth.otp.dialCodeLabel) as HTMLSelectElement).value).toBe('+216');

    const submit = screen.getByRole('button', { name: new RegExp(fr.auth.otp.sendCode) });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(fr.auth.otp.phoneLabel), '2012');
    expect(submit).toBeDisabled();
    expect(request).not.toHaveBeenCalled();
  });

  it('envoie le numéro normalisé, indicatif compris', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByLabelText(fr.auth.otp.phoneLabel), '020 123 456');
    await user.click(screen.getByRole('button', { name: new RegExp(fr.auth.otp.sendCode) }));

    await waitFor(() => expect(request).toHaveBeenCalledWith('21620123456'));
  });

  it('affiche un message conditionnel, jamais « numéro inconnu »', async () => {
    const user = userEvent.setup();
    renderPanel();

    await goToCodeStep(user);

    const message = screen.getByText(fr.auth.otp.codeSent);
    expect(message).toBeInTheDocument();
    // La formulation porte tout le poids de l'anti-énumération côté écran.
    expect(message.textContent).toMatch(/^Si ce numéro est enregistré/);
    expect(document.body.textContent).not.toMatch(/inconnu|introuvable|non enregistré/i);
  });

  it('rend la main au mot de passe', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderPanel();

    await user.click(screen.getByRole('button', { name: new RegExp(fr.auth.otp.backToPassword) }));

    expect(onCancel).toHaveBeenCalled();
  });
});

describe('écran 2 — le code', () => {
  it('n\'active la validation qu\'à six chiffres', async () => {
    const user = userEvent.setup();
    renderPanel();
    await goToCodeStep(user);

    const submit = screen.getByRole('button', { name: fr.auth.otp.verify });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(fr.auth.otp.codeLabel), '12345');
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(fr.auth.otp.codeLabel), '6');
    expect(submit).toBeEnabled();
  });

  it('accepte un collage plus large que le code', async () => {
    const user = userEvent.setup();
    renderPanel();
    await goToCodeStep(user);

    const field = screen.getByLabelText(fr.auth.otp.codeLabel) as HTMLInputElement;
    await user.click(field);
    // Ce que dépose « Copier le code » dépend de ce que l'utilisateur a
    // sélectionné : sans filtre, ce collage donnerait « code invalide » sur un
    // code parfaitement bon.
    await user.paste('Votre code est 123456');

    expect(field.value).toBe('123456');
  });

  it('propose le clavier numérique et le remplissage automatique du code', async () => {
    const user = userEvent.setup();
    renderPanel();
    await goToCodeStep(user);

    const field = screen.getByLabelText(fr.auth.otp.codeLabel);
    // Ces deux attributs sont ce qui fait apparaître le code au-dessus du
    // clavier sur iOS et Android — l'écran s'ouvre depuis WhatsApp, sur
    // téléphone, c'est le parcours nominal et non un cas limite.
    expect(field).toHaveAttribute('inputmode', 'numeric');
    expect(field).toHaveAttribute('autocomplete', 'one-time-code');
  });

  it('affiche un compte à rebours de cinq minutes', async () => {
    const user = userEvent.setup();
    renderPanel();
    await goToCodeStep(user);

    expect(screen.getByText(/5:00/)).toBeInTheDocument();
  });

  it('désactive « Renvoyer » pendant soixante secondes', async () => {
    const user = userEvent.setup();
    renderPanel();
    await goToCodeStep(user);

    expect(screen.getByRole('button', { name: /Renvoyer le code \(60/ })).toBeDisabled();
    // Une seule demande partie : le bouton ne doit pas pouvoir en déclencher
    // une deuxième dans la foulée, le serveur n'en autorise que trois.
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('remonte la session au parent en cas de succès', async () => {
    const session = {
      token: 'tok-123',
      token_type: 'Bearer',
      expires_at: '2026-10-01T00:00:00Z',
      user: { id: 'u1', role: 'authority_user', security: { passkeys_count: 0 } },
    };
    verify.mockResolvedValue(session);

    const user = userEvent.setup();
    const { onAuthenticated } = renderPanel();
    await goToCodeStep(user);

    await user.type(screen.getByLabelText(fr.auth.otp.codeLabel), '123456');
    await user.click(screen.getByRole('button', { name: fr.auth.otp.verify }));

    // Le panneau ne navigue pas lui-même : il rend la session au parent, seul à
    // connaître la destination visée (`next`) et l'étape passkey.
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(session));
    expect(verify).toHaveBeenCalledWith('21620123456', '123456');
  });

  it('relaie le refus du serveur sans le préciser, et vide le champ', async () => {
    verify.mockRejectedValue({ response: { data: {} } });

    const user = userEvent.setup();
    const { onAuthenticated } = renderPanel();
    await goToCodeStep(user);

    await user.type(screen.getByLabelText(fr.auth.otp.codeLabel), '000000');
    await user.click(screen.getByRole('button', { name: fr.auth.otp.verify }));

    // Un seul message pour code faux, périmé, déjà utilisé et numéro
    // verrouillé : l'écran ne sait pas lequel, et inventer plus précis serait
    // inventer faux.
    expect(await screen.findByRole('alert')).toHaveTextContent('Code invalide ou expiré.');
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect((screen.getByLabelText(fr.auth.otp.codeLabel) as HTMLInputElement).value).toBe('');
  });

  it('permet de revenir corriger le numéro', async () => {
    const user = userEvent.setup();
    renderPanel();
    await goToCodeStep(user);

    await user.click(screen.getByRole('button', { name: new RegExp(fr.auth.otp.changeNumber) }));

    expect(screen.getByLabelText(fr.auth.otp.phoneLabel)).toBeInTheDocument();
  });
});
