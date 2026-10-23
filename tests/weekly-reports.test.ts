import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { runtimeFixture } from './runtime-fixture';
import { withTenant } from '../packages/db/tenant-context';
import { saveWeeklyReport, weeklyView, weeklyPeriod, aggregateWeekly } from '../packages/domain/weekly-reports';
import { uploadWeeklyImage, getWeeklyImage } from '../packages/domain/weekly-images';
import { emptyWeeklyContent, ratingLabels, type WeeklyQuestion } from '../packages/domain/weekly-report-contract';
import type { Identity, Row } from '../packages/validation/contracts';

const week='2026-09-07';
const q:WeeklyQuestion={id:'communication',text:'How independently did you communicate progress this week?',competency:'Communication',kind:'CHOICE',labels:[...ratingLabels]};
let fixture:Awaited<ReturnType<typeof runtimeFixture>>,student:Identity,admin:Identity,coordinator:Identity;
const run=<T>(actor:Identity,work:()=>T)=>withTenant(actor.tenantId,work);
const content={...emptyWeeklyContent,tasks:'Completed assigned tasks',competencies:'Applied development skills',learning:'Learned to document changes',challenges:'No additional support needed',nextWeek:'Continue assigned testing work'};
beforeAll(async()=>{
  fixture=await runtimeFixture();
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-10T08:00:00Z'));
  vi.stubEnv('PRACTISYNC_WEEKLY_IMAGE_DIR',mkdtempSync(join(tmpdir(),'weekly-images-test-')));
  student=await fixture.actor('demo-student');admin=await fixture.actor('demo-admin');coordinator=await fixture.actor('demo-coordinator');
});
afterAll(()=>{fixture?.cleanup();vi.useRealTimers();});

