import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Puck, type Data } from '@measured/puck';
import '@measured/puck/puck.css';
import { ArrowLeft, Copy, Eye, Save, Settings2 } from 'lucide-react';
import { adminPagesApi } from '@/api/admin/cms';
import type { CmsLang, CmsPageMeta } from '@/api/cms';
import { puckConfig } from '@/cms/puckConfig';
import { SITE_CSS } from '@/cms/siteCss';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { extractErrors } from '@/lib/api';

const LANGS: CmsLang[] = ['fr', 'en', 'ar'];
const emptyData = (): Data => ({ content: [], root: { props: {} } });

/**
 * Éditeur Puck d'une page CMS — plein écran, chargé en lazy (le bundle Puck
 * ne doit jamais être servi aux visiteurs du site public).
 * Un arbre Puck par langue (onglets FR/EN/AR), méta SEO par langue,
 * brouillon/publication. Le CSS du site est injecté pour que le canvas de
 * l'éditeur ressemble au rendu réel.
 */
export const AdminPageEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [lang, setLang] = useState<CmsLang>('fr');
  const [showMeta, setShowMeta] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<Partial<Record<CmsLang, Data>>>({});
  const [meta, setMeta] = useState<Partial<Record<CmsLang, CmsPageMeta>>>({});

  const { data: page, isLoading } = useQuery({
    queryKey: ['admin-page', id],
    queryFn: async () => {
      const p = await adminPagesApi.show(id!);
      setContent(p.content ?? {});
      setMeta(p.meta ?? {});
      return p;
    },
    enabled: !!id,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const currentData = useMemo(() => content[lang] ?? emptyData(), [content, lang]);

  const persist = async (extra: { status?: 'draft' | 'published' } = {}) => {
    setSaving(true);
    try {
      const updated = await adminPagesApi.update(id!, { content, meta, ...extra });
      qc.invalidateQueries({ queryKey: ['admin-pages'] });
      qc.setQueryData(['admin-page', id], updated);
      qc.invalidateQueries({ queryKey: ['cms-page', updated.slug] });
      setDirty(false);
      toast(extra.status === 'published' ? t('adminPages.publishedToast') : t('adminPages.savedToast'), 'success');
    } catch (err) {
      toast(extractErrors(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const copyFromFr = () => {
    if (!content.fr) return;
    setContent((c) => ({ ...c, [lang]: JSON.parse(JSON.stringify(c.fr)) as Data }));
    setDirty(true);
  };

  if (isLoading || !page) return <div className="p-8 text-sm text-gray-400">…</div>;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Le canvas Puck rend les blocs avec le CSS du site */}
      <style>{SITE_CSS}</style>

      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/admin/pages" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> {t('adminPages.title')}
          </Link>
          <span className="font-mono text-sm font-semibold truncate">/{page.slug}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${page.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {page.status === 'published' ? t('adminPages.published') : t('adminPages.draft')}
          </span>
          {dirty && <span className="text-xs text-amber-600">{t('adminPages.unsaved')}</span>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex gap-1 p-0.5 rounded-lg bg-gray-100">
            {LANGS.map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className="px-2.5 py-1 rounded-md text-xs font-bold uppercase transition-colors"
                style={lang === l ? { background: 'var(--qayed-cachet)', color: '#fff' } : { color: '#6B7280' }}>
                {l}{!content[l]?.content?.length && ' ∅'}
              </button>
            ))}
          </div>
          {lang !== 'fr' && !!content.fr?.content?.length && (
            <Button size="sm" variant="secondary" onClick={copyFromFr} className="gap-1.5" title={t('adminPages.copyFromFrHint')}>
              <Copy className="h-3.5 w-3.5" /> {t('adminPages.copyFromFr')}
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setShowMeta((s) => !s)} className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" /> SEO
          </Button>
          {page.status === 'published' && (
            <a href={`/${lang}/${page.slug}`} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-gray-400 hover:text-gray-700" title={t('adminPages.view')}>
              <Eye className="h-4 w-4" />
            </a>
          )}
          <Button size="sm" loading={saving} onClick={() => persist()} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> {t('common.save')}
          </Button>
          {page.status !== 'published' ? (
            <Button size="sm" loading={saving} variant="secondary" onClick={() => persist({ status: 'published' })}>
              {t('adminPages.publish')}
            </Button>
          ) : (
            <Button size="sm" loading={saving} variant="ghost" onClick={() => persist({ status: 'draft' })}>
              {t('adminPages.unpublish')}
            </Button>
          )}
        </div>
      </div>

      {showMeta && (
        <div className="grid grid-cols-2 gap-3 px-4 py-3 border-b border-gray-100 shrink-0" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <Input label={`${t('adminPages.metaTitle')} (${lang.toUpperCase()})`}
            value={meta[lang]?.title ?? ''}
            onChange={(e) => { setMeta((m) => ({ ...m, [lang]: { ...m[lang], title: e.target.value } })); setDirty(true); }} />
          <Input label={`${t('adminPages.metaDescription')} (${lang.toUpperCase()})`}
            value={meta[lang]?.description ?? ''}
            onChange={(e) => { setMeta((m) => ({ ...m, [lang]: { ...m[lang], description: e.target.value } })); setDirty(true); }} />
        </div>
      )}

      <div className="flex-1 min-h-0" dir="ltr">
        {/* key={lang} : remonte Puck proprement à chaque changement de langue */}
        <Puck
          key={lang}
          config={puckConfig}
          data={currentData}
          onChange={(d) => { setContent((c) => ({ ...c, [lang]: d })); setDirty(true); }}
          onPublish={() => persist()}
        />
      </div>
    </div>
  );
};

export default AdminPageEditorPage;
