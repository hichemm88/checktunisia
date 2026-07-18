import { useCallback, useSyncExternalStore } from 'react';
import { FEATURES } from '@/config/features';

/**
 * Bascule MODE DEMO de l'Observatoire (§8). Etat persistant en localStorage,
 * defaut = FEATURES.observatoireDemo. Permet de basculer a chaud lors d'une
 * demonstration ministerielle sans redeploiement.
 */
const KEY = 'qayed-observatoire-demo';

function read(): boolean {
  const v = localStorage.getItem(KEY);
  if (v === null) return FEATURES.observatoireDemo;
  return v === '1';
}

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

export function useObservatoireDemo(): [boolean, (v: boolean) => void] {
  const demo = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    read,
    () => FEATURES.observatoireDemo,
  );

  const set = useCallback((v: boolean) => {
    localStorage.setItem(KEY, v ? '1' : '0');
    emit();
  }, []);

  return [demo, set];
}
