import { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building, CreditCard, Users, Plus, Trash2, Save,
  Pencil, X, MapPin, Send, Activity,
  CheckCircle, AlertCircle, Download, Landmark,
} from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/authStore';
import { settingsApi } from '@/api/settings';
import { extractErrors } from '@/lib/api';
import { formatTND } from '@/lib/money';
import { type HotelUser, type CreateUserPayload } from '@/types';
import { organizationApi, type OrgInfo } from '@/api/organization';
import { fetchPlatformSettings } from '@/api/public';
import { paymentApi } from '@/api/payment';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const dateLocaleFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-TN');

const SUB_BADGE_VARIANT: Record<string, 'active' | 'draft' | 'suspended' | 'expired'> = {
  active: 'active', trial: 'draft', suspended: 'suspended', expired: 'expired', trial_expired: 'expired',
};

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

// ─── Tab: Société ─────────────────────────────────────────────────────────────

const SocieteTab = () => {
  const { t } = useTranslation();
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
      setFeedback({ msg: t('settingsPage.infoUpdated'), type: 'success' });
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
            <Building className="h-4 w-4 text-gray-400" /> {t('settingsPage.companyInfo')}
          </div>
        </CardTitle>
        {!editing
          ? <button onClick={startEdit} className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: '#5346A8' }}>
              <Pencil className="h-3.5 w-3.5" /> {t('common.edit')}
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
            { label: t('settingsPage.type'),           value: org?.entity_type === 'company' ? t('policeFiche.company') : org?.entity_type === 'individual' ? t('policeFiche.individual') : org?.entity_type },
            { label: t('settingsPage.legalName'),      value: org?.name },
            { label: t('settingsPage.rcNumber'),       value: org?.registration_number },
            { label: t('settingsPage.contactEmail'),   value: org?.contact_email },
            { label: t('settingsPage.phone'),          value: org?.contact_phone },
          ].map(({ label, value }) => value ? (
            <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium text-gray-900 text-end max-w-[60%]">{value}</span>
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('settingsPage.entityType')}</label>
            <Select
              value={form?.entity_type ?? 'company'}
              onChange={e => setForm(f => f ? { ...f, entity_type: e.target.value as any } : f)}
              options={[
                { value: 'company',    label: t('policeFiche.company') },
                { value: 'individual', label: t('policeFiche.individual') },
              ]}
            />
          </div>
          <Input label={t('settingsPage.legalNameOrName')}
            value={form?.name ?? ''}
            onChange={e => setForm(f => f ? { ...f, name: e.target.value } : f)}
          />
          <Input label={t('settingsPage.rcNumberFull')}
            value={form?.registration_number ?? ''}
            onChange={e => setForm(f => f ? { ...f, registration_number: e.target.value } : f)}
            placeholder="B123456789"
          />
          <hr className="border-gray-100" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('settingsPage.contacts')}</p>
          <Input label={t('profile.email')} type="email"
            value={form?.contact_email ?? ''}
            onChange={e => setForm(f => f ? { ...f, contact_email: e.target.value } : f)}
            placeholder="contact@societe.tn"
          />
          <Input label={t('settingsPage.phone')} type="tel"
            value={form?.contact_phone ?? ''}
            onChange={e => setForm(f => f ? { ...f, contact_phone: e.target.value } : f)}
            placeholder="+216 xx xxx xxx"
          />
          <hr className="border-gray-100" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('onboarding.address')}</p>
          <Input label={t('onboarding.address')} value={form?.address?.line1 ?? ''} onChange={e => setAddr('line1', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('propertiesPage.city')} value={form?.address?.city ?? ''} onChange={e => setAddr('city', e.target.value)} />
            <Select label={t('propertiesPage.governorate')} value={form?.address?.governorate ?? ''}
              onChange={e => setAddr('governorate', e.target.value)}
              options={[{ value: '', label: t('settingsPage.choose') }, ...GOVERNORATES.map(g => ({ value: g, label: g }))]}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => mutation.mutate()} loading={mutation.isPending} className="gap-2">
              <Save className="h-4 w-4" /> {t('common.save')}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEdit}>{t('common.cancel')}</Button>
          </div>
        </div>
      )}
    </Card>
  );
};

// ─── User row ─────────────────────────────────────────────────────────────────

