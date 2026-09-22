export type CrmRole = 'admin' | 'membre';

export interface CrmUser {
  id: string;
  name: string;
  email: string;
  role: CrmRole;
  notifications: {
    digest_enabled: boolean;
    digest_hour: string;
    demo_reminder_enabled: boolean;
    activity_enabled: boolean;
  };
}

export type PipelineStatus =
  | 'a_contacter'
  | 'contacte'
  | 'relance'
  | 'demo_planifiee'
  | 'demo_faite'
  | 'essai_en_cours'
  | 'client'
  | 'refus'
  | 'sans_reponse'
  | 'hors_perimetre';

export type Zone = 'grand_tunis' | 'banlieue_nord' | 'cap_bon' | 'sud' | 'autre';
export type Size = 'petite' | 'moyenne' | 'grande';
export type Segment = 'maison_hotes' | 'guesthouse' | 'boutique_hotel' | 'hotel' | 'location_entiere' | 'autre';
export type Priority = 'P1' | 'P2' | 'P3';
export type TargetPlan = 'essentiel' | 'pro' | 'hotel' | 'inconnu';

export interface Establishment {
  id: string;
  name: string;
  zone: Zone;
  locality: string | null;
  size: Size | null;
  segment: Segment | null;
  priority: Priority;
  status: PipelineStatus;
  whatsapp_phone: string | null;
  next_action_at: string | null;
  out_of_scope: boolean;
  archived: boolean;
  is_overdue?: boolean;
  // Présents seulement sur la fiche détaillée (show/store/update).
  address?: string | null;
  decision_maker_name?: string | null;
  decision_maker_role?: string | null;
  origin_channel?: string | null;
  qualification_notes?: string | null;
  target_plan?: TargetPlan;
  created_at?: string;
  updated_at?: string;
}

export type ActionType =
  | 'message_envoye'
  | 'reponse_recue'
  | 'appel'
  | 'demo_planifiee'
  | 'demo_faite'
  | 'essai_active'
  | 'relance'
  | 'note'
  | 'changement_statut';

export interface ProspectionAction {
  id: string;
  type: ActionType;
  channel: string | null;
  content: string | null;
  objections: string[] | null;
  occurred_at: string;
  created_by: string | null;
}

export interface MessageTemplate {
  id: string;
  name: string;
  body: string;
  segment: Segment | null;
  active: boolean;
}

export interface ObjectionTag {
  id: string;
  label: string;
}
