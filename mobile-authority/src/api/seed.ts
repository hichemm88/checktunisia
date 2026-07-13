/**
 * Jeu de données de démo ministérielle (§8).
 *
 * - Établissements fictifs génériques — JAMAIS les vrais noms Kasbahost.
 * - Watchlist : mix de sévérités (critique / élevé / moyen) et de sources
 *   (Interpol/ONU vs locale) — pas 100 % de Red Notices identiques.
 * - Scénario scripté : scan conforme (vert) → non déclaré (ambre) →
 *   match watchlist (rouge). Voir DEMO.md.
 *
 * Ce module est la SEULE source de données factices. En production, la couche
 * `services/*` appelle l'API réelle à la place (aucune donnée watchlist n'est
 * mise en cache localement — cf. F1 / §9.2 : ici tout est calculé à la volée).
 */
import {
  Establishment,
  PresentTraveler,
  ActiveAlert,
  Agent,
  VerificationResult,
  MrzData,
} from './types';

const H = 3600_000;
const D = 24 * H;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

// ── Agents (crédibilise le journal d'audit — §8) ─────────────────────────────
export const AGENTS: Agent[] = [
  { id: 'ag-1', name: 'Anis Blidi', badge_number: 'INT-4821', zone: 'Sousse', role: 'agent' },
  { id: 'ag-2', name: 'Sonia Gharbi', badge_number: 'INT-5107', zone: 'Sousse', role: 'agent' },
  { id: 'ag-3', name: 'Karim Nasri', badge_number: 'INT-3390', zone: 'Sousse', role: 'agent' },
];
export const CURRENT_AGENT = AGENTS[0];

// Centre approximatif de la zone (Sousse) — proximité des établissements.
export const ZONE_CENTER = { lat: 35.8256, lng: 10.6084 };

// ── Établissements (noms fictifs génériques) ─────────────────────────────────
export const ESTABLISHMENTS: Establishment[] = [
  {
    id: 'et-1', name: 'Riad Al Warda', type_label: "Maison d'hôtes",
    city: 'Sousse', governorate: 'Sousse', district: 'Médina',
    address: '12 rue des Oliviers, Médina, Sousse',
    manager_name: 'Fathi Mansour', manager_phone: '+21698112233',
    room_count: 14, present_count: 9, last_sheet_at: ago(2 * H),
    lat: 35.8280, lng: 10.6390,
  },
  {
    id: 'et-2', name: 'Hôtel Nour El Bahr', type_label: 'Hôtel',
    city: 'Sousse', governorate: 'Sousse', district: 'Corniche',
    address: 'Avenue Taïeb Mhiri, Corniche, Sousse',
    manager_name: 'Leïla Bouzid', manager_phone: '+21671445566',
    room_count: 86, present_count: 41, last_sheet_at: ago(5 * H),
    lat: 35.8410, lng: 10.6210,
  },
  {
    id: 'et-3', name: "Résidence Dar Yasmine", type_label: 'Résidence',
    city: 'Hammam Sousse', governorate: 'Sousse', district: 'Centre',
    address: '3 rue Ibn Khaldoun, Hammam Sousse',
    manager_name: 'Mourad Trabelsi', manager_phone: '+21697778899',
    room_count: 22, present_count: 7, last_sheet_at: ago(3 * D + 4 * H), // silencieux → signal
    lat: 35.8600, lng: 10.5940,
  },
  {
    id: 'et-4', name: 'Auberge El Manar', type_label: 'Auberge',
    city: 'Kalâa Kebira', governorate: 'Sousse', district: '',
    address: 'Route de Kairouan, Kalâa Kebira',
    manager_name: 'Nizar Ferchichi', manager_phone: '+21692223344',
    room_count: 10, present_count: 0, last_sheet_at: null, // aucune fiche
    lat: 35.8710, lng: 10.5340,
  },
  {
    id: 'et-5', name: 'Villa Les Jasmins', type_label: "Maison d'hôtes",
    city: 'Akouda', governorate: 'Sousse', district: '',
    address: '8 impasse du Phare, Akouda',
    manager_name: 'Rym Haddad', manager_phone: '+21655667788',
    room_count: 6, present_count: 4, last_sheet_at: ago(40 * 60_000),
    lat: 35.8720, lng: 10.5700,
  },
];

// ── Voyageurs présents par établissement ─────────────────────────────────────
export const PRESENT_TRAVELERS: Record<string, PresentTraveler[]> = {
  'et-1': [
    { id: 'gt-1', first_name: 'Marco', last_name: 'Rossi', nationality_code: 'ITA', room_number: '4', check_in_date: ago(2 * D) },
    { id: 'gt-2', first_name: 'Anna', last_name: 'Rossi', nationality_code: 'ITA', room_number: '4', check_in_date: ago(2 * D) },
    { id: 'gt-3', first_name: 'Hans', last_name: 'Weber', nationality_code: 'DEU', room_number: '7', check_in_date: ago(1 * D) },
    { id: 'gt-4', first_name: 'Yuki', last_name: 'Tanaka', nationality_code: 'JPN', room_number: '9', check_in_date: ago(3 * H) },
  ],
  'et-2': [
    { id: 'gt-5', first_name: 'Sarah', last_name: 'Johnson', nationality_code: 'GBR', room_number: '210', check_in_date: ago(4 * D) },
    { id: 'gt-6', first_name: 'Pierre', last_name: 'Dubois', nationality_code: 'FRA', room_number: '305', check_in_date: ago(1 * D) },
    { id: 'gt-7', first_name: 'Olga', last_name: 'Petrova', nationality_code: 'RUS', room_number: '118', check_in_date: ago(6 * H) },
  ],
  'et-3': [
    { id: 'gt-8', first_name: 'Ahmed', last_name: 'Ben Salah', nationality_code: 'DZA', room_number: 'B2', check_in_date: ago(5 * D) },
  ],
  'et-5': [
    { id: 'gt-9', first_name: 'Emma', last_name: 'Lefèvre', nationality_code: 'FRA', room_number: '2', check_in_date: ago(12 * H) },
  ],
};

