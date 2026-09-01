import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint } from 'lucide-react';
import { passkeysApi } from '@/api/passkeys';
import { Button } from '@/components/ui/Button';
import { classifyPasskeyError, type PasskeyFlavor } from '@/lib/webauthn';
import { dismissPasskeyOffer } from '@/lib/whatsappOtp';

/**
 * Libellé d'ACTIVATION, et non de connexion : `passkeyLabelKey` rend
 * « Continuer avec Face ID », qui décrit une connexion — or ici l'agent est
 * déjà connecté, on lui propose d'enregistrer l'appareil.
 */
const enableLabelKey = (flavor: PasskeyFlavor): string =>
  flavor === 'faceid'
    ? 'passkeys.addWithFaceId'
    : flavor === 'touchid'
      ? 'passkeys.addWithTouchId'
      : flavor === 'hello'
        ? 'passkeys.addWithHello'
        : 'passkeys.add';

interface Props {
  flavor: PasskeyFlavor;
  /** Appelé dans TOUS les cas — enregistrement réussi, refusé, ou « Plus tard ». */
  onDone: () => void;
}

/**
 * « Activez Face ID pour vos prochaines connexions » — proposé une fois, juste
 * après une connexion par code WhatsApp.
 *
 * ── Pourquoi ici et pas dans la bannière existante ──────────────────────
 *
 * La bannière `PasskeyPromptBanner` renvoie vers Profil > Sécurité, ce qui a du
 * sens quand on veut nommer son appareil. Pour un agent arrivé de WhatsApp sur
 * un téléphone, qui vient de recevoir un code et veut voir une fiche, ce détour
 * n'aboutit jamais : il ferme l'onglet avant.
 *
 * C'est aussi le seul moment où la proposition a une valeur évidente pour lui —
 * il vient de constater le coût d'un code. Passé cet instant, elle redevient
 * une sollicitation parmi d'autres.
 *
 * ── Ce que cet écran ne fait jamais ─────────────────────────────────────
 *
 * Il ne bloque pas. « Plus tard » passe, un refus système passe, une erreur
 * passe : `onDone` est appelé dans tous les cas, et la fiche s'ouvre. Une
 * proposition de confort ne doit pas pouvoir retenir un policier devant sa
 * fiche.
 */
export const PasskeyOffer = ({ flavor, onDone }: Props) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const finish = () => {
    // Une seule proposition par appareil : la refuser doit vouloir dire
    // quelque chose.
    dismissPasskeyOffer();
    onDone();
  };

  const enable = async () => {
    setLoading(true);
    try {
      await passkeysApi.register();
    } catch (err) {
      // Annulation, appareil qui refuse, panne réseau : rien de tout cela ne
      // justifie de retenir l'agent. On ne montre même pas d'erreur — il n'a
      // rien demandé, c'est nous qui avons proposé.
      classifyPasskeyError(err);
    } finally {
      setLoading(false);
      finish();
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-qayed-cachet-dilue">
        <Fingerprint className="h-7 w-7 text-qayed-cachet" aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-gray-900">{t('auth.otp.passkeyOfferTitle')}</h2>
        <p className="text-sm text-gray-500">{t('auth.otp.passkeyOfferBody')}</p>
      </div>

      <Button fullWidth size="lg" loading={loading} onClick={() => void enable()}>
        <Fingerprint className="h-5 w-5" aria-hidden="true" />
        {t(enableLabelKey(flavor))}
      </Button>

      <Button variant="link" size="sm" disabled={loading} onClick={finish}>
        {t('auth.otp.later')}
      </Button>
    </div>
  );
};
