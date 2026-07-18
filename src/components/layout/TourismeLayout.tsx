import { ReactNode } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Globe2, MapPin, MessageSquareText, FileText, BookOpen, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';
import { QayedStamp } from '@/components/ui/QayedStamp';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useObservatoireDemo } from '@/hooks/useObservatoireDemo';

interface TourismeLayoutProps { children: ReactNode; title?: string }

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
        : 'text-white/60 hover:text-white hover:bg-white/10',
    )}
  >
    <Icon className="h-4 w-4 shrink-0" /> {label}
  </NavLink>
);

/**
 * Layout de l'Observatoire du Tourisme (role TOURISME_LECTEUR). Aux tokens Qayed
 * (encre nuit, sceau قيد a -6deg), bilingue FR/AR. Six ecrans. Aucun emoji.
 */
export const TourismeLayout = ({ children, title }: TourismeLayoutProps) => {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [demo] = useObservatoireDemo();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: 'var(--qayed-papier)' }}>
      <header className="sticky top-0 z-30 shadow-lg relative" style={{ background: 'var(--qayed-encre)' }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ background: 'repeating-linear-gradient(to bottom, transparent 0 39px, var(--qayed-papier) 39px 40px)' }}
        />
        <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3 min-w-0">
            <QayedStamp size={30} onDark />
            <div className="hidden sm:flex flex-col leading-tight min-w-0">
              <span className="text-xs font-bold text-white/90 truncate">
                {t('observatoire.title')}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-white/50">
                <MapPin className="h-2.5 w-2.5" /> {t('observatoire.subtitle')}
              </span>
            </div>
            <span
              className="hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ background: 'var(--qayed-cachet-sombre)22', color: 'var(--qayed-cachet-sombre)', border: '1px solid var(--qayed-cachet-sombre)55' }}
            >
              {t('observatoire.role')}
            </span>
            {demo && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: 'var(--qayed-vigilance)22', color: 'var(--qayed-vigilance)', border: '1px solid var(--qayed-vigilance)66' }}
                title={t('observatoire.demo.tooltip')}
              >
                {t('observatoire.demo.badge')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher onDark />
            <div className="hidden sm:flex flex-col items-end leading-tight me-1">
              <span className="text-xs font-medium text-white/90">
                {user?.first_name} {user?.last_name}
              </span>
            </div>
            <Link
              to="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0 hover:opacity-80 transition-opacity"
              style={{ background: 'var(--qayed-cachet)' }}
              title={t('common.myProfile')}
            >
              {initials || '?'}
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-white/40 hover:bg-white/10 hover:text-red-400 transition-colors ms-1"
              title={t('common.logout')}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:block">{t('common.logout')}</span>
            </button>
          </div>
        </div>

        <div className="border-t mx-auto max-w-6xl px-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <nav className="flex items-center gap-1 h-10 overflow-x-auto scrollbar-none">
            <NavItem to="/observatoire/apercu"      icon={LayoutDashboard}   label={t('observatoire.nav.overview')} end />
            <NavItem to="/observatoire/nationalites" icon={Globe2}           label={t('observatoire.nav.nationalities')} />
            <NavItem to="/observatoire/zones"        icon={MapPin}           label={t('observatoire.nav.zones')} />
            <NavItem to="/observatoire/assistant"    icon={MessageSquareText} label={t('observatoire.nav.assistant')} />
            <NavItem to="/observatoire/rapports"     icon={FileText}         label={t('observatoire.nav.reports')} />
            <NavItem to="/observatoire/methodologie" icon={BookOpen}         label={t('observatoire.nav.methodology')} />
          </nav>
        </div>
      </header>

      {title && (
        <div className="border-b border-gray-200 bg-white/60 px-4 py-3">
          <div className="mx-auto max-w-6xl">
            <h1 className="qayed-display text-sm" style={{ color: 'var(--qayed-cachet)' }}>{title}</h1>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
};
