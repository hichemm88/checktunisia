import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, Role } from '@/stores/authStore';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { IdleWarningModal } from '@/components/IdleWarningModal';
import api from '@/lib/api';

// Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { TwoFactorVerifyPage } from '@/pages/auth/TwoFactorVerifyPage';
import { TwoFactorSetupPage } from '@/pages/authority/TwoFactorSetupPage';
import { LandingPage } from '@/pages/LandingPage';
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
import { AuthorityDashboardPage } from '@/pages/authority/AuthorityDashboardPage';
import { SearchPage } from '@/pages/authority/SearchPage';
import { GuestProfilePage } from '@/pages/authority/GuestProfilePage';
import { HotelsPage } from '@/pages/authority/HotelsPage';
import { HotelDetailPage } from '@/pages/authority/HotelDetailPage';
import { AlertsPage } from '@/pages/authority/AlertsPage';
import { ActivityPage } from '@/pages/authority/ActivityPage';
import { WatchlistPage } from '@/pages/authority/WatchlistPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
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
  if (role === 'platform_admin') return <Navigate to="/admin/hotels" replace />;
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
    queryKey: ['onboarding-status'],
    queryFn: () => api.get('/hotel/onboarding/status').then((r) => r.data.data),
    enabled: role === 'hotel_admin',
    staleTime: 5 * 60 * 1000,
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
    {/* Public — redirect to role home if already authenticated */}
    <Route path="/"         element={<PublicRoute element={<LandingPage />} />} />
    <Route path="/register" element={<PublicRoute element={<RegisterPage />} />} />
    <Route path="/login"                element={<LoginPage />} />
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
          <Route path="/hotel/dashboard"        element={<DashboardPage />} />
          <Route path="/hotel/check-ins/new"    element={<CheckInWizardPage />} />
          <Route path="/hotel/history"          element={<HistoryPage />} />
          <Route path="/hotel/history/:id"      element={<HistoryDetailPage />} />
          <Route path="/hotel/settings"         element={<SettingsPage />} />
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
        <Route path="/authority/alerts"       element={<AlertsPage />} />
        <Route path="/authority/watchlist"    element={<WatchlistPage />} />
        <Route path="/authority/activity"     element={<ActivityPage />} />
      </Route>

      {/* Admin */}
      <Route element={<RequireRole roles={['platform_admin']} />}>
        <Route path="/admin/hotels" element={<AdminDashboardPage />} />
      </Route>
    </Route>

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
  </>
);
