import {describe,expect,it} from 'vitest';
import {dtrTimestamps} from '../app/dtr-time';
import {calculateMinutes} from '../packages/domain/policies';

describe('time-only DTR entry',()=>{
 it('uses the selected entry date for both times on a day shift',()=>{
  const interval=dtrTimestamps('2026-10-02','08:00','17:00');
  expect(interval).toEqual({startsAt:'2026-10-02T08:00',endsAt:'2026-10-02T17:00'});
  expect(calculateMinutes(interval.startsAt+':00+08:00',interval.endsAt+':00+08:00',60,'2026-10-01','2026-10-31',Date.parse('2026-11-01T00:00:00Z'))).toBe(480);
 });
 it('rolls an earlier time out into the following day',()=>{
  expect(dtrTimestamps('2026-10-02','22:00','06:00')).toEqual({startsAt:'2026-10-02T22:00',endsAt:'2026-10-03T06:00'});
 });
 it('rejects matching times',()=>{
  expect(()=>dtrTimestamps('2026-10-02','08:00','08:00')).toThrow('Time out must differ');
 });
});
