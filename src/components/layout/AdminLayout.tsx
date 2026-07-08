import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Building2, Home, Users, Landmark,
  CreditCard, Wallet, Mail, Activity, LogOut, Search, X, FileText, Menu,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';
import { adminSearchApi, GlobalSearchResult } from '@/api/admin/search';
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
    { to: '/admin/payments',      icon: Wallet,          label: t('adminLayout.nav.payments') },
    { to: '/admin/emails',        icon: Mail,            label: t('adminLayout.nav.emails') },
    { to: '/admin/activity',      icon: Activity,        label: t('adminLayout.nav.activity') },
  ];
};

const TYPE_LABEL_KEYS: Record<string, string> = {
  organization: 'adminLayout.searchResultHost',
  hotel: 'adminLayout.searchResultProperty',
  user: 'adminLayout.searchResultUser',
  check_in: 'adminLayout.searchResultCheckIn',
};
const TYPE_ROUTE: Record<string, (id: string) => string> = {
  organization: (id) => `/admin/hosts/${id}`,
  hotel:        (id) => `/admin/hotels/${id}`,
  user:         (id) => `/admin/users?highlight=${id}`,
  check_in:     (id) => `/admin/hotels/${id}`,
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
    ? [...data.organizations, ...data.hotels, ...data.check_ins, ...data.users]
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

const SidebarContent = ({ onNavigate, onLogout }: { onNavigate?: () => void; onLogout: () => void }) => {
  const { t } = useTranslation();
  const navItems = useNavItems();
  return (
    <>
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100 shrink-0">
        <QayedStamp size={30} />
        <span className="qayed-display text-lg text-qayed-encre">QAYED <span className="qayed-mono text-xs font-normal normal-case tracking-normal text-qayed-fiche">{t('adminLayout.brand')}</span></span>
      </div>
      <nav className="flex-1 flex flex-col gap-0.5 p-3 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'text-white' : 'text-gray-500 hover:bg-qayed-papier hover:text-gray-800'
              }`
            }
            style={({ isActive }) => (isActive ? { background: 'var(--qayed-cachet)' } : undefined)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-100 shrink-0">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
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

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--qayed-papier)' }}>
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-gray-100 bg-white">
        <SidebarContent onLogout={handleLogout} />
      </aside>

      {/* ── Sidebar (mobile drawer) ── */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative z-10 flex w-64 max-w-[80vw] flex-col bg-white shadow-xl">
            <button
              onClick={() => setMobileNavOpen(false)}
              className="absolute top-4 end-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
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
            <LanguageSwitcher />
            <span className="hidden sm:block text-sm text-gray-500 whitespace-nowrap">{user?.first_name} {user?.last_name}</span>
          </div>
        </header>
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
