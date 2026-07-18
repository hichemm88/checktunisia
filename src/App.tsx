import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, Role } from '@/stores/authStore';
import { FEATURES } from '@/config/features';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { IdleWarningModal } from '@/components/IdleWarningModal';
import { api } from '@/lib/api';

// Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { SetPasswordPage } from '@/pages/auth/SetPasswordPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { TwoFactorVerifyPage } from '@/pages/auth/TwoFactorVerifyPage';
import { TwoFactorSetupPage } from '@/pages/authority/TwoFactorSetupPage';
import { CmsPage } from '@/pages/CmsPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/hotel/DashboardPage';
import { CheckInWizardPage } from '@/pages/hotel/CheckInWizardPage';
import { HistoryPage } from '@/pages/hotel/HistoryPage';
import { HistoryDetailPage } from '@/pages/hotel/HistoryDetailPage';
import { SettingsPage } from '@/pages/hotel/SettingsPage';
import { SecurityPage } from '@/pages/hotel/SecurityPage';
import { PaymentSuccessPage } from '@/pages/hotel/PaymentSuccessPage';
import { PaymentFailedPage } from '@/pages/hotel/PaymentFailedPage';
import { OnboardingPage } from '@/pages/hotel/OnboardingPage';
import { PropertiesPage } from '@/pages/hotel/PropertiesPage';
import { AuthorityDashboardPage } from '@/pages/authority/AuthorityDashboardPage';
import { SearchPage } from '@/pages/authority/SearchPage';
import { GuestProfilePage } from '@/pages/authority/GuestProfilePage';
import { HotelsPage } from '@/pages/authority/HotelsPage';
import { HotelDetailPage } from '@/pages/authority/HotelDetailPage';
import { AlertsPage } from '@/pages/authority/AlertsPage';
import { ActivityPage } from '@/pages/authority/ActivityPage';
import { WatchlistPage } from '@/pages/authority/WatchlistPage';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminAiCostsPage } from '@/pages/admin/AdminAiCostsPage';
import { AdminHostsPage } from '@/pages/admin/AdminHostsPage';
import { AdminHotelsPage } from '@/pages/admin/AdminHotelsPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminAuthorityPage } from '@/pages/admin/AdminAuthorityPage';
import { AdminSubscriptionsPage } from '@/pages/admin/AdminSubscriptionsPage';
import { AdminFacturationPage } from '@/pages/admin/AdminFacturationPage';
import { AdminPaymentsPage } from '@/pages/admin/AdminPaymentsPage';
import { AdminEmailsPage } from '@/pages/admin/AdminEmailsPage';
import { AdminActivityPage } from '@/pages/admin/AdminActivityPage';
import { AdminWhatsappPage } from '@/pages/admin/AdminWhatsappPage';
import { AdminPagesPage } from '@/pages/admin/AdminPagesPage';
import { AdminMenusPage } from '@/pages/admin/AdminMenusPage';
// Import STATIQUE volontaire (pas de lazy) : le chargement différé de ce
// chunk échouait en production chez l'admin (« Unable to preload CSS for
// /AdminPageEditorPage-*.css ») — l'éditeur est intégré au bundle principal,
// plus aucun fichier à récupérer au clic, l'erreur ne peut plus se produire.
import AdminPageEditorPage from '@/pages/admin/AdminPageEditorPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';

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

/**
 * After login, hotel_admin users who have not completed onboarding are redirected
 * to /hotel/onboarding. Receptionists are unaffected.
 */
const HotelOnboardingGuard = () => {
  const role = useAuthStore((s) => s.user?.role);
  const { data, isLoading } = useQuery({
    // Stable key — no activePropertyId so removeQueries(['onboarding-status'])
    // in OnboardingPage.completeMut reliably clears this exact key and triggers
    // a fresh fetch when the user navigates to /hotel/dashboard.
    queryKey: ['onboarding-status'],
    queryFn: () => api.get('/hotel/onboarding/status').then((r) => r.data.data),
    enabled: role === 'hotel_admin',
    staleTime: 0, // Always re-validate; it's a cheap call and correctness matters
  });

  if (role === 'hotel_admin' && !isLoading && data && !data.setup_completed) {
    return <Navigate to="/hotel/onboarding" replace />;
  }

  return <Outlet />;
};

// ─── Idle session guard ───────────────────────────────────────────────────────
const IdleGuard = () => {
  const { showWarning, stayActive, logout } = useIdleTimeout();
  return showWarning ? <IdleWarningModal onStay={stayActive} onLogout={logout} /> : null;
};

// ─── App ─────────────────────────────────────────────────────────────────────
export const App = () => (
  <>
  <IdleGuard />
  <Routes>
    {/* Public — redirect to role home if already authenticated.
        La homepage est la page CMS `home` (langue active), gérée dans l'admin. */}
    <Route path="/"         element={<PublicRoute element={<CmsPage slugOverride="home" />} />} />
    <Route path="/register" element={<PublicRoute element={<RegisterPage />} />} />
    <Route path="/login"                element={<LoginPage />} />
    <Route path="/forgot-password"      element={<ForgotPasswordPage />} />
    <Route path="/set-password"         element={<SetPasswordPage />} />
    <Route path="/auth/2fa/verify"      element={<TwoFactorVerifyPage />} />
    <Route path="/authority/2fa/setup"  element={<TwoFactorSetupPage />} />

    {/* Authenticated */}
    <Route element={<RequireAuth />}>
      {/* Profile — accessible to all roles */}
      <Route path="/profile" element={<ProfilePage />} />

      {/* Hotel staff — onboarding check applies only to hotel_admin */}
      <Route element={<RequireRole roles={['hotel_admin', 'receptionist']} />}>
        {/* Onboarding wizard — reachable before setup is complete */}
        <Route element={<RequireRole roles={['hotel_admin']} />}>
          <Route path="/hotel/onboarding" element={<OnboardingPage />} />
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
          <Route path="/admin/facturation"   element={<AdminFacturationPage />} />
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
  </>
);