const UserRow = ({ u, onDeleted }: { u: HotelUser; onDeleted: () => void }) => {
  const { t } = useTranslation();
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
            <Input label={t('profile.firstName')} value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
            <Input label={t('profile.lastName')}    value={editForm.last_name}  onChange={e => setEditForm(f => ({ ...f, last_name:  e.target.value }))} />
          </div>
          <Select
            label={t('settingsPage.role')}
            value={editForm.role}
            onChange={e => setEditForm(f => ({ ...f, role: e.target.value as any }))}
            options={[
              { value: 'receptionist', label: t('settingsPage.roleReceptionist') },
              { value: 'hotel_admin',  label: t('settingsPage.roleAdmin') },
            ]}
          />
          {allProperties && allProperties.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label className="label">{t('settingsPage.accessibleProperties')}</label>
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
              <Save className="h-3.5 w-3.5" /> {t('common.save')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setMode('view'); setError(''); }}>{t('common.cancel')}</Button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'confirm_delete') {
    return (
      <div className="py-3 border-b border-gray-50 last:border-0">
        <p className="text-sm text-gray-700 mb-2">
          {t('settingsPage.confirmDeleteUser')} <span className="font-semibold">{u.first_name} {u.last_name}</span> ?
        </p>
        {error && <Alert msg={error} type="error" />}
        <div className="flex gap-2">
          <Button size="sm" loading={deleteMut.isPending} onClick={() => deleteMut.mutate()}
            className="!bg-red-600 hover:!bg-red-700 gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> {t('common.delete')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setMode('view'); setError(''); }}>{t('common.cancel')}</Button>
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
          style={{ background: '#EEEBFA', color: '#5346A8' }}
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
      <div className="flex items-center gap-2 shrink-0 ms-2">
        <Badge variant={u.status === 'active' ? 'active' : 'suspended'}>
          {u.role === 'hotel_admin' ? t('settingsPage.roleAdmin') : u.role === 'receptionist' ? t('settingsPage.roleReceptionist') : u.role}
        </Badge>
        {!u.last_login_at && (
          <button
            onClick={() => resendMut.mutate()}
            disabled={resendMut.isPending}
            className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-colors disabled:opacity-50"
            title={resendMut.isSuccess ? t('settingsPage.inviteResent') : t('settingsPage.resendInvite')}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => setMode('edit')}
          className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-colors"
          title={t('common.edit')}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setMode('confirm_delete')}
          className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
          title={t('common.delete')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {resendMut.isSuccess && !error && (
        <p className="text-xs text-green-600 mt-1">
          {resendMut.data.email_sent ? t('settingsPage.inviteResentFull') : t('settingsPage.passwordRegeneratedNoEmail')}
        </p>
      )}
    </div>
  );
};

// ─── Add user form ────────────────────────────────────────────────────────────

const AddUserForm = ({ onDone }: { onDone: () => void }) => {
  const { t } = useTranslation();
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
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{t('settingsPage.newMember')}</p>
      <div className="grid grid-cols-2 gap-2">
        <Input label={t('profile.firstName')} value={form.first_name} onChange={e => set('first_name', e.target.value)} />
        <Input label={t('profile.lastName')}    value={form.last_name}  onChange={e => set('last_name',  e.target.value)} />
      </div>
      <Input label={t('profile.email')} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
      <Select label={t('settingsPage.role')} value={form.role} onChange={e => set('role', e.target.value)}
        options={[
          { value: 'receptionist', label: t('settingsPage.roleReceptionist') },
          { value: 'hotel_admin',  label: t('settingsPage.roleAdmin') },
        ]}
      />
      {properties && properties.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <label className="label">{t('settingsPage.accessibleProperties')}</label>
          <div className="flex flex-col gap-1.5 rounded-lg border border-gray-100 p-2.5 max-h-36 overflow-y-auto">
            {properties.map(p => (
              <label key={p.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={(form.hotel_ids ?? []).includes(p.id)} onChange={() => togglePropertyId(p.id)} />
                {p.name}
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400">{t('settingsPage.leaveEmptyHint')}</p>
        </div>
      )}
      <p className="text-xs text-gray-400">{t('settingsPage.tempPasswordEmailHint')}</p>
      {error && <Alert msg={error} type="error" />}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => mutation.mutate()} loading={mutation.isPending}
          disabled={!form.first_name || !form.last_name || !form.email}>
          {t('settingsPage.createAndSendInvite')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>{t('common.cancel')}</Button>
      </div>
    </div>
  );
};

// ─── Tab: Équipe ──────────────────────────────────────────────────────────────

const EquipeTab = () => {
  const { t } = useTranslation();
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
            <Users className="h-4 w-4 text-gray-400" /> {t('settingsPage.team')}
          </div>
        </CardTitle>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity"
          style={{ color: '#5346A8' }}
        >
          {showAdd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showAdd ? t('common.cancel') : t('common.add')}
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
          <p className="py-6 text-center text-sm text-gray-400">{t('settingsPage.noUser')}</p>
        )}
      </div>
    </Card>
  );
};

