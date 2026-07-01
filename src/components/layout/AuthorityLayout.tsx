import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Search, LogOut, Shield, Building2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';

interface AuthorityLayoutProps { children: ReactNode; title?: string }

const NavItem = ({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) => cn(
      'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors',
      isActive ? 'bg-navy-700 text-gold-400 font-medium' : 'text-gray-300 hover:text-white hover:bg-navy-800'
    )}
  >
    <Icon className="h-4 w-4" /> {label}
  </NavLink>
);

export const AuthorityLayout = ({ children, title }: AuthorityLayoutProps) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="sticky top-0 z-30 border-b border-navy-800 bg-navy-900 shadow-lg">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500">
              <Shield className="h-4 w-4 text-navy-900" />
            </div>
            <span className="hidden sm:block text-sm font-bold text-white">CheckTunisia</span>
            <span className="text-xs text-gold-400 font-medium px-2 py-0.5 rounded bg-navy-800">Autorité</span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            <NavItem to="/authority/search" icon={Search} label="Voyageurs" />
            <NavItem to="/authority/hotels" icon={Building2} label="Hôtels" />
          </nav>

          {/* User + logout */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-gray-400">{user?.first_name} {user?.last_name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:bg-red-900/40 hover:text-red-400 transition-colors"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:block">Quitter</span>
            </button>
          </div>
        </div>

        {title && (
          <div className="border-t border-navy-800 bg-navy-950/50 px-4 py-2">
            <div className="mx-auto max-w-5xl">
              <h1 className="text-sm font-semibold text-white">{title}</h1>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
};
