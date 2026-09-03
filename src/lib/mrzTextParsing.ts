/**
 * MRZ text parsing — pure functions, no DOM / no tesseract / no OpenCV.
 *
 * Split out of `mrzScanner.ts` so this logic (the part that actually decides
 * whether a scan is trustworthy enough to skip the paid Claude vision
 * fallback) can run — and be tested — outside a browser. It is the single
 * highest-leverage place to catch regressions: a bug here either rejects a
 * perfectly good local read (unnecessary vision call, slower + costlier) or
 * accepts a bad one (wrong data silently applied).
 */

import { parse as mrzParse } from 'mrz';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MrzData {
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  sex: 'M' | 'F' | 'X' | null;
  nationality_code: string | null;
  document_number: string | null;
  issuing_country_code: string | null;
  expiry_date: string | null;
  document_type: string;
}

// ─── Conversion date ────────────────────────────────────────────────────────

/**
 * YYMMDD (format MRZ) → ISO YYYY-MM-DD
 * Pour les dates de naissance : YY > année courante → siècle précédent (1900).
 */
export function mrzDateToISO(yymmdd: string | null | undefined, isBirth: boolean): string | null {
  if (!yymmdd || !/^\d{6}$/.test(yymmdd)) return null;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const currentYY = new Date().getFullYear() % 100;
  const century = isBirth && yy > currentYY ? 1900 : 2000;
  return `${century + yy}-${mm}-${dd}`;
}

// ─── Seuil Otsu (binarisation) ──────────────────────────────────────────────

/** Seuil Otsu — s'adapte à l'éclairage réel sans valeur fixe arbitraire */
export function otsuThreshold(histogram: number[], total: number): number {
  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * histogram[t];

  let sumBg = 0, wBg = 0, maxVar = -1, threshold = 127;
  for (let t = 0; t < 256; t++) {
    wBg += histogram[t];
    if (wBg === 0) continue;
    const wFg = total - wBg;
    if (wFg === 0) break;
    sumBg += t * histogram[t];
    const mBg = sumBg / wBg;
    const mFg = (sumAll - sumBg) / wFg;
    const v = wBg * wFg * (mBg - mFg) ** 2;
    if (v > maxVar) { maxVar = v; threshold = t; }
  }
  return threshold;
}

// ─── Extraction des lignes MRZ ──────────────────────────────────────────────

/**
 * Extrait les lignes MRZ depuis le texte brut OCR.
 *
 * Avec le modèle OCRB, le '<' est correctement lu. L'extraction est simple :
 * trouver des lignes de la longueur attendue (44 pour TD3, 30 pour TD1, 36 pour TD2)
 * et vérifier les contraintes structurelles minimales.
 *
 * Contraintes structurelles :
 * - TD3 ligne 1 : commence par P / I / V / A
 * - TD3 ligne 2 : 6 chiffres en [13-18] (DOB) ET 6 chiffres en [21-26] (expiry)
 *   → Ces deux fenêtres en chiffres sont quasi impossibles à satisfaire par hasard.
 */
