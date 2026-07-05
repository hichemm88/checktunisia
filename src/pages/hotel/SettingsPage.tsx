import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building, CreditCard, Users, Plus, Trash2, Save,
  Pencil, X, MapPin, Phone, Globe, Star,
  CheckCircle, AlertCircle, ExternalLink, Mail,
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
import { getPropertyTypeName } from '@/api/organization';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const Alert = ({ msg, type }: { msg: string; type: 'success' | 'error' }) => (
  <div className={`rounded-lg px-3 py-2 text-sm flex items-start gap-2 ${
    type === 'success'
      ? 'bg-green-50 text-green-700 border border-green-200'
      : 'bg-red-50 text-red-700 border border-red-200'
  }`}>
    {type === 'success'
      ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
      : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
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
  { value: 'hotel',        label: 'Hôtel' },
  { value: 'appartement',  label: 'Appartement' },
  { value: 'villa',        label: 'Villa' },
  { value: 'riad',         label: 'Riad' },
  { value: 'maison_hotes', label: "Maison d'hôtes" },
  { value: 'guesthouse',   label: 'Guesthouse' },
  { value: 'hostel',       label: 'Auberge de jeunesse' },
  { value: 'resort',       label: 'Resort' },
  { value: 'bungalow',     label: 'Bungalow' },
  { value: 'rental',       label: 'Location saisonnière' },
  { value: 'residence',    label: 'Résidence hôtelière' },
];

const ROLE_LABELS: Record<string, string> = {
  hotel_admin:  'Administrateur',
  receptionist: 'Réceptionniste',
};

// ─── Tab: Société ─────────────────────────────────────────────────────────────

const SocieteTab = () => {
  const qc = useQueryClient();
  const [editing, setEditing]   = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['hotel-profile'],
    queryFn: settingsApi.getHotelProfile,
  });

  const [form, setForm] = useState<HotelProfile | null>(null);

  const startEdit = () => { setForm(profile ?? null); setFeedback(null); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setForm(null); };

  const setAddr = (k: string, v: string | number | null) =>
    setForm(f => f ? { ...f, address: { ...f.address, [k]: v } } : f);

  const mutation = useMutation({
    mutationFn: () => settingsApi.updateHotelProfile({
      name: form?.name, type: form?.type, stars: form?.stars,
      phone: form?.phone, email: form?.email, website: form?.website,
      address: form?.address ?? undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-profile'] });
      setFeedback({ msg: 'Informations mises à jour', type: 'success' });
      setEditing(false);
    },
    onError: (err) => setFeedback({ msg: extractErrors(err), type: 'error' }),
  });

  const mapsUrl = profile?.address?.latitude && profile?.address?.longitude
    ? `https://www.openstreetmap.org/?mlat=${profile.address.latitude}&mlon=${profile.address.longitude}#map=16/${profile.address.latitude}/${profile.address.longitude}`
    : profile?.address?.city
      ? `https://www.openstreetmap.org/search?query=${encodeURIComponent([profile.address.line1, profile.address.city, 'Tunisie'].filter(Boolean).join(', '))}`
      : null;

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-gray-400" /> Informations de l'établissement
          </div>
        </CardTitle>
        {!editing
          ? <button onClick={startEdit} className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: '#1B3A5F' }}>
              <Pencil className="h-3.5 w-3.5" /> Modifier
            </button>
          : <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
        }
      </CardHeader>

      {feedback && <div className="mt-2"><Alert msg={feedback.msg} type={feedback.type} /></div>}

      {!editing ? (
        <div className="flex flex-col gap-2 mt-3">
          <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
            <span className="text-sm text-gray-500">Nom</span>
            <span className="text-sm font-semibold text-gray-900">{profile?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
            <span className="text-sm text-gray-500">Type</span>
            <span className="text-sm font-medium">
              {HOTEL_TYPES.find(t => t.value === profile?.type)?.label ?? profile?.type ?? '—'}
            </span>
          </div>
          {profile?.stars != null && (
            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-500">Classement</span>
              <div className="flex gap-0.5">
                {Array.from({ length: profile.stars }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
          )}
          {profile?.registration_number && (
            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-500">N° d'enregistrement</span>
              <span className="text-sm font-mono text-gray-700">{profile.registration_number}</span>
            </div>
          )}

          {profile?.address && (
            <div className="flex items-start gap-2 py-2 border-b border-gray-50">
              <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
              <div className="text-sm text-gray-700 flex-1">
                {profile.address.line1 && <p>{profile.address.line1}</p>}
                {profile.address.line2 && <p>{profile.address.line2}</p>}
                <p>{[profile.address.postal_code, profile.address.city, profile.address.governorate].filter(Boolean).join(', ')}</p>
              </div>
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="shrink-0" style={{ color: '#1B3A5F' }}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            {profile?.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-3.5 w-3.5 text-gray-400" /> {profile.phone}
              </div>
            )}
            {profile?.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-3.5 w-3.5 text-gray-400" /> {profile.email}
              </div>
            )}
            {profile?.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-3.5 w-3.5 text-gray-400" />
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank" rel="noopener noreferrer"
                  className="truncate" style={{ color: '#1B3A5F' }}
                >
                  {profile.website}
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mt-3">
          <Input label="Nom de l'établissement"
            value={form?.name ?? ''}
            onChange={e => setForm(f => f ? { ...f, name: e.target.value } : f)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={form?.type ?? ''}
              onChange={e => setForm(f => f ? { ...f, type: e.target.value } : f)}
              options={[{ value: '', label: '— Choisir —' }, ...HOTEL_TYPES]}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Étoiles</label>
              <div className="flex gap-1 pt-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button"
                    onClick={() => setForm(f => f ? { ...f, stars: f.stars === n ? null : n } : f)}
                  >
                    <Star className={`h-5 w-5 ${(form?.stars ?? 0) >= n ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adresse</p>
          <Input label="Ligne 1" value={form?.address?.line1 ?? ''} onChange={e => setAddr('line1', e.target.value)} placeholder="N° et nom de rue" />
          <Input label="Ligne 2" value={form?.address?.line2 ?? ''} onChange={e => setAddr('line2', e.target.value)} placeholder="Bâtiment, BP…" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ville" value={form?.address?.city ?? ''} onChange={e => setAddr('city', e.target.value)} />
            <Select label="Gouvernorat" value={form?.address?.governorate ?? ''}
              onChange={e => setAddr('governorate', e.target.value)}
              options={[{ value: '', label: '— Choisir —' }, ...GOVERNORATES.map(g => ({ value: g, label: g }))]}
            />
          </div>
          <Input label="Code postal" value={form?.address?.postal_code ?? ''} onChange={e => setAddr('postal_code', e.target.value)} placeholder="1000" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitude" type="number" step="any" value={form?.address?.latitude ?? ''}
              onChange={e => setAddr('latitude', e.target.value ? parseFloat(e.target.value) : null)} placeholder="36.8065" />
            <Input label="Longitude" type="number" step="any" value={form?.address?.longitude ?? ''}
              onChange={e => setAddr('longitude', e.target.value ? parseFloat(e.target.value) : null)} placeholder="10.1815" />
          </div>

          <hr className="border-gray-100" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacts</p>
          <Input label="Téléphone" type="tel" value={form?.phone ?? ''} onChange={e => setForm(f => f ? { ...f, phone: e.target.value } : f)} placeholder="+216 xx xxx xxx" />
          <Input label="Email" type="email" value={form?.email ?? ''} onChange={e => setForm(f => f ? { ...f, email: e.target.value } : f)} placeholder="contact@etablissement.tn" />
          <Input label="Site web" type="url" value={form?.website ?? ''} onChange={e => setForm(f => f ? { ...f, website: e.target.value } : f)} placeholder="https://monhotel.tn" />

          <div className="flex gap-2 pt-1">
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

// ─── User row ─────────────────────────────────────────────────────────────────

const UserRow = ({ u, onDeleted }: { u: HotelUser; onDeleted: () => void }) => {
  const qc = useQueryClient();
  const [mode, setMode]     = useState<'view' | 'edit' | 'confirm_delete'>('view');
  const [editForm, setEditForm] = useState({
    first_name: u.first_name,
    last_name:  u.last_name,
    role:       u.role as 'hotel_admin' | 'receptionist',
  });
  const [error, setError] = useState('');

  const editMut = useMutation({
    mutationFn: () => settingsApi.updateUser(u.id, {
      first_name: editForm.first_name,
      last_name:  editForm.last_name,
      role:       editForm.role,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-users'] }); setMode('view'); setError(''); },
    onError: (err) => setError(extractErrors(err)),
  });

  const deleteMut = useMutation({
    mutationFn: () => settingsApi.deleteUser(u.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-users'] }); onDeleted(); },
    onError: (err) => setError(extractErrors(err)),
  });

  if (mode === 'edit') {
    return (
      <div className="py-3 border-b border-gray-50 last:border-0">
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Input label="Prénom" value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
            <Input label="Nom"    value={editForm.last_name}  onChange={e => setEditForm(f => ({ ...f, last_name:  e.target.value }))} />
          </div>
          <Select
            label="Rôle"
            value={editForm.role}
            onChange={e => setEditForm(f => ({ ...f, role: e.target.value as any }))}
            options={[
              { value: 'receptionist', label: 'Réceptionniste' },
              { value: 'hotel_admin',  label: 'Administrateur' },
            ]}
          />
          {error && <Alert msg={error} type="error" />}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => editMut.mutate()} loading={editMut.isPending} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> Enregistrer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setMode('view'); setError(''); }}>Annuler</Button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'confirm_delete') {
    return (
      <div className="py-3 border-b border-gray-50 last:border-0">
        <p className="text-sm text-gray-700 mb-2">
          Supprimer <span className="font-semibold">{u.first_name} {u.last_name}</span> ?
        </p>
        {error && <Alert msg={error} type="error" />}
        <div className="flex gap-2">
          <Button size="sm" loading={deleteMut.isPending} onClick={() => deleteMut.mutate()}
            className="!bg-red-600 hover:!bg-red-700 gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Supprimer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setMode('view'); setError(''); }}>Annuler</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
          style={{ background: '#E8EEFB', color: '#1B3A5F' }}
        >
          {u.first_name?.[0]}{u.last_name?.[0]}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{u.first_name} {u.last_name}</p>
          <p className="text-xs text-gray-500 truncate">{u.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <Badge variant={u.is_active ? 'active' : 'suspended'}>
          {ROLE_LABELS[u.role] ?? u.role}
        </Badge>
        <button
          onClick={() => setMode('edit')}
          className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-colors"
          title="Modifier"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setMode('confirm_delete')}
          className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
          title="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

// ─── Add user form ────────────────────────────────────────────────────────────

const AddUserForm = ({ onDone }: { onDone: () => void }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateUserPayload>({
    first_name: '', last_name: '', email: '', password: '', role: 'receptionist',
  });
  const [error, setError] = useState('');
  const set = (k: keyof CreateUserPayload, v: string) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => settingsApi.createUser(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-users'] }); onDone(); },
    onError: (err) => setError(extractErrors(err)),
  });

  return (
    <div className="flex flex-col gap-3 border border-gray-100 rounded-xl p-4 mt-2">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Nouveau membre</p>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Prénom" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
        <Input label="Nom"    value={form.last_name}  onChange={e => set('last_name',  e.target.value)} />
      </div>
      <Input label="Email"        type="email"    value={form.email}    onChange={e => set('email',    e.target.value)} />
      <Input label="Mot de passe" type="password" value={form.password} onChange={e => set('password', e.target.value)} />
      <Select label="Rôle" value={form.role} onChange={e => set('role', e.target.value)}
        options={[
          { value: 'receptionist', label: 'Réceptionniste' },
          { value: 'hotel_admin',  label: 'Administrateur' },
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

// ─── Tab: Équipe ──────────────────────────────────────────────────────────────

const EquipeTab = () => {
  const [showAdd, setShowAdd] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['hotel-users'],
    queryFn: settingsApi.getUsers,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" /> Équipe
          </div>
        </CardTitle>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity"
          style={{ color: '#1B3A5F' }}
        >
          {showAdd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showAdd ? 'Annuler' : 'Ajouter'}
        </button>
      </CardHeader>

      {showAdd && <AddUserForm onDone={() => setShowAdd(false)} />}

      <div className="mt-2">
        {isLoading && [1, 2].map(i => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-50 my-1" />
        ))}

        {users?.map((u: HotelUser) => (
          <UserRow key={u.id} u={u} onDeleted={() => {}} />
        ))}

        {!isLoading && !users?.length && (
          <p className="py-6 text-center text-sm text-gray-400">Aucun utilisateur</p>
        )}
      </div>
    </Card>
  );
};

// ─── Tab: Abonnement ──────────────────────────────────────────────────────────

const AbonnementTab = () => {
  const { user } = useAuthStore();
  const propertyLabel = getPropertyTypeName(user?.hotel?.type ?? undefined);

  const { data: sub } = useQuery({
    queryKey: ['subscription'],
    queryFn: settingsApi.getSubscription,
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Établissement summary */}
      {user?.hotel && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-gray-400" /> {propertyLabel}
              </div>
            </CardTitle>
          </CardHeader>
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-500">Nom</span>
              <span className="text-sm font-semibold text-gray-900">{user.hotel.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-500">Statut</span>
              <Badge variant={user.hotel.status === 'active' ? 'active' : 'suspended'}>
                {user.hotel.status === 'active' ? 'Actif' : user.hotel.status}
              </Badge>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-sm text-gray-500">Chambres</span>
              <span className="text-sm font-medium text-gray-900">{user.hotel.room_count} unités</span>
            </div>
          </div>
        </Card>
      )}

      {/* Subscription details */}
      {sub ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-400" /> Abonnement
              </div>
            </CardTitle>
          </CardHeader>
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-500">Plan</span>
              <span className="text-sm font-bold" style={{ color: '#1B3A5F' }}>
                {typeof sub.plan === 'object' && sub.plan !== null ? sub.plan.name : (sub.plan ?? '—')}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-500">Statut</span>
              <Badge variant={sub.status === 'active' ? 'active' : 'suspended'}>{sub.status}</Badge>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-500">Expire le</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(sub.expires_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-sm text-gray-500">Jours restants</span>
              <span className={`text-sm font-bold ${sub.days_remaining <= 7 ? 'text-red-600' : sub.days_remaining <= 30 ? 'text-amber-600' : 'text-green-600'}`}>
                {sub.days_remaining} jour{sub.days_remaining !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {sub.days_remaining <= 30 && (
            <div className="mt-3 rounded-xl p-3 flex items-start gap-2" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Renouvellement à prévoir</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Contactez <a href="mailto:support@qayed.tn" className="underline font-medium">support@qayed.tn</a> pour renouveler votre abonnement.
                </p>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'societe' | 'equipe' | 'abonnement';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'societe',     label: 'Société',      icon: Building   },
  { id: 'equipe',      label: 'Équipe',        icon: Users      },
  { id: 'abonnement',  label: 'Abonnement',    icon: CreditCard },
];

export const SettingsPage = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'hotel_admin';
  const [tab, setTab] = useState<Tab>(isAdmin ? 'societe' : 'abonnement');

  return (
    <HotelLayout title="Paramètres">
      <div className="flex flex-col">

        {/* ── Tab bar ── */}
        <div
          className="sticky top-0 z-10 flex border-b px-4"
          style={{ background: '#fff', borderColor: '#E5E7EB' }}
        >
          {(isAdmin ? TABS : TABS.filter(t => t.id !== 'societe' && t.id !== 'equipe')).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap"
              style={tab === t.id
                ? { borderColor: '#1B3A5F', color: '#1B3A5F' }
                : { borderColor: 'transparent', color: '#9CA3AF' }
              }
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="p-4 flex flex-col gap-4">
          {tab === 'societe'    && isAdmin && <SocieteTab />}
          {tab === 'equipe'     && isAdmin && <EquipeTab />}
          {tab === 'abonnement' && <AbonnementTab />}
        </div>

      </div>
    </HotelLayout>
  );
};
