/**
 * POST /api/scan/cin — extraction OCR d'une CIN tunisienne via Claude vision.
 *
 * Fonction serverless Vercel, co-localisée avec le frontend Qayed. Conçue pour être
 * réutilisée telle quelle par l'app mobile (POST multipart, même contrat).
 *
 * Entrée (multipart/form-data) :
 *   - `image`      : fichier JPEG/PNG/WebP (déjà compressé côté client)
 *   - `propertyId` : identifiant de l'établissement (rate limit + scope lookup)
 *   - Header `Authorization: Bearer <token>` (auth standard Qayed)
 *
 * Sortie (application/json) : cf. `CinScanResult` + `existingClient` + `latencyMs`.
 *
 * Conformité INPDP / loi 2004-63 : l'image n'est JAMAIS persistée (mémoire seule,
 * jamais sur disque, jamais loggée). Les logs ne contiennent que : timestamp,
 * propertyId, succès/échec, latence, niveaux de confiance.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import Busboy from 'busboy';
import Anthropic from '@anthropic-ai/sdk';
import { CIN_SYSTEM_PROMPT, CIN_USER_PROMPT, parseCinResponse, CinParseError } from '../_lib/cinExtraction.js';

// @vercel/node ne bufferise pas les corps multipart → on lit le flux nous-mêmes.
export const config = { api: { bodyParser: false } };

const MODEL = process.env.CIN_SCAN_MODEL || 'claude-sonnet-5';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 Mo
const RATE_PER_MIN = Number(process.env.CIN_SCAN_RATE_PER_MIN || 30);
const HARD_TIMEOUT_MS = 15_000;

const ALLOWED_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Rate limit best-effort en mémoire (par instance serverless). Pour une garantie
// multi-instance, brancher un store durable (ex. Upstash Redis) — voir EXPLORATION-CIN.md.
const rateBuckets = new Map<string, number[]>();

function rateLimited(propertyId: string): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const hits = (rateBuckets.get(propertyId) ?? []).filter((t) => t > windowStart);
  if (hits.length >= RATE_PER_MIN) {
    rateBuckets.set(propertyId, hits);
    return true;
  }
  hits.push(now);
  rateBuckets.set(propertyId, hits);
  return false;
}

interface ParsedForm {
  image: Buffer | null;
  mediaType: string | null;
  propertyId: string | null;
  tooLarge: boolean;
}

function parseMultipart(req: IncomingMessage): Promise<ParsedForm> {
  return new Promise((resolve, reject) => {
    let bb: Busboy.Busboy;
    try {
      bb = Busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_IMAGE_BYTES } });
    } catch (e) {
      reject(e);
      return;
    }
    const result: ParsedForm = { image: null, mediaType: null, propertyId: null, tooLarge: false };
    const chunks: Buffer[] = [];

    bb.on('file', (_name, stream, info) => {
      result.mediaType = info.mimeType;
      stream.on('data', (d: Buffer) => chunks.push(d));
      stream.on('limit', () => {
        result.tooLarge = true;
      });
      stream.on('end', () => {
        if (!result.tooLarge) result.image = Buffer.concat(chunks);
      });
    });
    bb.on('field', (name, val) => {
      if (name === 'propertyId') result.propertyId = val;
    });
    bb.on('close', () => resolve(result));
    bb.on('error', reject);
    req.pipe(bb);
  });
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function log(event: Record<string, unknown>): void {
  // JAMAIS l'image ni les données personnelles — uniquement métadonnées d'exploitation.
  console.log(JSON.stringify({ scope: 'scan_cin', ...event }));
}

async function extractWithClaude(client: Anthropic, image: Buffer, mediaType: string) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: 'disabled' }, // OCR structuré : pas de raisonnement, latence minimale
    system: CIN_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
              data: image.toString('base64'),
            },
          },
          { type: 'text', text: CIN_USER_PROMPT },
        ],
      },
    ],
  });
  const textBlock = message.content.find((b) => b.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text : '';
}

/**
 * Lookup « client déjà enregistré » — best-effort, activé uniquement si
 * `QAYED_GUEST_LOOKUP_PATH` est défini côté serveur (cf. EXPLORATION-CIN.md §4).
 * Échec silencieux → `null` (jamais bloquant, jamais loggé en détail).
 */
