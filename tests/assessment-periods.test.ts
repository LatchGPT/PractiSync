import { describe, it, expect } from 'vitest';
import {
  getPhilippineDateString,
  parseIsoWeek,
  parseMonth,
  formatPeriodLabel,
  getAvailablePeriods,
  validatePeriodBoundary,
} from '../packages/domain/assessment-periods';

describe('assessment-periods utility', () => {
  it('formats dates in Philippine Time (UTC+8)', () => {
    // 2026-10-09 15:30 UTC = 2026-10-09 23:30 in Manila (+8)
    const d1 = new Date('2026-10-09T15:30:00Z');
    expect(getPhilippineDateString(d1)).toBe('2026-10-09');

    // 2026-10-09 17:00 UTC = 2026-10-10 01:00 in Manila (+8)
    const d2 = new Date('2026-10-09T17:00:00Z');
    expect(getPhilippineDateString(d2)).toBe('2026-10-10');
  });

  it('parses calendar weeks running strictly Monday through Sunday', () => {
    const w36 = parseIsoWeek('2026-W36');
    expect(w36).not.toBeNull();
    expect(w36?.startDate).toBe('2026-08-31'); // Monday
    expect(w36?.endDate).toBe('2026-09-06'); // Sunday
    expect(w36?.label).toContain('Week 36');

    // Day of week check: Monday=1, Sunday=0 in getUTCDay()
    const mon = new Date(w36!.startDate + 'T00:00:00Z');
    expect(mon.getUTCDay()).toBe(1); // Monday
    const sun = new Date(w36!.endDate + 'T00:00:00Z');
    expect(sun.getUTCDay()).toBe(0); // Sunday
  });

  it('parses calendar months in Philippine calendar', () => {
    const m = parseMonth('2026-09');
    expect(m).not.toBeNull();
    expect(m?.startDate).toBe('2026-09-01');
    expect(m?.endDate).toBe('2026-09-30');
    expect(m?.label).toBe('September 2026');

    const mFeb = parseMonth('2026-02');
    expect(mFeb?.startDate).toBe('2026-02-01');
    expect(mFeb?.endDate).toBe('2026-02-28');
  });

  it('formats labels for weekly, monthly, and legacy assessments', () => {
    expect(formatPeriodLabel('WEEKLY', '2026-W36')).toContain('Week 36');
    expect(formatPeriodLabel('MONTHLY', '2026-09')).toBe('September 2026');
    expect(formatPeriodLabel('BASELINE', null)).toContain('Baseline');
    expect(formatPeriodLabel('FINAL', null)).toContain('Final');
  });

  it('generates only eligible current or past periods within placement dates', () => {
    const fakeNow = new Date('2026-10-09T12:00:00Z'); // Friday of Week 41
    const weeklyPeriods = getAvailablePeriods({
      kind: 'WEEKLY',
      startsAt: '2026-08-01',
      endsAt: '2026-12-20',
      now: fakeNow,
    });

    expect(weeklyPeriods.length).toBeGreaterThan(0);
    // Earliest week overlaps 2026-08-01
    expect(weeklyPeriods[0].id).toBe('2026-W31');
    // Latest week is current week (Week 41)
    const latest = weeklyPeriods[weeklyPeriods.length - 1];
    expect(latest.id).toBe('2026-W41');
    expect(latest.isCurrent).toBe(true);

    // Future weeks (Week 42+) are not generated
    expect(weeklyPeriods.some((p) => p.id === '2026-W42')).toBe(false);

    // Monthly periods
    const monthlyPeriods = getAvailablePeriods({
      kind: 'MONTHLY',
      startsAt: '2026-08-01',
      endsAt: '2026-12-20',
      now: fakeNow,
    });
    expect(monthlyPeriods.map((p) => p.id)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(monthlyPeriods[2].isCurrent).toBe(true);
    // Future months (November, December) are not generated
    expect(monthlyPeriods.some((p) => p.id === '2026-11')).toBe(false);
  });

  it('validates period boundary and enforces placement dates and future check', () => {
    const fakeNow = new Date('2026-10-09T12:00:00Z');
    // Valid past week
    expect(() =>
      validatePeriodBoundary({
        kind: 'WEEKLY',
        period: '2026-W38',
        startsAt: '2026-08-01',
        endsAt: '2026-12-20',
        now: fakeNow,
      })
    ).not.toThrow();

    // Valid current week
    expect(() =>
      validatePeriodBoundary({
        kind: 'WEEKLY',
        period: '2026-W41',
        startsAt: '2026-08-01',
        endsAt: '2026-12-20',
        now: fakeNow,
      })
    ).not.toThrow();

    // Future week (Week 42 starts Oct 12, after fakeNow Oct 09)
    expect(() =>
      validatePeriodBoundary({
        kind: 'WEEKLY',
        period: '2026-W42',
        startsAt: '2026-08-01',
        endsAt: '2026-12-20',
        now: fakeNow,
      })
    ).toThrow('future');

    // Week before placement starts
    expect(() =>
      validatePeriodBoundary({
        kind: 'WEEKLY',
        period: '2026-W30',
        startsAt: '2026-08-01',
        endsAt: '2026-12-20',
        now: fakeNow,
      })
    ).toThrow('outside your placement');

    // Invalid format
    expect(() =>
      validatePeriodBoundary({
        kind: 'WEEKLY',
        period: 'invalid-week',
        startsAt: '2026-08-01',
        endsAt: '2026-12-20',
        now: fakeNow,
      })
    ).toThrow('Invalid weekly period format');
  });
});
