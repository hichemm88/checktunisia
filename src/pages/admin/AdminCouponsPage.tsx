import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ticket, Plus, X, Trash2, Pencil, Check, Ban } from 'lucide-react';
import { adminCouponsApi, type Coupon, type CouponInput, type CouponType } from '@/api/admin/coupons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { extractErrors } from '@/lib/api';
import { formatTNDAmount } from '@/lib/money';
import { ListSkeleton } from '@/components/admin/ListSkeleton';
import { ErrorState } from '@/components/admin/ErrorState';

const dateLocaleFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-FR');
const fmtDate = (d: string | null | undefined, locale: string) =>
  d ? new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

type FormState = {
  code: string;
  type: CouponType;
  value: string;
  description: string;
  min_amount: string;
  max_uses: string;
  expires_at: string;
};

const EMPTY_FORM: FormState = { code: '', type: 'percent', value: '', description: '', min_amount: '', max_uses: '', expires_at: '' };

const formToInput = (f: FormState): CouponInput => ({
  code: f.code.trim().toUpperCase(),
  type: f.type,
  value: f.value === '' ? undefined : parseFloat(f.value),
  description: f.description.trim() || null,
  min_amount: f.min_amount === '' ? null : parseFloat(f.min_amount),
  max_uses: f.max_uses === '' ? null : parseInt(f.max_uses, 10),
  expires_at: f.expires_at || null,
});

/** Affiche la remise d'un coupon : « 20 % » ou « 25,000 TND ». */
const discountLabel = (c: Coupon) => (c.type === 'percent' ? `${parseFloat(c.value)} %` : formatTNDAmount(c.value));

