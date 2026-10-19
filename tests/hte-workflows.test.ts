import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { installTestDatabase, seed, one, list, insert, type PreparedStatement } from '../packages/db/demo';
import { mutate } from '../packages/domain/actions';
import { registerHte } from '../packages/domain/hte-workflows';
import { snapshot } from '../packages/domain/read';
import type { Identity, Row } from '../packages/validation/contracts';

const auth = vi.hoisted(() => ({ user:null as Identity | null }));
vi.mock('../packages/auth/auth', () => ({ identity:vi.fn(async () => { if (!auth.user) throw new Error('Unauthenticated'); return auth.user; }), limit:vi.fn() }));
import { POST as upload } from '../app/api/hte-evaluation-template/route';
import { GET as download } from '../app/api/hte-evaluation-template/[id]/file/route';

let sql: DatabaseSync;
const users = {} as Record<string,Identity>;
const migration = (name: string) => readFileSync(`packages/db/prisma/migrations/${name}/migration.sql`,'utf8');
function prepared(query: string, values: (string | number | null)[] = []): PreparedStatement {
 return { bind:(...v) => prepared(query,v), all:async <T extends Record<string,unknown>>() => ({results:sql.prepare(query).all(...values) as T[]}), first:async <T extends Record<string,unknown>>() => (sql.prepare(query).get(...values) as T | undefined) ?? null, run:async () => ({meta:sql.prepare(query).run(...values)}) };
}
const fresh = async (id: string) => await one('SELECT * FROM users WHERE id=?',id) as unknown as Identity;
const final = async () => (await one('SELECT * FROM final_dtrs WHERE placement_id=?','placement-1'))!;
const response = async () => (await one('SELECT * FROM hte_evaluation_responses WHERE placement_id=?','placement-1'))!;
const reviewRequest = (r: Row, decision = 'APPROVE', note = '') => mutate(users.admin,'hteRequestReview',{requestId:r.id,version:Number(r.version),decision,note});
beforeAll(async () => {
 vi.stubEnv('DEPLOYMENT_MODE','demo'); vi.stubEnv('DEMO_ENABLED','true');
 sql = new DatabaseSync(':memory:');
 sql.exec(migration('202610110001_demo_runtime').split('INSERT INTO "assessment_schedules"')[0]!);
 sql.exec(migration('202610110003_limited_hte_workflows'));
 sql.exec(migration('202610190001_hte_approvals_final_dtr'));
 sql.exec(migration('202610150001_calendar_events'));
 sql.exec(readFileSync('drizzle/0007_outcome_evaluations.sql','utf8').replace(/--> statement-breakpoint/g,''));
 sql.exec(readFileSync('drizzle/0008_industry_feedback.sql','utf8'));
 sql.exec("ALTER TABLE completion_responses ADD COLUMN status TEXT NOT NULL DEFAULT 'SUBMITTED'; ALTER TABLE completion_responses ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''; ALTER TABLE completion_responses ADD COLUMN review_note TEXT; ALTER TABLE completion_responses ADD COLUMN reviewer_id TEXT; ALTER TABLE completion_responses ADD COLUMN reviewed_at TEXT;");
 installTestDatabase({prepare:q => prepared(q),batch:async statements => {sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}});
 await seed(); for(const role of ['student','coordinator','admin','supervisor'])users[role]=await fresh('demo-'+role);
});
afterAll(() => {installTestDatabase(undefined);sql.close();vi.unstubAllEnvs();});

