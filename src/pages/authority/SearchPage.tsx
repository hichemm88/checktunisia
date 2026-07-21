import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search, User, MapPin, Lock, ShieldAlert, Building2, BedDouble, UserCog } from 'lucide-react';
import { getFlagUrl } from '@/lib/flags';
import { type WatchlistSeverity } from '@/types';
import { AuthorityLayout } from '@/components/layout/AuthorityLayout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { authorityApi, type SearchParams } from '@/api/authority';
import { type AuthorityGuest, type ApiList } from '@/types';
import { extractErrors } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { MrzScanButton } from '@/components/MrzScanButton';
import { type MrzData } from '@/lib/mrzScanner';

const dateLocaleFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-FR');
const fmtDate = (d: string | null | undefined, locale: string) =>
  d ? new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const RecentCheckInsSection = () => {
  const { t, i18n } = useTranslation();
  const locale = dateLocaleFor(i18n.language);
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['authority-recent-check-ins', page],
    queryFn: () => authorityApi.getRecentCheckIns({ page, per_page: 20 }),
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {t('authoritySearch.recentCheckins')}
      </p>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-card bg-gray-100" />
      ))}

      {!isLoading && data?.data.map((c) => (
        <button
          key={`${c.check_in_id}-${c.guest_id}`}
          onClick={() => navigate(`/authority/guests/${c.guest_id}`)}
          className="flex items-start gap-3 rounded-card bg-white p-4 shadow-card hover:shadow-card-hover transition-shadow text-start w-full"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: '#5346A8' }}>
            {[c.first_name?.[0], c.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?'}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <p className="font-semibold text-gray-900 flex items-center gap-2">
              {c.first_name ?? '—'} {c.last_name ?? ''}
              {c.nationality_code && (() => {
                const url = getFlagUrl(c.nationality_code);
                return url ? (
                  <img src={url} alt={c.nationality_code} width={18}
                    className="rounded-sm inline-block"
                    style={{ border: '1px solid rgba(0,0,0,0.08)', verticalAlign: 'middle' }}
                  />
                ) : null;
              })()}
            </p>
            <p className="text-xs text-gray-500">
              {fmtDate(c.date_of_birth, locale)} · {c.nationality_code}
              {c.document_number && <> · <span className="font-mono">{c.document_number}</span></>}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
              {c.hotel && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {c.hotel.name}
                  {c.hotel.city && ` (${c.hotel.city})`}
                </span>
              )}
              {c.room_number && (
                <span className="flex items-center gap-1">
                  <BedDouble className="h-3 w-3" /> {c.room_number}
                </span>
              )}
              {c.created_by && (
                <span className="flex items-center gap-1">
                  <UserCog className="h-3 w-3" /> {t('authoritySearch.checkinBy', { name: c.created_by })}
                </span>
              )}
            </div>
          </div>
          <span className="text-xs text-gray-400 shrink-0">{fmtDate(c.check_in_date, locale)}</span>
        </button>
      ))}

      {!isLoading && !data?.data.length && (
        <p className="py-8 text-center text-sm text-gray-400">{t('authoritySearch.noRecentCheckin')}</p>
      )}

      {data && (
        <Pagination meta={data.meta} currentCount={data.data.length} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => p + 1)} />
      )}
    </div>
  );
};

