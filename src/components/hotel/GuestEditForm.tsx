import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { checkInsApi, UpdateGuestPayload } from '@/api/checkIns';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { CheckIn, Guest } from '@/types';

// Édition en place des détails d'un voyageur déjà enregistré (correction de
// saisie, mise à jour de pièce). Réutilise les champs du formulaire d'ajout,
// pré-remplis depuis le voyageur.
export const GuestEditForm = ({
  checkIn, guest, onSuccess, onCancel,
}: {
  checkIn: CheckIn; guest: Guest;
  onSuccess: () => void; onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const SEX_OPTIONS = [
    { value: '',  label: t('common.sex')    },
    { value: 'M', label: t('common.male')   },
    { value: 'F', label: t('common.female') },
    { value: 'X', label: t('common.other')  },
  ];

  const [form, setForm] = useState<UpdateGuestPayload>({
    first_name: guest.first_name ?? '',
    last_name: guest.last_name ?? '',
    date_of_birth: guest.date_of_birth?.slice(0, 10) ?? '',
    sex: guest.sex,
    nationality_code: guest.nationality_code ?? '',
    document_type: guest.document?.type ?? 'passport',
    document_number: guest.document?.document_number ?? '',
    issuing_country_code: guest.document?.issuing_country_code ?? '',
    expiry_date: guest.document?.expiry_date?.slice(0, 10) ?? '',
  });

  const set = (k: keyof UpdateGuestPayload, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const isNationalId = form.document_type === 'national_id';

  const mutation = useMutation({
    mutationFn: () => checkInsApi.updateGuest(checkIn.id, guest.id, {
      ...form,
      sex: (form.sex || undefined) as UpdateGuestPayload['sex'],
      // La CIN tunisienne n'a pas d'expiration ni de pays de délivrance saisis ici.
      issuing_country_code: isNationalId ? undefined : form.issuing_country_code,
      expiry_date: isNationalId ? undefined : form.expiry_date,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['check-in', checkIn.id] });
      toast(t('hotelHistoryDetail.guestUpdated'), 'success');
      onSuccess();
    },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  return (
    <div className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: '#F6F5F1', border: '1.5px solid #DDD9CF' }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-800">{t('hotelHistoryDetail.editGuest')}</p>
        <button className="text-xs text-gray-400 hover:text-gray-600 font-medium" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>

      <Select
        label={t('guestScan.documentType')}
        options={[
          { value: 'passport', label: t('guestScan.passport') },
          { value: 'national_id', label: t('guestScan.nationalId') },
        ]}
        value={form.document_type ?? 'passport'}
        onChange={(e) => set('document_type', e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input label={t('guestScan.firstName')} value={form.first_name ?? ''} onChange={(e) => set('first_name', e.target.value)} required />
        <Input label={t('guestScan.lastName')} value={form.last_name ?? ''} onChange={(e) => set('last_name', e.target.value)} required />
      </div>

      <Input label={t('guestScan.dateOfBirth')} type="date" value={form.date_of_birth ?? ''} onChange={(e) => set('date_of_birth', e.target.value)} required />

      <div className="grid grid-cols-2 gap-3">
        <Select label={t('common.sex')} options={SEX_OPTIONS} value={form.sex ?? ''} onChange={(e) => set('sex', e.target.value)} />
        <Input label={t('guestScan.nationality')} placeholder="TUN" value={form.nationality_code ?? ''} onChange={(e) => set('nationality_code', e.target.value.toUpperCase())} maxLength={3} />
      </div>

      <Input
        label={isNationalId ? t('cinScan.cinNumber') : t('guestScan.documentNumber')}
        value={form.document_number ?? ''}
        onChange={(e) => set('document_number', e.target.value)}
      />

      {/* Pays de délivrance + expiration : masqués pour la CIN (pas d'expiration). */}
      {!isNationalId && (
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('guestScan.issuingCountry')} placeholder="TUN" value={form.issuing_country_code ?? ''} onChange={(e) => set('issuing_country_code', e.target.value.toUpperCase())} maxLength={3} />
          <Input label={t('guestScan.expiry')} type="date" value={form.expiry_date ?? ''} onChange={(e) => set('expiry_date', e.target.value)} />
        </div>
      )}

      <Button
        fullWidth size="lg"
        loading={mutation.isPending}
        onClick={() => mutation.mutate()}
        disabled={!form.first_name || !form.last_name || !form.date_of_birth}
      >
        {t('common.save')} <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
