/**
 * Philippine National & Observance Holidays detector
 * Aligned with Philippine Standard Time (UTC+8) and DTR calculation conventions.
 */

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function shiftDateUtc(baseDateUtc: Date, days: number): string {
  const d = new Date(baseDateUtc);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function lastMondayOfAugust(year: number): string {
  const d = new Date(Date.UTC(year, 7, 31));
  while (d.getUTCDay() !== 1) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

const FIXED_PH_HOLIDAYS: [string, string][] = [
  ['01-01', "New Year's Day"],
  ['04-09', 'Araw ng Kagitingan'],
  ['05-01', 'Labor Day'],
  ['06-12', 'Independence Day'],
  ['08-21', 'Ninoy Aquino Day'],
  ['11-01', "All Saints' Day"],
  ['11-02', "All Souls' Day"],
  ['11-30', 'Bonifacio Day'],
  ['12-08', 'Feast of the Immaculate Conception'],
  ['12-24', 'Christmas Eve'],
  ['12-25', 'Christmas Day'],
  ['12-30', 'Rizal Day'],
  ['12-31', "New Year's Eve"],
];

export function getPhilippineHolidays(year: number): Map<string, string> {
  const map = new Map<string, string>();
  FIXED_PH_HOLIDAYS.forEach(([md, name]) => map.set(`${year}-${md}`, name));
  map.set(lastMondayOfAugust(year), 'National Heroes Day');

  const easter = easterSunday(year);
  map.set(shiftDateUtc(easter, -3), 'Maundy Thursday');
  map.set(shiftDateUtc(easter, -2), 'Good Friday');
  map.set(shiftDateUtc(easter, -1), 'Black Saturday');
  return map;
}

export function getHolidayLabel(dateStr: string): string {
  if (!dateStr) return '';
  const year = Number(dateStr.slice(0, 4));
  if (!year || Number.isNaN(year)) return '';
  const holidays = getPhilippineHolidays(year);
  return holidays.get(dateStr) || '';
}
