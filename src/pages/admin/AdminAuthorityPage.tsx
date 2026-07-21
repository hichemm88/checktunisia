import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Landmark, Plus, X, Trash2, Pencil, Save, ShieldCheck, ShieldAlert } from 'lucide-react';
import { adminAuthorityApi, type AdminAuthorityUser, type AdminAuthorityOrganization } from '@/api/admin/authority';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { extractErrors } from '@/lib/api';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { ListSkeleton } from '@/components/admin/ListSkeleton';
import { Pagination } from '@/components/ui/Pagination';

const TYPE_KEYS: Record<string, string> = {
  police: 'adminAuthority.typePolice', immigration: 'adminAuthority.typeImmigration', customs: 'adminAuthority.typeCustoms',
  judiciary: 'adminAuthority.typeJudiciary', tax: 'adminAuthority.typeTax', ministry: 'adminAuthority.typeMinistry', other: 'adminAuthority.typeOther',
};

// ─── Organismes tab ─────────────────────────────────────────────────────────────

const CreateOrgForm = ({ onDone }: { onDone: () => void }) => {
  const { t } = useTranslation();
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
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{t('adminAuthority.newOrg')}</p>
      <Input label={t('common.name')} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t('adminAuthority.orgNamePlaceholder')} />
      <Select label={t('onboarding.type')} value={form.type} onChange={(e) => set('type', e.target.value)}
        options={Object.entries(TYPE_KEYS).map(([value, labelKey]) => ({ value, label: t(labelKey) }))} />
      <Input label={t('propertiesPage.governorate')} value={form.governorate} onChange={(e) => set('governorate', e.target.value)} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" loading={mut.isPending} disabled={!form.name} onClick={() => mut.mutate()}>{t('adminHotels.create')}</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>{t('common.cancel')}</Button>
      </div>
    </div>
  );
};

const OrgRow = ({ org }: { org: AdminAuthorityOrganization }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({ name: org.name, type: org.type, governorate: org.governorate ?? '' });
  const [error, setError] = useState('');

  const updateMut = useMutation({
    mutationFn: () => adminAuthorityApi.organizations.update(org.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-authority-orgs'] }); setEditing(false); },
    onError: (err) => setError(extractErrors(err)),
  });
  const deleteMut = useAdminMutation({
    mutationFn: () => adminAuthorityApi.organizations.remove(org.id),
    successMessage: t('adminAuthority.orgDeleted'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-authority-orgs'] }),
  });

  if (editing) {
    return (
      <div className="py-3 border-b border-gray-50 last:border-0 flex flex-col gap-2">
        <Input label={t('common.name')} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <div className="grid grid-cols-2 gap-2">
          <Select label={t('onboarding.type')} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            options={Object.entries(TYPE_KEYS).map(([value, labelKey]) => ({ value, label: t(labelKey) }))} />
          <Input label={t('propertiesPage.governorate')} value={form.governorate} onChange={(e) => setForm((f) => ({ ...f, governorate: e.target.value }))} />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => updateMut.mutate()} loading={updateMut.isPending} className="gap-1.5"><Save className="h-3.5 w-3.5" /> {t('common.save')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{org.name}</p>
        <p className="text-xs text-gray-400">{org.type in TYPE_KEYS ? t(TYPE_KEYS[org.type]) : org.type}{org.governorate ? ` · ${org.governorate}` : ''}{org.user_profiles_count ? ` · ${t('adminAuthority.usersCount', { count: org.user_profiles_count })}` : ''}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0 ms-2">
        <button onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-gray-300 hover:bg-[--qayed-cachet-dilue] hover:text-[--qayed-cachet]"><Pencil className="h-3.5 w-3.5" /></button>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
        ) : (
          <div className="flex gap-1">
            <button onClick={() => deleteMut.mutate()} className="text-xs font-bold text-red-600">{t('common.confirm')}</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400">{t('common.cancel')}</button>
          </div>
        )}
      </div>
    </div>
  );
};

const OrganismesTab = () => {
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-authority-orgs', page],
    queryFn: () => adminAuthorityApi.organizations.list({ include_inactive: true, page, per_page: 20 }),
  });
  const orgs = data?.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate((s) => !s)} className="gap-1.5">
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showCreate ? t('common.cancel') : t('common.add')}
        </Button>
      </div>
      {showCreate && <CreateOrgForm onDone={() => setShowCreate(false)} />}
      <div className="card p-4">
        {isLoading && <ListSkeleton rows={3} />}
        {orgs.map((org) => <OrgRow key={org.id} org={org} />)}
        {!isLoading && !orgs.length && <p className="text-sm text-gray-400 text-center py-6">{t('adminAuthority.noOrg')}</p>}
      </div>
      {data?.meta && (
        <Pagination meta={data.meta} currentCount={orgs.length} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => p + 1)} />
      )}
    </div>
  );
};

// ─── Utilisateurs tab ───────────────────────────────────────────────────────────

