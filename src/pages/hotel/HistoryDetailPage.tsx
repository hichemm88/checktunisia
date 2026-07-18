import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, LogOut, CheckCircle, FileText, MapPin, CalendarDays, Printer, UserPlus, Pencil, Trash2 } from 'lucide-react';
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
import { GuestEditForm } from '@/components/hotel/GuestEditForm';
import { EditCheckInModal } from '@/components/hotel/EditCheckInModal';
import { useAuthStore } from '@/stores/authStore';

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="flex justify-between items-start py-3 border-b border-gray-50 last:border-0">
    <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
    <span className="text-sm font-semibold text-gray-900 text-end max-w-[55%]">{value ?? '—'}</span>
  </div>
);

const dateLocaleFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-TN');
const fmtDate = (d: string | null | undefined, locale: string) =>
  d ? new Date(d).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export const HistoryDetailPage = () => {
  const { t, i18n } = useTranslation();
  const locale = dateLocaleFor(i18n.language);
  const SEX_LABELS: Record<string, string> = { M: t('common.male'), F: t('common.female'), X: t('common.other') };
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const { toast } = useToast();
  // « Manager établissement » = hotel_admin : seul habilité à éditer un check-in.
  const isManager = useAuthStore((s) => s.user?.role === 'hotel_admin');

  const todayISO = new Date().toISOString().split('T')[0];
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutDate, setCheckoutDate] = useState(todayISO);
  const [addingSlot, setAddingSlot] = useState<number | null>(null);
  const [addingExtra, setAddingExtra] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['check-in', id] }); toast(t('hotelHistoryDetail.completed'), 'success'); },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const checkoutMutation = useMutation({
    mutationFn: (date: string) => checkInsApi.checkout(id!, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['check-in', id] });
      setShowCheckoutModal(false);
      toast(t('hotelHistoryDetail.checkoutSaved'), 'success');
    },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const removeGuestMutation = useMutation({
    mutationFn: (guestId: string) => checkInsApi.removeGuest(id!, guestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['check-in', id] });
      toast(t('hotelHistoryDetail.guestRemoved'), 'success');
    },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  if (isLoading) return (
    <HotelLayout title={t('hotelHistoryDetail.detail')}>
      <div className="p-4 flex flex-col gap-4">
        {[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-card bg-gray-100" />)}
      </div>
    </HotelLayout>
  );

  if (!ci) return null;

  const pg = ci.primary_guest
    ?? ci.guests?.find(g => g.is_primary)
    ?? ci.guests?.[0];

  const guestName = pg ? `${pg.first_name} ${pg.last_name}` : t('hotelHistory.noGuest');
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
      ? t('checkinWizard.childN', { n: index - adultsN + 1 })
      : index === 0 ? t('checkinWizard.primaryGuestLabel') : t('checkinWizard.adultN', { n: index + 1 });
    return { index, isRequired, labelBase };
  });

  return (
    <>
    <HotelLayout title={t('hotelHistoryDetail.checkinDetail')}>
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
            <ArrowLeft className="h-4 w-4" /> {t('common.back')}
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
              { icon: MapPin,       label: t('checkinWizard.roomShort'),  val: ci.room?.number ?? '—' },
              { icon: CalendarDays, label: t('checkinWizard.arrivalLabel'),  val: fmtDate(ci.check_in_date, locale).split(' ').slice(0,2).join(' ') },
              { icon: CalendarDays, label: t('hotelHistoryDetail.departure'),   val: fmtDate(ci.expected_check_out_date, locale).split(' ').slice(0,2).join(' ') },
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

          {/* Flag séjour : un document expirait déjà à l'arrivée (même flag backend que le mobile) */}
          {ci.document_expired && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#FBF0D7', border: '1px solid #E3A008' }}>
              <FileText className="h-4 w-4 shrink-0" style={{ color: '#8A6206' }} />
              <p className="text-xs font-semibold" style={{ color: '#8A6206' }}>{t('hotelHistory.docExpired')}</p>
            </div>
          )}

          {/* Booking details */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <p className="label mb-0">{t('checkinWizard.bookingSummary')}</p>
              {isManager && canEdit && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors"
                  style={{ background: '#EEEBFA', color: '#5346A8' }}
                >
                  <Pencil className="h-3.5 w-3.5" /> {t('common.edit')}
                </button>
              )}
            </div>
            <DetailRow label={t('checkinWizard.adults')}      value={ci.adults_count} />
            <DetailRow label={t('checkinWizard.children')}      value={ci.children_count} />
            <DetailRow label={t('hotelHistoryDetail.actualDeparture')}  value={fmtDate(ci.actual_check_out_date, locale)} />
            {ci.booking_reference && <DetailRow label={t('hotelHistoryDetail.bookingRef')} value={ci.booking_reference} />}
            {ci.booking_source    && <DetailRow label={t('hotelHistoryDetail.source')} value={ci.booking_source} />}
            {ci.created_by && (
              <DetailRow label={t('hotelHistoryDetail.registeredBy')} value={`${ci.created_by.first_name} ${ci.created_by.last_name}`} />
            )}
            {ci.notes && <DetailRow label={t('hotelHistoryDetail.notes')} value={ci.notes} />}
          </Card>

          {/* Guests */}
          <div className="flex flex-col gap-3">
            <p className="label">
              {t('checkinWizard.guests')} · {ci.guests?.length ?? 0}{canEdit ? `/${totalSlots}` : ''}
            </p>
            {ci.guests?.map((g) => {
              const gInitials = `${g.first_name?.[0] ?? ''}${g.last_name?.[0] ?? ''}`.toUpperCase();
              const gFlagUrl = getFlagUrl(g.nationality_code);
              const canManageGuest = isManager && canEdit;

              if (editingGuestId === g.id) {
                return (
                  <GuestEditForm
                    key={g.id}
                    checkIn={ci}
                    guest={g}
                    onSuccess={() => { setEditingGuestId(null); qc.invalidateQueries({ queryKey: ['check-in', id] }); }}
                    onCancel={() => setEditingGuestId(null)}
                  />
                );
              }

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
                          {t('hotelHistoryDetail.primary')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {fmtDate(g.date_of_birth, locale)} · {SEX_LABELS[g.sex] ?? g.sex} · {g.nationality_code}
                    </p>
                    {g.document && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <FileText className="h-3 w-3 text-gray-300" />
                        <p className="text-xs text-gray-400">
                          {g.document.type} <span className="font-mono">{g.document.document_number}</span>
                          {g.document.expiry_date && ` · ${t('hotelHistoryDetail.expires')} ${fmtDate(g.document.expiry_date, locale)}`}
                          {g.document.expiry_date && g.document.expiry_date < ci.check_in_date && (
                            <span className="ms-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: '#FBF0D7', color: '#8A6206' }}>
                              {t('hotelHistoryDetail.expiredTag')}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions manager — édition en place / retrait du voyageur */}
                  {canManageGuest && (
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <button
                        onClick={() => setEditingGuestId(g.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                        style={{ background: '#EEEBFA', color: '#5346A8' }}
                        aria-label={t('common.edit')}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(t('hotelHistoryDetail.confirmRemoveGuest'))) removeGuestMutation.mutate(g.id);
                        }}
                        disabled={removeGuestMutation.isPending && removeGuestMutation.variables === g.id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                        style={{ background: '#FEE2E2', color: '#DC2626' }}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
            {!ci.guests?.length && !canEdit && <p className="text-sm text-gray-400">{t('hotelHistoryDetail.noGuestRegistered')}</p>}

            {canEdit && emptySlots.map((slot) => (
              addingSlot === slot.index ? (
                <GuestScanPanel
                  key={slot.index}
                  checkIn={ci}
                  isPrimary={slot.index === 0}
                  label={`${slot.labelBase}${slot.isRequired ? ' — ' + t('checkinWizard.required') : ' — ' + t('common.optional')}`}
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
                      {slot.isRequired ? t('checkinWizard.documentRequiredHint') : t('checkinWizard.documentOptionalHint')}
                    </p>
                  </div>
                </button>
              )
            ))}

            {/* Extra traveler — beyond the declared adult/children count.
                Covers late arrivals and families arriving in several waves. */}
            {canEdit && (
              addingExtra ? (
                <GuestScanPanel
                  checkIn={ci}
                  isPrimary={false}
                  label={t('checkinWizard.extraGuestLabel')}
                  onSuccess={() => {
                    // Keep the declared head-count in step with reality so the
                    // fiche de police and slot logic stay consistent.
                    checkInsApi.update(id!, { adults_count: adultsN + 1 })
                      .catch(() => { /* count sync is best-effort; guest is already saved */ })
                      .finally(() => {
                        setAddingExtra(false);
                        qc.invalidateQueries({ queryKey: ['check-in', id] });
                      });
                  }}
                  onCancel={() => setAddingExtra(false)}
                />
              ) : (
                <button
                  onClick={() => setAddingExtra(true)}
                  className="flex items-center gap-3 rounded-2xl p-3.5 text-start transition-all"
                  style={{ border: '2px dashed #EEEBFA', background: '#F6F5F1' }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: '#EEEBFA', color: '#5346A8' }}
                  >
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#374151' }}>
                      {t('checkinWizard.addExtraGuest')}
                    </p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                      {t('checkinWizard.extraGuestHint')}
                    </p>
                  </div>
                </button>
              )
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {ci.status === 'draft' && (
              <Button fullWidth size="lg" onClick={() => completeMutation.mutate()} loading={completeMutation.isPending}>
                <CheckCircle className="h-5 w-5" /> {t('checkinWizard.finalize')}
              </Button>
            )}
            {ci.status === 'active' && (
              <Button
                variant="secondary" fullWidth size="lg"
                onClick={() => { setCheckoutDate(todayISO); setShowCheckoutModal(true); }}
              >
                <LogOut className="h-5 w-5" /> {t('hotelHistoryDetail.recordCheckout')}
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
                <Printer className="h-5 w-5" /> {t('hotelHistoryDetail.printPoliceForm')}
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
            <h3 className="text-base font-black text-gray-900">{t('hotelHistoryDetail.confirmCheckout')}</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                {t('hotelHistoryDetail.actualDepartureDate')}
              </label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-qayed-cachet"
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
                {t('common.cancel')}
              </Button>
              <Button
                fullWidth
                onClick={() => checkoutMutation.mutate(checkoutDate)}
                loading={checkoutMutation.isPending}
                disabled={!checkoutDate}
              >
                {t('common.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Édition du check-in (chambre, dates, détails) — manager uniquement */}
      {showEditModal && (
        <EditCheckInModal checkIn={ci} onClose={() => setShowEditModal(false)} />
      )}

      {/* Portal vers document.body — body > *:not(#police-fiche-root) { display:none }
          isole la fiche sans layout de l'app React */}
      {hotel && createPortal(<PoliceFiche checkIn={ci} hotel={hotel} />, document.body)}
    </>
  );
};
