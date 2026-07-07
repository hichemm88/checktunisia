import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LogOut, CheckCircle, FileText, MapPin, CalendarDays, Printer, UserPlus } from 'lucide-react';
import { getFlagUrl } from '@/lib/flags';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { checkInsApi } from '@/api/checkIns';
import { settingsApi } from '@/api/settings';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { PoliceFiche } from '@/components/PoliceFiche';
import { GuestScanPanel } from '@/components/hotel/GuestScanPanel';

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="flex justify-between items-start py-3 border-b border-gray-50 last:border-0">
    <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
    <span className="text-sm font-semibold text-gray-900 text-end max-w-[55%]">{value ?? '—'}</span>
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

  const todayISO = new Date().toISOString().split('T')[0];
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutDate, setCheckoutDate] = useState(todayISO);
  const [addingSlot, setAddingSlot] = useState<number | null>(null);

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
    mutationFn: (date: string) => checkInsApi.checkout(id!, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['check-in', id] });
      setShowCheckoutModal(false);
      toast('Check-out enregistré', 'success');
    },
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

  const canEdit    = ci.status === 'draft' || ci.status === 'active';
  const adultsN    = ci.adults_count ?? 1;
  const childrenN  = ci.children_count ?? 0;
  const totalSlots = adultsN + childrenN;
  const guestCount = ci.guests?.length ?? 0;
  const emptySlots = Array.from({ length: Math.max(0, totalSlots - guestCount) }, (_, i) => {
    const index      = guestCount + i;
    const isChild     = index >= adultsN;
    const isRequired  = !isChild;
    const labelBase   = isChild
      ? `Enfant ${index - adultsN + 1}`
      : index === 0 ? 'Adulte — voyageur principal' : `Adulte ${index + 1}`;
    return { index, isRequired, labelBase };
  });

  return (
    <>
    <HotelLayout title="Détail check-in">
      <div className="flex flex-col">

        {/* ── Hero ── */}
        <div
          className="px-4 pt-4 pb-6 flex flex-col"
          style={{ background: 'var(--qayed-cachet)' }}
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
            <p className="label">
              Voyageurs · {ci.guests?.length ?? 0}{canEdit ? `/${totalSlots}` : ''}
            </p>
            {ci.guests?.map((g) => {
              const gInitials = `${g.first_name?.[0] ?? ''}${g.last_name?.[0] ?? ''}`.toUpperCase();
              const gFlagUrl = getFlagUrl(g.nationality_code);
              return (
                <Card key={g.id} className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{ background: g.is_primary ? '#5346A8' : '#EEEBFA', color: g.is_primary ? '#fff' : '#5346A8' }}
                    >
                      {gInitials}
                    </div>
                    {gFlagUrl && (
                      <img
                        src={gFlagUrl}
                        alt={g.nationality_code}
                        width={16}
                        className="absolute -bottom-1 -end-1 rounded-sm shadow-sm"
                        style={{ border: '1px solid rgba(0,0,0,0.1)' }}
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">{g.first_name} {g.last_name}</span>
                      {g.is_primary && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                          style={{ background: '#EEEBFA', color: '#5346A8' }}
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
            {!ci.guests?.length && !canEdit && <p className="text-sm text-gray-400">Aucun voyageur enregistré</p>}

            {canEdit && emptySlots.map((slot) => (
              addingSlot === slot.index ? (
                <GuestScanPanel
                  key={slot.index}
                  checkIn={ci}
                  isPrimary={slot.index === 0}
                  label={`${slot.labelBase}${slot.isRequired ? ' — Obligatoire' : ' — Optionnel'}`}
                  onSuccess={() => { setAddingSlot(null); qc.invalidateQueries({ queryKey: ['check-in', id] }); }}
                  onCancel={() => setAddingSlot(null)}
                />
              ) : (
                <button
                  key={slot.index}
                  onClick={() => setAddingSlot(slot.index)}
                  className="flex items-center gap-3 rounded-2xl p-3.5 text-start transition-all"
                  style={{
                    border: `2px dashed ${slot.isRequired ? '#fca5a5' : '#EEEBFA'}`,
                    background: slot.isRequired ? '#FFF5F5' : '#F6F5F1',
                  }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: slot.isRequired ? '#fee2e2' : '#EEEBFA',
                      color: slot.isRequired ? '#ef4444' : '#5346A8',
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: slot.isRequired ? '#b91c1c' : '#374151' }}>
                      {slot.labelBase}
                    </p>
                    <p className="text-xs" style={{ color: slot.isRequired ? '#f87171' : '#9CA3AF' }}>
                      {slot.isRequired ? 'Document requis — Appuyer pour scanner' : 'Optionnel — Appuyer pour scanner'}
                    </p>
                  </div>
                </button>
              )
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {ci.status === 'draft' && (
              <Button fullWidth size="lg" onClick={() => completeMutation.mutate()} loading={completeMutation.isPending}>
                <CheckCircle className="h-5 w-5" /> Finaliser le check-in
              </Button>
            )}
            {ci.status === 'active' && (
              <Button
                variant="secondary" fullWidth size="lg"
                onClick={() => { setCheckoutDate(todayISO); setShowCheckoutModal(true); }}
              >
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

    </HotelLayout>

      {/* Checkout date modal */}
      {showCheckoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowCheckoutModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-gray-900">Confirmer le check-out</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Date de départ réelle
              </label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={checkoutDate}
                min={ci.check_in_date}
                max={todayISO}
                onChange={e => setCheckoutDate(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary" fullWidth
                onClick={() => setShowCheckoutModal(false)}
                disabled={checkoutMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                fullWidth
                onClick={() => checkoutMutation.mutate(checkoutDate)}
                loading={checkoutMutation.isPending}
                disabled={!checkoutDate}
              >
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Portal vers document.body — body > *:not(#police-fiche-root) { display:none }
          isole la fiche sans layout de l'app React */}
      {hotel && createPortal(<PoliceFiche checkIn={ci} hotel={hotel} />, document.body)}
    </>
  );
};
