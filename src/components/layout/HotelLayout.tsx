import { type ReactNode } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, ClipboardList, History, Settings, LogOut, Layers } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';
import { QayedStamp } from '@/components/ui/QayedStamp';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { NotificationBell } from '@/components/hotel/NotificationBell';
import { PasskeyPromptBanner } from '@/components/security/PasskeyPromptBanner';

interface HotelLayoutProps { children: ReactNode; title?: string; backHref?: string }

const useNavItems = (isAdmin: boolean) => {
  const { t } = useTranslation();
  return [
    { to: '/hotel/dashboard',     icon: LayoutDashboard, label: t('hotelLayout.nav.home') },
    { to: '/hotel/check-ins/new', icon: ClipboardList,   label: t('hotelLayout.nav.checkin') },
    { to: '/hotel/history',       icon: History,         label: t('hotelLayout.nav.history') },
    { to: '/hotel/properties',    icon: Layers,          label: t('hotelLayout.nav.properties') },
    ...(isAdmin ? [{ to: '/hotel/settings', icon: Settings, label: t('hotelLayout.nav.settings') }] : []),
  ];
};

export const HotelLayout = ({ children, title }: HotelLayoutProps) => {
  const { t } = useTranslation();
  const { user, logout, activePropertyName } = useAuthStore();
  const navigate = useNavigate();
  const navItems = useNavItems(user?.role === 'hotel_admin');

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <div className="flex min-h-screen flex-col bg-qayed-papier">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-30 bg-white shadow-header">
        {/* Accent bar */}
        <div className="h-1 bg-qayed-cachet" />
        <div className="page-container flex h-[60px] items-center justify-between px-4">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <QayedStamp size={30} />
            <div className="flex flex-col justify-center min-w-0">
              <Link to="/hotel/properties"
                className="text-xs font-semibold text-qayed-fiche leading-none truncate hover:underline">
                {activePropertyName ?? user?.hotel?.name ?? 'Qayed'}
              </Link>
              {/* <h1> et non <span> : sans lui, aucune page du portail n'avait de
                  titre de niveau 1 — le titre de page passait par ce gabarit. */}
              {title && (
                <h1 className="qayed-display text-sm text-qayed-encre leading-snug mt-0.5 truncate">{title}</h1>
              )}
            </div>
          </div>

          {/* Right: notifications + language + avatar + logout */}
          <div className="flex items-center gap-1 shrink-0">
            <NotificationBell />
            <LanguageSwitcher />
            {user?.role === 'hotel_admin' && user.role_org && (
              <span
                className="hidden sm:inline-block rounded-full bg-qayed-cachet-dilue px-2 py-0.5 text-xs font-bold text-qayed-cachet whitespace-nowrap"
                title={t('hotelLayout.roleBadgeTitle')}
              >
                {user.role_org === 'owner' ? t('hotelLayout.roleOwner') : t('hotelLayout.roleAdmin')}
              </span>
            )}
            <Link
              to="/profile"
              className="h-11 w-11 rounded-full flex items-center justify-center shrink-0 bg-qayed-cachet-dilue hover:opacity-80 transition-opacity"
              title={t('common.myProfile')}
            >
              <span className="text-xs font-bold text-qayed-cachet">{initials}</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="h-11 w-11 rounded-btn flex items-center justify-center text-qayed-fiche-faible hover:text-qayed-erreur transition-colors"
              title={t('common.logout')}
              aria-label={t('common.logout')}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────
          `pt-header` = 61px, la hauteur réelle de l'en-tête (60 + 1 de filet) :
          la valeur était 73px, soit 12px de blanc parasite en haut de chaque
          page. `pb-nav-safe` réserve la nav basse ET la zone de sécurité iOS. */}
      <main className="flex-1 pt-[61px] pb-nav-safe">
        <div className="page-container">
          <PasskeyPromptBanner />
          {children}
        </div>
      </main>

      {/* ── Bottom Nav ────────────────────────────────────────────────
          `h-nav-safe` + `pb-safe` : sans zone de sécurité, la barre de gestes
          de l'iPhone recouvrait les libellés des onglets. */}
      <nav
        aria-label={t('hotelLayout.nav.home')}
        className="fixed bottom-0 inset-x-0 z-30 h-nav-safe bg-white shadow-nav pb-safe"
      >
        <div className="page-container flex h-[72px] items-center px-2">
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
                    className={cn(
                      'h-11 w-11 flex items-center justify-center rounded-2xl transition-all duration-200',
                      isActive && 'bg-qayed-cachet shadow-btn',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-[22px] w-[22px] transition-colors duration-200 stroke-[1.8]',
                        isActive ? 'text-white' : 'text-qayed-fiche',
                      )}
                      aria-hidden="true"
                    />
                  </div>
                  {/* 12px et couleur `--qayed-fiche` : le libellé inactif était
                      à 10px en var(--qayed-fiche-faible), soit 2,5:1. Les libellés longs
                      (« My properties », « تسجيل وصول ») passent sur deux
                      lignes serrées plutôt que d'être tronqués. */}
                  <span
                    className={cn(
                      'px-0.5 text-center text-xs font-bold leading-tight tracking-tight transition-colors duration-200',
                      isActive ? 'text-qayed-cachet' : 'text-qayed-fiche',
                    )}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
