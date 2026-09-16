import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus, Trash2, X } from 'lucide-react';
import { integrationsApi } from '@/api/integrations';
import { organizationApi } from '@/api/organization';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { EmptyState } from '@/components/ui/EmptyState';

const dateFmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * Section « Intégrations » du dashboard établissement — génération de codes
 * de liaison pour des plateformes tierces (API publique v1) et vue des
 * partenaires actuellement liés. Owner uniquement (route org.owner).
 */
export const IntegrationsPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [generatedCode, setGeneratedCode] = useState<{ code: string; expires_at: string } | null>(null);

  const { data: properties } = useQuery({ queryKey: ['org-properties'], queryFn: organizationApi.properties });
  const { data: links, isLoading } = useQuery({ queryKey: ['establishment-integrations'], queryFn: integrationsApi.list });

  const generateMut = useAdminMutation({
    mutationFn: () => integrationsApi.generateLinkCode(selectedHotelId),
    onSuccess: (data) => setGeneratedCode(data),
  });

  const revokeMut = useAdminMutation({
    mutationFn: (linkId: string) => integrationsApi.revoke(linkId),
    successMessage: t('integrations.linkRevoked'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['establishment-integrations'] }),
  });

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl">
      <div>
        <h1 className="qayed-display text-xl text-gray-900">{t('integrations.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('integrations.subtitle')}</p>
      </div>

      <div className="card p-4 flex flex-col gap-3">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{t('integrations.generateCode')}</p>
        <Select
          label={t('integrations.generateCodeFor')}
          value={selectedHotelId}
          onChange={(e) => { setSelectedHotelId(e.target.value); setGeneratedCode(null); }}
          options={[{ value: '', label: t('adminUsers.choose') }, ...(properties ?? []).map((p) => ({ value: p.id, label: p.name }))]}
        />
        <Button size="sm" disabled={!selectedHotelId} loading={generateMut.isPending} onClick={() => generateMut.mutate()} className="w-fit">
          <Plus className="h-3.5 w-3.5" /> {t('integrations.generateCode')}
        </Button>

        {generatedCode && (
          <div className="rounded-xl border p-3 flex flex-col gap-2" style={{ borderColor: 'var(--qayed-vigilance)', background: 'var(--qayed-vigilance-fond)' }}>
            <p className="text-xs font-bold" style={{ color: 'var(--qayed-vigilance-texte)' }}>{t('integrations.codeGenerated')}</p>
            <p className="text-xs" style={{ color: 'var(--qayed-vigilance-texte)' }}>{t('integrations.codeGeneratedHint')}</p>
            <div className="flex items-center gap-2">
              <code className="text-lg font-mono font-bold tracking-widest">{generatedCode.code}</code>
              <button onClick={() => navigator.clipboard.writeText(generatedCode.code)} aria-label={t('common.copy')}>
                <Copy className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <p className="text-[11px] text-gray-500">{t('integrations.expiresAt', { date: dateFmt(generatedCode.expires_at) })}</p>
            <Button size="sm" variant="ghost" onClick={() => setGeneratedCode(null)} className="w-fit">
              <X className="h-3.5 w-3.5" /> {t('common.close')}
            </Button>
          </div>
        )}
      </div>

      <div className="card p-4 flex flex-col gap-3">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{t('integrations.linkedPartners')}</p>
        {isLoading && <p className="text-xs text-gray-400">{t('common.loading')}</p>}
        {!isLoading && !links?.length && (
          <EmptyState title={t('integrations.noLinks')} />
        )}
        <div className="flex flex-col gap-2">
          {links?.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-lg bg-white border border-gray-100 px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-gray-900">{l.partner_name}</p>
                <p className="text-xs text-gray-400">{l.hotel_name} · {dateFmt(l.linked_at)}</p>
              </div>
              {l.active ? (
                <button
                  onClick={() => { if (window.confirm(t('integrations.revokeConfirm'))) revokeMut.mutate(l.id); }}
                  className="flex items-center gap-1 text-xs font-semibold text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t('integrations.revoke')}
                </button>
              ) : (
                <span className="text-xs text-gray-400">{t('integrations.revoked')}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
