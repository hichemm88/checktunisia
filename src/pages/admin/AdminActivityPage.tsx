import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminActivityApi } from '@/api/admin/activity';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { ListSkeleton } from '@/components/admin/ListSkeleton';

const ACTION_LABELS: Record<string, string> = {
  'hotel.created': 'a créé un établissement',
  'hotel.updated': 'a modifié un établissement',
  'hotel.suspended': 'a suspendu un établissement',
  'hotel.activated': 'a réactivé un établissement',
  'hotel.deleted': 'a supprimé un établissement',
  'organization.created': 'a créé un hébergeur',
  'organization.updated': 'a modifié un hébergeur',
  'organization.suspended': 'a suspendu un hébergeur',
  'organization.activated': 'a réactivé un hébergeur',
  'organization.deleted': 'a supprimé un hébergeur',
  'user.created': 'a créé un compte membre',
  'user.updated': 'a modifié un compte membre',
  'user.deleted': 'a supprimé un compte membre',
  'user.invite_resent': 'a renvoyé une invitation',
  'user.login': "s'est connecté(e)",
  'user.logout': "s'est déconnecté(e)",
  'authority_user.created': 'a créé un utilisateur autorité',
  'authority_user.updated': 'a modifié un utilisateur autorité',
  'authority_user.deleted': 'a supprimé un utilisateur autorité',
  'authority_organization.created': 'a créé un organisme',
  'authority_organization.updated': 'a modifié un organisme',
  'authority_organization.deleted': 'a supprimé un organisme',
  'subscription.activated': 'a créé/activé un abonnement',
  'invoice.updated': 'a modifié une facture',
  'check_in.created': 'a créé un check-in',
  'check_in.deleted': 'a supprimé un check-in',
};

const actionLabel = (action: string) => ACTION_LABELS[action] ?? action.replace(/[._]/g, ' ');

export const AdminActivityPage = () => {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-activity', page, action],
    queryFn: () => adminActivityApi.list({ page, per_page: 30, action: action || undefined }),
  });

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Journal d'activité</h1>
      </div>
      <select className="input w-fit" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
        <option value="">Toutes les actions</option>
        {Object.keys(ACTION_LABELS).map((a) => <option key={a} value={a}>{a}</option>)}
      </select>

      <Card>
        {isLoading && <ListSkeleton rows={3} />}
        {data?.data.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold mt-0.5" style={{ background: '#E8EEFB', color: '#1B3A5F' }}>
              {entry.actor?.first_name?.[0] ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800">
                <span className="font-semibold">{entry.actor ? `${entry.actor.first_name} ${entry.actor.last_name}` : 'Compte supprimé'}</span>
                {' '}{actionLabel(entry.action)}
                {entry.hotel && <span className="text-xs text-gray-400"> ({entry.hotel.name})</span>}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(entry.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {!isLoading && !data?.data.length && <p className="py-6 text-center text-sm text-gray-400">Aucune activité</p>}
      </Card>

      {data && (
        <Pagination meta={data.meta} currentCount={data.data.length} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
      )}
    </div>
  );
};
