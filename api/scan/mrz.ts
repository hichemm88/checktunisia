/**
 * POST /api/scan/mrz — lecture de la MRZ d'un passeport via Claude vision.
 *
 * Repli serveur quand l'OCR local (tesseract) échoue (reflets/hologramme).
 * Même contrat multipart que /api/scan/cin, image jamais persistée ni loggée.
 *
 * Entrée (multipart/form-data) : `image` (JPEG/PNG/WebP) + `propertyId`.
 * Header `Authorization: Bearer <token>`.
 * Sortie (application/json) : champs voyageur (cf. MrzScanResult) + `latencyMs`.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import Busboy from 'busboy';
import Anthropic from '@anthropic-ai/sdk';
import { MRZ_SYSTEM_PROMPT, MRZ_USER_PROMPT, parseMrzResponse, MrzParseError } from '../_lib/mrzExtraction.js';
import { trackAiUsage } from '../_lib/aiUsageTracking.js';

export const config = { api: { bodyParser: false } };

const MODEL = process.env.CIN_SCAN_MODEL || 'claude-sonnet-5';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const RATE_PER_MIN = Number(process.env.CIN_SCAN_RATE_PER_MIN || 30);
const HARD_TIMEOUT_MS = 15_000;
const ALLOWED_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
      stream.on('limit', () => { result.tooLarge = true; });
      stream.on('end', () => { if (!result.tooLarge) result.image = Buffer.concat(chunks); });
    });
    bb.on('field', (name, val) => { if (name === 'propertyId') result.propertyId = val; });
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
  console.log(JSON.stringify({ scope: 'scan_mrz', ...event }));
}

async function extractWithClaude(client: Anthropic, image: Buffer, mediaType: string) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: 'disabled' },
    system: MRZ_SYSTEM_PROMPT,
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
          { type: 'text', text: MRZ_USER_PROMPT },
        ],
      },
    ],
  });
  const textBlock = message.content.find((b) => b.type === 'text');
  return {
    text: textBlock && textBlock.type === 'text' ? textBlock.text : '',
    model: message.model,
    inputTokens: message.usage?.input_tokens ?? 0,
    outputTokens: message.usage?.output_tokens ?? 0,
  };
}

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse): Promise<void> {
  const started = Date.now();

  const origin = (req.headers.origin as string) || '';
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Property-Id');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') { json(res, 405, { error: 'method_not_allowed' }); return; }

  const authorization = (req.headers.authorization as string) || '';
  if (!/^Bearer\s+.+/i.test(authorization)) { json(res, 401, { error: 'unauthorized' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { log({ ok: false, reason: 'missing_api_key' }); json(res, 500, { error: 'server_misconfigured' }); return; }

  let form: ParsedForm;
  try {
    form = await parseMultipart(req);
  } catch {
    json(res, 400, { error: 'invalid_multipart' });
    return;
  }

  if (form.tooLarge) { json(res, 413, { error: 'image_too_large' }); return; }
  const propertyId = form.propertyId?.trim();
  if (!propertyId) { json(res, 400, { error: 'missing_property_id' }); return; }
  if (!form.image || form.image.length === 0) { json(res, 400, { error: 'missing_image' }); return; }
  const mediaType = (form.mediaType || '').toLowerCase();
  if (!ALLOWED_MEDIA.has(mediaType)) { json(res, 415, { error: 'unsupported_media_type' }); return; }
  if (rateLimited(propertyId)) { log({ ok: false, propertyId, reason: 'rate_limited' }); json(res, 429, { error: 'rate_limited' }); return; }

  const client = new Anthropic({ apiKey, timeout: HARD_TIMEOUT_MS, maxRetries: 0 });

  // Tracking : chronométrage du/des appel(s) Anthropic + cumul des tokens facturés.
  let result: ReturnType<typeof parseMrzResponse> | null = null;
  let lastErr: unknown = null;
  let usageModel = MODEL;
  let inputTokens = 0;
  let outputTokens = 0;
  const aiStarted = Date.now();
  for (let attempt = 0; attempt < 2 && !result; attempt++) {
    try {
      const raw = await extractWithClaude(client, form.image, mediaType);
      usageModel = raw.model || usageModel;
      inputTokens += raw.inputTokens;
      outputTokens += raw.outputTokens;
      result = parseMrzResponse(raw.text);
    } catch (e) {
      lastErr = e;
      if (!(e instanceof MrzParseError)) break;
    }
  }
  const aiLatencyMs = Date.now() - aiStarted;

  form.image = null; // purge mémoire

  // Tracking coût IA — repli passeport (feature passport_scan). Isolé, jamais bloquant.
  const trackStatus = result ? 'success' : lastErr instanceof MrzParseError ? 'parse_error' : 'api_error';
  await trackAiUsage({
    feature: 'passport_scan',
    establishmentId: propertyId,
    actorToken: authorization.replace(/^Bearer\s+/i, ''),
    model: usageModel,
    status: trackStatus,
    inputTokens: trackStatus === 'api_error' ? 0 : inputTokens,
    outputTokens: trackStatus === 'api_error' ? 0 : outputTokens,
    latencyMs: aiLatencyMs,
  });

  if (!result) {
    const isTimeout =
      lastErr instanceof Anthropic.APIConnectionTimeoutError || Date.now() - started >= HARD_TIMEOUT_MS;
    if (isTimeout) {
      log({ ok: false, propertyId, reason: 'timeout', latencyMs: Date.now() - started });
      json(res, 504, { error: 'timeout' });
      return;
    }
    if (lastErr instanceof MrzParseError) {
      log({ ok: false, propertyId, reason: 'parse_error', latencyMs: Date.now() - started });
      json(res, 422, { error: 'parse_error' });
      return;
    }
    log({ ok: false, propertyId, reason: 'extraction_failed', latencyMs: Date.now() - started });
    json(res, 502, { error: 'extraction_failed' });
    return;
  }

  const latencyMs = Date.now() - started;
  log({ ok: true, propertyId, hasNumber: !!result.document_number, latencyMs });
  json(res, 200, { ...result, latencyMs });
}
