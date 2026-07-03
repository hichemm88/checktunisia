import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, Role } from '@/stores/authStore';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { IdleWarningModal } from '@/components/IdleWarningModal';

// Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { TwoFactorVerifyPage } from '@/pages/auth/TwoFactorVerifyPage';
import { TwoFactorSetupPage } from '@/pages/authority/TwoFactorSetupPage';
import { DashboardPage } from '@/pages/hotel/DashboardPage';
import { CheckInWizardPage } from '@/pages/hotel/CheckInWizardPage';
import { HistoryPage } from '@/pages/hotel/HistoryPage';
import { HistoryDetailPage } from '@/pages/hotel/HistoryDetailPage';
import { SettingsPage } from '@/pages/hotel/SettingsPage';
import { SecurityPage } from '@/pages/hotel/SecurityPage';
import { AuthorityDashboardPage } from '@/pages/authority/AuthorityDashboardPage';
import { SearchPage } from '@/pages/authority/SearchPage';
import { GuestProfilePage } from '@/pages/authority/GuestProfilePage';
import { HotelsPage } from '@/pages/authority/HotelsPage';
import { HotelDetailPage } from '@/pages/authority/HotelDetailPage';
import { AlertsPage } from '@/pages/authority/AlertsPage';
import { ActivityPage } from '@/pages/authority/ActivityPage';
import { WatchlistPage } from '@/pages/authority/WatchlistPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';

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
    {/* Public */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/auth/2fa/verify" element={<TwoFactorVerifyPage />} />
    <Route path="/authority/2fa/setup" element={<TwoFactorSetupPage />} />

    {/* Authenticated */}
    <Route element={<RequireAuth />}>
      <Route path="/" element={<RoleRedirect />} />

      {/* Hotel staff */}
      <Route element={<RequireRole roles={['hotel_admin', 'receptionist']} />}>
        <Route path="/hotel/dashboard" element={<DashboardPage />} />
        <Route path="/hotel/check-ins/new" element={<CheckInWizardPage />} />
        <Route path="/hotel/history" element={<HistoryPage />} />
        <Route path="/hotel/history/:id" element={<HistoryDetailPage />} />
        <Route path="/hotel/settings"    element={<SettingsPage />} />
        <Route path="/hotel/security"    element={<SecurityPage />} />
      </Route>

      {/* Authority */}
      <Route element={<RequireRole roles={['authority_user']} />}>
        <Route path="/authority/dashboard" element={<AuthorityDashboardPage />} />
        <Route path="/authority/search"    element={<SearchPage />} />
        <Route path="/authority/guests/:id" element={<GuestProfilePage />} />
        <Route path="/authority/hotels"    element={<HotelsPage />} />
        <Route path="/authority/hotels/:id" element={<HotelDetailPage />} />
        <Route path="/authority/alerts"     element={<AlertsPage />} />
        <Route path="/authority/watchlist"  element={<WatchlistPage />} />
        <Route path="/authority/activity"   element={<ActivityPage />} />
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
