import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation, Trans } from 'react-i18next';
import { Shield, Plus, Upload, Download, Trash2, ToggleLeft, ToggleRight, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthorityLayout } from '@/components/layout/AuthorityLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authorityApi } from '@/api/authority';
import { WatchlistEntry, WatchlistSeverity, WatchlistReasonCode } from '@/types';
import { extractErrors } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

// ─── Add Entry Modal ──────────────────────────────────────────────────────────
const AddEntryModal = ({ onClose, isMinistry }: { onClose: () => void; isMinistry: boolean }) => {
  const { t } = useTranslation();
  const REASON_LABELS: Record<WatchlistReasonCode, string> = {
    MANDAT_ARRET: t('authorityWatchlist.reasonWarrant'),
    FRAUDE:       t('authorityWatchlist.reasonFraud'),
    MIGRATION:    t('authorityWatchlist.reasonMigration'),
    AUTRE:        t('authorityWatchlist.reasonOther'),
  };
  const qc = useQueryClient();
  const [form, setForm] = useState({
    document_number: '', document_type: 'passport',
    first_name: '', last_name: '', date_of_birth: '', nationality_code: '',
    severity: 'moyen' as WatchlistSeverity, reason_code: 'AUTRE' as WatchlistReasonCode,
    reason: '', expires_at: '',
  });
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => authorityApi.addWatchlistEntry({
      ...form,
      document_number: form.document_number || undefined,
      first_name: form.first_name || undefined,
      last_name: form.last_name || undefined,
      date_of_birth: form.date_of_birth || undefined,
      nationality_code: form.nationality_code || undefined,
      expires_at: form.expires_at || undefined,
      reason: form.reason || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['watchlist'] }); onClose(); },
    onError: (e) => setError(extractErrors(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="h-4 w-4" style={{ color: '#5346A8' }} /> {t('authorityWatchlist.addPerson')}
          </h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-gray-500">
            <Trans t={t as any} i18nKey="authorityWatchlist.identCriteriaHint" components={{ strong: <strong /> }} />
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Input label={t('authorityWatchlist.documentNumberLabel')} placeholder={t('authoritySearch.documentNumberPlaceholder')} value={form.document_number} onChange={e => set('document_number', e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">{t('guestScan.documentType')}</label>
              <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-qayed-cachet/20" value={form.document_type} onChange={e => set('document_type', e.target.value)}>
                <option value="passport">{t('guestScan.passport')}</option>
                <option value="national_id">{t('authorityWatchlist.nationalCard')}</option>
                <option value="any">{t('authorityWatchlist.anyType')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label={t('guestScan.firstName')} value={form.first_name} onChange={e => set('first_name', e.target.value)} />
            <Input label={t('authorityWatchlist.lastNameLabel')} value={form.last_name} onChange={e => set('last_name', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label={t('guestScan.dateOfBirth')} type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
            <Input label={t('authoritySearch.nationalityCode')} placeholder="TUN" maxLength={3} value={form.nationality_code} onChange={e => set('nationality_code', e.target.value.toUpperCase())} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">{t('authorityWatchlist.severityLabel')}</label>
              <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-qayed-cachet/20" value={form.severity} onChange={e => set('severity', e.target.value)}>
                <option value="critique">{t('authoritySearch.severityCritical')}</option>
                <option value="eleve">{t('authoritySearch.severityHigh')}</option>
                <option value="moyen">{t('authorityWatchlist.severityMedium')}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">{t('authorityWatchlist.reasonCodeLabel')}</label>
              <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-qayed-cachet/20" value={form.reason_code} onChange={e => set('reason_code', e.target.value)}>
                {Object.entries(REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <Input label={t('authorityWatchlist.expiresOptional')} type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} hint={t('authorityWatchlist.expiresHint')} />

          {isMinistry && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">{t('authorityWatchlist.confidentialNote')}</label>
              <textarea
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-qayed-cachet/20 resize-none"
                rows={2} placeholder={t('authorityWatchlist.caseDetails')} value={form.reason} onChange={e => set('reason', e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} style={{ background: '#5346A8', color: '#fff' }}>
            {t('common.add')}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Import Modal ─────────────────────────────────────────────────────────────
const ImportModal = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const mutation = useMutation({
    mutationFn: () => authorityApi.importWatchlist(file!),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const downloadTemplate = async () => {
    const res = await authorityApi.downloadTemplate();
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url; a.download = 'watchlist_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Upload className="h-4 w-4" /> {t('authorityWatchlist.importFromCsv')}
          </h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!result ? (
            <>
              <button onClick={downloadTemplate} className="flex items-center gap-2 text-sm underline" style={{ color: '#5346A8' }}>
                <Download className="h-4 w-4" /> {t('authorityWatchlist.downloadTemplate')}
              </button>
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
                {file
                  ? <p className="text-sm font-medium text-gray-700">{file.name}</p>
                  : <p className="text-sm text-gray-400">{t('authorityWatchlist.dropCsvHint')}</p>
                }
                <input type="file" accept=".csv,.txt" className="hidden" id="csv-upload"
                  onChange={e => setFile(e.target.files?.[0] ?? null)} />
                <label htmlFor="csv-upload" className="mt-3 inline-block cursor-pointer rounded-lg px-4 py-2 text-sm font-medium" style={{ background: '#EEEBFA', color: '#5346A8' }}>
                  {t('authorityWatchlist.chooseFile')}
                </label>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl p-4" style={{ background: '#E4F5EC' }}>
                <p className="text-sm font-semibold text-green-800">{t('authorityWatchlist.recordsImported', { count: result.created })}</p>
                {result.skipped > 0 && <p className="text-xs text-green-700 mt-1">{t('authorityWatchlist.linesSkipped', { count: result.skipped })}</p>}
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: '#FEF2F2' }}>
                  <p className="text-xs font-semibold text-red-800 mb-1">{t('authorityWatchlist.errors')} :</p>
                  {result.errors.map((e, i) => <p key={i} className="text-xs text-red-700">{e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>{result ? t('common.close') : t('common.cancel')}</Button>
          {!result && (
            <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!file} style={{ background: '#5346A8', color: '#fff' }}>
              {t('authorityWatchlist.import')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export const WatchlistPage = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'en' ? 'en-GB' : 'fr-TN';
  const SEVERITY_CONFIG: Record<WatchlistSeverity, { label: string; color: string; bg: string; border: string }> = {
    critique: { label: t('authorityWatchlist.severityCriticalShort'), color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
    eleve:    { label: t('authorityWatchlist.severityHighShort'),    color: '#8A6206', bg: '#FBF0D7', border: '#FBF0D7' },
    moyen:    { label: t('authorityWatchlist.severityMedium'),    color: '#10222E', bg: '#EEEBFA', border: '#5346A8' },
  };
  const REASON_LABELS: Record<WatchlistReasonCode, string> = {
    MANDAT_ARRET: t('authorityWatchlist.reasonWarrant'),
    FRAUDE:       t('authorityWatchlist.reasonFraud'),
    MIGRATION:    t('authorityWatchlist.reasonMigration'),
    AUTRE:        t('authorityWatchlist.reasonOther'),
  };
  const { user } = useAuthStore();
  const isMinistry = user?.authority_profile?.org_type === 'ministry';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Reset to page 1 when filters change
  const handleSearch = (val: string) => { setSearch(val); setPage(1); };
  const handleSeverity = (val: string) => { setSeverity(val); setPage(1); };

  const { data, isLoading } = useQuery({
    queryKey: ['watchlist', search, severity, page],
    queryFn: () => authorityApi.getWatchlist({ search: search || undefined, severity: severity || undefined, page }),
  });

  const toggleMutation = useMutation({
    mutationFn: (entry: WatchlistEntry) =>
      authorityApi.updateWatchlistEntry(entry.id, { status: entry.status === 'active' ? 'inactive' : 'active' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authorityApi.deleteWatchlistEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  return (
    <AuthorityLayout title={t('authorityWatchlist.title')}>
      {showAdd && <AddEntryModal onClose={() => setShowAdd(false)} isMinistry={isMinistry} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}

      <div className="flex flex-col gap-6">
        {/* Header actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {t('authorityWatchlist.watchedCount', { count: data?.meta.total ?? 0 })}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" className="gap-2" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4" /> {t('authorityWatchlist.importCsv')}
            </Button>
            <Button className="gap-2" onClick={() => setShowAdd(true)} style={{ background: '#5346A8', color: '#fff' }}>
              <Plus className="h-4 w-4" /> {t('common.add')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <Input
                label={t('common.search')}
                placeholder={t('authorityWatchlist.searchPlaceholder')}
                value={search}
                onChange={e => handleSearch(e.target.value)}
                leftIcon={<Search className="h-3.5 w-3.5 text-gray-400" />}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">{t('authorityWatchlist.degree')}</label>
              <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none" value={severity} onChange={e => handleSeverity(e.target.value)}>
                <option value="">{t('common.all')}</option>
                <option value="critique">{t('authoritySearch.severityCritical')}</option>
                <option value="eleve">{t('authoritySearch.severityHigh')}</option>
                <option value="moyen">{t('authorityWatchlist.severityMedium')}</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Entries list */}
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">{t('common.loading')}</div>
        ) : data?.data.length === 0 ? (
          <div className="py-12 text-center">
            <Shield className="mx-auto h-10 w-10 text-gray-200 mb-3" />
            <p className="text-gray-500">{t('authorityWatchlist.noWatchedPerson')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('authorityWatchlist.addOrImportHint')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {data?.data.map((entry) => {
              const cfg = SEVERITY_CONFIG[entry.severity];
              const isGlobal = entry.source === 'opensanctions';
              const fmtDob = entry.date_of_birth
                ? new Date(entry.date_of_birth + 'T00:00:00').toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
                : null;

              return (
                <div
                  key={entry.id}
                  className="rounded-xl bg-white shadow-sm border overflow-hidden"
                  style={{ borderColor: '#E5E7EB', borderLeftWidth: 4, borderLeftColor: cfg.color }}
                >
                  <div className="flex items-start gap-3 px-4 py-3">

                    {/* Severity chip */}
                    <span
                      className="shrink-0 mt-0.5 rounded-md px-2 py-0.5 text-[10px] font-black tracking-widest uppercase"
                      style={{ color: cfg.color, background: cfg.bg }}
                    >
                      {cfg.label}
                    </span>

                    {/* Identity block */}
                    <div className="flex-1 min-w-0">
                      {/* Name row */}
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">
                          {entry.last_name || '—'}
                          {entry.first_name && <span className="font-normal text-gray-600">, {entry.first_name}</span>}
                        </span>
                        {entry.nationality_code && (
                          <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">
                            {entry.nationality_code}
                          </span>
                        )}
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        {fmtDob && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="text-gray-300">{t('authorityWatchlist.bornOn')}</span> {fmtDob}
                          </span>
                        )}
                        {entry.document_number && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="text-gray-300">{t('authorityWatchlist.docAbbrev')}</span> <span className="font-mono">{entry.document_number}</span>
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{REASON_LABELS[entry.reason_code]}</span>
                      </div>

                      {/* Optional rows */}
                      {entry.expires_at && (
                        <p className="text-xs text-orange-500 mt-0.5">{t('authorityAlerts.expiresOn', { date: entry.expires_at })}</p>
                      )}
                      {isMinistry && entry.reason && (
                        <p className="text-xs italic text-gray-400 mt-0.5 line-clamp-1">"{entry.reason}"</p>
                      )}
                      {isMinistry && entry.organization_name && (
                        <p className="text-xs text-gray-300 mt-0.5">↳ {entry.organization_name}</p>
                      )}
                    </div>

                    {/* Right column */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {/* Source badge */}
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={isGlobal
                          ? { background: '#FEF2F2', color: '#991B1B' }
                          : { background: '#F3F4F6', color: '#9CA3AF' }
                        }
                      >
                        {isGlobal ? t('authorityWatchlist.sourceInterpolUn') : entry.source === 'import' ? t('authorityWatchlist.sourceCsvImport') : t('authorityWatchlist.sourceManual')}
                      </span>

                      {/* Actions */}
                      {!isGlobal && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleMutation.mutate(entry)}
                            title={entry.status === 'active' ? t('authorityWatchlist.deactivate') : t('authorityWatchlist.activate')}
                            className="text-gray-300 hover:text-gray-600 transition-colors"
                          >
                            {entry.status === 'active'
                              ? <ToggleRight className="h-5 w-5 text-green-500" />
                              : <ToggleLeft className="h-5 w-5" />
                            }
                          </button>
                          <button
                            onClick={() => { if (confirm(t('authorityWatchlist.confirmDelete'))) deleteMutation.mutate(entry.id); }}
                            className="text-gray-200 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {data && data.meta.last_page > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">
              {t('common.page')} {data.meta.current_page} / {data.meta.last_page}
              <span className="ms-2">· {t('authorityActivity.entriesCount', { count: data.meta.total })}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page numbers */}
              {Array.from({ length: data.meta.last_page }, (_, i) => i + 1)
                .filter(p => p === 1 || p === data.meta.last_page || Math.abs(p - page) <= 1)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...'
                    ? <span key={`dots-${i}`} className="px-1 text-gray-300 text-sm">…</span>
                    : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className="h-8 w-8 rounded-lg text-sm font-medium border transition-colors"
                        style={page === p
                          ? { background: '#5346A8', color: '#fff', borderColor: '#5346A8' }
                          : { borderColor: '#E5E7EB', color: '#6B7280' }
                        }
                      >
                        {p}
                      </button>
                    )
                )
              }

              <button
                onClick={() => setPage(p => Math.min(data.meta.last_page, p + 1))}
                disabled={page === data.meta.last_page}
                className="flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-400 pt-2">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-600 inline-block"></span> {t('authorityWatchlist.legendCritical')}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-400 inline-block"></span> {t('authorityWatchlist.legendHigh')}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-400 inline-block"></span> {t('authorityWatchlist.legendMedium')}</span>
        </div>
      </div>
    </AuthorityLayout>
  );
};
