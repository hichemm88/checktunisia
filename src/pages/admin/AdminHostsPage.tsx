import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Search, CheckCircle2, XCircle, Plus, X, ChevronLeft, ChevronRight, Trash2,
} from 'lucide-react';
import { adminHostsApi, AdminHost } from '@/api/admin/hosts';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';

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

// ─── Main page ──────────────────────────────────────────────────────────────────

export const AdminHostsPage = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
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

  const suspendMut = useMutation({
    mutationFn: () => adminHostsApi.suspend(selected!.id, suspendReason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-hosts'] }); setShowSuspend(false); setSuspendReason(''); toast('Hébergeur suspendu', 'success'); },
  });
  const activateMut = useMutation({
    mutationFn: () => adminHostsApi.activate(selected!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-hosts'] }); toast('Hébergeur réactivé', 'success'); },
  });
  const deleteMut = useMutation({
    mutationFn: () => adminHostsApi.remove(selected!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-hosts'] }); setSelected(null); setConfirmDelete(false); toast('Hébergeur supprimé', 'success'); },
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

          {isLoading && <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>}

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

          {meta && meta.total > meta.per_page && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{meta.total} hébergeurs</span>
              <div className="flex gap-2 items-center">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span>Page {meta.current_page}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={hosts.length < meta.per_page} className="p-1 rounded hover:bg-gray-200 disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
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
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Abonnement</p>
                    {detail.active_subscription ? (
                      <div className="rounded-xl p-3 text-sm" style={{ background: '#F5F4EF' }}>
                        <p className="font-semibold">{detail.active_subscription.plan?.name}</p>
                        <p className="text-xs text-gray-400">Expire le {fmtDate(detail.active_subscription.expires_at)}</p>
                      </div>
                    ) : <p className="text-sm text-gray-400">Aucun abonnement</p>}
                  </div>

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
