import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Building2, MapPin, Hash, Star, Users, Calendar,
  Search, ChevronRight, ChevronLeft, Mail, Phone, Briefcase,
  User, Building, UserCheck,
} from 'lucide-react';
import { AuthorityLayout } from '@/components/layout/AuthorityLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { authorityApi } from '@/api/authority';
import { getFlagUrl } from '@/lib/flags';
import type { AuthorityHotelStaff } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Row = ({ label, value }: { label: string; value?: string | number | null }) =>
  value != null && value !== '' ? (
    <div className="flex justify-between py-2 text-sm border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-end max-w-[60%]">{value}</span>
    </div>
  ) : null;

const dateLocaleFor = (lng: string) => (lng === 'ar' ? 'ar-TN' : lng === 'en' ? 'en-GB' : 'fr-FR');

const fmtDate = (iso: string | null | undefined, locale: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtRange = (from: string, to: string, locale: string) => {
  const f = from.slice(0, 10).split('-').map(Number);
  const t = to.slice(0, 10).split('-').map(Number);
  const dFrom = new Date(f[0], f[1] - 1, f[2]);
  const dTo   = new Date(t[0], t[1] - 1, t[2]);
  const sameMonth = f[0] === t[0] && f[1] === t[1];
  if (sameMonth) return `${f[2]} → ${dTo.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return `${dFrom.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} → ${dTo.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

const STATUS_FILTERS = ['all', 'active', 'completed', 'draft'] as const;

// ─── Flag image component ─────────────────────────────────────────────────────

const FlagImg = ({ code, size = 16 }: { code?: string | null; size?: number }) => {
  const url = getFlagUrl(code);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={code ?? ''}
      width={size}
      style={{ display: 'inline-block', borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', verticalAlign: 'middle' }}
    />
  );
};

// ─── Staff card ───────────────────────────────────────────────────────────────

const StaffCard = ({ s }: { s: AuthorityHotelStaff }) => {
  const { t } = useTranslation();
  const ROLE_LABELS: Record<string, string> = {
    hotel_admin: t('authorityHotelDetail.manager'),
    receptionist: t('authorityHotelDetail.receptionist'),
    manager: t('authorityHotelDetail.manager'),
  };
  const isManager = s.role === 'hotel_admin' || s.role === 'manager';
  return (
    <div
      className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
        style={{ background: isManager ? '#5346A8' : '#EEEBFA', color: isManager ? '#fff' : '#5346A8' }}
      >
        {s.first_name?.[0]}{s.last_name?.[0]}
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {s.first_name} {s.last_name}
          </span>
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
            style={{ background: isManager ? '#EEEBFA' : '#F3F4F6', color: isManager ? '#5346A8' : '#6B7280' }}
          >
            {ROLE_LABELS[s.role] ?? s.role}
          </span>
        </div>
        {isManager && (
          <div className="flex flex-col gap-0.5 mt-0.5">
            {s.email && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Mail className="h-3 w-3 text-gray-400" /> {s.email}
              </span>
            )}
            {s.phone && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Phone className="h-3 w-3 text-gray-400" /> {s.phone}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const HotelDetailPage = () => {
  const { t, i18n } = useTranslation();
  const locale = dateLocaleFor(i18n.language);
  const STATUS_STYLE: Record<string, { color: string; label: string }> = {
    active:    { color: '#1F9D6B', label: t('checkinStatus.active') },
    draft:     { color: '#5346A8', label: t('checkinStatus.draft') },
    completed: { color: '#9ca3af', label: t('checkinStatus.completed') },
    cancelled: { color: '#9ca3af', label: t('checkinStatus.cancelled') },
    no_show:   { color: '#E3A008', label: t('checkinStatus.noShow') },
  };
  const STATUS_LABELS: Record<string, string> = {
    all: t('common.all'), active: t('checkinStatus.active'), completed: t('checkinStatus.completed'), draft: t('checkinStatus.draft'),
  };
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage]     = useState(1);

  const { data: hotel, isLoading } = useQuery({
    queryKey: ['authority-hotel', id],
    queryFn:  () => authorityApi.getHotel(id!),
    enabled:  !!id,
  });

  const { data: checkIns, isLoading: ciLoading } = useQuery({
    queryKey: ['authority-hotel-checkins', id, search, status, page],
    queryFn:  () => authorityApi.getHotelCheckIns(id!, {
      search: search || undefined,
      status: status === 'all' ? undefined : status,
      page,
    }),
    enabled: !!id,
  });

  if (isLoading) return (
    <AuthorityLayout title={t('authorityHotelDetail.property')}>
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />)}
      </div>
    </AuthorityLayout>
  );

  if (!hotel) return null;

  const lastPage   = checkIns?.meta.last_page ?? 1;
  const owner      = hotel.owner;
  const staff      = hotel.staff ?? [];
  const managers   = staff.filter(s => s.role === 'hotel_admin' || s.role === 'manager');
  const reception  = staff.filter(s => s.role === 'receptionist');

  return (
    <AuthorityLayout title={t('authorityHotelDetail.propertySheet')}>
      <div className="flex flex-col gap-5">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> {t('authorityHotelDetail.backToProperties')}
        </button>

        {/* ── Hotel header ── */}
        <Card>
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shrink-0"
              style={{ background: '#5346A8' }}
            >
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
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
                  {hotel.status === 'active' ? t('checkinStatus.active') : t('checkinStatus.suspended')}
                </Badge>
              </div>
              {hotel.address_full && (
                <div className="flex items-start gap-1.5 mt-2 text-sm text-gray-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{hotel.address_full}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Admin info ── */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-400" /> {t('authorityHotelDetail.adminInfo')}
              </div>
            </CardTitle>
          </CardHeader>
          <Row label={t('authorityHotelDetail.type')}                value={hotel.type_label ?? hotel.type} />
          <Row label={t('authorityHotelDetail.registrationNumber')} value={hotel.registration_number} />
          <Row label={t('authorityHotelDetail.capacity')}            value={hotel.room_count ? t('authorityHotels.roomsCount', { count: hotel.room_count }) : null} />
          <Row label={t('authorityHotelDetail.subscriptionStatus')}   value={hotel.subscription_status} />
          {hotel.subscription_expires_at && (
            <Row label={t('authorityHotelDetail.subscriptionExpires')} value={new Date(hotel.subscription_expires_at).toLocaleDateString(locale)} />
          )}
        </Card>

        {/* ── Owner ── */}
        {owner && (
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  {owner.entity_type === 'company'
                    ? <Building className="h-4 w-4 text-gray-400" />
                    : <User    className="h-4 w-4 text-gray-400" />}
                  {owner.entity_type === 'company' ? t('authorityHotelDetail.ownerCompany') : t('authorityHotelDetail.ownerIndividual')}
                </div>
              </CardTitle>
            </CardHeader>
            <Row label={t('authorityHotelDetail.nameOrCompanyName')} value={owner.name} />
            {owner.entity_type === 'company' && (
              <Row label={t('authorityHotelDetail.businessRegNumber')} value={owner.registration_number} />
            )}
            {owner.contact_email && (
              <div className="flex justify-between py-2 text-sm border-b border-gray-50">
                <span className="text-gray-500">{t('common.email')}</span>
                <a href={`mailto:${owner.contact_email}`} className="font-medium text-blue-600 hover:underline">
                  {owner.contact_email}
                </a>
              </div>
            )}
            {owner.contact_phone && (
              <div className="flex justify-between py-2 text-sm border-b border-gray-50">
                <span className="text-gray-500">{t('common.phone')}</span>
                <a href={`tel:${owner.contact_phone}`} className="font-medium text-gray-900 hover:underline">
                  {owner.contact_phone}
                </a>
              </div>
            )}
            {owner.address && typeof owner.address === 'object' && Object.keys(owner.address).length > 0 && (
              <Row label={t('authorityHotelDetail.address')}
                value={[owner.address['line1'], owner.address['city'], owner.address['governorate']].filter(Boolean).join(', ')}
              />
            )}
          </Card>
        )}

        {/* ── Staff ── */}
        {staff.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-gray-400" /> {t('authorityHotelDetail.staff')}
                </div>
              </CardTitle>
            </CardHeader>
            {/* Managers — full details */}
            {managers.map(s => <StaffCard key={s.id} s={s} />)}
            {/* Receptionists — name only */}
            {reception.length > 0 && (
              <>
                {managers.length > 0 && <div className="mt-1" />}
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                  {t('authorityHotelDetail.reception')}
                </p>
                {reception.map(s => <StaffCard key={s.id} s={s} />)}
              </>
            )}
          </Card>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center py-4">
            <Users className="h-5 w-5 mx-auto mb-1" style={{ color: '#5346A8' }} />
            <p className="text-2xl font-bold text-gray-900">{hotel.active_guests_count ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('authorityDashboard.activeGuests')}</p>
          </Card>
          <Card className="text-center py-4">
            <Calendar className="h-5 w-5 mx-auto mb-1" style={{ color: '#5346A8' }} />
            <p className="text-2xl font-bold text-gray-900">{hotel.total_check_ins ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('authorityHotelDetail.totalCheckins')}</p>
          </Card>
        </div>

        {/* ── Check-in history ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">
              {t('authorityHotelDetail.checkinHistory')}
              {checkIns && (
                <span className="ms-2 text-xs font-normal text-gray-400">
                  · {t('authorityActivity.entriesCount', { count: checkIns.meta.total })}
                </span>
              )}
            </h3>
          </div>

          {/* Search */}
          <Input
            placeholder={t('authorityHotelDetail.searchPlaceholder')}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            leftIcon={<Search className="h-4 w-4 text-gray-400" />}
          />

          {/* Status filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold transition-all"
                style={status === s
                  ? { background: '#5346A8', color: '#fff' }
                  : { background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB' }
                }
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* List */}
          {ciLoading ? (
            <div className="flex flex-col gap-2">
              {[1,2,3,4].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}
            </div>
          ) : checkIns?.data.length === 0 ? (
            <div className="py-10 text-center">
              <Search className="h-8 w-8 mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">{t('authorityHotelDetail.noCheckinFound')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {checkIns?.data.map(ci => {
                const st      = STATUS_STYLE[ci.status] ?? { color: '#9ca3af', label: ci.status };
                const guests  = ci.guests ?? [];
                const pg      = guests.find(g => g.is_primary) ?? guests[0] ?? ci.primary_guest ?? null;
                const name    = pg ? `${pg.last_name} ${pg.first_name}` : t('hotelHistory.noGuest');
                const initials = pg
                  ? `${pg.first_name?.[0] ?? ''}${pg.last_name?.[0] ?? ''}`.toUpperCase()
                  : '?';
                const pgFlag = getFlagUrl(pg?.nationality_code);

                return (
                  <div
                    key={ci.id}
                    className="flex bg-white rounded-xl shadow-sm overflow-hidden"
                    style={{ borderLeft: `4px solid ${st.color}` }}
                  >
                    <div className="flex flex-1 items-start gap-3 px-3.5 py-3 min-w-0">
                      {/* Avatar + flag */}
                      <div className="relative shrink-0 mt-0.5">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: '#EEEBFA', color: '#5346A8' }}
                        >
                          {initials}
                        </div>
                        {pgFlag && (
                          <img
                            src={pgFlag}
                            alt={pg?.nationality_code ?? ''}
                            width={16}
                            className="absolute -bottom-1 -end-1 rounded-sm shadow-sm"
                            style={{ border: '1px solid rgba(0,0,0,0.1)' }}
                          />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        {/* Primary guest name */}
                        <span className="text-sm font-semibold text-gray-900 truncate">{name}</span>

                        {/* Additional guests */}
                        {guests.length > 1 && (
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                            {guests
                              .filter(g => !g.is_primary && g.id !== pg?.id)
                              .map(g => {
                                const gUrl = getFlagUrl(g.nationality_code);
                                return (
                                  <span key={g.id} className="flex items-center gap-1 text-xs text-gray-500">
                                    {gUrl && (
                                      <img
                                        src={gUrl}
                                        alt={g.nationality_code ?? ''}
                                        width={14}
                                        className="rounded-sm"
                                        style={{ border: '1px solid rgba(0,0,0,0.08)' }}
                                      />
                                    )}
                                    {g.first_name} {g.last_name}
                                  </span>
                                );
                              })}
                          </div>
                        )}

                        <span className="text-xs text-gray-500 truncate">
                          {ci.room_number ? `${t('checkinWizard.roomShort')} ${ci.room_number}` : t('hotelHistory.noUnit')}
                          {' · '}<span className="font-mono">{ci.reference}</span>
                          {ci.guests_count > 1 && ` · ${t('authorityHotelDetail.guestsAbbrev', { count: ci.guests_count })}`}
                        </span>
                        <span className="text-xs text-gray-400">
                          {fmtRange(ci.check_in_date, ci.expected_check_out_date, locale)}
                          {ci.actual_check_out_date && ` · ${t('authorityHotelDetail.actualDeparture')} ${fmtDate(ci.actual_check_out_date, locale)}`}
                        </span>
                      </div>

                      {/* Status */}
                      <span className="text-[11px] font-bold shrink-0 mt-1" style={{ color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {checkIns && lastPage > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-gray-400">
                {t('common.page')} {checkIns.meta.current_page} / {lastPage}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-sm text-gray-600 font-medium">{page}</span>
                <button
                  onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                  disabled={page === lastPage}
                  className="flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </AuthorityLayout>
  );
};
