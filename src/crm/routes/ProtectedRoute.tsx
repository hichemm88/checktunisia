import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCrmAuthStore } from '@/crm/stores/authStore';
import { AppShell } from '@/crm/components/layout/AppShell';

export function ProtectedRoute() {
  const isAuthenticated = useCrmAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
