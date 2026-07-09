import { api } from '@/lib/api';
import { AuthUser } from '@/stores/authStore';

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

  logout: () => api.post('/auth/logout'),

  me: () => api.get<{ data: AuthUser }>('/auth/me').then((r) => r.data.data),

  // 2FA — verify partial token with TOTP code → returns full token + user
  verify2FA: (partialToken: string, code: string) =>
    api
      .post<{ data: LoginResult }>(
        '/auth/2fa/verify',
        { code },
        { headers: { Authorization: `Bearer ${partialToken}` } }
      )
      .then((r) => r.data.data),

  // 2FA setup — get secret + QR URI
  get2FASetup: () =>
    api
      .get<{ data: { secret: string; qr_uri: string; already_enabled: boolean } }>('/auth/2fa/setup')
      .then((r) => r.data.data),

  // 2FA setup — confirm with first TOTP code
  confirm2FASetup: (code: string) =>
    api
      .post<{ data: { enabled: boolean } }>('/auth/2fa/setup/confirm', { code })
      .then((r) => r.data.data),

  // 2FA disable
  disable2FA: (code: string) =>
    api
      .delete<{ data: { disabled: boolean } }>('/auth/2fa/setup', { data: { code } })
      .then((r) => r.data.data),

  // Profile — update name/phone
  updateProfile: (data: { first_name?: string; last_name?: string; phone?: string }) =>
    api
      .patch<{ data: { id: string; email: string; first_name: string; last_name: string; phone: string | null } }>(
        '/profile',
        data,
      )
      .then((r) => r.data.data),

  // Profile — change password (revokes other sessions)
  changePassword: (data: { current_password: string; password: string; password_confirmation: string }) =>
    api
      .post<{ data: { message: string } }>('/profile/password', data)
      .then((r) => r.data.data),

  // Request a password-reset link by email (always succeeds — no enumeration).
  forgotPassword: (email: string) =>
    api
      .post<{ data: { message: string } }>('/auth/password/forgot', { email })
      .then((r) => r.data.data),

  // Set/reset password via an emailed token (account invite or "forgot password")
  resetPassword: (data: { email: string; token: string; password: string; password_confirmation: string }) =>
    api
      .post<{ data: { message: string } }>('/auth/password/reset', data)
      .then((r) => r.data.data),
};
