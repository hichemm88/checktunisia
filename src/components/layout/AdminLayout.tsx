import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Building2, Home, Users, Landmark,
  CreditCard, Wallet, Mail, Activity, LogOut, Search, X, FileText, Menu,
  Globe, ListTree, MessageCircle, Cpu, Ticket,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';
import { adminSearchApi, type GlobalSearchResult } from '@/api/admin/search';
import { QayedStamp } from '@/components/ui/QayedStamp';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const useNavItems = () => {
  const { t } = useTranslation();
  return [
    { to: '/admin/dashboard',     icon: LayoutDashboard, label: t('adminLayout.nav.dashboard') },
    { to: '/admin/hosts',         icon: Building2,       label: t('adminLayout.nav.hosts') },
    { to: '/admin/hotels',        icon: Home,            label: t('adminLayout.nav.hotels') },
    { to: '/admin/users',         icon: Users,           label: t('adminLayout.nav.users') },
    { to: '/admin/authority',     icon: Landmark,        label: t('adminLayout.nav.authority') },
    { to: '/admin/subscriptions', icon: CreditCard,      label: t('adminLayout.nav.subscriptions') },
    { to: '/admin/facturation',   icon: FileText,        label: t('adminLayout.nav.facturation') },
    { to: '/admin/coupons',       icon: Ticket,          label: t('adminLayout.nav.coupons') },
    { to: '/admin/payments',      icon: Wallet,          label: t('adminLayout.nav.payments') },
    { to: '/admin/ai-costs',      icon: Cpu,             label: t('adminLayout.nav.aiCosts') },
    { to: '/admin/emails',        icon: Mail,            label: t('adminLayout.nav.emails') },
    { to: '/admin/pages',         icon: Globe,           label: t('adminLayout.nav.pages') },
    { to: '/admin/menus',         icon: ListTree,        label: t('adminLayout.nav.menus') },
    { to: '/admin/activity',      icon: Activity,        label: t('adminLayout.nav.activity') },
    // MODULE PROVISOIRE — relais WhatsApp (à retirer après homologation MI).
    { to: '/admin/whatsapp',      icon: MessageCircle,   label: t('adminLayout.nav.whatsapp') },
  ];
};

const TYPE_LABEL_KEYS: Record<string, string> = {
  organization: 'adminLayout.searchResultHost',
  hotel: 'adminLayout.searchResultProperty',
  user: 'adminLayout.searchResultUser',
  check_in: 'adminLayout.searchResultCheckIn',
  invoice: 'adminLayout.searchResultInvoice',
};
const TYPE_ROUTE: Record<string, (id: string) => string> = {
  organization: (id) => `/admin/hosts/${id}`,
  hotel:        (id) => `/admin/hotels/${id}`,
  user:         (id) => `/admin/users?highlight=${id}`,
  check_in:     (id) => `/admin/hotels/${id}`,
  invoice:      (id) => `/admin/facturation?highlight=${id}`,
};

/**
 * Chantier D2 — command palette (Ctrl/Cmd+K) : navigation, recherche
 * globale (hébergeurs, établissements, utilisateurs, fiches, factures) et
 * accès rapide au clavier. Échap ferme, flèches naviguent, Entrée ouvre.
 */
