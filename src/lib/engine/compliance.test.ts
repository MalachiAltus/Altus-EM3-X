import { qualificationStatus } from './compliance';

describe('qualification expiry status', () => {
  test('no expiry date on file is "missing"', () => {
    expect(qualificationStatus(null, '2026-08-23')).toBe('missing');
    expect(qualificationStatus(undefined, '2026-08-23')).toBe('missing');
  });

  test('expiry date in the past is "expired"', () => {
    expect(qualificationStatus('2026-02-04', '2026-08-23')).toBe('expired');
  });

  test('expiry within the warn window is "expiring"', () => {
    expect(qualificationStatus('2026-09-10', '2026-08-23')).toBe('expiring'); // 18 days out
    expect(qualificationStatus('2026-09-22', '2026-08-23')).toBe('expiring'); // exactly 30 days
  });

  test('expiry well beyond the warn window is "valid"', () => {
    expect(qualificationStatus('2027-03-12', '2026-08-23')).toBe('valid');
  });

  test('expiring today counts as expiring, not expired', () => {
    expect(qualificationStatus('2026-08-23', '2026-08-23')).toBe('expiring');
  });

  test('a custom warn window is respected', () => {
    expect(qualificationStatus('2026-09-10', '2026-08-23', { warnDays: 7 })).toBe('valid');
    expect(qualificationStatus('2026-08-28', '2026-08-23', { warnDays: 7 })).toBe('expiring');
  });
});
