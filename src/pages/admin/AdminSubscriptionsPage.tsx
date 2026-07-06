import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, CreditCard, Plus, X, Pencil, Check, Trash2, Search } from 'lucide-react';
import { adminPlansApi, adminSubscriptionsApi, AdminPlan } from '@/api/admin/subscriptions';
import { adminHostsApi } from '@/api/admin/hosts';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { extractErrors } from '@/lib/api';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { InvoiceRow } from '@/components/admin/InvoiceRow';
import { ListSkeleton } from '@/components/admin/ListSkeleton';

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Packs tab ──────────────────────────────────────────────────────────────────

const CreatePlanForm = ({ onDone }: { onDone: () => void }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', slug: '', min_rooms: '1', max_rooms: '', price_monthly: '', price_yearly: '' });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => adminPlansApi.create({
      name: form.name, slug: form.slug, min_rooms: parseInt(form.min_rooms) || 1,
      max_rooms: form.max_rooms ? parseInt(form.max_rooms) : null,
      price_monthly: parseFloat(form.price_monthly) || 0,
      price_yearly: form.price_yearly ? parseFloat(form.price_yearly) : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); onDone(); },
    onError: (err) => setError(extractErrors(err)),
  });

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-gray-100 bg-white">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Nouveau pack</p>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Nom" value={form.name} onChange={(e) => set('name', e.target.value)} />
        <Input label="Slug" value={form.slug} onChange={(e) => set('slug', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Chambres min" type="number" value={form.min_rooms} onChange={(e) => set('min_rooms', e.target.value)} />
        <Input label="Chambres max (vide = illimité)" type="number" value={form.max_rooms} onChange={(e) => set('max_rooms', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Prix mensuel (TND)" type="number" value={form.price_monthly} onChange={(e) => set('price_monthly', e.target.value)} />
        <Input label="Prix annuel (TND)" type="number" value={form.price_yearly} onChange={(e) => set('price_yearly', e.target.value)} />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" loading={mut.isPending} disabled={!form.name || !form.slug || !form.price_monthly} onClick={() => mut.mutate()}>Créer</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Annuler</Button>
      </div>
    </div>
  );
};

const PlanRow = ({ plan }: { plan: AdminPlan }) => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    price_monthly: plan.price_monthly, price_yearly: plan.price_yearly ?? '',
    max_rooms: plan.max_rooms ?? '', is_active: plan.is_active,
  });

  const updateMut = useAdminMutation({
    mutationFn: () => adminPlansApi.update(plan.id, {
      price_monthly: parseFloat(form.price_monthly), price_yearly: form.price_yearly ? parseFloat(String(form.price_yearly)) : null,
      max_rooms: form.max_rooms ? parseInt(String(form.max_rooms)) : null, is_active: form.is_active,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); setEditing(false); },
  });
  const deleteMut = useAdminMutation({
    mutationFn: () => adminPlansApi.remove(plan.id),
    successMessage: 'Pack supprimé',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-plans'] }),
  });

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-gray-100 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#1B3A5F18' }}>
            <Package className="h-4 w-4" style={{ color: '#1B3A5F' }} />
          </div>
          <div>
            <p className="font-bold text-gray-900">{plan.name}</p>
            <p className="text-xs text-gray-400">{plan.min_rooms}–{plan.max_rooms ?? '∞'} chambres</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plan.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{plan.is_active ? 'Actif' : 'Inactif'}</span>
          {!editing && (
            <>
              <button onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => setConfirmDelete((s) => !s)} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Input label="Prix mensuel" type="number" value={form.price_monthly} onChange={(e) => setForm((f) => ({ ...f, price_monthly: e.target.value }))} />
            <Input label="Prix annuel" type="number" value={String(form.price_yearly)} onChange={(e) => setForm((f) => ({ ...f, price_yearly: e.target.value }))} />
          </div>
          <Input label="Chambres max" type="number" value={String(form.max_rooms)} onChange={(e) => setForm((f) => ({ ...f, max_rooms: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /> Actif
          </label>
          <div className="flex gap-2">
            <Button size="sm" loading={updateMut.isPending} onClick={() => updateMut.mutate()} className="gap-1.5"><Check className="h-3.5 w-3.5" /> Enregistrer</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 text-sm text-gray-600">
          <span>{plan.price_monthly} TND/mois</span>
          {plan.price_yearly && <span>{plan.price_yearly} TND/an</span>}
        </div>
      )}

      {confirmDelete && (
        <div className="flex gap-2 p-2 rounded-lg bg-red-50">
          <p className="text-xs text-gray-700 flex-1">Supprimer ce pack ?</p>
          <button onClick={() => deleteMut.mutate()} className="text-xs font-bold text-red-600">Confirmer</button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400">Annuler</button>
        </div>
      )}
    </div>
  );
};

const PacksTab = () => {
  const [showCreate, setShowCreate] = useState(false);
  const { data: plans, isLoading } = useQuery({ queryKey: ['admin-plans'], queryFn: adminPlansApi.list });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate((s) => !s)} className="gap-1.5">
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showCreate ? 'Annuler' : 'Ajouter'}
        </Button>
      </div>
      {showCreate && <CreatePlanForm onDone={() => setShowCreate(false)} />}
      {isLoading && <ListSkeleton rows={3} />}
      {plans?.map((p) => <PlanRow key={p.id} plan={p} />)}
    </div>
  );
};

