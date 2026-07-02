import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, CheckCircle, Phone, AlertTriangle } from 'lucide-react';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { hotelApi, WatchlistHitItem } from '@/api/hotel';

export const SecurityPage = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['watchlist-hits'],
    queryFn:  hotelApi.getWatchlistHits,
    refetchInterval: 30_000,
  });

  const ackMutation = useMutation({
    mutationFn: hotelApi.acknowledgeHit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist-hits'] }),
  });

  const hits  = data?.data ?? [];
  const total = data?.meta.total ?? 0;

  return (
    <HotelLayout title="Alertes de sécurité">
      <div className="flex flex-col gap-5">

        {/* Header banner */}
        <div
          className="rounded-2xl px-5 py-4"
          style={{ background: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)' }}
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-7 w-7 text-red-200 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-100 uppercase tracking-wider">Notification de sécurité</p>
              <p className="text-white text-lg font-black mt-0.5">
                {isLoading ? '—' : `${total} alerte${total !== 1 ? 's' : ''} en attente`}
              </p>
            </div>
          </div>

          <div
            className="mt-4 rounded-xl p-3 flex items-start gap-3"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <Phone className="h-4 w-4 text-red-200 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Procédure obligatoire</p>
              <p className="text-xs text-red-200 mt-0.5">
                Pour chaque alerte, contactez immédiatement les autorités compétentes. Ne divulguez aucune information au client. Après confirmation, cliquez sur "Pris en charge".
              </p>
            </div>
          </div>
        </div>

        {/* Hits list */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}
          </div>
        ) : hits.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="h-14 w-14 rounded-full flex items-center justify-center bg-green-50">
                <CheckCircle className="h-7 w-7 text-green-500" />
              </div>
              <p className="font-semibold text-gray-700">Aucune alerte en attente</p>
              <p className="text-sm text-gray-400">Toutes les alertes ont été traitées.</p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {hits.map((hit) => (
              <HitCard
                key={hit.id}
                hit={hit}
                onAcknowledge={() => ackMutation.mutate(hit.id)}
                loading={ackMutation.isPending && ackMutation.variables === hit.id}
              />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div
          className="flex items-start gap-3 rounded-xl p-3"
          style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}
        >
          <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-700">
            Ces alertes sont confidentielles. Les informations affichées sont volontairement limitées. Ne communiquez jamais le numéro de chambre ou la référence au client concerné.
          </p>
        </div>

      </div>
    </HotelLayout>
  );
};

const HitCard = ({
  hit, onAcknowledge, loading,
}: { hit: WatchlistHitItem; onAcknowledge: () => void; loading: boolean }) => (
  <div
    className="rounded-2xl p-4 flex items-start justify-between gap-4"
    style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}
  >
    <div className="flex items-start gap-3">
      <div
        className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center"
        style={{ background: '#FEE2E2' }}
      >
        <ShieldAlert className="h-5 w-5" style={{ color: '#DC2626' }} />
      </div>
      <div>
        <p className="text-sm font-bold" style={{ color: '#7F1D1D' }}>Alerte sécurité</p>
        <div className="flex flex-col gap-0.5 mt-1">
          {hit.check_in_reference && (
            <p className="text-xs text-gray-600">
              Référence : <span className="font-semibold">{hit.check_in_reference}</span>
            </p>
          )}
          {hit.room_number && (
            <p className="text-xs text-gray-600">
              Chambre : <span className="font-semibold">{hit.room_number}</span>
            </p>
          )}
          {hit.check_in_date && (
            <p className="text-xs text-gray-500">
              Check-in : {new Date(hit.check_in_date).toLocaleDateString('fr-TN')}
            </p>
          )}
        </div>
      </div>
    </div>

    <Button
      size="sm"
      onClick={onAcknowledge}
      loading={loading}
      className="shrink-0"
      style={{ background: '#DC2626', color: '#fff', border: 'none' } as React.CSSProperties}
    >
      Pris en charge
    </Button>
  </div>
);
