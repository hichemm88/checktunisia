import { useRef, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Trash2, LogOut } from 'lucide-react';
import { getFlagUrl } from '@/lib/flags';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Input } from '@/components/ui/Input';
import { checkInsApi } from '@/api/checkIns';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

// ─── Swipe-to-delete row (admin only) ──────────────────────────────────────────

const REVEAL_WIDTH = 76;

const SwipeableRow = ({ children, onDelete, deleting }: { children: ReactNode; onDelete: () => void; deleting: boolean }) => {
  const [dragX, setDragX] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const dragging = useRef(false);
  const moved = useRef(false);
  const startX = useRef(0);
  const baseX = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    moved.current = false;
    startX.current = e.clientX;
    baseX.current = dragX;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 4) moved.current = true;
    setDragX(Math.min(0, Math.max(-REVEAL_WIDTH, baseX.current + delta)));
  };
  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragX < -REVEAL_WIDTH / 2) { setDragX(-REVEAL_WIDTH); setRevealed(true); }
    else { setDragX(0); setRevealed(false); }
  };
  // While revealed (or right after a drag), swallow the click instead of letting it
  // reach the row's own navigation button — first tap just closes the reveal.
  const onClickCapture = (e: React.MouseEvent) => {
    if (moved.current || revealed) {
      e.stopPropagation();
      e.preventDefault();
      moved.current = false;
      if (revealed) { setDragX(0); setRevealed(false); }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-card">
      <button
        onClick={onDelete}
        disabled={deleting}
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 text-white disabled:opacity-60"
        style={{ width: REVEAL_WIDTH }}
      >
        <Trash2 className="h-5 w-5" />
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging.current ? 'none' : 'transform 0.2s ease',
          touchAction: 'pan-y',
        }}
        className="relative bg-white"
      >
        {children}
      </div>
    </div>
  );
};

// Parse only the date part (YYYY-MM-DD) to avoid UTC/local timezone shifts
const fmtDate = (iso: string): string => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

// "3 juil. → 17 juil. 2026" or "3 → 17 juil. 2026" when same month/year
const fmtRange = (from: string, to: string): string => {
  const f = from.slice(0, 10).split('-').map(Number);
  const t = to.slice(0, 10).split('-').map(Number);
  const dFrom = new Date(f[0], f[1] - 1, f[2]);
  const dTo   = new Date(t[0], t[1] - 1, t[2]);
  const sameYear  = f[0] === t[0];
  const sameMonth = sameYear && f[1] === t[1];

  if (sameMonth) {
    return `${f[2]} → ${dTo.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  if (sameYear) {
    return `${dFrom.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → ${dTo.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return `${fmtDate(from)} → ${fmtDate(to)}`;
};

const STATUS_FILTERS = ['all', 'draft', 'active', 'completed'] as const;

const STATUS_FILTER_LABELS: Record<string, string> = {
  all: 'Tous', draft: 'Brouillon', active: 'Actif', completed: 'Terminé',
};

// Left border + subtle bg per status
const STATUS_ROW_STYLE: Record<string, { border: string; dot: string }> = {
  active:    { border: '#1F9D6B', dot: '#1F9D6B' },
  draft:     { border: '#5346A8', dot: '#5346A8' },
  completed: { border: '#d1d5db', dot: '#d1d5db' },
  no_show:   { border: '#E3A008', dot: '#E3A008' },
  cancelled: { border: '#d1d5db', dot: '#d1d5db' },
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif', draft: 'Brouillon', completed: 'Terminé',
  no_show: 'No-show', cancelled: 'Annulé',
};

// A stay whose expected checkout date has arrived (or passed) while still active —
// highlighted so receptionists don't forget to check the guest out.
const isCheckoutDue = (status: string, expectedCheckOut: string) => {
  if (status !== 'active') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkout = new Date(expectedCheckOut);
  checkout.setHours(0, 0, 0, 0);
  return checkout <= today;
};

export const HistoryPage = () => {
  const navigate   = useNavigate();
  const qc         = useQueryClient();
  const { toast }  = useToast();
  const isAdmin    = useAuthStore((s) => s.user?.role === 'hotel_admin');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage]     = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['check-ins', { search, status, page }],
    queryFn: () => checkInsApi.list({ search, status: status === 'all' ? '' : status, page }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => checkInsApi.deleteCheckIn(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['check-ins'] });
      toast('Check-in supprimé', 'success');
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
                  ? { background: '#5346A8', color: '#fff', boxShadow: '0 4px 14px rgba(83,70,168,0.25)' }
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
            const checkoutDue = isCheckoutDue(ci.status, ci.expected_check_out_date);
            const guestName = ci.primary_guest
              ? `${ci.primary_guest.first_name} ${ci.primary_guest.last_name}`
              : 'Sans voyageur';
            const initials = ci.primary_guest
              ? `${ci.primary_guest.first_name?.[0] ?? ''}${ci.primary_guest.last_name?.[0] ?? ''}`.toUpperCase()
              : '?';
            const flagUrl = getFlagUrl((ci.primary_guest as any)?.nationality_code);

            const row = (
              <div
                className="flex items-center rounded-card shadow-card overflow-hidden"
                style={{
                  borderLeft: `4px solid ${checkoutDue ? '#E3A008' : style.border}`,
                  background: checkoutDue ? '#FBF0D7' : '#fff',
                }}
              >
                <button
                  onClick={() => navigate(`/hotel/history/${ci.id}`)}
                  className="flex flex-1 items-center gap-3 p-3.5 text-left hover:bg-warm-100 transition-colors min-w-0"
                >
                  {/* Avatar + flag */}
                  <div className="relative shrink-0">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: '#EEEBFA', color: '#5346A8' }}
                    >
                      {initials}
                    </div>
                    {flagUrl && (
                      <img
                        src={flagUrl}
                        alt={(ci.primary_guest as any)?.nationality_code ?? ''}
                        width={15}
                        className="absolute -bottom-1 -right-1 rounded-sm shadow-sm"
                        style={{ border: '1px solid rgba(0,0,0,0.1)' }}
                      />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="text-sm font-semibold text-gray-900 truncate">{guestName}</span>
                    <span className="text-xs text-gray-500 truncate">
                      {ci.room ? ci.room.number : 'Sans unité'} · {ci.reference}
                    </span>
                    <span className="text-xs text-gray-400">
                      {fmtRange(ci.check_in_date, ci.expected_check_out_date)}
                    </span>
                  </div>
                  {/* Status dot + label + chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    {checkoutDue ? (
                      <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: '#FBF0D7', color: '#8A6206' }}>
                        <LogOut className="h-3 w-3" /> Départ
                      </span>
                    ) : (
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: style.dot }}
                      >
                        {STATUS_LABELS[ci.status] ?? ci.status}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                </button>
              </div>
            );

            // Admin only — swipe left to reveal delete. Receptionists get the plain row.
            return isAdmin ? (
              <SwipeableRow
                key={ci.id}
                deleting={deleteMutation.isPending && deleteMutation.variables === ci.id}
                onDelete={() => deleteMutation.mutate(ci.id)}
              >
                {row}
              </SwipeableRow>
            ) : (
              <div key={ci.id}>{row}</div>
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
