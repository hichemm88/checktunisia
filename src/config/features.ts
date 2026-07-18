/**
 * Frontend feature flags.
 *
 * Mirror of backend config/features.php. Flip a flag to re-enable a feature that
 * has been temporarily hidden — the code stays in place, only the toggle changes.
 */
export const FEATURES = {
  /**
   * Authority "expired / expiring document" alerts: dashboard KPI + alert card,
   * the sidebar "Alerts" entry and the /authority/alerts page.
   * Temporarily hidden. Set to `true` here AND FEATURE_EXPIRED_DOC_ALERTS=true
   * on the backend to bring it back.
   */
  expiredDocAlerts: false,

  /**
   * Observatoire du Tourisme — MODE DEMO. Quand actif, le dashboard affiche un
   * bandeau « MODE DEMO » explicite : les chiffres proviennent du seed
   * synthetique (§8), destines aux presentations ministerielles, jamais confondus
   * avec les agregats reels. Bascule aussi possible a chaud via localStorage
   * (cle `qayed-observatoire-demo`), lue par useObservatoireDemo().
   */
  observatoireDemo: true,
} as const;