describe('mandatory weekly reports',()=>{
  it('uses Monday–Sunday and validates real dates',()=>{
    expect(weeklyPeriod('2026-09-13')).toEqual({start:week,end:'2026-09-13'});
    expect(()=>weeklyPeriod('2026-02-30')).toThrow();
  });
  it('saves an incomplete draft while questionnaire publishing is pending',async()=>{
    const saved=await run(student,()=>saveWeeklyReport(student,{action:'save',placementId:'placement-1',week,version:0,content:emptyWeeklyContent,answers:{},submit:false}));
    expect(saved).toMatchObject({version:1});
    await expect(run(student,()=>saveWeeklyReport(student,{action:'save',placementId:'placement-1',week,version:1,content,answers:{},submit:true}))).rejects.toThrow('published');
  });
  it('requires explicit course authoring grants and preserves published versions',async()=>{
    await expect(run(coordinator,()=>saveWeeklyReport(coordinator,{action:'publish',courseId:'course-it',week,questions:[q]}))).rejects.toThrow('grant');
    await run(admin,()=>saveWeeklyReport(admin,{action:'grant',courseId:'course-it',coordinatorId:coordinator.id,active:true}));
    await run(admin,()=>saveWeeklyReport(admin,{action:'publish',courseId:'',week,questions:[q]}));
    await run(coordinator,()=>saveWeeklyReport(coordinator,{action:'publish',courseId:'course-it',week,questions:[{...q,id:'technical',competency:'Technical practice',kind:'RATING'}]}));
    await expect(run(admin,()=>saveWeeklyReport(admin,{action:'publish',courseId:'',week,questions:[q]}))).rejects.toThrow('future week');
    await run(student,()=>saveWeeklyReport(student,{action:'save',placementId:'placement-1',week,version:1,content,answers:{},submit:false}));
    const view=await run(student,()=>weeklyView(student,week));
    expect(view.reports[0].questions.map(q=>q.id)).toEqual(['general:communication','course:technical']);
  });
  it('checks ownership, optimistic versions and complete competency answers',async()=>{
    await expect(run(student,()=>saveWeeklyReport(student,{action:'save',placementId:'placement-4',week,version:0,content,answers:{},submit:false}))).rejects.toThrow('unavailable');
    await expect(run(student,()=>saveWeeklyReport(student,{action:'save',placementId:'placement-1',week,version:1,content,answers:{},submit:false}))).rejects.toThrow('another window');
    await expect(run(student,()=>saveWeeklyReport(student,{action:'save',placementId:'placement-1',week,version:2,content,answers:{'general:communication':3},submit:true}))).rejects.toThrow('every competency');
  });
  it('stores only decoded private images and limits attachment access',async()=>{
    const report=(await run(student,()=>weeklyView(student,week))).reports[0];
    await expect(run(student,()=>uploadWeeklyImage(student,report.id,Buffer.from('<svg/>'),'fake.png'))).rejects.toThrow('readable');
    const png=await sharp({create:{width:2,height:2,channels:3,background:'#124c91'}}).png().toBuffer();
    const image=await run(student,()=>uploadWeeklyImage(student,report.id,png,'evidence.png'));
    const saved=await run(student,()=>getWeeklyImage(student,image.id));expect(saved.mime).toBe('image/webp');
    await expect(run(admin,()=>getWeeklyImage(admin,image.id))).rejects.toThrow('permission');
    await expect(run({...student,tenantId:'another-university'},()=>getWeeklyImage({...student,tenantId:'another-university'},image.id))).rejects.toThrow('unavailable');
    for(let i=0;i<4;i++)await run(student,()=>uploadWeeklyImage(student,report.id,png,'work.png'));
    await expect(run(student,()=>uploadWeeklyImage(student,report.id,png,'sixth.png'))).rejects.toThrow('five images');
  });
  it('submits one atomic record and returns no individual data to Super Admin',async()=>{
    await run(student,()=>saveWeeklyReport(student,{action:'save',placementId:'placement-1',week,version:2,content,answers:{'general:communication':4,'course:technical':3},submit:true}));
    const mine=await run(student,()=>weeklyView(student,week));expect(mine.reports[0].status).toBe('SUBMITTED');
    const aggregated=await run(admin,()=>weeklyView(admin,week));expect(aggregated.reports).toEqual([]);expect(aggregated.placements).toEqual([]);expect(aggregated.previewQuestions).toEqual({});
    expect(aggregated.aggregates.find(a=>a.courseId==='course-it')).toMatchObject({submitted:1,suppressed:true,dimensions:[]});
    await expect(run(student,()=>saveWeeklyReport(student,{action:'save',placementId:'placement-1',week,version:3,content,answers:{},submit:false}))).rejects.toThrow('finalized');
    await expect(run(student,()=>uploadWeeklyImage(student,mine.reports[0].id,Buffer.from('image'),'late.png'))).rejects.toThrow('draft');
  });
  it('distinguishes approved breaks and no-activity reports',async()=>{
    const earlier='2026-08-31';
    await run(coordinator,()=>saveWeeklyReport(coordinator,{action:'excuse',placementId:'placement-1',week:earlier,reason:'University-approved training break'}));
    const view=await run(student,()=>weeklyView(student,earlier));expect(view.reports[0].status).toBe('EXCUSED');
    await expect(run(student,()=>saveWeeklyReport(student,{action:'save',placementId:'placement-1',week:earlier,version:1,content,answers:{},submit:false}))).rejects.toThrow('finalized');
    await expect(run(student,()=>saveWeeklyReport(student,{action:'save',placementId:'placement-1',week:'2026-09-14',version:0,content,answers:{},submit:false}))).rejects.toThrow('current or past');
    await expect(run(student,()=>saveWeeklyReport(student,{action:'save',placementId:'placement-1',week,version:3,content:{...emptyWeeklyContent,noActivity:true},answers:{},submit:true}))).rejects.toThrow();
  });
  it('suppresses small groups and computes dimension averages from three distinct students',()=>{
    const placements=[1,2,3].map(n=>({id:`p${n}`,tenantId:'test',createdAt:'',studentId:`s${n}`,courseId:'it',courseName:'Information Technology'}) as Row);
    const reports=[1,2,3].map(n=>({id:`r${n}`,tenantId:'test',createdAt:'',placementId:`p${n}`,status:'SUBMITTED',questionsJson:JSON.stringify([{...q,id:'general:communication'}]),answersJson:JSON.stringify({'general:communication':n}),contentJson:JSON.stringify({noActivity:n===1}),submittedAt:'2026-09-10T00:00:00Z'}) as Row);
    expect(aggregateWeekly(week,placements,reports)[0]).toMatchObject({suppressed:false,noActivity:1,submitted:3,dimensions:[{average:2,count:3}]});
    expect(aggregateWeekly(week,placements,reports.slice(0,2))[0].dimensions).toEqual([]);
  });
});
