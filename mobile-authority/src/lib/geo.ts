import * as Location from 'expo-location';

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
}

/**
 * Permission localisation « pendant l'utilisation ».
 * IMPORTANT (§9.4) : demandée au premier scan avec une explication claire,
 * jamais au lancement de l'app.
 */
export async function ensureLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') return true;
    const req = await Location.requestForegroundPermissionsAsync();
    return req.status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Position courante pour tracer une vérification / un contrôle dans l'audit log.
 * Retourne null si la permission est refusée ou la position indisponible —
 * l'action est tout de même tracée, avec « position non enregistrée ».
 */
export async function captureLocation(): Promise<GeoPoint | null> {
  try {
    const granted = await ensureLocationPermission();
    if (!granted) return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/**
 * Position UNIQUEMENT si la permission est déjà accordée — ne déclenche aucun
 * prompt (le tri par proximité de la liste établissements ne doit pas demander
 * la permission au lancement, cf. §9.4). Retourne null sinon → tri alphabétique.
 */
export async function getLocationIfGranted(): Promise<GeoPoint | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/** Distance approximative (km) — tri des établissements par proximité (F4). */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
