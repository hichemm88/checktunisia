/**
 * Persistance de session sécurisée (F1).
 * On ne stocke JAMAIS de données watchlist/voyageurs. Uniquement :
 * l'identité de l'agent connecté, un token de session et le PIN de secours.
 * Le token expire après 15 min d'inactivité (géré par AuthContext).
 */
import * as SecureStore from 'expo-secure-store';
import { Agent } from '../api/types';

const K_AGENT = 'qayed.agent';
const K_TOKEN = 'qayed.token';
const K_PIN = 'qayed.pin';

export interface StoredSession {
  agent: Agent;
  token: string;
}

export async function saveSession(s: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(K_AGENT, JSON.stringify(s.agent));
  await SecureStore.setItemAsync(K_TOKEN, s.token);
}

export async function loadSession(): Promise<StoredSession | null> {
  const [agentRaw, token] = await Promise.all([
    SecureStore.getItemAsync(K_AGENT),
    SecureStore.getItemAsync(K_TOKEN),
  ]);
  if (!agentRaw || !token) return null;
  try {
    return { agent: JSON.parse(agentRaw) as Agent, token };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(K_AGENT),
    SecureStore.deleteItemAsync(K_TOKEN),
    SecureStore.deleteItemAsync(K_PIN),
  ]);
}

export async function setPin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(K_PIN, pin);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(K_PIN);
  return stored != null && stored === pin;
}

export async function hasPin(): Promise<boolean> {
  return (await SecureStore.getItemAsync(K_PIN)) != null;
}