describe('HTE registration and Super Admin business approvals', () => {
 it('limits pending registrations, requires rejection notes, and supports corrected registration', async () => {
  const r=await registerHte({name:'Test partner',industry:'IT',location:'Pasig',description:'Fictional integration test partner.',contactName:'Test supervisor',username:'test.partner',email:'partner@example.invalid',password:'IntegrationTest!2026'});
  const pending=(await one('SELECT * FROM hte_requests WHERE id=?',r.id!))!;
  let hte=await fresh(String(pending.requesterId));
  expect((await snapshot(hte)).placements).toEqual([]);
  expect((await snapshot(hte)).hteRequests).toHaveLength(1);
  expect(JSON.stringify(pending)).not.toContain('IntegrationTest!2026');
  await expect(mutate(hte,'job',{})).rejects.toThrow('approval');
  await expect(mutate(users.coordinator,'hteRequestReview',{requestId:pending.id,version:1,decision:'APPROVE'})).rejects.toThrow('permission');
  await expect(reviewRequest(pending,'REJECT')).rejects.toThrow('Explain');
  await reviewRequest(pending,'REJECT','Please correct the company location.');
  await mutate(hte,'companyProfile',{name:'Test partner',industry:'IT',location:'Makati',description:'Corrected fictional partner.'});
  const corrected=(await one("SELECT * FROM hte_requests WHERE requester_id=? AND status='PENDING'",hte.id))!;
  await reviewRequest(corrected); hte=await fresh(hte.id);
  expect((await one('SELECT * FROM companies WHERE id=?',hte.companyId!))?.status).toBe('APPROVED');
  await expect(reviewRequest(corrected)).rejects.toThrow('changed');
  expect((await snapshot(hte)).hteRequests).toHaveLength(2);
  expect((await snapshot(users.student)).hteRequests).toEqual([]);
 });
 it('stages profile changes, posts, edits and closures without changing approved data early', async () => {
  const c=(await one('SELECT * FROM companies WHERE id=?',users.supervisor.companyId!))!;
  const requested=await mutate(users.supervisor,'hteProfileChange',{name:c.name,industry:c.industry,location:'New test location',description:c.description,version:Number(c.version)});
  expect((await one('SELECT * FROM companies WHERE id=?',c.id))?.location).toBe(c.location);
  await expect(mutate(users.supervisor,'hteProfileChange',{name:c.name,industry:c.industry,location:'Duplicate',description:c.description,version:Number(c.version)})).rejects.toThrow('changed');
  await reviewRequest((await one('SELECT * FROM hte_requests WHERE id=?',requested.id!))!);
  expect((await one('SELECT * FROM companies WHERE id=?',c.id))?.location).toBe('New test location');
  const details={title:'Integration test internship',description:'Test approval workflow',location:'Makati',courseId:'course-it',skills:'Testing',openings:2};
  const created=await mutate(users.supervisor,'job',details);
  await expect(mutate(users.coordinator,'jobReview',{jobId:created.id,decision:'APPROVE'})).rejects.toThrow('permission');
  expect((await snapshot(users.student)).jobs.some(j=>j.id===created.id)).toBe(false);
  await mutate(users.admin,'jobReview',{jobId:created.id,decision:'APPROVE'});
  let job=(await one('SELECT * FROM jobs WHERE id=?',created.id!))!;
  const edit=await mutate(users.supervisor,'hteJobChange',{...details,title:'Changed internship title',jobId:job.id,version:Number(job.version)});
  expect((await one('SELECT * FROM jobs WHERE id=?',job.id))?.title).toBe(details.title);
  await reviewRequest((await one('SELECT * FROM hte_requests WHERE id=?',edit.id!))!);
  job=(await one('SELECT * FROM jobs WHERE id=?',job.id))!;
  const close=await mutate(users.supervisor,'hteJobClose',{jobId:job.id,version:Number(job.version)});
  expect((await snapshot(users.student)).jobs.some(j=>j.id===job.id)).toBe(true);
  await reviewRequest((await one('SELECT * FROM hte_requests WHERE id=?',close.id!))!);
  expect((await snapshot(users.student)).jobs.some(j=>j.id===job.id)).toBe(false);
 });
});

