import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { crmQueryClient } from '@/crm/lib/queryClient';
import { CrmApp } from '@/crm/App';
import '@/crm/index.css';

// Notifications push (§ Notifications push) : le service worker doit être
// enregistré au chargement, pas seulement au moment de s'abonner — c'est lui
// qui reçoit les push même app fermée, une fois l'abonnement créé une
// première fois depuis Réglages.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Safari en navigation privée, contexte non sécurisé en dev sur IP LAN...
    // l'app reste utilisable sans notifications, ce n'est jamais bloquant.
  });
}

createRoot(document.getElementById('crm-root')!).render(
  <StrictMode>
    <QueryClientProvider client={crmQueryClient}>
      <BrowserRouter>
        <CrmApp />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
