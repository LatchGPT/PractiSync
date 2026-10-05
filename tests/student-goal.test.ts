import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Row} from '../packages/validation/contracts';
import {studentGoal} from '../app/student-goal';
import StudentGoalProgress from '../app/student-goal-progress';

const entry=(id:string,date:string,minutes:number,version=1,confirmedVersion:number|null=null)=>({id,date,minutes,version,confirmedVersion,tenantId:'demo',createdAt:date}) as Row;

describe('student goal summary',()=>{
 const entries=[entry('1','2026-10-01',120,1,1),entry('2','2026-10-02',120,2,1),entry('3','2026-10-02',60,1,1),entry('4','2026-10-03',120,1,1)];
 it('uses unique DTR dates and excludes stale confirmations',()=>{
  expect(studentGoal(entries,1200)).toMatchObject({reported:420,confirmed:300,daysOnRecord:3,remaining:780,percent:35,predictedDays:6});
 });
 it('does not predict from insufficient days or an unconfigured target',()=>{
  expect(studentGoal(entries.slice(0,2),1200).predictedDays).toBeNull();
  expect(studentGoal(entries,0).predictedDays).toBeNull();
 });
 it('renders a labeled goal donut and its attendance summary',()=>{
  const html=renderToStaticMarkup(createElement(StudentGoalProgress,{entries,requiredMinutes:1200}));
  expect(html).toContain('of required hours');
  expect(html).toContain('Predicted completion');
  expect(html).toContain('Days on record');
  expect(html).toContain('35%');
 });
});
