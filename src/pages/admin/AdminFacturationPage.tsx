import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { adminSubscriptionsApi } from '@/api/admin/subscriptions';
import { adminHostsApi } from '@/api/admin/hosts';
import { InvoiceRow } from '@/components/admin/InvoiceRow';
import { ListSkeleton } from '@/components/admin/ListSkeleton';
import { Pagination } from '@/components/ui/Pagination';
import { formatTND } from '@/lib/money';

const STATUS_OPTIONS = [
  { value: '', labelKey: 'adminFacturation.statusAll' },
  { value: 'draft', labelKey: 'adminFacturation.statusDraft' },
  { value: 'sent', labelKey: 'adminFacturation.statusSent' },
  { value: 'paid', labelKey: 'adminFacturation.statusPaid' },
  { value: 'overdue', labelKey: 'adminFacturation.statusOverdue' },
  { value: 'void', labelKey: 'adminFacturation.statusVoid' },
];

export const AdminFacturationPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [hostSearch, setHostSearch] = useState('');
  const [selectedHost, setSelectedHost] = useState<{ id: string; name: string } | null>(null);

  const { data: hostResults } = useQuery({
    queryKey: ['admin-hosts-search-facturation', hostSearch],
    queryFn: () => adminHostsApi.list({ search: hostSearch || undefined, per_page: 6 }),
    enabled: hostSearch.length >= 2,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-all-invoices', status, page, selectedHost?.id],
    queryFn: () => adminSubscriptionsApi.allInvoices({ status: status || undefined, organization_id: selectedHost?.id, page, per_page: 20 }),
  });

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <h1 className="qayed-display text-xl text-gray-900">{t('adminFacturation.title')}</h1>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input ps-9 w-64"
            placeholder={t('adminFacturation.filterByHost')}
            value={selectedHost ? selectedHost.name : hostSearch}
            onChange={(e) => { setHostSearch(e.target.value); setSelectedHost(null); setPage(1); }}
          />
          {selectedHost && (
            <button onClick={() => { setSelectedHost(null); setHostSearch(''); setPage(1); }} className="absolute end-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
              ✕
            </button>
          )}
          {!selectedHost && hostResults?.data?.length ? (
            <div className="absolute z-20 mt-1 w-64 rounded-xl border border-gray-100 bg-white shadow-lg">
              {hostResults.data.map((h) => (
                <button key={h.id} className="flex w-full items-center px-3 py-2 text-start text-sm hover:bg-warm-100"
                  onClick={() => { setSelectedHost({ id: h.id, name: h.name }); setHostSearch(''); setPage(1); }}>
                  {h.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <select className="input w-fit" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
        </select>
      </div>

      <div className="card p-2">
        {isLoading && <ListSkeleton rows={4} height="h-10" />}
        {data?.data.map((inv) => (
          inv.organization ? (
            <div key={inv.id} className={inv.id === highlightId ? 'rounded-xl ring-2 ring-[--qayed-cachet] bg-warm-100' : ''}>
              <InvoiceRow
                hostId={inv.organization.id}
                invoice={inv}
                subtitle={inv.organization.name}
                invalidateKey={['admin-all-invoices']}
              />
            </div>
          ) : (
            <div key={inv.id} className="flex items-center justify-between py-2.5 px-2 border-b border-gray-50 last:border-0 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs font-semibold">{inv.invoice_number}</p>
                <p className="text-xs text-gray-400 truncate">{inv.hotel_name ?? '—'}</p>
              </div>
              <span className="font-mono text-xs text-gray-500 me-3">{formatTND(inv.total_amount)}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{inv.status}</span>
            </div>
          )
        ))}
        {!isLoading && !data?.data.length && <p className="text-sm text-gray-400 text-center py-6">{t('adminFacturation.noInvoice')}</p>}
      </div>

      {data && (
        <Pagination meta={data.meta} currentCount={data.data.length} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
      )}
    </div>
  );
};
