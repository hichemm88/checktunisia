import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LogOut, CheckCircle, FileText, MapPin, CalendarDays, Printer } from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { checkInsApi } from '@/api/checkIns';
import { settingsApi } from '@/api/settings';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { PoliceFiche } from '@/components/PoliceFiche';

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="flex justify-between items-start py-3 border-b border-gray-50 last:border-0">
    <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
    <span className="text-sm font-semibold text-gray-900 text-right max-w-[55%]">{value ?? '—'}</span>
  </div>
);

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-TN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const SEX_LABELS: Record<string, string> = { M: 'Masculin', F: 'Féminin', X: 'Autre' };

export const HistoryDetailPage = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const { toast } = useToast();

  const { data: ci, isLoading } = useQuery({
    queryKey: ['check-in', id],
    queryFn: () => checkInsApi.get(id!),
    enabled: !!id,
  });

  const { data: hotel } = useQuery({
    queryKey: ['hotel-profile'],
    queryFn: () => settingsApi.getHotelProfile(),
  });

  const completeMutation = useMutation({
    mutationFn: () => checkInsApi.complete(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['check-in', id] }); toast('Check-in complété', 'success'); },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => checkInsApi.checkout(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['check-in', id] }); toast('Check-out enregistré', 'success'); },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  if (isLoading) return (
    <HotelLayout title="Détail">
      <div className="p-4 flex flex-col gap-4">
        {[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-card bg-gray-100" />)}
      </div>
    </HotelLayout>
  );

  if (!ci) return null;

  const pg = ci.primary_guest
    ?? ci.guests?.find(g => g.is_primary)
    ?? ci.guests?.[0];

  const guestName = pg ? `${pg.first_name} ${pg.last_name}` : 'Sans voyageur';
  const initials  = pg
    ? `${pg.first_name?.[0] ?? ''}${pg.last_name?.[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <HotelLayout title="Détail check-in">
      <div className="flex flex-col">

        {/* ── Hero ── */}
        <div
          className="px-4 pt-4 pb-6 flex flex-col"
          style={{ background: 'linear-gradient(135deg, #1B3A5F 0%, #2A5090 100%)' }}
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-blue-300 mb-4 self-start hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="h-16 w-16 shrink-0 rounded-2xl flex items-center justify-center text-xl font-black"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(4px)' }}
            >
              {initials}
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-black text-white leading-tight">{guestName}</h2>
              <p className="text-xs font-mono text-blue-300">{ci.reference}</p>
              <Badge variant={ci.status as any} />
            </div>
          </div>

          {/* Quick stats row */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: MapPin,       label: 'Chambre',  val: ci.room?.number ?? '—' },
              { icon: CalendarDays, label: 'Arrivée',  val: fmtDate(ci.check_in_date).split(' ').slice(0,2).join(' ') },
              { icon: CalendarDays, label: 'Départ',   val: fmtDate(ci.expected_check_out_date).split(' ').slice(0,2).join(' ') },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="flex flex-col gap-1 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="flex items-center gap-1">
                  <Icon className="h-3 w-3 text-blue-300" />
                  <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-widest">{label}</span>
                </div>
                <span className="text-sm font-bold text-white">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="p-4 flex flex-col gap-4 -mt-3">

          {/* Booking details */}
          <Card>
            <p className="label mb-3">Réservation</p>
            <DetailRow label="Adultes"      value={ci.adults_count} />
            <DetailRow label="Enfants"      value={ci.children_count} />
            <DetailRow label="Départ réel"  value={fmtDate(ci.actual_check_out_date)} />
            {ci.booking_reference && <DetailRow label="Réf. réservation" value={ci.booking_reference} />}
            {ci.booking_source    && <DetailRow label="Source" value={ci.booking_source} />}
            {ci.created_by && (
              <DetailRow label="Enregistré par" value={`${ci.created_by.first_name} ${ci.created_by.last_name}`} />
            )}
            {ci.notes && <DetailRow label="Notes" value={ci.notes} />}
          </Card>

          {/* Guests */}
          <div className="flex flex-col gap-3">
            <p className="label">Voyageurs · {ci.guests?.length ?? 0}</p>
            {ci.guests?.map((g) => {
              const gInitials = `${g.first_name?.[0] ?? ''}${g.last_name?.[0] ?? ''}`.toUpperCase();
              return (
                <Card key={g.id} className="flex items-start gap-3">
                  <div
                    className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold"
                    style={{ background: g.is_primary ? '#1B3A5F' : '#E8EEFB', color: g.is_primary ? '#fff' : '#1B3A5F' }}
                  >
                    {gInitials}
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">{g.first_name} {g.last_name}</span>
                      {g.is_primary && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                          style={{ background: '#E8EEFB', color: '#1B3A5F' }}
                        >
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {fmtDate(g.date_of_birth)} · {SEX_LABELS[g.sex] ?? g.sex} · {g.nationality_code}
                    </p>
                    {g.document && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <FileText className="h-3 w-3 text-gray-300" />
                        <p className="text-xs text-gray-400">
                          {g.document.type} {g.document.document_number}
                          {g.document.expiry_date && ` · expire ${fmtDate(g.document.expiry_date)}`}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
            {!ci.guests?.length && <p className="text-sm text-gray-400">Aucun voyageur enregistré</p>}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {ci.status === 'draft' && (
              <Button fullWidth size="lg" onClick={() => completeMutation.mutate()} loading={completeMutation.isPending}>
                <CheckCircle className="h-5 w-5" /> Finaliser le check-in
              </Button>
            )}
            {ci.status === 'active' && (
              <Button variant="secondary" fullWidth size="lg" onClick={() => checkoutMutation.mutate()} loading={checkoutMutation.isPending}>
                <LogOut className="h-5 w-5" /> Enregistrer le check-out
              </Button>
            )}
            {hotel && (
              <Button
                variant="secondary"
                fullWidth
                size="lg"
                onClick={() => window.print()}
                className="gap-2"
              >
                <Printer className="h-5 w-5" /> Imprimer fiche de police
              </Button>
            )}
          </div>

        </div>
      </div>

      {/* Print-only police fiche — invisible on screen, shown when window.print() is called */}
      {hotel && <PoliceFiche checkIn={ci} hotel={hotel} />}

    </HotelLayout>
  );
};
