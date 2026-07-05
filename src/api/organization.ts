import { api } from '@/lib/api';

export interface Property {
  id: string;
  name: string;
  type: string;
  room_count: number;
  stars: number | null;
  status: string;
  registration_number: string | null;
  address: { line1: string; city: string; governorate: string } | null;
}

export interface OrgInfo {
  id: string | null;
  name: string;
  entity_type: 'company' | 'individual';
  registration_number: string | null;
  contact_email: string;
  contact_phone: string | null;
  address: { line1?: string; city?: string; governorate?: string } | null;
  status: string;
  properties: Property[];
  total_rooms: number;
}

export interface PropertyRoom {
  id: string;
  hotel_id: string;
  number: string;
  floor: number | null;
  type: string;
  capacity: number;
  status: string;
}

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  hotel:        'Hôtel',
  guesthouse:   "Maison d'hôtes",
  appartement:  'Appartement',
  villa:        'Villa',
  riad:         'Riad',
  maison_hotes: "Maison d'hôtes",
  hostel:       'Auberge de jeunesse',
  resort:       'Resort',
  bungalow:     'Bungalow',
  rental:       'Location saisonnière',
  residence:    'Résidence hôtelière',
};

/** Returns the human-readable label for a property type, defaulting to 'Établissement'. */
export const getPropertyTypeName = (type?: string | null): string =>
  PROPERTY_TYPE_LABELS[type ?? ''] ?? 'Établissement';

export const ROOM_TYPE_LABELS: Record<string, string> = {
  single:       'Chambre simple',
  double:       'Chambre double',
  twin:         'Chambre twin',
  triple:       'Chambre triple',
  quadruple:    'Chambre quadruple',
  suite:        'Suite',
  junior_suite: 'Suite junior',
  apartment:    'Appartement',
  studio:       'Studio',
  family:       'Familiale',
  villa:        'Villa',
  dormitory:    'Dortoir',
  standard:     'Standard',
};

export const organizationApi = {
  // ── Org ──────────────────────────────────────────────────────────────
  get:          () => api.get<{ data: OrgInfo }>('/hotel/organization').then((r) => r.data.data),
  update:       (data: Partial<OrgInfo>) => api.patch('/hotel/organization', data).then((r) => r.data),

  // ── Properties ───────────────────────────────────────────────────────
  properties:    () => api.get<{ data: Property[] }>('/hotel/organization/properties').then((r) => r.data.data),
  addProperty:   (data: object) => api.post<{ data: Property }>('/hotel/organization/properties', data).then((r) => r.data.data),
  updateProperty:(id: string, data: object) => api.patch<{ data: Property }>(`/hotel/organization/properties/${id}`, data).then((r) => r.data.data),
  deleteProperty:(id: string) => api.delete(`/hotel/organization/properties/${id}`),

  // ── Rooms per property ────────────────────────────────────────────────
  rooms:             (propertyId: string) =>
    api.get<{ data: PropertyRoom[] }>(`/hotel/organization/properties/${propertyId}/rooms`).then((r) => r.data.data),
  addRoom:           (propertyId: string, data: object) =>
    api.post<{ data: PropertyRoom }>(`/hotel/organization/properties/${propertyId}/rooms`, data).then((r) => r.data.data),
  updateRoom:        (propertyId: string, roomId: string, data: object) =>
    api.patch<{ data: PropertyRoom }>(`/hotel/organization/properties/${propertyId}/rooms/${roomId}`, data).then((r) => r.data.data),
  deleteRoom:        (propertyId: string, roomId: string) =>
    api.delete(`/hotel/organization/properties/${propertyId}/rooms/${roomId}`),
};
