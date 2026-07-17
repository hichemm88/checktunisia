import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Send, Pause, Play, AlertTriangle, Image as ImageIcon, ImageOff } from 'lucide-react';
import {
  adminWhatsappApi,
  WhatsappHealth,
  WhatsappLog,
  WhatsappSession,
  WhatsappStatus,
} from '@/api/admin/whatsapp';
import { adminHotelsApi } from '@/api/admin/hotels';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { ListSkeleton } from '@/components/admin/ListSkeleton';
import { EmptyState } from '@/components/admin/EmptyState';
import { useAdminMutation } from '@/hooks/useAdminMutation';

/*
 * MODULE PROVISOIRE — à retirer après homologation MI.
 * Voir PROMPT-CLAUDE-CODE-QAYED-AUTORITE.md
 */

const dateLocaleFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-FR');

const STATUS_VARIANT: Record<WhatsappStatus, 'active' | 'draft' | 'suspended' | 'cancelled'> = {
  sent: 'active',
  pending: 'draft',
  failed: 'suspended',
  cancelled: 'cancelled',
};

const SESSION_STYLE: Record<WhatsappSession, { dot: string; key: string }> = {
  ready:        { dot: 'bg-green-500', key: 'ready' },
  initializing: { dot: 'bg-amber-400', key: 'initializing' },
  disconnected: { dot: 'bg-red-500',   key: 'disconnected' },
  auth_failure: { dot: 'bg-red-500',   key: 'authFailure' },
};

