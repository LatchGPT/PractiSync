import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Row} from '../packages/validation/contracts';
import DtrHistoryTable from '../app/dtr-history-table';
import {getHolidayLabel, getPhilippineHolidays} from '../app/ph-holidays';

const entry = (
  id: string,
  date: string,
  minutes: number,
  startsAt = '2026-10-02T08:00:00+08:00',
  endsAt = '2026-10-02T17:00:00+08:00',
  breakMinutes = 60,
  narrative = 'Sprint development and code review',
  version = 1,
  confirmedVersion: number | null = null,
) =>
  ({
    id,
    date,
    minutes,
    startsAt,
    endsAt,
    breakMinutes,
    narrative,
    version,
    confirmedVersion,
    placementId: 'place-1',
    tenantId: 'demo',
    createdAt: date,
  }) as Row;

describe('Philippine holidays detection', () => {
  it('identifies fixed national holidays', () => {
    expect(getHolidayLabel('2026-01-01')).toBe("New Year's Day");
    expect(getHolidayLabel('2026-06-12')).toBe('Independence Day');
    expect(getHolidayLabel('2026-12-25')).toBe('Christmas Day');
    expect(getHolidayLabel('2026-12-30')).toBe('Rizal Day');
  });

  it('identifies movable holidays including Easter-dependent and National Heroes Day', () => {
    const holidays2026 = getPhilippineHolidays(2026);
    expect(holidays2026.size).toBeGreaterThan(10);
    expect(holidays2026.get('2026-08-31')).toBe('National Heroes Day');
  });

  it('returns empty string for normal work days', () => {
    expect(getHolidayLabel('2026-10-15')).toBe('');
  });
});

describe('DTR history table component', () => {
  const entries: Row[] = [
    entry('1', '2026-10-01', 480, '2026-10-01T08:00:00+08:00', '2026-10-01T17:00:00+08:00', 60, 'Tasks', 1, 1),
    entry('2', '2026-12-25', 540, '2026-12-25T08:00:00+08:00', '2026-12-25T18:00:00+08:00', 60, 'Christmas holiday overtime', 1, null),
  ];

  it('renders table card container with DTRNILATCH structure', () => {
    const html = renderToStaticMarkup(
      createElement(DtrHistoryTable, {
        entries,
        role: 'STUDENT',
        placement: () => ({studentName: 'Lei Vicente'} as unknown as Row),
        fmtDate: (d: string) => d,
        fmtTime: (t: string) => t.slice(11, 16),
        hours: (m: number) => Number((m / 60).toFixed(1)),
        onView: () => {},
        s: (r: Row, k: string) => String(r[k] ?? ''),
        n: (r: Row, k: string) => Number(r[k] ?? 0),
      })
    );

    expect(html).toContain('table-card');
    expect(html).toContain('table-card-header');
    expect(html).toContain('table-wrap');
    expect(html).toContain('Time Log History &amp; Daily Records');
    expect(html).toContain('Philippine Standard Time');
    expect(html).toContain('Confirmed');
    expect(html).toContain('Self-reported');
    expect(html).toContain('+1h'); // Overtime badge for 540m (9h - 8h = 1h OT)
    expect(html).toContain('Christmas Day'); // Holiday flag for 2026-12-25
  });

  it('renders student column for coordinators and super admins', () => {
    const html = renderToStaticMarkup(
      createElement(DtrHistoryTable, {
        entries,
        role: 'COORDINATOR',
        placement: () => ({studentName: 'Lei Vicente'} as unknown as Row),
        fmtDate: (d: string) => d,
        fmtTime: (t: string) => t.slice(11, 16),
        hours: (m: number) => Number((m / 60).toFixed(1)),
        onView: () => {},
        s: (r: Row, k: string) => String(r[k] ?? ''),
        n: (r: Row, k: string) => Number(r[k] ?? 0),
      })
    );

    expect(html).toContain('Lei Vicente');
    expect(html).toContain('Student');
  });

  it('renders empty state when no records exist', () => {
    const html = renderToStaticMarkup(
      createElement(DtrHistoryTable, {
        entries: [],
        role: 'STUDENT',
        placement: () => undefined,
        fmtDate: (d: string) => d,
        fmtTime: (t: string) => t,
        hours: (m: number) => m,
        onView: () => {},
        s: (r: Row, k: string) => String(r[k] ?? ''),
        n: (r: Row, k: string) => Number(r[k] ?? 0),
      })
    );

    expect(html).toContain('table-empty');
    expect(html).toContain('No attendance records found');
  });
});
