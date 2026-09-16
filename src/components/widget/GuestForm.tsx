import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, BookUser } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CINCapture } from '@/components/hotel/CINCapture';
import { ficheWidgetApi } from '@/api/widget/ficheWidget';
import type { GuestInput } from '@/api/widget/ficheWidget';

const emptyGuest = (): GuestInput => ({
  first_name: '',
  last_name: '',
  date_of_birth: '',
  sex: 'M',
  nationality_code: 'TUN',
  document: { type: 'passport', document_number: '', issuing_country_code: 'TN' },
});

/** Formulaire d'ajout d'un voyageur — mêmes champs que le flux natif (GuestController). */
export const GuestForm = ({
  prefill,
  onAdd,
  onCancel,
}: {
  prefill?: Partial<GuestInput>;
  onAdd: (guest: GuestInput) => Promise<void>;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [guest, setGuest] = useState<GuestInput>({ ...emptyGuest(), ...prefill });
  const [scanning, setScanning] = useState(false);
  const [scanDocType, setScanDocType] = useState<'cin' | 'passport'>('cin');
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof GuestInput>(key: K, value: GuestInput[K]) =>
    setGuest((g) => ({ ...g, [key]: value }));
  const setDoc = <K extends keyof GuestInput['document']>(key: K, value: GuestInput['document'][K]) =>
    setGuest((g) => ({ ...g, document: { ...g.document, [key]: value } }));

  const handleCapture = async (blob: Blob) => {
    setScanning(false);
    setScanError(null);
    try {
      const { scan_id } = await ficheWidgetApi.uploadScan(blob, scanDocType);
      setScanId(scan_id);
      // Court sondage — le scan aboutit en quelques secondes.
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const status = await ficheWidgetApi.scanStatus(scan_id);
        if (status.status === 'completed' && status.extracted) {
          const ex = status.extracted as Record<string, string>;
          setGuest((g) => ({
            ...g,
            first_name: ex.first_name ?? g.first_name,
            last_name: ex.last_name ?? g.last_name,
            date_of_birth: ex.date_of_birth ?? g.date_of_birth,
            sex: (ex.sex as GuestInput['sex']) ?? g.sex,
            nationality_code: ex.nationality_code ?? g.nationality_code,
            document: {
              ...g.document,
              type: ex.document_type ?? g.document.type,
              document_number: ex.document_number ?? g.document.document_number,
              issuing_country_code: ex.issuing_country_code ?? g.document.issuing_country_code,
              expiry_date: ex.expiry_date ?? g.document.expiry_date,
              mrz_line1: ex.mrz_line1 ?? g.document.mrz_line1,
              mrz_line2: ex.mrz_line2 ?? g.document.mrz_line2,
            },
          }));
          return;
        }
        if (status.status === 'failed') {
          setScanError(status.error ?? t('widget.scanFailed'));
          return;
        }
      }
      setScanError(t('widget.scanTimeout'));
    } catch {
      setScanError(t('widget.scanFailed'));
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onAdd(scanId ? { ...guest, scan_id: scanId } : guest);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('widget.genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-qayed-ligne bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-base font-bold text-qayed-encre">{t('widget.newGuest')}</h3>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setScanDocType('cin'); setScanning(true); }}>
            <Camera className="h-4 w-4" aria-hidden="true" /> {t('widget.scanCin')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { setScanDocType('passport'); setScanning(true); }}>
            <BookUser className="h-4 w-4" aria-hidden="true" /> {t('widget.scanPassport')}
          </Button>
        </div>
      </div>

      {scanning && (
        <CINCapture
          variant={scanDocType === 'passport' ? 'mrz' : 'cin'}
          onCapture={handleCapture}
          onClose={() => setScanning(false)}
        />
      )}
      {scanError && <p className="text-sm text-qayed-erreur-texte">{scanError}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label={t('widget.firstName')} value={guest.first_name} onChange={(e) => set('first_name', e.target.value)} required />
        <Input label={t('widget.lastName')} value={guest.last_name} onChange={(e) => set('last_name', e.target.value)} required />
        <Input type="date" label={t('widget.dateOfBirth')} value={guest.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} required />
        <Select
          label={t('widget.sex')}
          value={guest.sex}
          onChange={(e) => set('sex', e.target.value as GuestInput['sex'])}
          options={[{ value: 'M', label: 'M' }, { value: 'F', label: 'F' }, { value: 'X', label: 'X' }]}
        />
        <Input label={t('widget.nationality')} value={guest.nationality_code} onChange={(e) => set('nationality_code', e.target.value.toUpperCase())} maxLength={3} required />
        <Input label={t('widget.documentNumber')} value={guest.document.document_number} onChange={(e) => setDoc('document_number', e.target.value)} required />
        <Select
          label={t('widget.documentType')}
          value={guest.document.type}
          onChange={(e) => setDoc('type', e.target.value)}
          options={[
            { value: 'passport', label: t('widget.docPassport') },
            { value: 'national_id', label: t('widget.docNationalId') },
            { value: 'residence_permit', label: t('widget.docResidencePermit') },
          ]}
        />
        <Input label={t('widget.issuingCountry')} value={guest.document.issuing_country_code} onChange={(e) => setDoc('issuing_country_code', e.target.value.toUpperCase())} maxLength={3} required />
      </div>

      {error && <p className="text-sm text-qayed-erreur-texte">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>{t('common.cancel')}</Button>
        <Button onClick={submit} loading={submitting}>{t('widget.addGuest')}</Button>
      </div>
    </div>
  );
};
