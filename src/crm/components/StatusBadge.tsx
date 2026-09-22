import { clsx } from 'clsx';
import type { PipelineStatus } from '@/crm/types';

const LABELS: Record<PipelineStatus, string> = {
  a_contacter: 'À contacter',
  contacte: 'Contacté',
  relance: 'Relancé',
  demo_planifiee: 'Démo planifiée',
  demo_faite: 'Démo faite',
  essai_en_cours: 'Essai en cours',
  client: 'Client',
  refus: 'Refus',
  sans_reponse: 'Sans réponse',
  hors_perimetre: 'Hors périmètre',
};

/** Vert conforme pour les statuts positifs, rouge sobre pour Refus, encre pour le reste. */
const STYLES: Record<PipelineStatus, string> = {
  a_contacter: 'bg-qayed-cachet-dilue text-qayed-cachet-fonce',
  contacte: 'bg-qayed-cachet-dilue text-qayed-cachet-fonce',
  relance: 'bg-qayed-vigilance-fond text-qayed-vigilance-texte',
  demo_planifiee: 'bg-qayed-cachet-dilue text-qayed-cachet-fonce',
  demo_faite: 'bg-qayed-conforme-fond text-qayed-conforme-texte',
  essai_en_cours: 'bg-qayed-conforme-fond text-qayed-conforme-texte',
  client: 'bg-qayed-conforme-fond text-qayed-conforme-texte',
  refus: 'bg-qayed-erreur-fond text-qayed-erreur-texte',
  sans_reponse: 'bg-gray-100 text-qayed-fiche',
  hors_perimetre: 'bg-gray-100 text-qayed-fiche',
};

export function StatusBadge({ status }: { status: PipelineStatus }) {
  return (
    <span className={clsx('mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium', STYLES[status])}>
      {LABELS[status]}
    </span>
  );
}
