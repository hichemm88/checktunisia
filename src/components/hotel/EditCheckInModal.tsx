import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RoomSelector, RoomChoice } from '@/components/hotel/RoomSelector';
import { checkInsApi, UpdateCheckInPayload } from '@/api/checkIns';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { CheckIn } from '@/types';

// Ajoute n jours à une date ISO (YYYY-MM-DD), calcul en UTC pour éviter le
// décalage d'un jour en local (Tunisie UTC+1) — même logique que le wizard.
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
};

const Stepper = ({
  label, value, min = 0, max = 20, onChange,
}: {
  label: string; value: number; min?: number; max?: number; onChange: (v: number) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="label">{label}</label>
    <div className="flex items-center rounded-xl overflow-hidden h-[52px] bg-white" style={{ border: '1.5px solid #DDD9CF' }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex items-center justify-center w-[52px] h-full text-gray-500 hover:bg-warm-100 active:bg-warm-200 disabled:text-gray-200 disabled:cursor-not-allowed transition-colors shrink-0"
        style={{ borderRight: '1.5px solid #DDD9CF' }}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="flex-1 text-center text-base font-black text-gray-900 tabular-nums select-none">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex items-center justify-center w-[52px] h-full text-gray-500 hover:bg-warm-100 active:bg-warm-200 disabled:text-gray-200 disabled:cursor-not-allowed transition-colors shrink-0"
        style={{ borderLeft: '1.5px solid #DDD9CF' }}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  </div>
);

export const EditCheckInModal = ({
  checkIn, onClose,
}: {
  checkIn: CheckIn; onClose: () => void;
}) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [checkInDate, setCheckInDate]   = useState(checkIn.check_in_date.slice(0, 10));
  const [checkOutDate, setCheckOutDate] = useState(checkIn.expected_check_out_date.slice(0, 10));
  const [adults, setAdults]     = useState(checkIn.adults_count ?? 1);
  const [children, setChildren] = useState(checkIn.children_count ?? 0);
  const [bookingRef, setBookingRef]       = useState(checkIn.booking_reference ?? '');
  const [bookingSource, setBookingSource] = useState(checkIn.booking_source ?? '');
  const [notes, setNotes] = useState(checkIn.notes ?? '');

  // Choix chambre initialisé sur l'assignation actuelle.
  const [roomChoice, setRoomChoice] = useState<RoomChoice | null>(
    checkIn.room ? { kind: 'room', id: checkIn.room.id } : { kind: 'none' },
  );

  const setDate = (which: 'in' | 'out', v: string) => {
    if (which === 'in') {
      setCheckInDate(v);
      // Départ toujours ≥ lendemain de l'arrivée.
      if (v && (!checkOutDate || checkOutDate <= v)) setCheckOutDate(addDays(v, 1));
    } else {
      setCheckOutDate(v);
    }
    // La disponibilité dépend des dates : changer les dates réinitialise le choix.
    setRoomChoice(null);
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload: UpdateCheckInPayload = {
        check_in_date: checkInDate,
        expected_check_out_date: checkOutDate,
        adults_count: adults,
        children_count: children,
        booking_reference: bookingRef || undefined,
        booking_source: bookingSource || undefined,
        notes: notes || undefined,
        room_id: roomChoice?.kind === 'room' ? roomChoice.id : null,
      };
      return checkInsApi.update(checkIn.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['check-in', checkIn.id] });
      qc.invalidateQueries({ queryKey: ['check-ins'] });
      toast(t('hotelHistoryDetail.checkinUpdated'), 'success');
      onClose();
    },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const datesValid = !!checkInDate && !!checkOutDate && checkOutDate > checkInDate;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-gray-900">{t('hotelHistoryDetail.editCheckin')}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100" aria-label={t('common.close')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('checkinWizard.arrivalLabel')}
            type="date"
            value={checkInDate}
            onChange={(e) => setDate('in', e.target.value)}
            required
          />
          <Input
            label={t('checkinWizard.expectedDepartureLabel')}
            type="date"
            value={checkOutDate}
            min={checkInDate ? addDays(checkInDate, 1) : undefined}
            onChange={(e) => setDate('out', e.target.value)}
            required
          />
        </div>

        {/* La chambre déjà assignée reste sélectionnable même en changeant les dates :
            le backend ne s'exclut pas du calcul de dispo et rapporte le séjour comme
            « occupant » sa propre chambre. `allowConflictReference` distingue ce
            faux conflit (référence du séjour édité) d'un vrai conflit avec un autre client. */}
        <RoomSelector
          from={checkInDate}
          to={checkOutDate}
          value={roomChoice}
          onChange={setRoomChoice}
          allowRoomId={checkIn.room?.id}
          allowConflictReference={checkIn.reference}
        />

        <div className="grid grid-cols-2 gap-3">
          <Stepper label={t('checkinWizard.adults')} value={adults} min={1} max={20} onChange={setAdults} />
          <Stepper label={t('checkinWizard.children')} value={children} min={0} max={20} onChange={setChildren} />
        </div>

        <Input
          label={t('checkinWizard.bookingRefLabel')}
          placeholder={t('checkinWizard.bookingRefPlaceholder')}
          value={bookingRef}
          onChange={(e) => setBookingRef(e.target.value)}
        />

        <Input
          label={t('hotelHistoryDetail.source')}
          value={bookingSource}
          onChange={(e) => setBookingSource(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="label">{t('hotelHistoryDetail.notes')}</label>
          <textarea
            className="input-field min-h-[80px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {!datesValid && (
          <p className="text-xs text-red-500">{t('hotelHistoryDetail.invalidDates')}</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={mutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            fullWidth
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!datesValid || !roomChoice}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};
