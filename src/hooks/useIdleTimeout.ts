import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';

const IDLE_MS    = 15 * 60 * 1000; // 15 minutes → show warning
const WARNING_MS =  2 * 60 * 1000; // 2 more minutes → auto-logout

export function useIdleTimeout() {
  const { isAuthenticated, logout } = useAuthStore();
  const navigate  = useNavigate();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const doLogout = async () => {
    setShowWarning(false);
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  const resetTimers = () => {
    if (!isAuthenticated) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warnTimer.current) clearTimeout(warnTimer.current);
    setShowWarning(false);

    idleTimer.current = setTimeout(() => {
      setShowWarning(true);
      warnTimer.current = setTimeout(doLogout, WARNING_MS);
    }, IDLE_MS);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((e) => window.addEventListener(e, resetTimers, { passive: true }));
    resetTimers();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimers));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return { showWarning, stayActive: resetTimers, logout: doLogout };
}
