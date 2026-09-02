import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { whatsappOtpApi } from '@/api/whatsappOtp';
import { type LoginResult } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { extractErrors } from '@/lib/api';
import {
  DEFAULT_DIAL_CODE,
  DIAL_CODES,
  formatCountdown,
  isCompleteCode,
  isPlausiblePhone,
  normalizePhone,
  sanitizeCode,
} from '@/lib/whatsappOtp';

/** Validité du code côté serveur, en secondes. */
const CODE_TTL_SECONDS = 5 * 60;

/** Délai avant de pouvoir redemander un code. */
const RESEND_COOLDOWN_SECONDS = 60;

interface Props {
  /** Session ouverte : le parent décide de la suite (passkey, navigation). */
  onAuthenticated: (result: LoginResult) => void;
  /** Retour au mot de passe / à la passkey. */
  onCancel: () => void;
}

/**
 * Connexion par code reçu sur WhatsApp — deux écrans.
 *
 * ── Pour qui, et pourquoi c'est le seul chemin possible ─────────────────
 *
 * Les agents autorité sont enregistrés par l'administrateur avec un nom et un
 * numéro WhatsApp ; leur adresse e-mail est fictive. Ils ne peuvent ni activer
 * un mot de passe, ni recevoir de lien. Le téléphone sur lequel la fiche vient
 * d'arriver est leur seul facteur.
 *
 * ── La règle qui gouverne tous les messages de cet écran ────────────────
 *
 * Le serveur répond la MÊME chose que le numéro soit enregistré ou non. Cet
 * écran ne peut donc jamais afficher « numéro inconnu » — il ne le sait pas, et
 * c'est délibéré : la page est publique, et un message qui distinguerait les
 * deux cas en ferait l'annuaire des agents de police. D'où la formulation
 * conditionnelle après l'envoi, et le message d'erreur unique à la
 * vérification.
 *
 * ── Conçu pour le téléphone d'abord ─────────────────────────────────────
 *
 * Ces écrans s'ouvrent depuis WhatsApp, sur mobile, souvent en déplacement :
 * clavier numérique, champs larges, un seul champ de code (six cases séparées
 * cassent le collage, qui est ici le geste NORMAL — le bouton « Copier le
 * code » de WhatsApp met le code dans le presse-papiers).
 */
