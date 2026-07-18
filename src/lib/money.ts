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

/**
 * Montants en dollars US pour le tracking des coûts IA (la facture Anthropic est
 * en USD). Pas de conversion TND dans cette version. `maxDecimals` monte à 4 pour
 * les coûts par scan, qui sont de l'ordre de quelques millièmes de dollar.
 */
export const formatUSD = (
  amount: number | string | null | undefined,
  maxDecimals = 2,
): string => {
  const n = Number(amount ?? 0);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: maxDecimals })}`;
};
