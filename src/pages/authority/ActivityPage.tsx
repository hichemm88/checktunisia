import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Activity, Search, Eye, User, Calendar, Globe2 } from 'lucide-react';
import { AuthorityLayout } from '@/components/layout/AuthorityLayout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { authorityApi } from '@/api/authority';
import { type AuthorityActivity } from '@/types';

const actionIcon = (action: string) => {
  if (action.includes('search'))       return <Search className="h-4 w-4" />;
  if (action.includes('hotel_viewed')) return <Globe2 className="h-4 w-4" />;
  return <Eye className="h-4 w-4" />;
};

const actionColor = (action: string): string => {
  if (action.includes('search'))       return '#5346A8';
  if (action.includes('hotel_viewed')) return '#5346A8';
  return '#8B7FE0';
};

const LogRow = ({ log }: { log: AuthorityActivity }) => {
  const { t, i18n } = useTranslation();
  const actionLabel = (action: string): string => {
    const map: Record<string, string> = {
      'authority.search':      t('authorityActivity.actionSearch'),
      'authority.guest_viewed':t('authorityActivity.actionGuestViewed'),
      'authority.hotel_viewed':t('authorityActivity.actionHotelViewed'),
    };
    return map[action] ?? action;
  };
  const color = actionColor(log.action);
  const params = log.new_values?.search_params as Record<string, string> | undefined;
  const resultCount = log.new_values?.result_count as number | undefined;
  const locale = i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'en' ? 'en-GB' : 'fr-TN';

  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-0.5"
        style={{ background: `${color}18`, color }}
      >
        {actionIcon(log.action)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800">{actionLabel(log.action)}</p>
          <span className="text-xs text-gray-400 shrink-0">
            {new Date(log.created_at).toLocaleString(locale, {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <User className="h-3 w-3" /> {log.actor_name}
          </span>
          {log.ip_address && (
            <span className="text-xs text-gray-400 font-mono">{log.ip_address}</span>
          )}
          {typeof resultCount === 'number' && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: `${color}15`, color }}
            >
              {t('authorityActivity.resultCount', { count: resultCount })}
            </span>
          )}
        </div>

        {/* Search parameters preview */}
        {params && Object.keys(params).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {Object.entries(params)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <span
                  key={k}
                  className="rounded-md px-2 py-0.5 text-[10px] font-medium text-gray-600"
                  style={{ background: '#F3F4F6' }}
                >
                  {k.replace(/_/g, ' ')}: <span className="font-semibold text-gray-800">{v}</span>
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const ActivityPage = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo]   = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['authority-activity', { page, from, to }],
    queryFn: () => authorityApi.getActivity({
      page,
      per_page: 25,
      from: from || undefined,
      to: to || undefined,
    }),
    staleTime: 60 * 1000,
  });

  const logs       = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.meta.total / data.meta.per_page) : 1;
  const isNational = (data?.meta as any)?.is_national as boolean | undefined;

  return (
    <AuthorityLayout title={t('authorityLayout.nav.activity')}>
      <div className="flex flex-col gap-6">

        {/* Scope banner */}
        {!isLoading && isNational !== undefined && (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: '#EEEBFA', border: '1px solid #EEEBFA' }}
          >
            <Activity className="h-4 w-4 shrink-0" style={{ color: '#5346A8' }} />
            <p className="text-sm text-gray-700">
              {isNational
                ? t('authorityActivity.nationalScopeHint')
                : t('authorityActivity.ownScopeHint')}
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
            <Input
              type="date" placeholder={t('authorityActivity.from')} value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="w-40"
            />
            <span className="text-gray-400 text-sm">→</span>
            <Input
              type="date" placeholder={t('authorityActivity.to')} value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="w-40"
            />
          </div>
          {(from || to) && (
            <button
              onClick={() => { setFrom(''); setTo(''); setPage(1); }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              {t('authoritySearch.reset')}
            </button>
          )}
        </div>

        {/* Log list */}
        <Card>
          {isLoading && [1,2,3,4,5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 mb-3" />
          ))}

          {isError && (
            <p className="text-center text-red-500 py-8">{t('authorityActivity.loadError')}</p>
          )}

          {!isLoading && !isError && logs.length === 0 && (
            <div className="py-12 text-center">
              <Activity className="mx-auto h-10 w-10 text-gray-200 mb-3" />
              <p className="text-gray-500">{t('authorityActivity.noActivity')}</p>
            </div>
          )}

          {!isLoading && !isError && logs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              ← {t('common.previous')}
            </button>
            <span className="text-sm text-gray-500">
              {t('common.page')} {page} / {totalPages}
              {data && <span className="text-gray-400"> · {t('authorityActivity.entriesCount', { count: data.meta.total })}</span>}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              {t('common.next')} →
            </button>
          </div>
        )}
      </div>
    </AuthorityLayout>
  );
};
