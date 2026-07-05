import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building, CreditCard, Users, Plus, Trash2, Save,
  Pencil, X, MapPin, Send, Activity,
  CheckCircle, AlertCircle,
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
import { HotelUser, CreateUserPayload } from '@/types';
import { organizationApi, OrgInfo } from '@/api/organization';

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


const ROLE_LABELS: Record<string, string> = {
  hotel_admin:  'Administrateur',
  receptionist: 'Réceptionniste',
};

// ─── Tab: Société ─────────────────────────────────────────────────────────────

const ENTITY_TYPE_LABELS: Record<string, string> = {
  company:    'Société',
  individual: 'Particulier',
};

const SocieteTab = () => {
  const qc = useQueryClient();
  const [editing, setEditing]   = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const { data: org, isLoading } = useQuery({
    queryKey: ['org-info'],
    queryFn: organizationApi.get,
  });

  const [form, setForm] = useState<Partial<OrgInfo> | null>(null);

  const startEdit = () => { setForm(org ?? null); setFeedback(null); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setForm(null); };
  const setAddr = (k: string, v: string) =>
    setForm(f => f ? { ...f, address: { ...f.address, [k]: v } } : f);

  const mutation = useMutation({
    mutationFn: () => organizationApi.update({
      name:                form?.name,
      registration_number: form?.registration_number ?? null,
      contact_email:       form?.contact_email,
      contact_phone:       form?.contact_phone ?? null,
      address:             form?.address ?? null,
    } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-info'] });
      setFeedback({ msg: 'Informations mises à jour', type: 'success' });
      setEditing(false);
    },
    onError: (err) => setFeedback({ msg: extractErrors(err), type: 'error' }),
  });

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-gray-400" /> Informations de la société
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
        <div className="flex flex-col gap-0 mt-3">
          {[
            { label: 'Type',               value: ENTITY_TYPE_LABELS[org?.entity_type ?? ''] ?? org?.entity_type },
            { label: 'Raison sociale',     value: org?.name },
            { label: 'N° registre (RC)',   value: org?.registration_number },
            { label: 'Email contact',      value: org?.contact_email },
            { label: 'Téléphone',          value: org?.contact_phone },
          ].map(({ label, value }) => value ? (
            <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
            </div>
          ) : null)}

          {org?.address && (
            <div className="flex items-start gap-2 py-2">
              <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
              <span className="text-sm text-gray-700">
                {[org.address.line1, org.address.city, org.address.governorate].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 mt-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Type d'entité</label>
            <Select
              value={form?.entity_type ?? 'company'}
              onChange={e => setForm(f => f ? { ...f, entity_type: e.target.value as any } : f)}
              options={[
                { value: 'company',    label: 'Société' },
                { value: 'individual', label: 'Particulier' },
              ]}
            />
          </div>
          <Input label="Raison sociale / Nom"
            value={form?.name ?? ''}
            onChange={e => setForm(f => f ? { ...f, name: e.target.value } : f)}
          />
          <Input label="N° Registre du commerce"
            value={form?.registration_number ?? ''}
            onChange={e => setForm(f => f ? { ...f, registration_number: e.target.value } : f)}
            placeholder="B123456789"
          />
          <hr className="border-gray-100" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacts</p>
          <Input label="Email" type="email"
            value={form?.contact_email ?? ''}
            onChange={e => setForm(f => f ? { ...f, contact_email: e.target.value } : f)}
            placeholder="contact@societe.tn"
          />
          <Input label="Téléphone" type="tel"
            value={form?.contact_phone ?? ''}
            onChange={e => setForm(f => f ? { ...f, contact_phone: e.target.value } : f)}
            placeholder="+216 xx xxx xxx"
          />
          <hr className="border-gray-100" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adresse</p>
          <Input label="Adresse" value={form?.address?.line1 ?? ''} onChange={e => setAddr('line1', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ville" value={form?.address?.city ?? ''} onChange={e => setAddr('city', e.target.value)} />
            <Select label="Gouvernorat" value={form?.address?.governorate ?? ''}
              onChange={e => setAddr('governorate', e.target.value)}
              options={[{ value: '', label: '— Choisir —' }, ...GOVERNORATES.map(g => ({ value: g, label: g }))]}
            />
          </div>
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
    hotel_ids:  (u.properties ?? []).map(p => p.id),
  });
  const [error, setError] = useState('');

  const { data: allProperties } = useQuery({
    queryKey: ['my-properties'],
    queryFn: organizationApi.myProperties,
    enabled: mode === 'edit',
  });

  const toggleEditPropertyId = (id: string) => setEditForm(f => ({
    ...f,
    hotel_ids: f.hotel_ids.includes(id) ? f.hotel_ids.filter(x => x !== id) : [...f.hotel_ids, id],
  }));

  const editMut = useMutation({
    mutationFn: () => settingsApi.updateUser(u.id, {
      first_name: editForm.first_name,
      last_name:  editForm.last_name,
      role:       editForm.role,
      hotel_ids:  editForm.hotel_ids,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-users'] }); setMode('view'); setError(''); },
    onError: (err) => setError(extractErrors(err)),
  });

  const deleteMut = useMutation({
    mutationFn: () => settingsApi.deleteUser(u.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-users'] }); onDeleted(); },
    onError: (err) => setError(extractErrors(err)),
  });

  const resendMut = useMutation({
    mutationFn: () => settingsApi.resendInvite(u.id),
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
          {allProperties && allProperties.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label className="label">Biens accessibles</label>
              <div className="flex flex-col gap-1.5 rounded-lg border border-gray-100 p-2.5 max-h-36 overflow-y-auto">
                {allProperties.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={editForm.hotel_ids.includes(p.id)} onChange={() => toggleEditPropertyId(p.id)} />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && <Alert msg={error} type="error" />}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => editMut.mutate()} loading={editMut.isPending}
              disabled={editForm.hotel_ids.length === 0} className="gap-1.5">
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
    <div className="py-3 border-b border-gray-50 last:border-0">
    <div className="flex items-center justify-between">
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
          {u.properties && u.properties.length > 0 && (
            <p className="text-xs text-gray-400 truncate">{u.properties.map(p => p.name).join(', ')}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <Badge variant={u.status === 'active' ? 'active' : 'suspended'}>
          {ROLE_LABELS[u.role] ?? u.role}
        </Badge>
        {!u.last_login_at && (
          <button
            onClick={() => resendMut.mutate()}
            disabled={resendMut.isPending}
            className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-colors disabled:opacity-50"
            title={resendMut.isSuccess ? 'Invitation renvoyée' : "Renvoyer l'invitation"}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        )}
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
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {resendMut.isSuccess && !error && (
        <p className="text-xs text-green-600 mt-1">
          {resendMut.data.email_sent ? 'Invitation renvoyée.' : "Mot de passe régénéré, mais l'email n'a pas pu être envoyé (contactez le support)."}
        </p>
      )}
    </div>
  );
};

// ─── Add user form ────────────────────────────────────────────────────────────

const AddUserForm = ({ onDone }: { onDone: () => void }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateUserPayload>({
    first_name: '', last_name: '', email: '', role: 'receptionist', hotel_ids: [],
  });
  const [error, setError] = useState('');
  const set = (k: keyof CreateUserPayload, v: string) => setForm(f => ({ ...f, [k]: v }));

  const { data: properties } = useQuery({ queryKey: ['my-properties'], queryFn: organizationApi.myProperties });

  const togglePropertyId = (id: string) => setForm(f => {
    const current = f.hotel_ids ?? [];
    return { ...f, hotel_ids: current.includes(id) ? current.filter(x => x !== id) : [...current, id] };
  });

  const mutation = useMutation({
    mutationFn: () => settingsApi.createUser({ ...form, hotel_ids: form.hotel_ids?.length ? form.hotel_ids : undefined }),
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
      <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
      <Select label="Rôle" value={form.role} onChange={e => set('role', e.target.value)}
        options={[
          { value: 'receptionist', label: 'Réceptionniste' },
          { value: 'hotel_admin',  label: 'Administrateur' },
        ]}
      />
      {properties && properties.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <label className="label">Biens accessibles</label>
          <div className="flex flex-col gap-1.5 rounded-lg border border-gray-100 p-2.5 max-h-36 overflow-y-auto">
            {properties.map(p => (
              <label key={p.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={(form.hotel_ids ?? []).includes(p.id)} onChange={() => togglePropertyId(p.id)} />
                {p.name}
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400">Laisser vide pour n'assigner que le bien actif.</p>
        </div>
      )}
      <p className="text-xs text-gray-400">Un email avec un mot de passe temporaire sera envoyé automatiquement.</p>
      {error && <Alert msg={error} type="error" />}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => mutation.mutate()} loading={mutation.isPending}
          disabled={!form.first_name || !form.last_name || !form.email}>
          Créer et envoyer l'invitation
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
  const { data: sub } = useQuery({
    queryKey: ['subscription'],
    queryFn: settingsApi.getSubscription,
  });

  return (
    <div className="flex flex-col gap-4">
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

// ─── Tab: Activité ──────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  'check_in.created':          'a créé un check-in',
  'check_in.updated':          'a modifié un check-in',
  'check_in.completed':        'a finalisé un check-in',
  'check_in.checked_out':      'a enregistré un départ',
  'check_in.cancelled':        'a annulé un check-in',
  'guest.added':                'a ajouté un voyageur',
  'guest.updated':              'a modifié un voyageur',
  'guest.removed':              'a supprimé un voyageur',
  'scan.uploaded':               'a scanné un document',
  'room.created':               'a créé une unité',
  'room.updated':               'a modifié une unité',
  'room.deleted':               'a supprimé une unité',
  'watchlist.hits_viewed':      'a consulté les alertes de surveillance',
  'watchlist.hit_acknowledged': 'a traité une alerte de surveillance',
  'user.login':                 's\'est connecté(e)',
  'user.logout':                's\'est déconnecté(e)',
  'user.created':                'a créé un compte membre',
  'user.updated':                'a modifié un compte membre',
  'user.deleted':                'a supprimé un compte membre',
  'user.invite_resent':          'a renvoyé une invitation',
  'profile.updated':             'a modifié son profil',
  'profile.password_changed':    'a changé son mot de passe',
};

const actionLabel = (action: string): string => ACTION_LABELS[action] ?? action.replace(/[._]/g, ' ');

const ActiviteTab = () => {
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['hotel-activity', page, role],
    queryFn: () => settingsApi.getActivity({ page, role: role || undefined }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-400" /> Activité
          </div>
        </CardTitle>
      </CardHeader>

      <div className="flex gap-1.5 mb-3">
        {[
          { value: '',             label: 'Tous' },
          { value: 'receptionist', label: 'Réceptionnistes' },
          { value: 'hotel_admin',  label: 'Administrateurs' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => { setRole(f.value); setPage(1); }}
            className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
            style={role === f.value
              ? { background: '#1B3A5F', color: '#fff' }
              : { background: '#F5F4EF', color: '#6B7280' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        {isLoading && [1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-50 my-1" />
        ))}

        {data?.data.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold mt-0.5"
              style={{ background: '#E8EEFB', color: '#1B3A5F' }}
            >
              {entry.actor?.name?.[0] ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800">
                <span className="font-semibold">{entry.actor?.name ?? 'Compte supprimé'}</span>
                {entry.actor && (
                  <span className="text-xs text-gray-400"> ({ROLE_LABELS[entry.actor.role] ?? entry.actor.role})</span>
                )}
                {' '}{actionLabel(entry.action)}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(entry.created_at).toLocaleString('fr-FR', {
                  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {!isLoading && !data?.data.length && (
          <p className="py-6 text-center text-sm text-gray-400">Aucune activité</p>
        )}
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="flex justify-center items-center gap-3 mt-3">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:bg-warm-100 transition-colors"
          >
            ← Préc.
          </button>
          <span className="text-xs text-gray-500 font-medium">
            {data.meta.current_page} / {data.meta.last_page}
          </span>
          <button
            disabled={page >= data.meta.last_page}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:bg-warm-100 transition-colors"
          >
            Suiv. →
          </button>
        </div>
      )}
    </Card>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'societe' | 'equipe' | 'activite' | 'abonnement';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'societe',     label: 'Société',      icon: Building   },
  { id: 'equipe',      label: 'Équipe',        icon: Users      },
  { id: 'activite',    label: 'Activité',      icon: Activity   },
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
          {(isAdmin ? TABS : TABS.filter(t => t.id !== 'societe' && t.id !== 'equipe' && t.id !== 'activite')).map(t => (
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
          {tab === 'activite'   && isAdmin && <ActiviteTab />}
          {tab === 'abonnement' && <AbonnementTab />}
        </div>

      </div>
    </HotelLayout>
  );
};