const CouponForm = ({ initial, onSubmit, pending, error, onCancel }: {
  initial: FormState;
  onSubmit: (input: CouponInput) => void;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(initial);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="rounded-xl p-3 flex flex-col gap-2 mb-3" style={{ background: 'var(--qayed-papier)' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input label={t('adminCoupons.code')} value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="ETE2026" />
        <Select
          label={t('adminCoupons.type')}
          value={form.type}
          onChange={(e) => set({ type: e.target.value as CouponType })}
          options={[
            { value: 'percent', label: t('adminCoupons.typePercent') },
            { value: 'fixed', label: t('adminCoupons.typeFixed') },
          ]}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          label={form.type === 'percent' ? t('adminCoupons.valuePercent') : t('adminCoupons.valueFixed')}
          type="number"
          value={form.value}
          onChange={(e) => set({ value: e.target.value })}
        />
        <Input label={t('adminCoupons.minAmount')} type="number" value={form.min_amount} onChange={(e) => set({ min_amount: e.target.value })} placeholder={t('adminCoupons.optional')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input label={t('adminCoupons.maxUses')} type="number" value={form.max_uses} onChange={(e) => set({ max_uses: e.target.value })} placeholder={t('adminCoupons.unlimited')} />
        <Input label={t('adminCoupons.expiresAt')} type="date" value={form.expires_at} onChange={(e) => set({ expires_at: e.target.value })} />
      </div>
      <Input label={t('adminCoupons.description')} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder={t('adminCoupons.optional')} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" loading={pending} onClick={() => onSubmit(formToInput(form))}>{t('common.save')}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </div>
  );
};

const CouponRow = ({ coupon }: { coupon: Coupon }) => {
  const { t, i18n } = useTranslation();
  const locale = dateLocaleFor(i18n.language);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-coupons'] });

  const updateMut = useMutation({
    mutationFn: (input: CouponInput) => adminCouponsApi.update(coupon.id, input),
    onSuccess: () => { invalidate(); setEditing(false); setError(null); toast(t('adminCoupons.saved'), 'success'); },
    onError: (err) => setError(extractErrors(err)),
  });

  const removeMut = useAdminMutation({
    mutationFn: () => adminCouponsApi.remove(coupon.id),
    successMessage: t('adminCoupons.removed'),
    onSuccess: invalidate,
  });

  const toggleMut = useAdminMutation({
    mutationFn: () => adminCouponsApi.update(coupon.id, { active: !coupon.active }),
    onSuccess: invalidate,
  });

  const used = coupon.redemptions_count ?? coupon.used_count;
  const expired = coupon.expires_at && new Date(coupon.expires_at) < new Date();

  if (editing) {
    return (
      <CouponForm
        initial={{
          code: coupon.code,
          type: coupon.type,
          value: String(parseFloat(coupon.value)),
          description: coupon.description ?? '',
          min_amount: coupon.min_amount ? String(parseFloat(coupon.min_amount)) : '',
          max_uses: coupon.max_uses != null ? String(coupon.max_uses) : '',
          expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
        }}
        onSubmit={(input) => updateMut.mutate(input)}
        pending={updateMut.isPending}
        error={error}
        onCancel={() => { setEditing(false); setError(null); }}
      />
    );
  }

  return (
    <div className="card p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-gray-900">{coupon.code}</span>
          <span className="badge" style={{ background: 'var(--qayed-cachet)18', color: 'var(--qayed-cachet)' }}>{discountLabel(coupon)}</span>
          {!coupon.active && <span className="badge bg-gray-100 text-gray-500">{t('adminCoupons.inactive')}</span>}
          {expired && <span className="badge" style={{ background: 'var(--qayed-vigilance-fond)', color: 'var(--qayed-vigilance-texte)' }}>{t('adminCoupons.expired')}</span>}
        </div>
        <p className="mt-1 text-xs text-gray-500 truncate">
          {coupon.description ? `${coupon.description} · ` : ''}
          {t('adminCoupons.usedCount', { used, max: coupon.max_uses ?? '∞' })}
          {coupon.min_amount ? ` · ${t('adminCoupons.minAmountShort', { amount: formatTNDAmount(coupon.min_amount) })}` : ''}
          {coupon.expires_at ? ` · ${t('adminCoupons.expiresShort', { date: fmtDate(coupon.expires_at, locale) })}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => setEditing(true)} className="p-1.5 text-gray-400 hover:text-[--qayed-cachet]" title={t('common.edit')}>
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={() => toggleMut.mutate()} className="p-1.5 text-gray-400 hover:text-[--qayed-vigilance-texte]" title={coupon.active ? t('adminCoupons.deactivate') : t('adminCoupons.activate')}>
          {coupon.active ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        </button>
        <button onClick={() => removeMut.mutate()} className="p-1.5 text-gray-400 hover:text-red-500" title={t('common.delete')}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const AdminCouponsPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['admin-coupons'], queryFn: adminCouponsApi.list });

  const createMut = useMutation({
    mutationFn: (input: CouponInput) => adminCouponsApi.create(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); setCreating(false); setError(null); toast(t('adminCoupons.created'), 'success'); },
    onError: (err) => setError(extractErrors(err)),
  });

  const coupons = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="qayed-display text-xl text-gray-900 flex items-center gap-2">
          <Ticket className="h-5 w-5" style={{ color: 'var(--qayed-cachet)' }} />
          {t('adminCoupons.title')}
        </h1>
        <Button size="sm" onClick={() => { setCreating((c) => !c); setError(null); }} className="gap-1">
          {creating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {creating ? t('common.cancel') : t('adminCoupons.newCoupon')}
        </Button>
      </div>

      <p className="text-sm text-gray-500">{t('adminCoupons.intro')}</p>

      {creating && (
        <CouponForm
          initial={EMPTY_FORM}
          onSubmit={(input) => createMut.mutate(input)}
          pending={createMut.isPending}
          error={error}
          onCancel={() => { setCreating(false); setError(null); }}
        />
      )}

      {isLoading && <ListSkeleton rows={3} height="h-16" />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && coupons.length === 0 && (
        <div className="card p-8 text-center text-sm text-gray-400">
          <Ticket className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {t('adminCoupons.empty')}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {coupons.map((c) => <CouponRow key={c.id} coupon={c} />)}
      </div>
    </div>
  );
};
