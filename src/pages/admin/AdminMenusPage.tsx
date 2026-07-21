import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Menu as MenuIcon, Plus, X, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { adminMenuItemsApi, adminPagesApi, type AdminMenuItem } from '@/api/admin/cms';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAdminMutation } from '@/hooks/useAdminMutation';
import { ListSkeleton } from '@/components/admin/ListSkeleton';

const LANGS = ['fr', 'en', 'ar'] as const;

const ItemForm = ({ initial, onSave, onCancel, saving }: {
  initial?: AdminMenuItem;
  onSave: (data: object) => void;
  onCancel: () => void;
  saving: boolean;
}) => {
  const { t } = useTranslation();
  const { data: pages } = useQuery({ queryKey: ['admin-pages'], queryFn: adminPagesApi.list });
  const [form, setForm] = useState({
    location: initial?.location ?? 'navbar',
    label: { fr: initial?.label.fr ?? '', en: initial?.label.en ?? '', ar: initial?.label.ar ?? '' },
    target: initial?.external_url ? 'external' : 'page',
    page_id: initial?.page_id ?? '',
    external_url: initial?.external_url ?? '',
    is_active: initial?.is_active ?? true,
  });

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'var(--qayed-papier)' }}>
      <div className="grid grid-cols-3 gap-2">
        {LANGS.map((l) => (
          <div key={l} dir={l === 'ar' ? 'rtl' : 'ltr'}>
            <Input label={`${t('adminMenus.label')} ${l.toUpperCase()}`} value={form.label[l]}
              onChange={(e) => setForm((f) => ({ ...f, label: { ...f.label, [l]: e.target.value } }))} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Select label={t('adminMenus.location')} value={form.location}
          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value as 'navbar' | 'footer' }))}
          options={[{ value: 'navbar', label: t('adminMenus.navbar') }, { value: 'footer', label: t('adminMenus.footer') }]} />
        <Select label={t('adminMenus.target')} value={form.target}
          onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
          options={[{ value: 'page', label: t('adminMenus.internalPage') }, { value: 'external', label: t('adminMenus.externalUrl') }]} />
        {form.target === 'page' ? (
          <Select label={t('adminPages.title')} value={form.page_id}
            onChange={(e) => setForm((f) => ({ ...f, page_id: e.target.value }))}
            options={[{ value: '', label: t('adminUsers.choose') }, ...(pages ?? []).map((p) => ({ value: p.id, label: `/${p.slug}${p.status !== 'published' ? ' (brouillon)' : ''}` }))]} />
        ) : (
          <Input label="URL" value={form.external_url} onChange={(e) => setForm((f) => ({ ...f, external_url: e.target.value }))} placeholder="https://…" />
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /> {t('adminDashboard.active')}
      </label>
      <div className="flex gap-2">
        <Button size="sm" loading={saving} disabled={!form.label.fr || (form.target === 'page' ? !form.page_id : !form.external_url)}
          onClick={() => onSave({
            location: form.location,
            label: form.label,
            page_id: form.target === 'page' ? form.page_id : null,
            external_url: form.target === 'external' ? form.external_url : null,
            is_active: form.is_active,
          })}>
          {t('common.save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </div>
  );
};

const LocationSection = ({ location, items }: { location: 'navbar' | 'footer'; items: AdminMenuItem[] }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const invalidate = () => { qc.invalidateQueries({ queryKey: ['admin-menu-items'] }); qc.invalidateQueries({ queryKey: ['cms-menus'] }); };

  const updateMut = useAdminMutation({
    mutationFn: (vars: { id: string; data: object }) => adminMenuItemsApi.update(vars.id, vars.data),
    successMessage: t('adminMenus.saved'),
    onSuccess: () => { invalidate(); setEditingId(null); },
  });
  const deleteMut = useAdminMutation({
    mutationFn: (id: string) => adminMenuItemsApi.remove(id),
    successMessage: t('adminMenus.deleted'),
    onSuccess: invalidate,
  });
  const move = (idx: number, dir: -1 | 1) => {
    const target = items[idx + dir];
    if (!target) return;
    updateMut.mutate({ id: items[idx].id, data: { sort_order: target.sort_order } });
    updateMut.mutate({ id: target.id, data: { sort_order: items[idx].sort_order } });
  };

  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {location === 'navbar' ? t('adminMenus.navbar') : t('adminMenus.footer')}
      </p>
      {items.map((item, idx) => (
        <div key={item.id} className="py-2 border-b border-gray-50 last:border-0">
          {editingId === item.id ? (
            <ItemForm initial={item} saving={updateMut.isPending}
              onSave={(data) => updateMut.mutate({ id: item.id, data })}
              onCancel={() => setEditingId(null)} />
          ) : (
            <div className="flex items-center justify-between text-sm">
              <button onClick={() => setEditingId(item.id)} className="min-w-0 text-start flex-1 hover:text-[var(--qayed-cachet)]">
                <span className={`font-medium ${!item.is_active ? 'text-gray-300 line-through' : ''}`}>{item.label.fr}</span>
                <span className="text-xs text-gray-400 ms-2">{item.page ? `/${item.page.slug}` : item.external_url}</span>
              </button>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button onClick={() => deleteMut.mutate(item.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          )}
        </div>
      ))}
      {!items.length && <p className="text-sm text-gray-400 py-2">{t('adminMenus.empty')}</p>}
    </div>
  );
};

export const AdminMenusPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: items, isLoading } = useQuery({ queryKey: ['admin-menu-items'], queryFn: adminMenuItemsApi.list });

  const createMut = useAdminMutation({
    mutationFn: (data: object) => adminMenuItemsApi.create(data),
    successMessage: t('adminMenus.saved'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-menu-items'] }); qc.invalidateQueries({ queryKey: ['cms-menus'] }); setShowCreate(false); },
  });

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="qayed-display text-xl text-gray-900 flex items-center gap-2"><MenuIcon className="h-5 w-5" /> {t('adminMenus.title')}</h1>
        <Button size="sm" onClick={() => setShowCreate((s) => !s)} className="gap-1.5">
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showCreate ? t('common.cancel') : t('common.add')}
        </Button>
      </div>

      <p className="text-sm text-gray-500">{t('adminMenus.hint')}</p>

      {showCreate && <ItemForm saving={createMut.isPending} onSave={(d) => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />}

      {isLoading && <ListSkeleton rows={4} />}
      {items && (
        <>
          <LocationSection location="navbar" items={items.filter((i) => i.location === 'navbar')} />
          <LocationSection location="footer" items={items.filter((i) => i.location === 'footer')} />
        </>
      )}
    </div>
  );
};
