import React, {
  createContext, useContext, useEffect, useMemo, useRef, useState, useCallback,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Agent } from '../api/types';
import { setAuthToken } from '../api/client';
import { CURRENT_AGENT } from '../api/seed';
import {
  loadSession, saveSession, clearSession, setPin, verifyPin,
} from './secureSession';
import { promptBiometric, getBiometricCapability } from './biometric';

type Status = 'loading' | 'needsLogin' | 'locked' | 'unlocked';

interface AuthContextValue {
  status: Status;
  agent: Agent | null;
  /** true si le verrouillage vient d'une expiration de session (message dédié). */
  expiredByInactivity: boolean;
  login: (identifier: string) => Promise<void>;
  unlockWithBiometric: () => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  /** Réinitialise le minuteur d'inactivité (à appeler sur interaction). */
  touch: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Session courte : expiration après 15 min d'inactivité (F1).
const INACTIVITY_MS = 15 * 60 * 1000;

// PIN de secours par défaut pour la démo (en prod : défini à l'enrôlement).
const DEMO_PIN = '123456';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Status>('loading');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [expiredByInactivity, setExpired] = useState(false);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<Status>('loading');
  statusRef.current = status;

  const clearTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
  };

  const lock = useCallback((expired: boolean) => {
    clearTimer();
    setAuthToken(null); // le token n'est plus valable tant que non ré-authentifié
    setExpired(expired);
    if (statusRef.current === 'unlocked') setStatus('locked');
  }, []);

  const touch = useCallback(() => {
    if (statusRef.current !== 'unlocked') return;
    clearTimer();
    inactivityTimer.current = setTimeout(() => lock(true), INACTIVITY_MS);
  }, [lock]);

  // Au démarrage : session existante → écran de verrouillage (biométrie obligatoire).
  useEffect(() => {
    (async () => {
      const s = await loadSession();
      if (s) {
        setAgent(s.agent);
        setStatus('locked'); // ne pas restaurer le token avant ré-authentification
      } else {
        setStatus('needsLogin');
      }
    })();
  }, []);

  // Biométrie obligatoire à CHAQUE ouverture : verrouiller au retour d'arrière-plan.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        lock(false);
      }
    });
    return () => sub.remove();
  }, [lock]);

  const restoreToken = useCallback(async () => {
    const s = await loadSession();
    if (s) {
      setAuthToken(s.token);
      setAgent(s.agent);
    }
  }, []);

  const login = useCallback(async (identifier: string) => {
    // Comptes créés par l'admin (pas d'inscription in-app). En démo, on ouvre
    // la session pour l'agent courant après authentification biométrique.
    // Si l'appareil n'a aucune biométrie enrôlée, on n'empêche pas la première
    // connexion (le code PIN prend le relais au verrouillage — F1).
    const cap = await getBiometricCapability();
    if (cap.available && cap.enrolled) {
      const ok = await promptBiometric('Authentifiez-vous pour ouvrir votre session');
      if (!ok) throw new Error('biometricFailed');
    }
    const a: Agent = { ...CURRENT_AGENT };
    const token = `demo.${identifier || a.badge_number}.${Date.now()}`;
    await saveSession({ agent: a, token });
    await setPin(DEMO_PIN);
    setAuthToken(token);
    setAgent(a);
    setExpired(false);
    setStatus('unlocked');
    touch();
  }, [touch]);

  const unlockWithBiometric = useCallback(async () => {
    const ok = await promptBiometric('Déverrouillez Qayed الداخلية');
    if (!ok) return false;
    await restoreToken();
    setExpired(false);
    setStatus('unlocked');
    touch();
    return true;
  }, [restoreToken, touch]);

  const unlockWithPin = useCallback(async (pin: string) => {
    const ok = await verifyPin(pin);
    if (!ok) return false;
    await restoreToken();
    setExpired(false);
    setStatus('unlocked');
    touch();
    return true;
  }, [restoreToken, touch]);

  const logout = useCallback(async () => {
    clearTimer();
    setAuthToken(null);
    await clearSession();
    setAgent(null);
    setExpired(false);
    setStatus('needsLogin');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, agent, expiredByInactivity, login, unlockWithBiometric, unlockWithPin, logout, touch }),
    [status, agent, expiredByInactivity, login, unlockWithBiometric, unlockWithPin, logout, touch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
