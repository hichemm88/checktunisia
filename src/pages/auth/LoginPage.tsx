import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { extractErrors } from '@/lib/api';

export const LoginPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await authApi.login(email, password);
      setAuth(token, user);
      // Role-based redirect
      if (user.role === 'authority_user') navigate('/authority/search');
      else if (user.role === 'platform_admin') navigate('/admin/hotels');
      else navigate('/hotel/dashboard');
    } catch (err) {
      setError(extractErrors(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 shadow-lg">
            <Shield className="h-7 w-7 text-gold-500" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">CheckTunisia</h1>
            <p className="text-sm text-gray-500">Enregistrement numérique des hôtes</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">
          <h2 className="text-center text-base font-semibold text-gray-900">Connexion</h2>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@hotel.tn"
            required
            autoComplete="email"
          />

          <Input
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          <Button type="submit" fullWidth loading={loading} size="lg">
            Se connecter
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} CheckTunisia — Plateforme agréée MdI
        </p>
      </div>
    </div>
  );
};
