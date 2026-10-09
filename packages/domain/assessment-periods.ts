import { DomainError } from './policies';

export type AssessmentKind = 'WEEKLY' | 'MONTHLY' | 'BASELINE' | 'FINAL';
export type AssessmentCadence = 'WEEKLY' | 'MONTHLY' | 'BOTH';

export interface PeriodInfo {
  id: string; // '2026-W36' or '2026-09'
  kind: 'WEEKLY' | 'MONTHLY';
  startDate: string; // '2026-08-31'
  endDate: string; // '2026-09-06'
  label: string; // 'Week 36 (Aug 31 – Sep 6, 2026)' or 'September 2026'
  isCurrent: boolean;
}

/**
 * Returns current date string (YYYY-MM-DD) in Philippine Time (UTC+8).
 */
export function getPhilippineDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(d);
}

/**
 * Parse an ISO week identifier (YYYY-Www) and calculate its Monday start and Sunday end dates.
 */
export function parseIsoWeek(period: string): { year: number; week: number; startDate: string; endDate: string; label: string } | null {
  const m = period.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const week = parseInt(m[2], 10);
  if (week < 1 || week > 53) return null;

  // Jan 4th is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const mon1 = new Date(Date.UTC(year, 0, 4 - (day - 1)));
  const mon = new Date(mon1.getTime() + (week - 1) * 7 * 86400000);
  const sun = new Date(mon.getTime() + 6 * 86400000);

  const startDate = mon.toISOString().slice(0, 10);
  const endDate = sun.toISOString().slice(0, 10);

  const monLabel = mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const sunLabel = sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const label = `Week ${week} (${monLabel} – ${sunLabel})`;

  return { year, week, startDate, endDate, label };
}

/**
 * Parse a monthly identifier (YYYY-MM) and calculate its first and last date.
 */
export function parseMonth(period: string): { year: number; month: number; startDate: string; endDate: string; label: string } | null {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  const label = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return { year, month, startDate, endDate, label };
}

/**
 * Formats a period string into a user-friendly label.
 */
export function formatPeriodLabel(kind: string, period: string | null | undefined): string {
  if (!period) return kind === 'BASELINE' ? 'Baseline (Initial)' : kind === 'FINAL' ? 'Final Evaluation' : 'Legacy / Baseline';
  if (kind === 'WEEKLY') {
    const info = parseIsoWeek(period);
    return info ? info.label : period;
  }
  if (kind === 'MONTHLY') {
    const info = parseMonth(period);
    return info ? info.label : period;
  }
  return period;
}

/**
 * Generates all eligible current or past assessment periods within a student's placement dates in Philippine time.
 */
export function getAvailablePeriods(options: {
  kind: 'WEEKLY' | 'MONTHLY';
  startsAt: string;
  endsAt: string;
  now?: Date;
}): PeriodInfo[] {
  const currentDateStr = getPhilippineDateString(options.now ?? new Date());
  const periods: PeriodInfo[] = [];

  if (options.kind === 'WEEKLY') {
    const startDateObj = new Date(options.startsAt + 'T00:00:00Z');
    const startDay = startDateObj.getUTCDay() || 7;
    let cursor = new Date(startDateObj.getTime() - (startDay - 1) * 86400000);

    const currDateObj = new Date(currentDateStr + 'T00:00:00Z');
    const currDay = currDateObj.getUTCDay() || 7;
    const currMon = new Date(currDateObj.getTime() - (currDay - 1) * 86400000);

    const endDateObj = new Date(options.endsAt + 'T00:00:00Z');

    while (cursor.getTime() <= currMon.getTime() && cursor.getTime() <= endDateObj.getTime()) {
      const d = new Date(cursor);
      const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
      const dayNum = jan4.getUTCDay() || 7;
      const weekStart1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4 - (dayNum - 1)));
      const diff = cursor.getTime() - weekStart1.getTime();
      let weekYear = d.getUTCFullYear();
      let weekNo = Math.round(diff / (7 * 86400000)) + 1;
      if (weekNo < 1) {
        weekYear -= 1;
        weekNo = 52;
      }
      const weekId = `${weekYear}-W${String(weekNo).padStart(2, '0')}`;
      const weekInfo = parseIsoWeek(weekId);
      if (weekInfo && weekInfo.endDate >= options.startsAt && weekInfo.startDate <= options.endsAt) {
        const isCurrent = currentDateStr >= weekInfo.startDate && currentDateStr <= weekInfo.endDate;
        periods.push({
          id: weekId,
          kind: 'WEEKLY',
          startDate: weekInfo.startDate,
          endDate: weekInfo.endDate,
          label: weekInfo.label,
          isCurrent,
        });
      }
      cursor = new Date(cursor.getTime() + 7 * 86400000);
    }
  } else if (options.kind === 'MONTHLY') {
    let y = parseInt(options.startsAt.slice(0, 4), 10);
    let m = parseInt(options.startsAt.slice(5, 7), 10);
    const currY = parseInt(currentDateStr.slice(0, 4), 10);
    const currM = parseInt(currentDateStr.slice(5, 7), 10);
    const endY = parseInt(options.endsAt.slice(0, 4), 10);
    const endM = parseInt(options.endsAt.slice(5, 7), 10);

    while (
      (y < currY || (y === currY && m <= currM)) &&
      (y < endY || (y === endY && m <= endM))
    ) {
      const monthId = `${y}-${String(m).padStart(2, '0')}`;
      const info = parseMonth(monthId);
      if (info && info.endDate >= options.startsAt && info.startDate <= options.endsAt) {
        const isCurrent = currentDateStr.startsWith(monthId);
        periods.push({
          id: monthId,
          kind: 'MONTHLY',
          startDate: info.startDate,
          endDate: info.endDate,
          label: info.label,
          isCurrent,
        });
      }
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
  }

  return periods;
}

/**
 * Validates that an assessment period is within the placement date boundary and is not in the future.
 */
export function validatePeriodBoundary(options: {
  kind: 'WEEKLY' | 'MONTHLY';
  period: string;
  startsAt: string;
  endsAt: string;
  now?: Date;
}): { startDate: string; endDate: string } {
  const currentDateStr = getPhilippineDateString(options.now ?? new Date());
  let info: { startDate: string; endDate: string } | null = null;

  if (options.kind === 'WEEKLY') {
    const w = parseIsoWeek(options.period);
    if (!w) throw new DomainError('Invalid weekly period format. Expected format: YYYY-Www (e.g. 2026-W36).');
    info = w;
  } else if (options.kind === 'MONTHLY') {
    const m = parseMonth(options.period);
    if (!m) throw new DomainError('Invalid monthly period format. Expected format: YYYY-MM (e.g. 2026-09).');
    info = m;
  } else {
    throw new DomainError('Unsupported assessment kind.');
  }

  if (info.endDate < options.startsAt || info.startDate > options.endsAt) {
    throw new DomainError('Selected assessment period falls outside your placement dates.');
  }

  if (info.startDate > currentDateStr) {
    throw new DomainError('Cannot submit an assessment for a future period.');
  }

  return info;
}
