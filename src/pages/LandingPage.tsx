import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { QayedStamp } from '@/components/ui/QayedStamp';

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--qayed-encre)' }}>
      {/* Motif "lignes de registre" */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ background: 'repeating-linear-gradient(to bottom, transparent 0 39px, var(--qayed-papier) 39px 40px)' }}
      />
      <div className="relative flex flex-col items-center gap-3 mb-10">
        <QayedStamp size={64} onDark />
        <h1 className="qayed-display text-2xl text-white">QAYED</h1>
      </div>

      <div className="relative flex w-full max-w-xs flex-col gap-3">
        <Button size="lg" fullWidth onClick={() => navigate('/login')}>
          Connexion
        </Button>
        <Button size="lg" variant="secondary" fullWidth onClick={() => navigate('/register')} className="!border-white/40 !text-white hover:!bg-white/10">
          Inscription
        </Button>
      </div>
    </div>
  );
};
