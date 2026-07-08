import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Download, Trash2 } from 'lucide-react';
import { adminSubscriptionsApi, AdminInvoice } from '@/api/admin/subscriptions';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { formatTND } from '@/lib/money';

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-600',
  void: 'bg-gray-100 text-gray-400',
};
const DEFAULT_STYLE = 'bg-amber-50 text-amber-700';

const STATUS_LABEL_KEY: Record<string, string> = {
  draft: 'adminFacturation.statusDraft',
  sent: 'adminFacturation.statusSent',
  paid: 'adminFacturation.statusPaid',
  overdue: 'adminFacturation.statusOverdue',
  void: 'adminFacturation.statusVoid',
};

interface InvoiceRowProps {
  invoice: AdminInvoice;
  hostId: string;
  /** e.g. the hébergeur name, shown under the invoice number — used by the platform-wide Facturation list. */
  subtitle?: string;
  /** Query key(s) to invalidate after a status change or deletion. */
  invalidateKey: unknown[];
}

/** Shared invoice row — used by AdminHostsPage, AdminSubscriptionsPage, AdminFacturationPage. */
export const InvoiceRow = ({ invoice, hostId, subtitle, invalidateKey }: InvoiceRowProps) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const statusMut = useAdminMutation({
    mutationFn: (newStatus: string) => adminSubscriptionsApi.updateInvoiceForHost(hostId, invoice.id, {
      status: newStatus, paid_at: newStatus === 'paid' ? new Date().toISOString().slice(0, 10) : null,
    }),
    successMessage: t('adminShared.invoiceStatusUpdated'),
    onSuccess: () => qc.invalidateQueries({ queryKey: invalidateKey }),
  });

  const deleteMut = useAdminMutation({
    mutationFn: () => adminSubscriptionsApi.deleteInvoiceForHost(hostId, invoice.id),
    successMessage: t('adminShared.invoiceDeleted'),
    onSuccess: () => qc.invalidateQueries({ queryKey: invalidateKey }),
  });

  return (
    <div className="flex items-center justify-between py-2.5 px-2 border-b border-gray-50 last:border-0 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs font-semibold">{invoice.invoice_number}</p>
        {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
      </div>
      <span className="font-mono text-xs text-gray-500 me-3 shrink-0">{formatTND(invoice.total_amount)}</span>
      <select
        value={invoice.status}
        disabled={statusMut.isPending}
        onChange={(e) => statusMut.mutate(e.target.value)}
        title={t('adminShared.changeStatus')}
        className={`text-xs font-bold px-2 py-0.5 rounded-full me-2 shrink-0 border-0 cursor-pointer appearance-none disabled:opacity-50 ${STATUS_STYLE[invoice.status] ?? DEFAULT_STYLE}`}
      >
        {Object.entries(STATUS_LABEL_KEY).map(([value, labelKey]) => (
          <option key={value} value={value}>{t(labelKey)}</option>
        ))}
      </select>
      <button onClick={() => adminSubscriptionsApi.downloadInvoicePdf(hostId, invoice.id, `facture-${invoice.invoice_number}.pdf`)}
        className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500 shrink-0">
        <Download className="h-3.5 w-3.5" />
      </button>
      {confirmDelete ? (
        <span className="flex items-center gap-2 ms-1 shrink-0 rounded-lg bg-red-50 px-2 py-1">
          <button onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending} className="text-xs font-bold text-red-600 disabled:opacity-50">
            {t('common.confirm')}
          </button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400">{t('common.cancel')}</button>
        </span>
      ) : (
        // Paid invoices can't be deleted (the backend rejects it too) — void them instead.
        invoice.status !== 'paid' && (
          <button onClick={() => setConfirmDelete(true)} title={t('adminShared.deleteInvoice')}
            className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 shrink-0">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )
      )}
    </div>
  );
};
