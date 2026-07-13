/**
 * Couche service — l'UI n'appelle QUE ces fonctions, jamais le seed directement.
 * En production, remplacer les branches `DEMO_MODE` par les appels `api.get/post`
 * réels (endpoints watchlist / voyageurs / établissements / audit).
 *
 * Règle non négociable (F1 / §9.2) : aucune donnée watchlist en cache local.
 * Chaque vérification est un appel réseau temps réel. Hors connexion → erreur,
 * jamais un résultat basé sur des données périmées.
 */
import { api, DEMO_MODE, OfflineError } from './client';
import {
  Establishment, PresentTraveler, ZoneStats, ActiveAlert,
  VerificationResult, MrzData, RecentCheck,
} from './types';
import {
  ESTABLISHMENTS, PRESENT_TRAVELERS, ACTIVE_ALERTS, resolveVerification,
  ZONE_CENTER,
} from './seed';
import { GeoPoint, haversineKm } from '../lib/geo';
import { getAuditEntries } from './auditStore';

// Simulateur de connectivité pour la démo (bouton caché / scénario réseau).
let simulatedOffline = false;
export function setSimulatedOffline(v: boolean) {
  simulatedOffline = v;
}
function assertOnline() {
  if (simulatedOffline) throw new OfflineError();
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── F2 Vérification ──────────────────────────────────────────────────────────
export async function verifyIdentity(mrz: MrzData): Promise<VerificationResult> {
  assertOnline();
  if (DEMO_MODE) {
    await delay(900); // < 2 s (F2) — lecture réseau simulée
    return resolveVerification(mrz);
  }
  const { data } = await api.post<{ data: VerificationResult }>('/authority/verify', { mrz });
  return data.data;
}

/** Saisie manuelle (fallback document illisible) — même écran de résultat. */
export async function verifyByDocument(documentNumber: string): Promise<VerificationResult> {
  const mrz: MrzData = {
    first_name: null, last_name: null, date_of_birth: null, sex: null,
    nationality_code: null, document_number: documentNumber.trim().toUpperCase(),
    issuing_country_code: null, expiry_date: null, document_type: 'unknown',
  };
  return verifyIdentity(mrz);
}

// ── F3 Accueil ───────────────────────────────────────────────────────────────
export async function getZoneStats(): Promise<ZoneStats> {
  if (DEMO_MODE) {
    await delay(300);
    const present = Object.values(PRESENT_TRAVELERS).reduce((n, a) => n + a.length, 0);
    return {
      present: ESTABLISHMENTS.reduce((n, e) => n + e.present_count, 0),
      arrivals_today: present, // approximation démo
      active_hotels: ESTABLISHMENTS.filter((e) => e.last_sheet_at !== null).length,
    };
  }
  const { data } = await api.get<{ data: ZoneStats }>('/authority/mobile/zone-stats');
  return data.data;
}

export async function getActiveAlerts(): Promise<ActiveAlert[]> {
  assertOnline();
  if (DEMO_MODE) {
    await delay(300);
    return ACTIVE_ALERTS;
  }
  const { data } = await api.get<{ data: ActiveAlert[] }>('/authority/mobile/alerts');
  return data.data;
}

export async function getAlert(id: string): Promise<ActiveAlert | null> {
  const alerts = await getActiveAlerts();
  return alerts.find((a) => a.id === id) ?? null;
}

// ── F4 Établissements ────────────────────────────────────────────────────────
export interface EstablishmentListItem extends Establishment {
  distance_km?: number;
}

export async function getEstablishments(
  search: string,
  origin: GeoPoint | null,
): Promise<EstablishmentListItem[]> {
  if (DEMO_MODE) {
    await delay(250);
    const q = search.trim().toLowerCase();
    let list: EstablishmentListItem[] = ESTABLISHMENTS.filter((e) => {
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        (e.district ?? '').toLowerCase().includes(q)
      );
    }).map((e) => ({ ...e }));

    // Tri par proximité si géoloc active, sinon alphabétique (F4).
    const ref = origin ?? ZONE_CENTER;
    if (origin) {
      list.forEach((e) => { e.distance_km = haversineKm(ref, { lat: e.lat, lng: e.lng }); });
      list.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }
  const { data } = await api.get<{ data: EstablishmentListItem[] }>('/authority/hotels', {
    params: { search },
  });
  return data.data;
}

export async function getEstablishment(id: string): Promise<Establishment | null> {
  if (DEMO_MODE) {
    await delay(150);
    return ESTABLISHMENTS.find((e) => e.id === id) ?? null;
  }
  const { data } = await api.get<{ data: Establishment }>(`/authority/hotels/${id}`);
  return data.data;
}

export async function getPresentTravelers(establishmentId: string): Promise<PresentTraveler[]> {
  if (DEMO_MODE) {
    await delay(200);
    return PRESENT_TRAVELERS[establishmentId] ?? [];
  }
  const { data } = await api.get<{ data: PresentTraveler[] }>(
    `/authority/hotels/${establishmentId}/present`,
  );
  return data.data;
}

// ── Dernières vérifications de l'agent (F3) — dérivées du journal local ───────
export function recentChecksFromAudit(): RecentCheck[] {
  return getAuditEntries()
    .filter((e) => e.action === 'verify' && e.result)
    .slice(0, 5)
    .map((e) => ({ id: e.id, name: e.subject ?? '—', result: e.result!, at: e.created_at }));
}
