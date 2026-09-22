import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

export const crmQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (status !== undefined && status < 500) return false;

        return failureCount < 2;
      },
    },
  },
});
