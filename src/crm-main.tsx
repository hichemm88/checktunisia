import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { crmQueryClient } from '@/crm/lib/queryClient';
import { CrmApp } from '@/crm/App';
import '@/crm/index.css';

createRoot(document.getElementById('crm-root')!).render(
  <StrictMode>
    <QueryClientProvider client={crmQueryClient}>
      <BrowserRouter>
        <CrmApp />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
