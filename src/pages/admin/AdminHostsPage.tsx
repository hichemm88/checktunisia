import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Search, CheckCircle2, XCircle, Plus, X, Trash2,
  Pencil, Check, FileText, CalendarClock, TrendingUp, BedDouble, ArrowLeft,
} from 'lucide-react';
import { adminHostsApi, type AdminHost, type AdminHostDetail } from '@/api/admin/hosts';
import { adminSubscriptionsApi, adminPlansApi } from '@/api/admin/subscriptions';
import { PlanFeaturesEditor, featureValuesFrom, featureValuesToPayload } from '@/components/admin/PlanFeaturesEditor';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { formatTND, formatTNDAmount } from '@/lib/money';
import { type BillingCycle, cycleEndDate, priceForCycle } from '@/lib/billing';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { Pagination } from '@/components/ui/Pagination';
import { InvoiceRow } from '@/components/admin/InvoiceRow';
import { ListSkeleton } from '@/components/admin/ListSkeleton';
import { ErrorState } from '@/components/admin/ErrorState';

const dateLocaleFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-FR');

const fmtDate = (d: string | null | undefined, locale: string) =>
  d ? new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Create form ────────────────────────────────────────────────────────────────

const CreateHostForm = ({ onDone }: { onDone: () => void }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', entity_type: 'company', contact_email: '', contact_phone: '', registration_number: '' });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => adminHostsApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-hosts'] }); toast(t('adminHosts.hostCreated'), 'success'); onDone(); },
    onError: (err) => setError(extractErrors(err)),
  });

  return (
    <div className="card p-4 flex flex-col gap-3">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{t('adminHosts.newHost')}</p>
      <Input label={t('common.name')} value={form.name} onChange={(e) => set('name', e.target.value)} />
      <Select label={t('onboarding.type')} value={form.entity_type} onChange={(e) => set('entity_type', e.target.value)}
        options={[{ value: 'company', label: t('policeFiche.company') }, { value: 'individual', label: t('policeFiche.individual') }]} />
      <Input label={t('adminHosts.contactEmail')} type="email" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
      <Input label={t('profile.phone')} value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
      <Input label={t('adminHosts.rcMatricule')} value={form.registration_number} onChange={(e) => set('registration_number', e.target.value)} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" loading={mut.isPending} disabled={!form.name || !form.contact_email} onClick={() => mut.mutate()}>{t('adminHotels.create')}</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>{t('common.cancel')}</Button>
      </div>
    </div>
  );
};

// ─── Abonnement (éditable) ──────────────────────────────────────────────────────

