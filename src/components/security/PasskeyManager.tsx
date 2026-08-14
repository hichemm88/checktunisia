import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  CheckCircle,
  Fingerprint,
  KeyRound,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { passkeysApi, recoveryCodesApi, type Passkey } from '@/api/passkeys';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { extractErrors, extractErrorDetail } from '@/lib/api';
import {
  classifyPasskeyError,
  detectPasskeyFlavor,
  hasPlatformAuthenticator,
  isWebAuthnSupported,
  passkeyErrorKey,
  type PasskeyFlavor,
} from '@/lib/webauthn';

const dateLocaleFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-TN');

/**
 * Profil → Sécurité → Passkeys.
 *
 * Le même écran pour tous les rôles : la passkey appartient au compte.
 * On y voit ce qu'il faut pour repérer un accès qu'on n'a pas créé — nom de
 * l'appareil, date d'ajout, dernière utilisation — et l'on peut révoquer.
 */
export const PasskeyManager = () => {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [maxAllowed, setMaxAllowed] = useState(10);
  const [recoveryRemaining, setRecoveryRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Cause technique renvoyée par le serveur pour l'enregistrement d'une
  // passkey : c'est elle qui distingue « recommencez » d'une configuration à
  // corriger, et elle évite d'avoir à ouvrir le journal d'audit.
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [flavor, setFlavor] = useState<PasskeyFlavor | null>(null);

  // Affichés une seule fois, à l'activation de la première passkey.
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (isWebAuthnSupported()) {
      hasPlatformAuthenticator().then((hasPlatform) => setFlavor(detectPasskeyFlavor(hasPlatform)));
    }

    passkeysApi
      .list()
      .then((data) => {
        setPasskeys(data.passkeys);
        setMaxAllowed(data.max_allowed);
        setRecoveryRemaining(data.recovery_codes_remaining);
      })
      .catch((err) => setError(extractErrors(err)))
      .finally(() => setLoading(false));
  }, []);

  /** Garde l'état de sécurité du store en phase avec ce que le serveur vient de dire. */
  const syncSecurity = (passkeysCount: number, recoveryCodesRemaining?: number) => {
    if (!user) return;
    setUser({
      ...user,
      security: {
        two_factor_enabled: user.security?.two_factor_enabled ?? false,
        auth_method: user.security?.auth_method ?? null,
        recovery_codes_remaining: recoveryCodesRemaining ?? user.security?.recovery_codes_remaining ?? 0,
        passkeys_count: passkeysCount,
      },
    });
  };

  const handleAdd = async () => {
    setError('');
    setErrorDetail(null);
    setSuccess('');
    setBusy(true);
    try {
      const result = await passkeysApi.register(newName.trim() || undefined);
      setPasskeys((prev) => [result.passkey, ...prev]);
      setNewName('');
      setSuccess(t('passkeys.addSuccess'));
      if (result.recovery_codes) setFreshCodes(result.recovery_codes);
      setRecoveryRemaining(result.security.recovery_codes_remaining);
      syncSecurity(result.security.passkeys_count, result.security.recovery_codes_remaining);
    } catch (err) {
      const kind = classifyPasskeyError(err);
      if (kind !== 'cancelled') {
        setError((err as { response?: unknown })?.response ? extractErrors(err) : t(passkeyErrorKey(kind)));
        setErrorDetail(extractErrorDetail(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (id: string) => {
    const name = renameValue.trim();
    if (!name) return;
    setError('');
    try {
      const updated = await passkeysApi.rename(id, name);
      setPasskeys((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setRenamingId(null);
    } catch (err) {
      setError(extractErrors(err));
    }
  };

  const handleRevoke = async (passkey: Passkey) => {
    if (!window.confirm(t('passkeys.confirmRevoke', { name: passkey.device_name }))) return;
    setError('');
    setSuccess('');
    try {
      const { security } = await passkeysApi.revoke(passkey.id);
      setPasskeys((prev) => prev.filter((p) => p.id !== passkey.id));
      setSuccess(t('passkeys.revokeSuccess'));
      syncSecurity(security.passkeys_count);
    } catch (err) {
      setError(extractErrors(err));
    }
  };

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(dateLocaleFor(i18n.language), {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : t('passkeys.neverUsed');

  const supported = isWebAuthnSupported();
  const atLimit = passkeys.length >= maxAllowed;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-qayed-cachet-dilue">
          <Fingerprint className="h-5 w-5 text-qayed-cachet" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t('passkeys.title')}</h3>
          <p className="text-xs text-gray-500">{t('passkeys.subtitle')}</p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p>{error}</p>
            {errorDetail && (
              <p className="mt-1 break-words font-mono text-xs text-red-600/80">{errorDetail}</p>
            )}
          </div>
        </div>
      )}

      {/* Codes de récupération remis à l'activation de la première passkey.
          Ils n'existent en clair qu'ici, une seule fois. */}
      {freshCodes && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-900">{t('passkeys.recoveryTitle')}</p>
          <p className="text-xs text-amber-800">{t('passkeys.recoveryHint')}</p>
          <ul className="grid grid-cols-2 gap-1.5 font-mono text-sm text-amber-900">
            {freshCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <Button variant="secondary" size="sm" onClick={() => setFreshCodes(null)}>
            {t('passkeys.recoverySaved')}
          </Button>
        </div>
      )}

      {!supported && (
        <p className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-600">
          {t('passkeys.unsupportedHere')}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t('common.loading')}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {passkeys.map((passkey) => (
            <li key={passkey.id} className="flex items-center justify-between gap-3 py-3">
              {renamingId === passkey.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    maxLength={60}
                    aria-label={t('passkeys.renameLabel')}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => handleRename(passkey.id)}>
                    {t('common.save')}
                  </Button>
                  <Button size="sm" variant="link" onClick={() => setRenamingId(null)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{passkey.device_name}</p>
                    <p className="text-xs text-gray-500">
                      {t('passkeys.lastUsed', { date: formatDate(passkey.last_used_at) })}
                      {passkey.backed_up ? ` · ${t('passkeys.synced')}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="icon"
                      size="sm"
                      aria-label={t('passkeys.rename')}
                      onClick={() => {
                        setRenamingId(passkey.id);
                        setRenameValue(passkey.device_name);
                      }}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="icon"
                      size="sm"
                      aria-label={t('passkeys.revoke')}
                      onClick={() => handleRevoke(passkey)}
                    >
                      <Trash2 className="h-4 w-4 text-qayed-erreur" aria-hidden="true" />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
          {passkeys.length === 0 && (
            <li className="py-3 text-sm text-gray-500">{t('passkeys.empty')}</li>
          )}
        </ul>
      )}

      {supported && !atLimit && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <Input
            label={t('passkeys.nameLabel')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('passkeys.namePlaceholder')}
            maxLength={60}
            hint={t('passkeys.nameHint')}
          />
          <Button fullWidth loading={busy} onClick={handleAdd}>
            <Fingerprint className="h-4 w-4" aria-hidden="true" />
            {flavor === 'faceid'
              ? t('passkeys.addWithFaceId')
              : flavor === 'touchid'
                ? t('passkeys.addWithTouchId')
                : flavor === 'hello'
                  ? t('passkeys.addWithHello')
                  : t('passkeys.add')}
          </Button>
        </div>
      )}

      {atLimit && (
        <p className="text-xs text-gray-500">{t('passkeys.limitReached', { max: maxAllowed })}</p>
      )}

      {recoveryRemaining !== null && passkeys.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          {t('passkeys.recoveryRemaining', { count: recoveryRemaining })}
        </p>
      )}
    </div>
  );
};

/**
 * Régénération des codes de récupération. Séparée du bloc ci-dessus parce
 * qu'elle exige le mot de passe actuel : une session laissée ouverte ne doit
 * pas suffire à se fabriquer un second accès durable au compte.
 */
export const RecoveryCodesPanel = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Le champ mot de passe ne s'affiche qu'à la demande : sinon l'écran
  // Sécurité montrait deux « Mot de passe actuel » côte à côte — celui-ci et
  // celui du changement de mot de passe — sans que rien ne les distingue.
  const [confirming, setConfirming] = useState(false);

  const handleRegenerate = async () => {
    setError('');
    setBusy(true);
    try {
      const { recovery_codes } = await recoveryCodesApi.regenerate(password);
      setCodes(recovery_codes);
      setPassword('');
    } catch (err) {
      setError(extractErrors(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-qayed-cachet-dilue">
          <KeyRound className="h-5 w-5 text-qayed-cachet" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t('passkeys.recoveryPanelTitle')}</h3>
          <p className="text-xs text-gray-500">{t('passkeys.recoveryPanelSubtitle')}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {codes ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-xs text-amber-800">{t('passkeys.recoveryHint')}</p>
          <ul className="grid grid-cols-2 gap-1.5 font-mono text-sm text-amber-900">
            {codes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </div>
      ) : confirming ? (
        <>
          <Input
            label={t('profile.currentPassword')}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={t('passkeys.regenerateHint')}
          />
          <div className="flex gap-2">
            <Button fullWidth loading={busy} disabled={!password} onClick={handleRegenerate}>
              {t('passkeys.regenerate')}
            </Button>
            <Button variant="link" onClick={() => { setConfirming(false); setPassword(''); setError(''); }}>
              {t('common.cancel')}
            </Button>
          </div>
        </>
      ) : (
        <Button fullWidth variant="secondary" onClick={() => setConfirming(true)}>
          {t('passkeys.regenerate')}
        </Button>
      )}
    </div>
  );
};
