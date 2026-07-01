import { api } from '@/lib/api';
import { HotelUser, CreateUserPayload, UpdateProfilePayload, ChangePasswordPayload } from '@/types';

export const settingsApi = {
  // Profile
  updateProfile: (payload: UpdateProfilePayload) =>
    api.patch<{ data: { first_name: string; last_name: string; email: string } }>('/profile', payload)
      .then((r) => r.data.data),

  changePassword: (payload: ChangePasswordPayload) =>
    api.post('/profile/password', payload),

  // Hotel users (hotel_admin only)
  getUsers: () =>
    api.get<{ data: HotelUser[] }>('/hotel/users').then((r) => r.data.data),

  createUser: (payload: CreateUserPayload) =>
    api.post<{ data: HotelUser }>('/hotel/users', payload).then((r) => r.data.data),

  updateUser: (id: string, payload: Partial<CreateUserPayload & { is_active: boolean }>) =>
    api.patch<{ data: HotelUser }>(`/hotel/users/${id}`, payload).then((r) => r.data.data),

  deleteUser: (id: string) =>
    api.delete(`/hotel/users/${id}`),

  // Subscription info — backend returns plan as nested SubscriptionPlan object
  getSubscription: () =>
    api.get<{ data: { status: string; plan: { name: string } | string | null; expires_at: string; days_remaining: number } }>('/hotel/subscription')
      .then((r) => r.data.data),
};
