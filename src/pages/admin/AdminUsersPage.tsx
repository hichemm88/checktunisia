import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

// ─── Create form ────────────────────────────────────────────────────────────────

const CreateUserForm = ({ onDone }: { onDone: () => void }) => {
  const { t } = useTranslation();
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast(t('adminUsers.userCreatedEmailSent'), 'success'); onDone(); },
    onError: (err) => setError(extractErrors(err)),
  });

  return (
    <div className="card p-4 flex flex-col gap-3">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{t('adminUsers.newUser')}</p>
      <div className="grid grid-cols-2 gap-2">
        <Input label={t('profile.firstName')} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
        <Input label={t('profile.lastName')} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
      </div>
      <Input label={t('profile.email')} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
      <Select label={t('settingsPage.role')} value={form.role} onChange={(e) => set('role', e.target.value)}
        options={[{ value: 'receptionist', label: t('settingsPage.roleReceptionist') }, { value: 'hotel_admin', label: t('settingsPage.roleAdmin') }]} />
      <Select label={t('adminUsers.property')} value={form.hotel_id} onChange={(e) => set('hotel_id', e.target.value)}
        options={[{ value: '', label: t('adminUsers.choose') }, ...(hotels?.data ?? []).map((h) => ({ value: h.id, label: h.name }))]} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" loading={mut.isPending}
          disabled={!form.first_name || !form.last_name || !form.email || !form.hotel_id}
          onClick={() => mut.mutate()}>{t('settingsPage.createAndSendInvite')}</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>{t('common.cancel')}</Button>
      </div>
    </div>
  );
};

// ─── Row ────────────────────────────────────────────────────────────────────────

const UserRow = ({ u }: { u: AdminUser }) => {
  const { t } = useTranslation();
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
    successMessage: t('adminUsers.userDeleted'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const resendMut = useAdminMutation({
    mutationFn: () => adminUsersApi.resendInvite(u.id),
  });

  if (mode === 'edit') {
    return (
      <div className="py-3 border-b border-gray-50 last:border-0 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Input label={t('profile.firstName')} value={editForm.first_name} onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))} />
          <Input label={t('profile.lastName')} value={editForm.last_name} onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))} />
        </div>
        <Select label={t('settingsPage.role')} value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as any }))}
          options={[{ value: 'receptionist', label: t('settingsPage.roleReceptionist') }, { value: 'hotel_admin', label: t('settingsPage.roleAdmin') }]} />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => editMut.mutate()} loading={editMut.isPending} className="gap-1.5"><Save className="h-3.5 w-3.5" /> {t('common.save')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setMode('view')}>{t('common.cancel')}</Button>
        </div>
      </div>
    );
  }

  if (mode === 'confirm_delete') {
    return (
      <div className="py-3 border-b border-gray-50 last:border-0">
        <p className="text-sm text-gray-700 mb-2">{t('settingsPage.confirmDeleteUser')} <span className="font-semibold">{u.first_name} {u.last_name}</span> ?</p>
        <div className="flex gap-2">
          <Button size="sm" loading={deleteMut.isPending} onClick={() => deleteMut.mutate()} className="!bg-red-600 hover:!bg-red-700 gap-1.5"><Trash2 className="h-3.5 w-3.5" /> {t('common.delete')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setMode('view')}>{t('common.cancel')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold" style={{ background: 'var(--qayed-cachet-dilue)', color: 'var(--qayed-cachet)' }}>
            {u.first_name?.[0]}{u.last_name?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{u.first_name} {u.last_name}</p>
            <p className="text-xs text-gray-500 truncate">{u.email}</p>
            <p className="text-xs text-gray-400 truncate">{u.organization ?? u.hotels.map((h) => h.name).join(', ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ms-2">
          <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:inline">
            {u.last_login_at
              ? t('adminUsers.lastLoginOn', { date: new Date(u.last_login_at).toLocaleDateString() })
              : t('adminUsers.neverLoggedIn')}
          </span>
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--qayed-cachet)18', color: 'var(--qayed-cachet)' }}>{u.role === 'hotel_admin' ? t('settingsPage.roleAdmin') : u.role === 'receptionist' ? t('settingsPage.roleReceptionist') : u.role}</span>
          {!u.last_login_at && (
            <button onClick={() => resendMut.mutate()} disabled={resendMut.isPending} className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-colors" title={t('settingsPage.resendInvite')}>
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => setMode('edit')} className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => setMode('confirm_delete')} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {resendMut.isSuccess && (
        <p className="text-xs text-green-600 mt-1">{resendMut.data.email_sent ? t('settingsPage.inviteResentFull') : t('adminUsers.passwordRegeneratedNoEmailShort')}</p>
      )}
    </div>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────────────

export const AdminUsersPage = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [hotelId, setHotelId] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const { data: hotels } = useQuery({ queryKey: ['admin-hotels-all'], queryFn: () => adminHotelsApi.list({ per_page: 200 }) });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, role, hotelId, page],
    queryFn: () => adminUsersApi.list({ search: search || undefined, role: role || undefined, hotel_id: hotelId || undefined, page, per_page: 20 }),
  });

  const users = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="qayed-display text-xl text-gray-900">{t('adminUsers.title')}</h1>
        <Button size="sm" onClick={() => setShowCreate((s) => !s)} className="gap-1.5">
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showCreate ? t('common.cancel') : t('common.add')}
        </Button>
      </div>

      {showCreate && <CreateUserForm onDone={() => setShowCreate(false)} />}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input w-full ps-9" placeholder={t('adminUsers.searchPlaceholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">{t('adminUsers.allRoles')}</option>
          <option value="hotel_admin">{t('settingsPage.roleAdmins')}</option>
          <option value="receptionist">{t('settingsPage.roleReceptionists')}</option>
        </select>
        <select className="input" value={hotelId} onChange={(e) => { setHotelId(e.target.value); setPage(1); }}>
          <option value="">{t('adminUsers.allProperties')}</option>
          {(hotels?.data ?? []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>

      <div className="card p-4">
        {isLoading && <ListSkeleton rows={3} />}
        {users.map((u) => <UserRow key={u.id} u={u} />)}
        {!isLoading && !users.length && <p className="py-6 text-center text-sm text-gray-400">{t('settingsPage.noUser')}</p>}
      </div>

      {meta && (
        <Pagination meta={meta} currentCount={users.length} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => p + 1)} />
      )}
    </div>
  );
};
