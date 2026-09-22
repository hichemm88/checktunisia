import type { PipelineStatus, Zone } from '@/crm/types';

export const STATUS_LABELS: Record<PipelineStatus, string> = {
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

export const ZONE_LABELS: Record<Zone, string> = {
  grand_tunis: 'Grand Tunis',
  banlieue_nord: 'Banlieue nord',
  cap_bon: 'Cap Bon',
  sud: 'Sud',
  autre: 'Autre',
};
