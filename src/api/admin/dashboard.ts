import { api } from '@/lib/api';

export interface AdminDashboardStats {
  hotels: { total: number; active: number; suspended: number; pending: number };
  check_ins: { today: number; this_month: number };
  trials: {
    in_progress: number;
    expiring_soon: { id: string; name: string; expires_at: string }[];
    conversion_rate: number | null;
  };
  alerts: {
    /**
     * Inclut les comptes dont l'echeance est DEJA passee et qui restent
     * servis pendant la periode de grace du recouvrement : `grace.active`
     * distingue « echeance a venir » de « deja en retard, sursis en cours ».
     */
    expiring_subscriptions: {
      id: string;
      name: string;
      plan: string | null;
      expires_at: string;
      grace: { active: boolean; ends_at: string | null; days_left: number | null };
    }[];
    failed_payments: { id: string; hotel_name: string | null; amount: string; created_at: string }[];
    recently_suspended: { id: string; name: string; updated_at: string }[];
    pending_virements: {
      id: string;
      name: string;
      invoice_number: string | null;
      amount: string;
      reference: string | null;
      declared_at: string | null;
    }[];
  };
  currency: string;
  /** MRR COMMERCIAL : les comptes internes en sont exclus a la source. */
  mrr: number;
  /**
   * ARR COMMERCIAL — meme base d'abonnements que le MRR, autre echelle. Un
   * abonnement annuel vaut le montant reellement facture (11 mois, un mois
   * offert), pas douze fois sa mensualisation arrondie. Calcule cote backend :
   * aucun montant n'est recompose ici.
   */
  arr: number;
  paying_customers: number;
  /** Repartition du parc — un compte interne existe, il ne genere juste aucun revenu. */
  organizations: { total: number; commercial: number; internal: number };
  mrr_breakdown: {
    customer: string;
    plan: string;
    billing_cycle: 'monthly' | 'yearly';
    negotiated: boolean;
    monthly_value: number;
    annual_value: number;
  }[];
  check_ins_chart: { date: string; count: number }[];
  top_hotels: { id: string; name: string; check_ins_count: number }[];
  recent_signups: { id: string; name: string; created_at: string }[];
}

/**
 * KPIs business (endpoint dédié /admin/metrics/kpis). Complète le dashboard avec
 * les indicateurs SaaS de pilotage. Montants en TND. Les taux valent null quand
 * la base de calcul est vide (aucune donnée -> on n'affiche pas un 0 % trompeur).
 */
export interface AdminKpis {
  currency: string;
  mrr: {
    current: number;
    new_this_month: number;
    churned_this_month: number;
    net_new_this_month: number;
  };
  arr: { current: number };
  arpu: { value: number; paying_customers: number };
  churn: { rate_pct: number | null; churned_customers: number; base_customers: number; window: string };
  activation: { rate_pct: number | null; activated: number; cohort_size: number; window_days: number };
  trial_conversion: { rate_pct: number | null; converted: number; trials: number };
}

/**
 * Sante d'exploitation. Le point important est QUI observe : le battement du
 * planificateur est ecrit PAR le planificateur, donc aucune tache planifiee ne
 * peut alerter sur sa propre mort. L'observateur, ici, c'est ce navigateur.
 * Voir backend/docs/observabilite.md pour la sonde externe qui reste a brancher.
 */
export interface AdminHealth {
  database: { reachable: boolean; latency_ms: number };
  queue: { driver: string; pending: number | null; failed_total: number };
  scheduler: { last_run_at: string | null; minutes_since: number | null; stale: boolean };
  backup: {
    configured: boolean;
    stale: boolean;
    hours_since_success: number | null;
    last_success_at: string | null;
    last_result: string | null;
  };
  whatsapp: {
    pending: number | null;
    failed: number | null;
    sent: number | null;
    session: {
      status: string | null;
      paused: boolean;
      needs_pairing: boolean;
      last_ready_at: string | null;
      heartbeat_at: string | null;
      revoked_at: string | null;
    } | null;
  };
  checked_at: string;
}

export const adminDashboardApi = {
  stats: () => api.get<{ data: AdminDashboardStats }>('/admin/dashboard').then((r) => r.data.data),
  kpis: () => api.get<{ data: AdminKpis }>('/admin/metrics/kpis').then((r) => r.data.data),
  health: () => api.get<{ data: AdminHealth }>('/admin/health').then((r) => r.data.data),
};
