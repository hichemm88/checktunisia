import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, type Role } from '@/stores/authStore';
import { FEATURES } from '@/config/features';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { IdleWarningModal } from '@/components/IdleWarningModal';
import { api } from '@/lib/api';

// Pages
// Seule la page publique (landing + pages CMS) est dans le bundle d'entrée :
// c'est tout ce dont un visiteur a besoin. Les trois
// portails (hôtel, autorité, admin) et l'inscription sont chargés à la
// demande — ils représentaient l'essentiel des 1 Mo servis à chaque visite de
// qayed.tn. Le CSS n'est plus découpé par chunk (vite.config.ts), donc le
// préchargement d'un CSS de chunk ne peut plus échouer.
import { CmsPage } from '@/pages/CmsPage';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const ActivityPage = lazy(() => import('@/pages/authority/ActivityPage').then((m) => ({ default: m.ActivityPage })));
const AdminActivityPage = lazy(() => import('@/pages/admin/AdminActivityPage').then((m) => ({ default: m.AdminActivityPage })));
const AdminAiCostsPage = lazy(() => import('@/pages/admin/AdminAiCostsPage').then((m) => ({ default: m.AdminAiCostsPage })));
const AdminAuthorityPage = lazy(() => import('@/pages/admin/AdminAuthorityPage').then((m) => ({ default: m.AdminAuthorityPage })));
const AdminCouponsPage = lazy(() => import('@/pages/admin/AdminCouponsPage').then((m) => ({ default: m.AdminCouponsPage })));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminEmailsPage = lazy(() => import('@/pages/admin/AdminEmailsPage').then((m) => ({ default: m.AdminEmailsPage })));
const AdminFacturationPage = lazy(() => import('@/pages/admin/AdminFacturationPage').then((m) => ({ default: m.AdminFacturationPage })));
const AdminHostsPage = lazy(() => import('@/pages/admin/AdminHostsPage').then((m) => ({ default: m.AdminHostsPage })));
const AdminHotelsPage = lazy(() => import('@/pages/admin/AdminHotelsPage').then((m) => ({ default: m.AdminHotelsPage })));
const AdminLayout = lazy(() => import('@/components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminMenusPage = lazy(() => import('@/pages/admin/AdminMenusPage').then((m) => ({ default: m.AdminMenusPage })));
const AdminPageEditorPage = lazy(() => import('@/pages/admin/AdminPageEditorPage'));
const AdminPagesPage = lazy(() => import('@/pages/admin/AdminPagesPage').then((m) => ({ default: m.AdminPagesPage })));
const AdminPaymentsPage = lazy(() => import('@/pages/admin/AdminPaymentsPage').then((m) => ({ default: m.AdminPaymentsPage })));
const AdminQuotasPage = lazy(() => import('@/pages/admin/AdminQuotasPage').then((m) => ({ default: m.AdminQuotasPage })));
const AdminSubscriptionsPage = lazy(() => import('@/pages/admin/AdminSubscriptionsPage').then((m) => ({ default: m.AdminSubscriptionsPage })));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminWhatsappPage = lazy(() => import('@/pages/admin/AdminWhatsappPage').then((m) => ({ default: m.AdminWhatsappPage })));
const AlertsPage = lazy(() => import('@/pages/authority/AlertsPage').then((m) => ({ default: m.AlertsPage })));
const AuthorityDashboardPage = lazy(() => import('@/pages/authority/AuthorityDashboardPage').then((m) => ({ default: m.AuthorityDashboardPage })));
const CheckInWizardPage = lazy(() => import('@/pages/hotel/CheckInWizardPage').then((m) => ({ default: m.CheckInWizardPage })));
const DashboardPage = lazy(() => import('@/pages/hotel/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const GuestProfilePage = lazy(() => import('@/pages/authority/GuestProfilePage').then((m) => ({ default: m.GuestProfilePage })));
const HistoryDetailPage = lazy(() => import('@/pages/hotel/HistoryDetailPage').then((m) => ({ default: m.HistoryDetailPage })));
const HistoryPage = lazy(() => import('@/pages/hotel/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const HotelDetailPage = lazy(() => import('@/pages/authority/HotelDetailPage').then((m) => ({ default: m.HotelDetailPage })));
const HotelsPage = lazy(() => import('@/pages/authority/HotelsPage').then((m) => ({ default: m.HotelsPage })));
const OnboardingPage = lazy(() => import('@/pages/hotel/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const PaymentFailedPage = lazy(() => import('@/pages/hotel/PaymentFailedPage').then((m) => ({ default: m.PaymentFailedPage })));
const PaymentSuccessPage = lazy(() => import('@/pages/hotel/PaymentSuccessPage').then((m) => ({ default: m.PaymentSuccessPage })));
const PendingSetupPage = lazy(() => import('@/pages/hotel/PendingSetupPage').then((m) => ({ default: m.PendingSetupPage })));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const PropertiesPage = lazy(() => import('@/pages/hotel/PropertiesPage').then((m) => ({ default: m.PropertiesPage })));
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const SearchPage = lazy(() => import('@/pages/authority/SearchPage').then((m) => ({ default: m.SearchPage })));
const SecurityPage = lazy(() => import('@/pages/hotel/SecurityPage').then((m) => ({ default: m.SecurityPage })));
const SetPasswordPage = lazy(() => import('@/pages/auth/SetPasswordPage').then((m) => ({ default: m.SetPasswordPage })));
const SettingsPage = lazy(() => import('@/pages/hotel/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const SubscriptionPage = lazy(() => import('@/pages/hotel/SubscriptionPage').then((m) => ({ default: m.SubscriptionPage })));
const TwoFactorSetupPage = lazy(() => import('@/pages/authority/TwoFactorSetupPage').then((m) => ({ default: m.TwoFactorSetupPage })));
const TwoFactorVerifyPage = lazy(() => import('@/pages/auth/TwoFactorVerifyPage').then((m) => ({ default: m.TwoFactorVerifyPage })));
const WatchlistPage = lazy(() => import('@/pages/authority/WatchlistPage').then((m) => ({ default: m.WatchlistPage })));

// ─── Guards ─────────────────────────────────────────────────────────────────
const RequireAuth = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const RequireRole = ({ roles }: { roles: Role[] }) => {
  const role = useAuthStore((s) => s.user?.role);
  return role && roles.includes(role) ? <Outlet /> : <Navigate to="/login" replace />;
};

const RoleRedirect = () => {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'authority_user') return <Navigate to="/authority/dashboard" replace />;
  if (role === 'platform_admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/hotel/dashboard" replace />;
};

/** Redirect to role-home if already authenticated, otherwise show public page. */
const PublicRoute = ({ element }: { element: React.ReactElement }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <RoleRedirect /> : element;
};

/** Statut d'onboarding partagé par les guards — état de l'ORGANISATION, jamais de l'utilisateur. */
const useOnboardingStatus = () => {
  const role = useAuthStore((s) => s.user?.role);
  return useQuery({
    // Stable key — no activePropertyId so removeQueries(['onboarding-status'])
    // in OnboardingPage.completeMut reliably clears this exact key and triggers
    // a fresh fetch when the user navigates to /hotel/dashboard.
    queryKey: ['onboarding-status'],
    queryFn: () => api.get('/hotel/onboarding/status').then((r) => r.data.data),
    enabled: role === 'hotel_admin',
    staleTime: 0, // Always re-validate; it's a cheap call and correctness matters
  });
};

/**
 * Gate post-login, scopé organisation :
 *   ≥ 1 établissement          → dashboard (quel que soit le rôle)
 *   0 établissement + owner    → onboarding
 *   0 établissement + admin    → écran « Configuration en attente »
 * Receptionists are unaffected.
 */
const HotelOnboardingGuard = () => {
  const role = useAuthStore((s) => s.user?.role);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { data, isLoading } = useOnboardingStatus();

  // Propage role_org dans le store persisté : les sessions ouvertes avant la
  // migration l'obtiennent ici sans reconnexion (badge, onglets Paramètres).
  useEffect(() => {
    if (user && data && data.role_org !== undefined && user.role_org !== data.role_org) {
      setUser({ ...user, role_org: data.role_org });
    }
  }, [data, user, setUser]);

  if (role === 'hotel_admin' && !isLoading && data && !data.has_property) {
    // null = compte legacy pas encore migré : traité comme owner.
    return data.role_org !== 'admin'
      ? <Navigate to="/hotel/onboarding" replace />
      : <Navigate to="/hotel/pending-setup" replace />;
  }

  return <Outlet />;
};

/**
 * L'onboarding est réservé au propriétaire de l'organisation — un « admin »
 * n'y accède jamais, même par URL directe (le serveur protège aussi les
 * endpoints de création via le middleware org.owner).
 */
const RequireOrgOwner = () => {
  const role = useAuthStore((s) => s.user?.role);
  const { data, isLoading } = useOnboardingStatus();

  if (role !== 'hotel_admin') return <Navigate to="/hotel/dashboard" replace />;
  if (isLoading || !data) return null;

  // null = compte legacy pas encore migré : traité comme owner (l'API reste l'autorité).
  return data.role_org !== 'admin' ? <Outlet /> : <Navigate to="/hotel/dashboard" replace />;
};

// ─── Idle session guard ───────────────────────────────────────────────────────
const IdleGuard = () => {
  const { showWarning, stayActive, logout } = useIdleTimeout();
  return showWarning ? <IdleWarningModal onStay={stayActive} onLogout={logout} /> : null;
};

/** Écran d'attente d'un chunk de route — neutre, sans saut de mise en page. */
const RouteFallback = () => <div style={{ minHeight: '100vh' }} aria-busy="true" />;

// ─── App ─────────────────────────────────────────────────────────────────────
export const App = () => (
  <>
  <IdleGuard />
  {/* Frontière unique pour toutes les routes différées : les portails ne sont
      téléchargés qu'au moment où l'on y entre. */}
  <Suspense fallback={<RouteFallback />}>
  <Routes>
    {/* Public — redirect to role home if already authenticated.
        La homepage est la page CMS `home` (langue active), gérée dans l'admin. */}
    <Route path="/"         element={<PublicRoute element={<CmsPage slugOverride="home" />} />} />
    <Route path="/register" element={<PublicRoute element={<RegisterPage />} />} />
    <Route path="/login"                element={<LoginPage />} />
    <Route path="/forgot-password"      element={<ForgotPasswordPage />} />
    <Route path="/set-password"         element={<SetPasswordPage />} />
    <Route path="/auth/2fa/verify"      element={<TwoFactorVerifyPage />} />
    {/* Configuration 2FA obligatoire — même écran pour les deux rôles qui y
        sont soumis ; le chemin diffère pour rester lisible dans l'URL. */}
    <Route path="/authority/2fa/setup"  element={<TwoFactorSetupPage />} />
    <Route path="/admin/2fa/setup"      element={<TwoFactorSetupPage />} />

    {/* Authenticated */}
    <Route element={<RequireAuth />}>
      {/* Profile — accessible to all roles */}
      <Route path="/profile" element={<ProfilePage />} />

      {/* Hotel staff — onboarding check applies only to hotel_admin */}
      <Route element={<RequireRole roles={['hotel_admin', 'receptionist']} />}>
        {/* Onboarding wizard — owner uniquement, y compris par URL directe */}
        <Route element={<RequireOrgOwner />}>
          <Route path="/hotel/onboarding" element={<OnboardingPage />} />
        </Route>

        {/* Org sans établissement : écran d'attente pour les admins non owner */}
        <Route element={<RequireRole roles={['hotel_admin']} />}>
          <Route path="/hotel/pending-setup" element={<PendingSetupPage />} />
        </Route>

        {/* Main hotel routes — guarded by onboarding check */}
        <Route element={<HotelOnboardingGuard />}>
          <Route path="/hotel/properties"       element={<PropertiesPage />} />
          <Route path="/hotel/dashboard"        element={<DashboardPage />} />
          <Route path="/hotel/check-ins/new"    element={<CheckInWizardPage />} />
          <Route path="/hotel/history"          element={<HistoryPage />} />
          <Route path="/hotel/history/:id"      element={<HistoryDetailPage />} />
          <Route element={<RequireRole roles={['hotel_admin']} />}>
            <Route path="/hotel/settings"       element={<SettingsPage />} />
            {/* Gestion de l'abonnement en self-service. Les écritures sont
                de toute façon réservées au propriétaire côté API : la page
                reste lisible par un hotel_admin non-owner, qui verra son
                abonnement sans pouvoir le modifier. */}
            <Route path="/hotel/subscription"   element={<SubscriptionPage />} />
          </Route>
          <Route path="/hotel/security"         element={<SecurityPage />} />
          <Route path="/hotel/payment/success"  element={<PaymentSuccessPage />} />
          <Route path="/hotel/payment/failed"   element={<PaymentFailedPage />} />
        </Route>
      </Route>

      {/* Authority */}
      <Route element={<RequireRole roles={['authority_user']} />}>
        <Route path="/authority/dashboard"    element={<AuthorityDashboardPage />} />
        <Route path="/authority/search"       element={<SearchPage />} />
        <Route path="/authority/guests/:id"   element={<GuestProfilePage />} />
        <Route path="/authority/hotels"       element={<HotelsPage />} />
        <Route path="/authority/hotels/:id"   element={<HotelDetailPage />} />
        {FEATURES.expiredDocAlerts && (
          <Route path="/authority/alerts"     element={<AlertsPage />} />
        )}
        <Route path="/authority/watchlist"    element={<WatchlistPage />} />
        <Route path="/authority/activity"     element={<ActivityPage />} />
      </Route>

      {/* Admin */}
      <Route element={<RequireRole roles={['platform_admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard"     element={<AdminDashboardPage />} />
          <Route path="/admin/ai-costs"      element={<AdminAiCostsPage />} />
          <Route path="/admin/hosts"         element={<AdminHostsPage />} />
          <Route path="/admin/hotels"        element={<AdminHotelsPage />} />
          <Route path="/admin/users"         element={<AdminUsersPage />} />
          <Route path="/admin/authority"     element={<AdminAuthorityPage />} />
          <Route path="/admin/subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="/admin/quotas"        element={<AdminQuotasPage />} />
          <Route path="/admin/facturation"   element={<AdminFacturationPage />} />
          <Route path="/admin/coupons"       element={<AdminCouponsPage />} />
          <Route path="/admin/payments"      element={<AdminPaymentsPage />} />
          <Route path="/admin/emails"        element={<AdminEmailsPage />} />
          <Route path="/admin/activity"      element={<AdminActivityPage />} />
          {/* MODULE PROVISOIRE — relais WhatsApp (à retirer après homologation MI) */}
          <Route path="/admin/whatsapp"      element={<AdminWhatsappPage />} />
          <Route path="/admin/pages"         element={<AdminPagesPage />} />
          <Route path="/admin/menus"         element={<AdminMenusPage />} />
          <Route path="/admin/settings"      element={<Navigate to="/admin/payments" replace />} />
        </Route>
        {/* Éditeur Puck — plein écran, hors AdminLayout */}
        <Route path="/admin/pages/:id/edit" element={<AdminPageEditorPage />} />
      </Route>
    </Route>

    {/* Pages CMS publiques — /:locale (home) et /:locale/:slug. Déclarées en
        dernier avant le fallback : les routes applicatives ci-dessus priment,
        et Page::RESERVED_SLUGS interdit les slugs en collision côté backend. */}
    <Route path="/fr" element={<CmsPage slugOverride="home" localeOverride="fr" />} />
    <Route path="/en" element={<CmsPage slugOverride="home" localeOverride="en" />} />
    <Route path="/ar" element={<CmsPage slugOverride="home" localeOverride="ar" />} />
    <Route path="/:locale/:slug" element={<CmsPage />} />

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
  </Suspense>
  </>
);
