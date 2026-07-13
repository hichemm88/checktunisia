export interface Hotel {
  id: string; name: string; slug: string; type: string; room_count: number;
  status: string; registration_number?: string; stars?: number;
  subscription?: { plan: string; status: string; expires_at: string } | null;
}

export type RoomType =
  | 'single' | 'double' | 'twin' | 'triple' | 'quadruple'
  | 'suite' | 'junior_suite' | 'apartment' | 'studio'
  | 'family' | 'villa' | 'dormitory' | 'standard';

export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'inactive';

export interface Room {
  id: string; number: string; floor?: number | null;
  type: RoomType; capacity: number; status: RoomStatus;
}

export interface HotelAddress {
  line1?: string; line2?: string; city?: string; governorate?: string;
  postal_code?: string; latitude?: number | null; longitude?: number | null;
}

export interface OrganizationInfo {
  name: string;
  entity_type: 'company' | 'individual';
  registration_number?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: { line1?: string; city?: string; governorate?: string; postal_code?: string } | null;
}

export interface HotelProfile {
  id: string; name: string; type?: string; stars?: number | null;
  registration_number?: string; status: string;
  address?: HotelAddress | null;
  phone?: string | null; email?: string | null; website?: string | null;
  organization?: OrganizationInfo | null;
}

export interface UpdateHotelPayload {
  name?: string; type?: string; stars?: number | null;
  address?: Partial<HotelAddress>;
  phone?: string | null; email?: string | null; website?: string | null;
}

export interface TravelDocument {
  id: string; type: string; document_number: string; issuing_country_code: string;
  issue_date?: string; expiry_date?: string; is_verified: boolean;
}

export interface Guest {
  id: string; first_name: string; last_name: string; date_of_birth: string;
  sex: 'M' | 'F' | 'X'; nationality_code: string; is_primary?: boolean;
  document?: TravelDocument | null;
}

export interface CheckIn {
  id: string; reference: string; status: 'draft' | 'active' | 'completed' | 'cancelled' | 'no_show';
  room?: Room | null; booking_reference?: string; booking_source?: string;
  check_in_date: string; expected_check_out_date: string; actual_check_out_date?: string;
  adults_count: number; children_count: number; notes?: string;
  guests?: Guest[]; guests_count?: number;
  primary_guest?: { first_name: string; last_name: string; nationality_code: string };
  created_by?: { id: string; first_name: string; last_name: string };
  completed_at?: string; created_at: string;
}

export interface SubscriptionPlan {
  id: number; name: string; slug: string; min_rooms: number; max_rooms?: number;
  price_monthly: number; price_yearly?: number; currency: string;
  features: Record<string, unknown>;
}

export interface Subscription {
  id: string; plan: SubscriptionPlan; status: string; billing_cycle: string;
  started_at: string; expires_at: string; auto_renew: boolean; days_remaining: number;
}

export interface OcrExtracted {
  first_name: string; last_name: string; date_of_birth: string; sex: string;
  nationality_code: string; document_type: string; document_number: string;
  issuing_country_code: string; expiry_date: string; mrz_line1?: string; mrz_line2?: string;
}

export interface ScanStatus {
  scan_id: string; status: 'pending' | 'processing' | 'completed' | 'failed';
  confidence?: number; extracted?: OcrExtracted; error?: string; progress?: number;
}

export interface DashboardData {
  today: {
    arrivals_expected: number; arrivals_done: number;
    currently_present: number; departures_today: number;
    occupancy_rate: number;
  };
  month: { check_ins_total: number };
  room_count?: number;
  weekly_trend: Array<{ date: string; label: string; count: number }>;
  /** Fenêtre glissante j−4 → j+2 ; is_future = projection (barres pointillées). */
  occupancy_7d?: Array<{ date: string; label: string; rate: number; is_today: boolean; is_future: boolean }>;
  expiry_alerts: Array<{
    guest_name: string; document_number: string; expiry_date: string;
    days_until_expiry: number; check_in_id: string; reference: string;
  }>;
  subscription: { status: string; expires_at?: string; days_remaining?: number; plan?: string };
  recent_check_ins: Array<{ id: string; reference: string; room?: string; status: string; primary_guest?: string; check_in_date: string }>;
  pending_watchlist_hits?: number;
}

// ─── Watchlist ────────────────────────────────────────────────────────────────
export type WatchlistSeverity = 'critique' | 'eleve' | 'moyen';
export type WatchlistReasonCode = 'MANDAT_ARRET' | 'FRAUDE' | 'MIGRATION' | 'AUTRE';

export interface WatchlistHitInfo {
  severity: WatchlistSeverity;
  reason_code: WatchlistReasonCode;
  hit_type: 'document' | 'name_dob' | 'name_nationality';
  reason?: string | null; // ministry only
}

export interface WatchlistEntry {
  id: string;
  document_number?: string | null;
  document_type?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  nationality_code?: string | null;
  severity: WatchlistSeverity;
  reason_code: WatchlistReasonCode;
  reason?: string | null; // ministry only
  status: 'active' | 'inactive';
  expires_at?: string | null;
  source: 'manual' | 'import';
  added_at?: string;
  added_by_name?: string;
  organization_name?: string;
}

