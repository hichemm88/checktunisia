import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Fingerprint, MessageCircle } from 'lucide-react';
import { authApi, type LoginResult } from '@/api/auth';
import { passkeysApi } from '@/api/passkeys';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { QayedStamp } from '@/components/ui/QayedStamp';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { PublisherNotice } from '@/components/ui/PublisherNotice';
import { extractErrors } from '@/lib/api';
import { homePathForRole, isPathAllowedForRole } from '@/lib/roleRoutes';
import { readIntendedPath } from '@/lib/intendedRoute';
import { useSeoMeta } from '@/cms/useSeoMeta';
import { WhatsappOtpLogin } from './WhatsappOtpLogin';
import { PasskeyOffer } from './PasskeyOffer';
import { passkeyOfferDismissed } from '@/lib/whatsappOtp';
import {
  classifyPasskeyError,
  detectPasskeyFlavor,
  hasPlatformAuthenticator,
  isConditionalMediationAvailable,
  isWebAuthnSupported,
  passkeyErrorKey,
  passkeyLabelKey,
  type PasskeyFlavor,
} from '@/lib/webauthn';

export const LoginPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Destination visée avant la redirection vers cette page — typiquement la
  // fiche ouverte depuis le bouton d'un message WhatsApp.
  const intended = readIntendedPath(location.search);

  useSeoMeta({
    title: t('seo.loginTitle'),
    description: t('seo.loginDescription'),
    lang: i18n.language,
    canonicalPath: '/login',
  });
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Passkeys ──────────────────────────────────────────────────────────────
  // `null` tant que la détection n'a pas répondu : on n'affiche RIEN plutôt
  // qu'un bouton qui disparaîtrait sous le doigt de l'utilisateur.
  const [flavor, setFlavor] = useState<PasskeyFlavor | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const conditionalAbort = useRef<AbortController | null>(null);

  // ── Code WhatsApp ─────────────────────────────────────────────────────────
  // Troisième chemin de connexion, pour les agents autorité : leur adresse
  // e-mail est fictive, ils n'ont jamais pu activer de mot de passe, et le
  // téléphone sur lequel la fiche vient d'arriver est leur seul facteur.
  //
  // `otpSession` retient la session ouverte le temps de proposer une passkey.
  // Sans cette étape, l'agent redemanderait un code à chaque connexion — et
  // c'est le seul instant où la proposition a une valeur évidente pour lui,
  // puisqu'il vient d'en constater le coût.
  const [mode, setMode] = useState<'credentials' | 'otp'>('credentials');
  const [otpSession, setOtpSession] = useState<LoginResult | null>(null);

  const finishLogin = (token: string, user: Parameters<typeof setAuth>[1], expiresAt: string) => {
    setAuth(token, { ...user, _token_expires_at: expiresAt });
    // `intended` d'abord : place ici, il couvre TOUS les chemins de connexion —
    // mot de passe, bouton passkey, remplissage conditionnel, code WhatsApp. Un
    // agent qui suit le lien d'un message WhatsApp peut tres bien s'authentifier
    // par Face ID ; la fiche doit l'attendre dans tous les cas.
    //
    // Mais seulement si elle reste accessible au rôle qui vient de se
    // connecter : ce `next` peut dater d'une session précédente, d'un autre
    // rôle (ex. `/hotel/dashboard` resté dans l'URL après une déconnexion,
    // puis une connexion en admin plateforme). Sans ce contrôle, RequireRole
    // renvoie aussitôt vers ce même /login?next=... — la connexion semble ne
    // jamais aboutir.
    const destination = intended && isPathAllowedForRole(intended, user.role) ? intended : homePathForRole(user.role);
    navigate(destination);
  };

  /**
   * Session ouverte par code WhatsApp.
   *
   * La session est posée TOUT DE SUITE — la cérémonie WebAuthn qui suit
   * éventuellement appelle /auth/passkeys/options, qui exige d'être
   * authentifié. La navigation, elle, attend la réponse à la proposition.
   */
  const handleOtpAuthenticated = (result: LoginResult) => {
    const offerPasskey =
      flavor !== null && (result.user.security?.passkeys_count ?? 1) === 0 && !passkeyOfferDismissed();

    if (offerPasskey) {
      setAuth(result.token, { ...result.user, _token_expires_at: result.expires_at });
      setOtpSession(result);
      return;
    }

    finishLogin(result.token, result.user, result.expires_at);
  };

  // Détection des capacités réelles de l'appareil. Le libellé « Face ID » n'est
  // proposé que si un authentificateur intégré existe vraiment.
  useEffect(() => {
    let cancelled = false;

    if (!isWebAuthnSupported()) {
      setFlavor(null);
      return;
    }

    hasPlatformAuthenticator().then((hasPlatform) => {
      if (!cancelled) setFlavor(detectPasskeyFlavor(hasPlatform));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Remplissage conditionnel : quand le navigateur le sait faire, la passkey
  // apparaît directement dans l'autocomplétion du champ e-mail. L'appel reste
  // en attente jusqu'au choix de l'utilisateur, d'où l'interruption au
  // démontage et dès qu'il bascule sur le mot de passe.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    conditionalAbort.current = controller;

    isConditionalMediationAvailable().then((available) => {
      if (!available || cancelled) return;

      passkeysApi
        .login({ mediation: 'conditional', signal: controller.signal })
        .then((result) => {
          if (!cancelled) finishLogin(result.token, result.user, result.expires_at);
        })
        .catch(() => {
          // Annulation, absence de passkey sur l'appareil, ou navigation :
          // ce chemin est silencieux par construction — il ne doit jamais
          // afficher d'erreur à quelqu'un qui tapait simplement son mot de passe.
        });
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePasskeyLogin = async () => {
    setError('');
    setPasskeyLoading(true);
    // La cérémonie explicite prend la main sur l'attente en arrière-plan.
    conditionalAbort.current?.abort();

    try {
      const result = await passkeysApi.login();
      finishLogin(result.token, result.user, result.expires_at);
    } catch (err) {
      const kind = classifyPasskeyError(err);
      // Une annulation n'est pas une erreur : l'utilisateur a peut-être
      // simplement décidé de saisir son mot de passe, qui l'attend juste
      // en dessous. Lui afficher un bandeau rouge serait inutilement inquiétant.
      if (kind === 'cancelled') return;
      // Refus venu du serveur (passkey révoquée, compte suspendu) : son message
      // est plus précis que le nôtre.
      setError((err as { response?: unknown })?.response ? extractErrors(err) : t(passkeyErrorKey(kind)));
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    conditionalAbort.current?.abort();
    try {
      const result = await authApi.login(email, password);
      // Compte avec 2FA activée → étape de vérification TOTP.
      // Le garde `in` narrow de façon fiable l'union (le discriminant
      // requires_2fa est optionnel côté LoginResult, ce qui empêche le
      // narrowing par booléen).
      if (!('token' in result)) {
        // La destination traverse l'étape 2FA : sans cela, tout compte soumis à
        // la double authentification — c'est-à-dire tous les agents — perdrait
        // le lien sur lequel il vient de cliquer.
        navigate('/auth/2fa/verify', { state: { partialToken: result.partial_token, next: intended } });
        return;
      }
      finishLogin(result.token, result.user, result.expires_at);
    } catch (err) {
      setError(extractErrors(err));
    } finally {
      setLoading(false);
    }
  };

  const passkeyAvailable = flavor !== null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: 'var(--qayed-papier)' }}>
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <QayedStamp size={56} />
          <div className="text-center">
            <h1 className="qayed-display text-2xl text-qayed-encre">QAYED</h1>
            <p className="text-sm text-gray-500">{t('auth.tagline')}</p>
          </div>
        </div>

        {/* Proposition de passkey, une seule fois, juste après une connexion par
            code. Elle ne bloque rien : « Plus tard » — comme un refus ou une
            erreur — ouvre la fiche visée. */}
        {otpSession && flavor !== null && (
          <div className="card p-6">
            <PasskeyOffer
              flavor={flavor}
              onDone={() =>
                finishLogin(otpSession.token, otpSession.user, otpSession.expires_at)
              }
            />
          </div>
        )}

        {/* Connexion par code WhatsApp — deux écrans, dans la même carte. */}
        {!otpSession && mode === 'otp' && (
          <div className="card p-6">
            <WhatsappOtpLogin
              onAuthenticated={handleOtpAuthenticated}
              onCancel={() => setMode('credentials')}
            />
          </div>
        )}

        {/* Form */}
        {!otpSession && mode === 'credentials' && (
        <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">
          <h2 className="text-center text-base font-semibold text-gray-900">{t('auth.loginTitle')}</h2>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Passkey d'abord : c'est le chemin le plus court ET le plus sûr.
              Le mot de passe reste visible juste en dessous — « utiliser une
              autre méthode » ne doit pas être une porte cachée, et le champ
              e-mail doit exister dans le DOM pour que le remplissage
              conditionnel du navigateur ait un point d'ancrage. */}
          {passkeyAvailable && (
            <>
              <Button
                type="button"
                fullWidth
                size="lg"
                loading={passkeyLoading}
                onClick={handlePasskeyLogin}
              >
                <Fingerprint className="h-5 w-5" aria-hidden="true" />
                {t(passkeyLabelKey(flavor))}
              </Button>

              <div className="flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-gray-200" />
                <span className="text-xs uppercase tracking-wide text-gray-400">{t('passkeys.or')}</span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>
            </>
          )}

          <Input
            label={t('auth.emailLabel')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            required
            // « webauthn » ajoute la passkey à l'autocomplétion du champ, là où
            // le navigateur sait le faire (remplissage conditionnel).
            autoComplete="username webauthn"
          />

          <Input
            label={t('auth.passwordLabel')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            fullWidth
            loading={loading}
            size="lg"
            variant={passkeyAvailable ? 'secondary' : 'primary'}
          >
            {t('auth.loginButton')}
          </Button>

          <Link
            to="/forgot-password"
            className="text-center text-sm font-medium hover:underline"
            style={{ color: 'var(--qayed-cachet)' }}
          >
            {t('auth.forgotPassword')}
          </Link>

          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-xs uppercase tracking-wide text-gray-400">{t('passkeys.or')}</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Dernier des trois chemins, et pas le premier : il ne concerne que
              les agents autorité. Visible sans repli déroulant pour autant —
              c'est le SEUL chemin praticable pour eux, une porte cachée les
              laisserait dehors. */}
          <Button
            type="button"
            variant="ghost"
            fullWidth
            size="lg"
            onClick={() => {
              conditionalAbort.current?.abort();
              setError('');
              setMode('otp');
            }}
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            {t('auth.otp.entry')}
          </Button>
        </form>
        )}

        <p className="mt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} {t('auth.footer')}
        </p>
        <PublisherNotice />
      </div>
    </div>
  );
};
