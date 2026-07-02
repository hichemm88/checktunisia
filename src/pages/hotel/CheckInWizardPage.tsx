import { useState, useRef, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Upload, Camera, CheckCircle, User, UserPlus,
  Loader2, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { checkInsApi, AddGuestPayload, CreateCheckInPayload } from '@/api/checkIns';
import { roomsApi } from '@/api/rooms';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { scanMrz, MrzData } from '@/lib/mrzScanner';
import { CheckIn } from '@/types';

const STEPS = [
  { label: 'Réservation' },
  { label: 'Documents' },
  { label: 'Validation' },
];

const SEX_OPTIONS = [
  { value: '', label: 'Sexe' },
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
  { value: 'X', label: 'Autre' },
];

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-TN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

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
    <div className="flex flex-col gap-5">
      <Select
        label="Chambre"
        options={roomOptions}
        value={form.room_id ?? ''}
        onChange={(e) => set('room_id', e.target.value)}
      />
      <Input
        label="Référence réservation"
        placeholder="Optionnel"
        value={form.booking_reference ?? ''}
        onChange={(e) => set('booking_reference', e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Date d'arrivée"
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
        <Input
          label="Adultes"
          type="number"
          min={1}
          value={form.adults_count ?? 1}
          onChange={(e) => set('adults_count', Math.max(1, Number(e.target.value)))}
        />
        <Input
          label="Enfants"
          type="number"
          min={0}
          value={form.children_count ?? 0}
          onChange={(e) => set('children_count', Math.max(0, Number(e.target.value)))}
        />
      </div>
      <Button
        fullWidth
        size="lg"
        loading={createMutation.isPending}
        onClick={() => createMutation.mutate(form as CreateCheckInPayload)}
        disabled={!form.check_in_date || !form.expected_check_out_date}
      >
        Continuer <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

// ─── Composant réutilisable : scan + formulaire pour 1 voyageur ─────────────
const GuestScanPanel = ({
  checkIn,
  isPrimary,
  label,
  onSuccess,
  onCancel,
}: {
  checkIn: CheckIn;
  isPrimary: boolean;
  label: string;
  onSuccess: () => void;
  onCancel?: () => void;
}) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extracted, setExtracted] = useState<MrzData | null>(null);
  const [guestForm, setGuestForm] = useState<Partial<AddGuestPayload>>({ is_primary: isPrimary });

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanState('scanning');
    setOcrProgress(0);
    try {
      const mrz = await scanMrz(file, setOcrProgress);
      setExtracted(mrz);
      setGuestForm({
        first_name: mrz.first_name ?? '',
        last_name: mrz.last_name ?? '',
        date_of_birth: mrz.date_of_birth ?? '',
        sex: mrz.sex ?? 'M',
        nationality_code: mrz.nationality_code ?? '',
        document_type: mrz.document_type,
        document_number: mrz.document_number ?? '',
        issuing_country_code: mrz.issuing_country_code ?? '',
        expiry_date: mrz.expiry_date ?? '',
        is_primary: isPrimary,
      });
      setScanState('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Scan échoué';
      toast(msg, 'error');
      setScanState('error');
      // Reset input so same file can be re-selected
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addGuestMutation = useMutation({
    mutationFn: () => checkInsApi.addGuest(checkIn.id, guestForm as AddGuestPayload),
    onSuccess,
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const setG = (k: string, v: string) => setGuestForm((f) => ({ ...f, [k]: v }));
  const reset = () => { setScanState('idle'); setExtracted(null); setGuestForm({ is_primary: isPrimary }); if (fileRef.current) fileRef.current.value = ''; };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {onCancel && (
          <button className="text-xs text-gray-400 hover:text-gray-600" onClick={onCancel}>
            Annuler
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {/* ── État : idle / error ── */}
      {(scanState === 'idle' || scanState === 'error') && (
        <Card className="flex flex-col items-center gap-4 border-2 border-dashed border-gray-200 bg-white py-7">
          {scanState === 'error' && (
            <p className="text-sm text-red-600">Scan échoué. Réessayez ou saisissez manuellement.</p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Camera className="h-4 w-4" /> Scanner
            </Button>
            <Button variant="ghost" onClick={() => { setExtracted(null); setScanState('done'); }}>
              <Upload className="h-4 w-4" /> Saisie manuelle
            </Button>
          </div>
          <p className="text-xs text-gray-400">Photographiez la page du passeport (zone MRZ visible)</p>
        </Card>
      )}

      {/* ── État : scanning ── */}
      {scanState === 'scanning' && (
        <Card className="flex flex-col items-center gap-4 bg-white py-9">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <p className="text-sm font-medium text-gray-600">Lecture du MRZ en cours…</p>
          <div className="w-full max-w-xs rounded-full bg-gray-100 h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${ocrProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{ocrProgress}%</p>
        </Card>
      )}

      {/* ── État : done — formulaire ── */}
      {scanState === 'done' && (
        <>
          {extracted && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
              <p className="text-xs font-medium text-green-800">
                Document lu avec succès — vérifiez les données ci-dessous
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Prénom" value={guestForm.first_name ?? ''} onChange={(e) => setG('first_name', e.target.value)} required />
              <Input label="Nom" value={guestForm.last_name ?? ''} onChange={(e) => setG('last_name', e.target.value)} required />
            </div>
            <Input label="Date de naissance" type="date" value={guestForm.date_of_birth ?? ''} onChange={(e) => setG('date_of_birth', e.target.value)} required />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Sexe" options={SEX_OPTIONS} value={guestForm.sex ?? ''} onChange={(e) => setG('sex', e.target.value)} />
              <Input label="Nationalité" placeholder="TUN" value={guestForm.nationality_code ?? ''} onChange={(e) => setG('nationality_code', e.target.value.toUpperCase())} maxLength={3} />
            </div>
            <Input label="N° document" value={guestForm.document_number ?? ''} onChange={(e) => setG('document_number', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Pays délivrance" placeholder="TUN" value={guestForm.issuing_country_code ?? ''} onChange={(e) => setG('issuing_country_code', e.target.value.toUpperCase())} maxLength={3} />
              <Input label="Expiration" type="date" value={guestForm.expiry_date ?? ''} onChange={(e) => setG('expiry_date', e.target.value)} />
            </div>
          </div>

          <Button
            fullWidth
            loading={addGuestMutation.isPending}
            onClick={() => addGuestMutation.mutate()}
            disabled={!guestForm.first_name || !guestForm.last_name || !guestForm.date_of_birth}
          >
            Confirmer le voyageur <ArrowRight className="h-4 w-4" />
          </Button>

          <button className="text-center text-sm text-primary-600" onClick={reset}>
            ↩ Rescanner ou corriger
          </button>
        </>
      )}
    </div>
  );
};

// ─── Step 2 : Voyageur principal ────────────────────────────────────────────
const DocumentStep = ({ checkIn, onNext }: { checkIn: CheckIn; onNext: () => void }) => (
  <div className="flex flex-col gap-5">
    <GuestScanPanel
      checkIn={checkIn}
      isPrimary
      label="Voyageur principal (adulte)"
      onSuccess={onNext}
    />
  </div>
);

// ─── Step 3 : Validation + voyageurs supplémentaires ────────────────────────
const ValidationStep = ({ checkIn, onDone }: { checkIn: CheckIn; onDone: () => void }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
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

  // Construire les slots attendus : adultes (requis) puis enfants (optionnel)
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
      {/* Résumé réservation */}
      <Card>
        <div className="flex flex-col gap-3">
          {[
            ['Référence', ci.reference],
            ['Chambre',   ci.room?.number ?? '—'],
            ['Arrivée',   fmtDate(ci.check_in_date)],
            ['Départ prévu', fmtDate(ci.expected_check_out_date)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-900 font-mono">{value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Slots voyageurs */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-gray-700">
          Voyageurs ({fetching ? '…' : guests.length}/{totalN})
        </p>

        {fetching && <div className="h-14 animate-pulse rounded-xl bg-gray-100" />}

        {!fetching && slots.map((slot) => {
          // ── Slot rempli ──────────────────────────────────────────────────
          if (slot.guest) {
            return (
              <Card key={slot.index} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {slot.guest.first_name} {slot.guest.last_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {slot.labelBase} · {slot.guest.nationality_code} · {fmtDate(slot.guest.date_of_birth)}
                  </p>
                </div>
                <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
              </Card>
            );
          }

          // ── Slot en cours d'ajout : affiche le panel inline ──────────────
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

          // ── Slot vide : bouton d'ajout ────────────────────────────────────
          return (
            <button
              key={slot.index}
              onClick={() => setAddingSlot(slot.index)}
              className={`flex items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left transition-colors ${
                slot.isRequired
                  ? 'border-red-200 bg-red-50 hover:border-red-300 hover:bg-red-100'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                slot.isRequired ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-400'
              }`}>
                <UserPlus className="h-4 w-4" />
              </div>
              <div>
                <p className={`text-sm font-medium ${slot.isRequired ? 'text-red-700' : 'text-gray-600'}`}>
                  {slot.labelBase}
                </p>
                <p className={`text-xs ${slot.isRequired ? 'text-red-400' : 'text-gray-400'}`}>
                  {slot.isRequired
                    ? 'Document requis — Appuyer pour scanner / saisir'
                    : 'Optionnel — Appuyer pour scanner / saisir'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Message si adultes manquants */}
      {!fetching && !allAdultsFilled && (
        <p className="text-xs text-red-500 text-center">
          Les documents des adultes sont obligatoires pour finaliser.
        </p>
      )}

      <Button
        fullWidth
        size="lg"
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

// ─── Wizard principal ────────────────────────────────────────────────────────
export const CheckInWizardPage = () => {
  const navigate = useNavigate();
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
              className="flex items-center gap-1.5 text-sm text-gray-500"
              onClick={() => setStep(2)}
            >
              <ArrowRight className="h-4 w-4" /> Passer (pas de scan)
            </button>
          </>
        )}

        {step === 2 && checkIn && (
          <ValidationStep checkIn={checkIn} onDone={() => {}} />
        )}

        {step > 0 && (
          <button
            className="flex items-center gap-1.5 text-sm text-gray-400"
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
