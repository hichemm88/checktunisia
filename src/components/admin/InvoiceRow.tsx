import { useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { adminSubscriptionsApi, AdminInvoice } from '@/api/admin/subscriptions';
import { useAdminMutation } from '@/hooks/useAdminMutation';

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-600',
  void: 'bg-gray-100 text-gray-400',
};
const DEFAULT_STYLE = 'bg-amber-50 text-amber-700';

interface InvoiceRowProps {
  invoice: AdminInvoice;
  hostId: string;
  /** e.g. the hébergeur name, shown under the invoice number — used by the platform-wide Facturation list. */
  subtitle?: string;
  /** Query key(s) to invalidate after marking the invoice paid. */
  invalidateKey: unknown[];
}

/** Shared invoice row — used by AdminHostsPage, AdminSubscriptionsPage, AdminFacturationPage. */
export const InvoiceRow = ({ invoice, hostId, subtitle, invalidateKey }: InvoiceRowProps) => {
  const qc = useQueryClient();

  const statusMut = useAdminMutation({
    mutationFn: (newStatus: string) => adminSubscriptionsApi.updateInvoiceForHost(hostId, invoice.id, {
      status: newStatus, paid_at: newStatus === 'paid' ? new Date().toISOString().slice(0, 10) : undefined,
    }),
    successMessage: 'Facture marquée payée',
    onSuccess: () => qc.invalidateQueries({ queryKey: invalidateKey }),
  });

  return (
    <div className="flex items-center justify-between py-2.5 px-2 border-b border-gray-50 last:border-0 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs font-semibold">{invoice.invoice_number}</p>
        {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
      </div>
      <span className="text-xs text-gray-500 mr-3 shrink-0">{invoice.total_amount} {invoice.currency}</span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-3 shrink-0 ${STATUS_STYLE[invoice.status] ?? DEFAULT_STYLE}`}>
        {invoice.status}
      </span>
      {invoice.status !== 'paid' && invoice.status !== 'void' && (
        <button onClick={() => statusMut.mutate('paid')} className="text-xs font-semibold text-green-600 mr-3 shrink-0">
          Marquer payée
        </button>
      )}
      <button onClick={() => adminSubscriptionsApi.downloadInvoicePdf(hostId, invoice.id, `facture-${invoice.invoice_number}.pdf`)}
        className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500 shrink-0">
        <Download className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
