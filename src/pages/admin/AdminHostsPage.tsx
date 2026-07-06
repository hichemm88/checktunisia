import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Search, CheckCircle2, XCircle, Plus, X, Trash2,
  Pencil, Check, FileText,
} from 'lucide-react';
import { adminHostsApi, AdminHost, AdminHostDetail } from '@/api/admin/hosts';
import { adminSubscriptionsApi, adminPlansApi } from '@/api/admin/subscriptions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { Pagination } from '@/components/admin/Pagination';
import { InvoiceRow } from '@/components/admin/InvoiceRow';
import { ListSkeleton } from '@/components/admin/ListSkeleton';

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Create form ────────────────────────────────────────────────────────────────

const CreateHostForm = ({ onDone }: { onDone: () => void }) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', entity_type: 'company', contact_email: '', contact_phone: '', registration_number: '' });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => adminHostsApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-hosts'] }); toast('Hébergeur créé', 'success'); onDone(); },
    onError: (err) => setError(extractErrors(err)),
  });

  return (
    <div className="card p-4 flex flex-col gap-3">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Nouvel hébergeur</p>
      <Input label="Nom" value={form.name} onChange={(e) => set('name', e.target.value)} />
      <Select label="Type" value={form.entity_type} onChange={(e) => set('entity_type', e.target.value)}
        options={[{ value: 'company', label: 'Société' }, { value: 'individual', label: 'Particulier' }]} />
      <Input label="Email de contact" type="email" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
      <Input label="Téléphone" value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
      <Input label="RC / Matricule" value={form.registration_number} onChange={(e) => set('registration_number', e.target.value)} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" loading={mut.isPending} disabled={!form.name || !form.contact_email} onClick={() => mut.mutate()}>Créer</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Annuler</Button>
      </div>
    </div>
  );
};

// ─── Abonnement (éditable) ──────────────────────────────────────────────────────

