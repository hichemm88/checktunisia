import { ReactNode } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, History, Settings, LogOut, Layers } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';

interface HotelLayoutProps { children: ReactNode; title?: string; backHref?: string }

const getNavItems = () => [
  { to: '/hotel/dashboard',     icon: LayoutDashboard, label: 'Accueil'    },
  { to: '/hotel/check-ins/new', icon: ClipboardList,   label: 'Check-in'  },
  { to: '/hotel/history',       icon: History,         label: 'Historique' },
  { to: '/hotel/properties',    icon: Layers,          label: 'Mes biens' },
  { to: '/hotel/settings',      icon: Settings,        label: 'Paramètres' },
];

export const HotelLayout = ({ children, title }: HotelLayoutProps) => {
  const { user, logout, activePropertyName } = useAuthStore();
  const navigate = useNavigate();
  const navItems = getNavItems();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#F5F4EF' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-30 bg-white shadow-header">
        {/* Gradient accent bar */}
        <div
          className="h-1"
          style={{ background: 'linear-gradient(90deg, #1B3A5F 0%, #2A5090 60%, #C8943A 100%)' }}
        />
        <div className="flex h-[60px] items-center justify-between px-4">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
              style={{ background: '#1B3A5F' }}
            >
              <span className="text-[11px] font-black tracking-tighter" style={{ color: '#C8943A' }}>QY</span>
            </div>
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
              style={{ background: '#E8EEFB' }}
              title="Mon profil"
            >
              <span className="text-xs font-bold" style={{ color: '#1B3A5F' }}>{initials}</span>
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
                  style={isActive ? { background: '#1B3A5F', boxShadow: '0 4px 14px rgba(27,54,84,0.35)' } : undefined}
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
                  style={isActive ? { color: '#1B3A5F' } : { color: '#9ca3af' }}
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
