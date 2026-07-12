import { create } from 'zustand';

/**
 * Transient hand-off of a pending arrival (a draft check-in) into the check-in wizard (§4).
 * The wizard prefills step 1 from this seed and, on finalize, completes THAT draft instead of
 * creating a new check-in — so tapping "Check-in →" on a dashboard arrival continues the
 * existing draft rather than duplicating it.
 */
export interface DraftSeed {
  draftId: string;
  roomId?: string;
  roomNumber?: string;
  bookingRef?: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
}

interface DraftSeedState {
  seed: DraftSeed | null;
  setSeed: (s: DraftSeed) => void;
  consume: () => DraftSeed | null;
}

export const useDraftSeedStore = create<DraftSeedState>((set, get) => ({
  seed: null,
  setSeed: (s) => set({ seed: s }),
  consume: () => {
    const s = get().seed;
    set({ seed: null });
    return s;
  },
}));
