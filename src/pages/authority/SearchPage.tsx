import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Search, User, MapPin, Lock, ShieldAlert } from 'lucide-react';
import { WatchlistSeverity } from '@/types';
import { AuthorityLayout } from '@/components/layout/AuthorityLayout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { authorityApi, SearchParams } from '@/api/authority';
import { AuthorityGuest, ApiList } from '@/types';
import { extractErrors } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const WATCHLIST_COLORS: Record<WatchlistSeverity, { bg: string; border: string; text: string; label: string }> = {
  critique: { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', label: 'RECHERCHÉ — CRITIQUE' },
  eleve:    { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', label: 'RECHERCHÉ — ÉLEVÉ'   },
  moyen:    { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', label: 'SIGNALÉ'              },
};

export const SearchPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const profile   = user?.authority_profile;
  const isPolice  = profile?.org_type === 'police';
  const zone      = profile?.governorate ?? null;

  // For police, hotel_governorate is pre-filled + locked
  const [params, setParams] = useState<SearchParams>(() => ({
    hotel_governorate: isPolice && zone ? zone : undefined,
  }));
  const [results, setResults] = useState<ApiList<AuthorityGuest> | null>(null);
  const [error, setError]     = useState('');

  const set = (k: keyof SearchParams, v: string) =>
    setParams((p) => ({ ...p, [k]: v || undefined }));

  const searchMutation = useMutation({
    mutationFn: () => authorityApi.search(params),
    onSuccess: (data) => { setResults(data); setError(''); },
    onError:   (err)  => setError(extractErrors(err)),
  });

  const hasParams = Object.values(params).some((v) => v);

  return (
    <AuthorityLayout title="Recherche de voyageurs">
      <div className="flex flex-col gap-6">

        {/* Police zone indicator */}
        {isPolice && zone && (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: '#EEF3FC', border: '1px solid #D4E1F4' }}
          >
            <MapPin className="h-4 w-4 shrink-0" style={{ color: '#1B3A5F' }} />
            <p className="text-sm text-gray-700">
              Recherche limitée à votre zone de compétence :{' '}
              <span className="font-semibold" style={{ color: '#1B3A5F' }}>{zone}</span>
            </p>
          </div>
        )}

        {/* Search form */}
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">
            Critères de recherche
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Input
              label="Prénom"
              placeholder="Ahmed"
              value={params.first_name ?? ''}
              onChange={(e) => set('first_name', e.target.value)}
            />
            <Input
              label="Nom"
              placeholder="Ben Ali"
              value={params.last_name ?? ''}
              onChange={(e) => set('last_name', e.target.value)}
            />
            <Input
              label="N° document"
              placeholder="Passeport / CIN"
              value={params.document_number ?? ''}
              onChange={(e) => set('document_number', e.target.value)}
            />
            <Input
              label="Nationalité (code)"
              placeholder="TUN"
              value={params.nationality_code ?? ''}
              onChange={(e) => set('nationality_code', e.target.value.toUpperCase())}
              maxLength={3}
            />
            <Input
              label="Date de naissance"
              type="date"
              value={params.date_of_birth ?? ''}
              onChange={(e) => set('date_of_birth', e.target.value)}
            />

            {/* Governorate field — locked for police */}
            <div className="relative">
              <Input
                label="Gouvernorat hôtel"
                placeholder="Tunis"
                value={params.hotel_governorate ?? ''}
                onChange={(e) => !isPolice && set('hotel_governorate', e.target.value)}
                readOnly={isPolice}
                hint={isPolice ? 'Fixé à votre zone' : undefined}
                leftIcon={isPolice ? <Lock className="h-3.5 w-3.5 text-gray-400" /> : undefined}
              />
            </div>

            <Input
              label="Check-in depuis"
              type="date"
              value={params.check_in_from ?? ''}
              onChange={(e) => set('check_in_from', e.target.value)}
            />
            <Input
              label="Check-in jusqu'à"
              type="date"
              value={params.check_in_to ?? ''}
              onChange={(e) => set('check_in_to', e.target.value)}
            />
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-5 flex gap-3">
            <Button
              onClick={() => searchMutation.mutate()}
              loading={searchMutation.isPending}
              disabled={!hasParams}
              className="gap-2"
            >
              <Search className="h-4 w-4" /> Rechercher
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setParams({ hotel_governorate: isPolice && zone ? zone : undefined });
                setResults(null);
                setError('');
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </Card>

        {/* Results */}
        {results && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-500">
              {results.meta.total} résultat{results.meta.total !== 1 ? 's' : ''} trouvé
              {results.meta.total !== 1 ? 's' : ''}
              {isPolice && zone && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#1B3A5F' }}>
                  · <MapPin className="h-3 w-3" /> Zone {zone}
                </span>
              )}
            </p>

            {results.data.map((g) => {
              const hit = g.watchlist_hit;
              const wl  = hit ? WATCHLIST_COLORS[hit.severity] : null;
              return (
                <button
                  key={g.guest_id}
                  onClick={() => navigate(`/authority/guests/${g.guest_id}`)}
                  className="flex items-start justify-between rounded-card bg-white p-4 shadow-card hover:shadow-card-hover transition-shadow text-left w-full"
                  style={wl ? { borderLeft: `4px solid ${wl.border}`, background: wl.bg } : undefined}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: wl ? wl.border : '#1B3A5F' }}
                    >
                      {hit ? <ShieldAlert className="h-5 w-5" /> : [g.first_name[0], g.last_name[0]].join('').toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      {wl && (
                        <span className="text-xs font-bold tracking-wide" style={{ color: wl.text }}>
                          ⚠ {wl.label}
                          {hit?.reason_code && <span className="ml-1 font-normal">· {hit.reason_code.replace('_', ' ')}</span>}
                          {hit?.reason && <span className="ml-1 italic font-normal">"{hit.reason.slice(0, 50)}"</span>}
                        </span>
                      )}
                      <p className="font-semibold text-gray-900">{g.first_name} {g.last_name}</p>
                      <p className="text-xs text-gray-500">
                        {g.date_of_birth} · {g.sex} · {g.nationality_code}
                        {g.document_number && ` · ${g.document_number}`}
                      </p>
                      {g.last_stay && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Dernier séjour : {g.last_stay.hotel_name} ({g.last_stay.check_in_date})
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={(g.last_stay?.status as any) ?? 'default'}>
                    {g.last_stay?.status ?? 'historique'}
                  </Badge>
                </button>
              );
            })}

            {results.data.length === 0 && (
              <div className="py-12 text-center">
                <User className="mx-auto h-10 w-10 text-gray-200 mb-3" />
                <p className="text-gray-500">Aucun voyageur trouvé pour ces critères.</p>
                <p className="text-sm text-gray-400 mt-1">Vérifiez l'orthographe ou élargissez la recherche.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthorityLayout>
  );
};
