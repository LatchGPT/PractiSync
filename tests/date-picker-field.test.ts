import {describe,expect,it} from 'vitest';
import {calendarDateValue,parseCalendarDate} from '../app/calendar-date';
import {sampleFor} from '../packages/test-utils/fixtures';

describe('DTR date picker value',()=>{
 it('preserves the calendar day used by the DTR form',()=>{
  const date=sampleFor('dtr',{placementId:'placement-1'}).date;
  expect(calendarDateValue(parseCalendarDate(date)!)).toBe(date);
 });
 it('rejects impossible dates before showing a selected day',()=>{
  expect(parseCalendarDate('2026-02-30')).toBeUndefined();
  expect(parseCalendarDate('')).toBeUndefined();
 });
});
