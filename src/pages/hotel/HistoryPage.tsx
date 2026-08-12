import { useRef, useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, ChevronRight, Trash2, LogOut, Download, Mail } from 'lucide-react';
import { getFlagUrl } from '@/lib/flags';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DateRangeCalendar } from '@/components/ui/DateRangeCalendar';
import { checkInsApi } from '@/api/checkIns';
import { type CheckIn } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const dateLocaleFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-FR');

// ─── Swipe-to-delete row (admin only) ──────────────────────────────────────────

const REVEAL_WIDTH = 76;

const SwipeableRow = ({ children, onDelete, deleting, label }: { children: ReactNode; onDelete: () => void; deleting: boolean; label: string }) => {
  const [dragX, setDragX] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const dragging = useRef(false);
  const moved = useRef(false);
  const startX = useRef(0);
  const baseX = useRef(0);

  // Le glissement est un raccourci TACTILE. Il répondait aussi à la souris, ce
  // qui faisait partir la ligne de travers au moindre cliquer-glisser sur
  // poste — et restait la seule façon d'atteindre la suppression, donc
  // invisible pour qui ne devine pas le geste. Le bouton visible de la ligne
  // est désormais le chemin principal ; ceci n'est plus qu'un accélérateur.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
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
        type="button"
        onClick={onDelete}
        disabled={deleting}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-y-0 end-0 flex items-center justify-center bg-qayed-erreur px-2 text-xs font-semibold text-white disabled:opacity-60"
        style={{ width: REVEAL_WIDTH }}
      >
        {/* Un libellé, pas une corbeille : la ligne porte déjà une icône
            corbeille visible, et le glissement en révélait une seconde. */}
        {label}
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
const fmtDate = (iso: string, locale: string): string => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

// "3 juil. → 17 juil. 2026" or "3 → 17 juil. 2026" when same month/year
const fmtRange = (from: string, to: string, locale: string): string => {
  const f = from.slice(0, 10).split('-').map(Number);
  const t = to.slice(0, 10).split('-').map(Number);
  const dFrom = new Date(f[0], f[1] - 1, f[2]);
  const dTo   = new Date(t[0], t[1] - 1, t[2]);
  const sameYear  = f[0] === t[0];
  const sameMonth = sameYear && f[1] === t[1];

  if (sameMonth) {
    return `${f[2]} → ${dTo.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  if (sameYear) {
    return `${dFrom.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} → ${dTo.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return `${fmtDate(from, locale)} → ${fmtDate(to, locale)}`;
};

// Ordre : Actif · Brouillon · Terminé · Tous (Actif par défaut à l'ouverture).
const STATUS_FILTERS = ['active', 'draft', 'completed', 'all'] as const;

// Left border + subtle bg per status
const STATUS_ROW_STYLE: Record<string, { border: string; dot: string }> = {
  active:    { border: 'var(--qayed-conforme)', dot: 'var(--qayed-conforme)' },
  draft:     { border: 'var(--qayed-cachet)', dot: 'var(--qayed-cachet)' },
  completed: { border: 'var(--qayed-gris-300)', dot: 'var(--qayed-gris-300)' },
  no_show:   { border: 'var(--qayed-vigilance)', dot: 'var(--qayed-vigilance)' },
  cancelled: { border: 'var(--qayed-gris-300)', dot: 'var(--qayed-gris-300)' },
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

// Raccourcis de plage pour l'export (dates locales, sans décalage UTC).
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const RANGE_PRESETS: { key: string; labelKey: string; range: () => [string, string] }[] = [
  { key: '7d', labelKey: 'hotelHistory.range7d', range: () => [ymd(new Date(Date.now() - 6 * 86_400_000)), ymd(new Date())] },
  { key: 'thisMonth', labelKey: 'hotelHistory.rangeThisMonth', range: () => {
    const n = new Date(); return [ymd(new Date(n.getFullYear(), n.getMonth(), 1)), ymd(n)];
  } },
  { key: 'lastMonth', labelKey: 'hotelHistory.rangeLastMonth', range: () => {
    const n = new Date();
    return [ymd(new Date(n.getFullYear(), n.getMonth() - 1, 1)), ymd(new Date(n.getFullYear(), n.getMonth(), 0))];
  } },
];

export const HistoryPage = () => {
  const { t, i18n } = useTranslation();
  const locale = dateLocaleFor(i18n.language);
  const navigate   = useNavigate();
  const qc         = useQueryClient();
  const { toast }  = useToast();
  const isAdmin    = useAuthStore((s) => s.user?.role === 'hotel_admin');
  const userEmail  = useAuthStore((s) => s.user?.email ?? '');
  const [searchParams] = useSearchParams();
  // Filtre initial : ?status=... (ex. lien « Brouillons non soumis » du dashboard),
  // sinon « Actif » par défaut.
  const qpStatus = searchParams.get('status') ?? '';
  const initialStatus = (STATUS_FILTERS as readonly string[]).includes(qpStatus) ? qpStatus : 'active';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>(initialStatus);
  const [page, setPage]     = useState(1);

  const STATUS_FILTER_LABELS: Record<string, string> = {
    all: t('common.all'), draft: t('checkinStatus.draft'), active: t('checkinStatus.active'), completed: t('checkinStatus.completed'),
  };
  const STATUS_LABELS: Record<string, string> = {
    active: t('checkinStatus.active'), draft: t('checkinStatus.draft'), completed: t('checkinStatus.completed'),
    no_show: t('checkinStatus.noShow'), cancelled: t('checkinStatus.cancelled'),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['check-ins', { search, status, page }],
    queryFn: () => checkInsApi.list({ search, status: status === 'all' ? '' : status, page }),
  });
  // Compteur de brouillons (renvoyé par l'API, indépendant du filtre actif).
  const draftCount = data?.meta.draft_count ?? 0;

  // Fiche en attente de confirmation de suppression (null = aucune).
  const [pendingDelete, setPendingDelete] = useState<CheckIn | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => checkInsApi.deleteCheckIn(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['check-ins'] });
      toast(t('hotelHistory.deleted'), 'success');
      setPendingDelete(null);
    },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  // Export des fiches de police (PDF par email) — manager uniquement.
  const todayStr   = new Date().toISOString().slice(0, 10);
  const monthAgo   = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const [showExport, setShowExport] = useState(false);
  const [exportFrom, setExportFrom] = useState(monthAgo);
  const [exportTo, setExportTo]     = useState(todayStr);
  const exportMut = useMutation({
    mutationFn: () => checkInsApi.exportPoliceFiches(exportFrom, exportTo),
    onSuccess: (d) => { toast(t('hotelHistory.exportQueued', { email: d.email }), 'success'); setShowExport(false); },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  return (
    <HotelLayout title={t('hotelHistory.title')}>
      <div className="flex flex-col gap-4 p-4">

        {/* Search */}
        <Input
          placeholder={t('hotelHistory.searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          leftIcon={<Search className="h-4 w-4" />}
        />

        {/* Status filter chips — badge ambre sur Brouillon (fiches non transmises) */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_FILTERS.map((s) => {
            const selected = status === s;
            const showDraftBadge = s === 'draft' && draftCount > 0;
            return (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all"
                style={
                  selected
                    ? { background: 'var(--qayed-cachet)', color: '#fff', boxShadow: '0 4px 14px rgba(83,70,168,0.25)' }
                    : { background: '#fff', color: 'var(--qayed-fiche)', border: '1px solid var(--qayed-gris-200)' }
                }
              >
                {STATUS_FILTER_LABELS[s]}
                {showDraftBadge && (
                  <span
                    className="inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-xs font-bold leading-none tabular-nums"
                    style={{ background: 'var(--qayed-vigilance)', color: '#fff', height: '1.125rem' }}
                  >
                    {draftCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Export fiches de police (PDF par email) — manager uniquement */}
        {isAdmin && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <button
              onClick={() => setShowExport((s) => !s)}
              className="flex w-full items-center gap-3 px-4 py-3 text-start"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--qayed-cachet-dilue)', color: 'var(--qayed-cachet)' }}>
                <Download className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900">{t('hotelHistory.exportTitle')}</span>
                <span className="block text-xs leading-snug text-gray-400">{t('hotelHistory.exportHelp')}</span>
              </span>
              <ChevronRight className={`h-4 w-4 shrink-0 text-gray-300 transition-transform ${showExport ? 'rotate-90' : ''}`} />
            </button>

            {showExport && (
              <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3.5">
                {/* Raccourcis de plage */}
                <div className="flex flex-wrap gap-2">
                  {RANGE_PRESETS.map((p) => {
                    const [f, tt] = p.range();
                    const active = exportFrom === f && exportTo === tt;
                    return (
                      <button key={p.key} onClick={() => { setExportFrom(f); setExportTo(tt); }}
                        className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                        style={active ? { background: 'var(--qayed-cachet)', color: '#fff' } : { background: 'var(--qayed-gris-100)', color: 'var(--qayed-fiche)' }}>
                        {t(p.labelKey)}
                      </button>
                    );
                  })}
                </div>
                {/* Sélecteur de période : clic début → clic fin (sans OK) */}
                <div className="flex justify-center rounded-xl border border-gray-100 bg-gray-50 py-2">
                  <DateRangeCalendar
                    from={exportFrom}
                    to={exportTo}
                    max={todayStr}
                    locale={i18n.language}
                    onChange={(f, tt) => { setExportFrom(f); setExportTo(tt); }}
                  />
                </div>

                {/* Rappel du destinataire — le PDF part par e-mail à cette adresse. */}
                {userEmail && (
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--qayed-cachet-dilue)', color: 'var(--qayed-cachet)' }}>
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate">{t('hotelHistory.exportSentTo', { email: userEmail })}</span>
                  </div>
                )}

                {/* Récap + bouton */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">
                    {exportFrom && exportTo
                      ? <>{new Date(exportFrom + 'T00:00').toLocaleDateString(locale, { day: '2-digit', month: 'short' })} — {new Date(exportTo + 'T00:00').toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}</>
                      : t('hotelHistory.exportPickEnd')}
                  </span>
                  <Button size="sm" loading={exportMut.isPending} disabled={!exportFrom || !exportTo} onClick={() => exportMut.mutate()}>
                    <Download className="h-4 w-4" /> {t('hotelHistory.exportButton')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* List */}
        <div className="flex flex-col gap-2">
          {isLoading && [1,2,3,4,5].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-gray-100" />
          ))}

          {!isLoading && data?.data.map((ci) => {
            const style = STATUS_ROW_STYLE[ci.status] ?? { border: 'var(--qayed-gris-300)', dot: 'var(--qayed-gris-300)' };
            const checkoutDue = isCheckoutDue(ci.status, ci.expected_check_out_date);
            const guestName = ci.primary_guest
              ? `${ci.primary_guest.first_name} ${ci.primary_guest.last_name}`
              : t('hotelHistory.noGuest');
            const initials = ci.primary_guest
              ? `${ci.primary_guest.first_name?.[0] ?? ''}${ci.primary_guest.last_name?.[0] ?? ''}`.toUpperCase()
              : '?';
            const flagUrl = getFlagUrl((ci.primary_guest as any)?.nationality_code);

            const row = (
              <div
                className="flex items-center rounded-card shadow-card overflow-hidden"
                style={{
                  borderLeft: `4px solid ${checkoutDue ? 'var(--qayed-vigilance)' : style.border}`,
                  background: checkoutDue ? 'var(--qayed-vigilance-fond)' : '#fff',
                }}
              >
                <button
                  onClick={() => navigate(`/hotel/history/${ci.id}`)}
                  className="flex flex-1 items-center gap-3 p-3.5 text-start hover:bg-warm-100 transition-colors min-w-0"
                >
                  {/* Avatar + flag */}
                  <div className="relative shrink-0">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'var(--qayed-cachet-dilue)', color: 'var(--qayed-cachet)' }}
                    >
                      {initials}
                    </div>
                    {flagUrl && (
                      <img
                        src={flagUrl}
                        alt={(ci.primary_guest as any)?.nationality_code ?? ''}
                        width={15}
                        className="absolute -bottom-1 -end-1 rounded-sm shadow-sm"
                        style={{ border: '1px solid rgba(0,0,0,0.1)' }}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="text-sm font-semibold text-gray-900 truncate">{guestName}</span>
                    <span className="text-xs text-gray-500 truncate">
                      {ci.room ? ci.room.number : t('hotelHistory.noUnit')} · <span className="font-mono">{ci.reference}</span>
                      {ci.document_expired && (
                        <span className="ms-1.5 rounded-full px-1.5 py-0.5 text-xs font-bold align-middle" style={{ background: 'var(--qayed-vigilance-fond)', color: 'var(--qayed-vigilance-texte)' }}>
                          {t('hotelHistory.docExpired')}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400">
                      {fmtRange(ci.check_in_date, ci.expected_check_out_date, locale)}
                    </span>
                  </div>
                  {/* Status dot + label + chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    {checkoutDue ? (
                      <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: 'var(--qayed-vigilance-fond)', color: 'var(--qayed-vigilance-texte)' }}>
                        <LogOut className="h-3 w-3" /> {t('hotelHistory.departureNotConfirmed')}
                      </span>
                    ) : (
                      <span
                        className="text-xs font-bold"
                        style={{ color: style.dot }}
                      >
                        {STATUS_LABELS[ci.status] ?? ci.status}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                </button>

                {/* Suppression — visible sur tous les écrans. Elle n'était
                    atteignable que par glissement, donc inaccessible à la
                    souris, au clavier et à toute personne ne devinant pas le
                    geste. Frère du bouton de navigation, jamais imbriqué. */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(ci)}
                    aria-label={t('hotelHistory.deleteAria', { reference: ci.reference })}
                    title={t('common.delete')}
                    className="flex h-11 w-11 shrink-0 items-center justify-center self-center me-1.5 rounded-btn text-qayed-fiche-faible transition-colors hover:bg-qayed-erreur-fond hover:text-qayed-erreur-texte"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            );

            // Admin only — swipe left to reveal delete. Receptionists get the plain row.
            return isAdmin ? (
              <SwipeableRow
                key={ci.id}
                deleting={deleteMutation.isPending && deleteMutation.variables === ci.id}
                onDelete={() => setPendingDelete(ci)}
                label={t('common.delete')}
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
              <p className="text-sm font-medium text-gray-400">{t('common.noResults')}</p>
              <p className="text-xs text-gray-300">{t('hotelHistory.tryOtherFilter')}</p>
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
              ← {t('common.previous')}
            </button>
            <span className="text-xs text-gray-500 font-medium">
              {data.meta.current_page} / {Math.ceil(data.meta.total / data.meta.per_page)}
            </span>
            <button
              disabled={page >= Math.ceil(data.meta.total / data.meta.per_page)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:bg-warm-100 transition-colors"
            >
              {t('common.next')} →
            </button>
          </div>
        )}
      </div>

      {/* Confirmation de suppression — la fiche partait au premier clic.
          Le séjour n'est qu'archivé côté serveur, mais ses liens voyageurs
          sont supprimés pour de bon : le restaurer ne rendrait pas la
          composition de la fiche. Cela mérite une question. */}
      <Modal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title={t('hotelHistory.deleteTitle')}
        size="sm"
      >
        <p className="text-sm text-qayed-gris-700">
          {t('hotelHistory.deleteBody', {
            reference: pendingDelete?.reference ?? '',
            guest: pendingDelete?.primary_guest
              ? `${pendingDelete.primary_guest.first_name} ${pendingDelete.primary_guest.last_name}`.trim()
              : t('hotelHistory.noGuestYet'),
          })}
        </p>
        <p className="mt-2 text-xs text-qayed-fiche">{t('hotelHistory.deleteHint')}</p>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setPendingDelete(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            fullWidth
            loading={deleteMutation.isPending}
            onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </HotelLayout>
  );
};
