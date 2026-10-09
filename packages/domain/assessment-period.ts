export type AssessmentCadence = 'WEEKLY' | 'MONTHLY' | 'BOTH';
export type AssessmentKind = 'WEEKLY' | 'MONTHLY';

const DAY = 24 * 60 * 60 * 1000;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function manilaToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

export function assessmentPeriod(kind: AssessmentKind, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Choose a valid assessment date.');
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || isoDate(parsed) !== date) throw new Error('Choose a valid assessment date.');
  if (kind === 'MONTHLY') {
    const year = parsed.getUTCFullYear();
    const month = parsed.getUTCMonth();
    return { start: isoDate(new Date(Date.UTC(year, month, 1))), end: isoDate(new Date(Date.UTC(year, month + 1, 0))) };
  }
  const monday = new Date(parsed.getTime() - ((parsed.getUTCDay() + 6) % 7) * DAY);
  return { start: isoDate(monday), end: isoDate(new Date(monday.getTime() + 6 * DAY)) };
}

export function cadenceAllows(cadence: AssessmentCadence, kind: AssessmentKind) {
  return cadence === 'BOTH' || cadence === kind;
}
