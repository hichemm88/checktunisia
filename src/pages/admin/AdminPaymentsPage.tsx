import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, CreditCard, Landmark, Save, Wallet } from 'lucide-react';
import { adminPaymentsApi } from '@/api/admin/payments';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { ListSkeleton } from '@/components/admin/ListSkeleton';
import { Pagination } from '@/components/ui/Pagination';
import { formatTND } from '@/lib/money';

const C = { navy: '#5346A8' };

const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <div onClick={() => onChange(!checked)} className="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0" style={{ background: checked ? C.navy : '#d1d5db' }}>
      <span className="absolute top-0.5 start-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200" style={{ transform: checked ? 'translateX(20px)' : 'none' }} />
    </div>
    <span className="text-sm font-semibold text-gray-700">{label}</span>
  </label>
);

const ConfigTab = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery({ queryKey: ['admin-platform-settings'], queryFn: adminPaymentsApi.getSettings });

  const [company, setCompany] = useState({ name: '', mf: '', rc: '', address: '' });
  const [flouci, setFlouci] = useState({ enabled: false, app_token: '', app_secret: '' });
  const [virement, setVirement] = useState({ enabled: true, rib: '', iban: '', bank_name: '', beneficiary: '', details: '' });
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setCompany({
      name: settings.company_name ?? '', mf: settings.company_mf ?? '',
      rc: settings.company_rc ?? '', address: settings.company_address ?? '',
    });
    setFlouci({ enabled: settings.flouci_enabled, app_token: '', app_secret: '' });
    setVirement({
      enabled: settings.virement_enabled, rib: settings.virement_rib ?? '', iban: settings.virement_iban ?? '',
      bank_name: settings.virement_bank_name ?? '', beneficiary: settings.virement_beneficiary ?? '', details: settings.virement_details ?? '',
    });
    setInitialized(true);
  }

  const saveMut = useMutation({
    mutationFn: () => adminPaymentsApi.updateSettings({
      company_name: company.name, company_mf: company.mf, company_rc: company.rc, company_address: company.address,
      flouci_enabled: flouci.enabled,
      ...(flouci.app_token ? { flouci_app_token: flouci.app_token } : {}),
      ...(flouci.app_secret ? { flouci_app_secret: flouci.app_secret } : {}),
      virement_enabled: virement.enabled, virement_rib: virement.rib, virement_iban: virement.iban,
      virement_bank_name: virement.bank_name, virement_beneficiary: virement.beneficiary, virement_details: virement.details,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-platform-settings'] }); toast(t('adminPayments.settingsSaved'), 'success'); },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  if (isLoading) return <div className="flex flex-col gap-2"><ListSkeleton rows={3} height="h-20" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-4 w-4 text-gray-400" />
          <p className="font-bold text-gray-900">{t('adminPayments.companyTitle')}</p>
        </div>
        <div className="flex flex-col gap-3">
          <Input label={t('adminPayments.companyName')} value={company.name} onChange={(e) => setCompany((f) => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <Input label={t('adminPayments.companyMf')} placeholder={t('adminPayments.toComplete')} value={company.mf} onChange={(e) => setCompany((f) => ({ ...f, mf: e.target.value }))} />
            <Input label={t('adminPayments.companyRc')} placeholder={t('adminPayments.toComplete')} value={company.rc} onChange={(e) => setCompany((f) => ({ ...f, rc: e.target.value }))} />
          </div>
          <Input label={t('adminPayments.companyAddress')} placeholder={t('adminPayments.toComplete')} value={company.address} onChange={(e) => setCompany((f) => ({ ...f, address: e.target.value }))} />
          <p className="text-xs text-gray-400">{t('adminPayments.companyHint')}</p>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-gray-400" />
          <p className="font-bold text-gray-900">{t('adminPayments.flouciTitle')}</p>
        </div>
        <div className="flex flex-col gap-3">
          <Toggle checked={flouci.enabled} onChange={(v) => setFlouci((f) => ({ ...f, enabled: v }))} label={t('adminPayments.enableFlouci')} />
          <Input label="App Token" placeholder={t('adminPayments.leaveEmptyHint')} type="password" value={flouci.app_token} onChange={(e) => setFlouci((f) => ({ ...f, app_token: e.target.value }))} />
          <Input label="App Secret" placeholder={t('adminPayments.leaveEmptyHint')} type="password" value={flouci.app_secret} onChange={(e) => setFlouci((f) => ({ ...f, app_secret: e.target.value }))} />
          <p className="text-xs text-gray-400">{t('adminPayments.credentialsSecurityHint')}</p>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="h-4 w-4 text-gray-400" />
          <p className="font-bold text-gray-900">{t('adminPayments.bankTransferTitle')}</p>
        </div>
        <div className="flex flex-col gap-3">
          <Toggle checked={virement.enabled} onChange={(v) => setVirement((f) => ({ ...f, enabled: v }))} label={t('adminPayments.enableBankTransfer')} />
          <Input label={t('adminPayments.bank')} value={virement.bank_name} onChange={(e) => setVirement((f) => ({ ...f, bank_name: e.target.value }))} />
          <Input label={t('adminPayments.beneficiary')} value={virement.beneficiary} onChange={(e) => setVirement((f) => ({ ...f, beneficiary: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="RIB" value={virement.rib} onChange={(e) => setVirement((f) => ({ ...f, rib: e.target.value }))} />
            <Input label="IBAN" value={virement.iban} onChange={(e) => setVirement((f) => ({ ...f, iban: e.target.value }))} />
          </div>
          <Input label={t('adminPayments.additionalInstructions')} value={virement.details} onChange={(e) => setVirement((f) => ({ ...f, details: e.target.value }))} />
        </div>
      </Card>

      <Button loading={saveMut.isPending} onClick={() => saveMut.mutate()} className="gap-1.5 self-start"><Save className="h-4 w-4" /> {t('common.save')}</Button>
    </div>
  );
};

const HistoriqueTab = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['admin-payments', status, page], queryFn: () => adminPaymentsApi.list({ status: status || undefined, page, per_page: 30 }) });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-payments'] });
  const validateMut = useMutation({
    mutationFn: (id: string) => adminPaymentsApi.validateVirement(id),
    onSuccess: () => { toast(t('adminPayments.virementValidated'), 'success'); invalidate(); },
    onError: (err) => toast(extractErrors(err), 'error'),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => adminPaymentsApi.rejectVirement(id, rejectReason),
    onSuccess: () => { toast(t('adminPayments.virementRejected'), 'success'); setRejectingId(null); setRejectReason(''); invalidate(); },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  return (
    <div className="flex flex-col gap-3">
      <select className="input w-fit" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">{t('adminPayments.statusAll')}</option>
        <option value="completed">{t('adminPayments.statusCompleted')}</option>
        <option value="pending">{t('adminPayments.statusPending')}</option>
        <option value="failed">{t('adminPayments.statusFailed')}</option>
        <option value="expired">{t('adminPayments.statusExpired')}</option>
      </select>
      <Card>
        {isLoading && <ListSkeleton rows={3} height="h-14" />}
        {data?.data.map((p) => (
          <div key={p.id} className="flex flex-col gap-2 py-2.5 border-b border-gray-50 last:border-0 text-sm">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{p.hotel_name ?? '—'}</p>
                <p className="text-xs text-gray-400">
                  {p.invoice_number ?? '—'} · {p.provider}
                  {p.declared_reference && <> · {t('adminPayments.ref')} {p.declared_reference}</>}
                </p>
              </div>
              <div className="text-end shrink-0 ms-2">
                <p className="font-mono font-semibold">{formatTND(p.amount)}</p>
                <p className={`text-xs font-medium ${p.status === 'completed' ? 'text-green-600' : p.status === 'failed' ? 'text-red-500' : 'text-gray-400'}`}>{p.status}</p>
              </div>
            </div>
            {p.provider === 'virement' && p.status === 'pending' && (
              rejectingId === p.id ? (
                <div className="flex items-end gap-2 rounded-lg p-2" style={{ background: '#F6F5F1' }}>
                  <Input label={t('adminPayments.rejectReason')} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                  <Button size="sm" variant="ghost" loading={rejectMut.isPending} disabled={!rejectReason} onClick={() => rejectMut.mutate(p.id)}>{t('common.confirm')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(''); }}>{t('common.cancel')}</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" loading={validateMut.isPending} onClick={() => validateMut.mutate(p.id)} className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {t('adminPayments.validate')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setRejectingId(p.id)} className="!text-red-600">{t('adminPayments.reject')}</Button>
                </div>
              )
            )}
          </div>
        ))}
        {!isLoading && !data?.data.length && <p className="text-sm text-gray-400 text-center py-6">{t('adminPayments.noPayment')}</p>}
      </Card>
      {data && (
        <Pagination meta={data.meta} currentCount={data.data.length} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => p + 1)} />
      )}
    </div>
  );
};

export const AdminPaymentsPage = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'config' | 'history'>('config');

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="qayed-display text-xl text-gray-900">{t('adminPayments.title')}</h1>
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#DDD9CF' }}>
        <button onClick={() => setTab('config')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'config' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          <Wallet className="h-4 w-4" /> {t('adminPayments.paymentMethods')}
        </button>
        <button onClick={() => setTab('history')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'history' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          <CreditCard className="h-4 w-4" /> {t('adminPayments.history')}
        </button>
      </div>
      {tab === 'config' ? <ConfigTab /> : <HistoriqueTab />}
    </div>
  );
};
