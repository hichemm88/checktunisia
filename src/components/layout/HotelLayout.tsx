import { ReactNode } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, History, Settings, LogOut, Layers } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';
import { QayedStamp } from '@/components/ui/QayedStamp';

interface HotelLayoutProps { children: ReactNode; title?: string; backHref?: string }

const getNavItems = (isAdmin: boolean) => [
  { to: '/hotel/dashboard',     icon: LayoutDashboard, label: 'Accueil'    },
  { to: '/hotel/check-ins/new', icon: ClipboardList,   label: 'Check-in'  },
  { to: '/hotel/history',       icon: History,         label: 'Historique' },
  { to: '/hotel/properties',    icon: Layers,          label: 'Mes biens' },
  ...(isAdmin ? [{ to: '/hotel/settings', icon: Settings, label: 'Paramètres' }] : []),
];

export const HotelLayout = ({ children, title }: HotelLayoutProps) => {
  const { user, logout, activePropertyName } = useAuthStore();
  const navigate = useNavigate();
  const navItems = getNavItems(user?.role === 'hotel_admin');

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--qayed-papier)' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-30 bg-white shadow-header">
        {/* Accent bar */}
        <div className="h-1" style={{ background: 'var(--qayed-cachet)' }} />
        <div className="flex h-[60px] items-center justify-between px-4">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <QayedStamp size={30} />
            <div className="flex flex-col justify-center min-w-0">
              <Link to="/hotel/properties"
                className="text-xs font-semibold text-gray-500 leading-none truncate hover:underline">
                {activePropertyName ?? user?.hotel?.name ?? 'Qayed'}
              </Link>
              {title && (
                <span className="text-sm font-bold text-gray-900 leading-snug mt-0.5 truncate">{title}</span>
              )}
            </div>
          </div>

          {/* Right: avatar + logout */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              to="/profile"
              className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
              style={{ background: 'var(--qayed-cachet-dilue)' }}
              title="Mon profil"
            >
              <span className="text-xs font-bold" style={{ color: 'var(--qayed-cachet)' }}>{initials}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 pt-[73px] pb-[80px]">{children}</main>

      {/* ── Bottom Nav ──────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-30 h-[72px] bg-white flex items-center px-2 shadow-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/hotel/check-ins/new'}
            className="flex flex-1 flex-col items-center justify-center gap-0.5"
          >
            {({ isActive }) => (
              <>
                <div
                  className="h-11 w-11 flex items-center justify-center rounded-2xl transition-all duration-200"
                  style={isActive ? { background: 'var(--qayed-cachet)', boxShadow: '0 2px 8px rgba(83,70,168,0.3)' } : undefined}
                >
                  <Icon
                    className={cn(
                      'h-[22px] w-[22px] transition-colors duration-200 stroke-[1.8]',
                      isActive ? 'text-white' : 'text-gray-400'
                    )}
                  />
                </div>
                <span
                  className="text-[10px] font-bold tracking-tight transition-colors duration-200"
                  style={isActive ? { color: 'var(--qayed-cachet)' } : { color: '#9ca3af' }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
