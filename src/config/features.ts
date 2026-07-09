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
} as const;
