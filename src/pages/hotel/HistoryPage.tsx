import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Trash2 } from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Input } from '@/components/ui/Input';
import { checkInsApi } from '@/api/checkIns';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';

const STATUS_FILTERS = ['all', 'draft', 'active', 'completed'] as const;

const STATUS_FILTER_LABELS: Record<string, string> = {
  all: 'Tous', draft: 'Brouillon', active: 'Actif', completed: 'Terminé',
};

// Left border + subtle bg per status
const STATUS_ROW_STYLE: Record<string, { border: string; dot: string }> = {
  active:    { border: '#22c55e', dot: '#22c55e' },
  draft:     { border: '#3b82f6', dot: '#3b82f6' },
  completed: { border: '#d1d5db', dot: '#d1d5db' },
  no_show:   { border: '#f97316', dot: '#f97316' },
  cancelled: { border: '#d1d5db', dot: '#d1d5db' },
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif', draft: 'Brouillon', completed: 'Terminé',
  no_show: 'No-show', cancelled: 'Annulé',
};

export const HistoryPage = () => {
  const navigate   = useNavigate();
  const qc         = useQueryClient();
  const { toast }  = useToast();
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState<string>('all');
  const [page, setPage]           = useState(1);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['check-ins', { search, status, page }],
    queryFn: () => checkInsApi.list({ search, status: status === 'all' ? '' : status, page }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => checkInsApi.deleteDraft(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['check-ins'] });
      setConfirmId(null);
      toast('Brouillon supprimé', 'success');
    },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  return (
    <HotelLayout title="Historique">
      <div className="flex flex-col gap-4 p-4">

        {/* Search */}
        <Input
          placeholder="Nom, référence, chambre…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          leftIcon={<Search className="h-4 w-4" />}
        />

        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className="whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all"
              style={
                status === s
                  ? { background: '#1B3A5F', color: '#fff', boxShadow: '0 4px 14px rgba(27,54,84,0.3)' }
                  : { background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB' }
              }
            >
              {STATUS_FILTER_LABELS[s]}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex flex-col gap-2">
          {isLoading && [1,2,3,4,5].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-gray-100" />
          ))}

          {!isLoading && data?.data.map((ci) => {
            const style = STATUS_ROW_STYLE[ci.status] ?? { border: '#d1d5db', dot: '#d1d5db' };
            const guestName = ci.primary_guest
              ? `${ci.primary_guest.first_name} ${ci.primary_guest.last_name}`
              : 'Sans voyageur';
            const initials = ci.primary_guest
              ? `${ci.primary_guest.first_name?.[0] ?? ''}${ci.primary_guest.last_name?.[0] ?? ''}`.toUpperCase()
              : '?';

            return (
              <div
                key={ci.id}
                className="flex items-center bg-white rounded-card shadow-card overflow-hidden"
                style={{ borderLeft: `4px solid ${style.border}` }}
              >
                {/* Main row */}
                <button
                  onClick={() => navigate(`/hotel/history/${ci.id}`)}
                  className="flex flex-1 items-center gap-3 p-3.5 text-left hover:bg-warm-100 transition-colors min-w-0"
                >
                  {/* Avatar */}
                  <div
                    className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: '#E8EEFB', color: '#1B3A5F' }}
                  >
                    {initials}
                  </div>
                  {/* Info */}
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="text-sm font-semibold text-gray-900 truncate">{guestName}</span>
                    <span className="text-xs text-gray-500 truncate">
                      {ci.room ? `Ch. ${ci.room.number}` : 'Sans chambre'} · {ci.reference}
                    </span>
                    <span className="text-xs text-gray-400">{ci.check_in_date}</span>
                  </div>
                  {/* Status dot + label + chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: style.dot }}
                    >
                      {STATUS_LABELS[ci.status] ?? ci.status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                </button>

                {/* Delete — drafts only */}
                {ci.status === 'draft' && (
                  <div className="flex items-center border-l border-gray-100 px-3 shrink-0">
                    {confirmId === ci.id ? (
                      <div className="flex flex-col items-center gap-1 py-1">
                        <button
                          onClick={() => deleteMutation.mutate(ci.id)}
                          disabled={deleteMutation.isPending}
                          className="text-xs font-bold text-red-600 hover:text-red-700 whitespace-nowrap"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmId(ci.id); }}
                        className="rounded-xl p-2.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!isLoading && !data?.data.length && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Search className="h-8 w-8 text-gray-200" />
              <p className="text-sm font-medium text-gray-400">Aucun résultat</p>
              <p className="text-xs text-gray-300">Essayez un autre filtre ou une autre recherche</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.meta.total > data.meta.per_page && (
          <div className="flex justify-center items-center gap-3">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:bg-warm-100 transition-colors"
            >
              ← Préc.
            </button>
            <span className="text-xs text-gray-500 font-medium">
              {data.meta.current_page} / {Math.ceil(data.meta.total / data.meta.per_page)}
            </span>
            <button
              disabled={page >= Math.ceil(data.meta.total / data.meta.per_page)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:bg-warm-100 transition-colors"
            >
              Suiv. →
            </button>
          </div>
        )}
      </div>
    </HotelLayout>
  );
};
