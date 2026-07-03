import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building, CreditCard, User, Lock, Users, Plus, Trash2, Save,
  Eye, EyeOff, Pencil, X, MapPin, Phone, Globe, Star,
  CheckCircle, AlertCircle, ExternalLink,
} from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { settingsApi } from '@/api/settings';
import { extractErrors } from '@/lib/api';
import { HotelUser, CreateUserPayload, HotelProfile } from '@/types';

// ── Inline alert ─────────────────────────────────────────────────────────────
const Alert = ({ msg, type }: { msg: string; type: 'success' | 'error' }) => (
  <div className={`rounded-lg px-3 py-2 text-sm flex items-start gap-2 ${
    type === 'success'
      ? 'bg-green-50 text-green-700 border border-green-200'
      : 'bg-red-50 text-red-700 border border-red-200'
  }`}>
    {type === 'success' ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
    {msg}
  </div>
);

const GOVERNORATES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba',
  'Kairouan', 'Kasserine', 'Kébili', 'Le Kef', 'Mahdia', 'La Manouba',
  'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid', 'Siliana',
  'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
];

const HOTEL_TYPES = [
  { value: 'hotel',      label: 'Hôtel' },
  { value: 'residence',  label: 'Résidence hôtelière' },
  { value: 'hostel',     label: 'Auberge de jeunesse' },
  { value: 'guesthouse', label: 'Maison d\'hôtes' },
  { value: 'villa',      label: 'Villa' },
  { value: 'riad',       label: 'Riad' },
];

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
        <Button onClick={() => mutation.mutate()} loading={mutation.isPending} className="gap-2 self-start" size="sm">
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
        <Input label="Nouveau mot de passe"               type="password" value={next}    onChange={e => setNext(e.target.value)} />
        <Input label="Confirmer le nouveau mot de passe"  type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
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

