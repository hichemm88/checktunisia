import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { checkInsApi, type UpdateGuestPayload } from '@/api/checkIns';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { type CheckIn, type Guest } from '@/types';

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

  // Snapshot des valeurs d'origine, pour n'envoyer QUE les champs modifiés.
  // Crucial : le document n'est ré-envoyé que si l'on y touche réellement —
  // sinon corriger un simple prénom re-soumettait le pays de délivrance existant
  // (ex. « GBR », alpha-3) au backend, qui exige 2 caractères sur cet endpoint,
  // et rejetait toute la modification.
  const initial = useMemo(() => ({
    first_name: guest.first_name ?? '',
    last_name: guest.last_name ?? '',
    date_of_birth: guest.date_of_birth?.slice(0, 10) ?? '',
    sex: (guest.sex ?? '') as string,
    nationality_code: guest.nationality_code ?? '',
    document_type: guest.document?.type ?? 'passport',
    document_number: guest.document?.document_number ?? '',
    issuing_country_code: guest.document?.issuing_country_code ?? '',
    expiry_date: guest.document?.expiry_date?.slice(0, 10) ?? '',
  }), [guest]);

  const [form, setForm] = useState({ ...initial });

  const set = (k: keyof typeof initial, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const isNationalId = form.document_type === 'national_id';

  // Construit un payload différentiel : seulement les champs réellement changés.
  const buildPayload = (): UpdateGuestPayload => {
    const p: UpdateGuestPayload = {};
    if (form.first_name !== initial.first_name) p.first_name = form.first_name;
    if (form.last_name !== initial.last_name) p.last_name = form.last_name;
    if (form.date_of_birth !== initial.date_of_birth) p.date_of_birth = form.date_of_birth;
    if (form.sex !== initial.sex) p.sex = (form.sex || undefined) as UpdateGuestPayload['sex'];
    if (form.nationality_code !== initial.nationality_code) p.nationality_code = form.nationality_code;

    // Champs document (jamais pour la CIN, qui n'a ni pays de délivrance ni expiration ici).
    if (!isNationalId) {
      const docChanged =
        form.document_type !== initial.document_type ||
        form.document_number !== initial.document_number ||
        form.issuing_country_code !== initial.issuing_country_code ||
        form.expiry_date !== initial.expiry_date;
      if (docChanged) {
        p.document_type = form.document_type; // contexte pour le backend
        if (form.document_number !== initial.document_number) p.document_number = form.document_number;
        if (form.issuing_country_code !== initial.issuing_country_code) p.issuing_country_code = form.issuing_country_code;
        if (form.expiry_date !== initial.expiry_date) p.expiry_date = form.expiry_date;
      }
    }
    return p;
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload();
      // Rien à envoyer → on referme sans appel réseau inutile.
      if (Object.keys(payload).length === 0) return Promise.resolve(guest);
      return checkInsApi.updateGuest(checkIn.id, guest.id, payload);
    },
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
