import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, FileWarning, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { AuthorityLayout } from '@/components/layout/AuthorityLayout';
import { Badge } from '@/components/ui/Badge';
import { authorityApi } from '@/api/authority';
import { AuthorityAlert } from '@/types';

// Urgency color by days remaining
const urgencyStyle = (days: number): { bg: string; text: string; border: string } => {
  if (days <= 7)  return { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' };
  if (days <= 15) return { bg: '#FFF8EE', text: '#C8943A', border: '#FCD38C' };
  return           { bg: '#F0FDF4', text: '#16A34A', border: '#86EFAC' };
};

const AlertCard = ({ alert, onClick }: { alert: AuthorityAlert; onClick: () => void }) => {
  const style = urgencyStyle(alert.days_until_expiry);
  const docTypeLabel: Record<string, string> = {
    passport: 'Passeport', national_id: 'CNI', travel_document: 'Titre de voyage', visa: 'Visa',
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between gap-4 rounded-2xl p-4 text-left w-full transition-shadow hover:shadow-md"
      style={{ background: style.bg, border: `1px solid ${style.border}` }}
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Urgency indicator */}
        <div
          className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl"
          style={{ background: `${style.text}18` }}
        >
          <span className="text-lg font-black leading-none" style={{ color: style.text }}>
            {alert.days_until_expiry}
          </span>
          <span className="text-[9px] font-medium" style={{ color: style.text }}>jours</span>
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {alert.guest_name ?? 'Voyageur inconnu'}
            {alert.nationality_code && (
              <span className="ml-2 text-xs font-normal text-gray-500">· {alert.nationality_code}</span>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <FileWarning className="h-3 w-3" />
              {docTypeLabel[alert.document_type] ?? alert.document_type} · {alert.document_number}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              Expire le {alert.expiry_date}
            </span>
          </div>

          {alert.hotel && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {alert.hotel.name}
                {alert.hotel.city ? `, ${alert.hotel.city}` : ''}
                {alert.room_number ? ` · Ch. ${alert.room_number}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={alert.days_until_expiry <= 7 ? 'cancelled' : alert.days_until_expiry <= 15 ? 'draft' : 'active'}>
          {alert.days_until_expiry <= 7 ? 'Urgent' : alert.days_until_expiry <= 15 ? 'Attention' : 'À surveiller'}
        </Badge>
        <ChevronRight className="h-4 w-4 text-gray-300" />
      </div>
    </button>
  );
};

export const AlertsPage = () => {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['authority-alerts'],
    queryFn: () => authorityApi.getAlerts(),
    staleTime: 5 * 60 * 1000,
  });

  const alerts = data?.data ?? [];
  const urgent  = alerts.filter((a) => a.days_until_expiry <= 7);
  const warning = alerts.filter((a) => a.days_until_expiry > 7 && a.days_until_expiry <= 15);
  const watch   = alerts.filter((a) => a.days_until_expiry > 15);

  const Section = ({ title, items, color }: { title: string; items: AuthorityAlert[]; color: string }) =>
    items.length === 0 ? null : (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: color }} />
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {title} ({items.length})
          </p>
        </div>
        {items.map((alert) => (
          <AlertCard
            key={alert.doc_id}
            alert={alert}
            onClick={() => navigate(`/authority/guests/${alert.guest_id}`)}
          />
        ))}
      </div>
    );

  return (
    <AuthorityLayout title="Alertes — Documents expirants">
      <div className="flex flex-col gap-6">

        {/* Summary banner */}
        {!isLoading && !isError && (
          <div
            className="flex items-center gap-4 rounded-2xl px-5 py-4"
            style={{ background: alerts.length > 0 ? '#FFF8EE' : '#F0FDF4', border: `1px solid ${alerts.length > 0 ? '#FCD38C' : '#86EFAC'}` }}
          >
            <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: alerts.length > 0 ? '#C8943A' : '#16A34A' }} />
            <div>
              <p className="font-semibold" style={{ color: alerts.length > 0 ? '#92620A' : '#15803D' }}>
                {alerts.length === 0
                  ? 'Aucun document n'expire dans les 30 prochains jours.'
                  : `${alerts.length} document${alerts.length > 1 ? 's' : ''} expirant dans les 30 prochains jours`}
              </p>
              {data?.meta.governorate && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Zone : {data.meta.governorate}
                </p>
              )}
              {data?.meta.is_national && (
                <p className="text-xs text-gray-500 mt-0.5">Périmètre national</p>
              )}
            </div>
          </div>
        )}

        {isLoading && [1,2,3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
        ))}

        {isError && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
            <p className="text-red-600 font-medium">Impossible de charger les alertes.</p>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <Section title="Urgents (≤ 7 jours)"    items={urgent}  color="#DC2626" />
            <Section title="Attention (≤ 15 jours)"  items={warning} color="#C8943A" />
            <Section title="À surveiller (≤ 30 jours)" items={watch}   color="#16A34A" />
            {alerts.length === 0 && (
              <div className="py-16 text-center">
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: '#EEF3FC' }}
                >
                  <AlertTriangle className="h-8 w-8" style={{ color: '#1B3A5F' }} />
                </div>
                <p className="text-gray-500">Tout est en ordre.</p>
                <p className="text-sm text-gray-400 mt-1">Aucun document n'expire dans les 30 prochains jours.</p>
              </div>
            )}
          </>
        )}
      </div>
    </AuthorityLayout>
  );
};
