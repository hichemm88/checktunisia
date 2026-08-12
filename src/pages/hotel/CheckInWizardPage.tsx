import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle, UserPlus, Minus, Plus } from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ArrowNext, ArrowPrev } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/cn';
import { checkInsApi, type CreateCheckInPayload } from '@/api/checkIns';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { GuestScanPanel } from '@/components/hotel/GuestScanPanel';
import { RoomSelector, type RoomChoice } from '@/components/hotel/RoomSelector';
import { detectOta } from '@/lib/otaDetect';
import { type CheckIn } from '@/types';

const dateLocaleFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-TN');
const fmtDate = (d: string | null | undefined, locale: string) =>
  d ? new Date(d).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// Ajoute n jours à une date ISO (YYYY-MM-DD) et renvoie une date ISO.
// Calcul entièrement en UTC : en local (Tunisie UTC+1) le passage par
// toISOString() décalait la date d'un jour en arrière.
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
};

// ─── +/- Stepper ────────────────────────────────────────────────────────────
const Stepper = ({
  label, value, min = 0, max = 20, onChange,
}: {
  label: string; value: number; min?: number; max?: number; onChange: (v: number) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="label">{label}</label>
    <div className="flex items-center rounded-xl overflow-hidden h-[52px] bg-white border-[1.5px] border-qayed-ligne">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={label + ' \u2212 1'}
        className="flex items-center justify-center w-[52px] h-full border-e-[1.5px] border-qayed-ligne text-qayed-gris-600 hover:bg-qayed-papier active:bg-qayed-gris-100 disabled:text-qayed-gris-300 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="flex-1 text-center text-base font-black text-qayed-encre tabular-nums select-none" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={label + ' + 1'}
        className="flex items-center justify-center w-[52px] h-full border-s-[1.5px] border-qayed-ligne text-qayed-gris-600 hover:bg-qayed-papier active:bg-qayed-gris-100 disabled:text-qayed-gris-300 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  </div>
);

// ─── Step 1 : Réservation ───────────────────────────────────────────────────
const BookingStep = ({ onNext }: { onNext: (ci: CheckIn) => void }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<CreateCheckInPayload>>(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      check_in_date: today,
      // Départ par défaut : le lendemain de l'arrivée (séjour d'une nuit).
      expected_check_out_date: addDays(today, 1),
      adults_count: 1,
      children_count: 0,
    };
  });
  // Explicit choice required: a room OR the conscious "no room" link — never a default.
  const [roomChoice, setRoomChoice] = useState<RoomChoice | null>(null);

  const createMutation = useMutation({
    mutationFn: checkInsApi.create,
    onSuccess: onNext,
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));
  // Availability depends on the stay dates — changing them resets the room choice.
  const setDate = (k: string, v: string) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      // Départ toujours ≥ lendemain de l'arrivée : on le réajuste si l'arrivée
      // change et rendrait la plage invalide (ou si le départ est vide).
      if (k === 'check_in_date' && v && (!next.expected_check_out_date || next.expected_check_out_date <= v)) {
        next.expected_check_out_date = addDays(v, 1);
      }
      return next;
    });
    setRoomChoice(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label={t('checkinWizard.arrivalLabel')}
          type="date"
          value={form.check_in_date ?? ''}
          onChange={(e) => setDate('check_in_date', e.target.value)}
          required
        />
        <Input
          label={t('checkinWizard.expectedDepartureLabel')}
          type="date"
          value={form.expected_check_out_date ?? ''}
          onChange={(e) => setDate('expected_check_out_date', e.target.value)}
          required
        />
      </div>
      <RoomSelector
        from={form.check_in_date ?? ''}
        to={form.expected_check_out_date ?? ''}
        value={roomChoice}
        onChange={setRoomChoice}
      />
      <div className="flex flex-col gap-1.5">
        <Input
          label={t('checkinWizard.bookingRefLabel')}
          placeholder={t('checkinWizard.bookingRefPlaceholder')}
          value={form.booking_reference ?? ''}
          onChange={(e) => set('booking_reference', e.target.value)}
        />
        {(() => {
          const ota = detectOta(form.booking_reference ?? '');
          return ota ? (
            <span className="self-start rounded-full bg-qayed-cachet-dilue px-3 py-1 text-xs font-semibold text-qayed-cachet">
              {t('checkinWizard.otaDetected', { platform: ota.label })}
            </span>
          ) : null;
        })()}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Stepper label={t('checkinWizard.adults')} value={form.adults_count ?? 1} min={1} max={20} onChange={(v) => set('adults_count', v)} />
        <Stepper label={t('checkinWizard.children')} value={form.children_count ?? 0} min={0} max={20} onChange={(v) => set('children_count', v)} />
      </div>
      <Button
        fullWidth size="lg"
        loading={createMutation.isPending}
        onClick={() => createMutation.mutate({
          ...form,
          room_id: roomChoice?.kind === 'room' ? roomChoice.id : undefined,
        } as CreateCheckInPayload)}
        disabled={!form.check_in_date || !form.expected_check_out_date || !roomChoice}
      >
        {t('common.next')} <ArrowNext className="h-4 w-4" />
      </Button>
      {!roomChoice && form.check_in_date && form.expected_check_out_date && (
        <p className="text-xs text-qayed-fiche text-center -mt-2">{t('checkinWizard.roomChoiceRequired')}</p>
      )}
    </div>
  );
};