const SubscriptionSection = ({ host }: { host: AdminHostDetail }) => {
  const { t, i18n } = useTranslation();
  const locale = dateLocaleFor(i18n.language);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const sub = host.active_subscription;

  const { data: plans } = useQuery({ queryKey: ['admin-plans'], queryFn: adminPlansApi.list });

  const [form, setForm] = useState({
    plan_id: sub?.plan_id ? String(sub.plan_id) : '',
    expires_at: sub?.expires_at ? sub.expires_at.slice(0, 10) : '',
    custom_price: sub?.custom_price ?? '',
  });
  const [overrides, setOverrides] = useState(() => featureValuesFrom(host.feature_overrides ?? null, true));

  const updateMut = useAdminMutation({
    mutationFn: () => adminSubscriptionsApi.updateForHost(host.id, sub!.id, {
      plan_id: form.plan_id ? parseInt(form.plan_id) : undefined,
      expires_at: form.expires_at || undefined,
      custom_price: form.custom_price === '' ? null : parseFloat(String(form.custom_price)),
      feature_overrides: featureValuesToPayload(overrides, true),
    }),
    successMessage: t('adminHosts.subscriptionUpdated'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-host-detail', host.id] }); setEditing(false); },
  });

  const today = new Date().toISOString().slice(0, 10);
  const [newSub, setNewSub] = useState({ plan_id: '', billing_cycle: 'monthly' as BillingCycle, started_at: today, expires_at: cycleEndDate(today, 'monthly'), custom_price: '' });
  const newSubPlan = plans?.find((p) => String(p.id) === newSub.plan_id);
  const createMut = useAdminMutation({
    mutationFn: () => adminSubscriptionsApi.createForHost(host.id, {
      ...newSub,
      plan_id: parseInt(newSub.plan_id),
      custom_price: newSub.custom_price === '' ? null : parseFloat(String(newSub.custom_price)),
    }),
    successMessage: t('adminSubscriptions.subscriptionCreated'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-host-detail', host.id] }); setCreating(false); },
  });

  if (!sub) {
    return (
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('settingsPage.subscription')}</p>
        {!creating ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-400">{t('adminHotels.noSubscription')}</p>
            <Button size="sm" variant="secondary" onClick={() => setCreating(true)} className="gap-1.5 w-fit"><Plus className="h-3.5 w-3.5" /> {t('adminSubscriptions.newSubscription')}</Button>
          </div>
        ) : (
          <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'var(--qayed-papier)' }}>
            <Select label={t('adminSubscriptions.plan')} value={newSub.plan_id} onChange={(e) => setNewSub((f) => ({ ...f, plan_id: e.target.value }))}
              options={[{ value: '', label: t('adminUsers.choose') }, ...(plans ?? []).map((p) => ({ value: String(p.id), label: p.name }))]} />
            <Select label={t('adminSubscriptions.billingCycle')} value={newSub.billing_cycle}
              onChange={(e) => setNewSub((f) => ({ ...f, billing_cycle: e.target.value as BillingCycle, expires_at: cycleEndDate(f.started_at, e.target.value as BillingCycle) }))}
              options={[
                { value: 'monthly', label: t('adminSubscriptions.cycleMonthly') },
                { value: 'yearly', label: t('adminSubscriptions.cycleYearly') },
              ]} />
            <div className="grid grid-cols-2 gap-2">
              <Input label={t('adminSubscriptions.start')} type="date" value={newSub.started_at}
                onChange={(e) => setNewSub((f) => ({ ...f, started_at: e.target.value, expires_at: cycleEndDate(e.target.value, f.billing_cycle) }))} />
              <Input label={t('profile.expiration')} type="date" value={newSub.expires_at} onChange={(e) => setNewSub((f) => ({ ...f, expires_at: e.target.value }))} />
            </div>
            <Input label={t('adminSubscriptions.customPriceOptional')} type="number" value={newSub.custom_price} onChange={(e) => setNewSub((f) => ({ ...f, custom_price: e.target.value }))} />
            {newSubPlan && newSub.custom_price === '' && (
              <p className="text-xs text-gray-400">
                {t('adminSubscriptions.planPriceHint', { price: formatTND(priceForCycle(newSubPlan, newSub.billing_cycle)) })}
                {newSub.billing_cycle === 'yearly' && <span className="text-green-600 font-semibold"> · {t('adminSubscriptions.oneMonthFree')}</span>}
              </p>
            )}
            <div className="flex gap-2">
              <Button size="sm" loading={createMut.isPending} disabled={!newSub.plan_id || !newSub.expires_at} onClick={() => createMut.mutate()}>{t('adminHotels.create')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>{t('common.cancel')}</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('settingsPage.subscription')}</p>
        {!editing && <button onClick={() => setEditing(true)} className="text-gray-300 hover:text-[--qayed-cachet]"><Pencil className="h-3.5 w-3.5" /></button>}
      </div>
      {!editing ? (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--qayed-papier)' }}>
          <p className="font-semibold">
            {sub.plan?.name}
            {sub.billing_cycle === 'yearly' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ms-2 align-middle" style={{ background: 'rgba(83,70,168,0.08)', color: '#5346A8' }}>
                {t('adminSubscriptions.yearlyBadge')}
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400">{t('adminHotels.expiresOn', { date: fmtDate(sub.expires_at, locale) })}</p>
          {sub.custom_price && <p className="font-mono text-xs text-gray-400">{t('adminHosts.negotiatedPrice', { price: formatTNDAmount(sub.custom_price) })}</p>}
          {/* Fonctionnalités effectives (pack + overrides) et usage réel. */}
          {host.entitlements && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {Object.entries(host.entitlements).map(([key, e]) => {
                const overridden = key in (host.feature_overrides ?? {});
                if ('enabled' in e && e.limit === undefined) {
                  return (
                    <span key={key} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${e.enabled ? 'bg-[--qayed-conforme-fond] text-[--qayed-conforme-texte]' : 'bg-gray-100 text-gray-400'}`}>
                      {e.label} : {e.enabled ? t('planFeatures.on') : t('planFeatures.off')}{overridden ? ' *' : ''}
                    </span>
                  );
                }
                const over = e.limit != null && (e.used ?? 0) >= e.limit;
                return (
                  <span key={key} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${over ? 'bg-[--qayed-vigilance-fond] text-[--qayed-vigilance-texte]' : 'bg-white text-gray-600'}`}>
                    {e.label} : <span className="font-mono">{e.used}/{e.limit == null ? '∞' : e.limit}</span>{overridden ? ' *' : ''}
                  </span>
                );
              })}
              {Object.keys(host.feature_overrides ?? {}).length > 0 && (
                <span className="text-[11px] text-gray-400">{t('planFeatures.overriddenLegend')}</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'var(--qayed-papier)' }}>
          <Select label={t('adminSubscriptions.plan')} value={form.plan_id} onChange={(e) => setForm((f) => ({ ...f, plan_id: e.target.value }))}
            options={(plans ?? []).map((p) => ({ value: String(p.id), label: p.name }))} />
          <Input label={t('profile.expiration')} type="date" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
          <Input label={t('adminSubscriptions.customPriceOptional')} type="number" value={String(form.custom_price)} onChange={(e) => setForm((f) => ({ ...f, custom_price: e.target.value }))} />
          <PlanFeaturesEditor
            value={overrides}
            onChange={setOverrides}
            asOverrides
            usage={Object.fromEntries(Object.entries(host.entitlements ?? {}).filter(([, e]) => e.used !== undefined).map(([k, e]) => [k, e.used as number]))}
          />
          <div className="flex gap-2">
            <Button size="sm" loading={updateMut.isPending} onClick={() => updateMut.mutate()} className="gap-1.5"><Check className="h-3.5 w-3.5" /> {t('common.save')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Métriques (dernier check-in, volume mensuel, MRR) ─────────────────────────

const HostMetrics = ({ host }: { host: AdminHostDetail }) => {
  const { t, i18n } = useTranslation();
  const locale = dateLocaleFor(i18n.language);
  const m = host.metrics;

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-xl p-2.5 flex flex-col gap-1" style={{ background: 'var(--qayed-papier)' }}>
        <span className="flex items-center gap-1 text-xs text-gray-400"><CalendarClock className="h-3 w-3" /> {t('adminHosts.lastCheckIn')}</span>
        <span className="text-sm font-semibold text-gray-900">{fmtDate(m.last_check_in_at, locale)}</span>
      </div>
      <div className="rounded-xl p-2.5 flex flex-col gap-1" style={{ background: 'var(--qayed-papier)' }}>
        <span className="flex items-center gap-1 text-xs text-gray-400"><BedDouble className="h-3 w-3" /> {t('adminHosts.checkInsThisMonth')}</span>
        <span className="text-sm font-semibold text-gray-900">{m.check_ins_this_month}</span>
      </div>
      <div className="rounded-xl p-2.5 flex flex-col gap-1" style={{ background: 'var(--qayed-papier)' }}>
        <span className="flex items-center gap-1 text-xs text-gray-400"><TrendingUp className="h-3 w-3" /> MRR</span>
        <span className="font-mono text-sm font-semibold text-gray-900">{m.mrr != null ? formatTND(m.mrr) : '—'}</span>
      </div>
    </div>
  );
};

// ─── Factures ───────────────────────────────────────────────────────────────────

const InvoicesSection = ({ host }: { host: AdminHostDetail }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const sub = host.active_subscription;

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['admin-host-invoices', host.id],
    queryFn: () => adminSubscriptionsApi.invoicesForHost(host.id),
  });

  const [form, setForm] = useState({ amount: '', tax_amount: '0', due_at: '', coupon_code: '' });
  const createMut = useMutation({
    mutationFn: () => adminSubscriptionsApi.createInvoiceForHost(host.id, {
      subscription_id: sub!.id,
      amount: form.amount === '' ? undefined : parseFloat(form.amount),
      tax_amount: parseFloat(form.tax_amount) || 0,
      due_at: form.due_at || undefined,
      coupon_code: form.coupon_code.trim() || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-host-invoices', host.id] }); setShowCreate(false); },
    onError: (err) => setError(extractErrors(err)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('adminFacturation.title')}</p>
        {sub && (
          <button onClick={() => setShowCreate((s) => !s)} className="text-gray-300 hover:text-[--qayed-cachet]">
            {showCreate ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {showCreate && sub && (
        <div className="rounded-xl p-3 flex flex-col gap-2 mb-2" style={{ background: 'var(--qayed-papier)' }}>
          <Input label={t('adminHosts.amountEmptyHint', { price: (sub.custom_price ?? sub.plan?.price_monthly) != null ? formatTNDAmount(sub.custom_price ?? sub.plan?.price_monthly) : '—' })} type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <Input label={t('adminHosts.tax')} type="number" value={form.tax_amount} onChange={(e) => setForm((f) => ({ ...f, tax_amount: e.target.value }))} />
            <Input label={t('adminHosts.dueDate')} type="date" value={form.due_at} onChange={(e) => setForm((f) => ({ ...f, due_at: e.target.value }))} />
          </div>
          <Input label={t('adminHosts.couponCode')} value={form.coupon_code} onChange={(e) => setForm((f) => ({ ...f, coupon_code: e.target.value.toUpperCase() }))} placeholder={t('adminHosts.couponPlaceholder')} />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button size="sm" loading={createMut.isPending} onClick={() => createMut.mutate()}>{t('adminHosts.createInvoice')}</Button>
        </div>
      )}

      {isLoading && <ListSkeleton rows={2} height="h-10" />}
      {!isLoading && !invoices?.length && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <FileText className="h-3.5 w-3.5" /> {t('adminFacturation.noInvoice')}
        </div>
      )}
      {invoices?.map((inv) => (
        <InvoiceRow key={inv.id} hostId={host.id} invoice={inv} invalidateKey={['admin-host-invoices', host.id]} />
      ))}
    </div>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────────────

export const AdminHostsPage = () => {
  const { t, i18n } = useTranslation();
  const locale = dateLocaleFor(i18n.language);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<AdminHost | null>(null);
  const [showSuspend, setShowSuspend] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-hosts', search, status, page],
    queryFn: () => adminHostsApi.list({ search: search || undefined, status: status || undefined, page, per_page: 15 }),
  });

  const { data: detail } = useQuery({
    queryKey: ['admin-host-detail', selected?.id],
    queryFn: () => adminHostsApi.show(selected!.id),
    enabled: !!selected,
  });

  const suspendMut = useAdminMutation({
    mutationFn: () => adminHostsApi.suspend(selected!.id, suspendReason),
    successMessage: t('adminHosts.hostSuspended'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-hosts'] }); setShowSuspend(false); setSuspendReason(''); },
  });
  const activateMut = useAdminMutation({
    mutationFn: () => adminHostsApi.activate(selected!.id),
    successMessage: t('adminHosts.hostReactivated'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-hosts'] }),
  });
  const deleteMut = useAdminMutation({
    mutationFn: () => adminHostsApi.remove(selected!.id),
    successMessage: t('adminHosts.hostDeleted'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-hosts'] }); setSelected(null); setConfirmDelete(false); },
  });

  const hosts = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <h1 className="qayed-display text-xl text-gray-900">{t('adminHosts.title')}</h1>
        <Button size="sm" onClick={() => setShowCreate((s) => !s)} className="gap-1.5">
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showCreate ? t('common.cancel') : t('common.add')}
        </Button>
      </div>

      {showCreate && <CreateHostForm onDone={() => setShowCreate(false)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste : plein écran sur mobile ; masquée quand un détail est ouvert. */}
        <div className={`lg:col-span-2 flex-col gap-4 lg:flex ${selected ? 'hidden' : 'flex'}`}>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="input w-full ps-9" placeholder={t('common.search') + '…'} value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">{t('common.all')}</option>
              <option value="active">{t('adminDashboard.active')}</option>
              <option value="suspended">{t('adminDashboard.suspended')}</option>
            </select>
          </div>

          {isLoading && <ListSkeleton rows={5} height="h-16" />}
          {isError && <ErrorState onRetry={() => refetch()} />}

          <div className="flex flex-col gap-2">
            {hosts.map((h) => (
              <button key={h.id} onClick={() => setSelected(h)}
                className="card p-4 text-start hover:shadow-md transition-all"
                style={{ outline: selected?.id === h.id ? '2px solid var(--qayed-cachet)' : 'none' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0" style={{ background: 'var(--qayed-cachet)18' }}>
                      <Building2 className="h-5 w-5" style={{ color: 'var(--qayed-cachet)' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{h.name}</p>
                      <p className="text-xs text-gray-400">{h.entity_type === 'individual' ? t('policeFiche.individual') : t('policeFiche.company')} · {t('propertiesPage.propertiesCount', { count: h.properties_count })}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: h.status === 'active' ? 'var(--qayed-conforme)' : '#ef4444' }}>
                      {h.status === 'active' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {h.status === 'active' ? t('adminDashboard.active') : t('adminHotels.statusSuspended')}
                    </span>
                    {h.subscription && <span className="text-xs text-gray-400">{h.subscription.plan}</span>}
                  </div>
                </div>
              </button>
            ))}
            {!isLoading && !hosts.length && <p className="text-sm text-gray-400 text-center py-8">{t('adminHosts.noHost')}</p>}
          </div>

          {meta && (
            <Pagination meta={meta} currentCount={hosts.length} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => p + 1)} />
          )}
        </div>

        {/* Détail : masqué sur mobile tant que rien n'est sélectionné. */}
        <div className={selected ? '' : 'hidden lg:block'}>
          {!selected ? (
            <div className="card p-8 text-center text-sm text-gray-400">
              <Building2 className="h-8 w-8 mx-auto mb-3 text-gray-200" />
              {t('adminHosts.selectHost')}
            </div>
          ) : (
            <div className="card p-5 flex flex-col gap-4">
              <button onClick={() => setSelected(null)} className="lg:hidden flex items-center gap-1.5 -mb-1 text-sm font-medium text-gray-500 hover:text-gray-800">
                <ArrowLeft className="h-4 w-4" /> {t('adminShared.backToList')}
              </button>
              <div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight">{selected.name}</h3>
                <p className="text-sm text-gray-400">{selected.contact_email}{selected.contact_phone ? ` · ${selected.contact_phone}` : ''}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t('adminHotels.createdOn', { date: fmtDate(selected.created_at, locale) })}</p>
              </div>

              <div className="flex gap-2">
                {selected.status !== 'suspended' ? (
                  <Button variant="danger" size="sm" onClick={() => setShowSuspend(true)} className="flex-1">{t('adminHotels.suspend')}</Button>
                ) : (
                  <Button size="sm" loading={activateMut.isPending} onClick={() => activateMut.mutate()} className="flex-1">{t('adminHotels.reactivate')}</Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {showSuspend && (
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-red-50">
                  <Input label={t('adminHotels.reason')} value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} />
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" loading={suspendMut.isPending} disabled={!suspendReason} onClick={() => suspendMut.mutate()} className="flex-1">{t('common.confirm')}</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowSuspend(false)}>{t('common.cancel')}</Button>
                  </div>
                </div>
              )}

              {confirmDelete && (
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-red-50">
                  <p className="text-sm text-gray-700">{t('adminHosts.confirmDeleteBody')}</p>
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" loading={deleteMut.isPending} onClick={() => deleteMut.mutate()} className="flex-1">{t('common.delete')}</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
                  </div>
                </div>
              )}

              {detail && (
                <>
                  <HostMetrics host={detail} />

                  <SubscriptionSection host={detail} />

                  <InvoicesSection host={detail} />

                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('adminHosts.propertiesWithCount', { count: detail.properties.length })}</p>
                    <div className="flex flex-col gap-1">
                      {detail.properties.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium">{p.name}</span>
                          <span className="text-xs text-gray-400">{p.status}</span>
                        </div>
                      ))}
                      {!detail.properties.length && <p className="text-xs text-gray-400">{t('adminHosts.noProperty')}</p>}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('adminHosts.usersWithCount', { count: detail.users.length })}</p>
                    <div className="flex flex-col gap-1.5">
                      {detail.users.map((u) => (
                        <div key={u.id} className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium">{u.first_name} {u.last_name}</span>
                          <span className="text-xs text-gray-400 ms-2 flex-shrink-0">{u.role}</span>
                        </div>
                      ))}
                      {!detail.users.length && <p className="text-xs text-gray-400">{t('settingsPage.noUser')}</p>}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
