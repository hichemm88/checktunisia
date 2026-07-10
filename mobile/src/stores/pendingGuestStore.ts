import { create } from 'zustand';
import type { AddGuestPayload } from '@/api/checkIns';

/**
 * Transient hand-off of ONE traveller (from MRZ scan or manual entry) back to the wizard.
 * Not persisted — identity-document data lives only in memory and is cleared once the wizard
 * consumes it (§7: nothing sensitive persists on the device after validation).
 */
interface PendingGuestState {
  guest: AddGuestPayload | null;
  setGuest: (g: AddGuestPayload) => void;
  consume: () => AddGuestPayload | null;
}

export const usePendingGuestStore = create<PendingGuestState>((set, get) => ({
  guest: null,
  setGuest: (g) => set({ guest: g }),
  consume: () => {
    const g = get().guest;
    set({ guest: null });
    return g;
  },
}));
