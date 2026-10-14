import { describe, expect, it } from 'vitest';
import { assessmentPeriod, cadenceAllows, manilaToday } from '../packages/domain/assessment-period';

describe('competency assessment periods', () => {
  it('uses Monday to Sunday across a year boundary', () => {
    expect(assessmentPeriod('WEEKLY', '2026-01-01')).toEqual({ start: '2025-12-29', end: '2026-01-04' });
  });

  it('handles leap-month boundaries and rejects nonexistent dates', () => {
    expect(assessmentPeriod('MONTHLY', '2024-02-29')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(() => assessmentPeriod('MONTHLY', '2026-02-29')).toThrow('valid');
  });

  it('uses Philippine dates and only permits configured cadences', () => {
    expect(manilaToday(new Date('2026-10-08T17:00:00Z'))).toBe('2026-10-09');
    expect(cadenceAllows('BOTH', 'MONTHLY')).toBe(true);
    expect(cadenceAllows('WEEKLY', 'MONTHLY')).toBe(false);
  });
});
