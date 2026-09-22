import { useCrmAuthStore } from '@/crm/stores/authStore';

export function SettingsPage() {
  const { user, logout } = useCrmAuthStore();

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 font-display text-2xl text-qayed-encre">Réglages</h1>

      <div className="mb-6 rounded-card border border-qayed-ligne bg-white p-4">
        <p className="font-medium text-qayed-encre">{user?.name}</p>
        <p className="text-sm text-qayed-fiche">{user?.email}</p>
        <p className="text-sm text-qayed-fiche">{user?.role === 'admin' ? 'Administrateur' : 'Membre'}</p>
      </div>

      <p className="mb-4 text-sm text-qayed-fiche">
        Modèles de message, notifications push et import du fichier existant arrivent dans une prochaine étape.
      </p>

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
