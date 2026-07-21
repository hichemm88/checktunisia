import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, X, Trash2, ExternalLink, Pencil } from 'lucide-react';
import { adminPagesApi, type AdminPageListItem } from '@/api/admin/cms';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { ListSkeleton } from '@/components/admin/ListSkeleton';

const PageRow = ({ page }: { page: AdminPageListItem }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteMut = useAdminMutation({
    mutationFn: () => adminPagesApi.remove(page.id),
    successMessage: t('adminPages.pageDeleted'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pages'] }),
  });

  return (
    <div className="flex flex-col gap-2 py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0" style={{ background: 'var(--qayed-cachet-dilue)' }}>
            <FileText className="h-4 w-4" style={{ color: 'var(--qayed-cachet)' }} />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold truncate">/{page.slug}</p>
            <p className="text-xs text-gray-400">
              {page.languages.length ? page.languages.map((l) => l.toUpperCase()).join(' · ') : t('adminPages.noContent')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${page.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {page.status === 'published' ? t('adminPages.published') : t('adminPages.draft')}
          </span>
          {page.status === 'published' && (
            <a href={`/fr/${page.slug}`} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-gray-300 hover:bg-[--qayed-cachet-dilue] hover:text-[--qayed-cachet]" title={t('adminPages.view')}>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <Link to={`/admin/pages/${page.id}/edit`} className="rounded-lg p-1.5 text-gray-300 hover:bg-[--qayed-cachet-dilue] hover:text-[--qayed-cachet]" title={t('common.edit')}>
            <Pencil className="h-3.5 w-3.5" />
          </Link>
          <button onClick={() => setConfirmDelete((s) => !s)} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {confirmDelete && (
        <div className="flex gap-2 p-2 rounded-lg bg-red-50 items-center">
          <p className="text-xs text-gray-700 flex-1">{t('adminPages.confirmDelete')}</p>
          <button onClick={() => deleteMut.mutate()} className="text-xs font-bold text-red-600">{t('common.confirm')}</button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400">{t('common.cancel')}</button>
        </div>
      )}
    </div>
  );
};

export const AdminPagesPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [slug, setSlug] = useState('');

  const { data: pages, isLoading } = useQuery({ queryKey: ['admin-pages'], queryFn: adminPagesApi.list });

  const createMut = useAdminMutation({
    mutationFn: () => adminPagesApi.create({ slug: slug.trim().toLowerCase() }),
    successMessage: t('adminPages.pageCreated'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-pages'] }); setShowCreate(false); setSlug(''); },
  });

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="qayed-display text-xl text-gray-900">{t('adminPages.title')}</h1>
        <Button size="sm" onClick={() => setShowCreate((s) => !s)} className="gap-1.5">
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showCreate ? t('common.cancel') : t('common.add')}
        </Button>
      </div>

      <p className="text-sm text-gray-500">{t('adminPages.hint')}</p>

      {showCreate && (
        <div className="card p-4 flex items-end gap-2">
          <div className="flex-1">
            <Input label={t('adminPages.slugLabel')} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="a-propos" />
          </div>
          <Button size="sm" loading={createMut.isPending} disabled={!slug.trim()} onClick={() => createMut.mutate()}>{t('adminHotels.create')}</Button>
        </div>
      )}

      <div className="card p-4">
        {isLoading && <ListSkeleton rows={3} />}
        {pages?.map((p) => <PageRow key={p.id} page={p} />)}
        {!isLoading && !pages?.length && <p className="py-6 text-center text-sm text-gray-400">{t('adminPages.empty')}</p>}
      </div>
    </div>
  );
};
