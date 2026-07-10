import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, extractError } from '@/lib/api';
import type { CreateCheckInPayload, AddGuestPayload } from '@/api/checkIns';
import type { ApiItem, CheckIn, Guest } from '@/types';

/**
 * Offline check-in queue (§8). The receptionist must NEVER lose a saved check-in to a bad
 * 4G connection. On finalize, the full unit (create draft → add each traveller → complete)
 * is submitted; if any call fails, the whole item is persisted locally and retried
 * automatically in the background (on reconnect or app resume).
 *
 * v1 is outbound-only — no bidirectional sync. Note: at-rest encryption of the persisted
 * payload (sensitive PII) is a hardening follow-up before store submission (Phase 4).
 */

const STORAGE_KEY = 'qayed.offlineQueue';

export type QueueItemStatus = 'pending' | 'error';

export interface QueueItem {
  localId: string;
  createdAt: string;
  /** Property context captured at save time so retries target the right establishment. */
  propertyId: string | null;
  create: CreateCheckInPayload;
  guests: AddGuestPayload[];
  status: QueueItemStatus;
  attempts: number;
  lastError?: string;
}

interface QueueState {
  items: QueueItem[];
  processing: boolean;
  hydrate: () => Promise<void>;
  enqueue: (item: Omit<QueueItem, 'localId' | 'createdAt' | 'status' | 'attempts'>) => Promise<void>;
  processAll: () => Promise<void>;
  remove: (localId: string) => Promise<void>;
}

async function persist(items: QueueItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Submit one queued check-in unit against the API, pinning the property header. */
async function submitItem(item: QueueItem): Promise<void> {
  const headers = item.propertyId ? { 'X-Property-Id': item.propertyId } : undefined;

  const created = await api
    .post<ApiItem<CheckIn>>('/hotel/check-ins', item.create, { headers })
    .then((r) => r.data.data);

  for (const g of item.guests) {
    const { document_type, document_number, issuing_country_code, issue_date, expiry_date, ...rest } = g;
    const body = {
      ...rest,
      document: {
        type: document_type || 'passport',
        document_number: document_number || '',
        issuing_country_code: issuing_country_code || '',
        issue_date,
        expiry_date,
      },
    };
    await api.post<ApiItem<Guest>>(`/hotel/check-ins/${created.id}/guests`, body, { headers });
  }

  await api.post(`/hotel/check-ins/${created.id}/complete`, undefined, { headers });
}

// Deterministic-ish local id without Date.now()/Math.random dependence at module load.
let seq = 0;
function makeLocalId(): string {
  seq += 1;
  return `q_${new Date().getTime()}_${seq}`;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  items: [],
  processing: false,

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) set({ items: JSON.parse(raw) as QueueItem[] });
  },

  enqueue: async (partial) => {
    const item: QueueItem = {
      ...partial,
      localId: makeLocalId(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      attempts: 0,
    };
    const items = [...get().items, item];
    set({ items });
    await persist(items);
    // Fire-and-forget an immediate processing attempt.
    void get().processAll();
  },

  processAll: async () => {
    if (get().processing) return;
    if (get().items.length === 0) return;
    set({ processing: true });
    try {
      for (const item of [...get().items]) {
        try {
          await submitItem(item);
          const remaining = get().items.filter((i) => i.localId !== item.localId);
          set({ items: remaining });
          await persist(remaining);
        } catch (err) {
          const updated = get().items.map((i) =>
            i.localId === item.localId
              ? { ...i, status: 'error' as const, attempts: i.attempts + 1, lastError: extractError(err) }
              : i,
          );
          set({ items: updated });
          await persist(updated);
          // Stop on first failure — likely still offline; will retry on next trigger.
          break;
        }
      }
    } finally {
      set({ processing: false });
    }
  },

  remove: async (localId) => {
    const items = get().items.filter((i) => i.localId !== localId);
    set({ items });
    await persist(items);
  },
}));
