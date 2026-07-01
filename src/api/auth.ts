import { api } from '@/lib/api';
import { AuthUser } from '@/stores/authStore';

export interface LoginResponse {
  data: { token: string; token_type: string; expires_at: string; user: AuthUser };
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data.data),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<{ data: AuthUser }>('/auth/me').then((r) => r.data.data),
};
