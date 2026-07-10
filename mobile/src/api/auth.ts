import { api } from '@/lib/api';
import type { AuthUser } from '@/types';

export interface LoginResult {
  token: string;
  token_type: string;
  expires_at: string;
  user: AuthUser;
  requires_2fa?: false;
}

export interface Login2FAResult {
  requires_2fa: true;
  partial_token: string;
  token_type: string;
  expires_in: number;
  user: null;
}

export type LoginResponse = LoginResult | Login2FAResult;

export const authApi = {
  login: (email: string, password: string) =>
    api
      .post<{ data: LoginResponse }>('/auth/login', { email, password })
      .then((r) => r.data.data),

  logout: () => api.post('/auth/logout').catch(() => undefined),

  me: () => api.get<{ data: AuthUser }>('/auth/me').then((r) => r.data.data),

  refresh: () =>
    api
      .post<{ data: { token: string; expires_at: string } }>('/auth/refresh')
      .then((r) => r.data.data),
};
