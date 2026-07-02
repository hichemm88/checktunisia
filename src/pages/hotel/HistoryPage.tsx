import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Trash2 } from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { checkInsApi } from '@/api/checkIns';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';

const STATUS_FILTERS = ['all', 'draft', 'active', 'completed'] as const;

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
        <Input
          placeholder="Chercher par nom, référence, chambre..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          leftIcon={<Search className="h-4 w-4" />}
        />

        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                status === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'Tous' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex flex-col gap-2">
          {isLoading && [1,2,3,4,5].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-gray-100" />
          ))}

          {!isLoading && data?.data.map((ci) => (
            <div
              key={ci.id}
              className="flex items-center rounded-card bg-white shadow-card overflow-hidden"
            >
              {/* Main row — clickable to detail */}
              <button
                onClick={() => navigate(`/hotel/history/${ci.id}`)}
                className="flex flex-1 items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors min-w-0"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    {ci.primary_guest
                      ? `${ci.primary_guest.first_name} ${ci.primary_guest.last_name}`
                      : 'Sans voyageur'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {ci.room ? `Ch. ${ci.room.number}` : 'Sans chambre'} · {ci.reference}
                  </span>
                  <span className="text-xs text-gray-400">{ci.check_in_date}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Badge variant={ci.status as any}>{ci.status}</Badge>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </button>

              {/* Delete action — drafts only */}
              {ci.status === 'draft' && (
                <div className="flex items-center border-l border-gray-100 px-3 shrink-0">
                  {confirmId === ci.id ? (
                    <div className="flex flex-col items-center gap-1 py-1">
                      <button
                        onClick={() => deleteMutation.mutate(ci.id)}
                        disabled={deleteMutation.isPending}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 whitespace-nowrap"
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
                      className="rounded-lg p-2 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Supprimer le brouillon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {!isLoading && !data?.data.length && (
            <p className="py-12 text-center text-sm text-gray-400">Aucun résultat</p>
          )}
        </div>

        {/* Pagination */}
        {data && data.meta.total > data.meta.per_page && (
          <div className="flex justify-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs disabled:opacity-40"
            >
              ←
            </button>
            <span className="flex items-center text-xs text-gray-500">
              Page {data.meta.current_page} / {Math.ceil(data.meta.total / data.meta.per_page)}
            </span>
            <button
              disabled={page >= Math.ceil(data.meta.total / data.meta.per_page)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs disabled:opacity-40"
            >
              →
            </button>
          </div>
        )}
      </div>
    </HotelLayout>
  );
};
