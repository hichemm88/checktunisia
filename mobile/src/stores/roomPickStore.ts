import { create } from 'zustand';

/**
 * Transient hand-off of the room choice from the full-screen selector (§1) back to the
 * check-in wizard. A pick is always an explicit decision — either a room, or "sans chambre"
 * (roomId undefined) — so the wizard can require a conscious passage through the selector.
 */
export interface RoomPick {
  roomId?: string;
  roomNumber?: string;
}

interface RoomPickState {
  pick: RoomPick | null;
  setPick: (p: RoomPick) => void;
  consume: () => RoomPick | null;
}

export const useRoomPickStore = create<RoomPickState>((set, get) => ({
  pick: null,
  setPick: (p) => set({ pick: p }),
  consume: () => {
    const p = get().pick;
    set({ pick: null });
    return p;
  },
}));
