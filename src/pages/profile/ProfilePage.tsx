import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Shield, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { extractErrors } from '@/lib/api';

type Tab = 'info' | 'security';

const PasswordRule = ({ ok, label }: { ok: boolean; label: string }) => (
  <span className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-gray-300'}`} />
    {label}
  </span>
);

export const ProfilePage = () => {
  const navigate  = useNavigate();
  const { user, setUser } = useAuthStore();
  const [tab, setTab] = useState<Tab>('info');

  // ── Info tab state ───────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName,  setLastName]  = useState(user?.last_name  ?? '');
  const [phone,     setPhone]     = useState((user as any)?.phone ?? '');
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
    setInfoLoading(true);
    try {
      const updated = await authApi.updateProfile({
        first_name: firstName,
        last_name:  lastName,
        phone:      phone || undefined,
      });
      // Sync store with updated name
      if (user) setUser({ ...user, first_name: updated.first_name, last_name: updated.last_name });
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
    ? '/authority/search'
    : user?.role === 'platform_admin'
      ? '/admin/hotels'
      : '/hotel/dashboard';

  return (
    <div className="min-h-screen" style={{ background: '#F6F5F1' }}>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <button
            onClick={() => navigate(backHref)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-bold text-gray-900">Mon profil</h1>
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
                  style={{ background: '#5346A8' }}
                >
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{profile.org_name}</p>
                  <p className="text-xs text-white/50 capitalize">{profile.org_type}</p>
                </div>
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: '#5346A833', color: '#5346A8', border: '1px solid #5346A866' }}
              >
                Autorité
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {profile.badge_number && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">Badge</p>
                  <p className="text-sm font-mono font-semibold text-white">{profile.badge_number}</p>
                </div>
              )}
              {profile.rank && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">Grade</p>
                  <p className="text-sm font-semibold text-white">{profile.rank}</p>
                </div>
              )}
              {profile.governorate && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">Gouvernorat</p>
                  <p className="text-sm text-white">{profile.governorate}</p>
                </div>
              )}
              {profile.expires_at && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">Expiration</p>
                  <p className="text-sm text-white">
                    {new Date(profile.expires_at).toLocaleDateString('fr-TN', {
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
            style={{ background: '#5346A8' }}
          >
            {[user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user?.first_name} {user?.last_name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex rounded-2xl bg-white shadow-sm overflow-hidden">
          {(['info', 'security'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                tab === t
                  ? 'border-b-2 text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              style={tab === t ? { borderColor: '#5346A8', color: '#5346A8' } : undefined}
            >
              {t === 'info'
                ? <><User className="h-4 w-4" /> Informations</>
                : <><Lock className="h-4 w-4" /> Sécurité</>
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
                Profil mis à jour avec succès.
              </div>
            )}
            {infoError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {infoError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prénom"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setInfoSuccess(false); }}
                required
              />
              <Input
                label="Nom"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setInfoSuccess(false); }}
                required
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={user?.email ?? ''}
              disabled
              className="opacity-60 cursor-not-allowed"
            />

            <Input
              label="Téléphone"
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setInfoSuccess(false); }}
              placeholder="+216 XX XXX XXX"
            />

            <Button
              type="submit"
              fullWidth
              loading={infoLoading}
              disabled={!firstName.trim() || !lastName.trim()}
            >
              Enregistrer les modifications
            </Button>
          </form>
        )}

        {/* ── Security form ─────────────────────────────────────────────── */}
        {tab === 'security' && (
          <form onSubmit={handlePasswordSubmit} className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
            {pwdSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Mot de passe modifié. Les autres sessions ont été révoquées.
              </div>
            )}
            {pwdError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {pwdError}
              </div>
            )}

            <Input
              label="Mot de passe actuel"
              type="password"
              value={currentPwd}
              onChange={(e) => { setCurrentPwd(e.target.value); setPwdSuccess(false); }}
              autoComplete="current-password"
              required
            />

            <Input
              label="Nouveau mot de passe"
              type="password"
              value={newPwd}
              onChange={(e) => { setNewPwd(e.target.value); setPwdSuccess(false); }}
              autoComplete="new-password"
              required
            />

            {/* Complexity indicators */}
            {newPwd.length > 0 && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 grid grid-cols-2 gap-y-1.5 gap-x-3">
                <PasswordRule ok={pwdChecks.length}    label="12 caractères min." />
                <PasswordRule ok={pwdChecks.uppercase} label="Majuscule" />
                <PasswordRule ok={pwdChecks.lowercase} label="Minuscule" />
                <PasswordRule ok={pwdChecks.number}    label="Chiffre" />
                <PasswordRule ok={pwdChecks.symbol}    label="Caractère spécial" />
                <PasswordRule ok={pwdChecks.match}     label="Confirmation identique" />
              </div>
            )}

            <Input
              label="Confirmer le nouveau mot de passe"
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
              Changer le mot de passe
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