async function lookupExistingClient(
  cinNumber: string,
  authorization: string,
  propertyId: string,
): Promise<unknown | null> {
  const pathTpl = process.env.QAYED_GUEST_LOOKUP_PATH;
  if (!pathTpl) return null;
  const base = (process.env.QAYED_API_URL || 'https://checktunisia-backend-production.up.railway.app/api/v1').replace(/\/$/, '');
  const path = pathTpl.replace('{cin}', encodeURIComponent(cinNumber)).replace('{propertyId}', encodeURIComponent(propertyId));
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3_000);
    const r = await fetch(url, {
      headers: { Authorization: authorization, 'X-Property-Id': propertyId, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const body = await r.json().catch(() => null);
    // On accepte { data: {...} } ou l'objet direct ; null si vide.
    const data = (body && (body.data ?? body)) || null;
    if (!data || (Array.isArray(data) && data.length === 0)) return null;
    return Array.isArray(data) ? data[0] : data;
  } catch {
    return null;
  }
}

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse): Promise<void> {
  const started = Date.now();

  // CORS (utile pour un futur client mobile web ; le mobile natif n'en a pas besoin).
  const origin = (req.headers.origin as string) || '';
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Property-Id');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    json(res, 405, { error: 'method_not_allowed' });
    return;
  }

  const authorization = (req.headers.authorization as string) || '';
  if (!/^Bearer\s+.+/i.test(authorization)) {
    json(res, 401, { error: 'unauthorized' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log({ ok: false, reason: 'missing_api_key' });
    json(res, 500, { error: 'server_misconfigured' });
    return;
  }

  let form: ParsedForm;
  try {
    form = await parseMultipart(req);
  } catch {
    json(res, 400, { error: 'invalid_multipart' });
    return;
  }

  if (form.tooLarge) {
    json(res, 413, { error: 'image_too_large' });
    return;
  }
  const propertyId = form.propertyId?.trim();
  if (!propertyId) {
    json(res, 400, { error: 'missing_property_id' });
    return;
  }
  if (!form.image || form.image.length === 0) {
    json(res, 400, { error: 'missing_image' });
    return;
  }
  const mediaType = (form.mediaType || '').toLowerCase();
  if (!ALLOWED_MEDIA.has(mediaType)) {
    json(res, 415, { error: 'unsupported_media_type' });
    return;
  }
  if (rateLimited(propertyId)) {
    log({ ok: false, propertyId, reason: 'rate_limited' });
    json(res, 429, { error: 'rate_limited' });
    return;
  }

  const client = new Anthropic({ apiKey, timeout: HARD_TIMEOUT_MS, maxRetries: 0 });

  // Extraction + 1 retry sur parse_error (cf. P1 robustesse).
  let result: ReturnType<typeof parseCinResponse> | null = null;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2 && !result; attempt++) {
    try {
      const raw = await extractWithClaude(client, form.image, mediaType);
      result = parseCinResponse(raw);
    } catch (e) {
      lastErr = e;
      if (!(e instanceof CinParseError)) break; // erreur réseau/timeout → on sort
    }
  }

  // On efface la référence à l'image dès que possible (purge mémoire).
  form.image = null;

  if (!result) {
    const isTimeout =
      lastErr instanceof Anthropic.APIConnectionTimeoutError || Date.now() - started >= HARD_TIMEOUT_MS;
    if (isTimeout) {
      log({ ok: false, propertyId, reason: 'timeout', latencyMs: Date.now() - started });
      json(res, 504, { error: 'timeout' });
      return;
    }
    if (lastErr instanceof CinParseError) {
      log({ ok: false, propertyId, reason: 'parse_error', latencyMs: Date.now() - started });
      json(res, 422, { error: 'parse_error' });
      return;
    }
    log({ ok: false, propertyId, reason: 'extraction_failed', latencyMs: Date.now() - started });
    json(res, 502, { error: 'extraction_failed' });
    return;
  }

  // Lookup client existant (best-effort) uniquement si CIN valide.
  const existingClient = result.cinNumber
    ? await lookupExistingClient(result.cinNumber, authorization, propertyId)
    : null;

  const latencyMs = Date.now() - started;
  log({
    ok: true,
    propertyId,
    side: result.side,
    cardFormat: result.cardFormat,
    hasCin: !!result.cinNumber,
    existingClient: !!existingClient,
    confidence: result.confidence,
    latencyMs,
  });

  json(res, 200, { ...result, existingClient, latencyMs });
}