export interface WatchlistImportResult {
  created: number;
  skipped: number;
  errors: string[];
  batch_id: string;
}

export interface AuthorityGuest {
  guest_id: string; first_name: string; last_name: string; date_of_birth: string;
  sex: string; nationality_code: string; document_number?: string; document_type?: string;
  last_stay?: { hotel_name: string; check_in_date: string; status: string } | null;
  watchlist_hit?: WatchlistHitInfo | null;
}

export interface AuthorityGuestProfile {
  id: string; first_name: string; last_name: string; date_of_birth: string; sex: string;
  nationality_code: string;
  documents: TravelDocument[];
  stays: Array<{
    check_in_id: string; hotel: { name: string; city?: string; governorate?: string; registration_number?: string };
    room_number?: string; check_in_date: string; expected_check_out_date: string;
    actual_check_out_date?: string; status: string;
  }>;
}

export interface AuthorityCheckIn {
  id: string;
  reference: string;
  status: string;
  check_in_date: string;
  expected_check_out_date: string;
  actual_check_out_date?: string | null;
  adults_count: number;
  children_count: number;
  room_number?: string | null;
  guests_count: number;
  primary_guest?: {
    id: string;
    first_name: string;
    last_name: string;
    nationality_code?: string | null;
    date_of_birth?: string | null;
  } | null;
  guests?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    nationality_code?: string | null;
    is_primary: boolean;
  }>;
}

/** One row per traveler — a multi-guest stay produces one entry per guest, not one per check-in. */
export interface AuthorityRecentCheckIn {
  check_in_id: string;
  reference: string;
  check_in_date: string;
  guest_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  nationality_code?: string | null;
  document_number?: string | null;
  hotel: { name: string; city?: string | null; governorate?: string | null } | null;
  room_number?: string | null;
  created_by?: string | null;
}

export interface AuthorityHotelOwner {
  entity_type: 'company' | 'individual';
  name?: string | null;
  registration_number?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: Record<string, string> | null;
}

export interface AuthorityHotelStaff {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
}

export interface AuthorityHotel {
  id: string; name: string; slug: string; type: string; stars?: number;
  city?: string; governorate?: string; address?: string;
  address_full?: string | null;
  address_structured?: { line1?: string; line2?: string; city?: string; governorate?: string; postal_code?: string } | null;
  type_label?: string | null;
  registration_number?: string; room_count: number; status: string;
  subscription_status?: string; subscription_expires_at?: string;
  active_guests_count?: number; total_check_ins?: number;
  owner?: AuthorityHotelOwner | null;
  staff?: AuthorityHotelStaff[];
}

export interface ApiList<T> { data: T[]; meta: { total: number; current_page: number; per_page: number; last_page: number } }
export interface ApiItem<T> { data: T }

// ─── Authority dashboard ──────────────────────────────────────────────────────
export interface AuthorityDashboardMinistry {
  type: 'ministry';
  active_guests: number;
  check_ins_today: number;
  check_outs_today: number;
  active_hotels: number;
  expiring_docs_30d: number;
  by_governorate: Array<{ governorate: string; active_guests: number; hotels: number }>;
  top_nationalities: Array<{ nationality_code: string; count: number }>;
  weekly_trend: Array<{ date: string; label: string; count: number }>;
}

export interface AuthorityDashboardPolice {
  type: 'police';
  governorate: string | null;
  active_guests: number;
  check_ins_today: number;
  check_outs_today: number;
  hotels_in_zone: number;
  expiring_docs_30d: number;
  nationalities: Array<{ nationality_code: string; count: number }>;
  recent_arrivals: Array<{
    check_in_id: string;
    guest_name: string;
    nationality: string | null;
    hotel: string;
    room: string | null;
    check_in_date: string;
    guests_count: number;
  }>;
}

export type AuthorityDashboard = AuthorityDashboardMinistry | AuthorityDashboardPolice;

export interface AuthorityAlert {
  doc_id: string;
  guest_id: string;
  guest_name: string | null;
  nationality_code: string | null;
  document_type: string;
  document_number: string;
  expiry_date: string;
  days_until_expiry: number;
  hotel: { name: string; city?: string; governorate?: string } | null;
  room_number: string | null;
  check_in_id: string | null;
}

export interface AuthorityActivity {
  id: string;
  action: string;
  actor_name: string;
  actor_role: string;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// Settings / Profile
export interface UpdateProfilePayload { first_name?: string; last_name?: string; phone?: string }
export interface ChangePasswordPayload { current_password: string; new_password: string; new_password_confirmation: string }

export interface HotelUser {
  id: string; first_name: string; last_name: string; email: string;
  role: string; status: string; last_login_at?: string;
  properties?: { id: string; name: string }[];
}

export interface ActivityLogEntry {
  id: number;
  action: string;
  subject_type?: string | null;
  subject_id?: string | null;
  subject_label?: string | null;
  actor: { id: string; name: string; role: string } | null;
  created_at: string;
}

export interface CreateUserPayload {
  first_name: string; last_name: string; email: string;
  role: 'hotel_admin' | 'receptionist';
  hotel_ids?: string[];
}
