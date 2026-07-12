/** Shared API types — mirrored from the web app's src/types + src/stores/authStore. */

export type Role = 'platform_admin' | 'hotel_admin' | 'receptionist' | 'authority_user';

/** Mobile-facing role: only receptionist vs manager exist in the app (§4). */
export type MobileRole = 'receptionist' | 'manager';

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  hotel?: {
    id: string;
    name: string;
    slug: string;
    type?: string;
    subscription_status: string;
    subscription_expires_at?: string;
  } | null;
  permissions: string[];
  /** Client-side only: stored so we can refresh before the token expires. */
  _token_expires_at?: string;
}

/** Map the backend role to the two mobile roles. platform_admin/hotel_admin → manager. */
export function toMobileRole(role: Role): MobileRole {
  return role === 'receptionist' ? 'receptionist' : 'manager';
}

// ─── API envelopes ───────────────────────────────────────────────────────────
export interface ApiItem<T> {
  data: T;
}
export interface ApiList<T> {
  data: T[];
  meta?: { total: number; current_page?: number; last_page?: number; per_page?: number };
}

// ─── Domain ──────────────────────────────────────────────────────────────────
export type CheckInStatus = 'draft' | 'active' | 'completed' | 'cancelled' | 'no_show';

export interface Room {
  id: string;
  number: string;
  floor?: number | null;
  type: string;
  capacity: number;
  status: string;
}

export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: 'M' | 'F' | 'X';
  nationality_code: string;
  is_primary?: boolean;
}

export interface CheckIn {
  id: string;
  reference: string;
  status: CheckInStatus;
  room?: Room | null;
  booking_reference?: string;
  check_in_date: string;
  expected_check_out_date: string;
  actual_check_out_date?: string;
  adults_count: number;
  children_count: number;
  /** True when a traveller's document was expired on arrival (§3). Derived server-side. */
  document_expired?: boolean;
  guests?: Guest[];
  guests_count?: number;
  primary_guest?: { first_name: string; last_name: string; nationality_code: string };
  created_by?: { id: string; first_name: string; last_name: string };
  completed_at?: string;
  created_at: string;
}

export interface DashboardData {
  today: {
    arrivals_expected: number;
    arrivals_done: number;
    currently_present: number;
    departures_today: number;
    occupancy_rate: number;
  };
  month: { check_ins_total: number };
  room_count?: number;
  weekly_trend: Array<{ date: string; label: string; count: number }>;
  /** 7-day occupancy window (j-4 → j+2). today's rate == today.occupancy_rate by construction. */
  occupancy_7d?: Array<{ date: string; label: string; rate: number; is_today: boolean; is_future: boolean }>;
  /** Today's pending arrivals (drafts) — actionable rows (§4). */
  arrivals_today?: Array<{
    id: string;
    reference: string;
    guest_name?: string | null;
    booking_reference?: string | null;
    room?: string | null;
    room_id?: string | null;
    check_in_date: string;
    expected_check_out_date: string;
    adults_count: number;
    children_count: number;
  }>;
  /** Today's departures (active stays leaving today) — actionable rows (§4). */
  departures_today_list?: Array<{ id: string; reference: string; guest_name?: string | null; room?: string | null }>;
  /** Currently-present stays — for the tappable occupancy ring (§4). */
  present_guests?: Array<{ id: string; guest_name?: string | null; room?: string | null }>;
  /** Activity on the user's OTHER establishments today (§4). */
  other_properties?: { arrivals: number; departures: number };
  /** Per-property recap for the multi-establishment switcher (§5). */
  properties_summary?: Array<{ id: string; name: string; occupancy_rate: number; present: number; is_active: boolean }>;
  subscription: { status: string; expires_at?: string; days_remaining?: number; plan?: string };
  recent_check_ins: Array<{
    id: string;
    reference: string;
    room?: string;
    status: string;
    primary_guest?: string;
    check_in_date: string;
  }>;
}

export interface Property {
  id: string;
  name: string;
  type: string;
  room_count: number;
  stars: number | null;
  status: string;
  registration_number: string | null;
  address: { line1: string; city: string; governorate: string } | null;
}

export interface OrgInfo {
  id: string | null;
  name: string;
  entity_type: 'company' | 'individual';
  registration_number: string | null;
  contact_email: string;
  contact_phone: string | null;
  address: { line1?: string; city?: string; governorate?: string } | null;
  status: string;
  properties: Property[];
  total_rooms: number;
}

export interface MyProperty {
  id: string;
  name: string;
  status: string;
}

// Property-type labels — mirrored from web src/api/organization.ts
export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  hotel: 'Hôtel',
  guesthouse: "Maison d'hôtes",
  appartement: 'Appartement',
  villa: 'Villa',
  riad: 'Riad',
  maison_hotes: "Maison d'hôtes",
  hostel: 'Auberge de jeunesse',
  resort: 'Resort',
  bungalow: 'Bungalow',
  rental: 'Location saisonnière',
  residence: 'Résidence hôtelière',
};

export const getPropertyTypeName = (type?: string | null): string =>
  PROPERTY_TYPE_LABELS[type ?? ''] ?? 'Établissement';