export const SearchPage = () => {
  const { t } = useTranslation();
  const WATCHLIST_COLORS: Record<WatchlistSeverity, { bg: string; border: string; text: string; label: string }> = {
    critique: { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', label: t('authoritySearch.severityCritical') },
    eleve:    { bg: '#FBF0D7', border: '#E3A008', text: '#8A6206', label: t('authoritySearch.severityHigh') },
    moyen:    { bg: '#EEEBFA', border: '#5346A8', text: '#5346A8', label: t('authoritySearch.severityFlagged') },
  };
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const profile   = user?.authority_profile;
  const isPolice  = profile?.org_type === 'police';
  const zone      = profile?.governorate ?? null;

  // For police, hotel_governorate is pre-filled + locked
  const [params, setParams] = useState<SearchParams>(() => ({
    hotel_governorate: isPolice && zone ? zone : undefined,
  }));
  const [page, setPage]       = useState(1);
  const [results, setResults] = useState<ApiList<AuthorityGuest> | null>(null);
  const [error, setError]     = useState('');

  const set = (k: keyof SearchParams, v: string) =>
    setParams((p) => ({ ...p, [k]: v || undefined }));

  const searchMutation = useMutation({
    mutationFn: (targetPage: number) => authorityApi.search({ ...params, page: targetPage, per_page: 20 }),
    onSuccess: (data) => { setResults(data); setError(''); },
    onError:   (err)  => setError(extractErrors(err)),
  });

  const runSearch = (targetPage: number) => {
    setPage(targetPage);
    searchMutation.mutate(targetPage);
  };

  // ── Scan MRZ → recherche automatique du voyageur ────────────────────────────
  // On privilégie le numéro de document (identifiant fort) ; à défaut on retombe
  // sur nom/date de naissance. Un match unique ouvre directement la fiche.
  const scanSearchMutation = useMutation({
    mutationFn: (mrz: MrzData) => {
      const scanned: SearchParams = {
        ...(isPolice && zone ? { hotel_governorate: zone } : {}),
      };
      if (mrz.document_number) scanned.document_number = mrz.document_number;
      else {
        if (mrz.last_name)        scanned.last_name = mrz.last_name;
        if (mrz.first_name)       scanned.first_name = mrz.first_name;
        if (mrz.date_of_birth)    scanned.date_of_birth = mrz.date_of_birth;
        if (mrz.nationality_code) scanned.nationality_code = mrz.nationality_code;
      }
      // Reflect the scan in the visible form fields.
      setParams((p) => ({ ...p, ...scanned }));
      return authorityApi.search({ ...scanned, page: 1, per_page: 20 });
    },
    onSuccess: (data) => {
      setResults(data);
      setPage(1);
      setError('');
      // Exactly one match → jump straight to the profile (with lodging + history).
      if (data.data.length === 1) navigate(`/authority/guests/${data.data[0].guest_id}`);
    },
    onError: (err) => setError(extractErrors(err)),
  });

  const hasParams = Object.values(params).some((v) => v);

  return (
    <AuthorityLayout title={t('authoritySearch.title')}>
      <div className="flex flex-col gap-6">

        {/* Police zone indicator */}
        {isPolice && zone && (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: '#EEEBFA', border: '1px solid #EEEBFA' }}
          >
            <MapPin className="h-4 w-4 shrink-0" style={{ color: '#5346A8' }} />
            <p className="text-sm text-gray-700">
              {t('authoritySearch.zoneLimited')}{' '}
              <span className="font-semibold" style={{ color: '#5346A8' }}>{zone}</span>
            </p>
          </div>
        )}

        {/* Scan MRZ — contrôle rapide sans saisie */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">{t('authoritySearch.scanMrzTitle')}</p>
              <p className="text-xs text-gray-500">{t('authoritySearch.scanMrzHint')}</p>
            </div>
            <MrzScanButton onResult={(mrz) => scanSearchMutation.mutate(mrz)} />
          </div>
          {scanSearchMutation.isPending && (
            <p className="mt-2 text-xs text-gray-400">{t('authoritySearch.scanSearching')}</p>
          )}
        </Card>

        {/* Search form */}
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">
            {t('authoritySearch.searchCriteria')}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Input
              label={t('guestScan.firstName')}
              placeholder="Ahmed"
              value={params.first_name ?? ''}
              onChange={(e) => set('first_name', e.target.value)}
            />
            <Input
              label={t('guestScan.lastName')}
              placeholder="Ben Ali"
              value={params.last_name ?? ''}
              onChange={(e) => set('last_name', e.target.value)}
            />
            <Input
              label={t('authoritySearch.documentNumber')}
              placeholder={t('authoritySearch.documentNumberPlaceholder')}
              value={params.document_number ?? ''}
              onChange={(e) => set('document_number', e.target.value)}
            />
            <Input
              label={t('authoritySearch.nationalityCode')}
              placeholder="TUN"
              value={params.nationality_code ?? ''}
              onChange={(e) => set('nationality_code', e.target.value.toUpperCase())}
              maxLength={3}
            />
            <Input
              label={t('guestScan.dateOfBirth')}
              type="date"
              value={params.date_of_birth ?? ''}
              onChange={(e) => set('date_of_birth', e.target.value)}
            />

            {/* Governorate field — locked for police */}
            <div className="relative">
              <Input
                label={t('authoritySearch.hotelGovernorate')}
                placeholder="Tunis"
                value={params.hotel_governorate ?? ''}
                onChange={(e) => !isPolice && set('hotel_governorate', e.target.value)}
                readOnly={isPolice}
                hint={isPolice ? t('authoritySearch.fixedToZone') : undefined}
                leftIcon={isPolice ? <Lock className="h-3.5 w-3.5 text-gray-400" /> : undefined}
              />
            </div>

            <Input
              label={t('authoritySearch.checkinFrom')}
              type="date"
              value={params.check_in_from ?? ''}
              onChange={(e) => set('check_in_from', e.target.value)}
            />
            <Input
              label={t('authoritySearch.checkinTo')}
              type="date"
              value={params.check_in_to ?? ''}
              onChange={(e) => set('check_in_to', e.target.value)}
            />
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-5 flex gap-3">
            <Button
              onClick={() => runSearch(1)}
              loading={searchMutation.isPending}
              disabled={!hasParams}
              className="gap-2"
            >
              <Search className="h-4 w-4" /> {t('common.search')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setParams({ hotel_governorate: isPolice && zone ? zone : undefined });
                setResults(null);
                setPage(1);
                setError('');
              }}
            >
              {t('authoritySearch.reset')}
            </Button>
          </div>
        </Card>

        {/* Default view: recent check-ins, replaced by search results once a search runs */}
        {!results && <RecentCheckInsSection />}

        {/* Results */}
        {results && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-500">
              {t('authoritySearch.resultsFound', { count: results.meta.total })}
              {isPolice && zone && (
                <span className="ms-2 inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#5346A8' }}>
                  · <MapPin className="h-3 w-3" /> {t('authoritySearch.zone')} {zone}
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
                  className="flex items-start justify-between rounded-card bg-white p-4 shadow-card hover:shadow-card-hover transition-shadow text-start w-full"
                  style={wl ? { borderLeft: `4px solid ${wl.border}`, background: wl.bg } : undefined}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: wl ? wl.border : '#5346A8' }}
                    >
                      {hit ? <ShieldAlert className="h-5 w-5" /> : [g.first_name?.[0], g.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?'}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      {wl && (
                        <span className="text-xs font-bold tracking-wide" style={{ color: wl.text }}>
                          ⚠ {wl.label}
                          {hit?.reason_code && <span className="ms-1 font-normal">· {hit.reason_code.replace('_', ' ')}</span>}
                          {hit?.reason && <span className="ms-1 italic font-normal">"{hit.reason.slice(0, 50)}"</span>}
                        </span>
                      )}
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        {g.first_name} {g.last_name}
                        {g.nationality_code && (() => {
                          const url = getFlagUrl(g.nationality_code);
                          return url ? (
                            <img src={url} alt={g.nationality_code} width={18}
                              className="rounded-sm inline-block"
                              style={{ border: '1px solid rgba(0,0,0,0.08)', verticalAlign: 'middle' }}
                            />
                          ) : null;
                        })()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {g.date_of_birth} · {g.sex} · {g.nationality_code}
                        {g.document_number && <> · <span className="font-mono">{g.document_number}</span></>}
                      </p>
                      {g.last_stay && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t('authoritySearch.lastStay')} : {g.last_stay.hotel_name} ({g.last_stay.check_in_date})
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={(g.last_stay?.status as any) ?? 'default'}>
                    {g.last_stay?.status ?? t('authoritySearch.historical')}
                  </Badge>
                </button>
              );
            })}

            {results.data.length === 0 && (
              <div className="py-12 text-center">
                <User className="mx-auto h-10 w-10 text-gray-200 mb-3" />
                <p className="text-gray-500">{t('authoritySearch.noGuestFound')}</p>
                <p className="text-sm text-gray-400 mt-1">{t('authoritySearch.checkSpellingHint')}</p>
              </div>
            )}

            {results.data.length > 0 && (
              <Pagination
                meta={results.meta}
                currentCount={results.data.length}
                onPrev={() => runSearch(Math.max(1, page - 1))}
                onNext={() => runSearch(page + 1)}
              />
            )}
          </div>
        )}
      </div>
    </AuthorityLayout>
  );
};
