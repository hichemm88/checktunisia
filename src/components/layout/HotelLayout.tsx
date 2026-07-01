import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, History, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';

interface HotelLayoutProps { children: ReactNode; title?: string; backHref?: string }

const navItems = [
  { to: '/hotel/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hotel/check-ins/new', icon: ClipboardList, label: 'Check-in' },
  { to: '/hotel/history', icon: History, label: 'History' },
  { to: '/hotel/settings', icon: Settings, label: 'Settings' },
];

export const HotelLayout = ({ children, title }: HotelLayoutProps) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-header items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-xs font-bold text-gold-500">CT</div>
          <div>
            <p className="text-xs text-gray-500">{user?.hotel?.name ?? 'CheckTunisia'}</p>
            {title && <h1 className="text-sm font-semibold text-gray-900">{title}</h1>}
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">{children}</main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex h-nav border-t border-gray-200 bg-white shadow-lg">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
              isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600',
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