// ── Watchlist active dans la zone (mix sévérités + sources) ───────────────────
export const ACTIVE_ALERTS: ActiveAlert[] = [
  {
    id: 'al-1', severity: 'critique', source: 'interpol',
    person_name: 'Viktor KOVAC', nationality_code: 'SRB',
    establishment_name: 'Hôtel Nour El Bahr', establishment_id: 'et-2',
    matched_at: ago(50 * 60_000), reason_code: 'MANDAT_ARRET',
    acknowledged: false,
    consigne: 'Ne pas intervenir seul — contacter le central immédiatement. Individu potentiellement dangereux (notice rouge Interpol).',
  },
  {
    id: 'al-2', severity: 'eleve', source: 'locale',
    person_name: 'Sami TOUATI', nationality_code: 'TUN',
    establishment_name: 'Riad Al Warda', establishment_id: 'et-1',
    matched_at: ago(6 * H), reason_code: 'FRAUDE',
    acknowledged: true,
    consigne: 'Vérifier l\'identité. Signalement fiscal en cours — coordination avec la brigade financière.',
  },
  {
    id: 'al-3', severity: 'moyen', source: 'onu',
    person_name: 'Nadia HAMDI', nationality_code: 'LBY',
    establishment_name: 'Résidence Dar Yasmine', establishment_id: 'et-3',
    matched_at: ago(1 * D + 2 * H), reason_code: 'MIGRATION',
    acknowledged: true,
    consigne: 'Contrôle documentaire renforcé. Aucune mesure coercitive.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Scénario scripté de vérification (§8) : vert → ambre → rouge, en boucle.
// Chaque appui sur « Scanner » avance dans la séquence. La saisie manuelle
// peut viser directement un état via un numéro de document connu.
// ─────────────────────────────────────────────────────────────────────────────

const SCAN_VERT: MrzData = {
  first_name: 'Marco', last_name: 'Rossi', date_of_birth: '1986-04-12',
  sex: 'M', nationality_code: 'ITA', document_number: 'YA1234567',
  issuing_country_code: 'ITA', expiry_date: '2030-04-11', document_type: 'passport',
};
const SCAN_AMBRE: MrzData = {
  first_name: 'Robert', last_name: 'Klein', date_of_birth: '1979-09-03',
  sex: 'M', nationality_code: 'AUT', document_number: 'P7788990',
  issuing_country_code: 'AUT', expiry_date: '2029-01-20', document_type: 'passport',
};
const SCAN_ROUGE: MrzData = {
  first_name: 'Viktor', last_name: 'Kovac', date_of_birth: '1975-11-28',
  sex: 'M', nationality_code: 'SRB', document_number: 'RS9021144',
  issuing_country_code: 'SRB', expiry_date: '2028-06-15', document_type: 'passport',
};

/** Séquence de démo — l'ordre est volontaire (le « wow » finit sur le rouge). */
export const DEMO_SCAN_SEQUENCE: MrzData[] = [SCAN_VERT, SCAN_AMBRE, SCAN_ROUGE];

let demoScanIndex = 0;
/** Avance dans la séquence scriptée à chaque scan simulé (§8). */
export function getNextDemoScan(): MrzData {
  const mrz = DEMO_SCAN_SEQUENCE[demoScanIndex % DEMO_SCAN_SEQUENCE.length];
  demoScanIndex += 1;
  return mrz;
}
export function resetDemoScan() {
  demoScanIndex = 0;
}

/** Résout un MrzData (ou un numéro de doc en saisie manuelle) → résultat 3 états. */
export function resolveVerification(input: MrzData): VerificationResult {
  const doc = (input.document_number ?? '').toUpperCase();

  // ROUGE — match watchlist critique.
  if (doc === SCAN_ROUGE.document_number || input.last_name?.toLowerCase() === 'kovac') {
    return {
      state: 'rouge',
      person: personFrom(SCAN_ROUGE),
      watchlist: {
        severity: 'critique', source: 'interpol', reason_code: 'MANDAT_ARRET',
        reason: 'Notice rouge Interpol — mandat d\'arrêt international.',
      },
      checked_at: new Date().toISOString(),
    };
  }

  // VERT — voyageur enregistré (présent au Riad Al Warda).
  if (doc === SCAN_VERT.document_number || input.last_name?.toLowerCase() === 'rossi') {
    return {
      state: 'vert',
      person: personFrom(SCAN_VERT),
      stay: {
        hotel_name: 'Riad Al Warda', hotel_id: 'et-1', city: 'Sousse', governorate: 'Sousse',
        room_number: '4', check_in_date: ago(2 * D), expected_check_out_date: new Date(Date.now() + 3 * D).toISOString(),
      },
      checked_at: new Date().toISOString(),
    };
  }

  // AMBRE — aucun enregistrement trouvé (par défaut).
  return {
    state: 'ambre',
    person: personFrom(input.document_number ? input : SCAN_AMBRE),
    checked_at: new Date().toISOString(),
  };
}

function personFrom(m: MrzData) {
  return {
    first_name: m.first_name,
    last_name: m.last_name,
    nationality_code: m.nationality_code,
    date_of_birth: m.date_of_birth,
    document_number: m.document_number,
    document_type: m.document_type,
  };
}

/** Numéro du central (configuré côté admin — lecture seule dans l'app). */
export const CENTRAL_PHONE = '+21671333000';