// ─── Tab: Abonnement ──────────────────────────────────────────────────────────

const AbonnementTab = () => {
  const { t, i18n } = useTranslation();
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
                <CreditCard className="h-4 w-4 text-gray-400" /> {t('settingsPage.subscription')}
              </div>
            </CardTitle>
          </CardHeader>
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-500">{t('settingsPage.plan')}</span>
              <span className="text-sm font-bold" style={{ color: '#5346A8' }}>
                {typeof sub.plan === 'string' ? sub.plan : (sub.plan?.name ?? '—')}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-500">{t('common.status')}</span>
              <Badge variant={SUB_BADGE_VARIANT[sub.status] ?? 'suspended'}>{t(`settingsPage.subscriptionStatus.${sub.status}`, sub.status)}</Badge>
            </div>
            {sub.billing_cycle && (
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-sm text-gray-500">{t('settingsPage.billingCycle')}</span>
                <span className="text-sm font-medium text-gray-900">
                  {t(sub.billing_cycle === 'yearly' ? 'settingsPage.cycleYearly' : 'settingsPage.cycleMonthly')}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-500">{t('settingsPage.expiresOn')}</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(sub.expires_at).toLocaleDateString(dateLocaleFor(i18n.language), { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-sm text-gray-500">{t('settingsPage.daysRemaining')}</span>
              <span className={`text-sm font-bold ${sub.days_remaining <= 7 ? 'text-red-600' : sub.days_remaining <= 30 ? 'text-amber-600' : 'text-green-600'}`}>
                {t('settingsPage.daysCount', { count: sub.days_remaining })}
              </span>
            </div>

            {/* Détail du prix : base + suppléments par établissement (formule
                unique calculée côté serveur). N'affiché que si des suppléments
                s'appliquent ou qu'un prix négocié est en place. */}
            {sub.pricing && (sub.pricing.extra_count > 0 || sub.pricing.negotiated) && (
              <div className="mt-2 rounded-xl p-3 text-sm" style={{ background: 'var(--qayed-papier)' }}>
                <div className="flex justify-between text-gray-500">
                  <span>{t('settingsPage.priceBase', { count: sub.pricing.included_properties })}</span>
                  <span className="font-mono">{formatTND(sub.pricing.base)}</span>
                </div>
                {sub.pricing.extra_count > 0 && (
                  <div className="flex justify-between text-gray-500 mt-1">
                    <span>{t('settingsPage.priceExtra', { count: sub.pricing.extra_count, price: formatTND(sub.pricing.extra_property_price ?? 0) })}</span>
                    <span className="font-mono">{formatTND(sub.pricing.extra_total)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 mt-2 pt-2 border-t border-gray-200">
                  <span>{sub.pricing.negotiated ? t('settingsPage.priceNegotiated') : t('settingsPage.priceMonthlyTotal')}</span>
                  <span className="font-mono" style={{ color: '#5346A8' }}>{formatTND(sub.pricing.negotiated ? sub.pricing.cycle_total : sub.pricing.monthly_total)}</span>
                </div>
              </div>
            )}
          </div>

          {sub.days_remaining <= 30 && (
            <div className="mt-3 rounded-xl p-3 flex items-start gap-2" style={{ background: '#FBF0D7', border: '1px solid #FBF0D7' }}>
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{t('settingsPage.renewalDue')}</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  <Trans t={t} i18nKey="settingsPage.renewalContact" components={{ a: <a href="mailto:support@qayed.tn" className="underline font-medium" /> }} />
                </p>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
      )}

      <InvoicesSection />
    </div>
  );
};

// ─── Invoice history + manual bank-transfer declaration ────────────────────────

const INVOICE_STATUS_VARIANT: Record<string, 'active' | 'draft' | 'suspended' | 'expired'> = {
  paid: 'active', sent: 'draft', draft: 'draft', overdue: 'expired', void: 'suspended',
};

const InvoicesSection = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [declaringFor, setDeclaringFor] = useState<string | null>(null);
  const [form, setForm] = useState({ reference: '', date: new Date().toISOString().slice(0, 10) });

  const { data: invoices, isLoading } = useQuery({ queryKey: ['hotel-invoices'], queryFn: () => settingsApi.getInvoices() });
  const { data: platformSettings } = useQuery({ queryKey: ['public-platform-settings'], queryFn: fetchPlatformSettings });

  const declareMut = useMutation({
    mutationFn: () => settingsApi.declareVirement({ invoice_id: declaringFor!, reference: form.reference, date: form.date }),
    onSuccess: () => {
      toast(t('settingsPage.virementDeclared'), 'success');
      setDeclaringFor(null);
      setForm({ reference: '', date: new Date().toISOString().slice(0, 10) });
      qc.invalidateQueries({ queryKey: ['hotel-invoices'] });
    },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const payMut = useMutation({
    mutationFn: (invoiceId: string) => paymentApi.initiate(invoiceId),
    onSuccess: (result) => { window.location.href = result.payment_url; },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-gray-400" /> {t('settingsPage.invoices')}
          </div>
        </CardTitle>
      </CardHeader>

      {isLoading && <div className="mt-3 h-16 animate-pulse rounded-xl bg-gray-100" />}

      {!isLoading && !invoices?.data.length && (
        <p className="mt-3 text-sm text-gray-400 py-2">{t('settingsPage.noInvoice')}</p>
      )}

      <div className="mt-2 flex flex-col">
        {invoices?.data.map((inv) => (
          <div key={inv.id} className="flex flex-col gap-2 py-2.5 border-b border-gray-50 last:border-0">
            <div className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold">{inv.invoice_number}</p>
                <p className="text-xs text-gray-400">
                  {new Date(inv.created_at).toLocaleDateString(dateLocaleFor(i18n.language), { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs text-gray-600">{formatTND(inv.total_amount)}</span>
                <Badge variant={INVOICE_STATUS_VARIANT[inv.status] ?? 'suspended'}>{inv.status}</Badge>
                <button
                  onClick={() => settingsApi.downloadInvoicePdf(inv.id, `facture-${inv.invoice_number}.pdf`)}
                  className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {inv.status !== 'paid' && inv.status !== 'void' && (
              <div className="flex items-center gap-3">
                {platformSettings?.flouci_enabled && (
                  <Button size="sm" loading={payMut.isPending && payMut.variables === inv.id} onClick={() => payMut.mutate(inv.id)}>
                    {t('settingsPage.payOnline')}
                  </Button>
                )}
              </div>
            )}

            {inv.status !== 'paid' && inv.status !== 'void' && (
              declaringFor === inv.id ? (
                <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: '#F6F5F1' }}>
                  {platformSettings?.virement_iban && (
                    <p className="text-xs text-gray-500">
                      {t('settingsPage.transferTo', { beneficiary: platformSettings.virement_beneficiary, iban: platformSettings.virement_iban })}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Input label={t('settingsPage.transferReference')} value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
                    <Input label={t('settingsPage.transferDate')} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" loading={declareMut.isPending} disabled={!form.reference} onClick={() => declareMut.mutate()}>{t('common.save')}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeclaringFor(null)}>{t('common.cancel')}</Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setDeclaringFor(inv.id)} className="self-start text-xs font-semibold" style={{ color: 'var(--qayed-cachet)' }}>
                  {t('settingsPage.declareTransfer')}
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── Tab: Activité ──────────────────────────────────────────────────────────────

const ACTION_KEYS: Record<string, string> = {
  'check_in.created':           'settingsPage.action.checkinCreated',
  'check_in.updated':           'settingsPage.action.checkinUpdated',
  'check_in.completed':         'settingsPage.action.checkinCompleted',
  'check_in.checked_out':       'settingsPage.action.checkinCheckedOut',
  'check_in.cancelled':         'settingsPage.action.checkinCancelled',
  'check_in.deleted':           'settingsPage.action.checkinDeleted',
  'guest.added':                'settingsPage.action.guestAdded',
  'guest.updated':               'settingsPage.action.guestUpdated',
  'guest.removed':               'settingsPage.action.guestRemoved',
  'scan.uploaded':                'settingsPage.action.scanUploaded',
  'room.created':                'settingsPage.action.roomCreated',
  'room.updated':                'settingsPage.action.roomUpdated',
  'room.deleted':                'settingsPage.action.roomDeleted',
  'watchlist.hits_viewed':       'settingsPage.action.watchlistViewed',
  'watchlist.hit_acknowledged':  'settingsPage.action.watchlistAcknowledged',
  'user.login':                  'settingsPage.action.userLogin',
  'user.logout':                 'settingsPage.action.userLogout',
  'user.created':                'settingsPage.action.userCreated',
  'user.updated':                'settingsPage.action.userUpdated',
  'user.deleted':                'settingsPage.action.userDeleted',
  'user.invite_resent':          'settingsPage.action.userInviteResent',
  'profile.updated':             'settingsPage.action.profileUpdated',
  'profile.password_changed':    'settingsPage.action.profilePasswordChanged',
};

const ActiviteTab = () => {
  const { t, i18n } = useTranslation();
  const actionLabel = (action: string): string =>
    action in ACTION_KEYS ? t(ACTION_KEYS[action]) : action.replace(/[._]/g, ' ');
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
            <Activity className="h-4 w-4 text-gray-400" /> {t('settingsPage.activity')}
          </div>
        </CardTitle>
      </CardHeader>

      <div className="flex gap-1.5 mb-3">
        {[
          { value: '',             label: t('common.all') },
          { value: 'receptionist', label: t('settingsPage.roleReceptionists') },
          { value: 'hotel_admin',  label: t('settingsPage.roleAdmins') },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => { setRole(f.value); setPage(1); }}
            className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
            style={role === f.value
              ? { background: '#5346A8', color: '#fff' }
              : { background: '#F6F5F1', color: '#6B7280' }}
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
              style={{ background: '#EEEBFA', color: '#5346A8' }}
            >
              {entry.actor?.name?.[0] ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800">
                <span className="font-semibold">{entry.actor?.name ?? t('settingsPage.deletedAccount')}</span>
                {entry.actor && (
                  <span className="text-xs text-gray-400"> ({entry.actor.role === 'hotel_admin' ? t('settingsPage.roleAdmin') : entry.actor.role === 'receptionist' ? t('settingsPage.roleReceptionist') : entry.actor.role})</span>
                )}
                {' '}{actionLabel(entry.action)}
                {entry.subject_label && (
                  <span className="font-semibold text-gray-600"> — {entry.subject_label}</span>
                )}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(entry.created_at).toLocaleString(dateLocaleFor(i18n.language), {
                  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {!isLoading && !data?.data.length && (
          <p className="py-6 text-center text-sm text-gray-400">{t('settingsPage.noActivity')}</p>
        )}
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="flex justify-center items-center gap-3 mt-3">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:bg-warm-100 transition-colors"
          >
            ← {t('common.previous')}
          </button>
          <span className="text-xs text-gray-500 font-medium">
            {data.meta.current_page} / {data.meta.last_page}
          </span>
          <button
            disabled={page >= data.meta.last_page}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:bg-warm-100 transition-colors"
          >
            {t('common.next')} →
          </button>
        </div>
      )}
    </Card>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'societe' | 'equipe' | 'activite' | 'abonnement';

const TAB_DEFS: { id: Tab; labelKey: string; icon: React.ElementType }[] = [
  { id: 'societe',     labelKey: 'settingsPage.tabCompany',      icon: Building   },
  { id: 'equipe',      labelKey: 'settingsPage.team',            icon: Users      },
  { id: 'activite',    labelKey: 'settingsPage.activity',        icon: Activity   },
  { id: 'abonnement',  labelKey: 'settingsPage.subscription',    icon: CreditCard },
];

export const SettingsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'hotel_admin';
  const [tab, setTab] = useState<Tab>(isAdmin ? 'societe' : 'abonnement');

  return (
    <HotelLayout title={t('settingsPage.title')}>
      <div className="flex flex-col">

        {/* ── Tab bar ── */}
        <div
          className="sticky top-0 z-10 flex border-b px-4"
          style={{ background: '#fff', borderColor: '#E5E7EB' }}
        >
          {(isAdmin ? TAB_DEFS : TAB_DEFS.filter(td => td.id !== 'societe' && td.id !== 'equipe' && td.id !== 'activite')).map(td => (
            <button
              key={td.id}
              onClick={() => setTab(td.id)}
              className="flex items-center gap-1.5 px-3 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap"
              style={tab === td.id
                ? { borderColor: '#5346A8', color: '#5346A8' }
                : { borderColor: 'transparent', color: '#9CA3AF' }
              }
            >
              <td.icon className="h-4 w-4" />
              {t(td.labelKey)}
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
