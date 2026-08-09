import { describe, expect, it } from 'vitest';
import {
  INVOICE_STATUSES,
  invoiceStatusLabelKey,
  invoiceStatusTone,
  isInvoiceOpen,
} from './invoiceStatus';

describe('statut de facture', () => {
  it('couvre exactement les statuts que le backend sait produire', () => {
    expect([...INVOICE_STATUSES]).toEqual(['draft', 'sent', 'paid', 'overdue', 'void']);
  });

  it('donne une clé de traduction pour chaque statut réel', () => {
    for (const status of INVOICE_STATUSES) {
      const key = invoiceStatusLabelKey(status);

      expect(key).not.toBeNull();
      // Les libellés existent déjà en fr/en/ar sous ce préfixe : on les
      // réutilise plutôt que de traduire deux fois la même chose.
      expect(key).toMatch(/^adminFacturation\.status[A-Z]/);
    }
  });

  it('ne rend jamais deux statuts sous le même libellé', () => {
    const keys = INVOICE_STATUSES.map(invoiceStatusLabelKey);

    expect(new Set(keys).size).toBe(INVOICE_STATUSES.length);
  });

  it('laisse un statut inconnu sans clé, pour que l’appelant retombe sur la valeur brute', () => {
    // Mieux vaut afficher « something_new » que d’inventer une traduction ou
    // de laisser un vide : le client doit voir qu’il se passe quelque chose.
    expect(invoiceStatusLabelKey('something_new')).toBeNull();
    expect(invoiceStatusLabelKey('')).toBeNull();
  });

  it('associe une teinte lisible à chaque statut', () => {
    expect(invoiceStatusTone('paid')).toBe('active');
    expect(invoiceStatusTone('overdue')).toBe('expired');
    expect(invoiceStatusTone('void')).toBe('suspended');
    expect(invoiceStatusTone('draft')).toBe('draft');
    expect(invoiceStatusTone('sent')).toBe('draft');
  });

  it('ne prétend jamais qu’un statut inconnu est réglé', () => {
    expect(invoiceStatusTone('something_new')).not.toBe('active');
  });

  describe('facture encore à régler', () => {
    it('reste ouverte tant qu’elle n’est ni payée ni annulée', () => {
      expect(isInvoiceOpen('draft')).toBe(true);
      expect(isInvoiceOpen('sent')).toBe(true);
      expect(isInvoiceOpen('overdue')).toBe(true);
    });

    it('se ferme une fois payée ou annulée', () => {
      expect(isInvoiceOpen('paid')).toBe(false);
      expect(isInvoiceOpen('void')).toBe(false);
    });
  });
});
