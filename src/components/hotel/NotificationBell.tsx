import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { notificationsApi, AppNotification } from '@/api/notifications';
import { useAuthStore } from '@/stores/authStore';

/**
 * Centre de notifications in-app (parité mobile). Rendu sobre : aucun emoji,
 * aucune icône décorative dans le corps — le type d'événement est véhiculé par
 * la structure du texte et la couleur d'accent (tokens Qayed).
 */
const ACCENT: Record<string, string> = {
  check_in: '#5346A8',        // cachet
  check_out: '#1F9D6B',       // conforme
  fiche_updated: '#8B7FE0',   // cachet sombre/clair
  fiche_cancelled: '#E3A008', // vigilance
  fiche_pending: '#E3A008',
  manager_message: '#10222E', // encre
  departure_due: '#E3A008',
};

const timeAgo = (iso: string, locale: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return rtf.format(-mins, 'minute');
  const hours = Math.round(mins / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.round(hours / 24), 'day');
};

export const NotificationBell = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'en' ? 'en-GB' : 'fr-FR';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { activePropertyId, setActiveProperty } = useAuthStore();
  const [open, setOpen] = useState(false);

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ per_page: 20 }),
    enabled: open,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notifications-unread'] });
  };

  const markReadMut = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: invalidate });
  const readAllMut  = useMutation({ mutationFn: notificationsApi.readAll,  onSuccess: invalidate });

  const openNotification = (n: AppNotification) => {
    if (!n.read_at) markReadMut.mutate(n.id);
    setOpen(false);
    if (n.check_in_id) {
      // Bascule automatique d'établissement si la fiche appartient à une autre propriété
      if (n.property_id && n.property_id !== activePropertyId) {
        setActiveProperty(n.property_id, n.property_name ?? '');
      }
      navigate(`/hotel/history/${n.check_in_id}`);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative h-9 w-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        title={t('notifications.title')}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span
            className="absolute top-0.5 end-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
            style={{ background: '#E3A008' }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop — ferme au clic extérieur */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* fixed par rapport au viewport (pas au bouton) : sur mobile la cloche est
              près du bord droit et un panneau ancré `absolute end-0` déborde hors écran. */}
          <div
            className="fixed end-3 top-[72px] z-50 w-[340px] max-w-[calc(100vw-24px)] rounded-2xl bg-white shadow-lg overflow-hidden"
            style={{ border: '1px solid #DDD9CF' }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <p className="text-sm font-bold text-gray-900">{t('notifications.title')}</p>
              {unread > 0 && (
                <button
                  onClick={() => readAllMut.mutate()}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: '#5346A8' }}
                >
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'min(420px, calc(100vh - 160px))' }}>
              {isLoading && <div className="h-20 animate-pulse bg-gray-50 m-3 rounded-xl" />}

              {!isLoading && !data?.data.length && (
                <p className="text-sm text-gray-400 text-center py-10">{t('notifications.empty')}</p>
              )}

              {data?.data.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className="flex w-full items-start gap-2.5 px-4 py-3 text-start hover:bg-warm-100 transition-colors"
                  style={{
                    borderBottom: '1px solid #F9FAFB',
                    background: n.read_at ? '#fff' : 'rgba(83,70,168,0.03)',
                  }}
                >
                  {/* Pastille d'accent — véhicule le type sans emoji ni icône décorative */}
                  <span
                    className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                    style={{ background: ACCENT[n.type] ?? '#9CA3AF', opacity: n.read_at ? 0.35 : 1 }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] leading-snug ${n.read_at ? 'font-medium text-gray-600' : 'font-bold text-gray-900'}`}>
                      {n.title}
                    </span>
                    <span className="block text-xs text-gray-500 leading-snug mt-0.5">{n.body}</span>
                    <span className="block text-[11px] text-gray-400 mt-1">
                      {timeAgo(n.created_at, locale)}
                      {n.property_name ? ` · ${n.property_name}` : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
