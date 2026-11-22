import { describe, expect, it } from 'vitest';
import { defaultScanType, flowProgress, guestFromPrefill, mergeExtracted, safeSession } from './widgetFlow';

describe('flowProgress', () => {
  it('starts on guest 1 of 3, not last, no partial submit', () => {
    expect(flowProgress(0, 0, 3)).toEqual({ current: 1, isLast: false, canSubmitPartial: false });
  });

  it('offers partial submit once a guest was added here', () => {
    expect(flowProgress(1, 1, 3)).toEqual({ current: 2, isLast: false, canSubmitPartial: true });
  });

  it('marks the last expected guest', () => {
    expect(flowProgress(2, 2, 3).isLast).toBe(true);
    expect(flowProgress(0, 0, 1).isLast).toBe(true);
  });

  it('counts amend guests towards the target without enabling partial submit alone', () => {
    expect(flowProgress(2, 0, 3)).toEqual({ current: 3, isLast: true, canSubmitPartial: false });
  });

  it('no partial link once the target is reached', () => {
    expect(flowProgress(3, 3, 3).canSubmitPartial).toBe(false);
  });
});

describe('prefill and scan merge', () => {
  it('defaults to CIN only for a Tunisian prefill', () => {
    expect(defaultScanType({ nationality: 'TUN' })).toBe('cin');
    expect(defaultScanType({ nationality: 'tn' })).toBe('cin');
    expect(defaultScanType({ nationality: 'FRA' })).toBe('passport');
    expect(defaultScanType(undefined)).toBe('passport');
  });

  it('keeps prefill names when the scan did not read them', () => {
    const base = guestFromPrefill({ first_name: 'Amel', last_name: 'Ben Salah', nationality: 'TUN', id_document_type: 'cin' }, 'cin');
    const merged = mergeExtracted(base, { first_name: '', document_number: '01234567', sex: 'f' });
    expect(merged.first_name).toBe('Amel');
    expect(merged.last_name).toBe('Ben Salah');
    expect(merged.sex).toBe('F');
    expect(merged.document.type).toBe('national_id');
    expect(merged.document.document_number).toBe('01234567');
  });

  it('lets scanned values override prefill', () => {
    const base = guestFromPrefill({ last_name: 'Martin' }, 'passport');
    const merged = mergeExtracted(base, { last_name: 'MARTIN DUPONT', nationality_code: 'FRA', document_type: 'passport' });
    expect(merged.last_name).toBe('MARTIN DUPONT');
    expect(merged.nationality_code).toBe('FRA');
    expect(merged.document.type).toBe('passport');
  });
});

describe('safeSession', () => {
  it('never throws when storage is unavailable', () => {
    expect(safeSession.get('k')).toBeNull();
    expect(() => safeSession.set('k', 'v')).not.toThrow();
    expect(() => safeSession.remove('k')).not.toThrow();
  });
});
