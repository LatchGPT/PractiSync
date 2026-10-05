import {describe,expect,it} from 'vitest';
import {attendanceSeries} from '../app/attendance-series';
import AttendanceVisuals from '../app/attendance-visuals';
import type {Row} from '../packages/validation/contracts';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';

const entry=(id:string,date:string,minutes:number,version=1,confirmedVersion:number|null=null)=>({id,date,minutes,version,confirmedVersion,tenantId:'demo',createdAt:date}) as Row;

describe('attendance chart data',()=>{
 it('groups hours by date, fills gaps, and counts only current confirmations',()=>{
  const days=attendanceSeries([entry('a','2026-10-03',120,2,1),entry('b','2026-10-01',60,1,1),entry('c','2026-10-03',180,1,1)],3);
  expect(days).toEqual([
   {date:'2026-10-01',reported:60,confirmed:60},
   {date:'2026-10-02',reported:0,confirmed:0},
   {date:'2026-10-03',reported:300,confirmed:180},
  ]);
 });
 it('shows an empty state with no scoped entries',()=>{
  expect(attendanceSeries([],7)).toEqual([]);
 });
 it('renders both daily bars and a cumulative graph on the DTR page',()=>{
  const html=renderToStaticMarkup(createElement(AttendanceVisuals,{entries:[entry('a','2026-10-03',120,1,1)],detail:true}));
  expect(html).toContain('Daily training hours');
  expect(html).toContain('Hours over time');
  expect(html.match(/role="img"/g)).toHaveLength(2);
 });
});
