import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, X, Send, Trash2, Pencil, Save } from 'lucide-react';
import { adminUsersApi, AdminUser } from '@/api/admin/users';
import { adminHotelsApi } from '@/api/admin/hotels';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { Pagination } from '@/components/ui/Pagination';
import { ListSkeleton } from '@/components/admin/ListSkeleton';

const ROLE_LABELS: Record<string, string> = { hotel_admin: 'Administrateur', receptionist: 'Réceptionniste' };

// ─── Create form ────────────────────────────────────────────────────────────────

const CreateUserForm = ({ onDone }: { onDone: () => void }) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', role: 'receptionist', hotel_id: '' });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: hotels } = useQuery({
    queryKey: ['admin-hotels-all'],
    queryFn: () => adminHotelsApi.list({ per_page: 200 }),
  });

  const mut = useMutation({
    mutationFn: () => adminUsersApi.create(form as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast('Utilisateur créé, email envoyé', 'success'); onDone(); },
    onError: (err) => setError(extractErrors(err)),
  });

  return (
    <div className="card p-4 flex flex-col gap-3">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Nouvel utilisateur</p>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Prénom" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
        <Input label="Nom" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
      </div>
      <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
      <Select label="Rôle" value={form.role} onChange={(e) => set('role', e.target.value)}
        options={[{ value: 'receptionist', label: 'Réceptionniste' }, { value: 'hotel_admin', label: 'Administrateur' }]} />
      <Select label="Établissement" value={form.hotel_id} onChange={(e) => set('hotel_id', e.target.value)}
        options={[{ value: '', label: 'Choisir…' }, ...(hotels?.data ?? []).map((h) => ({ value: h.id, label: h.name }))]} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" loading={mut.isPending}
          disabled={!form.first_name || !form.last_name || !form.email || !form.hotel_id}
          onClick={() => mut.mutate()}>Créer et envoyer l'invitation</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Annuler</Button>
      </div>
    </div>
  );
};

// ─── Row ────────────────────────────────────────────────────────────────────────

const UserRow = ({ u }: { u: AdminUser }) => {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm_delete'>('view');
  const [editForm, setEditForm] = useState({ first_name: u.first_name, last_name: u.last_name, role: u.role });
  const [error, setError] = useState('');

  const editMut = useMutation({
    mutationFn: () => adminUsersApi.update(u.id, editForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setMode('view'); },
    onError: (err) => setError(extractErrors(err)),
  });
  const deleteMut = useAdminMutation({
    mutationFn: () => adminUsersApi.remove(u.id),
    successMessage: 'Utilisateur supprimé',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const resendMut = useAdminMutation({
    mutationFn: () => adminUsersApi.resendInvite(u.id),
  });

  if (mode === 'edit') {
    return (
      <div className="py-3 border-b border-gray-50 last:border-0 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Input label="Prénom" value={editForm.first_name} onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))} />
          <Input label="Nom" value={editForm.last_name} onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))} />
        </div>
        <Select label="Rôle" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as any }))}
          options={[{ value: 'receptionist', label: 'Réceptionniste' }, { value: 'hotel_admin', label: 'Administrateur' }]} />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => editMut.mutate()} loading={editMut.isPending} className="gap-1.5"><Save className="h-3.5 w-3.5" /> Enregistrer</Button>
          <Button size="sm" variant="ghost" onClick={() => setMode('view')}>Annuler</Button>
        </div>
      </div>
    );
  }

  if (mode === 'confirm_delete') {
    return (
      <div className="py-3 border-b border-gray-50 last:border-0">
        <p className="text-sm text-gray-700 mb-2">Supprimer <span className="font-semibold">{u.first_name} {u.last_name}</span> ?</p>
        <div className="flex gap-2">
          <Button size="sm" loading={deleteMut.isPending} onClick={() => deleteMut.mutate()} className="!bg-red-600 hover:!bg-red-700 gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Supprimer</Button>
          <Button size="sm" variant="ghost" onClick={() => setMode('view')}>Annuler</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold" style={{ background: '#E8EEFB', color: '#1B3A5F' }}>
            {u.first_name?.[0]}{u.last_name?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{u.first_name} {u.last_name}</p>
            <p className="text-xs text-gray-500 truncate">{u.email}</p>
            <p className="text-xs text-gray-400 truncate">{u.organization ?? u.hotels.map((h) => h.name).join(', ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: '#1B3A5F18', color: '#1B3A5F' }}>{ROLE_LABELS[u.role] ?? u.role}</span>
          {!u.last_login_at && (
            <button onClick={() => resendMut.mutate()} disabled={resendMut.isPending} className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-colors" title="Renvoyer l'invitation">
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => setMode('edit')} className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => setMode('confirm_delete')} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {resendMut.isSuccess && (
        <p className="text-xs text-green-600 mt-1">{resendMut.data.email_sent ? 'Invitation renvoyée.' : "Mot de passe régénéré, email non envoyé."}</p>
      )}
    </div>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────────────

export const AdminUsersPage = () => {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, role, page],
    queryFn: () => adminUsersApi.list({ search: search || undefined, role: role || undefined, page, per_page: 20 }),
  });

  const users = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Utilisateurs</h1>
        <Button size="sm" onClick={() => setShowCreate((s) => !s)} className="gap-1.5">
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showCreate ? 'Annuler' : 'Ajouter'}
        </Button>
      </div>

      {showCreate && <CreateUserForm onDone={() => setShowCreate(false)} />}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input w-full pl-9" placeholder="Nom, email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">Tous les rôles</option>
          <option value="hotel_admin">Administrateurs</option>
          <option value="receptionist">Réceptionnistes</option>
        </select>
      </div>

      <div className="card p-4">
        {isLoading && <ListSkeleton rows={3} />}
        {users.map((u) => <UserRow key={u.id} u={u} />)}
        {!isLoading && !users.length && <p className="py-6 text-center text-sm text-gray-400">Aucun utilisateur</p>}
      </div>

      {meta && (
        <Pagination meta={meta} currentCount={users.length} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => p + 1)} />
      )}
    </div>
  );
};
