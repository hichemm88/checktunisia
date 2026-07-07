import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface Props {
  onStay:   () => void;
  onLogout: () => void;
}

export const IdleWarningModal = ({ onStay, onLogout }: Props) => {
  const [seconds, setSeconds] = useState(120);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16, padding: '2rem',
          width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ background: '#FBF0D7', borderRadius: 10, padding: 10 }}>
            <Clock style={{ color: '#D97706', width: 22, height: 22 }} />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Session inactive</p>
            <p style={{ fontSize: 13, color: '#6B7280' }}>Déconnexion automatique dans</p>
          </div>
        </div>

        <div
          style={{
            textAlign: 'center', fontSize: 48, fontWeight: 800,
            color: seconds <= 30 ? '#DC2626' : '#5346A8',
            margin: '1rem 0',
          }}
        >
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
        </div>

        <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: '1.5rem' }}>
          Vous êtes resté inactif trop longtemps. Pour protéger les données sensibles, la session va être fermée.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onLogout}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #E5E7EB',
              background: '#fff', color: '#6B7280', fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}
          >
            Se déconnecter
          </button>
          <button
            onClick={onStay}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none',
              background: '#5346A8', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}
          >
            Rester connecté
          </button>
        </div>
      </div>
    </div>
  );
};
