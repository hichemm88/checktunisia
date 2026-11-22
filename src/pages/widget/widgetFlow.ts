import type { BootstrapResponse, GuestInput } from '@/api/widget/ficheWidget';
import type { FieldConfidence, GuestForm } from '@/components/hotel/GuestScanParts';
import { guestFormBlockers } from '@/lib/guestFormGuards';
import { isSuspiciousName, sameName } from '@/lib/namePlausibility';

/**
 * Logique pure du parcours du widget : étapes, pré-remplissage, fusion du
 * résultat de scan et contrôles. Le formulaire est le MÊME objet plat que
 * celui du parcours Check-in de l'application (GuestScanPanel) ; il n'est
 * converti au format imbriqué du widget qu'à l'envoi (toGuestInput).
 */

type Prefill = BootstrapResponse['prefill_guests'][number];
export type ScanKind = 'cin' | 'mrz';

/** Délai au-delà duquel la lecture est présentée comme trop longue. */
export const READING_TIMEOUT_MS = 15_000;

/**
 * Étape d'ouverture : la liste si tous les voyageurs attendus sont déjà
 * saisis (brouillon repris), sinon le scan du prochain voyageur. Identique en
 * création, en reprise d'un brouillon et en complément d'une fiche transmise.
 */
export const openingStep = (declared: number, target: number): 'scan' | 'list' =>
  declared >= target ? 'list' : 'scan';

/** Voyageurs attendus : jamais moins que ceux déjà saisis (+1 en complément). */
export const initialTarget = (expected: number, existing: number, mode: 'create' | 'amend') =>
  Math.max(expected || 1, existing + (mode === 'amend' ? 1 : 0), 1);

const isTunisian = (code?: string | null) => /^(TUN|TN)$/i.test((code ?? '').trim());

/** Types de document du formulaire (GuestController) à partir des libellés partenaire/scan. */
export const normalizeDocType = (raw?: unknown): string | undefined => {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!v) return undefined;
  if (['cin', 'national_id', 'id_card', 'identity_card'].includes(v)) return 'national_id';
  if (v === 'passport') return 'passport';
  if (v === 'residence_permit') return 'residence_permit';
  return undefined;
};

/** Formulaire de départ, complété par ce que le partenaire a fourni. */
export const formFromPrefill = (prefill: Prefill | undefined, kind: ScanKind | 'manual'): GuestForm => {
  const nat = (prefill?.nationality ?? '').trim().toUpperCase();
  const cin = kind === 'cin';
  return {
    first_name: prefill?.first_name ?? '',
    last_name: prefill?.last_name ?? '',
    date_of_birth: '',
    nationality_code: cin ? 'TUN' : nat.length === 3 ? nat : isTunisian(nat) ? 'TUN' : '',
    document_type: cin ? 'national_id' : normalizeDocType(prefill?.id_document_type) ?? 'passport',
    document_number: prefill?.id_document_number ?? '',
    issuing_country_code: cin ? 'TUN' : '',
  };
};

export interface Extracted {
  form: GuestForm;
  conf: FieldConfidence | null;
  mrz: { mrz_line1?: string; mrz_line2?: string };
}

/**
 * Superpose les champs lus ; un champ absent ou vide garde la valeur de base.
 * Même contrôle des noms que l'application (namePlausibility) : un nom qui ne
 * ressemble pas à un nom est vidé et signalé, jamais transmis tel quel.
 */
export const applyExtracted = (base: GuestForm, extracted: Record<string, unknown> | undefined): Extracted => {
  if (!extracted) return { form: base, conf: null, mrz: {} };
  const s = (k: string): string | undefined => {
    const v = extracted[k];
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
  };
  const first = s('first_name');
  const last = s('last_name');
  const bothIdentical = sameName(first, last);
  const firstBad = !!first && (bothIdentical || isSuspiciousName(first));
  const lastBad = !!last && (bothIdentical || isSuspiciousName(last));
  const sex = s('sex')?.toUpperCase();

  return {
    form: {
      ...base,
      first_name: firstBad ? '' : first ?? base.first_name,
      last_name: lastBad ? '' : last ?? base.last_name,
      date_of_birth: s('date_of_birth') ?? base.date_of_birth,
      sex: sex === 'M' || sex === 'F' || sex === 'X' ? sex : base.sex,
      nationality_code: s('nationality_code') ?? base.nationality_code,
      document_type: normalizeDocType(s('document_type')) ?? base.document_type,
      document_number: s('document_number') ?? base.document_number,
      issuing_country_code: s('issuing_country_code') ?? base.issuing_country_code,
      expiry_date: s('expiry_date') ?? base.expiry_date,
    },
    conf: firstBad || lastBad ? { cinNumber: null, names: 'low', birthDate: null } : null,
    mrz: { mrz_line1: s('mrz_line1'), mrz_line2: s('mrz_line2') },
  };
};

/**
 * Ce qui empêche encore d'enregistrer : la règle de l'application
 * (guestFormBlockers) + le sexe, exigé par l'API du widget.
 */
export const widgetBlockers = (form: GuestForm, conf: FieldConfidence | null): string[] => {
  const lowUnfilled = !!conf && conf.names === 'low' && (!form.first_name || !form.last_name);
  const blockers = guestFormBlockers(form, { hasUnfilledLowConfidence: lowUnfilled });
  if (!form.sex) blockers.push('sex');
  return blockers;
};

/** Formulaire plat (application) → corps attendu par POST /widget/v1/guests. */
export const toGuestInput = (form: GuestForm, mrz: Extracted['mrz'], scanId: string | null): GuestInput => ({
  first_name: (form.first_name ?? '').trim(),
  last_name: (form.last_name ?? '').trim(),
  date_of_birth: form.date_of_birth ?? '',
  sex: (form.sex ?? 'X') as GuestInput['sex'],
  nationality_code: (form.nationality_code ?? '').toUpperCase(),
  ...(scanId ? { scan_id: scanId } : {}),
  document: {
    type: form.document_type ?? 'passport',
    document_number: (form.document_number ?? '').trim(),
    issuing_country_code: (form.issuing_country_code ?? '').toUpperCase(),
    expiry_date: form.expiry_date || null,
    mrz_line1: mrz.mrz_line1 ?? null,
    mrz_line2: mrz.mrz_line2 ?? null,
  },
});

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
