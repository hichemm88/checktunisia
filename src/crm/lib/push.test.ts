// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { urlBase64ToUint8Array } from './push';

describe('urlBase64ToUint8Array', () => {
  it('decodes a standard base64 string (no URL-safe characters, no padding needed)', () => {
    // "AAECAw==" (base64 of [0,1,2,3]) with its padding stripped, as
    // navigator.pushManager keys/VAPID keys are always given to us.
    expect(Array.from(urlBase64ToUint8Array('AAECAw'))).toEqual([0, 1, 2, 3]);
  });

  it('restores padding for a length not a multiple of 4', () => {
    // "AA==" (base64 of [0]) with padding stripped down to "AA".
    expect(Array.from(urlBase64ToUint8Array('AA'))).toEqual([0]);
  });

  it('converts URL-safe characters (-, _) back to standard base64 (+, /) before decoding', () => {
    // 0xFB 0xFF 0xBF encodes to "-_-/" in URL-safe base64 (standard "+/+/").
    const standard = urlBase64ToUint8Array('Kz8r'.replace(/\+/g, '-').replace(/\//g, '_'));
    const expected = urlBase64ToUint8Array('Kz8r');
    expect(Array.from(standard)).toEqual(Array.from(expected));
  });

  it('round-trips a real-looking VAPID public key length (65 bytes, uncompressed EC point)', () => {
    const key = 'BIBVP8F-VijJvTEsHHfVnTEsMFJ7XyRsMGo1iHAglB6CIPHNRCan5hhGz67FM2WMlGwGVzTSEQaro7Qi0zlYZfA';
    const bytes = urlBase64ToUint8Array(key);
    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(0x04); // uncompressed EC point marker
  });
});
