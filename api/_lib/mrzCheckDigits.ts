/**
 * Chiffres de contrôle de la MRZ (ICAO 9303) — l'intégrité que le repli vision
 * n'avait pas.
 *
 * ── L'asymétrie que ce fichier corrige ──────────────────────────────────
 *
 * L'OCR local décide de sa propre fiabilité en vérifiant les chiffres de
 * contrôle : `confident = false` déclenche le repli vision, et si la vision est
 * indisponible l'écran affiche « vérifiez les données extraites ».
 *
 * Le repli Claude, lui, n'avait AUCUN contrôle d'intégrité. Ses champs étaient
 * appliqués tels quels, sans avertissement. Le chemin le MOINS vérifiable était
 * donc présenté comme le PLUS sûr — et il est emprunté précisément quand la
 * lecture est difficile (reflets, hologramme), c'est-à-dire quand une confusion
 * `0`/`O`, `1`/`I`, `5`/`S` ou `8`/`B` est la plus probable.
 *
 * Un numéro de passeport faux mais plausible part ensuite sur une fiche
 * transmise à un poste de police. Rien, en aval, ne peut le rattraper : c'est
 * la seule occasion de le détecter.
 *
 * ── Pourquoi vérifier champ par champ, et non la ligne entière ──────────
 *
 * Le chiffre composite (position 43) suppose une ligne de 44 caractères
 * exactement. Les MRZ réellement photographiées perdent souvent des `<` de
 * remplissage en fin de ligne — la ligne devient courte sans qu'aucune donnée
 * ne soit fausse. Exiger le composite ferait donc échouer des lectures justes.
 *
 * Les trois chiffres de contrôle de CHAMP (numéro, naissance, expiration) sont
 * eux insensibles à ce défaut : leurs positions sont fixes et précoces. Ce sont
 * eux qui portent l'information utile, et ce sont eux qu'on vérifie. Le
 * composite n'est contrôlé que si la ligne fait bien 44 caractères.
 */

/**
 * Valeur ICAO d'un caractère : chiffres tels quels, lettres A=10..Z=35,
 * remplissage `<` = 0.
 */
function charValue(c: string): number | null {
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
  if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55;
  if (c === '<') return 0;
  return null;
}

/** Somme pondérée 7-3-1, modulo 10. Rend null si un caractère est hors alphabet. */
export function computeCheckDigit(input: string): number | null {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    const value = charValue(input[i]);
    if (value === null) return null;
    sum += value * weights[i % 3];
  }
  return sum % 10;
}

export interface MrzCheckResult {
  /** Un champ au moins a pu être contrôlé. */
  checked: boolean;
  /** Tous les champs contrôlables concordent. */
  valid: boolean;
  /** Champs dont le chiffre de contrôle ne tombe pas juste. */
  mismatched: string[];
}

/**
 * Vérifie la deuxième ligne d'une MRZ TD-3.
 *
 * La ligne 1 ne porte aucun chiffre de contrôle : elle n'a rien à vérifier.
 */
export function verifyTd3Line2(line2raw: string | null | undefined): MrzCheckResult {
  const line = (line2raw ?? '').toUpperCase().replace(/\s+/g, '');

  // En deçà de 28 caractères, le chiffre de contrôle de l'expiration n'est même
  // pas présent : il n'y a rien à contrôler, et prétendre le contraire serait
  // pire que de l'admettre.
  if (line.length < 28) {
    return { checked: false, valid: false, mismatched: [] };
  }

  const fields: Array<{ name: string; value: string; digit: string }> = [
    { name: 'document_number', value: line.slice(0, 9), digit: line[9] },
    { name: 'date_of_birth', value: line.slice(13, 19), digit: line[19] },
    { name: 'expiry_date', value: line.slice(21, 27), digit: line[27] },
  ];

  const mismatched: string[] = [];
  let checked = false;

  for (const field of fields) {
    const expected = computeCheckDigit(field.value);
    // Un chiffre de contrôle absent de la MRZ (`<`) signifie « champ non
    // renseigné » : ce n'est pas une erreur de lecture.
    if (expected === null || !/^[0-9]$/.test(field.digit)) continue;
    checked = true;
    if (expected !== Number(field.digit)) mismatched.push(field.name);
  }

  return { checked, valid: checked && mismatched.length === 0, mismatched };
}
