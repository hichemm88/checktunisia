import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Lock, Shield, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasskeyManager, RecoveryCodesPanel } from '@/components/security/PasskeyManager';
import { extractErrors } from '@/lib/api';

type Tab = 'info' | 'security';

const dateLocaleFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-TN');

// Téléphone tunisien : +216 suivi de 8 chiffres. On tolère espaces/points/tirets à la saisie.
const normalizePhone = (v: string) => v.replace(/[\s.\-()]/g, '');
const isValidTnPhone = (v: string) => {
  const n = normalizePhone(v);
  return n === '' || /^\+216\d{8}$/.test(n);
};

const PasswordRule = ({ ok, label }: { ok: boolean; label: string }) => (
  <span className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-gray-300'}`} />
    {label}
  </span>
);

export const ProfilePage = () => {
  const { t, i18n } = useTranslation();
  const navigate  = useNavigate();
  const { user, setUser } = useAuthStore();
  // `?tab=security` : cible de la bannière « Sécurisez votre compte avec une
  // passkey », qui doit atterrir sur le bon onglet et pas sur les informations.
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'security' ? 'security' : 'info');

  // ── Info tab state ───────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName,  setLastName]  = useState(user?.last_name  ?? '');
  const [phone,     setPhone]     = useState(user?.phone ?? '');
  // Email modifiable : exige le mot de passe actuel (identifiant de connexion).
  const [email,     setEmail]     = useState(user?.email ?? '');
  const [emailPwd,  setEmailPwd]  = useState('');
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError,   setInfoError]   = useState('');
  const [infoSuccess, setInfoSuccess] = useState(false);

  // ── Security tab state ───────────────────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError,   setPwdError]   = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);

  // Password complexity checks
  const pwdChecks = {
    length:    newPwd.length >= 12,
    uppercase: /[A-Z]/.test(newPwd),
    lowercase: /[a-z]/.test(newPwd),
    number:    /[0-9]/.test(newPwd),
    symbol:    /[^A-Za-z0-9]/.test(newPwd),
    match:     newPwd.length > 0 && newPwd === confirmPwd,
  };
  const pwdValid = Object.values(pwdChecks).every(Boolean);

  const profile = user?.authority_profile;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleInfoSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInfoError('');
    setInfoSuccess(false);

    // Validation format tunisien AVANT tout appel — on n'affiche jamais un succès
    // si la saisie est invalide (le champ ne serait de toute façon pas persisté).
    if (!isValidTnPhone(phone)) {
      setInfoError(t('profile.invalidPhone'));
      return;
    }

    // L'email est l'identifiant de connexion : le backend exige le mot de passe
    // actuel pour le changer. On le demande donc AVANT d'appeler l'API.
    const emailChanged = email.trim().toLowerCase() !== (user?.email ?? '').toLowerCase();
    if (emailChanged && !emailPwd) {
      setInfoError(t('profile.emailPasswordRequired'));
      return;
    }

    setInfoLoading(true);
    try {
      const updated = await authApi.updateProfile({
        first_name: firstName,
        last_name:  lastName,
        // Envoi normalisé ; chaîne vide → null pour permettre l'effacement.
        phone:      normalizePhone(phone) || null,
        ...(emailChanged ? { email: email.trim(), current_password: emailPwd } : {}),
      });
      // Sync store with the fresh values returned by the API (dont le téléphone —
      // c'était le maillon manquant : sans ça, le rechargement relisait l'ancien
      // état persisté et le numéro « disparaissait »).
      if (user) setUser({ ...user, first_name: updated.first_name, last_name: updated.last_name, phone: updated.phone, email: updated.email });
      setEmail(updated.email);
      setEmailPwd('');
      setInfoSuccess(true);
    } catch (err) {
      setInfoError(extractErrors(err));
    } finally {
      setInfoLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pwdValid) return;
    setPwdError('');
    setPwdSuccess(false);
    setPwdLoading(true);
    try {
      await authApi.changePassword({
        current_password:      currentPwd,
        password:              newPwd,
        password_confirmation: confirmPwd,
      });
      setPwdSuccess(true);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      setPwdError(extractErrors(err));
    } finally {
      setPwdLoading(false);
    }
  };

  // ── Back navigation per role ──────────────────────────────────────────────────
  const backHref = user?.role === 'authority_user'
    ? '/authority/dashboard'
    : user?.role === 'platform_admin'
      ? '/admin/hotels'
      : '/hotel/dashboard';

  return (
    <div className="min-h-screen" style={{ background: 'var(--qayed-papier)' }}>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <button
            onClick={() => navigate(backHref)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="qayed-display text-sm text-gray-900">{t('profile.title')}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">

        {/* ── Authority credential card (read-only) ───────────────────── */}
        {profile && (
          <div
            className="rounded-2xl p-4 text-white"
            style={{ background: 'var(--qayed-cachet)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'var(--qayed-cachet)' }}
                >
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{profile.org_name}</p>
                  <p className="text-xs text-white/50 capitalize">{profile.org_type}</p>
                </div>
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide"
                style={{ background: 'rgba(83,70,168,0.2)', color: 'var(--qayed-cachet)', border: '1px solid rgba(83,70,168,0.4)' }}
              >
                {t('profile.authority')}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {profile.badge_number && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide">{t('profile.badge')}</p>
                  <p className="text-sm font-mono font-semibold text-white">{profile.badge_number}</p>
                </div>
              )}
              {profile.rank && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide">{t('profile.rank')}</p>
                  <p className="text-sm font-semibold text-white">{profile.rank}</p>
                </div>
              )}
              {profile.governorate && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide">{t('profile.governorate')}</p>
                  <p className="text-sm text-white">{profile.governorate}</p>
                </div>
              )}
              {profile.expires_at && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide">{t('profile.expiration')}</p>
                  <p className="text-sm text-white">
                    {new Date(profile.expires_at).toLocaleDateString(dateLocaleFor(i18n.language), {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── User identity card ───────────────────────────────────────── */}
        <div className="rounded-2xl bg-white p-4 flex items-center gap-4 shadow-sm">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: 'var(--qayed-cachet)' }}
          >
            {[user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user?.first_name} {user?.last_name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-blue-700">
              {t(`profile.role.${user?.role}`, { defaultValue: user?.role?.replace('_', ' ') })}
            </span>
            {user?.role === 'hotel_admin' && user.role_org && (
              <span
                className="mt-1 ms-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
                style={{ background: 'var(--qayed-cachet-dilue)', color: 'var(--qayed-cachet)' }}
              >
                {user.role_org === 'owner' ? t('hotelLayout.roleOwner') : t('hotelLayout.roleAdmin')}
              </span>
            )}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex rounded-2xl bg-white shadow-sm overflow-hidden">
          {(['info', 'security'] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                tab === tabKey
                  ? 'border-b-2 text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              style={tab === tabKey ? { borderColor: 'var(--qayed-cachet)', color: 'var(--qayed-cachet)' } : undefined}
            >
              {tabKey === 'info'
                ? <><User className="h-4 w-4" /> {t('profile.tabInfo')}</>
                : <><Lock className="h-4 w-4" /> {t('profile.tabSecurity')}</>
              }
            </button>
          ))}
        </div>

        {/* ── Info form ────────────────────────────────────────────────── */}
        {tab === 'info' && (
          <form onSubmit={handleInfoSubmit} className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
            {infoSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {t('profile.infoSuccess')}
              </div>
            )}
            {infoError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {infoError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t('profile.firstName')}
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setInfoSuccess(false); }}
                required
              />
              <Input
                label={t('profile.lastName')}
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setInfoSuccess(false); }}
                required
              />
            </div>

            <Input
              label={t('profile.email')}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* Changement d'email = changement d'identifiant de connexion :
                on exige le mot de passe actuel (le backend le vérifie aussi). */}
            {email.trim().toLowerCase() !== (user?.email ?? '').toLowerCase() && (
              <Input
                label={t('profile.currentPasswordForEmail')}
                type="password"
                autoComplete="current-password"
                value={emailPwd}
                onChange={(e) => setEmailPwd(e.target.value)}
                hint={t('profile.currentPasswordForEmailHint')}
              />
            )}

            <Input
              label={t('profile.phone')}
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setInfoSuccess(false); setInfoError(''); }}
              placeholder="+216 XX XXX XXX"
              hint={t('profile.phoneHint')}
              error={phone.trim() && !isValidTnPhone(phone) ? t('profile.invalidPhone') : undefined}
            />

            <Button
              type="submit"
              fullWidth
              loading={infoLoading}
              disabled={
                !firstName.trim() || !lastName.trim()
                || (!!phone.trim() && !isValidTnPhone(phone))
                || !email.trim()
                // Nouvel email saisi mais mot de passe actuel manquant.
                || (email.trim().toLowerCase() !== (user?.email ?? '').toLowerCase() && !emailPwd)
              }
            >
              {t('profile.saveInfo')}
            </Button>
          </form>
        )}

        {/* ── Sécurité ─────────────────────────────────────────────────── */}
        {/* Les passkeys viennent EN PREMIER : c'est le moyen de connexion que
            l'on veut voir adopter, et le mot de passe n'est plus que le repli. */}
        {tab === 'security' && <PasskeyManager />}

        {tab === 'security' && (user?.security?.passkeys_count ?? 0) > 0 && <RecoveryCodesPanel />}

        {tab === 'security' && (
          <form onSubmit={handlePasswordSubmit} className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
            {pwdSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {t('profile.pwdSuccess')}
              </div>
            )}
            {pwdError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {pwdError}
              </div>
            )}

            <Input
              label={t('profile.currentPassword')}
              type="password"
              value={currentPwd}
              onChange={(e) => { setCurrentPwd(e.target.value); setPwdSuccess(false); }}
              autoComplete="current-password"
              required
            />

            <Input
              label={t('profile.newPassword')}
              type="password"
              value={newPwd}
              onChange={(e) => { setNewPwd(e.target.value); setPwdSuccess(false); }}
              autoComplete="new-password"
              required
            />

            {/* Complexity indicators */}
            {newPwd.length > 0 && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-3">
                <PasswordRule ok={pwdChecks.length}    label={t('profile.rule12Chars')} />
                <PasswordRule ok={pwdChecks.uppercase} label={t('profile.ruleUppercase')} />
                <PasswordRule ok={pwdChecks.lowercase} label={t('profile.ruleLowercase')} />
                <PasswordRule ok={pwdChecks.number}    label={t('profile.ruleNumber')} />
                <PasswordRule ok={pwdChecks.symbol}    label={t('profile.ruleSymbol')} />
                <PasswordRule ok={pwdChecks.match}     label={t('profile.ruleMatch')} />
              </div>
            )}

            <Input
              label={t('profile.confirmNewPassword')}
              type="password"
              value={confirmPwd}
              onChange={(e) => { setConfirmPwd(e.target.value); setPwdSuccess(false); }}
              autoComplete="new-password"
              required
            />

            <Button
              type="submit"
              fullWidth
              loading={pwdLoading}
              disabled={!pwdValid || !currentPwd}
            >
              {t('profile.changePassword')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
