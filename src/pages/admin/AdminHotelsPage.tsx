import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Search, CheckCircle2, XCircle, Clock, Plus, X, Trash2, RefreshCw,
} from 'lucide-react';
import { adminHotelsApi, AdminHotel } from '@/api/admin/hotels';
import { adminHostsApi } from '@/api/admin/hosts';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { Pagination } from '@/components/ui/Pagination';
import { ListSkeleton } from '@/components/admin/ListSkeleton';

const STATUS: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active:    { label: 'Actif',      color: '#1F9D6B', icon: CheckCircle2 },
  suspended: { label: 'Suspendu',   color: '#ef4444', icon: XCircle },
  pending:   { label: 'En attente', color: '#E3A008', icon: Clock },
  closed:    { label: 'Fermé',      color: '#9ca3af', icon: XCircle },
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Create form ────────────────────────────────────────────────────────────────

const CreateHotelForm = ({ onDone }: { onDone: () => void }) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: '', type: 'hotel', room_count: '1',
    line1: '', city: '', governorate: '',
  });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const [hostSearch, setHostSearch] = useState('');
  const [selectedHost, setSelectedHost] = useState<{ id: string; name: string } | null>(null);
  const { data: hostResults } = useQuery({
    queryKey: ['admin-hosts-search-hotelform', hostSearch],
    queryFn: () => adminHostsApi.list({ search: hostSearch || undefined, per_page: 6 }),
    enabled: hostSearch.length >= 2,
  });

  const mut = useMutation({
    mutationFn: () => adminHotelsApi.create({
      name: form.name, organization_id: selectedHost!.id, type: form.type, room_count: parseInt(form.room_count) || 1,
      address: { line1: form.line1, city: form.city, governorate: form.governorate },
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-hotels'] }); toast('Établissement créé', 'success'); onDone(); },
    onError: (err) => setError(extractErrors(err)),
  });

  return (
    <div className="card p-4 flex flex-col gap-3">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Nouvel établissement</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          className="input w-full pl-9"
          placeholder="Hébergeur propriétaire…"
          value={selectedHost ? selectedHost.name : hostSearch}
          onChange={(e) => { setHostSearch(e.target.value); setSelectedHost(null); }}
        />
        {selectedHost && (
          <button onClick={() => { setSelectedHost(null); setHostSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">✕</button>
        )}
        {!selectedHost && hostResults?.data?.length ? (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg">
            {hostResults.data.map((h) => (
              <button key={h.id} className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-warm-100"
                onClick={() => { setSelectedHost({ id: h.id, name: h.name }); setHostSearch(''); }}>
                {h.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <Input label="Nom" value={form.name} onChange={(e) => set('name', e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <Select label="Type" value={form.type} onChange={(e) => set('type', e.target.value)}
          options={[
            { value: 'hotel', label: 'Hôtel' }, { value: 'guesthouse', label: "Maison d'hôtes" },
            { value: 'rental', label: 'Location' }, { value: 'hostel', label: 'Auberge' }, { value: 'resort', label: 'Resort' },
          ]} />
        <Input label="Chambres" type="number" min={1} value={form.room_count} onChange={(e) => set('room_count', e.target.value)} />
      </div>
      <Input label="Adresse" value={form.line1} onChange={(e) => set('line1', e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <Input label="Ville" value={form.city} onChange={(e) => set('city', e.target.value)} />
        <Input label="Gouvernorat" value={form.governorate} onChange={(e) => set('governorate', e.target.value)} />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" loading={mut.isPending} disabled={!selectedHost || !form.name || !form.line1 || !form.city || !form.governorate} onClick={() => mut.mutate()}>Créer</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Annuler</Button>
      </div>
    </div>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────────────

export const AdminHotelsPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<AdminHotel | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspend, setShowSuspend] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: hotelsRes, isLoading } = useQuery({
    queryKey: ['admin-hotels', search, filter, page],
    queryFn: () => adminHotelsApi.list({ search: search || undefined, status: filter || undefined, page, per_page: 15 }),
  });
  const { data: hotelUsers } = useQuery({
    queryKey: ['admin-hotel-users', selected?.id],
    queryFn: () => adminHotelsApi.getUsers(selected!.id),
    enabled: !!selected,
  });

  const suspendMut = useAdminMutation({
    mutationFn: () => adminHotelsApi.suspend(selected!.id, suspendReason),
    successMessage: 'Établissement suspendu',
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-hotels'] }); setShowSuspend(false); setSuspendReason(''); },
  });
  const activateMut = useAdminMutation({
    mutationFn: () => adminHotelsApi.activate(selected!.id),
    successMessage: 'Établissement réactivé',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-hotels'] }),
  });
  const deleteMut = useAdminMutation({
    mutationFn: () => adminHotelsApi.remove(selected!.id),
    successMessage: 'Établissement supprimé',
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-hotels'] }); setSelected(null); setConfirmDelete(false); },
  });

  const hotels = hotelsRes?.data ?? [];
  const meta = hotelsRes?.meta;

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Établissements</h1>
        <Button size="sm" onClick={() => setShowCreate((s) => !s)} className="gap-1.5">
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showCreate ? 'Annuler' : 'Ajouter'}
        </Button>
      </div>

      {showCreate && <CreateHotelForm onDone={() => setShowCreate(false)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="input w-full pl-9" placeholder="Rechercher…" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="input" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
              <option value="">Tous</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
              <option value="pending">En attente</option>
            </select>
          </div>

          {isLoading && <ListSkeleton rows={5} height="h-16" />}

          <div className="flex flex-col gap-2">
            {hotels.map((h) => {
              const s = STATUS[h.status] ?? STATUS.pending;
              return (
                <button key={h.id} onClick={() => setSelected(h)}
                  className="card p-4 text-left hover:shadow-md transition-all"
                  style={{ outline: selected?.id === h.id ? '2px solid #5346A8' : 'none' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0" style={{ background: '#5346A818' }}>
                        <Building2 className="h-5 w-5" style={{ color: '#5346A8' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{h.name}</p>
                        <p className="text-xs text-gray-400">{h.room_count} chambres · {h.check_ins_count} check-ins</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: s.color }}>
                        <s.icon className="h-3 w-3" /> {s.label}
                      </span>
                      {h.subscription && <span className="text-xs text-gray-400">{h.subscription.plan}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
            {!isLoading && !hotels.length && <p className="text-sm text-gray-400 text-center py-8">Aucun établissement</p>}
          </div>

          {meta && (
            <Pagination meta={meta} currentCount={hotels.length} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => p + 1)} />
          )}
        </div>

        <div>
          {!selected ? (
            <div className="card p-8 text-center text-sm text-gray-400">
              <Building2 className="h-8 w-8 mx-auto mb-3 text-gray-200" />
              Sélectionnez un établissement
            </div>
          ) : (
            <div className="card p-5 flex flex-col gap-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight">{selected.name}</h3>
                <p className="text-sm text-gray-400">{selected.type} · {selected.room_count} chambres</p>
                <p className="text-xs text-gray-400 mt-0.5">Créé le {fmtDate(selected.created_at)}</p>
              </div>

              <div className="flex gap-2">
                {selected.status !== 'suspended' ? (
                  <Button variant="danger" size="sm" onClick={() => setShowSuspend(true)} className="flex-1">Suspendre</Button>
                ) : (
                  <Button size="sm" loading={activateMut.isPending} onClick={() => activateMut.mutate()} className="flex-1">Réactiver</Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['admin-hotel-users', selected.id] })}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
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
                  <p className="text-sm text-gray-700">Supprimer définitivement cet établissement ?</p>
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" loading={deleteMut.isPending} onClick={() => deleteMut.mutate()} className="flex-1">Supprimer</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Annuler</Button>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Abonnement</p>
                {selected.subscription ? (
                  <div className="rounded-xl p-3 text-sm" style={{ background: '#F6F5F1' }}>
                    <p className="font-semibold">{selected.subscription.plan}</p>
                    <p className="text-xs text-gray-400">Expire le {fmtDate(selected.subscription.expires_at)}</p>
                    <span className={`text-xs font-medium ${selected.subscription.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                      ● {selected.subscription.status}
                    </span>
                  </div>
                ) : <p className="text-sm text-gray-400">Aucun abonnement</p>}
              </div>

              {hotelUsers && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Utilisateurs</p>
                  <div className="flex flex-col gap-1.5">
                    {(hotelUsers as any[]).map((u) => (
                      <div key={u.id} className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium">{u.first_name} {u.last_name}</span>
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{u.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