describe('Whole internship DTR verification, school form and completion', () => {
 it('retires all daily confirmation endpoints and blocks premature final submission', async () => {
  for(const actor of Object.values(users))await expect(mutate(actor,'confirm',{entryId:'entry-placement-1-15',version:1})).rejects.toThrow('replaced');
  sql.prepare('UPDATE placements SET required_minutes=999999 WHERE id=?').run('placement-1');
  await expect(mutate(users.student,'finalDtrSubmit',{placementId:'placement-1',version:0})).rejects.toThrow('required hours');
  sql.prepare('UPDATE placements SET required_minutes=60 WHERE id=?').run('placement-1');
 });
 it('captures every entry beyond the snapshot display limit and excludes narratives', async () => {
  for(let i=0;i<505;i++) {await insert('entries',{placement_id:'placement-1',date:'2026-09-01',narrative:'PRIVATE NARRATIVE'},`bulk-${i}`).run();await insert('intervals',{entry_id:`bulk-${i}`,starts_at:'2026-09-01T00:00:00Z',ends_at:'2026-09-01T00:01:00Z',break_minutes:0,minutes:1}).run();}
  const count=Number((await one('SELECT COUNT(*) AS count FROM entries WHERE placement_id=?','placement-1'))!.count);
  await mutate(users.student,'finalDtrSubmit',{placementId:'placement-1',version:0});
  const f=await final(), entries=JSON.parse(String(f.snapshotJson)) as Row[];
  expect(entries.length).toBe(count);expect(entries.length).toBeGreaterThan(500);
  expect(JSON.stringify(entries)).not.toContain('narrative');
  expect((await snapshot(users.supervisor)).entries.length).toBeLessThanOrEqual(500);
  await expect(mutate(users.student,'dtr',{placementId:'placement-1',date:'2026-10-10',startsAt:'2026-10-10T08:00',endsAt:'2026-10-10T17:00',breakMinutes:60,narrative:'Correction'})).rejects.toThrow('locked');
  await expect(mutate(users.supervisor,'finalDtrReview',{placementId:'placement-2',version:1,decision:'VERIFY'})).rejects.toThrow('scope');
  await expect(mutate(users.supervisor,'finalDtrReview',{placementId:'placement-1',version:Number(f.version),decision:'REJECT'})).rejects.toThrow('Explain');
  await mutate(users.supervisor,'finalDtrReview',{placementId:'placement-1',version:Number(f.version),decision:'REJECT',note:'Review the time-out record.'});
  const rejected=await final();expect(rejected.status).toBe('REVISION_REQUESTED');
  await expect(mutate(users.student,'finalDtrSubmit',{placementId:'placement-1',version:1})).rejects.toThrow('changed');
  await mutate(users.student,'finalDtrSubmit',{placementId:'placement-1',version:Number(rejected.version)});
  const resubmitted=await final();await mutate(users.supervisor,'finalDtrReview',{placementId:'placement-1',version:Number(resubmitted.version),decision:'VERIFY'});
  expect((await snapshot(users.student)).entries.every(e=>e.confirmedVersion===e.version)).toBe(true);
  expect((await list('SELECT * FROM final_dtr_history')).length).toBe(3);
 });
 it('starts without a fabricated questionnaire and restricts PDF upload and draft access', async () => {
  expect((await snapshot(users.supervisor)).hteEvaluationTemplates).toEqual([]);
  const f=await final();await expect(mutate(users.supervisor,'hteEvaluationSave',{placementId:'placement-1',templateId:'missing',finalDtrVersion:Number(f.version),version:0,mode:'SUBMIT',answers:{}})).rejects.toThrow('Waiting');
  const pdf=await PDFDocument.create();pdf.addPage();const bytes=await pdf.save();
  const request=() => new Request('http://localhost/api/hte-evaluation-template',{method:'POST',headers:{origin:'http://localhost','Content-Type':'application/pdf','X-File-Name':'school-test.pdf'},body:Buffer.from(bytes)});
  auth.user=users.student;expect((await upload(request())).status).toBe(403);
  auth.user=users.admin;
  expect((await upload(new Request('http://localhost/api/hte-evaluation-template',{method:'POST',headers:{origin:'http://localhost','Content-Type':'application/pdf','X-File-Name':'fake.pdf'},body:'not a PDF'}))).status).toBe(400);
  const uploaded=await upload(request());expect(uploaded.status).toBe(201);
  const draft=(await one("SELECT * FROM hte_evaluation_templates WHERE status='DRAFT'"))!;
  expect(draft.questionsJson).toBe('[]');
  await mutate(users.admin,'hteEvaluationDraft',{templateId:draft.id,version:Number(draft.version),title:'Saved school setup',questions:[]});
  expect((await one('SELECT * FROM hte_evaluation_templates WHERE id=?',draft.id))?.title).toBe('Saved school setup');
  expect((await snapshot(users.supervisor)).hteEvaluationTemplates).toEqual([]);
  auth.user=users.supervisor;expect((await download(new Request('http://localhost'),{params:Promise.resolve({id:draft.id})})).status).toBe(404);
  await mutate(users.admin,'hteEvaluationPublish',{templateId:draft.id,version:Number(draft.version)+1,title:'Test school evaluation',questions:[{key:'work',label:'Test question from school document',type:'select',required:true,options:['Meets requirements','Needs improvement']},{key:'comment',label:'Test school comment',type:'text',required:false,options:[]}]});
  expect((await download(new Request('http://localhost'),{params:Promise.resolve({id:draft.id})})).status).toBe(200);
  expect((await snapshot(users.supervisor)).hteEvaluationTemplates?.[0]?.status).toBe('PUBLISHED');
 });
 it('validates school answers, preserves drafts and releases responses only after scoped review', async () => {
  const t=(await one("SELECT * FROM hte_evaluation_templates WHERE status='PUBLISHED'"))!, f=await final();
  const values={placementId:'placement-1',templateId:t.id,finalDtrVersion:Number(f.version),version:0,answers:{}};
  await expect(mutate(users.supervisor,'hteEvaluationSave',{...values,mode:'SUBMIT'})).rejects.toThrow('Complete');
  await mutate(users.supervisor,'hteEvaluationSave',{...values,mode:'DRAFT'});
  expect((await snapshot(users.student)).hteEvaluationResponses).toEqual([]);
  let r=await response();await mutate(users.supervisor,'hteEvaluationSave',{...values,version:Number(r.version),mode:'SUBMIT',answers:{work:'Meets requirements',comment:'School form response.'}});
  r=await response();expect((await snapshot(users.student)).hteEvaluationResponses).toEqual([]);
  await expect(mutate({...users.coordinator,id:'unassigned-coordinator'},'hteEvaluationReview',{responseId:r.id,version:Number(r.version),decision:'APPROVED'})).rejects.toThrow('scope');
  await expect(mutate(users.coordinator,'completionDecision',{placementId:'placement-1',decision:'APPROVE'})).rejects.toThrow('evaluation must be approved');
  await mutate(users.coordinator,'hteEvaluationReview',{responseId:r.id,version:Number(r.version),decision:'APPROVED'});
  expect((await snapshot(users.student)).hteEvaluationResponses).toHaveLength(1);
  await expect(mutate(users.supervisor,'hteEvaluationSave',{...values,version:Number(r.version),mode:'DRAFT'})).rejects.toThrow('already');
 });
 it('requires final DTR, reviewed evaluation and both student exit forms before completion', async () => {
  await expect(mutate(users.coordinator,'completionDecision',{placementId:'placement-1',decision:'APPROVE'})).rejects.toThrow('Both');
  await mutate(users.student,'completionForm',{placementId:'placement-1',formType:'FINAL_SELF_ASSESSMENT',answers:{technicalSkills:4,communication:4,professionalism:4,problemSolving:4,reflection:'Test reflection.'}});
  await mutate(users.student,'completionForm',{placementId:'placement-1',formType:'OJT_EXIT_SURVEY',answers:{curriculumRelevance:4,universitySupport:4,workplaceAlignment:4,trainingPlanClarity:4,feedback:'Test exit feedback.'}});
  await mutate(users.coordinator,'completionDecision',{placementId:'placement-1',decision:'APPROVE'});
  expect((await one('SELECT status FROM placements WHERE id=?','placement-1'))?.status).toBe('COMPLETED');
  expect((await snapshot(users.supervisor)).placements.some(p=>p.id==='placement-1')).toBe(true);
 });
 it('keeps verified attendance locked until a student reopening request is approved and invalidates completion', async () => {
  let f=await final();const reopened=await mutate(users.student,'finalDtrReopen',{placementId:'placement-1',version:Number(f.version),reason:'Correct a recorded time-out.'});
  expect((await final()).status).toBe('VERIFIED');
  await expect(mutate(users.student,'finalDtrReopen',{placementId:'placement-1',version:Number(f.version),reason:'Duplicate'})).rejects.toThrow('changed');
  await expect(mutate(users.admin,'finalDtrReopenReview',{requestId:reopened.id,version:1,decision:'APPROVE',note:'Approved correction.'})).rejects.toThrow('permission');
  await mutate(users.coordinator,'finalDtrReopenReview',{requestId:reopened.id,version:1,decision:'APPROVE',note:'Please correct the recorded time and resubmit.'});
  expect((await final()).status).toBe('REVISION_REQUESTED');expect((await response()).status).toBe('REVISION_REQUESTED');
  expect((await one('SELECT status FROM completion WHERE placement_id=?','placement-1'))?.status).toBe('PENDING');
  expect((await snapshot(users.student)).entries.every(e=>e.confirmedVersion===null)).toBe(true);
  await expect(mutate(users.coordinator,'completionDecision',{placementId:'placement-1',decision:'APPROVE'})).rejects.toThrow('verified final DTR');
  f=await final();await mutate(users.student,'finalDtrSubmit',{placementId:'placement-1',version:Number(f.version)});
  f=await final();await mutate(users.supervisor,'finalDtrReview',{placementId:'placement-1',version:Number(f.version),decision:'VERIFY'});
  f=await final();const r=await response();await mutate(users.supervisor,'hteEvaluationSave',{placementId:'placement-1',templateId:r.templateId,finalDtrVersion:Number(f.version),version:Number(r.version),mode:'SUBMIT',answers:JSON.parse(String(r.answersJson))});
  expect((await response()).finalDtrVersion).toBe(f.version);
 });
});
