import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/crm/routes/ProtectedRoute';
import { LoginPage } from '@/crm/pages/LoginPage';
import { TodayPage } from '@/crm/pages/TodayPage';
import { PipelinePage } from '@/crm/pages/PipelinePage';
import { EstablishmentDetailPage } from '@/crm/pages/EstablishmentDetailPage';
import { DashboardPage } from '@/crm/pages/DashboardPage';
import { SettingsPage } from '@/crm/pages/SettingsPage';
import { TemplatesPage } from '@/crm/pages/TemplatesPage';
import { ImportPage } from '@/crm/pages/ImportPage';
import { MembersPage } from '@/crm/pages/MembersPage';

export function CrmApp() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<TodayPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/etablissements/:id" element={<EstablishmentDetailPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/reglages" element={<SettingsPage />} />
        <Route path="/modeles" element={<TemplatesPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/membres" element={<MembersPage />} />
      </Route>
    </Routes>
  );
}
