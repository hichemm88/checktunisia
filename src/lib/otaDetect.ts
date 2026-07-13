/**
 * Détection heuristique de la plateforme (OTA) à partir du format de la
 * référence réservation — purement informative, jamais bloquante.
 * Mêmes règles que l'app mobile (module partagé) :
 *   - Airbnb      : « HM » suivi d'alphanumériques (ex. HMABCDE123)
 *   - Booking.com : 10 chiffres (ex. 1234567890)
 *   - Agoda       : 9 chiffres
 *   - Expedia     : 8 chiffres
 * Référence inconnue → null (aucun badge, pas de badge « inconnu »).
 */
export interface OtaMatch {
  key: 'booking' | 'airbnb' | 'expedia' | 'agoda';
  label: string;
}

export const detectOta = (reference: string): OtaMatch | null => {
  const r = reference.trim().toUpperCase();
  if (!r) return null;
  if (/^HM[A-Z0-9]{6,}$/.test(r)) return { key: 'airbnb', label: 'Airbnb' };
  if (/^\d{10}$/.test(r)) return { key: 'booking', label: 'Booking.com' };
  if (/^\d{9}$/.test(r)) return { key: 'agoda', label: 'Agoda' };
  if (/^\d{8}$/.test(r)) return { key: 'expedia', label: 'Expedia' };
  return null;
};
