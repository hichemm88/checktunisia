import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  CheckCircle, UserPlus,
  ArrowLeft, ArrowRight, Minus, Plus,
} from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { checkInsApi, CreateCheckInPayload } from '@/api/checkIns';
import { roomsApi } from '@/api/rooms';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { GuestScanPanel } from '@/components/hotel/GuestScanPanel';
import { CheckIn } from '@/types';

const STEPS = [
  { label: 'Réservation' },
  { label: 'Documents'   },
  { label: 'Validation'  },
];

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-TN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// ─── +/- Stepper ────────────────────────────────────────────────────────────
const Stepper = ({
  label, value, min = 0, max = 20, onChange,
}: {
  label: string; value: number; min?: number; max?: number; onChange: (v: number) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="label">{label}</label>
    <div
      className="flex items-center rounded-xl overflow-hidden h-[52px] bg-white"
      style={{ border: '1.5px solid #E0DDD7' }}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex items-center justify-center w-[52px] h-full text-gray-500 hover:bg-warm-100 active:bg-warm-200 disabled:text-gray-200 disabled:cursor-not-allowed transition-colors shrink-0"
        style={{ borderRight: '1.5px solid #E0DDD7' }}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="flex-1 text-center text-base font-black text-gray-900 tabular-nums select-none">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex items-center justify-center w-[52px] h-full text-gray-500 hover:bg-warm-100 active:bg-warm-200 disabled:text-gray-200 disabled:cursor-not-allowed transition-colors shrink-0"
        style={{ borderLeft: '1.5px solid #E0DDD7' }}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  </div>
);

// ─── Step 1 : Réservation ───────────────────────────────────────────────────
const BookingStep = ({ onNext }: { onNext: (ci: CheckIn) => void }) => {
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<CreateCheckInPayload>>({
    check_in_date: new Date().toISOString().split('T')[0],
    expected_check_out_date: '',
    adults_count: 1,
    children_count: 0,
  });

  const { data: rooms } = useQuery({ queryKey: ['rooms'], queryFn: () => roomsApi.list() });
  const roomOptions = [
    { value: '', label: 'Sans chambre assignée' },
    ...(rooms?.data ?? []).map((r) => ({ value: r.id, label: `Ch. ${r.number} (${r.type})` })),
  ];

  const createMutation = useMutation({
    mutationFn: checkInsApi.create,
    onSuccess: onNext,
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="flex flex-col gap-4">
      <Select
        label="Chambre"
        options={roomOptions}
        value={form.room_id ?? ''}
        onChange={(e) => set('room_id', e.target.value)}
      />
      <Input
        label="Référence réservation"
        placeholder="Optionnel (ex. BOOKING-123)"
        value={form.booking_reference ?? ''}
        onChange={(e) => set('booking_reference', e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Arrivée"
          type="date"
          value={form.check_in_date ?? ''}
          onChange={(e) => set('check_in_date', e.target.value)}
          required
        />
        <Input
          label="Départ prévu"
          type="date"
          value={form.expected_check_out_date ?? ''}
          onChange={(e) => set('expected_check_out_date', e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stepper label="Adultes" value={form.adults_count ?? 1} min={1} max={20} onChange={(v) => set('adults_count', v)} />
        <Stepper label="Enfants" value={form.children_count ?? 0} min={0} max={20} onChange={(v) => set('children_count', v)} />
      </div>
      <Button
        fullWidth size="lg"
        loading={createMutation.isPending}
        onClick={() => createMutation.mutate(form as CreateCheckInPayload)}
        disabled={!form.check_in_date || !form.expected_check_out_date}
      >
        Continuer <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

// ─── Step 2 : Document voyageur principal ───────────────────────────────────
const DocumentStep = ({ checkIn, onNext }: { checkIn: CheckIn; onNext: () => void }) => (
  <div className="flex flex-col gap-5">
    <GuestScanPanel checkIn={checkIn} isPrimary label="Voyageur principal (adulte)" onSuccess={onNext} />
  </div>
);

// ─── Step 3 : Validation + voyageurs supplémentaires ────────────────────────
const ValidationStep = ({ checkIn, onDone }: { checkIn: CheckIn; onDone: () => void }) => {
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const [addingSlot, setAddingSlot] = useState<number | null>(null);

  const { data: current, isLoading: fetching, refetch } = useQuery({
    queryKey: ['check-in-detail', checkIn.id],
    queryFn: () => checkInsApi.get(checkIn.id),
    staleTime: 0,
  });

  const ci        = current ?? checkIn;
  const guests    = ci.guests ?? [];
  const adultsN   = ci.adults_count   ?? 1;
  const childrenN = ci.children_count ?? 0;
  const totalN    = adultsN + childrenN;

  const slots = Array.from({ length: totalN }, (_, i) => {
    const isChild    = i >= adultsN;
    const isRequired = !isChild;
    const labelBase  = isChild
      ? `Enfant ${i - adultsN + 1}`
      : i === 0 ? 'Adulte — voyageur principal' : `Adulte ${i + 1}`;
    return { index: i, isChild, isRequired, guest: guests[i] ?? null, labelBase };
  });

  const allAdultsFilled = guests.length >= adultsN;

  const completeMutation = useMutation({
    mutationFn: () => checkInsApi.complete(checkIn.id),
    onSuccess: () => {
      toast('Check-in complété avec succès !', 'success');
      onDone();
      navigate('/hotel/history');
    },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Résumé */}
      <Card>
        <p className="label mb-3">Résumé réservation</p>
        <div className="flex flex-col gap-2">
          {([
            ['Référence',    ci.reference],
            ['Chambre',      ci.room?.number ?? '—'],
            ['Arrivée',      fmtDate(ci.check_in_date)],
            ['Départ prévu', fmtDate(ci.expected_check_out_date)],
            ['Adultes',      String(adultsN)],
            ['Enfants',      String(childrenN)],
          ] as const).map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-semibold text-gray-900">{value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Voyageur slots */}
      <div className="flex flex-col gap-3">
        <p className="label">
          Voyageurs ({fetching ? '…' : guests.length}/{totalN})
        </p>

        {fetching && <div className="h-14 animate-pulse rounded-2xl bg-gray-100" />}

        {!fetching && slots.map((slot) => {
          // Slot rempli
          if (slot.guest) {
            const gInitials = `${slot.guest.first_name?.[0] ?? ''}${slot.guest.last_name?.[0] ?? ''}`.toUpperCase();
            return (
              <div
                key={slot.index}
                className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card"
              >
                <div
                  className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{ background: '#1B3A5F', color: '#fff' }}
                >
                  {gInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {slot.guest.first_name} {slot.guest.last_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {slot.labelBase} · {slot.guest.nationality_code} · {fmtDate(slot.guest.date_of_birth)}
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
              </div>
            );
          }

          // Slot ouvert en saisie
          if (addingSlot === slot.index) {
            return (
              <GuestScanPanel
                key={slot.index}
                checkIn={checkIn}
                isPrimary={slot.index === 0}
                label={`${slot.labelBase}${slot.isRequired ? ' — Obligatoire' : ' — Optionnel'}`}
                onSuccess={() => { setAddingSlot(null); refetch(); }}
                onCancel={() => setAddingSlot(null)}
              />
            );
          }

          // Slot vide — bouton
          return (
            <button
              key={slot.index}
              onClick={() => setAddingSlot(slot.index)}
              className="flex items-center gap-3 rounded-2xl p-3.5 text-left transition-all"
              style={{
                border: `2px dashed ${slot.isRequired ? '#fca5a5' : '#D4E1F4'}`,
                background: slot.isRequired ? '#FFF5F5' : '#F5F4EF',
              }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: slot.isRequired ? '#fee2e2' : '#E8EEFB',
                  color: slot.isRequired ? '#ef4444' : '#1B3A5F',
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
          );
        })}
      </div>

      {!fetching && !allAdultsFilled && (
        <p className="text-xs text-red-500 text-center font-medium">
          Les documents des adultes sont obligatoires pour finaliser.
        </p>
      )}

      <Button
        fullWidth size="lg"
        loading={completeMutation.isPending}
        disabled={fetching || !allAdultsFilled}
        onClick={() => completeMutation.mutate()}
      >
        <CheckCircle className="h-5 w-5" />
        Finaliser le check-in
      </Button>
    </div>
  );
};

// ─── Main Wizard ─────────────────────────────────────────────────────────────
export const CheckInWizardPage = () => {
  const navigate  = useNavigate();
  const [step, setStep]       = useState(0);
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);

  return (
    <HotelLayout title="Nouveau check-in">
      <div className="p-4 flex flex-col gap-6">
        <StepIndicator steps={STEPS} currentStep={step} />

        {step === 0 && (
          <BookingStep onNext={(ci) => { setCheckIn(ci); setStep(1); }} />
        )}

        {step === 1 && checkIn && (
          <>
            <DocumentStep checkIn={checkIn} onNext={() => setStep(2)} />
            <button
              className="flex items-center justify-center gap-1.5 text-sm font-medium"
              style={{ color: '#1B3A5F' }}
              onClick={() => setStep(2)}
            >
              Passer <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}

        {step === 2 && checkIn && (
          <ValidationStep checkIn={checkIn} onDone={() => {}} />
        )}

        {step > 0 && (
          <button
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            onClick={() => {
              if (step === 1) navigate(-1);
              else setStep((s) => s - 1);
            }}
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
        )}
      </div>
    </HotelLayout>
  );
};
