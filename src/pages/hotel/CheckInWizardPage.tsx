import { useState, useRef, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Upload, Camera, CheckCircle, User, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
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

// ─── Step 1: Booking Info ───────────────────────────────────────────────────
const BookingStep = ({ onNext }: { onNext: (ci: CheckIn) => void }) => {
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<CreateCheckInPayload & { room_number: string }>>({
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
          onChange={(e) => set('adults_count', Number(e.target.value))}
        />
        <Input
          label="Enfants"
          type="number"
          min={0}
          value={form.children_count ?? 0}
          onChange={(e) => set('children_count', Number(e.target.value))}
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

// ─── Step 2: Document Scan ──────────────────────────────────────────────────
const DocumentStep = ({ checkIn, onNext }: { checkIn: CheckIn; onNext: () => void }) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extracted, setExtracted] = useState<MrzData | null>(null);
  const [guestForm, setGuestForm] = useState<Partial<AddGuestPayload>>({});

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
        is_primary: true,
      });
      setScanState('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Scan échoué';
      toast(msg, 'error');
      setScanState('error');
    }
  };

  const addGuestMutation = useMutation({
    mutationFn: () => checkInsApi.addGuest(checkIn.id, guestForm as AddGuestPayload),
    onSuccess: onNext,
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const setG = (k: string, v: string) => setGuestForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="flex flex-col gap-5">
      {/* Scan zone */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

      {scanState === 'idle' || scanState === 'error' ? (
        <Card className="flex flex-col items-center gap-4 py-8 border-dashed border-2 border-gray-200">
          {scanState === 'error' && <p className="text-sm text-red-600">Scan échoué. Réessayez ou saisissez manuellement.</p>}
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
      ) : scanState === 'scanning' ? (
        <Card className="flex flex-col items-center gap-4 py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <p className="text-sm text-gray-600 font-medium">Lecture du MRZ en cours…</p>
          <div className="w-full max-w-xs bg-gray-100 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${ocrProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{ocrProgress}%</p>
        </Card>
      ) : null}

      {/* Extracted / manual form */}
      {scanState === 'done' && (
        <>
          {extracted && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
              <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-800 font-medium">Document lu avec succès — vérifiez les données ci-dessous</p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Prénom" value={guestForm.first_name ?? ''} onChange={(e) => setG('first_name', e.target.value)} required />
              <Input label="Nom" value={guestForm.last_name ?? ''} onChange={(e) => setG('last_name', e.target.value)} required />
            </div>
            <Input label="Date de naissance" type="date" value={guestForm.date_of_birth ?? ''} onChange={(e) => setG('date_of_birth', e.target.value)} required />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Sexe" options={SEX_OPTIONS} value={guestForm.sex ?? ''} onChange={(e) => setG('sex', e.target.value)} />
              <Input label="Nationalité (code)" placeholder="TUN" value={guestForm.nationality_code ?? ''} onChange={(e) => setG('nationality_code', e.target.value.toUpperCase())} maxLength={3} />
            </div>
            <Input label="N° document" value={guestForm.document_number ?? ''} onChange={(e) => setG('document_number', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Pays délivrance" placeholder="TN" value={guestForm.issuing_country_code ?? ''} onChange={(e) => setG('issuing_country_code', e.target.value.toUpperCase())} maxLength={3} />
              <Input label="Expiration" type="date" value={guestForm.expiry_date ?? ''} onChange={(e) => setG('expiry_date', e.target.value)} />
            </div>
          </div>

          <Button fullWidth size="lg" loading={addGuestMutation.isPending} onClick={() => addGuestMutation.mutate()}>
            Ajouter le voyageur <ArrowRight className="h-4 w-4" />
          </Button>
          <button
            className="text-center text-sm text-primary-600"
            onClick={() => { setScanState('idle'); setExtracted(null); setGuestForm({}); }}
          >
            Scanner un autre passeport
          </button>
        </>
      )}
    </div>
  );
};

// helper — extract date part from ISO string or date string
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-TN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// ─── Step 3: Validation ─────────────────────────────────────────────────────
const ValidationStep = ({ checkIn, onDone }: { checkIn: CheckIn; onDone: () => void }) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Re-fetch the check-in so guests added in step 2 are visible
  const { data: current, isLoading: fetching } = useQuery({
    queryKey: ['check-in-detail', checkIn.id],
    queryFn: () => checkInsApi.get(checkIn.id),
    staleTime: 0,
  });

  const ci     = current ?? checkIn;
  const guests = ci.guests ?? [];

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
      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Référence</span>
            <span className="font-mono font-medium text-gray-900">{ci.reference}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Chambre</span>
            <span className="font-medium text-gray-900">{ci.room?.number ?? '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Arrivée</span>
            <span className="font-medium text-gray-900">{fmtDate(ci.check_in_date)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Départ prévu</span>
            <span className="font-medium text-gray-900">{fmtDate(ci.expected_check_out_date)}</span>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-gray-700">
          Voyageurs ({fetching ? '…' : guests.length})
        </p>
        {fetching && <div className="h-14 animate-pulse rounded-xl bg-gray-100" />}
        {!fetching && guests.map((g) => (
          <Card key={g.id} className="flex items-center gap-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {g.first_name} {g.last_name}
                {g.is_primary && <span className="ml-2 text-xs text-primary-600">(principal)</span>}
              </p>
              <p className="text-xs text-gray-500">{g.nationality_code} · {fmtDate(g.date_of_birth)}</p>
            </div>
          </Card>
        ))}
        {!fetching && guests.length === 0 && (
          <p className="text-sm text-red-600">Au moins 1 voyageur requis</p>
        )}
      </div>

      <Button
        fullWidth
        size="lg"
        loading={completeMutation.isPending}
        disabled={fetching || guests.length === 0}
        onClick={() => completeMutation.mutate()}
      >
        <CheckCircle className="h-5 w-5" />
        Finaliser le check-in
      </Button>
    </div>
  );
};

// ─── Main Wizard ────────────────────────────────────────────────────────────
export const CheckInWizardPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
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
            <button className="flex items-center gap-1.5 text-sm text-gray-500" onClick={() => setStep(2)}>
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
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
        )}
      </div>
    </HotelLayout>
  );
};
