import { useAuthStore } from '@/stores/authStore';
import { HotelLayout } from '@/components/layout/HotelLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Building, CreditCard, User } from 'lucide-react';

export const SettingsPage = () => {
  const { user } = useAuthStore();

  return (
    <HotelLayout title="Paramètres">
      <div className="p-4 flex flex-col gap-4">
        {/* Profile */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white font-bold">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 capitalize">{user?.role?.replace(/_/g, ' ')}</span>
          </div>
        </Card>

        {/* Hotel */}
        {user?.hotel && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Building className="h-4 w-4 text-gray-400" />
              <p className="font-semibold text-gray-900">{user.hotel.name}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Statut hôtel</span>
              <Badge variant={user.hotel.subscription_status === 'active' ? 'active' : 'suspended'}>
                {user.hotel.subscription_status}
              </Badge>
            </div>
            {user.hotel.subscription_expires_at && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">Expire le</span>
                <span className="text-xs font-medium text-gray-700">
                  {new Date(user.hotel.subscription_expires_at).toLocaleDateString('fr-TN')}
                </span>
              </div>
            )}
          </Card>
        )}

        {/* Subscription info */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-gray-400" />
            <p className="font-semibold text-gray-900">Abonnement</p>
          </div>
          <p className="text-sm text-gray-500">
            Pour renouveler ou modifier votre abonnement, contactez{' '}
            <a href="mailto:support@checktunisia.tn" className="text-primary-600 underline">
              support@checktunisia.tn
            </a>
          </p>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-2">
          CheckTunisia v1.0 · Conforme à la réglementation tunisienne
        </p>
      </div>
    </HotelLayout>
  );
};
