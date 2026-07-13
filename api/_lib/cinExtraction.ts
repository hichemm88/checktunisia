/**
 * Extraction OCR de la CIN tunisienne via Claude vision : prompt système, schéma
 * de validation (zod) et normalisation de la réponse du modèle vers le contrat
 * `/api/scan/cin`.
 */

import { z } from 'zod';
import { parseTunisianBirthDate } from './tunisianMonths';

// ─── Prompt système (à intégrer tel quel — cf. §4 du document d'implémentation) ──

export const CIN_SYSTEM_PROMPT = `Tu es un moteur d'extraction OCR spécialisé dans la carte d'identité nationale tunisienne (بطاقة التعريف الوطنية). Tu reçois une photo de carte. Tu réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte autour.

Schéma :
{
  "side": "front" | "back" | "unknown",
  "cardFormat": "legacy" | "biometric",
  "cinNumber": string | null,          // 8 chiffres exactement
  "lastNameAr": string | null,         // اللقب
  "firstNameAr": string | null,        // premier prénom uniquement, sans la filiation
  "filiationAr": string | null,        // ex: "بنت يوسف بن عمار"
  "spouseAr": string | null,           // texte après حرم, sinon null
  "lastNameLatin": string | null,      // translittération usuelle tunisienne
  "firstNameLatin": string | null,
  "birthDate": "YYYY-MM-DD" | null,    // mois tunisiens: جانفي=01, فيفري=02, مارس=03, أفريل=04, ماي=05, جوان=06, جويلية=07, أوت=08, سبتمبر=09, أكتوبر=10, نوفمبر=11, ديسمبر=12
  "birthPlaceAr": string | null,
  "birthPlaceLatin": string | null,
  "confidence": {
    "cinNumber": "high"|"medium"|"low",
    "names": "high"|"medium"|"low",
    "birthDate": "high"|"medium"|"low"
  }
}

Règles :
- Si un champ est illisible : null, jamais d'invention.
- Translittération : conventions tunisiennes usuelles (ch, kh, gh, ou ; "Ben"/"Bent" pour بن/بنت).
- Si l'image n'est pas une CIN tunisienne : {"side":"unknown", tous les champs null}.`;

export const CIN_USER_PROMPT =
  "Extrais les champs de cette carte d'identité nationale tunisienne. Réponds uniquement avec l'objet JSON.";

// ─── Schéma zod ──────────────────────────────────────────────────────────────

const confidenceLevel = z.enum(['high', 'medium', 'low']).catch('low');

const nullableStr = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s.length ? s : null;
  });

export const cinExtractionSchema = z.object({
  side: z.enum(['front', 'back', 'unknown']).catch('unknown'),
  cardFormat: z.enum(['legacy', 'biometric']).catch('legacy'),
  cinNumber: nullableStr,
  lastNameAr: nullableStr,
  firstNameAr: nullableStr,
  filiationAr: nullableStr,
  spouseAr: nullableStr,
  lastNameLatin: nullableStr,
  firstNameLatin: nullableStr,
  birthDate: nullableStr,
  birthPlaceAr: nullableStr,
  birthPlaceLatin: nullableStr,
  confidence: z
    .object({
      cinNumber: confidenceLevel,
      names: confidenceLevel,
      birthDate: confidenceLevel,
    })
    .partial()
    .transform((c) => ({
      cinNumber: c.cinNumber ?? 'low',
      names: c.names ?? 'low',
      birthDate: c.birthDate ?? 'low',
    })),
});

export type CinExtraction = z.infer<typeof cinExtractionSchema>;

// ─── Parsing de la réponse texte du modèle ───────────────────────────────────

/** Retire d'éventuelles fences ```json ... ``` autour de la réponse. */
export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

export class CinParseError extends Error {
  code = 'parse_error' as const;
}

/**
 * Parse + valide la réponse du modèle et normalise vers le contrat renvoyé au
 * client. Lève `CinParseError` si le JSON est absent/invalide (→ retry côté handler).
 */
export function parseCinResponse(rawText: string) {
  const jsonText = stripCodeFences(rawText);
  let obj: unknown;
  try {
    obj = JSON.parse(jsonText);
  } catch {
    // Dernier recours : isoler le premier objet {...} du texte.
    const braceMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!braceMatch) throw new CinParseError('Réponse du modèle non JSON');
    try {
      obj = JSON.parse(braceMatch[0]);
    } catch {
      throw new CinParseError('Réponse du modèle non JSON');
    }
  }

  const parsed = cinExtractionSchema.safeParse(obj);
  if (!parsed.success) throw new CinParseError('Réponse du modèle invalide');
  const d = parsed.data;

  // Normalisations serveur.
  const cinNumber = normalizeCin(d.cinNumber);
  const birthDate = parseTunisianBirthDate(d.birthDate);

  return {
    side: d.side,
    cardFormat: d.cardFormat,
    cinNumber,
    lastNameAr: d.lastNameAr,
    firstNameAr: d.firstNameAr,
    filiationAr: d.filiationAr,
    spouseAr: d.spouseAr,
    // Translittération : interprétation → plafonnée à `medium` (cf. document).
    lastNameLatin: d.lastNameLatin,
    firstNameLatin: d.firstNameLatin,
    birthDate,
    birthPlaceAr: d.birthPlaceAr,
    birthPlaceLatin: d.birthPlaceLatin,
    nationality: 'TUN' as const,
    confidence: {
      cinNumber: cinNumber ? d.confidence.cinNumber : ('low' as const),
      // La translittération latine n'est jamais mieux que `medium`.
      names: capMedium(d.confidence.names),
      birthDate: birthDate ? d.confidence.birthDate : ('low' as const),
    },
  };
}

export type CinScanResult = ReturnType<typeof parseCinResponse>;

function normalizeCin(v: string | null): string | null {
  if (!v) return null;
  const digits = v.replace(/\D/g, '');
  return digits.length === 8 ? digits : null;
}

function capMedium(level: 'high' | 'medium' | 'low'): 'medium' | 'low' {
  return level === 'low' ? 'low' : 'medium';
}