export const WhatsappOtpLogin = ({ onAuthenticated, onCancel }: Props) => {
  const { t } = useTranslation();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [dialCode, setDialCode] = useState<string>(DEFAULT_DIAL_CODE);
  const [localNumber, setLocalNumber] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Deux comptes à rebours distincts : la validité du code (5 min, côté
  // serveur) et le droit de le redemander (60 s). Les confondre donnerait soit
  // un bouton « Renvoyer » inutilisable pendant cinq minutes, soit un code
  // qu'on peut redemander en boucle.
  const [expiresIn, setExpiresIn] = useState(0);
  const [resendIn, setResendIn] = useState(0);

  const codeInputRef = useRef<HTMLInputElement>(null);

  const phone = normalizePhone(dialCode, localNumber);
  const phoneReady = isPlausiblePhone(dialCode, localNumber);

  // Un seul intervalle pour les deux comptes à rebours : deux `setInterval`
  // dérivent l'un par rapport à l'autre et donnent un affichage qui saute.
  useEffect(() => {
    if (step !== 'code') return;

    const id = window.setInterval(() => {
      setExpiresIn((value) => Math.max(0, value - 1));
      setResendIn((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(id);
  }, [step]);

  const requestCode = async () => {
    setError('');
    setLoading(true);
    try {
      await whatsappOtpApi.request(phone);
      setExpiresIn(CODE_TTL_SECONDS);
      setResendIn(RESEND_COOLDOWN_SECONDS);
      setCode('');
      setStep('code');
      // Le focus part sur le champ de code : sur téléphone, cela ouvre le
      // clavier numérique sans un geste de plus.
      window.setTimeout(() => codeInputRef.current?.focus(), 0);
    } catch (err) {
      // Seules les pannes réelles (réseau, 429 du limiteur de route) arrivent
      // ici : un numéro non enregistré répond 202 comme les autres.
      setError(extractErrors(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!phoneReady || loading) return;
    void requestCode();
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isCompleteCode(code) || loading) return;

    setError('');
    setLoading(true);
    try {
      const result = await whatsappOtpApi.verify(phone, code);
      onAuthenticated(result);
    } catch (err) {
      // Le serveur ne distingue pas code faux, code périmé, code déjà utilisé
      // et numéro verrouillé : il renvoie un seul message. On le relaie tel
      // quel plutôt que d'en inventer un plus précis, qui serait faux.
      setError(extractErrors(err));
      setCode('');
      codeInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1">
          <h2 className="text-center text-base font-semibold text-gray-900">{t('auth.otp.phoneTitle')}</h2>
          <p className="text-center text-sm text-gray-500">{t('auth.otp.phoneSubtitle')}</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="otp-phone" className="label">
            {t('auth.otp.phoneLabel')}
          </label>
          <div className="flex items-stretch gap-2">
            <select
              aria-label={t('auth.otp.dialCodeLabel')}
              value={dialCode}
              onChange={(e) => setDialCode(e.target.value)}
              className="input h-btn-lg w-24 shrink-0"
            >
              {DIAL_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              id="otp-phone"
              // `tel` et non `number` : `number` masque les zéros de tête,
              // refuse le collage d'un numéro formaté, et affiche des flèches
              // d'incrément qui n'ont aucun sens ici.
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              autoFocus
              value={localNumber}
              onChange={(e) => setLocalNumber(e.target.value)}
              placeholder={t('auth.otp.phonePlaceholder')}
              className="input h-btn-lg flex-1"
            />
          </div>
        </div>

        <Button type="submit" fullWidth size="lg" loading={loading} disabled={!phoneReady}>
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          {t('auth.otp.sendCode')}
        </Button>

        <Button type="button" variant="link" size="sm" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('auth.otp.backToPassword')}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleCodeSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1">
        <h2 className="text-center text-base font-semibold text-gray-900">{t('auth.otp.codeTitle')}</h2>
        {/* Formulation conditionnelle : le serveur n'a pas dit si le numéro
            existe, cet écran ne peut donc pas l'affirmer. */}
        <p className="text-center text-sm text-gray-500">{t('auth.otp.codeSent')}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <Input
        ref={codeInputRef}
        label={t('auth.otp.codeLabel')}
        // Un seul champ, pas six cases : le collage est ici le geste normal, et
        // six champs séparés le cassent sur la moitié des navigateurs mobiles.
        type="text"
        inputMode="numeric"
        // `one-time-code` : iOS et Android proposent alors le code au-dessus du
        // clavier dès sa réception, sans passer par le presse-papiers.
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(sanitizeCode(e.target.value))}
        // Le collage passe par le même filtre : ce que le bouton « Copier le
        // code » de WhatsApp dépose peut porter une espace ou toute une phrase.
        onPaste={(e) => {
          e.preventDefault();
          setCode(sanitizeCode(e.clipboardData.getData('text')));
        }}
        placeholder="000000"
        className="text-center text-2xl tracking-[0.4em]"
        aria-describedby="otp-countdown"
      />

      <p id="otp-countdown" className="text-center text-xs text-gray-500" aria-live="polite">
        {expiresIn > 0
          ? t('auth.otp.expiresIn', { time: formatCountdown(expiresIn) })
          : t('auth.otp.expired')}
      </p>

      <Button type="submit" fullWidth size="lg" loading={loading} disabled={!isCompleteCode(code)}>
        {t('auth.otp.verify')}
      </Button>

      <Button
        type="button"
        variant="link"
        size="sm"
        // Désactivé 60 s. Au-delà, le serveur n'autorise que trois demandes par
        // fenêtre : un quatrième clic reçoit la même réponse neutre que les
        // autres, sans qu'aucun message ne l'annonce — le dire reviendrait à
        // confirmer que le numéro est réel.
        disabled={resendIn > 0 || loading}
        onClick={() => void requestCode()}
      >
        {resendIn > 0 ? t('auth.otp.resendIn', { seconds: resendIn }) : t('auth.otp.resend')}
      </Button>

      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={() => {
          setStep('phone');
          setError('');
          setCode('');
        }}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('auth.otp.changeNumber')}
      </Button>
    </form>
  );
};
