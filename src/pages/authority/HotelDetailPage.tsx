import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, MapPin, Hash, Star, Users, Calendar } from 'lucide-react';
import { AuthorityLayout } from '@/components/layout/AuthorityLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { authorityApi } from '@/api/authority';

const Row = ({ label, value }: { label: string; value?: string | number | null }) => (
  value != null ? (
    <div className="flex justify-between py-2 text-sm border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  ) : null
);

export const HotelDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: hotel, isLoading } = useQuery({
    queryKey: ['authority-hotel', id],
    queryFn: () => authorityApi.getHotel(id!),
    enabled: !!id,
  });

  if (isLoading) return (
    <AuthorityLayout title="Établissement">
      <div className="flex flex-col gap-4">
        {[1,2].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />)}
      </div>
    </AuthorityLayout>
  );

  if (!hotel) return null;

  return (
    <AuthorityLayout title="Fiche établissement">
      <div className="flex flex-col gap-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux établissements
        </button>

        {/* Header */}
        <Card>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{hotel.name}</h2>
                  {hotel.stars && (
                    <div className="flex items-center gap-0.5 mt-1">
                      {Array.from({ length: hotel.stars }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  )}
                </div>
                <Badge variant={hotel.status === 'active' ? 'active' : 'suspended'}>
                  {hotel.status === 'active' ? 'Actif' : 'Suspendu'}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5" />
                {[hotel.address, hotel.city, hotel.governorate].filter(Boolean).join(', ')}
              </div>
            </div>
          </div>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-400" /> Informations administratives
              </div>
            </CardTitle>
          </CardHeader>
          <Row label="N° d'enregistrement" value={hotel.registration_number} />
          <Row label="Type" value={hotel.type} />
          <Row label="Capacité" value={`${hotel.room_count} chambres`} />
          <Row label="Statut abonnement" value={hotel.subscription_status} />
          {hotel.subscription_expires_at && (
            <Row label="Abonnement expire le" value={new Date(hotel.subscription_expires_at).toLocaleDateString('fr-TN')} />
          )}
        </Card>

        {/* Activity stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <div className="flex items-center justify-center gap-2 text-navy-700 mb-2">
              <Users className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{hotel.active_guests_count ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Voyageurs présents</p>
          </Card>
          <Card className="text-center">
            <div className="flex items-center justify-center gap-2 text-navy-700 mb-2">
              <Calendar className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{hotel.total_check_ins ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Check-ins total</p>
          </Card>
        </div>
      </div>
    </AuthorityLayout>
  );
};
