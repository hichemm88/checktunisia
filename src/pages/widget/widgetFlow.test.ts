import { describe, expect, it } from 'vitest';
import {
  applyExtracted, formFromPrefill, initialTarget, openingStep, safeSession, toGuestInput, widgetBlockers,
} from './widgetFlow';

describe('opening step and counter', () => {
  it('opens on the scan of the next guest, whatever the mode', () => {
    expect(openingStep(0, 3)).toBe('scan');
    // Brouillon repris avec 1 voyageur déjà saisi sur 2 : scan du voyageur 2.
    expect(openingStep(1, 2)).toBe('scan');
  });

  it('opens on the list when every expected guest is already there', () => {
    expect(openingStep(2, 2)).toBe('list');
  });

  it('never expects fewer guests than already declared, and one more in amend', () => {
    expect(initialTarget(2, 0, 'create')).toBe(2);
    expect(initialTarget(1, 2, 'create')).toBe(2);
    expect(initialTarget(2, 2, 'amend')).toBe(3);
    expect(initialTarget(0, 0, 'create')).toBe(1);
  });
});

describe('prefill and scan merge', () => {
  it('a CIN scan is Tunisian by default', () => {
    const f = formFromPrefill(undefined, 'cin');
    expect(f.nationality_code).toBe('TUN');
    expect(f.issuing_country_code).toBe('TUN');
    expect(f.document_type).toBe('national_id');
  });

  it('keeps prefill names when the scan did not read them', () => {
    const base = formFromPrefill({ first_name: 'Amel', last_name: 'Ben Salah', nationality: 'TUN' }, 'cin');
    const { form, conf } = applyExtracted(base, { first_name: '', document_number: '01234567', sex: 'f' });
    expect(form.first_name).toBe('Amel');
    expect(form.last_name).toBe('Ben Salah');
    expect(form.sex).toBe('F');
    expect(form.document_number).toBe('01234567');
    expect(conf).toBeNull();
  });

  it('lets scanned values override prefill', () => {
    const base = formFromPrefill({ last_name: 'Martin' }, 'mrz');
    const { form } = applyExtracted(base, { last_name: 'MARTIN DUPONT', nationality_code: 'FRA', document_type: 'passport' });
    expect(form.last_name).toBe('MARTIN DUPONT');
    expect(form.nationality_code).toBe('FRA');
    expect(form.document_type).toBe('passport');
  });

  it('clears and flags a name that is a printed caption, like the app', () => {
    const { form, conf } = applyExtracted(formFromPrefill(undefined, 'mrz'), {
      last_name: 'ABEEXPEDIGAQIDATEOFISSUEAUTORIDADEAUTHO', first_name: 'JOAO',
    });
    expect(form.last_name).toBe('');
    expect(conf?.names).toBe('low');
    expect(widgetBlockers({ ...form, sex: 'M', date_of_birth: '1990-01-01', document_number: 'X', issuing_country_code: 'BRA' }, conf))
      .toContain('last_name');
  });
});

describe('blockers and payload', () => {
  const complete = {
    first_name: 'Amel', last_name: 'Ben Salah', date_of_birth: '1990-02-03', sex: 'F' as const,
    nationality_code: 'TUN', document_type: 'national_id', document_number: '01234567', issuing_country_code: 'TUN',
  };

  it('requires the sex on top of the app rules', () => {
    expect(widgetBlockers(complete, null)).toEqual([]);
    expect(widgetBlockers({ ...complete, sex: undefined }, null)).toEqual(['sex']);
    expect(widgetBlockers({ ...complete, document_number: '' }, null)).toEqual(['document_number']);
  });

  it('nests the document for the widget API', () => {
    const body = toGuestInput(complete, { mrz_line2: 'L2' }, 'scan-1');
    expect(body.document).toMatchObject({ type: 'national_id', document_number: '01234567', issuing_country_code: 'TUN', mrz_line2: 'L2' });
    expect(body.scan_id).toBe('scan-1');
    expect(toGuestInput(complete, {}, null).scan_id).toBeUndefined();
  });
});

describe('safeSession', () => {
  it('never throws when storage is unavailable', () => {
    expect(safeSession.get('k')).toBeNull();
    expect(() => safeSession.set('k', 'v')).not.toThrow();
    expect(() => safeSession.remove('k')).not.toThrow();
  });
});
