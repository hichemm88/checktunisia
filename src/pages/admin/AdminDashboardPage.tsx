import { useAuthStore } from '@/stores/authStore';

export const AdminDashboardPage = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">CheckTunisia Admin</h1>
        <p className="text-gray-500 mb-1">Connecté en tant que</p>
        <p className="font-semibold text-gray-800 mb-1">{user?.first_name} {user?.last_name}</p>
        <p className="text-sm text-gray-500 mb-6">{user?.email}</p>

        <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Rôle</p>
          <p className="text-blue-900 font-medium">Administrateur Plateforme</p>
        </div>

        <p className="text-sm text-gray-400 mb-6">
          Le panneau d'administration complet est en cours de développement.
        </p>

        <button
          onClick={logout}
          className="w-full py-2.5 px-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
};
