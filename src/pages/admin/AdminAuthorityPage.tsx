import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Landmark, Plus, X, Trash2, Pencil, Save } from 'lucide-react';
import { adminAuthorityApi, AdminAuthorityUser, AdminAuthorityOrganization } from '@/api/admin/authority';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';

const TYPE_LABELS: Record<string, string> = {
  police: 'Police', immigration: 'Immigration', customs: 'Douanes',
  judiciary: 'Justice', tax: 'Fiscalité', ministry: 'Ministère', other: 'Autre',
};

// ─── Organismes tab ─────────────────────────────────────────────────────────────

const CreateOrgForm = ({ onDone }: { onDone: () => void }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', type: 'police', governorate: '', code: '' });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => adminAuthorityApi.organizations.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-authority-orgs'] }); onDone(); },
    onError: (err) => setError(extractErrors(err)),
  });

  return (
    <div className="card p-4 flex flex-col gap-3">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Nouvel organisme</p>
      <Input label="Nom" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Poste de police de Sousse" />
      <Select label="Type" value={form.type} onChange={(e) => set('type', e.target.value)}
        options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
      <Input label="Gouvernorat" value={form.governorate} onChange={(e) => set('governorate', e.target.value)} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" loading={mut.isPending} disabled={!form.name} onClick={() => mut.mutate()}>Créer</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Annuler</Button>
      </div>
    </div>
  );
};

const OrgRow = ({ org }: { org: AdminAuthorityOrganization }) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: org.name, type: org.type, governorate: org.governorate ?? '' });
  const [error, setError] = useState('');

  const updateMut = useMutation({
    mutationFn: () => adminAuthorityApi.organizations.update(org.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-authority-orgs'] }); setEditing(false); },
    onError: (err) => setError(extractErrors(err)),
  });
  const deleteMut = useMutation({
    mutationFn: () => adminAuthorityApi.organizations.remove(org.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-authority-orgs'] }); toast('Organisme supprimé', 'success'); },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  if (editing) {
    return (
      <div className="py-3 border-b border-gray-50 last:border-0 flex flex-col gap-2">
        <Input label="Nom" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <div className="grid grid-cols-2 gap-2">
          <Select label="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
          <Input label="Gouvernorat" value={form.governorate} onChange={(e) => setForm((f) => ({ ...f, governorate: e.target.value }))} />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => updateMut.mutate()} loading={updateMut.isPending} className="gap-1.5"><Save className="h-3.5 w-3.5" /> Enregistrer</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{org.name}</p>
        <p className="text-xs text-gray-400">{TYPE_LABELS[org.type] ?? org.type}{org.governorate ? ` · ${org.governorate}` : ''}{org.user_profiles_count ? ` · ${org.user_profiles_count} utilisateur(s)` : ''}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <button onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={() => deleteMut.mutate()} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
};

const OrganismesTab = () => {
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['admin-authority-orgs'], queryFn: () => adminAuthorityApi.organizations.list({ include_inactive: true }) });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate((s) => !s)} className="gap-1.5">
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showCreate ? 'Annuler' : 'Ajouter'}
        </Button>
      </div>
      {showCreate && <CreateOrgForm onDone={() => setShowCreate(false)} />}
      <div className="card p-4">
        {isLoading && <p className="text-sm text-gray-400 text-center py-6">Chargement…</p>}
        {data?.map((org) => <OrgRow key={org.id} org={org} />)}
        {!isLoading && !data?.length && <p className="text-sm text-gray-400 text-center py-6">Aucun organisme</p>}
      </div>
    </div>
  );
};

// ─── Utilisateurs tab ───────────────────────────────────────────────────────────

const CreateAuthorityUserForm = ({ onDone }: { onDone: () => void }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', organization_id: '', badge_number: '', rank: '' });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: orgs } = useQuery({ queryKey: ['admin-authority-orgs-active'], queryFn: () => adminAuthorityApi.organizations.list() });

  const mut = useMutation({
    mutationFn: () => adminAuthorityApi.users.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-authority-users'] }); onDone(); },
    onError: (err) => setError(extractErrors(err)),
  });

  return (
    <div className="card p-4 flex flex-col gap-3">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Nouvel utilisateur autorité</p>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Prénom" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
        <Input label="Nom" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
      </div>
      <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
      <Input label="Mot de passe initial" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} />
      <Select label="Organisme" value={form.organization_id} onChange={(e) => set('organization_id', e.target.value)}
        options={[{ value: '', label: 'Choisir…' }, ...(orgs ?? []).map((o) => ({ value: String(o.id), label: o.name }))]} />
      <div className="grid grid-cols-2 gap-2">
        <Input label="Matricule" value={form.badge_number} onChange={(e) => set('badge_number', e.target.value)} />
        <Input label="Grade" value={form.rank} onChange={(e) => set('rank', e.target.value)} />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" loading={mut.isPending}
          disabled={!form.first_name || !form.last_name || !form.email || form.password.length < 8 || !form.organization_id}
          onClick={() => mut.mutate()}>Créer</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Annuler</Button>
      </div>
    </div>
  );
};

const AuthorityUserRow = ({ u }: { u: AdminAuthorityUser }) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const statusMut = useMutation({
    mutationFn: (status: string) => adminAuthorityApi.users.update(u.id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-authority-users'] }),
  });
  const deleteMut = useMutation({
    mutationFn: () => adminAuthorityApi.users.remove(u.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-authority-users'] }); toast('Utilisateur supprimé', 'success'); },
  });

  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{u.first_name} {u.last_name}</p>
          <p className="text-xs text-gray-500 truncate">{u.email}</p>
          <p className="text-xs text-gray-400 truncate">{u.organization ?? '—'}{u.badge_number ? ` · ${u.badge_number}` : ''}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${u.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.status}</span>
          {u.status === 'active' ? (
            <button onClick={() => statusMut.mutate('suspended')} className="text-xs text-gray-400 hover:text-red-500">Suspendre</button>
          ) : (
            <button onClick={() => statusMut.mutate('active')} className="text-xs text-gray-400 hover:text-green-600">Réactiver</button>
          )}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
          ) : (
            <div className="flex gap-1">
              <button onClick={() => deleteMut.mutate()} className="text-xs font-bold text-red-600">Confirmer</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400">Annuler</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AuthorityUsersTab = () => {
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['admin-authority-users'], queryFn: adminAuthorityApi.users.list });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate((s) => !s)} className="gap-1.5">
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showCreate ? 'Annuler' : 'Ajouter'}
        </Button>
      </div>
      {showCreate && <CreateAuthorityUserForm onDone={() => setShowCreate(false)} />}
      <div className="card p-4">
        {isLoading && <p className="text-sm text-gray-400 text-center py-6">Chargement…</p>}
        {data?.map((u) => <AuthorityUserRow key={u.id} u={u} />)}
        {!isLoading && !data?.length && <p className="text-sm text-gray-400 text-center py-6">Aucun utilisateur</p>}
      </div>
    </div>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────────────

export const AdminAuthorityPage = () => {
  const [tab, setTab] = useState<'users' | 'orgs'>('users');

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900">Autorités</h1>
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#E0DDD7' }}>
        <button onClick={() => setTab('users')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'users' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          <Users className="h-4 w-4" /> Utilisateurs
        </button>
        <button onClick={() => setTab('orgs')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'orgs' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          <Landmark className="h-4 w-4" /> Organismes
        </button>
      </div>
      {tab === 'users' ? <AuthorityUsersTab /> : <OrganismesTab />}
    </div>
  );
};
