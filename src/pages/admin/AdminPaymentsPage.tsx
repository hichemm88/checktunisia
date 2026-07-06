import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Landmark, Save, Wallet } from 'lucide-react';
import { adminPaymentsApi } from '@/api/admin/payments';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';
import { ListSkeleton } from '@/components/admin/ListSkeleton';
import { Pagination } from '@/components/ui/Pagination';

const C = { navy: '#1B3A5F' };

const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <div onClick={() => onChange(!checked)} className="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0" style={{ background: checked ? C.navy : '#d1d5db' }}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200" style={{ transform: checked ? 'translateX(20px)' : 'none' }} />
    </div>
    <span className="text-sm font-semibold text-gray-700">{label}</span>
  </label>
);

const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const ConfigTab = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery({ queryKey: ['admin-platform-settings'], queryFn: adminPaymentsApi.getSettings });

  const [flouci, setFlouci] = useState({ enabled: false, app_token: '', app_secret: '' });
  const [virement, setVirement] = useState({ enabled: true, rib: '', iban: '', bank_name: '', beneficiary: '', details: '' });
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setFlouci({ enabled: settings.flouci_enabled, app_token: '', app_secret: '' });
    setVirement({
      enabled: settings.virement_enabled, rib: settings.virement_rib ?? '', iban: settings.virement_iban ?? '',
      bank_name: settings.virement_bank_name ?? '', beneficiary: settings.virement_beneficiary ?? '', details: settings.virement_details ?? '',
    });
    setInitialized(true);
  }

  const saveMut = useMutation({
    mutationFn: () => adminPaymentsApi.updateSettings({
      flouci_enabled: flouci.enabled,
      ...(flouci.app_token ? { flouci_app_token: flouci.app_token } : {}),
      ...(flouci.app_secret ? { flouci_app_secret: flouci.app_secret } : {}),
      virement_enabled: virement.enabled, virement_rib: virement.rib, virement_iban: virement.iban,
      virement_bank_name: virement.bank_name, virement_beneficiary: virement.beneficiary, virement_details: virement.details,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-platform-settings'] }); toast('Paramètres enregistrés', 'success'); },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  if (isLoading) return <div className="flex flex-col gap-2"><ListSkeleton rows={3} height="h-20" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-gray-400" />
          <p className="font-bold text-gray-900">Flouci (paiement en ligne)</p>
        </div>
        <div className="flex flex-col gap-3">
          <Toggle checked={flouci.enabled} onChange={(v) => setFlouci((f) => ({ ...f, enabled: v }))} label="Activer Flouci" />
          <Input label="App Token" placeholder="Laisser vide pour ne pas changer" type="password" value={flouci.app_token} onChange={(e) => setFlouci((f) => ({ ...f, app_token: e.target.value }))} />
          <Input label="App Secret" placeholder="Laisser vide pour ne pas changer" type="password" value={flouci.app_secret} onChange={(e) => setFlouci((f) => ({ ...f, app_secret: e.target.value }))} />
          <p className="text-xs text-gray-400">Par sécurité, les identifiants déjà enregistrés ne sont jamais réaffichés — laissez ces champs vides si vous ne voulez pas les changer.</p>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="h-4 w-4 text-gray-400" />
          <p className="font-bold text-gray-900">Virement bancaire</p>
        </div>
        <div className="flex flex-col gap-3">
          <Toggle checked={virement.enabled} onChange={(v) => setVirement((f) => ({ ...f, enabled: v }))} label="Activer le virement" />
          <Input label="Banque" value={virement.bank_name} onChange={(e) => setVirement((f) => ({ ...f, bank_name: e.target.value }))} />
          <Input label="Bénéficiaire" value={virement.beneficiary} onChange={(e) => setVirement((f) => ({ ...f, beneficiary: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="RIB" value={virement.rib} onChange={(e) => setVirement((f) => ({ ...f, rib: e.target.value }))} />
            <Input label="IBAN" value={virement.iban} onChange={(e) => setVirement((f) => ({ ...f, iban: e.target.value }))} />
          </div>
          <Input label="Instructions complémentaires" value={virement.details} onChange={(e) => setVirement((f) => ({ ...f, details: e.target.value }))} />
        </div>
      </Card>

      <Button loading={saveMut.isPending} onClick={() => saveMut.mutate()} className="gap-1.5 self-start"><Save className="h-4 w-4" /> Enregistrer</Button>
    </div>
  );
};

const HistoriqueTab = () => {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['admin-payments', status, page], queryFn: () => adminPaymentsApi.list({ status: status || undefined, page, per_page: 30 }) });

  return (
    <div className="flex flex-col gap-3">
      <select className="input w-fit" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">Tous les statuts</option>
        <option value="completed">Complétés</option>
        <option value="pending">En attente</option>
        <option value="failed">Échoués</option>
        <option value="expired">Expirés</option>
      </select>
      <Card>
        {isLoading && <ListSkeleton rows={3} height="h-14" />}
        {data?.data.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{p.hotel_name ?? '—'}</p>
              <p className="text-xs text-gray-400">{p.invoice_number ?? '—'} · {p.provider}</p>
            </div>
            <div className="text-right shrink-0 ml-2">
              <p className="font-semibold">{p.amount} {p.currency}</p>
              <p className={`text-xs font-medium ${p.status === 'completed' ? 'text-green-600' : p.status === 'failed' ? 'text-red-500' : 'text-gray-400'}`}>{p.status}</p>
            </div>
          </div>
        ))}
        {!isLoading && !data?.data.length && <p className="text-sm text-gray-400 text-center py-6">Aucun paiement</p>}
      </Card>
      {data && (
        <Pagination meta={data.meta} currentCount={data.data.length} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => p + 1)} />
      )}
    </div>
  );
};

export const AdminPaymentsPage = () => {
  const [tab, setTab] = useState<'config' | 'history'>('config');

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">Paiements</h1>
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#E0DDD7' }}>
        <button onClick={() => setTab('config')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'config' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          <Wallet className="h-4 w-4" /> Moyens de paiement
        </button>
        <button onClick={() => setTab('history')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'history' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          <CreditCard className="h-4 w-4" /> Historique
        </button>
      </div>
      {tab === 'config' ? <ConfigTab /> : <HistoriqueTab />}
    </div>
  );
};
