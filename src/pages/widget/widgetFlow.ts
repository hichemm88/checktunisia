import type { BootstrapResponse, GuestInput } from '@/api/widget/ficheWidget';

/**
 * Logique pure du parcours « scanner et valider » du widget : compteur,
 * pré-remplissage et fusion du résultat de scan. Sans React ni réseau, pour
 * être testée seule (widgetFlow.test.ts).
 */

type Prefill = BootstrapResponse['prefill_guests'][number];

/**
 * `declared` = voyageurs déjà sur la fiche (existants en amend + ajoutés ici),
 * `target` = nombre attendu (bootstrap), éventuellement relevé par la réception.
 */
export const flowProgress = (declared: number, addedHere: number, target: number) => {
  const current = declared + 1;
  return {
    /** Rang du voyageur en cours de déclaration (1-based). */
    current,
    /** Le voyageur en cours est le dernier attendu : son bouton valide la fiche. */
    isLast: current >= target,
    /** Lien « Valider avec N voyageurs sur M ». */
    canSubmitPartial: addedHere >= 1 && declared < target,
  };
};

const isTunisian = (code?: string | null) => /^(TUN|TN)$/i.test((code ?? '').trim());

/** CIN par défaut pour un voyageur tunisien pré-rempli, passeport sinon. */
export const defaultScanType = (prefill?: Prefill): 'cin' | 'passport' =>
  isTunisian(prefill?.nationality) ? 'cin' : 'passport';

/** Types de document du formulaire (GuestController) à partir des libellés partenaire/scan. */
export const normalizeDocType = (raw?: unknown): string | undefined => {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!v) return undefined;
  if (['cin', 'national_id', 'id_card', 'identity_card'].includes(v)) return 'national_id';
  if (v === 'passport') return 'passport';
  if (v === 'residence_permit') return 'residence_permit';
  return undefined;
};

export const emptyGuest = (scanType: 'cin' | 'passport' = 'passport'): GuestInput => ({
  first_name: '',
  last_name: '',
  date_of_birth: '',
  sex: 'M',
  nationality_code: scanType === 'cin' ? 'TUN' : '',
  document: {
    type: scanType === 'cin' ? 'national_id' : 'passport',
    document_number: '',
    issuing_country_code: scanType === 'cin' ? 'TUN' : '',
  },
});

/** Formulaire de départ : vide, complété par ce que le partenaire a fourni. */
export const guestFromPrefill = (prefill: Prefill | undefined, scanType: 'cin' | 'passport'): GuestInput => {
  const g = emptyGuest(scanType);
  if (!prefill) return g;
  const nat = (prefill.nationality ?? '').trim().toUpperCase();
  return {
    ...g,
    first_name: prefill.first_name ?? g.first_name,
    last_name: prefill.last_name ?? g.last_name,
    nationality_code: nat.length === 3 ? nat : g.nationality_code,
    document: {
      ...g.document,
      type: normalizeDocType(prefill.id_document_type) ?? g.document.type,
      document_number: prefill.id_document_number ?? g.document.document_number,
    },
  };
};

/** Superpose les champs lus par le scan ; un champ absent ou vide garde la valeur de base. */
export const mergeExtracted = (base: GuestInput, extracted: Record<string, unknown> | undefined): GuestInput => {
  if (!extracted) return base;
  const s = (k: string): string | undefined => {
    const v = extracted[k];
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
  };
  const sex = s('sex')?.toUpperCase();
  return {
    ...base,
    first_name: s('first_name') ?? base.first_name,
    last_name: s('last_name') ?? base.last_name,
    date_of_birth: s('date_of_birth') ?? base.date_of_birth,
    sex: sex === 'M' || sex === 'F' || sex === 'X' ? sex : base.sex,
    nationality_code: s('nationality_code') ?? base.nationality_code,
    document: {
      ...base.document,
      type: normalizeDocType(s('document_type')) ?? base.document.type,
      document_number: s('document_number') ?? base.document.document_number,
      issuing_country_code: s('issuing_country_code') ?? base.document.issuing_country_code,
      expiry_date: s('expiry_date') ?? base.document.expiry_date,
      mrz_line1: s('mrz_line1') ?? base.document.mrz_line1,
      mrz_line2: s('mrz_line2') ?? base.document.mrz_line2,
    },
  };
};

/** sessionStorage peut lever dans une iframe tierce (Safari) : jamais bloquant. */
export const safeSession = {
  get: (key: string): string | null => {
    try { return window.sessionStorage.getItem(key); } catch { return null; }
  },
  set: (key: string, value: string) => {
    try { window.sessionStorage.setItem(key, value); } catch { /* stockage indisponible */ }
  },
  remove: (key: string) => {
    try { window.sessionStorage.removeItem(key); } catch { /* stockage indisponible */ }
  },
};
