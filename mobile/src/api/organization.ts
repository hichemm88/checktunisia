import { api } from '@/lib/api';
import type { OrgInfo, Property, MyProperty } from '@/types';

export const organizationApi = {
  get: () => api.get<{ data: OrgInfo }>('/hotel/organization').then((r) => r.data.data),

  /** Properties the current account is attached to — feeds the active-property switcher. */
  myProperties: () =>
    api.get<{ data: MyProperty[] }>('/hotel/my-properties').then((r) => r.data.data),

  properties: () =>
    api.get<{ data: Property[] }>('/hotel/organization/properties').then((r) => r.data.data),
};
