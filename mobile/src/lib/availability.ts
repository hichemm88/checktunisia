/**
 * Room availability for the check-in room selector (§1). Availability is computed for the
 * dates entered at step 1 ([arrival, departure)), not for "now": a room occupied until the
 * 16th is free for an arrival on the 17th. Nights are half-open — the checkout day is not an
 * occupied night — so a stay leaving on the arrival day does NOT block it (it's flagged amber
 * instead, "vérifier le check-out").
 *
 * This is a distinct concern from the dashboard occupancy % (which is the backend's single
 * source of truth): here we answer "which rooms are free for this date range", interactively.
 */
import type { CheckIn, Room } from '@/types';

/** Day part of an ISO date/datetime string (YYYY-MM-DD sorts lexicographically). */
function day(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

/** Stays that can block a room: confirmed present or upcoming, never cancelled/no-show. */
function blocks(status: CheckIn['status']): boolean {
  return status === 'active' || status === 'draft';
}

export interface RoomAvailability {
  room: Room;
  /** Amber: an active stay leaves the very day of the requested arrival — verify checkout. */
  departureDueToday: boolean;
  /** Available rooms: a short "Libre depuis…" / "Libérée aujourd'hui…" hint, or null. */
  freeHint: { kind: 'since'; date: string } | { kind: 'freedToday'; iso: string } | null;
}

export interface RoomOccupancy {
  room: Room;
  /** ISO date the blocking stay is expected to leave (for "départ {date}"). */
  until: string;
  /** Abbreviated guest name of the blocking stay, if known. */
  guest: string | null;
}

export interface RoomClassification {
  available: RoomAvailability[];
  occupied: RoomOccupancy[];
}

function abbreviateGuest(ci: CheckIn): string | null {
  const g = ci.primary_guest;
  if (!g) return null;
  const last = g.last_name ? `${g.last_name[0]}.` : '';
  return `${g.first_name} ${last}`.trim() || null;
}

/**
 * Split rooms into Disponibles / Occupées for a requested [arrival, departure) range.
 * A room is occupied when a blocking stay assigned to it overlaps the range
 * (stayIn < departure && stayOut > arrival). Otherwise it's available.
 */
export function classifyRooms(
  rooms: Room[],
  checkIns: CheckIn[],
  arrival: string,
  departure: string,
  todayStr: string,
): RoomClassification {
  const A = day(arrival);
  const D = day(departure);

  const available: RoomAvailability[] = [];
  const occupied: RoomOccupancy[] = [];

  for (const room of rooms) {
    const stays = checkIns.filter((c) => c.room?.id === room.id && blocks(c.status));

    // Overlap with the requested range → occupied.
    let conflict: CheckIn | null = null;
    for (const c of stays) {
      const sIn = day(c.check_in_date);
      const sOut = day(c.actual_check_out_date ?? c.expected_check_out_date);
      if (sIn < D && sOut > A) {
        // Keep the latest-leaving conflict so "départ {date}" reflects when it frees up.
        if (!conflict || sOut > day(conflict.actual_check_out_date ?? conflict.expected_check_out_date)) {
          conflict = c;
        }
      }
    }

    if (conflict) {
      occupied.push({
        room,
        until: day(conflict.actual_check_out_date ?? conflict.expected_check_out_date),
        guest: abbreviateGuest(conflict),
      });
      continue;
    }

    // Available. Amber if an active stay's expected checkout is the arrival day (not yet done).
    const departureDueToday = stays.some(
      (c) => c.status === 'active' && !c.actual_check_out_date && day(c.expected_check_out_date) === A,
    );

    // "Libre depuis…" — most recent real checkout on this room.
    let freedIso: string | null = null;
    for (const c of checkIns) {
      if (c.room?.id !== room.id || !c.actual_check_out_date) continue;
      if (!freedIso || c.actual_check_out_date > freedIso) freedIso = c.actual_check_out_date;
    }

    let freeHint: RoomAvailability['freeHint'] = null;
    if (!departureDueToday && freedIso) {
      freeHint = day(freedIso) === todayStr ? { kind: 'freedToday', iso: freedIso } : { kind: 'since', date: freedIso };
    }

    available.push({ room, departureDueToday, freeHint });
  }

  return { available, occupied };
}
