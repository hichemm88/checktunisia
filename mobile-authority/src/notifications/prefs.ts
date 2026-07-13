/**
 * Préférences de notifications par sévérité (F5 / F7).
 * Critique : TOUJOURS actif, non désactivable. Élevé / Moyen : configurables,
 * désactivés par défaut (§F5 : activées par défaut pour Critique uniquement).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotifPrefs {
  critique: true; // constant — non modifiable
  eleve: boolean;
  moyen: boolean;
}

const KEY = 'qayed.notifPrefs';
const DEFAULT: NotifPrefs = { critique: true, eleve: false, moyen: false };

export async function loadNotifPrefs(): Promise<NotifPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { critique: true, eleve: Boolean(p.eleve), moyen: Boolean(p.moyen) };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT;
}

export async function saveNotifPrefs(p: NotifPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ eleve: p.eleve, moyen: p.moyen }));
  } catch {
    /* best effort */
  }
}
