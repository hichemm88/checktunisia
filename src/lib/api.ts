import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally → logout
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export const extractErrors = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const errors = err.response?.data?.errors;
    if (Array.isArray(errors) && errors.length > 0) return errors[0].message;
    return err.response?.data?.message ?? err.message;
  }
  return 'An unexpected error occurred.';
};