export function extractMrzLines(
  rawText: string,
): { lines: string[]; format: 'TD3' | 'TD1' | 'TD2' } | null {
  const candidates: string[] = [];

  for (const raw of rawText.split('\n')) {
    // 2+ espaces consécutifs → '<<' (le double-filler MRZ peut être rendu par tesseract
    // comme 2 espaces quand le whitelist ne contient pas d'espace)
    // espace simple restant → supprimé (artefact de séparation de mots)
    // chars non-MRZ → supprimés
    const clean = raw
      .toUpperCase()
      .replace(/[ \t]{2,}/g, '<<')
      .replace(/[ \t]/g, '')
      .replace(/[^A-Z0-9<]/g, '');

    if (clean.length >= 28) candidates.push(clean);
  }

  // ── TD3 : 2 lignes de 44 chars ──────────────────────────────────────────
  {
    const td3 = candidates
      .filter(l => l.length >= 38 && l.length <= 52)
      .map(l => l.length >= 44 ? l.slice(0, 44) : l.padEnd(44, '<'));

    const l1Candidates = td3.filter(l => /^[PIVA]/.test(l));
    const l2Candidates = td3.filter(
      l => /^\d{6}$/.test(l.slice(13, 19)) && /^\d{6}$/.test(l.slice(21, 27)),
    );

    if (l1Candidates.length >= 1 && l2Candidates.length >= 1) {
      const line2 = l2Candidates[0];
      const line1 = l1Candidates.find(l => l !== line2) ?? l1Candidates[0];
      return { lines: [line1, line2], format: 'TD3' };
    }
  }

  // ── TD1 : 3 lignes de 30 chars ──────────────────────────────────────────
  {
    const td1 = candidates
      .filter(l => l.length >= 26 && l.length <= 36)
      .map(l => l.length >= 30 ? l.slice(0, 30) : l.padEnd(30, '<'));

    // TD1 ligne 2 : DOB en [0-5], expiry en [8-13]
    const td1L2 = td1.filter(l => /^\d{6}/.test(l) && /^\d{6}$/.test(l.slice(8, 14)));

    if (td1L2.length >= 1 && td1.length >= 3) {
      return { lines: td1.slice(0, 3), format: 'TD1' };
    }
  }

  // ── TD2 : 2 lignes de 36 chars ──────────────────────────────────────────
  {
    const td2 = candidates
      .filter(l => l.length >= 32 && l.length <= 42)
      .map(l => l.length >= 36 ? l.slice(0, 36) : l.padEnd(36, '<'));

    const td2L1 = td2.filter(l => /^[PIV]/.test(l));
    const td2L2 = td2.filter(l => /^\d{6}$/.test(l.slice(13, 19)));

    if (td2L1.length >= 1 && td2L2.length >= 1) {
      return { lines: [td2L1[0], td2L2[0]], format: 'TD2' };
    }
  }

  // ── Fallback : lignes MRZ concaténées en une seule chaîne ───────────────
  // Certains modèles ou PSM retournent les 2 lignes MRZ collées l'une à l'autre.
  // On essaie de découper une ligne de ~88 chars en deux moitiés de 44.
  {
    const allText = rawText
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9<]/g, '');

    if (allText.length >= 80 && allText.length <= 96) {
      const mid = Math.floor(allText.length / 2);
      for (const cut of [44, mid, 43, 45]) {
        if (cut < 30 || cut > allText.length - 30) continue;
        const h1 = allText.slice(0, cut).padEnd(44, '<');
        const h2 = allText.slice(cut, cut + 44).padEnd(44, '<');
        if (
          /^[PIVA]/.test(h1) &&
          /^\d{6}$/.test(h2.slice(13, 19)) &&
          /^\d{6}$/.test(h2.slice(21, 27))
        ) {
          return { lines: [h1, h2], format: 'TD3' };
        }
      }
    }
  }

  return null;
}

// ─── Secours extraction directe des dates (TD3) ────────────────────────────────
//
// Le package 'mrz' met un champ à `null` dès que son propre parseur `throw` —
// notamment si un caractère résiduel non couvert par son autocorrect (B/G/O/I/S/Z
// uniquement) traîne dans la zone date après OCR. Résultat observé en prod : nom,
// prénom et nationalité correctement extraits, mais date de naissance/expiration
// vides alors que la zone MRZ elle-même contient bien 6 chiffres à cet endroit.
//
// On retente donc une extraction tolérante directement depuis la ligne brute
// (même correspondances lettre→chiffre que le package) plutôt que d'abandonner
// dès que son parseur interne échoue.
const OCR_DIGIT_FIX: Record<string, string> = { O: '0', I: '1', B: '8', G: '6', S: '5', Z: '2' };

export function fallbackTd3Date(line2: string, start: number): string | null {
  const raw = line2.slice(start, start + 6);
  const digits = raw.split('').map(c => (/[0-9]/.test(c) ? c : (OCR_DIGIT_FIX[c] ?? c))).join('');
  return /^\d{6}$/.test(digits) ? digits : null;
}