// ── Hotel info section (hotel_admin: editable, others: read-only via sub card) ──
const HotelInfoSection = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['hotel-profile'],
    queryFn: settingsApi.getHotelProfile,
  });

  const [form, setForm] = useState<HotelProfile | null>(null);

  const startEdit = () => {
    setForm(profile ?? null);
    setFeedback(null);
    setEditing(true);
  };
  const cancelEdit = () => { setEditing(false); setForm(null); };

  const mutation = useMutation({
    mutationFn: () => settingsApi.updateHotelProfile({
      name:    form?.name,
      type:    form?.type,
      stars:   form?.stars,
      phone:   form?.phone,
      email:   form?.email,
      website: form?.website,
      address: form?.address ?? undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-profile'] });
      setFeedback({ msg: 'Informations mises à jour', type: 'success' });
      setEditing(false);
    },
    onError: (err) => setFeedback({ msg: extractErrors(err), type: 'error' }),
  });

  const setAddr = (k: string, v: string | number | null) =>
    setForm(f => f ? { ...f, address: { ...f.address, [k]: v } } : f);

  const mapsUrl = profile?.address?.latitude && profile?.address?.longitude
    ? `https://www.openstreetmap.org/?mlat=${profile.address.latitude}&mlon=${profile.address.longitude}#map=16/${profile.address.latitude}/${profile.address.longitude}`
    : profile?.address?.city
      ? `https://www.openstreetmap.org/search?query=${encodeURIComponent([profile.address.line1, profile.address.city, 'Tunisie'].filter(Boolean).join(', '))}`
      : null;

  if (isLoading) return (
    <Card>
      <div className="h-32 animate-pulse rounded-lg bg-gray-50" />
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-gray-400" /> Informations de l'hôtel
          </div>
        </CardTitle>
        {!editing && (
          <button onClick={startEdit} className="flex items-center gap-1 text-xs text-primary-600 font-medium hover:text-primary-700">
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </button>
        )}
        {editing && (
          <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </CardHeader>

      {!editing ? (
        <div className="flex flex-col gap-2 mt-2">
          {/* Basic info */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Nom</span>
            <span className="text-sm font-medium">{profile?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Type</span>
            <span className="text-sm font-medium">
              {HOTEL_TYPES.find(t => t.value === profile?.type)?.label ?? profile?.type ?? '—'}
            </span>
          </div>
          {profile?.stars && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Classement</span>
              <div className="flex gap-0.5">
                {Array.from({ length: profile.stars }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
          )}
          {profile?.registration_number && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">N° d'enregistrement</span>
              <span className="text-sm font-mono text-gray-700">{profile.registration_number}</span>
            </div>
          )}

          {/* Address */}
          {profile?.address && (
            <div className="mt-1 pt-2 border-t border-gray-50">
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div className="text-sm text-gray-700">
                  {profile.address.line1 && <p>{profile.address.line1}</p>}
                  {profile.address.line2 && <p>{profile.address.line2}</p>}
                  <p>
                    {[profile.address.postal_code, profile.address.city, profile.address.governorate]
                      .filter(Boolean).join(', ')}
                  </p>
                </div>
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="ml-auto text-primary-600 hover:text-primary-700 shrink-0">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Contacts */}
          <div className="mt-1 pt-2 border-t border-gray-50 flex flex-col gap-1.5">
            {profile?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700">{profile.phone}</span>
              </div>
            )}
            {profile?.email && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono w-3.5 text-center">@</span>
                <span className="text-sm text-gray-700">{profile.email}</span>
              </div>
            )}
            {profile?.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 truncate"
                >
                  {profile.website}
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Edit form ── */
        <div className="flex flex-col gap-3 mt-3">
          <Input label="Nom de l'hôtel" value={form?.name ?? ''} onChange={e => setForm(f => f ? { ...f, name: e.target.value } : f)} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Select
                label="Type d'établissement"
                value={form?.type ?? ''}
                onChange={e => setForm(f => f ? { ...f, type: e.target.value } : f)}
                options={[{ value: '', label: '— Choisir —' }, ...HOTEL_TYPES]}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Étoiles</label>
              <div className="flex gap-1 pt-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm(f => f ? { ...f, stars: f.stars === n ? null : n } : f)}
                    className="p-0.5"
                  >
                    <Star className={`h-5 w-5 ${(form?.stars ?? 0) >= n ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adresse</p>

          <Input label="Adresse (ligne 1)" value={form?.address?.line1 ?? ''} onChange={e => setAddr('line1', e.target.value)} placeholder="N° et nom de rue" />
          <Input label="Adresse (ligne 2)" value={form?.address?.line2 ?? ''} onChange={e => setAddr('line2', e.target.value)} placeholder="Bâtiment, BP, complément…" />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Ville" value={form?.address?.city ?? ''} onChange={e => setAddr('city', e.target.value)} />
            <Select
              label="Gouvernorat"
              value={form?.address?.governorate ?? ''}
              onChange={e => setAddr('governorate', e.target.value)}
              options={[{ value: '', label: '— Choisir —' }, ...GOVERNORATES.map(g => ({ value: g, label: g }))]}
            />
          </div>

          <Input label="Code postal" value={form?.address?.postal_code ?? ''} onChange={e => setAddr('postal_code', e.target.value)} placeholder="ex. 1000" />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitude GPS" type="number" step="any" value={form?.address?.latitude ?? ''} onChange={e => setAddr('latitude', e.target.value ? parseFloat(e.target.value) : null)} placeholder="36.8065" />
            <Input label="Longitude GPS" type="number" step="any" value={form?.address?.longitude ?? ''} onChange={e => setAddr('longitude', e.target.value ? parseFloat(e.target.value) : null)} placeholder="10.1815" />
          </div>
          <p className="text-xs text-gray-400">Les coordonnées GPS permettent d'afficher l'emplacement sur OpenStreetMap.</p>

          <hr className="border-gray-100" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacts</p>

          <Input label="Téléphone" type="tel" value={form?.phone ?? ''} onChange={e => setForm(f => f ? { ...f, phone: e.target.value } : f)} placeholder="+216 xx xxx xxx" />
          <Input label="Email de l'hôtel" type="email" value={form?.email ?? ''} onChange={e => setForm(f => f ? { ...f, email: e.target.value } : f)} placeholder="contact@hotel.tn" />
          <Input label="Site web" type="url" value={form?.website ?? ''} onChange={e => setForm(f => f ? { ...f, website: e.target.value } : f)} placeholder="https://www.monhotel.tn" />

          {feedback && <Alert msg={feedback.msg} type={feedback.type} />}

          <div className="flex gap-2">
            <Button size="sm" onClick={() => mutation.mutate()} loading={mutation.isPending} className="gap-2">
              <Save className="h-4 w-4" /> Enregistrer
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEdit}>Annuler</Button>
          </div>
        </div>
      )}
    </Card>
  );
};

// ── Subscription card ─────────────────────────────────────────────────────────
const SubscriptionCard = () => {
  const { data: sub } = useQuery({
    queryKey: ['subscription'],
    queryFn: settingsApi.getSubscription,
  });
  const { user } = useAuthStore();

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

// ── Add user form ─────────────────────────────────────────────────────────────
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
      <Select
        label="Rôle"
        value={form.role}
        onChange={e => set('role', e.target.value)}
        options={[
          { value: 'receptionist', label: 'Réceptionniste' },
          { value: 'hotel_admin',  label: 'Administrateur hôtel' },
        ]}
      />
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

// ── Users section ─────────────────────────────────────────────────────────────
const UsersSection = () => {
  const qc = useQueryClient();
  const [showAdd, setShowAdd]     = useState(false);
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
        {isLoading && [1, 2].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-50 my-1" />)}

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
                  <button onClick={() => setDeletingId(null)} className="text-xs text-gray-400">Annuler</button>
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

        {isAdmin ? (
          <>
            <HotelInfoSection />
            <UsersSection />
          </>
        ) : (
          <SubscriptionCard />
        )}

        <div className="flex flex-col items-center gap-1 mt-2 mb-2">
          <div
            className="h-1 w-12 rounded-full mb-1"
            style={{ background: 'linear-gradient(90deg, #1B3A5F, #C8943A)' }}
          />
          <p className="text-xs text-gray-400">CheckTunisia v1.0</p>
          <p className="text-xs text-gray-300">Conforme à la réglementation tunisienne</p>
        </div>
      </div>
    </HotelLayout>
  );
};
