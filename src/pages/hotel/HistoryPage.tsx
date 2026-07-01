import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { checkInsApi } from '@/api/checkIns';

const STATUS_FILTERS = ['all', 'draft', 'active', 'completed'] as const;

export const HistoryPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['check-ins', { search, status, page }],
    queryFn: () => checkInsApi.list({ search, status: status === 'all' ? '' : status, page }),
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
            <button
              key={ci.id}
              onClick={() => navigate(`/hotel/history/${ci.id}`)}
              className="flex items-center justify-between rounded-card bg-white p-4 shadow-card hover:shadow-card-hover transition-shadow text-left"
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