const HealthPanel = ({ health }: { health: WhatsappHealth }) => {
  const { t, i18n } = useTranslation();
  const locale = dateLocaleFor(i18n.language);
  const qc = useQueryClient();
  const session = SESSION_STYLE[health.session] ?? SESSION_STYLE.initializing;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-whatsapp-health'] });
    qc.invalidateQueries({ queryKey: ['admin-whatsapp-logs'] });
  };

  const pauseM = useAdminMutation({
    mutationFn: () => adminWhatsappApi.pause(),
    successMessage: t('adminWhatsapp.toast.paused'),
    onSuccess: invalidate,
  });
  const resumeM = useAdminMutation({
    mutationFn: () => adminWhatsappApi.resume(),
    successMessage: t('adminWhatsapp.toast.resumed'),
    onSuccess: invalidate,
  });
  const testM = useAdminMutation({
    mutationFn: () => adminWhatsappApi.test(),
    successMessage: t('adminWhatsapp.toast.testSent'),
    onSuccess: invalidate,
  });
  const resendAllM = useAdminMutation({
    mutationFn: () => adminWhatsappApi.resendAll(),
    successMessage: t('adminWhatsapp.toast.resentAll'),
    onSuccess: invalidate,
  });

  const stat = (label: string, value: number, color: string) => (
    <div className="flex flex-col items-center rounded-xl bg-warm-100 px-4 py-2 min-w-[72px]">
      <span className={`text-lg font-bold ${color}`}>{value}</span>
      <span className="text-[11px] font-medium text-gray-500">{label}</span>
    </div>
  );

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${session.dot}`} />
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {t(`adminWhatsapp.session.${session.key}`)}
              {health.paused && (
                <span className="ms-2 align-middle"><Badge variant="expired">{t('adminWhatsapp.pausedTag')}</Badge></span>
              )}
            </p>
            {health.reason && <p className="text-xs text-gray-400">{health.reason}</p>}
          </div>
        </div>
        <Badge variant={health.enabled ? 'active' : 'cancelled'}>
          {health.enabled ? t('adminWhatsapp.enabled') : t('adminWhatsapp.disabled')}
        </Badge>
      </div>

      {!health.enabled && (
        <div className="flex items-start gap-2 rounded-xl bg-[--qayed-vigilance-fond] px-3 py-2 text-xs text-[--qayed-vigilance-texte]">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{t('adminWhatsapp.disabledHint')}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {stat(t('adminWhatsapp.queue.pending'), health.queue.pending, 'text-qayed-cachet')}
        {stat(t('adminWhatsapp.queue.sent'), health.queue.sent, 'text-green-600')}
        {stat(t('adminWhatsapp.queue.failed'), health.queue.failed, 'text-red-600')}
        {stat(t('adminWhatsapp.queue.cancelled'), health.queue.cancelled, 'text-gray-500')}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {health.paused ? (
          <Button size="sm" variant="primary" onClick={() => resumeM.mutate()} loading={resumeM.isPending}>
            <Play className="h-4 w-4" /> {t('adminWhatsapp.resume')}
          </Button>
        ) : (
          <Button size="sm" variant="danger" onClick={() => pauseM.mutate()} loading={pauseM.isPending}>
            <Pause className="h-4 w-4" /> {t('adminWhatsapp.pause')}
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => testM.mutate()} loading={testM.isPending} disabled={!health.enabled}>
          <Send className="h-4 w-4" /> {t('adminWhatsapp.sendTest')}
        </Button>
        {health.queue.failed > 0 && (
          <Button size="sm" variant="secondary" onClick={() => resendAllM.mutate()} loading={resendAllM.isPending}>
            <RefreshCw className="h-4 w-4" /> {t('adminWhatsapp.resendAll', { n: health.queue.failed })}
          </Button>
        )}
        {health.last_ready_at && (
          <span className="ms-auto text-xs text-gray-400">
            {t('adminWhatsapp.lastReady')}: {new Date(health.last_ready_at).toLocaleString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </Card>
  );
};

const LogRow = ({ log }: { log: WhatsappLog }) => {
  const { t, i18n } = useTranslation();
  const locale = dateLocaleFor(i18n.language);
  const qc = useQueryClient();

  const resendM = useAdminMutation({
    mutationFn: () => adminWhatsappApi.resend(log.id),
    successMessage: t('adminWhatsapp.toast.resent'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-whatsapp-logs'] });
      qc.invalidateQueries({ queryKey: ['admin-whatsapp-health'] });
    },
  });

  const canResend = log.status === 'failed' || log.status === 'cancelled';

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="mt-0.5"><Badge variant={STATUS_VARIANT[log.status]}>{t(`adminWhatsapp.status.${log.status}`)}</Badge></div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm text-gray-800">
          <span className="font-semibold">{log.is_test ? t('adminWhatsapp.testLabel') : (log.guest ?? '—')}</span>
          {log.hotel && <span className="text-xs text-gray-400">· {log.hotel}</span>}
          {!log.is_test && (
            log.has_photo
              ? <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-green-600" title={t('adminWhatsapp.photoAttached')}><ImageIcon className="h-3 w-3" />{t('adminWhatsapp.photoAttached')}</span>
              : <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-600" title={t('adminWhatsapp.noPhoto')}><ImageOff className="h-3 w-3" />{t('adminWhatsapp.noPhoto')}</span>
          )}
        </p>
        <p className="text-xs text-gray-400">
          {new Date(log.queued_at).toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          {log.attempts > 0 && <span> · {t('adminWhatsapp.attempts', { n: log.attempts })}</span>}
        </p>
        {log.last_error && <p className="text-xs text-red-500 truncate" title={log.last_error}>{log.last_error}</p>}
      </div>
      {canResend && (
        <Button size="sm" variant="ghost" onClick={() => resendM.mutate()} loading={resendM.isPending}>
          <RefreshCw className="h-4 w-4" /> {t('adminWhatsapp.resend')}
        </Button>
      )}
    </div>
  );
};

export const AdminWhatsappPage = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [hotelId, setHotelId] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: health } = useQuery({
    queryKey: ['admin-whatsapp-health'],
    queryFn: () => adminWhatsappApi.health(),
    refetchInterval: 15000,
  });

  const { data: hotels } = useQuery({
    queryKey: ['admin-whatsapp-hotels'],
    queryFn: () => adminHotelsApi.list({ per_page: 200 }),
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-whatsapp-logs', page, hotelId, status, dateFrom, dateTo],
    queryFn: () => adminWhatsappApi.logs({
      page,
      per_page: 25,
      hotel_id: hotelId || undefined,
      status: status || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
  });

  const resetPage = () => setPage(1);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <h1 className="qayed-display text-xl text-gray-900">{t('adminWhatsapp.title')}</h1>
        <Badge variant="draft">{t('adminWhatsapp.provisional')}</Badge>
      </div>
      <p className="text-sm text-gray-500 -mt-2">{t('adminWhatsapp.subtitle')}</p>

      {health && <HealthPanel health={health} />}

      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-fit" value={hotelId} onChange={(e) => { setHotelId(e.target.value); resetPage(); }}>
          <option value="">{t('adminWhatsapp.allProperties')}</option>
          {hotels?.data.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select className="input w-fit" value={status} onChange={(e) => { setStatus(e.target.value); resetPage(); }}>
          <option value="">{t('adminWhatsapp.allStatuses')}</option>
          {(['pending', 'sent', 'failed', 'cancelled'] as const).map((s) => (
            <option key={s} value={s}>{t(`adminWhatsapp.status.${s}`)}</option>
          ))}
        </select>
        <input type="date" className="input w-fit" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); resetPage(); }} aria-label={t('adminWhatsapp.dateFrom')} />
        <input type="date" className="input w-fit" value={dateTo} onChange={(e) => { setDateTo(e.target.value); resetPage(); }} aria-label={t('adminWhatsapp.dateTo')} />
      </div>

      <Card>
        {isLoading && <ListSkeleton rows={4} />}
        {logs?.data.map((log) => <LogRow key={log.id} log={log} />)}
        {!isLoading && !logs?.data.length && (
          <EmptyState title={t('adminWhatsapp.empty')} hint={t('adminWhatsapp.emptyHint')} />
        )}
      </Card>

      {logs && (
        <Pagination
          meta={{ total: logs.meta.total, current_page: logs.meta.current_page, per_page: logs.meta.per_page }}
          currentCount={logs.data.length}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </div>
  );
};
