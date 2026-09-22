import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Download } from 'lucide-react';
import { useCrmAuthStore } from '@/crm/stores/authStore';
import { crmApi } from '@/crm/lib/api';
import { NotificationSettings } from '@/crm/components/NotificationSettings';
import { InstallAppCard } from '@/crm/components/InstallAppCard';

export function SettingsPage() {
  const { user, logout } = useCrmAuthStore();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await crmApi.get('/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prospection-qayed-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 font-display text-2xl text-qayed-encre">Réglages</h1>

      <div className="mb-6 rounded-card border border-qayed-ligne bg-white p-4">
        <p className="font-medium text-qayed-encre">{user?.name}</p>
        <p className="text-sm text-qayed-fiche">{user?.email}</p>
        <p className="text-sm text-qayed-fiche">{user?.role === 'admin' ? 'Administrateur' : 'Membre'}</p>
      </div>

      <div className="mb-6 divide-y divide-qayed-ligne overflow-hidden rounded-card border border-qayed-ligne bg-white">
        {user?.role === 'admin' && <SettingsLink to="/membres" label="Membres de l'équipe" />}
        <SettingsLink to="/modeles" label="Modèles de message" />
        <SettingsLink to="/import" label="Importer le fichier existant" />
        <button
          type="button"
          disabled={exporting}
          onClick={handleExport}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-qayed-encre disabled:opacity-60"
        >
          {exporting ? 'Export en cours…' : 'Exporter en CSV'}
          <Download className="h-4 w-4 text-qayed-fiche" />
        </button>
      </div>

      <InstallAppCard />

      <NotificationSettings />

      <button
        type="button"
        onClick={logout}
        className="h-btn-md w-full rounded-btn border border-qayed-erreur text-qayed-erreur-texte"
      >
        Se déconnecter
      </button>
    </div>
  );
}

function SettingsLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex items-center justify-between px-4 py-3 text-sm font-medium text-qayed-encre active:bg-qayed-cachet-dilue">
      {label}
      <ChevronRight className="h-4 w-4 text-qayed-fiche" />
    </Link>
  );
}