const CreateAuthorityUserForm = ({ onDone }: { onDone: () => void }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', organization_id: '', badge_number: '', rank: '' });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: orgsResult } = useQuery({ queryKey: ['admin-authority-orgs-active'], queryFn: () => adminAuthorityApi.organizations.list({ per_page: 200 }) });
  const orgs = orgsResult?.data;

  const mut = useMutation({
    mutationFn: () => adminAuthorityApi.users.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-authority-users'] }); onDone(); },
    onError: (err) => setError(extractErrors(err)),
  });

  return (
    <div className="card p-4 flex flex-col gap-3">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{t('adminAuthority.newAuthorityUser')}</p>
      <div className="grid grid-cols-2 gap-2">
        <Input label={t('profile.firstName')} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
        <Input label={t('profile.lastName')} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
      </div>
      {/* autoComplete off/new-password : le navigateur pré-remplissait ici les
          identifiants admin (admin@qayed.tn + mot de passe) via l'autofill. */}
      <Input label={t('profile.email')} type="email" autoComplete="off" value={form.email} onChange={(e) => set('email', e.target.value)} />
      <Input label={t('adminAuthority.initialPassword')} type="password" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />
      <Select label={t('adminAuthority.organization')} value={form.organization_id} onChange={(e) => set('organization_id', e.target.value)}
        options={[{ value: '', label: t('adminUsers.choose') }, ...(orgs ?? []).map((o) => ({ value: String(o.id), label: o.name }))]} />
      <div className="grid grid-cols-2 gap-2">
        <Input label={t('profile.badge')} value={form.badge_number} onChange={(e) => set('badge_number', e.target.value)} />
        <Input label={t('profile.rank')} value={form.rank} onChange={(e) => set('rank', e.target.value)} />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" loading={mut.isPending}
          disabled={!form.first_name || !form.last_name || !form.email || form.password.length < 8 || !form.organization_id}
          onClick={() => mut.mutate()}>{t('adminHotels.create')}</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>{t('common.cancel')}</Button>
      </div>
    </div>
  );
};

const AuthorityUserRow = ({ u }: { u: AdminAuthorityUser }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const statusMut = useAdminMutation({
    mutationFn: (status: string) => adminAuthorityApi.users.update(u.id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-authority-users'] }),
  });
  const deleteMut = useAdminMutation({
    mutationFn: () => adminAuthorityApi.users.remove(u.id),
    successMessage: t('adminUsers.userDeleted'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-authority-users'] }),
  });

  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{u.first_name} {u.last_name}</p>
          <p className="text-xs text-gray-500 truncate">{u.email}</p>
          <p className="text-xs text-gray-400 truncate">{u.organization ?? '—'}{u.badge_number ? ` · ${u.badge_number}` : ''}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ms-2">
          {u.two_factor_confirmed_at ? (
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--qayed-conforme)' }} title={t('adminAuthority.twoFaEnabled')}>
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--qayed-vigilance)' }} title={t('adminAuthority.twoFaDisabled')}>
              <ShieldAlert className="h-3.5 w-3.5" />
            </span>
          )}
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${u.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.status}</span>
          {u.status === 'active' ? (
            <button onClick={() => statusMut.mutate('suspended')} className="text-xs text-gray-400 hover:text-red-500">{t('adminHotels.suspend')}</button>
          ) : (
            <button onClick={() => statusMut.mutate('active')} className="text-xs text-gray-400 hover:text-green-600">{t('adminHotels.reactivate')}</button>
          )}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
          ) : (
            <div className="flex gap-1">
              <button onClick={() => deleteMut.mutate()} className="text-xs font-bold text-red-600">{t('common.confirm')}</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400">{t('common.cancel')}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AuthorityUsersTab = () => {
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-authority-users', page],
    queryFn: () => adminAuthorityApi.users.list({ page, per_page: 20 }),
  });
  const users = data?.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate((s) => !s)} className="gap-1.5">
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showCreate ? t('common.cancel') : t('common.add')}
        </Button>
      </div>
      {showCreate && <CreateAuthorityUserForm onDone={() => setShowCreate(false)} />}
      <div className="card p-4">
        {isLoading && <ListSkeleton rows={3} />}
        {users.map((u) => <AuthorityUserRow key={u.id} u={u} />)}
        {!isLoading && !users.length && <p className="text-sm text-gray-400 text-center py-6">{t('settingsPage.noUser')}</p>}
      </div>
      {data?.meta && (
        <Pagination meta={data.meta} currentCount={users.length} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => p + 1)} />
      )}
    </div>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────────────

export const AdminAuthorityPage = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'users' | 'orgs'>('users');

  return (
    <div className="flex flex-col gap-4 w-full">
      <h1 className="qayed-display text-xl text-gray-900">{t('adminAuthority.title')}</h1>
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--qayed-ligne)' }}>
        <button onClick={() => setTab('users')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'users' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          <Users className="h-4 w-4" /> {t('adminUsers.title')}
        </button>
        <button onClick={() => setTab('orgs')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'orgs' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          <Landmark className="h-4 w-4" /> {t('adminAuthority.organizations')}
        </button>
      </div>
      {tab === 'users' ? <AuthorityUsersTab /> : <OrganismesTab />}
    </div>
  );
};
