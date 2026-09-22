/**
 * Un nom de voyageur qui ne RESSEMBLE PAS à un nom — dernier filet avant
 * qu'une lecture OCR/vision ne parte sur une fiche transmise à la police.
 *
 * Né d'un incident réel : une fiche transmise portait comme nom
 * « ABEEXPEDIGAQIDATEOFISSUEAUTORIDADEAUTHO » — l'OCR avait lu les LÉGENDES
 * imprimées de la page bio-data d'un passeport brésilien (« Data de
 * Emissão/Date of Issue », « Autoridade/Authority »...) au lieu du nom
 * réellement imprimé. Aucun chiffre de contrôle MRZ ne pouvait le détecter :
 * la ligne 1 (qui porte le nom) n'en a AUCUN — voir mrzCheckDigits.ts, qui le
 * documente déjà pour la ligne 2. Le seul filet possible est un jugement sur
 * la FORME du texte lui-même.
 *
 * DUPLIQUÉ À L'IDENTIQUE depuis `frontend/src/lib/namePlausibility.ts` : les
 * fonctions serverless Vercel de ce dossier ne partagent pas le bundling avec
 * `src/`, et cette logique est trop petite pour justifier une dépendance
 * inter-dossiers fragile. Toute modification doit être répercutée des deux
 * côtés.
 */

const MAX_TOTAL_LENGTH = 60;
const MAX_TOKEN_LENGTH = 30;

// Toujours SANS ACCENT : `onlyLetters()` ci-dessous SUPPRIME les caractères
// accentués plutôt que de les transformer — un fragment accentué ne
// matcherait donc jamais rien.
const LABEL_FRAGMENTS = [
  'AUTORIDADE', 'AUTHORITY', 'EXPEDICAO', 'NASCIMENTO',
  'PASSAPORTE', 'REPUBLICA', 'REPUBLIQUE', 'NATIONALITY', 'NACIONALIDADE',
  'ASSINATURA', 'SIGNATURE', 'VALIDADE', 'EMISSAO', 'ENDERECO',
  'DATEOFISSUE', 'DATEOFBIRTH', 'DATEOFEXPIRY', 'PLACEOFBIRTH',
  'GIVENNAME', 'SURNAME', 'DOCUMENTNUMBER', 'ISSUINGAUTHORITY',
];

const onlyLetters = (s: string): string => s.toUpperCase().replace(/[^A-Z]/g, '');

/**
 * Un champ, seul : est-ce que sa FORME évoque un texte d'étiquette plutôt
 * qu'un nom ? Un champ absent/vide n'est PAS suspect — il n'y a rien à
 * distruster, et le traiter comme tel effacerait à tort le champ voisin.
 */
export function isSuspiciousName(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (v.length === 0) return false;
  if (v.length > MAX_TOTAL_LENGTH) return true;
  if (!/^[\p{L}\p{M} '\-.]+$/u.test(v)) return true;
  const tokens = v.split(/[\s-]+/).filter(Boolean);
  if (tokens.some((t) => t.length > MAX_TOKEN_LENGTH)) return true;
  const letters = onlyLetters(v);
  return LABEL_FRAGMENTS.some((frag) => letters.includes(frag));
}

/** Deux champs identiques (hors casse/espaces) : jamais un vrai prénom + nom. */
export function sameName(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toUpperCase() === b.trim().toUpperCase();
}
