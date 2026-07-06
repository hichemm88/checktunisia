import { useState, useRef, ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Camera, CheckCircle, Loader2, ScanLine, Upload, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { checkInsApi, AddGuestPayload } from '@/api/checkIns';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { scanMrz } from '@/lib/mrzScanner';
import { CheckIn } from '@/types';

const SEX_OPTIONS = [
  { value: '',  label: 'Sexe'     },
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin'  },
  { value: 'X', label: 'Autre'    },
];

export const GuestScanPanel = ({
  checkIn, isPrimary, label, onSuccess, onCancel,
}: {
  checkIn: CheckIn; isPrimary: boolean; label: string;
  onSuccess: () => void; onCancel?: () => void;
}) => {
  const { toast } = useToast();
  const fileRef       = useRef<HTMLInputElement>(null); // caméra
  const uploadRef     = useRef<HTMLInputElement>(null); // galerie / fichier
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractedOk, setExtractedOk] = useState(false);
  const [guestForm, setGuestForm] = useState<Partial<AddGuestPayload>>({ is_primary: isPrimary });

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanState('scanning');
    setOcrProgress(0);
    try {
      const mrz = await scanMrz(file, setOcrProgress);
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
      setExtractedOk(true);
      setScanState('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Scan échoué';
      toast(msg, 'error');
      setScanState('error');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addGuestMutation = useMutation({
    mutationFn: () => checkInsApi.addGuest(checkIn.id, guestForm as AddGuestPayload),
    onSuccess,
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const setG = (k: string, v: string) => setGuestForm((f) => ({ ...f, [k]: v }));
  const reset = () => {
    setScanState('idle'); setExtractedOk(false);
    setGuestForm({ is_primary: isPrimary });
    if (fileRef.current)   fileRef.current.value = '';
    if (uploadRef.current) uploadRef.current.value = '';
  };

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl p-4"
      style={{ background: '#F5F4EF', border: '1.5px solid #E0DDD7' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-800">{label}</p>
        {onCancel && (
          <button className="text-xs text-gray-400 hover:text-gray-600 font-medium" onClick={onCancel}>
            Annuler
          </button>
        )}
      </div>

      {/* Caméra — capture directe */}
      <input ref={fileRef}   type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      {/* Upload — galerie ou fichier existant */}
      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* ── Idle / Error ── */}
      {(scanState === 'idle' || scanState === 'error') && (
        <div
          className="flex flex-col items-center gap-5 rounded-2xl bg-white py-8 px-4"
          style={{ border: '2px dashed #D4E1F4' }}
        >
          {scanState === 'error' && (
            <p className="text-sm text-red-600 font-medium text-center">Scan échoué. Réessayez ou saisissez manuellement.</p>
          )}
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #1B3A5F 0%, #2A5090 100%)' }}
          >
            <ScanLine className="h-8 w-8 text-white" />
          </div>
          <p className="text-xs text-center text-gray-400">
            Photographiez la page du passeport avec la zone MRZ (deux lignes de codes) bien visible.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => fileRef.current?.click()}>
              <Camera className="h-4 w-4" /> Prendre une photo
            </Button>
            <Button variant="secondary" onClick={() => uploadRef.current?.click()}>
              <Upload className="h-4 w-4" /> Importer une photo
            </Button>
            <Button variant="secondary" onClick={() => { setExtractedOk(false); setScanState('done'); }}>
              Saisie manuelle
            </Button>
          </div>
        </div>
      )}

      {/* ── Scanning ── */}
      {scanState === 'scanning' && (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-9">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl animate-pulse"
            style={{ background: '#E8EEFB' }}
          >
            <Loader2 className="h-7 w-7 animate-spin" style={{ color: '#1B3A5F' }} />
          </div>
          <p className="text-sm font-semibold text-gray-700">Lecture MRZ en cours…</p>
          <div className="w-full max-w-xs rounded-full bg-gray-100 h-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${ocrProgress}%`, background: 'linear-gradient(90deg, #1B3A5F, #2A5090)' }}
            />
          </div>
          <p className="text-xs text-gray-400">{ocrProgress}%</p>
        </div>
      )}

      {/* ── Done — form ── */}
      {scanState === 'done' && (
        <>
          {extractedOk && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-emerald-50 border border-emerald-200">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-xs font-semibold text-emerald-800">
                Document lu avec succès — vérifiez les données
              </p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <Select
              label="Type de document"
              options={[
                { value: 'passport', label: 'Passeport' },
                { value: 'national_id', label: 'CIN (Carte d’identité nationale)' },
              ]}
              value={guestForm.document_type ?? 'passport'}
              onChange={(e) => setG('document_type', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Prénom" value={guestForm.first_name ?? ''} onChange={(e) => setG('first_name', e.target.value)} required />
              <Input label="Nom"    value={guestForm.last_name  ?? ''} onChange={(e) => setG('last_name',  e.target.value)} required />
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
            fullWidth size="lg"
            loading={addGuestMutation.isPending}
            onClick={() => addGuestMutation.mutate()}
            disabled={!guestForm.first_name || !guestForm.last_name || !guestForm.date_of_birth}
          >
            Confirmer le voyageur <ArrowRight className="h-4 w-4" />
          </Button>

          <button className="text-center text-sm font-medium" style={{ color: '#1B3A5F' }} onClick={reset}>
            ↩ Rescanner ou corriger
          </button>
        </>
      )}
    </div>
  );
};
