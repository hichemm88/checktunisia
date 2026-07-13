/**
 * Types du domaine — alignés sur le backend autorités (dashboard web).
 * Volontairement structurés pour qu'un champ `role` puisse arriver plus tard
 * côté agent sans refonte (cf. §5).
 */

export type WatchlistSeverity = 'critique' | 'eleve' | 'moyen';
export type WatchlistSource = 'interpol' | 'onu' | 'locale';

export type VerificationState = 'vert' | 'ambre' | 'rouge';

/** Données extraites de la MRZ (identique à l'app hébergeur). */
export interface MrzData {
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null; // ISO YYYY-MM-DD
  sex: 'M' | 'F' | 'X' | null;
  nationality_code: string | null;
  document_number: string | null;
  issuing_country_code: string | null;
  expiry_date: string | null;
  document_type: string; // 'passport' | 'id' | …
}

export interface RegisteredStay {
  hotel_name: string;
  hotel_id: string;
  city?: string;
  governorate?: string;
  room_number?: string | null;
  check_in_date: string;
  expected_check_out_date?: string | null;
}

export interface WatchlistHit {
  severity: WatchlistSeverity;
  source: WatchlistSource;
  reason_code: string;
  reason?: string | null;
}

/** Réponse de l'API de vérification — un seul objet, trois états possibles. */
export interface VerificationResult {
  state: VerificationState;
  person: {
    first_name: string | null;
    last_name: string | null;
    nationality_code: string | null;
    date_of_birth: string | null;
    document_number: string | null;
    document_type: string | null;
  };
  stay?: RegisteredStay | null; // présent si state === 'vert'
  watchlist?: WatchlistHit | null; // présent si state === 'rouge'
  checked_at: string; // ISO
}

export interface Establishment {
  id: string;
  name: string;
  type_label: string;
  city: string;
  governorate: string;
  district?: string;
  address: string;
  manager_name: string;
  manager_phone: string;
  room_count: number;
  present_count: number;
  last_sheet_at: string | null; // fraîcheur
  lat: number;
  lng: number;
}

export interface PresentTraveler {
  id: string;
  first_name: string;
  last_name: string;
  nationality_code: string;
  room_number?: string | null;
  check_in_date: string;
}

export interface ZoneStats {
  present: number;
  arrivals_today: number;
  active_hotels: number;
}

export interface ActiveAlert {
  id: string;
  severity: WatchlistSeverity;
  source: WatchlistSource;
  person_name: string;
  nationality_code: string | null;
  establishment_name: string;
  establishment_id: string;
  matched_at: string;
  reason_code: string;
  acknowledged: boolean;
  consigne: string;
}

export type AuditActionType = 'verify' | 'control' | 'report';

export interface AuditEntry {
  id: string;
  action: AuditActionType;
  result?: VerificationState | null; // pour les vérifications
  subject?: string | null; // nom voyageur / établissement
  created_at: string;
  place_label?: string | null; // libellé lieu (géoloc)
  has_location: boolean;
}

export interface Agent {
  id: string;
  name: string;
  badge_number: string;
  zone: string;
  role: 'agent'; // extensible plus tard (superviseur…) sans refonte
}

export interface RecentCheck {
  id: string;
  name: string;
  result: VerificationState;
  at: string;
}
