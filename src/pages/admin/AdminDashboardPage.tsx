import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, ShieldCheck, TrendingUp, Search,
  CheckCircle2, XCircle, Clock, LogOut, RefreshCw, ChevronLeft, ChevronRight, Users,
} from 'lucide-react';
import { adminApi, AdminHotel } from '@/api/admin';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const STATUS: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active:    { label: 'Actif',      color: '#22c55e', icon: CheckCircle2 },
  suspended: { label: 'Suspendu',   color: '#ef4444', icon: XCircle },
  pending:   { label: 'En attente', color: '#f59e0b', icon: Clock },
  closed:    { label: 'Fermé',      color: '#9ca3af', icon: XCircle },
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const AdminDashboardPage = () => {
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab]     = useState<'dashboard' | 'hotels'>('dashboard');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage]   = useState(1);
  const [selected, setSelected] = useState<AdminHotel | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspend, setShowSuspend] = useState(false);

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.dashboard });
  const { data: hotelsRes, isLoading } = useQuery({
    queryKey: ['admin-hotels', search, filter, page],
    queryFn:  () => adminApi.hotels({ search: search || undefined, status: filter || undefined, page, per_page: 15 }),
  });
  const { data: hotelUsers } = useQuery({
    queryKey: ['admin-hotel-users', selected?.id],
    queryFn:  () => adminApi.getUsers(selected!.id),
    enabled:  !!selected,
  });

  const suspendMut = useMutation({
    mutationFn: () => adminApi.suspend(selected!.id, suspendReason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-hotels'] }); setShowSuspend(false); setSuspendReason(''); },
  });
  const activateMut = useMutation({
    mutationFn: () => adminApi.activate(selected!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-hotels'] }),
  });

  const hotels = hotelsRes?.data ?? [];
  const meta   = hotelsRes?.meta;

  const Stat = ({ icon: Icon, label, value, color }: { icon: typeof Building2; label: string; value: number; color: string }) => (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}18` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-extrabold text-gray-900">{value ?? '—'}</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#F5F4EF' }}>
      {/* Topbar */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 h-16 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: '#1B3A5F' }}>
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">Qayed <span className="text-xs font-normal text-gray-400">Admin</span></span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:block">{user?.first_name} {user?.last_name}</span>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: '#E0DDD7' }}>
          {([['dashboard', 'Tableau de bord', TrendingUp], ['hotels', 'Établissements', Building2]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── Dashboard ── */}
        {tab === 'dashboard' && stats && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat icon={Building2}    label="Établissements" value={stats.hotels.total}     color="#1B3A5F" />
              <Stat icon={CheckCircle2} label="Actifs"         value={stats.hotels.active}    color="#22c55e" />
              <Stat icon={XCircle}      label="Suspendus"      value={stats.hotels.suspended} color="#ef4444" />
              <Stat icon={Clock}        label="En attente"     value={stats.hotels.pending}   color="#f59e0b" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Stat icon={TrendingUp} label="Check-ins aujourd'hui" value={stats.check_ins.today}      color="#8b5cf6" />
              <Stat icon={Users}      label="Check-ins ce mois"     value={stats.check_ins.this_month} color="#0ea5e9" />
            </div>
          </div>
        )}

        {/* ── Hôtels ── */}
        {tab === 'hotels' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List */}
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

              {isLoading && <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>}

              <div className="flex flex-col gap-2">
                {hotels.map((h) => {
                  const s = STATUS[h.status] ?? STATUS.pending;
                  return (
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
              </div>

              {meta && meta.total > meta.per_page && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{meta.total} établissements</span>
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-40">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span>Page {meta.current_page}</span>
                    <button onClick={() => setPage((p) => p + 1)} disabled={hotels.length < meta.per_page} className="p-1 rounded hover:bg-gray-200 disabled:opacity-40">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Detail panel */}
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
                      <Button variant="danger" size="sm" onClick={() => setShowSuspend(true)} className="flex-1">
                        Suspendre
                      </Button>
                    ) : (
                      <Button size="sm" loading={activateMut.isPending} onClick={() => activateMut.mutate()} className="flex-1">
                        Réactiver
                      </Button>
                    )}
                    <Button variant="secondary" size="sm"
                      onClick={() => qc.invalidateQueries({ queryKey: ['admin-hotel-users', selected.id] })}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>

                  {showSuspend && (
                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-red-50">
                      <Input label="Motif" value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)} />
                      <div className="flex gap-2">
                        <Button variant="danger" size="sm" loading={suspendMut.isPending}
                          disabled={!suspendReason} onClick={() => suspendMut.mutate()} className="flex-1">
                          Confirmer
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowSuspend(false)}>Annuler</Button>
                      </div>
                    </div>
                  )}

                  {/* Subscription */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Abonnement</p>
                    {selected.subscription ? (
                      <div className="rounded-xl p-3 text-sm" style={{ background: '#F5F4EF' }}>
                        <p className="font-semibold">{selected.subscription.plan}</p>
                        <p className="text-xs text-gray-400">Expire le {fmtDate(selected.subscription.expires_at)}</p>
                        <span className={`text-xs font-medium ${selected.subscription.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                          ● {selected.subscription.status}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Aucun abonnement</p>
                    )}
                  </div>

                  {/* Users */}
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
        )}
      </div>
    </div>
  );
};
