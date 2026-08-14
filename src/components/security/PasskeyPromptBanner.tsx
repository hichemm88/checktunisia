import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Fingerprint, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import {
  detectPasskeyFlavor,
  hasPlatformAuthenticator,
  isWebAuthnSupported,
  type PasskeyFlavor,
} from '@/lib/webauthn';

const DISMISS_KEY = 'qayed-passkey-prompt-dismissed';

/**
 * « Sécurisez votre compte avec une passkey » — proposé après connexion aux
 * comptes qui n'en ont pas encore.
 *
 * Trois conditions, toutes nécessaires : l'appareil sait le faire, le compte
 * n'a aucune passkey, et l'utilisateur n'a pas déjà écarté la proposition.
 * La bannière renvoie vers Profil → Sécurité plutôt que de lancer la cérémonie
 * sur place : nommer son appareil au moment de l'enregistrement fait la
 * différence entre une liste lisible et cinq lignes « Passkey ».
 */
export const PasskeyPromptBanner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [flavor, setFlavor] = useState<PasskeyFlavor | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!isWebAuthnSupported()) return;
    let cancelled = false;
    hasPlatformAuthenticator().then((hasPlatform) => {
      // Sans authentificateur intégré (poste de bureau sans biométrie), on ne
      // sollicite pas : la proposition n'aurait de sens qu'avec une clé de
      // sécurité, que l'utilisateur ne possède probablement pas.
      if (!cancelled && hasPlatform) setFlavor(detectPasskeyFlavor(true));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // `security` est absent des sessions ouvertes avant le déploiement : dans le
  // doute, on ne propose rien plutôt que de harceler quelqu'un qui a déjà une
  // passkey.
  const alreadyHasPasskey = (user?.security?.passkeys_count ?? 1) > 0;

  if (dismissed || flavor === null || alreadyHasPasskey) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Mode privé : la bannière réapparaîtra à la prochaine session, sans plus.
    }
  };

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-qayed-cachet/20 bg-qayed-cachet-dilue p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
        <Fingerprint className="h-5 w-5 text-qayed-cachet" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-qayed-encre">{t('passkeys.promptTitle')}</p>
        <p className="mt-0.5 text-xs text-gray-600">{t('passkeys.promptBody')}</p>
        <Button size="sm" className="mt-3" onClick={() => navigate('/profile?tab=security')}>
          {flavor === 'faceid'
            ? t('passkeys.promptCtaFaceId')
            : flavor === 'touchid'
              ? t('passkeys.promptCtaTouchId')
              : flavor === 'hello'
                ? t('passkeys.promptCtaHello')
                : t('passkeys.promptCta')}
        </Button>
      </div>
      <Button variant="icon" size="sm" aria-label={t('common.close')} onClick={handleDismiss}>
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
};