// ─── Abonnements (par hébergeur) tab ────────────────────────────────────────────

const AbonnementsActifsTab = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedHost, setSelectedHost] = useState<{ id: string; name: string } | null>(null);
  const [showNewSub, setShowNewSub] = useState(false);
  const [editingExpiry, setEditingExpiry] = useState(false);

  const { data: hosts } = useQuery({
    queryKey: ['admin-hosts-search', search],
    queryFn: () => adminHostsApi.list({ search: search || undefined, per_page: 8 }),
    enabled: search.length >= 2,
  });

  const { data: subs } = useQuery({
    queryKey: ['admin-subs-host', selectedHost?.id],
    queryFn: () => adminSubscriptionsApi.listForHost(selectedHost!.id),
    enabled: !!selectedHost,
  });
  const { data: invoices } = useQuery({
    queryKey: ['admin-invoices-host', selectedHost?.id],
    queryFn: () => adminSubscriptionsApi.invoicesForHost(selectedHost!.id),
    enabled: !!selectedHost,
  });
  const { data: plans } = useQuery({ queryKey: ['admin-plans'], queryFn: adminPlansApi.list });

  const [newSub, setNewSub] = useState({ plan_id: '', billing_cycle: 'monthly', started_at: new Date().toISOString().slice(0, 10), expires_at: '', custom_price: '' });
  const createSubMut = useAdminMutation({
    mutationFn: () => adminSubscriptionsApi.createForHost(selectedHost!.id, {
      ...newSub, plan_id: parseInt(newSub.plan_id), custom_price: newSub.custom_price === '' ? null : parseFloat(newSub.custom_price),
    }),
    successMessage: 'Abonnement créé',
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-subs-host', selectedHost?.id] }); setShowNewSub(false); },
  });
  const updateSubMut = useAdminMutation({
    mutationFn: (vars: { id: string; data: object }) => adminSubscriptionsApi.updateForHost(selectedHost!.id, vars.id, vars.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-subs-host', selectedHost?.id] }); setEditingExpiry(false); },
  });

  const [expiryForm, setExpiryForm] = useState({ expires_at: '', custom_price: '' });

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input className="input w-full pl-9" placeholder="Chercher un hébergeur…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {hosts?.data?.length ? (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg">
            {hosts.data.map((h) => (
              <button key={h.id} className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-warm-100"
                onClick={() => { setSelectedHost({ id: h.id, name: h.name }); setSearch(''); }}>
                {h.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!selectedHost ? (
        <div className="card p-8 text-center text-sm text-gray-400">
          <CreditCard className="h-8 w-8 mx-auto mb-3 text-gray-200" />
          Cherchez un hébergeur pour voir/gérer son abonnement
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="font-bold text-gray-900">{selectedHost.name}</p>
            <Button size="sm" onClick={() => setShowNewSub((s) => !s)} className="gap-1.5">
              {showNewSub ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} Nouvel abonnement
            </Button>
          </div>

          {showNewSub && (
            <div className="card p-4 flex flex-col gap-2">
              <Select label="Pack" value={newSub.plan_id} onChange={(e) => setNewSub((f) => ({ ...f, plan_id: e.target.value }))}
                options={[{ value: '', label: 'Choisir…' }, ...(plans ?? []).map((p) => ({ value: String(p.id), label: p.name }))]} />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Début" type="date" value={newSub.started_at} onChange={(e) => setNewSub((f) => ({ ...f, started_at: e.target.value }))} />
                <Input label="Expiration" type="date" value={newSub.expires_at} onChange={(e) => setNewSub((f) => ({ ...f, expires_at: e.target.value }))} />
              </div>
              <Input label="Prix personnalisé (optionnel)" type="number" value={newSub.custom_price} onChange={(e) => setNewSub((f) => ({ ...f, custom_price: e.target.value }))} />
              <Button size="sm" loading={createSubMut.isPending} disabled={!newSub.plan_id || !newSub.expires_at} onClick={() => createSubMut.mutate()}>Créer</Button>
            </div>
          )}

          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Abonnements</p>
            {subs?.map((s) => (
              <div key={s.id} className="flex flex-col gap-1.5 py-2 border-b border-gray-50 last:border-0 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{s.plan?.name ?? `Pack #${s.plan_id}`}</span>
                    <span className="text-xs text-gray-400 ml-2">jusqu'au {fmtDate(s.expires_at)}</span>
                    {s.custom_price && <span className="text-xs text-gray-400 ml-2">· {s.custom_price} TND</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${s.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>{s.status}</span>
                    {s.status === 'active' && (
                      <button onClick={() => { setEditingExpiry(!editingExpiry); setExpiryForm({ expires_at: s.expires_at.slice(0, 10), custom_price: s.custom_price ?? '' }); }} className="text-gray-300 hover:text-blue-500">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {s.status === 'active' ? (
                      <button onClick={() => updateSubMut.mutate({ id: s.id, data: { status: 'cancelled' } })} className="text-xs text-red-500">Annuler</button>
                    ) : s.status !== 'cancelled' && (
                      <button onClick={() => updateSubMut.mutate({ id: s.id, data: { status: 'active' } })} className="text-xs text-green-600">Réactiver</button>
                    )}
                  </div>
                </div>
                {editingExpiry && s.status === 'active' && (
                  <div className="flex items-end gap-2 p-2 rounded-lg" style={{ background: '#F5F4EF' }}>
                    <Input label="Expiration" type="date" value={expiryForm.expires_at} onChange={(e) => setExpiryForm((f) => ({ ...f, expires_at: e.target.value }))} />
                    <Input label="Prix personnalisé" type="number" value={String(expiryForm.custom_price)} onChange={(e) => setExpiryForm((f) => ({ ...f, custom_price: e.target.value }))} />
                    <Button size="sm" loading={updateSubMut.isPending} onClick={() => updateSubMut.mutate({ id: s.id, data: { expires_at: expiryForm.expires_at, custom_price: expiryForm.custom_price === '' ? null : parseFloat(String(expiryForm.custom_price)) } })} className="gap-1"><Check className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </div>
            ))}
            {!subs?.length && <p className="text-sm text-gray-400 py-2">Aucun abonnement</p>}
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Factures</p>
            {invoices?.map((inv) => (
              <InvoiceRow key={inv.id} hostId={selectedHost.id} invoice={inv} invalidateKey={['admin-invoices-host', selectedHost.id]} />
            ))}
            {!invoices?.length && <p className="text-sm text-gray-400 py-2">Aucune facture</p>}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────────────

export const AdminSubscriptionsPage = () => {
  const [tab, setTab] = useState<'packs' | 'active'>('packs');

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900">Abonnements</h1>
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#E0DDD7' }}>
        <button onClick={() => setTab('packs')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'packs' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          <Package className="h-4 w-4" /> Packs
        </button>
        <button onClick={() => setTab('active')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'active' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          <CreditCard className="h-4 w-4" /> Abonnements
        </button>
      </div>
      {tab === 'packs' ? <PacksTab /> : <AbonnementsActifsTab />}
    </div>
  );
};
