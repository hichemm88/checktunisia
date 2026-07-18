/**
 * Tracking local des appels a l'API Anthropic (Claude vision).
 *
 * Wrapper unique `trackAiUsage(...)` utilise par les DEUX flux vision :
 *   - scan CIN                 -> feature `cin_scan`
 *   - repli passeport (MRZ)    -> feature `passport_scan`
 *
 * Le parametre `feature` est TOUJOURS passe explicitement par l'appelant,
 * jamais deduit ici.
 *
 * Regles non negociables respectees :
 *   #2  Le tracking ne bloque ni ne fait echouer un scan. Toute exception est
 *       loggee cote serveur uniquement puis avalee (jamais propagee).
 *   #3  Aucune donnee personnelle du voyageur : le payload est une liste blanche
 *       stricte de metadonnees techniques/comptables (voir `AiUsageEvent`).
 *   #4  Aucun tarif hardcode ici. Le cout (`cost_usd`) est calcule cote backend
 *       Laravel au moment de l'insert, avec le tarif actif du modele. Cette
 *       fonction n'envoie que les tokens et le modele.
 *   #5  Logique cote backend : declenchee dans la fonction serverless qui appelle
 *       Anthropic, identique pour le web et le mobile.
 *
 * Transport : POST metadata-only vers un endpoint interne Laravel, authentifie
 * par un secret de service (`INTERNAL_AI_TRACKING_SECRET`). Le token porteur de
 * l'appelant est transmis dans `X-Actor-Token` pour que le backend resolve
 * lui-meme `user_id` (l'operateur hotelier, jamais le voyageur). Si l'URL ou le
 * secret ne sont pas configures, le tracking est un no-op silencieux (zero
 * latence) : identique au pattern best-effort du lookup client existant.
 */

export type AiFeature = 'cin_scan' | 'passport_scan';
export type AiUsageStatus = 'success' | 'api_error' | 'parse_error';

/** Payload envoye au backend. Liste blanche stricte : AUCUNE donnee voyageur. */
export interface AiUsageEvent {
  feature: AiFeature;
  establishment_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  status: AiUsageStatus;
  latency_ms: number;
  occurred_at: string;
}

export interface TrackAiUsageParams {
  /** Explicite, jamais deduit. */
  feature: AiFeature;
  /** Etablissement a l'origine du scan (propertyId / X-Property-Id). */
  establishmentId: string;
  /** Modele reellement utilise (issu de la reponse API si dispo). */
  model: string;
  status: AiUsageStatus;
  /** `usage.input_tokens` de la reponse (0 pour un api_error). */
  inputTokens?: number;
  /** `usage.output_tokens` de la reponse (0 pour un api_error). */
  outputTokens?: number;
  /** Duree de l'appel Anthropic en ms. */
  latencyMs: number;
  /** Token porteur brut de l'appelant (sans "Bearer "), pour resolution user_id backend. */
  actorToken?: string | null;
  /** Injections pour les tests (facultatives). */
  occurredAt?: string;
  fetchImpl?: typeof fetch;
}

const TRACK_TIMEOUT_MS = 2000;

/** Force un entier >= 0 (jamais NaN, jamais negatif). */
function toCount(n: number | undefined): number {
  return Number.isFinite(n) && (n as number) > 0 ? Math.round(n as number) : 0;
}

/**
 * Construit l'evenement a partir des parametres. Fonction pure : ne contient
 * QUE les champs de la liste blanche, ce qui garantit l'absence de PII meme si
 * l'appelant passe des champs supplementaires par erreur.
 */
export function buildUsageEvent(p: TrackAiUsageParams): AiUsageEvent {
  return {
    feature: p.feature,
    establishment_id: p.establishmentId,
    model: p.model,
    input_tokens: toCount(p.inputTokens),
    output_tokens: toCount(p.outputTokens),
    status: p.status,
    latency_ms: toCount(p.latencyMs),
    occurred_at: p.occurredAt ?? new Date().toISOString(),
  };
}

/**
 * Envoi HTTP de l'evenement. No-op si l'endpoint interne n'est pas configure.
 * Peut lever (timeout, reseau) : c'est `trackAiUsage` qui avale l'exception.
 */
export async function postUsageEvent(
  event: AiUsageEvent,
  opts?: { actorToken?: string | null; fetchImpl?: typeof fetch },
): Promise<void> {
  const url = process.env.INTERNAL_AI_TRACKING_URL;
  const secret = process.env.INTERNAL_AI_TRACKING_SECRET;
  if (!url || !secret) return; // non configure -> no-op, zero latence

  const fetchImpl = opts?.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TRACK_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${secret}`,
    };
    if (opts?.actorToken) headers['X-Actor-Token'] = opts.actorToken;
    await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Wrapper unique. NE LEVE JAMAIS : toute erreur (build, reseau, timeout, insert
 * backend) est loggee cote serveur puis avalee, pour ne jamais casser le scan.
 */
export async function trackAiUsage(params: TrackAiUsageParams): Promise<void> {
  try {
    const event = buildUsageEvent(params);
    await postUsageEvent(event, { actorToken: params.actorToken, fetchImpl: params.fetchImpl });
  } catch (err) {
    // Log serveur uniquement, sans PII. Jamais propage au flux de scan (regle #2).
    console.error(
      JSON.stringify({
        scope: 'ai_usage_tracking',
        ok: false,
        feature: params.feature,
        status: params.status,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}