// ─── Conversion résultat mrz → MrzData ─────────────────────────────────────────

export function toMrzData(result: ReturnType<typeof mrzParse>, td3Line2: string | null): MrzData {
  const f = result.fields;

  // Sex : le package mrz v3 retourne 'male' | 'female' | null (pas 'M'/'F')
  let sex: 'M' | 'F' | 'X' = 'X';
  if (f.sex === 'male')        sex = 'M';
  else if (f.sex === 'female') sex = 'F';

  // Document type
  const code = (f.documentCode ?? '').toUpperCase();
  let document_type = 'travel_document';
  if (code.startsWith('P')) document_type = 'passport';
  else if (/^[IAC]/.test(code)) document_type = 'national_id';
  else if (code.startsWith('V')) document_type = 'visa';

  // Nettoyage des noms (le package retire déjà les '<' mais on sanitise par sécurité)
  const cleanName = (s: string | null | undefined): string | null =>
    s ? s.replace(/<+/g, ' ').replace(/\s+/g, ' ').trim() || null : null;

  // Si le champ mrz est vide (parseur interne ayant `throw`) et qu'on a la ligne
  // brute TD3 sous la main, on retente une extraction tolérante avant d'abandonner.
  const birthRaw  = f.birthDate      ?? (td3Line2 ? fallbackTd3Date(td3Line2, 13) : null);
  const expiryRaw = f.expirationDate ?? (td3Line2 ? fallbackTd3Date(td3Line2, 21) : null);

  return {
    last_name:            cleanName(f.lastName),
    first_name:           cleanName(f.firstName),
    date_of_birth:        mrzDateToISO(birthRaw,  true),
    sex,
    // f.nationality peut être null si ce champ MRZ n'est pas reconnu par l'OCR.
    // Fallback sur issuingState (même pays dans la quasi-totalité des cas).
    nationality_code:     f.nationality || f.issuingState || null,
    document_number:      f.documentNumber   || null,
    issuing_country_code: f.issuingState     || null,
    expiry_date:          mrzDateToISO(expiryRaw, false),
    document_type,
  };
}

// ─── Fiabilité (check digits) ───────────────────────────────────────────────

/**
 * Fiabilité d'une lecture MRZ via ses CHIFFRES DE CONTRÔLE (check digits).
 * La MRZ inclut ces chiffres précisément pour détecter les erreurs d'OCR.
 * « Confiant » = le check digit composite passe (il couvre numéro + date de
 * naissance + expiration en TD3) ; à défaut, numéro ET date de naissance valides.
 * Un résultat NON confiant est une lecture douteuse → on préférera Claude vision.
 */
export function isConfidentRead(result: ReturnType<typeof mrzParse>): boolean {
  const dg = (field: string) => result.details.find((d) => d.field === field);
  const composite = dg('compositeCheckDigit');
  if (composite) return composite.valid;
  const docNum = dg('documentNumberCheckDigit');
  const birth = dg('birthDateCheckDigit');
  return !!(docNum?.valid && birth?.valid);
}

// ─── Parsing d'un texte OCR → MrzData ──────────────────────────────────────────

/**
 * Tente d'extraire une fiche MrzData depuis un texte OCR brut.
 * Retourne null si aucune ligne MRZ exploitable (nom de famille au minimum),
 * sinon la donnée + un drapeau `confident` (check digits) pour arbitrer entre
 * garder l'OCR local (gratuit) et basculer sur Claude vision (payant).
 * Partagé par les deux pipelines (OpenCV et crop bas classique).
 */
export function parseOcrText(text: string): { data: MrzData; confident: boolean } | null {
  const extracted = extractMrzLines(text);
  if (!extracted) return null;

  const result   = mrzParse(extracted.lines, { autocorrect: true });
  const td3Line2 = extracted.format === 'TD3' ? extracted.lines[1] : null;
  const data     = toMrzData(result, td3Line2);

  // Nom de famille au minimum pour considérer qu'on a une lecture.
  if (!data.last_name) return null;
  return { data, confident: isConfidentRead(result) };
}
