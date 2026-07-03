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
  id: string;
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
};

export const organizationApi = {
  get:          () => api.get<{ data: OrgInfo }>('/hotel/organization').then((r) => r.data.data),
  update:       (data: Partial<OrgInfo>) => api.patch('/hotel/organization', data),
  properties:   () => api.get<{ data: Property[] }>('/hotel/organization/properties').then((r) => r.data.data),
  addProperty:  (data: object) => api.post<{ data: Property }>('/hotel/organization/properties', data).then((r) => r.data.data),
};
