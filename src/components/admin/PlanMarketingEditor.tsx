import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { adminPlansApi, type AdminPlan, type PlanMarketing, type PlanBullet, type I18nText } from '@/api/admin/subscriptions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAdminMutation } from '@/hooks/useAdminMutation';

const LANGS = ['fr', 'en', 'ar'] as const;
type Lang = (typeof LANGS)[number];

const emptyText = (): I18nText => ({ fr: '', en: '', ar: '' });

const normalize = (m: PlanMarketing | null): Required<Pick<PlanMarketing, 'tier' | 'display_name' | 'tagline' | 'price_note' | 'price_note_yearly' | 'cta_label' | 'bullets'>> & { badge: I18nText | null; featured: boolean } => ({
  tier:              m?.tier ?? emptyText(),
  display_name:      m?.display_name ?? emptyText(),
  tagline:           m?.tagline ?? emptyText(),
  price_note:        m?.price_note ?? emptyText(),
  price_note_yearly: m?.price_note_yearly ?? emptyText(),
  badge:             m?.badge ?? null,
  featured:          m?.featured ?? false,
  cta_label:         m?.cta_label ?? emptyText(),
  bullets:           m?.bullets ?? [],
});

/**
 * Éditeur du contenu public d'un pack (cartes tarifs homepage) : textes
 * trilingues avec onglets FR/EN/AR, badge, featured, et liste de bullets
 * réordonnables. FR obligatoire, EN/AR retombent sur le FR au rendu.
 */
export const PlanMarketingEditor = ({ plan, onDone }: { plan: AdminPlan; onDone: () => void }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [lang, setLang] = useState<Lang>('fr');
  const [form, setForm] = useState(() => normalize(plan.marketing));
  const [hasBadge, setHasBadge] = useState(!!plan.marketing?.badge);

  const setText = (field: 'tier' | 'display_name' | 'tagline' | 'price_note' | 'price_note_yearly' | 'cta_label', value: string) =>
    setForm((f) => ({ ...f, [field]: { ...f[field], [lang]: value } }));
  const setBadgeText = (value: string) =>
    setForm((f) => ({ ...f, badge: { ...(f.badge ?? emptyText()), [lang]: value } }));

  const setBullet = (i: number, patch: Partial<PlanBullet> | { text: string }) =>
    setForm((f) => ({
      ...f,
      bullets: f.bullets.map((b, idx) => {
        if (idx !== i) return b;
        if ('text' in patch && typeof patch.text === 'string') return { ...b, text: { ...b.text, [lang]: patch.text } };
        return { ...b, ...(patch as Partial<PlanBullet>) };
      }),
    }));
  const moveBullet = (i: number, dir: -1 | 1) =>
    setForm((f) => {
      const next = [...f.bullets];
      const j = i + dir;
      if (j < 0 || j >= next.length) return f;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, bullets: next };
    });

  const saveMut = useAdminMutation({
    mutationFn: () => adminPlansApi.update(plan.id, {
      marketing: { ...form, badge: hasBadge ? form.badge ?? emptyText() : null },
    }),
    successMessage: t('adminSubscriptions.marketingSaved'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); onDone(); },
  });

  const missingFr = form.bullets.some((b) => !b.text.fr?.trim());

  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl" style={{ background: 'var(--qayed-papier)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{t('adminSubscriptions.publicContent')}</p>
        <div className="flex gap-1 p-0.5 rounded-lg bg-white">
          {LANGS.map((l) => (
            <button key={l} onClick={() => setLang(l)}
              className="px-2.5 py-1 rounded-md text-xs font-bold uppercase transition-colors"
              style={lang === l ? { background: 'var(--qayed-cachet)', color: '#fff' } : { color: '#6B7280' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <Input label={t('adminSubscriptions.mktTier')} value={form.tier[lang] ?? ''} onChange={(e) => setText('tier', e.target.value)} />
        <Input label={t('adminSubscriptions.mktDisplayName')} value={form.display_name[lang] ?? ''} onChange={(e) => setText('display_name', e.target.value)} />
      </div>
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <Input label={t('adminSubscriptions.mktTagline')} value={form.tagline[lang] ?? ''} onChange={(e) => setText('tagline', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <Input label={t('adminSubscriptions.mktPriceNote')} value={form.price_note[lang] ?? ''} onChange={(e) => setText('price_note', e.target.value)} />
        <Input label={t('adminSubscriptions.mktPriceNoteYearly')} value={form.price_note_yearly[lang] ?? ''} onChange={(e) => setText('price_note_yearly', e.target.value)} />
      </div>
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <Input label={t('adminSubscriptions.mktCta')} value={form.cta_label[lang] ?? ''} onChange={(e) => setText('cta_label', e.target.value)} />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} />
          {t('adminSubscriptions.mktFeatured')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasBadge} onChange={(e) => setHasBadge(e.target.checked)} />
          {t('adminSubscriptions.mktBadge')}
        </label>
        {hasBadge && (
          <div className="flex-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <Input value={form.badge?.[lang] ?? ''} onChange={(e) => setBadgeText(e.target.value)} placeholder={t('adminSubscriptions.mktBadgePlaceholder')} />
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1.5">{t('adminSubscriptions.mktBullets')}</p>
        <div className="flex flex-col gap-1.5">
          {form.bullets.map((b, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input type="checkbox" checked={b.included} title={t('adminSubscriptions.mktIncluded')}
                onChange={(e) => setBullet(i, { included: e.target.checked })} />
              <div className="flex-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <input className={`input w-full text-sm ${!b.included ? 'text-gray-400 line-through' : ''}`}
                  value={b.text[lang] ?? ''} onChange={(e) => setBullet(i, { text: e.target.value })}
                  placeholder={lang !== 'fr' ? b.text.fr : ''} />
              </div>
              <button onClick={() => moveBullet(i, -1)} disabled={i === 0} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => moveBullet(i, 1)} disabled={i === form.bullets.length - 1} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
              <button onClick={() => setForm((f) => ({ ...f, bullets: f.bullets.filter((_, idx) => idx !== i) }))} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
        <button onClick={() => setForm((f) => ({ ...f, bullets: [...f.bullets, { included: true, text: emptyText() }] }))}
          className="mt-1.5 flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--qayed-cachet)' }}>
          <Plus className="h-3.5 w-3.5" /> {t('adminSubscriptions.mktAddBullet')}
        </button>
      </div>

      {missingFr && <p className="text-xs text-amber-600">{t('adminSubscriptions.mktFrRequired')}</p>}

      <div className="flex gap-2">
        <Button size="sm" loading={saveMut.isPending} disabled={missingFr} onClick={() => saveMut.mutate()} className="gap-1.5">
          <Check className="h-3.5 w-3.5" /> {t('common.save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>{t('common.cancel')}</Button>
      </div>
    </div>
  );
};
