import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building, CreditCard, User, Lock, Users, Plus, Trash2, Save, Eye, EyeOff } from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { settingsApi } from '@/api/settings';
import { extractErrors } from '@/lib/api';
import { HotelUser, CreateUserPayload } from '@/types';

// ── Inline toast ─────────────────────────────────────────────────────────────
const Alert = ({ msg, type }: { msg: string; type: 'success' | 'error' }) => (
  <div className={`rounded-lg px-3 py-2 text-sm ${type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
    {msg}
  </div>
);

// ── Profile section ───────────────────────────────────────────────────────────
const ProfileSection = () => {
  const { user, setUser } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName]   = useState(user?.last_name ?? '');
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const mutation = useMutation({
    mutationFn: () => settingsApi.updateProfile({ first_name: firstName, last_name: lastName }),
    onSuccess: (data) => {
      if (user) setUser({ ...user, first_name: data.first_name, last_name: data.last_name });
      setFeedback({ msg: 'Profil mis à jour', type: 'success' });
    },
    onError: (err) => setFeedback({ msg: extractErrors(err), type: 'error' }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle><div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /> Mon profil</div></CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-3 mt-2">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" value={firstName} onChange={e => setFirstName(e.target.value)} />
          <Input label="Nom"    value={lastName}  onChange={e => setLastName(e.target.value)} />
        </div>
        <Input label="Email" value={user?.email ?? ''} disabled />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 capitalize">{user?.role?.replace(/_/g, ' ')}</span>
        </div>
        {feedback && <Alert msg={feedback.msg} type={feedback.type} />}
        <Button
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
          className="gap-2 self-start"
          size="sm"
        >
          <Save className="h-4 w-4" /> Enregistrer
        </Button>
      </div>
    </Card>
  );
};

// ── Password section ──────────────────────────────────────────────────────────
const PasswordSection = () => {
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow]       = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const mutation = useMutation({
    mutationFn: () => settingsApi.changePassword({
      current_password: current,
      new_password: next,
      new_password_confirmation: confirm,
    }),
    onSuccess: () => {
      setCurrent(''); setNext(''); setConfirm('');
      setFeedback({ msg: 'Mot de passe modifié avec succès', type: 'success' });
    },
    onError: (err) => setFeedback({ msg: extractErrors(err), type: 'error' }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle><div className="flex items-center gap-2"><Lock className="h-4 w-4 text-gray-400" /> Mot de passe</div></CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-3 mt-2">
        <Input
          label="Mot de passe actuel"
          type={show ? 'text' : 'password'}
          value={current}
          onChange={e => setCurrent(e.target.value)}
          rightElement={
            <button type="button" onClick={() => setShow(s => !s)}>
              {show ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
            </button>
          }
        />
        <Input label="Nouveau mot de passe"          type="password" value={next}    onChange={e => setNext(e.target.value)} />
        <Input label="Confirmer le nouveau mot de passe" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        {feedback && <Alert msg={feedback.msg} type={feedback.type} />}
        <Button
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!current || !next || !confirm}
          className="gap-2 self-start"
          size="sm"
        >
          <Save className="h-4 w-4" /> Modifier
        </Button>
      </div>
    </Card>
  );
};

// ── Hotel info section ────────────────────────────────────────────────────────
const HotelSection = () => {
  const { user } = useAuthStore();
  const { data: sub } = useQuery({
    queryKey: ['subscription'],
    queryFn: settingsApi.getSubscription,
  });

  return (
    <div className="flex flex-col gap-3">
      {user?.hotel && (
        <Card>
          <CardHeader>
            <CardTitle><div className="flex items-center gap-2"><Building className="h-4 w-4 text-gray-400" /> Hôtel</div></CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Nom</span>
              <span className="text-sm font-medium">{user.hotel.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Statut</span>
              <Badge variant={user.hotel.subscription_status === 'active' ? 'active' : 'suspended'}>
                {user.hotel.subscription_status ?? '—'}
              </Badge>
            </div>
            {user.hotel.subscription_expires_at && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Expire le</span>
                <span className="text-sm font-medium">
                  {new Date(user.hotel.subscription_expires_at).toLocaleDateString('fr-TN')}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {sub && (
        <Card>
          <CardHeader>
            <CardTitle><div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-gray-400" /> Abonnement</div></CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Plan</span>
              <span className="text-sm font-semibold text-primary-700">
                {typeof sub.plan === 'object' && sub.plan !== null ? sub.plan.name : (sub.plan ?? '—')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Statut</span>
              <Badge variant={sub.status === 'active' ? 'active' : 'suspended'}>{sub.status}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Jours restants</span>
              <span className={`text-sm font-medium ${sub.days_remaining <= 7 ? 'text-red-600' : 'text-gray-900'}`}>
                {sub.days_remaining}j
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Expire le</span>
              <span className="text-sm font-medium">
                {new Date(sub.expires_at).toLocaleDateString('fr-TN')}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Pour renouveler: <a href="mailto:support@checktunisia.tn" className="text-primary-600 underline">support@checktunisia.tn</a>
          </p>
        </Card>
      )}
    </div>
  );
};

// ── Add user modal (inline) ───────────────────────────────────────────────────
const AddUserForm = ({ onDone }: { onDone: () => void }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateUserPayload>({
    first_name: '', last_name: '', email: '', password: '', role: 'receptionist',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => settingsApi.createUser(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-users'] }); onDone(); },
    onError: (err) => setError(extractErrors(err)),
  });

  const set = (k: keyof CreateUserPayload, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="flex flex-col gap-3 mt-3 border-t border-gray-100 pt-3">
      <div className="grid grid-cols-2 gap-2">
        <Input label="Prénom" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
        <Input label="Nom"    value={form.last_name}  onChange={e => set('last_name',  e.target.value)} />
      </div>
      <Input label="Email"           type="email"    value={form.email}    onChange={e => set('email', e.target.value)} />
      <Input label="Mot de passe"    type="password" value={form.password} onChange={e => set('password', e.target.value)} />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Rôle</label>
        <select
          value={form.role}
          onChange={e => set('role', e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="receptionist">Réceptionniste</option>
          <option value="hotel_admin">Administrateur hôtel</option>
        </select>
      </div>
      {error && <Alert msg={error} type="error" />}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => mutation.mutate()} loading={mutation.isPending}
          disabled={!form.first_name || !form.email || !form.password}>
          Créer
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Annuler</Button>
      </div>
    </div>
  );
};

// ── Users section (hotel_admin only) ─────────────────────────────────────────
const UsersSection = () => {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['hotel-users'],
    queryFn: settingsApi.getUsers,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-users'] }); setDeletingId(null); },
  });

  const roleLabel = (role: string) =>
    role === 'hotel_admin' ? 'Admin' : role === 'receptionist' ? 'Réceptionniste' : role;

  return (
    <Card>
      <CardHeader>
        <CardTitle><div className="flex items-center gap-2"><Users className="h-4 w-4 text-gray-400" /> Équipe</div></CardTitle>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-1 text-xs text-primary-600 font-medium hover:text-primary-700"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </button>
      </CardHeader>

      {showAdd && <AddUserForm onDone={() => setShowAdd(false)} />}

      <div className="flex flex-col divide-y divide-gray-50 mt-2">
        {isLoading && [1,2].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-50 my-1" />)}

        {users?.map((u: HotelUser) => (
          <div key={u.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{u.first_name} {u.last_name}</p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={u.is_active ? 'active' : 'suspended'}>
                {roleLabel(u.role)}
              </Badge>
              {deletingId === u.id ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => deleteMutation.mutate(u.id)}
                    className="text-xs text-red-600 font-medium hover:text-red-700"
                  >
                    Confirmer
                  </button>
                  <button onClick={() => setDeletingId(null)} className="text-xs text-gray-400">
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeletingId(u.id)}
                  className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {!isLoading && !users?.length && (
          <p className="py-4 text-center text-sm text-gray-400">Aucun utilisateur</p>
        )}
      </div>
    </Card>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export const SettingsPage = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'hotel_admin';

  return (
    <HotelLayout title="Paramètres">
      <div className="p-4 flex flex-col gap-4">
        <ProfileSection />
        <PasswordSection />
        <HotelSection />
        {isAdmin && <UsersSection />}
        <p className="text-center text-xs text-gray-400 mt-2">
          CheckTunisia v1.0 · Conforme à la réglementation tunisienne
        </p>
      </div>
    </HotelLayout>
  );
};
