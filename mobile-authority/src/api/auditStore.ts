/**
 * Journal d'audit embarqué (F6) — LECTURE SEULE côté agent.
 *
 * L'écriture réelle est côté serveur (alimentée par F2 / F4). Ici, en démo,
 * on conserve une trace locale éphémère des actions de la session pour que
 * « Mon activité » soit vivant pendant la démonstration. Ce n'est PAS un cache
 * de watchlist : ce sont les actions déjà effectuées par l'agent, pas des
 * données de vérification réutilisables.
 */
import { AuditEntry, AuditActionType, VerificationState } from './types';

type Listener = () => void;

let entries: AuditEntry[] = [];
const listeners = new Set<Listener>();
let counter = 0;

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeAudit(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getAuditEntries(): AuditEntry[] {
  return entries;
}

export interface RecordInput {
  action: AuditActionType;
  result?: VerificationState | null;
  subject?: string | null;
  place_label?: string | null;
  has_location: boolean;
}

/** Ajoute une entrée (appelée après vérification, contrôle, signalement). */
export function recordAudit(input: RecordInput): AuditEntry {
  counter += 1;
  const entry: AuditEntry = {
    id: `au-${counter}-${entries.length}`,
    action: input.action,
    result: input.result ?? null,
    subject: input.subject ?? null,
    created_at: new Date().toISOString(),
    place_label: input.place_label ?? null,
    has_location: input.has_location,
  };
  entries = [entry, ...entries];
  emit();
  return entry;
}

/** Amorce quelques entrées historiques crédibles pour la démo (§8). */
export function seedAuditOnce() {
  if (entries.length > 0) return;
  const H = 3600_000;
  const now = Date.now();
  const base: Omit<AuditEntry, 'id'>[] = [
    { action: 'verify', result: 'vert', subject: 'Sarah Johnson', created_at: new Date(now - 2 * H).toISOString(), place_label: 'Sousse, Corniche', has_location: true },
    { action: 'control', result: null, subject: 'Hôtel Nour El Bahr', created_at: new Date(now - 3 * H).toISOString(), place_label: 'Sousse, Corniche', has_location: true },
    { action: 'verify', result: 'ambre', subject: 'Robert Klein', created_at: new Date(now - 5 * H).toISOString(), place_label: 'Hammam Sousse', has_location: true },
    { action: 'report', result: null, subject: 'Robert Klein', created_at: new Date(now - 5 * H + 60_000).toISOString(), place_label: 'Hammam Sousse', has_location: true },
    { action: 'verify', result: 'vert', subject: 'Emma Lefèvre', created_at: new Date(now - 26 * H).toISOString(), place_label: 'Akouda', has_location: false },
  ];
  entries = base.map((e, i) => ({ ...e, id: `au-seed-${i}` }));
  counter = base.length;
}
