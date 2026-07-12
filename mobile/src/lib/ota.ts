/**
 * OTA (online travel agency) detection from a booking reference (§7). Purely informative — a
 * small badge under the field and a stored `booking_source` for the manager's channel stats.
 * No blocking validation. Codes match the backend booking_source enum
 * (direct, booking, airbnb, expedia, phone, other).
 */
export interface OtaSource {
  code: 'booking' | 'airbnb' | 'expedia';
  label: string;
}

export function detectOta(reference: string): OtaSource | null {
  const ref = reference.trim().toUpperCase();
  if (!ref) return null;

  // Booking.com — 9 or 10 digit reservation numbers.
  if (/^\d{9,10}$/.test(ref)) return { code: 'booking', label: 'Booking.com' };

  // Airbnb — confirmation codes are 10 alphanumeric chars, commonly prefixed HM.
  if (/^HM[A-Z0-9]{6,}$/.test(ref)) return { code: 'airbnb', label: 'Airbnb' };

  // Expedia — 13-digit itinerary numbers.
  if (/^\d{13}$/.test(ref)) return { code: 'expedia', label: 'Expedia' };

  return null; // direct booking — no badge
}
