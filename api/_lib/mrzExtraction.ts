/**
 * Extraction de la MRZ d'un passeport (TD-3) via Claude vision — repli quand
 * l'OCR local (tesseract) échoue (reflets, hologramme sur le texte).
 *
 * Renvoie exactement les champs attendus par le formulaire voyageur, de façon
 * à être interchangeable avec le résultat de l'OCR local (`MrzData`).
 */

import { z } from 'zod';
import { verifyTd3Line2 } from './mrzCheckDigits.js';

export const MRZ_SYSTEM_PROMPT = `Tu es un moteur d'extraction de la zone lisible par machine (MRZ) d'un passeport, format TD-3 (2 lignes de 44 caractères en bas de la page d'identité). Tu reçois une photo de la page d'identité. Tu réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte autour.

Priorité : lis d'abord les 2 lignes de la MRZ. Sers-toi de la zone visuelle uniquement pour lever une ambiguïté (ex. caractère masqué par un reflet).

Schéma :
{
  "document_type": "passport",
  "document_number": string | null,      // n° de document, sans les < de remplissage
  "last_name": string | null,            // nom de famille (partie avant le << dans la 1re ligne)
  "first_name": string | null,           // TOUS les prénoms (given names) dans l'ordre, séparés par des espaces (ex. "AMMAR ABDULLA MOHAMMED")
  "date_of_birth": "YYYY-MM-DD" | null,  // depuis YYMMDD : année 00..(année courante à 2 chiffres) = 20xx, sinon 19xx
  "expiry_date": "YYYY-MM-DD" | null,    // depuis YYMMDD : toujours 20xx
  "sex": "M" | "F" | "X" | null,
  "nationality_code": string | null,     // code pays 3 lettres (ex. FRA)
  "issuing_country_code": string | null, // code pays émetteur 3 lettres (ex. FRA)
  "mrz_line1": string | null,            // 1re ligne MRZ, BRUTE, < compris, telle que lue
  "mrz_line2": string | null             // 2e ligne MRZ, BRUTE, < compris, telle que lue
}

Règles :
- Remplace les < par des espaces dans les noms ; ignore les < de remplissage en fin.
- first_name : inclure la TOTALITÉ des prénoms (given names), jamais seulement le premier. Si la MRZ tronque un nom long (limite de 44 caractères par ligne), complète avec la zone visuelle « Given names / Prénoms ».
- mrz_line1 / mrz_line2 : recopie EXACTE des deux lignes, sans corriger, sans compléter, sans remplacer les < . Elles servent à vérifier les chiffres de contrôle : les « arranger » détruirait précisément ce qui permet de détecter une erreur de lecture. Si une ligne est illisible, null.
- Un champ illisible : null, jamais d'invention.
- Si l'image n'est pas un passeport avec MRZ : tous les champs null.`;

export const MRZ_USER_PROMPT =
  'Extrais les champs de la MRZ de ce passeport. Réponds uniquement avec l\'objet JSON.';

const nullableStr = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s.length ? s : null;
  });

export const mrzSchema = z.object({
  document_type: z.literal('passport').catch('passport'),
  document_number: nullableStr,
  last_name: nullableStr,
  first_name: nullableStr,
  date_of_birth: nullableStr,
  expiry_date: nullableStr,
  sex: z
    .union([z.enum(['M', 'F', 'X']), z.null()])
    .optional()
    .transform((v) => v ?? null),
  nationality_code: nullableStr,
  issuing_country_code: nullableStr,
  mrz_line1: nullableStr,
  mrz_line2: nullableStr,
});

export class MrzParseError extends Error {
  code = 'parse_error' as const;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

// Valide une date ISO `YYYY-MM-DD` avec une année plausible pour un passeport.
function validIso(v: string | null): string | null {
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  /*
   * Le contrôle ci-dessus laisse passer le 31 février : « jour <= 31 » n'est
   * pas « jour existant ». Une date impossible n'est pas rejetée plus loin —
   * PHP la ROULE (2001-02-31 devient 2001-03-03), donc elle atterrit en base
   * transformée, sans que personne ne voie l'écart. On la refuse ici, au seul
   * endroit qui peut encore la distinguer d'une vraie date.
   */
  const asDate = new Date(Date.UTC(y, mo - 1, d));
  if (asDate.getUTCFullYear() !== y || asDate.getUTCMonth() !== mo - 1 || asDate.getUTCDate() !== d) {
    return null;
  }

  return v;
}

/**
 * Une date de naissance dans le FUTUR est une hallucination, pas une lecture.
 *
 * Le backend refuse déjà `date_of_birth` future à la création d'un voyageur ;
 * la refuser ici évite de pré-remplir un formulaire avec une valeur qui sera
 * rejetée à l'enregistrement, sans que l'agent comprenne pourquoi.
 */
function validBirthDate(v: string | null): string | null {
  const iso = validIso(v);
  if (!iso) return null;
  return iso <= new Date().toISOString().slice(0, 10) ? iso : null;
}

const up3 = (v: string | null): string | null => (v ? v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || null : null);

export function parseMrzResponse(rawText: string) {
  const jsonText = stripCodeFences(rawText);
  let obj: unknown;
  try {
    obj = JSON.parse(jsonText);
  } catch {
    const brace = jsonText.match(/\{[\s\S]*\}/);
    if (!brace) throw new MrzParseError('Réponse du modèle non JSON');
    try {
      obj = JSON.parse(brace[0]);
    } catch {
      throw new MrzParseError('Réponse du modèle non JSON');
    }
  }

  const parsed = mrzSchema.safeParse(obj);
  if (!parsed.success) throw new MrzParseError('Réponse du modèle invalide');
  const d = parsed.data;

  const result = {
    document_type: 'passport' as const,
    document_number: d.document_number ? d.document_number.replace(/</g, '').trim() || null : null,
    last_name: d.last_name,
    first_name: d.first_name,
    date_of_birth: validBirthDate(d.date_of_birth),
    expiry_date: validIso(d.expiry_date),
    sex: d.sex,
    nationality_code: up3(d.nationality_code),
    issuing_country_code: up3(d.issuing_country_code),
    /*
     * Intégrité de la lecture, et non « le modèle a-t-il répondu ».
     *
     * Sans cela, le repli vision — emprunté précisément quand la lecture est
     * difficile, donc quand une confusion 0/O, 1/I, 5/S ou 8/B est la plus
     * probable — livrait un numéro de passeport faux mais plausible sans que
     * rien ne le signale. Ce numéro part ensuite sur une fiche de police.
     *
     * `null` = non vérifiable (lignes absentes ou trop courtes). L'écran doit
     * traiter `null` et `false` de la même façon : demander une relecture
     * humaine. Seul `true` autorise à faire confiance.
     */
    mrz_verified: (() => {
      const check = verifyTd3Line2(d.mrz_line2);
      return check.checked ? check.valid : null;
    })(),
  };

  // Rien d'exploitable → considéré comme échec (l'image n'est pas une MRZ lisible).
  if (!result.document_number && !result.last_name && !result.date_of_birth) {
    throw new MrzParseError('Aucune donnée MRZ exploitable');
  }
  return result;
}

export type MrzScanResult = ReturnType<typeof parseMrzResponse>;
