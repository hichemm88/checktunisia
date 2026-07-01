import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, Role } from '@/stores/authStore';

// Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/hotel/DashboardPage';
import { CheckInWizardPage } from '@/pages/hotel/CheckInWizardPage';
import { HistoryPage } from '@/pages/hotel/HistoryPage';
import { HistoryDetailPage } from '@/pages/hotel/HistoryDetailPage';
import { SettingsPage } from '@/pages/hotel/SettingsPage';
import { SearchPage } from '@/pages/authority/SearchPage';
import { GuestProfilePage } from '@/pages/authority/GuestProfilePage';
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
  if (role === 'authority_user') return <Navigate to="/authority/search" replace />;
  if (role === 'platform_admin') return <Navigate to="/admin/hotels" replace />;
  return <Navigate to="/hotel/dashboard" replace />;
};

// ─── App ─────────────────────────────────────────────────────────────────────
export const App = () => (
  <Routes>
    {/* Public */}
    <Route path="/login" element={<LoginPage />} />

    {/* Authenticated */}
    <Route element={<RequireAuth />}>
      <Route path="/" element={<RoleRedirect />} />

      {/* Hotel staff */}
      <Route element={<RequireRole roles={['hotel_admin', 'receptionist']} />}>
        <Route path="/hotel/dashboard" element={<DashboardPage />} />
        <Route path="/hotel/check-ins/new" element={<CheckInWizardPage />} />
        <Route path="/hotel/history" element={<HistoryPage />} />
        <Route path="/hotel/history/:id" element={<HistoryDetailPage />} />
        <Route path="/hotel/settings" element={<SettingsPage />} />
      </Route>

      {/* Authority */}
      <Route element={<RequireRole roles={['authority_user']} />}>
        <Route path="/authority/search" element={<SearchPage />} />
        <Route path="/authority/guests/:id" element={<GuestProfilePage />} />
      </Route>

      {/* Admin */}
      <Route element={<RequireRole roles={['platform_admin']} />}>
        <Route path="/admin/hotels" element={<AdminDashboardPage />} />
      </Route>
    </Route>

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