const SubscriptionSection = ({ host }: { host: AdminHostDetail }) => {
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

  const updateMut = useAdminMutation({
    mutationFn: () => adminSubscriptionsApi.updateForHost(host.id, sub!.id, {
      plan_id: form.plan_id ? parseInt(form.plan_id) : undefined,
      expires_at: form.expires_at || undefined,
      custom_price: form.custom_price === '' ? null : parseFloat(String(form.custom_price)),
    }),
    successMessage: 'Abonnement mis à jour',
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-host-detail', host.id] }); setEditing(false); },
  });

  const [newSub, setNewSub] = useState({ plan_id: '', billing_cycle: 'monthly', started_at: new Date().toISOString().slice(0, 10), expires_at: '', custom_price: '' });
  const createMut = useAdminMutation({
    mutationFn: () => adminSubscriptionsApi.createForHost(host.id, {
      ...newSub,
      plan_id: parseInt(newSub.plan_id),
      custom_price: newSub.custom_price === '' ? null : parseFloat(String(newSub.custom_price)),
    }),
    successMessage: 'Abonnement créé',
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-host-detail', host.id] }); setCreating(false); },
  });

  if (!sub) {
    return (
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Abonnement</p>
        {!creating ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-400">Aucun abonnement</p>
            <Button size="sm" variant="secondary" onClick={() => setCreating(true)} className="gap-1.5 w-fit"><Plus className="h-3.5 w-3.5" /> Nouvel abonnement</Button>
          </div>
        ) : (
          <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: '#F5F4EF' }}>
            <Select label="Pack" value={newSub.plan_id} onChange={(e) => setNewSub((f) => ({ ...f, plan_id: e.target.value }))}
              options={[{ value: '', label: 'Choisir…' }, ...(plans ?? []).map((p) => ({ value: String(p.id), label: p.name }))]} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Début" type="date" value={newSub.started_at} onChange={(e) => setNewSub((f) => ({ ...f, started_at: e.target.value }))} />
              <Input label="Expiration" type="date" value={newSub.expires_at} onChange={(e) => setNewSub((f) => ({ ...f, expires_at: e.target.value }))} />
            </div>
            <Input label="Prix personnalisé (optionnel)" type="number" value={newSub.custom_price} onChange={(e) => setNewSub((f) => ({ ...f, custom_price: e.target.value }))} />
            <div className="flex gap-2">
              <Button size="sm" loading={createMut.isPending} disabled={!newSub.plan_id || !newSub.expires_at} onClick={() => createMut.mutate()}>Créer</Button>
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Annuler</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Abonnement</p>
        {!editing && <button onClick={() => setEditing(true)} className="text-gray-300 hover:text-blue-500"><Pencil className="h-3.5 w-3.5" /></button>}
      </div>
      {!editing ? (
        <div className="rounded-xl p-3 text-sm" style={{ background: '#F5F4EF' }}>
          <p className="font-semibold">{sub.plan?.name}</p>
          <p className="text-xs text-gray-400">Expire le {fmtDate(sub.expires_at)}</p>
          {sub.custom_price && <p className="text-xs text-gray-400">Prix négocié : {sub.custom_price} TND</p>}
        </div>
      ) : (
        <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: '#F5F4EF' }}>
          <Select label="Pack" value={form.plan_id} onChange={(e) => setForm((f) => ({ ...f, plan_id: e.target.value }))}
            options={(plans ?? []).map((p) => ({ value: String(p.id), label: p.name }))} />
          <Input label="Expiration" type="date" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
          <Input label="Prix personnalisé (optionnel)" type="number" value={String(form.custom_price)} onChange={(e) => setForm((f) => ({ ...f, custom_price: e.target.value }))} />
          <div className="flex gap-2">
            <Button size="sm" loading={updateMut.isPending} onClick={() => updateMut.mutate()} className="gap-1.5"><Check className="h-3.5 w-3.5" /> Enregistrer</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Factures ───────────────────────────────────────────────────────────────────

const InvoicesSection = ({ host }: { host: AdminHostDetail }) => {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const sub = host.active_subscription;

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['admin-host-invoices', host.id],
    queryFn: () => adminSubscriptionsApi.invoicesForHost(host.id),
  });

  const [form, setForm] = useState({ amount: '', tax_amount: '0', due_at: '' });
  const createMut = useMutation({
    mutationFn: () => adminSubscriptionsApi.createInvoiceForHost(host.id, {
      subscription_id: sub!.id,
      amount: form.amount === '' ? undefined : parseFloat(form.amount),
      tax_amount: parseFloat(form.tax_amount) || 0,
      due_at: form.due_at || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-host-invoices', host.id] }); setShowCreate(false); },
    onError: (err) => setError(extractErrors(err)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Factures</p>
        {sub && (
          <button onClick={() => setShowCreate((s) => !s)} className="text-gray-300 hover:text-blue-500">
            {showCreate ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {showCreate && sub && (
        <div className="rounded-xl p-3 flex flex-col gap-2 mb-2" style={{ background: '#F5F4EF' }}>
          <Input label={`Montant (vide = ${sub.custom_price ?? sub.plan?.price_monthly ?? '—'} TND)`} type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="TVA" type="number" value={form.tax_amount} onChange={(e) => setForm((f) => ({ ...f, tax_amount: e.target.value }))} />
            <Input label="Échéance" type="date" value={form.due_at} onChange={(e) => setForm((f) => ({ ...f, due_at: e.target.value }))} />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button size="sm" loading={createMut.isPending} onClick={() => createMut.mutate()}>Créer la facture</Button>
        </div>
      )}

      {isLoading && <ListSkeleton rows={2} height="h-10" />}
      {!isLoading && !invoices?.length && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <FileText className="h-3.5 w-3.5" /> Aucune facture
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
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<AdminHost | null>(null);
  const [showSuspend, setShowSuspend] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading } = useQuery({
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
    successMessage: 'Hébergeur suspendu',
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-hosts'] }); setShowSuspend(false); setSuspendReason(''); },
  });
  const activateMut = useAdminMutation({
    mutationFn: () => adminHostsApi.activate(selected!.id),
    successMessage: 'Hébergeur réactivé',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-hosts'] }),
  });
  const deleteMut = useAdminMutation({
    mutationFn: () => adminHostsApi.remove(selected!.id),
    successMessage: 'Hébergeur supprimé',
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-hosts'] }); setSelected(null); setConfirmDelete(false); },
  });

  const hosts = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Hébergeurs</h1>
        <Button size="sm" onClick={() => setShowCreate((s) => !s)} className="gap-1.5">
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showCreate ? 'Annuler' : 'Ajouter'}
        </Button>
      </div>

      {showCreate && <CreateHostForm onDone={() => setShowCreate(false)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="input w-full pl-9" placeholder="Rechercher…" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">Tous</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
            </select>
          </div>

          {isLoading && <ListSkeleton rows={5} height="h-16" />}

          <div className="flex flex-col gap-2">
            {hosts.map((h) => (
              <button key={h.id} onClick={() => setSelected(h)}
                className="card p-4 text-left hover:shadow-md transition-all"
                style={{ outline: selected?.id === h.id ? '2px solid #1B3A5F' : 'none' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0" style={{ background: '#1B3A5F18' }}>
                      <Building2 className="h-5 w-5" style={{ color: '#1B3A5F' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{h.name}</p>
                      <p className="text-xs text-gray-400">{h.entity_type === 'individual' ? 'Particulier' : 'Société'} · {h.properties_count} bien{h.properties_count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: h.status === 'active' ? '#22c55e' : '#ef4444' }}>
                      {h.status === 'active' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {h.status === 'active' ? 'Actif' : 'Suspendu'}
                    </span>
                    {h.subscription && <span className="text-xs text-gray-400">{h.subscription.plan}</span>}
                  </div>
                </div>
              </button>
            ))}
            {!isLoading && !hosts.length && <p className="text-sm text-gray-400 text-center py-8">Aucun hébergeur</p>}
          </div>

          {meta && (
            <Pagination meta={meta} currentCount={hosts.length} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => p + 1)} />
          )}
        </div>

        <div>
          {!selected ? (
            <div className="card p-8 text-center text-sm text-gray-400">
              <Building2 className="h-8 w-8 mx-auto mb-3 text-gray-200" />
              Sélectionnez un hébergeur
            </div>
          ) : (
            <div className="card p-5 flex flex-col gap-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight">{selected.name}</h3>
                <p className="text-sm text-gray-400">{selected.contact_email}{selected.contact_phone ? ` · ${selected.contact_phone}` : ''}</p>
                <p className="text-xs text-gray-400 mt-0.5">Créé le {fmtDate(selected.created_at)}</p>
              </div>

              <div className="flex gap-2">
                {selected.status !== 'suspended' ? (
                  <Button variant="danger" size="sm" onClick={() => setShowSuspend(true)} className="flex-1">Suspendre</Button>
                ) : (
                  <Button size="sm" loading={activateMut.isPending} onClick={() => activateMut.mutate()} className="flex-1">Réactiver</Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {showSuspend && (
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-red-50">
                  <Input label="Motif" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} />
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" loading={suspendMut.isPending} disabled={!suspendReason} onClick={() => suspendMut.mutate()} className="flex-1">Confirmer</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowSuspend(false)}>Annuler</Button>
                  </div>
                </div>
              )}

              {confirmDelete && (
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-red-50">
                  <p className="text-sm text-gray-700">Supprimer définitivement cet hébergeur ?</p>
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" loading={deleteMut.isPending} onClick={() => deleteMut.mutate()} className="flex-1">Supprimer</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Annuler</Button>
                  </div>
                </div>
              )}

              {detail && (
                <>
                  <SubscriptionSection host={detail} />

                  <InvoicesSection host={detail} />

                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Biens ({detail.properties.length})</p>
                    <div className="flex flex-col gap-1">
                      {detail.properties.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium">{p.name}</span>
                          <span className="text-xs text-gray-400">{p.status}</span>
                        </div>
                      ))}
                      {!detail.properties.length && <p className="text-xs text-gray-400">Aucun bien</p>}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Utilisateurs ({detail.users.length})</p>
                    <div className="flex flex-col gap-1.5">
                      {detail.users.map((u) => (
                        <div key={u.id} className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium">{u.first_name} {u.last_name}</span>
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{u.role}</span>
                        </div>
                      ))}
                      {!detail.users.length && <p className="text-xs text-gray-400">Aucun utilisateur</p>}
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
