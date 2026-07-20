/**
 * Analytics produit — fine couche au-dessus de Vercel Web Analytics.
 *
 * Vercel Web Analytics est sans cookie et n'enregistre aucune donnee
 * personnelle (adapte au contexte INPDP) ; le script et les events sont servis
 * en meme origine (aucun changement de CSP). Les appels ci-dessous ne lèvent
 * jamais : si l'analytics n'est pas actif (dev, ou case "Enable Web Analytics"
 * non cochee sur Vercel), ils sont de simples no-op.
 *
 * Attribution : on capture les UTM + le referrer au premier chargement et on les
 * conserve pour la session, afin de les joindre aux events du tunnel
 * d'inscription (source d'un signup). Aucune donnee personnelle.
 */
import { track as vercelTrack } from '@vercel/analytics';

type EventProps = Record<string, string | number | boolean>;

const ATTR_KEY = 'qayed-attribution';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/** Capture UTM + referrer au premier chargement (premier contact conserve). */
export function captureAttribution(): void {
  try {
    if (sessionStorage.getItem(ATTR_KEY)) return; // ne pas ecraser le premier contact
    const url = new URL(window.location.href);
    const attr: Record<string, string> = {};
    UTM_KEYS.forEach((k) => {
      const v = url.searchParams.get(k);
      if (v) attr[k] = v.slice(0, 120);
    });
    const ref = document.referrer;
    if (ref && !ref.includes(window.location.host)) attr.referrer = ref.slice(0, 200);
    if (Object.keys(attr).length > 0) sessionStorage.setItem(ATTR_KEY, JSON.stringify(attr));
  } catch {
    /* stockage indisponible — on ignore */
  }
}

/** Attribution stockee (UTM + referrer) pour cette session, ou objet vide. */
export function getAttribution(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(ATTR_KEY) || '{}');
  } catch {
    return {};
  }
}

/** Emet un event produit, enrichi de l'attribution. Ne leve jamais. */
export function track(event: string, props?: EventProps): void {
  try {
    vercelTrack(event, { ...getAttribution(), ...(props ?? {}) });
  } catch {
    /* analytics inactif — no-op */
  }
}