const CommandPalette = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const navItems = useNavItems();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ['admin-global-search', q],
    queryFn: () => adminSearchApi.search(q),
    enabled: open && q.trim().length >= 2,
  });

  const items = useMemo(() => {
    const nav = navItems
      .filter((n) => !q.trim() || n.label.toLowerCase().includes(q.trim().toLowerCase()))
      .map((n) => ({ key: `nav-${n.to}`, label: n.label, sub: t('adminLayout.paletteNavigate'), to: n.to }));
    const found = (data && q.trim().length >= 2
      ? [...data.organizations, ...data.hotels, ...data.check_ins, ...data.users, ...(data.invoices ?? [])]
      : []
    ).map((r: GlobalSearchResult) => ({ key: `${r.type}-${r.id}`, label: r.label, sub: t(TYPE_LABEL_KEYS[r.type]), to: TYPE_ROUTE[r.type](r.id) }));
    return [...found, ...nav].slice(0, 12);
  }, [navItems, data, q, t]);

  useEffect(() => { setSelected(0); }, [q, open]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); else setQ(''); }, [open]);

  if (!open) return null;

  const go = (to: string) => { navigate(to); onClose(); };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-100 px-4">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            className="h-12 w-full bg-transparent text-sm outline-none"
            placeholder={t('adminLayout.palettePlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, items.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
              if (e.key === 'Enter' && items[selected]) go(items[selected].to);
            }}
          />
          <kbd className="hidden sm:block shrink-0 rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-400">Esc</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-1.5">
          {items.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">{t('common.noResults')}</p>}
          {items.map((item, i) => (
            <button
              key={item.key}
              className={`flex w-full items-center justify-between px-4 py-2 text-start text-sm ${i === selected ? 'bg-qayed-papier' : 'hover:bg-warm-100'}`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => go(item.to)}
            >
              <span className="truncate">{item.label}</span>
              <span className="ms-2 shrink-0 text-xs text-gray-400">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const GlobalSearch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['admin-global-search', q],
    queryFn: () => adminSearchApi.search(q),
    enabled: q.trim().length >= 2,
  });

  const results: GlobalSearchResult[] = data
    ? [...data.organizations, ...data.hotels, ...data.check_ins, ...data.users, ...(data.invoices ?? [])]
    : [];

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        className="input w-full ps-9 pe-8"
        placeholder={t('adminLayout.searchPlaceholder')}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {q && (
        <button className="absolute end-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500" onClick={() => setQ('')}>
          <X className="h-4 w-4" />
        </button>
      )}
      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <p className="p-3 text-sm text-gray-400 text-center">{t('common.noResults')}</p>
          ) : results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              className="flex w-full items-center justify-between px-3 py-2 text-start text-sm hover:bg-warm-100"
              onMouseDown={() => { navigate(TYPE_ROUTE[r.type](r.id)); setQ(''); setOpen(false); }}
            >
              <span className="truncate">{r.label}</span>
              <span className="ms-2 shrink-0 text-xs text-gray-400">{t(TYPE_LABEL_KEYS[r.type])}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Chantier D1 — la sidebar porte l'identité Qayed : encre nuit #10222E,
 * texte clair, item actif violet cachet. Sépare visuellement la navigation
 * du contenu (papier registre).
 */
const SidebarContent = ({ onNavigate, onLogout }: { onNavigate?: () => void; onLogout: () => void }) => {
  const { t } = useTranslation();
  const navItems = useNavItems();
  return (
    <>
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10 shrink-0">
        <QayedStamp size={30} onDark />
        <span className="qayed-display text-lg text-white">QAYED <span className="qayed-mono text-xs font-normal normal-case tracking-normal text-white/50">{t('adminLayout.brand')}</span></span>
      </div>
      <nav className="flex-1 flex flex-col gap-0.5 p-3 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`
            }
            style={({ isActive }) => (isActive ? { background: 'var(--qayed-cachet)' } : undefined)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10 shrink-0">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/40 hover:bg-red-500/15 hover:text-red-300 transition-colors"
        >
          <LogOut className="h-4 w-4" /> {t('common.logout')}
        </button>
      </div>
    </>
  );
};

export const AdminLayout = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--qayed-papier)' }}>
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col" style={{ background: 'var(--qayed-encre)' }}>
        <SidebarContent onLogout={handleLogout} />
      </aside>

      {/* ── Sidebar (mobile drawer) ── */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative z-10 flex w-64 max-w-[80vw] flex-col shadow-xl" style={{ background: 'var(--qayed-encre)' }}>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="absolute top-4 end-3 rounded-lg p-1.5 text-white/50 hover:bg-white/10"
              aria-label={t('common.close')}
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileNavOpen(false)} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 md:gap-4 px-3 md:px-6 h-16 bg-white border-b border-gray-100">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden shrink-0 rounded-lg p-2 text-gray-500 hover:bg-warm-100"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0 flex items-center justify-end gap-3">
            <GlobalSearch />
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden md:flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-400 hover:text-gray-600 hover:border-gray-300"
              title={t('adminLayout.palettePlaceholder')}
            >
              <kbd>Ctrl</kbd>+<kbd>K</kbd>
            </button>
            <LanguageSwitcher />
            <span className="hidden sm:block text-sm text-gray-500 whitespace-nowrap">{user?.first_name} {user?.last_name}</span>
          </div>
        </header>
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <Outlet />
        </main>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </div>
  );
};
