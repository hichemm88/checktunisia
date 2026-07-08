import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { adminActivityApi } from '@/api/admin/activity';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { ListSkeleton } from '@/components/admin/ListSkeleton';

const dateLocaleFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-FR');

const ACTION_KEYS: Record<string, string> = {
  'hotel.created': 'adminActivity.action.hotelCreated',
  'hotel.updated': 'adminActivity.action.hotelUpdated',
  'hotel.suspended': 'adminActivity.action.hotelSuspended',
  'hotel.activated': 'adminActivity.action.hotelActivated',
  'hotel.deleted': 'adminActivity.action.hotelDeleted',
  'organization.created': 'adminActivity.action.organizationCreated',
  'organization.updated': 'adminActivity.action.organizationUpdated',
  'organization.suspended': 'adminActivity.action.organizationSuspended',
  'organization.activated': 'adminActivity.action.organizationActivated',
  'organization.deleted': 'adminActivity.action.organizationDeleted',
  'user.created': 'adminActivity.action.userCreated',
  'user.updated': 'adminActivity.action.userUpdated',
  'user.deleted': 'adminActivity.action.userDeleted',
  'user.invite_resent': 'adminActivity.action.userInviteResent',
  'user.login': 'adminActivity.action.userLogin',
  'user.logout': 'adminActivity.action.userLogout',
  'authority_user.created': 'adminActivity.action.authorityUserCreated',
  'authority_user.updated': 'adminActivity.action.authorityUserUpdated',
  'authority_user.deleted': 'adminActivity.action.authorityUserDeleted',
  'authority_organization.created': 'adminActivity.action.authorityOrgCreated',
  'authority_organization.updated': 'adminActivity.action.authorityOrgUpdated',
  'authority_organization.deleted': 'adminActivity.action.authorityOrgDeleted',
  'subscription.activated': 'adminActivity.action.subscriptionActivated',
  'subscription.reminder_sent': 'adminActivity.action.subscriptionReminderSent',
  'subscription.trial_reminder_sent': 'adminActivity.action.trialReminderSent',
  'subscription.trial_expired': 'adminActivity.action.trialExpired',
  'subscription.expired': 'adminActivity.action.subscriptionExpired',
  'invoice.updated': 'adminActivity.action.invoiceUpdated',
  'check_in.created': 'adminActivity.action.checkinCreated',
  'check_in.updated': 'adminActivity.action.checkinUpdated',
  'check_in.completed': 'adminActivity.action.checkinCompleted',
  'check_in.checked_out': 'adminActivity.action.checkinCheckedOut',
  'check_in.cancelled': 'adminActivity.action.checkinCancelled',
  'check_in.deleted': 'adminActivity.action.checkinDeleted',
  'guest.added': 'adminActivity.action.guestAdded',
  'guest.updated': 'adminActivity.action.guestUpdated',
  'guest.removed': 'adminActivity.action.guestRemoved',
  'room.created': 'adminActivity.action.roomCreated',
  'room.updated': 'adminActivity.action.roomUpdated',
  'room.deleted': 'adminActivity.action.roomDeleted',
  'scan.uploaded': 'adminActivity.action.scanUploaded',
  'organization.registered': 'adminActivity.action.organizationRegistered',
  'authority.hotel_viewed': 'adminActivity.action.authorityHotelViewed',
  'payment.initiated': 'adminActivity.action.paymentInitiated',
  'payment.completed': 'adminActivity.action.paymentCompleted',
  'payment.virement_declared': 'adminActivity.action.virementDeclared',
  'payment.virement_validated': 'adminActivity.action.virementValidated',
  'payment.virement_rejected': 'adminActivity.action.virementRejected',
  'profile.updated': 'adminActivity.action.profileUpdated',
  'profile.password_changed': 'adminActivity.action.profilePasswordChanged',
  'auth.2fa_enabled': 'adminActivity.action.twoFaEnabled',
  'auth.2fa_disabled': 'adminActivity.action.twoFaDisabled',
  'auth.2fa_verified': 'adminActivity.action.twoFaVerified',
  'auth.2fa_failed': 'adminActivity.action.twoFaFailed',
  'watchlist.entry_added': 'adminActivity.action.watchlistEntryAdded',
  'watchlist.entry_updated': 'adminActivity.action.watchlistEntryUpdated',
  'watchlist.entry_removed': 'adminActivity.action.watchlistEntryRemoved',
  'watchlist.import': 'adminActivity.action.watchlistImport',
  'watchlist.hits_viewed': 'adminActivity.action.watchlistHitsViewed',
  'watchlist.hit_acknowledged': 'adminActivity.action.watchlistHitAcknowledged',
};

export const AdminActivityPage = () => {
  const { t, i18n } = useTranslation();
  const locale = dateLocaleFor(i18n.language);
  const actionLabel = (action: string) => action in ACTION_KEYS ? t(ACTION_KEYS[action]) : action.replace(/[._]/g, ' ');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [actor, setActor] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-activity', page, action, actor?.id],
    queryFn: () => adminActivityApi.list({ page, per_page: 30, action: action || undefined, actor_id: actor?.id }),
  });

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="qayed-display text-xl text-gray-900">{t('adminActivity.title')}</h1>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <select className="input w-fit" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">{t('adminActivity.allActions')}</option>
          {Object.keys(ACTION_KEYS).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        {actor && (
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'var(--qayed-cachet-dilue)', color: 'var(--qayed-cachet)' }}>
            {t('adminActivity.filteredByAgent', { name: actor.name })}
            <button onClick={() => { setActor(null); setPage(1); }} className="hover:opacity-70"><X className="h-3 w-3" /></button>
          </span>
        )}
      </div>

      <Card>
        {isLoading && <ListSkeleton rows={3} />}
        {data?.data.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold mt-0.5" style={{ background: 'var(--qayed-cachet-dilue)', color: 'var(--qayed-cachet)' }}>
              {entry.actor?.first_name?.[0] ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800">
                {entry.actor ? (
                  <button
                    className="font-semibold hover:underline"
                    onClick={() => { setActor({ id: entry.actor!.id, name: `${entry.actor!.first_name} ${entry.actor!.last_name}` }); setPage(1); }}
                    title={t('adminActivity.filterByThisAgent')}
                  >
                    {entry.actor.first_name} {entry.actor.last_name}
                  </button>
                ) : (
                  <span className="font-semibold">{t('settingsPage.deletedAccount')}</span>
                )}
                {' '}{actionLabel(entry.action)}
                {entry.hotel && <span className="text-xs text-gray-400"> ({entry.hotel.name})</span>}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(entry.created_at).toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {!isLoading && !data?.data.length && <p className="py-6 text-center text-sm text-gray-400">{t('settingsPage.noActivity')}</p>}
      </Card>

      {data && (
        <Pagination meta={data.meta} currentCount={data.data.length} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
      )}
    </div>
  );
};