// ─── Step 2 : Document voyageur principal ───────────────────────────────────
const DocumentStep = ({ checkIn, onNext }: { checkIn: CheckIn; onNext: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-5">
      <GuestScanPanel checkIn={checkIn} isPrimary label={t('checkinWizard.primaryGuestLabel')} onSuccess={onNext} />
    </div>
  );
};

// ─── Step 3 : Validation + voyageurs supplémentaires ────────────────────────
const ValidationStep = ({ checkIn, onDone }: { checkIn: CheckIn; onDone: () => void }) => {
  const { t, i18n } = useTranslation();
  const locale = dateLocaleFor(i18n.language);
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
      ? t('checkinWizard.childN', { n: i - adultsN + 1 })
      : i === 0 ? t('checkinWizard.primaryGuestLabel') : t('checkinWizard.adultN', { n: i + 1 });
    return { index: i, isChild, isRequired, guest: guests[i] ?? null, labelBase };
  });

  const allAdultsFilled = guests.length >= adultsN;

  const completeMutation = useMutation({
    mutationFn: () => checkInsApi.complete(checkIn.id),
    onSuccess: () => {
      toast(t('checkinWizard.completedSuccess'), 'success');
      onDone();
      navigate('/hotel/history');
    },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Résumé */}
      <Card>
        <p className="label mb-3">{t('checkinWizard.bookingSummary')}</p>
        <div className="flex flex-col gap-2">
          {([
            [t('checkinWizard.reference'), ci.reference],
            [t('checkinWizard.roomShort'), ci.room?.number ?? '—'],
            [t('checkinWizard.arrivalLabel'), fmtDate(ci.check_in_date, locale)],
            [t('checkinWizard.expectedDepartureLabel'), fmtDate(ci.expected_check_out_date, locale)],
            [t('checkinWizard.adults'), String(adultsN)],
            [t('checkinWizard.children'), String(childrenN)],
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
          {t('checkinWizard.guests')} ({fetching ? '…' : guests.length}/{totalN})
        </p>

        {fetching && <div className="h-14 animate-pulse rounded-2xl bg-qayed-gris-100" aria-hidden="true" />}

        {!fetching && slots.map((slot) => {
          // Slot rempli
          if (slot.guest) {
            const gInitials = `${slot.guest.first_name?.[0] ?? ''}${slot.guest.last_name?.[0] ?? ''}`.toUpperCase();
            return (
              <div
                key={slot.index}
                className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card"
              >
                <div className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center bg-qayed-cachet text-sm font-bold text-white" aria-hidden="true">
                  {gInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-qayed-encre truncate">
                    {slot.guest.first_name} {slot.guest.last_name}
                  </p>
                  <p className="text-xs text-qayed-fiche">
                    {slot.labelBase} · {slot.guest.nationality_code} · {fmtDate(slot.guest.date_of_birth, locale)}
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 shrink-0 text-qayed-conforme-texte" aria-hidden="true" />
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
                label={`${slot.labelBase}${slot.isRequired ? ' — ' + t('checkinWizard.required') : ' — ' + t('common.optional')}`}
                onSuccess={() => { setAddingSlot(null); refetch(); }}
                onCancel={() => setAddingSlot(null)}
              />
            );
          }

          // Slot vide — bouton
          return (
            <button
              type="button"
              key={slot.index}
              onClick={() => setAddingSlot(slot.index)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border-2 border-dashed p-3.5 text-start transition-colors',
                slot.isRequired
                  ? 'border-red-200 bg-qayed-erreur-fond/50 hover:bg-qayed-erreur-fond'
                  : 'border-qayed-cachet-dilue bg-qayed-papier hover:bg-qayed-cachet-dilue/40',
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  slot.isRequired
                    ? 'bg-qayed-erreur-fond text-qayed-erreur'
                    : 'bg-qayed-cachet-dilue text-qayed-cachet',
                )}
                aria-hidden="true"
              >
                <UserPlus className="h-4 w-4" />
              </div>
              <div>
                <p className={cn('text-sm font-semibold', slot.isRequired ? 'text-qayed-erreur-texte' : 'text-qayed-gris-700')}>
                  {slot.labelBase}
                </p>
                <p className={cn('text-xs', slot.isRequired ? 'text-qayed-erreur' : 'text-qayed-fiche')}>
                  {slot.isRequired ? t('checkinWizard.documentRequiredHint') : t('checkinWizard.documentOptionalHint')}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {!fetching && !allAdultsFilled && (
        <p className="text-xs text-qayed-erreur-texte text-center font-medium" role="alert">
          {t('checkinWizard.adultDocsRequired')}
        </p>
      )}

      <Button
        fullWidth size="lg"
        loading={completeMutation.isPending}
        disabled={fetching || !allAdultsFilled}
        onClick={() => completeMutation.mutate()}
      >
        <CheckCircle className="h-5 w-5" aria-hidden="true" />
        {t('checkinWizard.finalize')}
      </Button>
    </div>
  );
};

// ─── Main Wizard ─────────────────────────────────────────────────────────────
export const CheckInWizardPage = () => {
  const { t } = useTranslation();
  const navigate  = useNavigate();
  const [step, setStep]       = useState(0);
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);

  // ?resume={id} — reprise d'une fiche brouillon depuis la liste d'arrivées du dashboard :
  // on saute l'étape réservation (déjà créée) et on ouvre directement les documents.
  const [params, setParams] = useSearchParams();
  const resumeId = params.get('resume');
  const { data: resumed } = useQuery({
    queryKey: ['check-in-resume', resumeId],
    queryFn: () => checkInsApi.get(resumeId!),
    enabled: !!resumeId && !checkIn,
  });
  useEffect(() => {
    if (resumed && !checkIn) { setCheckIn(resumed); setStep(1); }
  }, [resumed, checkIn]);

  // Le brouillon est inscrit dans l'URL dès sa création. Sans ça, un simple F5
  // (ou le retour depuis l'appareil photo natif, qui recharge l'onglet sur
  // certains téléphones) renvoyait la réception à l'étape 1 avec un formulaire
  // vide, alors que le séjour existait déjà en base : elle en recréait un
  // second et laissait un brouillon fantôme derrière elle.
  useEffect(() => {
    if (checkIn && params.get('resume') !== checkIn.id) {
      setParams({ resume: checkIn.id }, { replace: true });
    }
  }, [checkIn, params, setParams]);

  const STEPS = [
    { label: t('checkinWizard.stepBooking') },
    { label: t('checkinWizard.stepDocuments') },
    { label: t('checkinWizard.stepValidation') },
  ];

  return (
    <HotelLayout title={t('checkinWizard.title')}>
      <div className="p-4 flex flex-col gap-6">
        <h1 className="sr-only">{t('checkinWizard.title')}</h1>
        <StepIndicator steps={STEPS} currentStep={step} />

        {step === 0 && (
          <BookingStep onNext={(ci) => { setCheckIn(ci); setStep(1); }} />
        )}

        {step === 1 && checkIn && (
          <>
            <DocumentStep checkIn={checkIn} onNext={() => setStep(2)} />
            <Button variant="link" className="self-center" onClick={() => setStep(2)}>
              {t('checkinWizard.skip')} <ArrowNext className="h-4 w-4" />
            </Button>
          </>
        )}

        {step === 2 && checkIn && (
          <ValidationStep checkIn={checkIn} onDone={() => {}} />
        )}

        {step > 0 && (
          <Button
            variant="link"
            className="self-start text-qayed-fiche hover:text-qayed-encre hover:no-underline"
            onClick={() => {
              if (step === 1) navigate(-1);
              else setStep((s) => s - 1);
            }}
          >
            <ArrowPrev className="h-4 w-4" /> {t('common.back')}
          </Button>
        )}
      </div>
    </HotelLayout>
  );
};
