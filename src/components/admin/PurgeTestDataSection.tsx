import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eraser } from 'lucide-react';
import { adminPartnersApi, type AdminPurgeCounts, type AdminPurgePreview } from '@/api/admin/partners';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';

/** Lignes supprimées, dans l'ordre d'affichage. Les indicateurs (chambres, conservés) sont à part. */
const DELETED_KEYS: (keyof AdminPurgeCounts)[] = [
  'sessions', 'drafts', 'fiches', 'guests', 'travel_documents', 'scans', 'whatsapp_jobs', 'notifications', 'webhook_deliveries',
];

type ConflictError = { response?: { status?: number; data?: { data?: AdminPurgePreview } } };

/**
 * Admin → Partenaires API → détail → « Purger les données de test ».
 *
 * Deux temps imposés par le serveur : aperçu sans effet (comptes par type +
 * jeton), puis exécution avec ce jeton. La modale affiche les nombres et
 * demande de recopier le total avant d'activer la suppression. Si les données
 * ont changé entre-temps (409), les nouveaux comptes remplacent l'aperçu et la
 * confirmation est à refaire.
 */
export const PurgeTestDataSection = ({ partnerId }: { partnerId: string }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<AdminPurgePreview | null>(null);
  const [typed, setTyped] = useState('');
  const [changed, setChanged] = useState(false);

  const close = () => { setPreview(null); setTyped(''); setChanged(false); };

  const previewMut = useMutation({
    mutationFn: () => adminPartnersApi.previewTestDataPurge(partnerId),
    onSuccess: (data) => { setPreview(data); setTyped(''); setChanged(false); },
    onError: (err) => toast(extractErrors(err), 'error'),
  });

  const purgeMut = useMutation({
    mutationFn: (token: string) => adminPartnersApi.purgeTestData(partnerId, token),
    onSuccess: (res) => {
      toast(t('adminPartners.purge.done', { count: res.total }), 'success');
      close();
      for (const key of ['admin-partner-metrics', 'admin-partner-deliveries', 'admin-partner-detail']) {
        qc.invalidateQueries({ queryKey: [key, partnerId] });
      }
      qc.invalidateQueries({ queryKey: ['admin-partners'] });
    },
    onError: (err) => {
      const response = (err as ConflictError).response;
      if (response?.status === 409 && response.data?.data) {
        setPreview(response.data.data);
        setTyped('');
        setChanged(true);
        return;
      }
      toast(extractErrors(err), 'error');
    },
  });

  const confirmed = preview !== null && preview.total > 0 && typed.trim() === String(preview.total);

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('adminPartners.purge.section')}</p>
      <p className="text-xs text-gray-500 mb-2">{t('adminPartners.purge.hint')}</p>
      <Button size="sm" variant="secondary" loading={previewMut.isPending} onClick={() => previewMut.mutate()}>
        <Eraser className="h-3.5 w-3.5" aria-hidden="true" /> {t('adminPartners.purge.button')}
      </Button>

      <Modal open={preview !== null} onClose={close} title={t('adminPartners.purge.title')}>
        {preview && (
          <div className="flex flex-col gap-3">
            {changed && (
              <p role="alert" className="text-xs font-semibold" style={{ color: 'var(--qayed-vigilance-texte)' }}>
                {t('adminPartners.purge.changed')}
              </p>
            )}

            {preview.total === 0 ? (
              <p className="text-sm text-gray-600">{t('adminPartners.purge.nothing')}</p>
            ) : (
              <>
                <p className="text-sm text-gray-700">{t('adminPartners.purge.intro', { count: preview.total })}</p>
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm" data-testid="purge-counts">
                  {DELETED_KEYS.filter((k) => preview.counts[k] > 0).map((k) => (
                    <div key={k} className="contents">
                      <dt className="text-gray-500">{t(`adminPartners.purge.counts.${k}`)}</dt>
                      <dd className="text-end font-semibold tabular-nums">{preview.counts[k]}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            <ul className="text-xs text-gray-500 list-disc ps-4">
              <li>{t('adminPartners.purge.roomsReleased', { count: preview.counts.rooms_released })}</li>
              <li>{t('adminPartners.purge.kept', { count: preview.counts.kept_check_ins })}</li>
              <li>{t('adminPartners.purge.neverLive')}</li>
            </ul>

            {preview.total > 0 && (
              <>
                <Input
                  label={t('adminPartners.purge.typeTotal', { count: preview.total })}
                  value={typed}
                  inputMode="numeric"
                  onChange={(e) => setTyped(e.target.value)}
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={close}>{t('common.cancel')}</Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={!confirmed}
                    loading={purgeMut.isPending}
                    onClick={() => purgeMut.mutate(preview.confirmation_token)}
                  >
                    {t('adminPartners.purge.confirm', { count: preview.total })}
                  </Button>
                </div>
              </>
            )}
            {preview.total === 0 && (
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" onClick={close}>{t('common.close')}</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
