import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, MapPin, Calendar, DoorClosed, ExternalLink, Check, Eye,
} from 'lucide-react';
import { authorityApi } from '@/api/authority';
import { type AuthoritySecurityAlert, type WatchlistSeverity, type SecurityAlertStatus } from '@/types';

// Résout la couleur/label du niveau de gravité (repli « moyen »).
const useSeverityConfig = () => {
  const { t } = useTranslation();
  const map: Record<WatchlistSeverity, { label: string; color: string; bg: string }> = {
    critique: { label: t('authorityWatchlist.severityCriticalShort'), color: '#991B1B', bg: '#FEF2F2' },
    eleve:    { label: t('authorityWatchlist.severityHighShort'),     color: '#8A6206', bg: '#FBF0D7' },
    moyen:    { label: t('authorityWatchlist.severityMedium'),        color: '#10222E', bg: '#EEEBFA' },
  };
  return (s: WatchlistSeverity | null) => map[s ?? 'moyen'];
};

const useStatusConfig = () => {
  const { t } = useTranslation();
  const map: Record<SecurityAlertStatus, { label: string; color: string; bg: string }> = {
    new:          { label: t('authoritySecurityAlerts.statusNew'),  color: '#991B1B', bg: '#FEF2F2' },
    seen:         { label: t('authoritySecurityAlerts.statusSeen'), color: '#8A6206', bg: '#FBF0D7' },
    acknowledged: { label: t('authoritySecurityAlerts.statusAcknowledged'), color: '#137453', bg: '#E4F5EC' },
  };
  return (s: SecurityAlertStatus) => map[s];
};

const AlertRow = ({ alert }: { alert: AuthoritySecurityAlert }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const severityCfg = useSeverityConfig();
  const statusCfg = useStatusConfig();
  const locale = i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'en' ? 'en-GB' : 'fr-TN';

  const sev = severityCfg(alert.severity);
  const st = statusCfg(alert.status);

  const seenMutation = useMutation({
    mutationFn: () => authorityApi.markSecurityAlertSeen(alert.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['security-alerts'] }),
  });
  const ackMutation = useMutation({
    mutationFn: () => authorityApi.acknowledgeSecurityAlert(alert.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['security-alerts'] });
      qc.invalidateQueries({ queryKey: ['authority-dashboard'] });
    },
  });

  // Tolère une date nue (YYYY-MM-DD) comme un ISO datetime ; « — » si invalide.
  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T00:00:00' : d);
    return isNaN(parsed.getTime())
      ? '—'
      : parsed.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const fmtDateTime = (d: string | null) => {
    if (!d) return '—';
    const parsed = new Date(d);
    return isNaN(parsed.getTime())
      ? '—'
      : parsed.toLocaleString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const fullName = [alert.guest.last_name, alert.guest.first_name].filter(Boolean).join(', ') || '—';

  // Consulter la fiche voyageur : trace la consultation puis navigue.
  const openProfile = () => {
    if (alert.status === 'new') seenMutation.mutate();
    navigate(`/authority/guests/${alert.guest.id}`);
  };

  return (
    <div
      className="rounded-xl bg-white shadow-sm border overflow-hidden"
      style={{ borderColor: '#E5E7EB', borderLeftWidth: 4, borderLeftColor: sev.color }}
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
        {/* Severity + status chips */}
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-start">
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-black tracking-widest uppercase"
            style={{ color: sev.color, background: sev.bg }}
          >
            {sev.label}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ color: st.color, background: st.bg }}
          >
            {st.label}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900">{fullName}</span>
            {alert.guest.nationality_code && (
              <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">
                {alert.guest.nationality_code}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
            {alert.guest.document_number && (
              <span className="text-xs text-gray-500">
                <span className="text-gray-300">{t('authorityWatchlist.docAbbrev')}</span>{' '}
                <span className="font-mono">{alert.guest.document_number}</span>
              </span>
            )}
            {alert.guest.date_of_birth && (
              <span className="text-xs text-gray-500">
                <span className="text-gray-300">{t('authorityWatchlist.bornOn')}</span> {fmtDate(alert.guest.date_of_birth)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-gray-400" />
              {alert.hotel.name || '—'}
              {alert.hotel.governorate ? ` · ${alert.hotel.governorate}` : ''}
            </span>
            {alert.room_number && (
              <span className="flex items-center gap-1">
                <DoorClosed className="h-3 w-3 text-gray-400" /> {t('checkinWizard.roomShort')} {alert.room_number}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-gray-400" />
              {fmtDate(alert.check_in_date)} → {fmtDate(alert.check_out_date)}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-400">
            {alert.check_in_reference && <span className="font-mono">{alert.check_in_reference}</span>}
            <span>· {fmtDateTime(alert.occurred_at)}</span>
            {alert.organization_name && <span>· {alert.organization_name}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <button
            onClick={openProfile}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ background: '#EEEBFA', color: '#5346A8' }}
          >
            <ExternalLink className="h-3.5 w-3.5" /> {t('authoritySecurityAlerts.viewProfile')}
          </button>
          {alert.status !== 'acknowledged' && (
            <button
              onClick={() => ackMutation.mutate()}
              disabled={ackMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: '#137453' }}
            >
              <Check className="h-3.5 w-3.5" /> {t('authoritySecurityAlerts.acknowledge')}
            </button>
          )}
          {alert.status === 'new' && (
            <button
              onClick={() => seenMutation.mutate()}
              disabled={seenMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" /> {t('authoritySecurityAlerts.markSeen')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Section « Alertes de sécurité actives » affichée en tête de l'onglet
 * Surveillance. N'affiche rien tant qu'aucune alerte active n'existe.
 */
export const SecurityAlertsSection = () => {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['security-alerts', 'active'],
    queryFn: () => authorityApi.getSecurityAlerts({ status: 'active' }),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const alerts = data?.data ?? [];
  if (isLoading || alerts.length === 0) return null;

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: '#FECACA', background: '#FFF7F7' }}>
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="h-4 w-4" style={{ color: '#991B1B' }} />
        <h3 className="text-sm font-bold" style={{ color: '#991B1B' }}>
          {t('authoritySecurityAlerts.activeTitle')}
        </h3>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
          style={{ background: '#DC2626' }}
        >
          {data?.meta.active_count ?? alerts.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {alerts.map((a) => <AlertRow key={a.id} alert={a} />)}
      </div>
    </div>
  );
};
