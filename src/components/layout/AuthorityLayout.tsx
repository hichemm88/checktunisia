import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Search, LogOut, Shield } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';

interface AuthorityLayoutProps { children: ReactNode; title?: string }

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
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-navy-900 shadow">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-gold-500" />
            <span className="text-sm font-bold text-white">CheckTunisia — Autorité</span>
          </div>
          <div className="flex items-center gap-4">
            <NavLink
              to="/authority/search"
              className={({ isActive }) => cn('flex items-center gap-1.5 text-sm', isActive ? 'text-gold-500' : 'text-gray-300 hover:text-white')}
            >
              <Search className="h-4 w-4" /> Rechercher
            </NavLink>
            <div className="h-4 w-px bg-gray-600" />
            <span className="text-xs text-gray-400">{user?.first_name} {user?.last_name}</span>
            <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {title && (
          <div className="border-t border-navy-700 bg-navy-800 px-4 py-2">
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
