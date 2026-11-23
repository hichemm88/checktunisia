import { describe, expect, it } from 'vitest';
import { toggleWebhookEvent } from './partners';

describe('toggleWebhookEvent', () => {
  it('adds an event in reference order', () => {
    expect(toggleWebhookEvent(['fiche.submitted', 'session.expired'], 'fiche.delivered'))
      .toEqual(['fiche.submitted', 'session.expired', 'fiche.delivered']);
    expect(toggleWebhookEvent(['fiche.delivered'], 'fiche.submitted')).toEqual(['fiche.submitted', 'fiche.delivered']);
  });

  it('removes a subscribed event', () => {
    expect(toggleWebhookEvent(['fiche.submitted', 'fiche.delivered'], 'fiche.delivered')).toEqual(['fiche.submitted']);
  });
});
