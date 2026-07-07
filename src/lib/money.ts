/**
 * Tunisian dinar amounts are quoted in millimes (3 decimals), and the
 * convention here uses a comma as the decimal separator (e.g. "119,000 TND")
 * rather than the period PHP/JS default to — keep this consistent with the
 * backend's `formatTnd()` helper (app/Support/Money.php).
 */
/** The bare amount, comma-decimal, no currency suffix — for i18n strings that already append "TND" themselves. */
export const formatTNDAmount = (amount: number | string | null | undefined): string => {
  const n = Number(amount ?? 0);
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
};

export const formatTND = (amount: number | string | null | undefined): string =>
  `${formatTNDAmount(amount)} TND`;
