import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Search, ChevronRight, Users, Star, MapPin, Lock } from 'lucide-react';
import { AuthorityLayout } from '@/components/layout/AuthorityLayout';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { authorityApi } from '@/api/authority';
import { useAuthStore } from '@/stores/authStore';

export const HotelsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const profile   = user?.authority_profile;
  const isPolice  = profile?.org_type === 'police';
  const zone      = profile?.governorate ?? null;

  const [search,      setSearch]      = useState('');
  const [governorate, setGovernorate] = useState(isPolice && zone ? zone : '');
  const [page,        setPage]        = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['authority-hotels', { search, governorate, page }],
    queryFn:  () => authorityApi.getHotels({
      search:      search      || undefined,
      governorate: governorate || undefined,
      page,
    }),
  });

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.per_page) : 1;

  return (
    <AuthorityLayout title="Établissements">
      <div className="flex flex-col gap-5">

        {/* Police zone banner */}
        {isPolice && zone && (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: '#EEEBFA', border: '1px solid #EEEBFA' }}
          >
            <MapPin className="h-4 w-4 shrink-0" style={{ color: '#5346A8' }} />
            <p className="text-sm text-gray-700">
              Affichage limité aux établissements de votre zone :{' '}
              <span className="font-semibold" style={{ color: '#5346A8' }}>{zone}</span>
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="Nom de l'établissement..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            leftIcon={<Search className="h-4 w-4" />}
          />
          <Input
            placeholder="Gouvernorat..."
            value={governorate}
            onChange={(e) => { if (!isPolice) { setGovernorate(e.target.value); setPage(1); } }}
            readOnly={isPolice}
            hint={isPolice ? 'Fixé à votre zone' : undefined}
            leftIcon={isPolice ? <Lock className="h-3.5 w-3.5 text-gray-400" /> : undefined}
          />
        </div>

        {/* Count */}
        {data && (
          <p className="text-sm text-gray-500">
            {data.meta.total} établissement{data.meta.total !== 1 ? 's' : ''}
            {isPolice && zone && (
              <span className="ms-1 text-xs" style={{ color: '#5346A8' }}>· Zone {zone}</span>
            )}
          </p>
        )}

        {/* List */}
        <div className="flex flex-col gap-3">
          {isLoading && [1,2,3,4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}

          {!isLoading && data?.data.map((hotel) => (
            <button
              key={hotel.id}
              onClick={() => navigate(`/authority/hotels/${hotel.id}`)}
              className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-gray-100 hover:border-navy-200 hover:shadow-md transition-all text-start w-full"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: '#EEEBFA' }}
                >
                  <Building2 className="h-5 w-5" style={{ color: '#5346A8' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{hotel.name}</p>
                    {hotel.stars && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: hotel.stars }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {hotel.city}{hotel.governorate ? `, ${hotel.governorate}` : ''}
                    {hotel.registration_number ? ` · Rég. ${hotel.registration_number}` : ''}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Users className="h-3 w-3" />
                      {hotel.active_guests_count ?? 0} présents
                    </span>
                    <span className="text-xs text-gray-400">{hotel.room_count} chambres</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={hotel.status === 'active' ? 'active' : 'suspended'}>
                  {hotel.status === 'active' ? 'Actif' : 'Suspendu'}
                </Badge>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </div>
            </button>
          ))}

          {!isLoading && data?.data.length === 0 && (
            <div className="py-12 text-center">
              <Building2 className="mx-auto h-10 w-10 text-gray-200 mb-3" />
              <p className="text-gray-500">Aucun établissement trouvé</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs disabled:opacity-40"
            >
              ← Précédent
            </button>
            <span className="flex items-center text-xs text-gray-500">
              Page {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs disabled:opacity-40"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </AuthorityLayout>
  );
};
