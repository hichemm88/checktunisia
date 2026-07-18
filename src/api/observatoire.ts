import { api } from '@/lib/api';

/**
 * Client API de l'Observatoire du Tourisme.
 * Prefixe /observatoire/v1 (le baseURL de `api` fournit deja /api/v1 -> on
 * bascule sur le prefixe observatoire via un chemin absolu relatif au host).
 *
 * Tous les endpoints sont en LECTURE SEULE et renvoient des agregats deja
 * soumis au seuil k=10 cote serveur : une valeur peut valoir la chaine
 * « <seuil » (jamais un nombre sous 10).
 */

const BASE = '/observatoire/v1';

// ── Types partages ────────────────────────────────────────────────────────────
/** Une mesure agregee : soit un nombre publie, soit le marqueur de seuil. */
export type Mesure = number | '<seuil';

export const estSousSeuil = (v: Mesure | null | undefined): boolean =>
  v === null || v === undefined || v === '<seuil';

export interface Filtres {
  debut?: string;
  fin?: string;
  zone?: number | string;
  nationalite?: string;
}

export interface Kpis {
  arrivees: Mesure;
  nuitees: Mesure;
  duree_moyenne_sejour: Mesure;
  nationalites_actives: number;
}

export interface KpisReponse {
  periode: { debut: string; fin: string };
  kpis: Kpis;
  precedent: Kpis;
  seuil_k: number;
}

export interface SeriePoint {
  periode: string;
  arrivees: Mesure;
  nuitees: Mesure;
}

export interface NationaliteLigne {
  nationalite_iso: string;
  arrivees: Mesure;
  nuitees: Mesure;
  duree_moyenne: Mesure;
  variation_pct: number | null;
}

export interface TypeLigne {
  type: string;
  arrivees: number;
}

export interface ZoneComparaison {
  zone_id: number;
  nom_fr: string;
  nom_ar: string;
  arrivees: number;
  nuitees: Mesure;
}

export interface SaisonnaliteZone {
  zone_id: number;
  nom_fr: string;
  nom_ar: string;
  mois: Record<number, Mesure>;
}

export interface Couverture {
  date_jour: string | null;
  nb_etablissements_actifs: number;
  nb_etablissements_total: number;
  nb_zones_couvertes: number;
  taux_couverture_pct: number;
}

export interface Zone {
  id: number;
  nom_fr: string;
  nom_ar: string;
  gouvernorat: string;
  delegation: string;
}

export interface IaReponse {
  query_id: string;
  ok: boolean;
  motif?: 'nominatif' | 'hors_perimetre' | 'sous_seuil' | 'sql_invalide';
  reponse: string;
  sql: string | null;
  explication?: string | null;
  visualisation?: 'ligne' | 'barres' | 'kpi' | 'tableau';
  donnees?: Array<Record<string, unknown>>;
  sous_seuil?: boolean;
}

export interface Rapport {
  mois: string;
  html_ar: string;
  html_fr: string;
  pack: Record<string, unknown>;
  genere_le?: string;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────
export const observatoireApi = {
  kpis: (f: Filtres) =>
    api.get<{ data: KpisReponse }>(`${BASE}/kpis`, { params: f }).then((r) => r.data.data),

  series: (f: Filtres & { granularite?: 'jour' | 'semaine' | 'mois' }) =>
    api.get<{ data: { granularite: string; points: SeriePoint[] } }>(
      `${BASE}/series/arrivees`, { params: f },
    ).then((r) => r.data.data),

  topNationalites: (f: Filtres & { limit?: number }) =>
    api.get<{ data: NationaliteLigne[] }>(`${BASE}/nationalites/top`, { params: f }).then((r) => r.data.data),

  types: (f: Filtres) =>
    api.get<{ data: TypeLigne[] }>(`${BASE}/types`, { params: f }).then((r) => r.data.data),

  comparaisonZones: (f: Filtres) =>
    api.get<{ data: ZoneComparaison[] }>(`${BASE}/zones/comparaison`, { params: f }).then((r) => r.data.data),

  saisonnalite: (annee: number) =>
    api.get<{ data: { annee: number; zones: SaisonnaliteZone[] } }>(
      `${BASE}/saisonnalite`, { params: { annee } },
    ).then((r) => r.data.data),

  couverture: () =>
    api.get<{ data: Couverture }>(`${BASE}/couverture`).then((r) => r.data.data),

  zones: () =>
    api.get<{ data: Zone[] }>(`${BASE}/zones`).then((r) => r.data.data),

  question: (question: string) =>
    api.post<{ data: IaReponse }>(`${BASE}/ia/question`, { question }).then((r) => r.data.data),

  rapport: (mois: string) =>
    api.get<{ data: Rapport | null }>(`${BASE}/rapports`, { params: { mois } }).then((r) => r.data.data),

  genererRapport: (mois: string) =>
    api.post<{ data: Rapport }>(`${BASE}/rapports/generer`, { mois }).then((r) => r.data.data),

  exportCsvUrl: (f: Filtres) => {
    const qs = new URLSearchParams(
      Object.entries(f).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
    ).toString();
    return `${BASE}/export/csv?${qs}`;
  },
};
