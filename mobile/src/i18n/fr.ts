/**
 * French UI strings — copied verbatim from the web app's src/i18n/locales/fr.json
 * so the native app uses identical wording. Arabic (v2) is intentionally out of scope.
 */
export const fr = {
  auth: {
    tagline: 'Enregistrement numérique des hôtes',
    login: 'Connexion',
    loginButton: 'Se connecter',
    forgotPassword: 'Mot de passe oublié ?',
    emailLabel: 'Email',
    passwordLabel: 'Mot de passe',
    emailPlaceholder: 'vous@exemple.tn',
    footer: 'Qayed — Plateforme agréée MdI',
    twoFactorWeb:
      "Votre compte requiert une vérification en deux étapes. Terminez la connexion sur qayed.tn.",
    invalidCredentials: 'Email ou mot de passe incorrect.',
  },
  nav: {
    home: 'Accueil',
    checkin: 'Check-in',
    history: 'Historique',
    properties: 'Mes biens',
    settings: 'Paramètres',
  },
  dashboard: {
    title: 'Tableau de bord',
    greetingMorning: 'Bonjour',
    greetingAfternoon: 'Bon après-midi',
    greetingEvening: 'Bonsoir',
    arrivals: 'arrivées',
    departures: 'départs',
    newCheckin: 'Nouveau check-in',
    presentCount_one: '{{count}} présent',
    presentCount_other: '{{count}} présents',
    statArrivalsExpected: 'Arrivées prévues',
    statCheckinsDone: 'Check-ins faits',
    statPresent: 'Présents',
    statDeparturesToday: 'Départs auj.',
    statOccupancyRate: "Taux d'occupation",
    statCheckinsMonth: 'Check-ins ce mois',
    weeklyTrend: 'Tendance — 7 derniers jours',
    recent: 'Récents',
    seeAll: 'Voir tout',
    noName: 'Sans nom',
    room: 'Ch. {{room}}',
    noRoom: 'Sans chambre',
    noRecentCheckin: 'Aucun check-in récent',
    subInactive: 'Abonnement inactif',
  },
  checkin: {
    title: 'Nouveau check-in',
    stepBooking: 'Réservation',
    stepDocuments: 'Documents',
    stepValidation: 'Validation',
    phase2Notice:
      'Le flux de check-in (scan MRZ natif, saisie CIN, validation) arrive en Phase 2.',
    phase2Sub: 'Réservation → Documents → Validation, avec scan passeport natif.',
  },
  history: {
    title: 'Historique',
    searchPlaceholder: 'Nom, référence, chambre…',
    noGuest: 'Sans voyageur',
    noUnit: 'Sans unité',
    departure: 'Départ',
    tryOtherFilter: 'Essayez un autre filtre ou une autre recherche',
    filterAll: 'Tous',
  },
  properties: {
    myProperties: 'Mes biens',
    myOrganization: 'Mon organisation',
    selectActiveProperty:
      'Sélectionnez le bien sur lequel vous travaillez actuellement.',
    setAsActive: 'Définir comme établissement actif',
    activeBadge: 'Actif',
    unitsCount_one: '{{count}} unité',
    unitsCount_other: '{{count}} unités',
    propertiesCount_one: '{{count}} bien',
    propertiesCount_other: '{{count}} biens',
    unitsTotalCount_one: '{{count}} unité au total',
    unitsTotalCount_other: '{{count}} unités au total',
    noPropertyRegistered: 'Aucun bien enregistré',
    propertySelected: 'Établissement sélectionné',
  },
  status: {
    draft: 'Brouillon',
    active: 'Actif',
    completed: 'Terminé',
    no_show: 'No-show',
    cancelled: 'Annulé',
  },
  settings: {
    title: 'Paramètres',
    company: 'Société',
    team: 'Équipe',
    activity: 'Activité',
    subscription: 'Abonnement',
    subscriptionWebOnly:
      "La gestion de l'abonnement se fait sur qayed.tn — aucun paiement dans l'application.",
    profile: 'Profil',
    notifications: 'Notifications',
    logout: 'Se déconnecter',
    openWeb: 'Ouvrir qayed.tn',
  },
  common: {
    loading: 'Chargement…',
    error: 'Une erreur est survenue',
    retry: 'Réessayer',
    cancel: 'Annuler',
    back: 'Retour',
    all: 'Tous',
    noResults: 'Aucun résultat',
  },
} as const;

/** Tiny helper for the `_one` / `_other` plural keys + `{{count}}` interpolation. */
export function plural(
  base: Record<string, string>,
  key: string,
  count: number,
): string {
  const suffix = count === 1 ? '_one' : '_other';
  const template = base[`${key}${suffix}`] ?? base[key] ?? '';
  return template.replace('{{count}}', String(count));
}

/** Interpolate a single `{{name}}` style token. */
export function interp(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

export default fr;
