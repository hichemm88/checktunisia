import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Users, DoorOpen, Calendar, AlertCircle, ChevronRight } from 'lucide-react';
import { dashboardApi } from '@/api/dashboard';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const StatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) => (
  <Card className="flex flex-col gap-2">
    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
      <Icon className="h-4 w-4 text-white" />
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </Card>
);

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 60_000,
  });

  const sub = data?.subscription;
  const isSubWarning = sub && (sub.status !== 'active' || (sub.days_remaining ?? 99) <= 7);

  return (
    <HotelLayout title="Tableau de bord">
      <div className="p-4 flex flex-col gap-5">

        {/* Subscription warning */}
        {isSubWarning && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {sub!.status !== 'active' ? 'Abonnement inactif' : `Expire dans ${sub!.days_remaining} jours`}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Renouvelez pour continuer les enregistrements.</p>
            </div>
          </div>
        )}

        {/* Quick action */}
        <Button
          size="lg"
          fullWidth
          onClick={() => navigate('/hotel/check-ins/new')}
          className="gap-3"
        >
          <UserCheck className="h-5 w-5" />
          Nouveau check-in
        </Button>

        {/* Today stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-28 animate-pulse rounded-card bg-gray-100" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={UserCheck} label="Arrivées prévues" value={data!.today.arrivals_expected} color="bg-primary-600" />
            <StatCard icon={Users} label="Check-ins faits" value={data!.today.arrivals_done} color="bg-green-500" />
            <StatCard icon={DoorOpen} label="Présents" value={data!.today.currently_present} color="bg-navy-700" />
            <StatCard icon={Calendar} label="Départs aujourd'hui" value={data!.today.departures_today} color="bg-gold-500" />
          </div>
        )}

        {/* Recent check-ins */}
        <Card padding="none">
          <CardHeader className="px-5 pt-5 pb-4">
            <CardTitle>Récents</CardTitle>
            <button onClick={() => navigate('/hotel/history')} className="text-xs text-primary-600">
              Voir tout
            </button>
          </CardHeader>
          <div className="divide-y divide-gray-100">
            {data?.recent_check_ins?.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/hotel/history/${c.id}`)}
                className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-gray-50 text-left"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-gray-900">
                    {c.primary_guest ?? 'Sans nom'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {c.room ? `Ch. ${c.room}` : 'Sans chambre'} · {c.reference}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(c.status)}
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </button>
            ))}
            {!isLoading && !data?.recent_check_ins?.length && (
              <p className="px-5 py-6 text-center text-sm text-gray-400">Aucun check-in récent</p>
            )}
          </div>
        </Card>

      </div>
    </HotelLayout>
  );
};
