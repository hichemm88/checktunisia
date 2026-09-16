import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Copy, Globe2, KeyRound, Link2, Plug, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import {
  adminPartnersApi,
  type AdminPartner,
  type AdminWebhookEndpoint,
} from '@/api/admin/partners';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { extractErrors } from '@/lib/api';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';

const dateFmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

// ─── Création ───────────────────────────────────────────────────────────────

const CreatePartnerForm = ({ onDone }: { onDone: () => void }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [origins, setOrigins] = useState('');
  const [error, setError] = useState('');

  const mut = useAdminMutation({
    mutationFn: () => adminPartnersApi.create({
      name,
      allowed_widget_origins: origins.split(',').map((o) => o.trim()).filter(Boolean),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-partners'] }); onDone(); },
    onError: (err) => setError(extractErrors(err)),
  });

  return (
    <div className="card p-4 flex flex-col gap-3">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{t('adminPartners.newPartner')}</p>
      <Input label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        label={t('adminPartners.allowedOrigins')}
        hint={t('adminPartners.allowedOriginsHint')}
        value={origins}
        onChange={(e) => setOrigins(e.target.value)}
        placeholder="https://diar.example"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" loading={mut.isPending} disabled={!name} onClick={() => mut.mutate()}>{t('common.add')}</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>{t('common.cancel')}</Button>
      </div>
    </div>
  );
};

// ─── Clés API ───────────────────────────────────────────────────────────────

const KeysSection = ({ partnerId }: { partnerId: string }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState<string | null>(null);

  const { data: detail } = useQuery({ queryKey: ['admin-partner-detail', partnerId], queryFn: () => adminPartnersApi.show(partnerId) });

  const issueMut = useAdminMutation({
    mutationFn: (mode: 'live' | 'test') => adminPartnersApi.issueKey(partnerId, mode),
    onSuccess: (key) => { setRevealed(key.plaintext); qc.invalidateQueries({ queryKey: ['admin-partner-detail', partnerId] }); },
  });
  const revokeMut = useAdminMutation({
    mutationFn: (keyId: string) => adminPartnersApi.revokeKey(partnerId, keyId),
    successMessage: t('adminPartners.keyRevoked'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-partner-detail', partnerId] }),
  });

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('adminPartners.apiKeys')}</p>

      {revealed && (
        <div className="mb-3 rounded-xl border p-3 flex flex-col gap-2" style={{ borderColor: 'var(--qayed-vigilance)', background: 'var(--qayed-vigilance-fond)' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--qayed-vigilance-texte)' }}>{t('adminPartners.keyShownOnce')}</p>
          <div className="flex items-center gap-2">
            <code className="text-xs break-all flex-1">{revealed}</code>
            <button onClick={() => navigator.clipboard.writeText(revealed)} aria-label={t('common.copy')}>
              <Copy className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setRevealed(null)}>{t('common.close')}</Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {detail?.keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between rounded-lg bg-white border border-gray-100 px-3 py-2">
            <div>
              <p className="text-xs font-mono">{k.prefix}…</p>
              <p className="text-[11px] text-gray-400">{k.mode} · {k.revoked_at ? t('adminPartners.revoked') : t('adminPartners.active')}</p>
            </div>
            {!k.revoked_at && (
              <button onClick={() => revokeMut.mutate(k.id)} className="text-gray-300 hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {!detail?.keys.length && <p className="text-xs text-gray-400">{t('adminPartners.noKeys')}</p>}
      </div>

      <div className="flex gap-2 mt-2">
        <Button size="sm" variant="secondary" loading={issueMut.isPending} onClick={() => issueMut.mutate('live')}>
          <KeyRound className="h-3.5 w-3.5" /> {t('adminPartners.issueLiveKey')}
        </Button>
        <Button size="sm" variant="secondary" loading={issueMut.isPending} onClick={() => issueMut.mutate('test')}>
          <KeyRound className="h-3.5 w-3.5" /> {t('adminPartners.issueTestKey')}
        </Button>
      </div>
    </div>
  );
};

// ─── Liaisons établissement ─────────────────────────────────────────────────

const LinksSection = ({ partnerId }: { partnerId: string }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: links } = useQuery({ queryKey: ['admin-partner-links', partnerId], queryFn: () => adminPartnersApi.links(partnerId) });

  const revokeMut = useAdminMutation({
    mutationFn: (linkId: string) => adminPartnersApi.revokeLink(partnerId, linkId),
    successMessage: t('adminPartners.linkRevoked'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-partner-links', partnerId] }),
  });

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('adminPartners.establishmentLinks')}</p>
      <div className="flex flex-col gap-2">
        {links?.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-lg bg-white border border-gray-100 px-3 py-2">
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-sm">{l.hotel_name}</span>
              <span className="text-[11px] text-gray-400">{dateFmt(l.linked_at)}</span>
            </div>
            {!l.revoked_at ? (
              <button onClick={() => revokeMut.mutate(l.id)} className="text-gray-300 hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="text-[11px] text-gray-400">{t('adminPartners.revoked')}</span>
            )}
          </div>
        ))}
        {!links?.length && <p className="text-xs text-gray-400">{t('adminPartners.noLinks')}</p>}
      </div>
    </div>
  );
};

// ─── Webhooks ───────────────────────────────────────────────────────────────

const DeliveriesLog = ({ partnerId, endpoint }: { partnerId: string; endpoint: AdminWebhookEndpoint }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-partner-deliveries', partnerId, endpoint.id], queryFn: () => adminPartnersApi.deliveries(partnerId, endpoint.id) });

  const redriveMut = useAdminMutation({
    mutationFn: (deliveryId: number) => adminPartnersApi.redrive(partnerId, endpoint.id, deliveryId),
    successMessage: t('adminPartners.redriven'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-partner-deliveries', partnerId, endpoint.id] }),
  });

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {data?.data.map((d) => (
        <div key={d.id} className="flex items-center justify-between text-xs bg-white border border-gray-100 rounded-lg px-2.5 py-1.5">
          <span className="font-mono">{d.event_type}</span>
          <span style={{ color: d.status === 'sent' ? 'var(--qayed-conforme)' : d.status === 'failed' ? 'var(--qayed-erreur)' : 'var(--qayed-fiche)' }}>
            {d.status} ({d.attempts})
          </span>
          {d.status === 'failed' && (
            <button onClick={() => redriveMut.mutate(d.id)} className="text-gray-400 hover:text-[--qayed-cachet]">
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {!data?.data.length && <p className="text-xs text-gray-400">{t('adminPartners.noDeliveries')}</p>}
    </div>
  );
};

const WebhooksSection = ({ partnerId }: { partnerId: string }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [url, setUrl] = useState('');
  const [secretRevealed, setSecretRevealed] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: endpoints } = useQuery({ queryKey: ['admin-partner-webhooks', partnerId], queryFn: () => adminPartnersApi.webhooks(partnerId) });

  const createMut = useAdminMutation({
    mutationFn: () => adminPartnersApi.createWebhook(partnerId, { url }),
    onSuccess: (endpoint) => {
      setSecretRevealed(endpoint.secret);
      setUrl('');
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['admin-partner-webhooks', partnerId] });
    },
  });
  const toggleMut = useAdminMutation({
    mutationFn: (endpoint: AdminWebhookEndpoint) => adminPartnersApi.updateWebhook(partnerId, endpoint.id, { active: !endpoint.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-partner-webhooks', partnerId] }),
  });
  const deleteMut = useAdminMutation({
    mutationFn: (endpointId: string) => adminPartnersApi.deleteWebhook(partnerId, endpointId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-partner-webhooks', partnerId] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('adminPartners.webhooks')}</p>
        <button onClick={() => setCreating((s) => !s)} className="text-gray-300 hover:text-[--qayed-cachet]">
          {creating ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
      </div>

      {secretRevealed && (
        <div className="mb-3 rounded-xl border p-3 flex flex-col gap-2" style={{ borderColor: 'var(--qayed-vigilance)', background: 'var(--qayed-vigilance-fond)' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--qayed-vigilance-texte)' }}>{t('adminPartners.secretShownOnce')}</p>
          <code className="text-xs break-all">{secretRevealed}</code>
          <Button size="sm" variant="ghost" onClick={() => setSecretRevealed(null)}>{t('common.close')}</Button>
        </div>
      )}

      {creating && (
        <div className="flex flex-col gap-2 mb-2 p-2 rounded-lg bg-white border border-gray-100">
          <Input label="URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://partner.example/webhooks/qayed" />
          <Button size="sm" loading={createMut.isPending} disabled={!url} onClick={() => createMut.mutate()}>{t('common.add')}</Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {endpoints?.map((e) => (
          <div key={e.id} className="rounded-lg bg-white border border-gray-100 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <button className="text-start flex-1 min-w-0" onClick={() => setExpanded((x) => (x === e.id ? null : e.id))}>
                <p className="text-xs font-mono truncate">{e.url}</p>
                <p className="text-[11px] text-gray-400">{e.active ? t('adminPartners.active') : t('adminPartners.disabled')} · {e.consecutive_failures} {t('adminPartners.consecutiveFailures')}</p>
              </button>
              <button onClick={() => toggleMut.mutate(e)} className="text-gray-300 hover:text-[--qayed-cachet]"><Plug className="h-3.5 w-3.5" /></button>
              <button onClick={() => deleteMut.mutate(e.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            {expanded === e.id && <DeliveriesLog partnerId={partnerId} endpoint={e} />}
          </div>
        ))}
        {!endpoints?.length && <p className="text-xs text-gray-400">{t('adminPartners.noWebhooks')}</p>}
      </div>
    </div>
  );
};

// ─── Métriques ──────────────────────────────────────────────────────────────

const MetricsSection = ({ partnerId }: { partnerId: string }) => {
  const { t } = useTranslation();
  const { data } = useQuery({ queryKey: ['admin-partner-metrics', partnerId], queryFn: () => adminPartnersApi.metrics(partnerId) });
  if (!data) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
        <p className="text-[11px] text-gray-400">{t('adminPartners.sessionsCreated')}</p>
        <p className="text-lg font-bold">{data.sessions_created}</p>
      </div>
      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
        <p className="text-[11px] text-gray-400">{t('adminPartners.fichesSubmitted')}</p>
        <p className="text-lg font-bold">{data.fiches_submitted}</p>
      </div>
      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
        <p className="text-[11px] text-gray-400">{t('adminPartners.completionRate')}</p>
        <p className="text-lg font-bold">{data.completion_rate != null ? `${Math.round(data.completion_rate * 100)}%` : '—'}</p>
      </div>
      <div className="rounded-lg bg-white border border-gray-100 p-2.5">
        <p className="text-[11px] text-gray-400">{t('adminPartners.webhookErrors')}</p>
        <p className="text-lg font-bold">{data.webhook_errors}</p>
      </div>
    </div>
  );
};

// ─── Page principale ────────────────────────────────────────────────────────

export const AdminPartnersPage = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<AdminPartner | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-partners', search],
    queryFn: () => adminPartnersApi.list({ search: search || undefined, per_page: 20 }),
  });

  const partners = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <h1 className="qayed-display text-xl text-gray-900">{t('adminPartners.title')}</h1>
        <Button size="sm" onClick={() => setShowCreate((s) => !s)} className="gap-1.5">
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showCreate ? t('common.cancel') : t('common.add')}
        </Button>
      </div>

      {showCreate && <CreatePartnerForm onDone={() => setShowCreate(false)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 flex-col gap-4 lg:flex ${selected ? 'hidden' : 'flex'}`}>
          <Input placeholder={t('common.search') + '…'} value={search} onChange={(e) => setSearch(e.target.value)} />

          {isLoading && <ListSkeleton rows={4} height="h-16" />}
          {isError && <ErrorState onRetry={() => refetch()} />}

          <div className="flex flex-col gap-2">
            {partners.map((p) => (
              <button key={p.id} onClick={() => setSelected(p)} className="card p-4 text-start hover:shadow-md transition-all"
                style={{ outline: selected?.id === p.id ? '2px solid var(--qayed-cachet)' : 'none' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0" style={{ background: 'var(--qayed-cachet-dilue)' }}>
                      <Globe2 className="h-5 w-5" style={{ color: 'var(--qayed-cachet)' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">
                        {t('adminPartners.linksCount', { count: p.establishment_links_count })} · {t('adminPartners.sessionsCount', { count: p.fiche_sessions_count })}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: p.status === 'active' ? 'var(--qayed-conforme)' : 'var(--qayed-erreur)' }}>
                    {p.status === 'active' ? t('adminDashboard.active') : t('adminHotels.statusSuspended')}
                  </span>
                </div>
              </button>
            ))}
            {!isLoading && !partners.length && <p className="text-sm text-gray-400 text-center py-8">{t('adminPartners.noPartner')}</p>}
          </div>
        </div>

        <div className={selected ? '' : 'hidden lg:block'}>
          {!selected ? (
            <div className="card p-8 text-center text-sm text-gray-400">
              <Building2 className="h-8 w-8 mx-auto mb-3 text-gray-200" />
              {t('adminPartners.selectPartner')}
            </div>
          ) : (
            <div className="card p-5 flex flex-col gap-5">
              <button onClick={() => setSelected(null)} className="lg:hidden flex items-center gap-1.5 -mb-1 text-sm font-medium text-gray-500 hover:text-gray-800">
                <ArrowLeft className="h-4 w-4" /> {t('adminShared.backToList')}
              </button>
              <h3 className="font-bold text-gray-900 text-lg leading-tight">{selected.name}</h3>

              <MetricsSection partnerId={selected.id} />
              <KeysSection partnerId={selected.id} />
              <LinksSection partnerId={selected.id} />
              <WebhooksSection partnerId={selected.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
