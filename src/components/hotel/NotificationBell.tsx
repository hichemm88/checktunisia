import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { notificationsApi, type AppNotification } from '@/api/notifications';
import { useAuthStore } from '@/stores/authStore';

/**
 * Centre de notifications in-app (parité mobile). Rendu sobre : aucun emoji,
 * aucune icône décorative dans le corps — le type d'événement est véhiculé par
 * la structure du texte et la couleur d'accent (tokens Qayed).
 */
const ACCENT: Record<string, string> = {
  check_in: 'var(--qayed-cachet)',        // cachet
  check_out: 'var(--qayed-conforme)',       // conforme
  fiche_updated: 'var(--qayed-cachet-sombre)',   // cachet sombre/clair
  fiche_cancelled: 'var(--qayed-vigilance)', // vigilance
  fiche_pending: 'var(--qayed-vigilance)',
  manager_message: 'var(--qayed-encre)', // encre
  departure_due: 'var(--qayed-vigilance)',
  quota_warning: 'var(--qayed-vigilance)',   // vigilance — quota 80 %
  quota_reached: 'var(--qayed-vigilance)',   // vigilance — quota atteint
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
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative h-11 w-11 rounded-btn flex items-center justify-center text-qayed-fiche hover:text-qayed-encre hover:bg-qayed-papier transition-colors"
        title={t('notifications.title')}
        aria-label={unread > 0 ? `${t('notifications.title')} (${unread})` : t('notifications.title')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 end-1.5 min-w-[16px] h-4 px-1 rounded-full text-xs font-bold text-white flex items-center justify-center bg-qayed-vigilance-texte"
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
            style={{ border: '1px solid var(--qayed-ligne)' }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--qayed-gris-100)' }}>
              <p className="text-sm font-bold text-gray-900">{t('notifications.title')}</p>
              {unread > 0 && (
                <button
                  onClick={() => readAllMut.mutate()}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: 'var(--qayed-cachet)' }}
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
                    borderBottom: '1px solid var(--qayed-gris-50)',
                    background: n.read_at ? '#fff' : 'rgba(83,70,168,0.03)',
                  }}
                >
                  {/* Pastille d'accent — véhicule le type sans emoji ni icône décorative */}
                  <span
                    className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                    style={{ background: ACCENT[n.type] ?? 'var(--qayed-fiche-faible)', opacity: n.read_at ? 0.35 : 1 }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] leading-snug ${n.read_at ? 'font-medium text-gray-600' : 'font-bold text-gray-900'}`}>
                      {n.title}
                    </span>
                    <span className="block text-xs text-gray-500 leading-snug mt-0.5">{n.body}</span>
                    <span className="block text-xs text-gray-400 mt-1">
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
