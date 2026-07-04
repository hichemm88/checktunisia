import { ReactNode } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Search, Building2, Bell, Activity, LogOut, Shield, MapPin, ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';

interface AuthorityLayoutProps { children: ReactNode; title?: string }

const NavItem = ({
  to, icon: Icon, label, end = false,
}: { to: string; icon: React.ElementType; label: string; end?: boolean }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) => cn(
      'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap',
      isActive
        ? 'bg-white/15 text-white font-semibold'
        : 'text-white/60 hover:text-white hover:bg-white/10'
    )}
  >
    <Icon className="h-4 w-4 shrink-0" /> {label}
  </NavLink>
);

export const AuthorityLayout = ({ children, title }: AuthorityLayoutProps) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const profile = user?.authority_profile;
  const isMinistry = profile?.org_type === 'ministry';
  const isPolice   = profile?.org_type === 'police';

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  // Initials avatar
  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: '#F5F4EF' }}>
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1B3A5F 0%, #0F2440 100%)' }}
      >
        {/* Brand + identity row */}
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">

          {/* Left: logo + org identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: '#C8943A' }}
            >
              <Shield className="h-4 w-4 text-white" />
            </div>

            <div className="hidden sm:flex flex-col leading-tight min-w-0">
              <span className="text-xs font-bold text-white/90 truncate">
                {profile?.org_name ?? 'Qayed'}
              </span>
              {isPolice && profile?.governorate && (
                <span className="flex items-center gap-1 text-[10px] text-white/50">
                  <MapPin className="h-2.5 w-2.5" /> {profile.governorate}
                </span>
              )}
            </div>

            {/* Role badge */}
            {isMinistry && (
              <span
                className="hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: '#C8943A22', color: '#C8943A', border: '1px solid #C8943A55' }}
              >
                Ministère
              </span>
            )}
            {isPolice && (
              <span
                className="hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: '#3B82F622', color: '#93C5FD', border: '1px solid #3B82F655' }}
              >
                Police
              </span>
            )}
          </div>

          {/* Right: user + logout */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex flex-col items-end leading-tight mr-1">
              <span className="text-xs font-medium text-white/90">
                {user?.first_name} {user?.last_name}
              </span>
              {profile?.rank && (
                <span className="text-[10px] text-white/40">{profile.rank}</span>
              )}
            </div>

            {/* Avatar → profile page */}
            <Link
              to="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0 hover:opacity-80 transition-opacity"
              style={{ background: '#2A5090' }}
              title="Mon profil"
            >
              {initials || '?'}
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-white/40 hover:bg-white/10 hover:text-red-400 transition-colors ml-1"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:block">Quitter</span>
            </button>
          </div>
        </div>

        {/* ── Nav row ──────────────────────────────────────────────────── */}
        <div
          className="border-t mx-auto max-w-6xl px-4"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <nav className="flex items-center gap-1 h-10 overflow-x-auto scrollbar-none">
            <NavItem to="/authority/dashboard" icon={LayoutDashboard} label="Tableau de bord" end />
            <NavItem to="/authority/search"    icon={Search}          label="Voyageurs" />
            <NavItem to="/authority/hotels"    icon={Building2}       label="Établissements" />
            <NavItem to="/authority/alerts"    icon={Bell}        label="Alertes" />
            <NavItem to="/authority/watchlist" icon={ShieldAlert} label="Surveillance" />
            {/* Activity log: ministry only */}
            {isMinistry && (
              <NavItem to="/authority/activity" icon={Activity} label="Activité" />
            )}
          </nav>
        </div>
      </header>

      {/* ── Page title ───────────────────────────────────────────────── */}
      {title && (
        <div className="border-b border-gray-200 bg-white/60 px-4 py-3">
          <div className="mx-auto max-w-6xl">
            <h1 className="text-sm font-semibold" style={{ color: '#1B3A5F' }}>{title}</h1>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
};
