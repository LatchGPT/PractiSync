import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Row} from '../packages/validation/contracts';
import {studentGoal} from '../app/student-goal';
import StudentGoalProgress from '../app/student-goal-progress';

const entry=(id:string,date:string,minutes:number,version=1,confirmedVersion:number|null=null)=>({id,date,minutes,version,confirmedVersion,tenantId:'demo',createdAt:date}) as Row;
const verifiedEntry=(id:string,date:string,minutes:number)=>entry(id,date,minutes,1,1);
const holiday=(id:string,startDate:string,endDate:string,audience='UNIVERSITY',status='ACTIVE')=>({
 id,tenantId:'demo',createdAt:startDate,eventType:'HOLIDAY',startDate,endDate,audience,status,
}) as Row;

describe('student goal summary',()=>{
 const entries=[entry('1','2026-10-01',120,1,1),entry('2','2026-10-02',120,2,1),entry('3','2026-10-02',60,1,1),entry('4','2026-10-03',120,1,1)];
 it('uses unique DTR dates and excludes stale confirmations',()=>{
  expect(studentGoal(entries,1200)).toMatchObject({reported:420,confirmed:300,daysOnRecord:3,remaining:780,percent:35,predictedDays:6});
 });
 it('does not predict from insufficient days or an unconfigured target',()=>{
  expect(studentGoal(entries.slice(0,2),1200).predictedDays).toBeNull();
  expect(studentGoal(entries,0).predictedDays).toBeNull();
 });
 it('projects from the verified daily average after three verified days',()=>{
  const result=studentGoal([
   verifiedEntry('v1','2026-10-12',240),
   verifiedEntry('v2','2026-10-13',360),
   verifiedEntry('v3','2026-10-14',600),
  ],3000,[],'2026-10-19');
  expect(result.forecast).toMatchObject({status:'projected',date:'2026-10-23',workingDays:5,dailyMinutes:400,velocitySource:'verified-average'});
 });
 it('uses the standard eight-hour weekday pace until three verified days exist',()=>{
  const result=studentGoal([],960,[],'2026-10-19');
  expect(result.forecast).toMatchObject({status:'projected',date:'2026-10-20',workingDays:2,dailyMinutes:480,velocitySource:'standard'});
 });
 it('skips active university holiday ranges, but ignores class-only and cancelled holidays',()=>{
  const result=studentGoal([
   verifiedEntry('v1','2026-10-20',480),
   verifiedEntry('v2','2026-10-21',480),
   verifiedEntry('v3','2026-10-22',480),
  ],2400,[
   holiday('university-holiday','2026-10-27','2026-10-28'),
   holiday('class-holiday','2026-10-26','2026-10-26','CLASS'),
   holiday('cancelled-holiday','2026-10-29','2026-10-29','UNIVERSITY','CANCELLED'),
  ],'2026-10-26');
  expect(result.forecast).toMatchObject({date:'2026-10-29',workingDays:2});
 });
 it('marks completion on the date verified hours first reach the target',()=>{
  const result=studentGoal([
   verifiedEntry('v1','2026-02-26',300),
   verifiedEntry('v2','2026-02-27',180),
  ],480,[],'2026-03-02');
  expect(result.forecast).toMatchObject({status:'completed',date:'2026-02-27',workingDays:0});
 });
 it('handles leap day and weekend-to-month crossover projections',()=>{
  expect(studentGoal([],960,[],'2024-02-28').forecast.date).toBe('2024-02-29');
  expect(studentGoal([],960,[],'2026-10-30').forecast.date).toBe('2026-11-02');
 });
 it('renders a labeled goal donut and its attendance summary',()=>{
  const html=renderToStaticMarkup(createElement(StudentGoalProgress,{entries,requiredMinutes:1200}));
  expect(html).toContain('reported of 20 hrs, 35% of goal');
  expect(html).toContain('Expected completion');
  expect(html).toContain('Expected Completion:');
  expect(html).toContain('Hours awaiting final Industry Partner verification');
  expect(html).toContain('Days on record');
  expect(html).toContain('35%');
 });
 it('renders a completed forecast with the green completion state',()=>{
  const html=renderToStaticMarkup(createElement(StudentGoalProgress,{
   entries:[verifiedEntry('done','2026-02-27',480)],requiredMinutes:480,calendarEvents:[],
  }));
  expect(html).toContain('goal-forecast-card completed');
  expect(html).toContain('Completed on Friday, February 27, 2026');
 });
});
