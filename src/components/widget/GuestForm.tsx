import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { GuestInput } from '@/api/widget/ficheWidget';

/**
 * Champs d'un voyageur — mêmes champs que le flux natif (GuestController).
 * Contrôlé par la page : le bouton principal vit dans la barre basse et
 * soumet ce formulaire via `form={formId}`, ce qui garde la validation native.
 */
export const GuestForm = ({
  formId,
  guest,
  onChange,
  onSubmit,
}: {
  formId: string;
  guest: GuestInput;
  onChange: (guest: GuestInput) => void;
  onSubmit: () => void;
}) => {
  const { t } = useTranslation();
  const set = <K extends keyof GuestInput>(key: K, value: GuestInput[K]) => onChange({ ...guest, [key]: value });
  const setDoc = <K extends keyof GuestInput['document']>(key: K, value: GuestInput['document'][K]) =>
    onChange({ ...guest, document: { ...guest.document, [key]: value } });

  return (
    <form
      id={formId}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
    >
      <Input label={t('widget.lastName')} value={guest.last_name} onChange={(e) => set('last_name', e.target.value)} autoComplete="off" required />
      <Input label={t('widget.firstName')} value={guest.first_name} onChange={(e) => set('first_name', e.target.value)} autoComplete="off" required />
      <Input type="date" label={t('widget.dateOfBirth')} value={guest.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} required />
      <Select
        label={t('widget.sex')}
        value={guest.sex}
        onChange={(e) => set('sex', e.target.value as GuestInput['sex'])}
        options={[{ value: 'M', label: 'M' }, { value: 'F', label: 'F' }, { value: 'X', label: 'X' }]}
      />
      <Input label={t('widget.nationality')} value={guest.nationality_code} onChange={(e) => set('nationality_code', e.target.value.toUpperCase())} maxLength={3} autoComplete="off" required />
      <Select
        label={t('widget.documentType')}
        value={guest.document.type}
        onChange={(e) => setDoc('type', e.target.value)}
        options={[
          { value: 'national_id', label: t('widget.docNationalId') },
          { value: 'passport', label: t('widget.docPassport') },
          { value: 'residence_permit', label: t('widget.docResidencePermit') },
        ]}
      />
      <Input label={t('widget.documentNumber')} value={guest.document.document_number} onChange={(e) => setDoc('document_number', e.target.value)} autoComplete="off" required />
      <Input label={t('widget.issuingCountry')} value={guest.document.issuing_country_code} onChange={(e) => setDoc('issuing_country_code', e.target.value.toUpperCase())} maxLength={3} autoComplete="off" required />
    </form>
  );
};
