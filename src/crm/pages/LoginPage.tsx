import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { crmApi, firstApiErrorMessage } from '@/crm/lib/api';
import { useCrmAuthStore } from '@/crm/stores/authStore';
import type { CrmUser } from '@/crm/types';

export function LoginPage() {
  const { isAuthenticated, setAuth } = useCrmAuthStore();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    const from = (location.state as { from?: Location })?.from;
    return <Navigate to={from?.pathname ?? '/'} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await crmApi.post<{ data: { token: string; user: CrmUser } }>('/auth/login', {
        email,
        password,
      });
      setAuth(res.data.data.token, res.data.data.user);
    } catch (err) {
      setError(firstApiErrorMessage(err, 'Identifiants incorrects.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-qayed-papier px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-3xl text-qayed-encre">Qayed CRM</h1>
        <p className="mb-8 text-qayed-fiche">Suivi de prospection — accès interne</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-qayed-encre">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-input w-full rounded-input border border-qayed-ligne bg-white px-4 text-base"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-qayed-encre">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-input w-full rounded-input border border-qayed-ligne bg-white px-4 text-base"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-input bg-qayed-erreur-fond px-4 py-2 text-sm text-qayed-erreur-texte">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-btn-lg w-full rounded-btn bg-qayed-cachet text-base font-semibold text-white transition-opacity disabled:opacity-60"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
