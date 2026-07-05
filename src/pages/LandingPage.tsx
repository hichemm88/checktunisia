import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: '#1B3A5F' }}>
      <div className="flex flex-col items-center gap-3 mb-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 shadow-lg">
          <Shield className="h-8 w-8" style={{ color: '#C8943A' }} />
        </div>
        <h1 className="text-2xl font-bold text-white">Qayed</h1>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button size="lg" fullWidth onClick={() => navigate('/login')}>
          Connexion
        </Button>
        <Button size="lg" variant="secondary" fullWidth onClick={() => navigate('/register')}>
          Inscription
        </Button>
      </div>
    </div>
  );
};
