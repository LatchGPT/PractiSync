import { workflowTargetFixtures } from './runtime-fixture';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { installTestDatabase, insert, list, one, seed, type PreparedStatement } from '../packages/db/demo';
import { authHandler, identity } from '../packages/auth/auth';
import { ensureNewStudentDemo, lookupStudentClassCode, studentVerificationContext, submitStudentVerification } from '../packages/domain/student-verification';
import { mutate } from '../packages/domain/actions';
import { GET as dataRoute } from '../app/api/data/route';
import { GET as statusRoute, POST as submitRoute } from '../app/api/student-verification/route';
import type { Identity } from '../packages/validation/contracts';

let sql: DatabaseSync;
const actors = {} as Record<string,Identity>;
const origin = 'http://verification-test.local';
const migration = (name: string) => readFileSync(`packages/db/prisma/migrations/${name}/migration.sql`, 'utf8');
function prepared(query: string, values: (string | number | null)[] = []): PreparedStatement {
 return { bind: (...next) => prepared(query, next), all: async <T extends Record<string,unknown>>() => ({ results: sql.prepare(query).all(...values) as T[] }), first: async <T extends Record<string,unknown>>() => (sql.prepare(query).get(...values) as T | undefined) ?? null, run: async () => ({ meta: sql.prepare(query).run(...values) }) };
}
async function signIn(values: Record<string,string> = {demoId:'demo-new-student'}) {
 const csrfResponse = await authHandler(new Request(origin + '/api/auth/csrf'));
 const csrf = await csrfResponse.json() as { csrfToken: string };
 const response = await authHandler(new Request(origin + '/api/auth/callback/credentials', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfResponse.headers.getSetCookie().map(value => value.split(';')[0]).join('; '), 'X-Auth-Return-Redirect': '1' }, body: new URLSearchParams({ ...values, csrfToken: csrf.csrfToken, callbackUrl: origin }) }));
 return response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
}
const request = async () => (await one('SELECT * FROM student_verifications WHERE requester_id=?', 'demo-new-student'))!;
const details = { legalName: 'Isabel Mendoza', studentNumber: '2026-IT-0042', classCode: 'SYNC4A', yearLevel: 4, version: 1 };
function installInteractiveFormSchema(){sql.exec(`ALTER TABLE completion_responses RENAME TO completion_responses_legacy;
CREATE TABLE completion_responses (
 id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL, placement_id TEXT NOT NULL,
 form_type TEXT NOT NULL CHECK (form_type IN ('COE_PLACEMENT_DATA','COE_RECOMMENDATION','STUDENT_INFO_SHEET','TRAINING_AGREEMENT','PARENT_GUARDIAN_CONSENT','FINAL_SELF_ASSESSMENT','OJT_EXIT_SURVEY')),
 form_version INTEGER NOT NULL, response_json TEXT NOT NULL, submitted_at TEXT, updated_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REVISION_REQUESTED')),
 review_note TEXT, reviewer_id TEXT, reviewed_at TEXT, version INTEGER NOT NULL DEFAULT 1
);
INSERT INTO completion_responses (id,tenant_id,created_at,placement_id,form_type,form_version,response_json,submitted_at,updated_at,status,review_note,reviewer_id,reviewed_at,version)
 SELECT id,tenant_id,created_at,placement_id,form_type,form_version,response_json,submitted_at,COALESCE(submitted_at,'2026-10-14T00:00:00.000Z'),'SUBMITTED',NULL,NULL,NULL,version FROM completion_responses_legacy;
DROP TABLE completion_responses_legacy;
CREATE UNIQUE INDEX completion_response_once ON completion_responses (tenant_id,placement_id,form_type);
CREATE INDEX completion_response_placement ON completion_responses (tenant_id,placement_id);
CREATE INDEX completion_response_review_queue ON completion_responses (tenant_id,status,updated_at);`);}

beforeAll(async () => {
 vi.stubEnv('DEPLOYMENT_MODE', 'demo'); vi.stubEnv('DEMO_ENABLED', 'true'); vi.stubEnv('AUTH_SECRET', 'isolated-verification-test-secret-not-production');
 sql = new DatabaseSync(':memory:');
 sql.exec(migration('202610110001_demo_runtime').split('INSERT INTO "assessment_schedules"')[0]!);
 for (const name of ['202610110003_limited_hte_workflows','202610190001_hte_approvals_final_dtr','202610150001_calendar_events']) sql.exec(migration(name));
 sql.exec(readFileSync('drizzle/0007_outcome_evaluations.sql','utf8').replace(/--> statement-breakpoint/g,''));
 sql.exec(readFileSync('drizzle/0008_industry_feedback.sql','utf8'));sql.exec(readFileSync('packages/db/prisma/migrations/202610210001_feedback_provenance/migration.sql','utf8'));sql.exec(readFileSync('packages/db/prisma/migrations/202610210002_account_lifecycle/migration.sql','utf8'));sql.exec(readFileSync('packages/db/prisma/migrations/202610210003_deadline_reminders/migration.sql','utf8'));
 sql.exec(migration('202610200001_student_verification').split('ALTER TABLE "StudentProfile"')[0]!);
 sql.exec(migration('202610200003_student_registration'));
 installInteractiveFormSchema();
 installTestDatabase({ prepare: query => prepared(query), batch: async statements => { sql.exec('BEGIN'); try { const result=[]; for (const query of statements) result.push(await query.run()); sql.exec('COMMIT'); return result; } catch (error) { sql.exec('ROLLBACK'); throw error; } } });
 workflowTargetFixtures(sql);await seed(); await ensureNewStudentDemo();
 for (const role of ['coordinator','admin']) actors[role] = await one('SELECT * FROM users WHERE id=?', 'demo-' + role) as unknown as Identity;
 actors.other = await one('SELECT * FROM users WHERE id=?', 'coordinator-other') as unknown as Identity;
 actors.student = await one('SELECT * FROM users WHERE id=?', 'demo-new-student') as unknown as Identity;
});
beforeEach(async () => {
 sql.exec("DELETE FROM student_verifications; DELETE FROM student_profiles; DELETE FROM enrollments WHERE student_id='demo-new-student'; UPDATE users SET status='ACTIVE',course_id=NULL,email='isabel.mendoza@rtu.edu.ph',email_domain_exception=0,session_version=1,name='Isabel Mendoza' WHERE id='demo-new-student'; UPDATE users SET status='ACTIVE' WHERE id='demo-student'; DELETE FROM audit WHERE resource_id='verification-demo-new-student'; DELETE FROM rate_limits;");
 await ensureNewStudentDemo();
});
afterAll(() => { installTestDatabase(undefined); sql.close(); vi.unstubAllEnvs(); });


import { snapshot } from '../packages/domain/read';
import { isRtuStudentEmail } from '../packages/auth/student-email';
import { canAccessWorkspaceView } from '../packages/auth/routes';
import { POST as retiredReview } from '../app/api/student-verification/review/route';

const sessionRequest = (cookie:string) => new Request(origin+'/api/data',{headers:{Cookie:cookie}});
describe('Student registration and RTU access', () => {
 it('locks records until registration while allowing the own-account form', async () => {
  const cookie=await signIn();
  await expect(identity(sessionRequest(cookie))).rejects.toThrow('registration');
  const response=await dataRoute(sessionRequest(cookie));
  expect(response.status).toBe(403);
  expect(JSON.stringify(await response.json())).not.toContain('placement-1');
  expect((await statusRoute(new Request(origin+'/api/student-verification',{headers:{Cookie:cookie}}))).status).toBe(200);
  await expect(mutate(actors.student,'profile',{name:'Bypass'})).rejects.toThrow('registration');
 });
 it('registers immediately into the code’s section with a fresh profile and no review', async () => {
  const cookie=await signIn();
  expect((await lookupStudentClassCode(actors.student,{classCode:'sync4a'})).class).toMatchObject({courseCode:'BSIT'});
  await submitStudentVerification(actors.student,{...details,email:'attacker@example.invalid',targetStudentId:'demo-student',mode:'LINK'});
  expect(await request()).toMatchObject({status:'APPROVED',approvedStudentId:'demo-new-student',reviewerId:null,classId:'class-it'});
  expect(await one('SELECT * FROM student_profiles WHERE user_id=?',actors.student.id)).toMatchObject({studentNumber:details.studentNumber,yearLevel:4});
  const user=await identity(sessionRequest(cookie));
  expect(user).toMatchObject({id:'demo-new-student',email:'isabel.mendoza@rtu.edu.ph',courseId:'course-it'});
  const own=await snapshot(user);
  expect(own.placements).toEqual([]);expect(own.entries).toEqual([]);
  expect(own.classes.some(item=>item.id==='class-it')).toBe(true);
  expect((await snapshot(actors.coordinator)).classMembers).toEqual(expect.arrayContaining([expect.objectContaining({studentId:user.id,placementId:null})]));
  expect((await snapshot(actors.other)).classMembers?.some(item=>item.studentId===user.id)).toBe(false);
  expect(await list("SELECT id FROM notifications WHERE resource_id=? AND resource_type='student_verification'",(await request()).id)).toEqual([]);
 });
 it('rejects inactive codes and stale submissions without creating a profile', async () => {
  for(const classCode of ['EXPIRED','REVOKED','FAKE99'])await expect(submitStudentVerification(actors.student,{...details,classCode})).rejects.toThrow('invalid or no longer active');
  await expect(submitStudentVerification(actors.student,{...details,version:2})).rejects.toThrow('changed');
  expect(await one('SELECT id FROM student_profiles WHERE user_id=?',actors.student.id)).toBeNull();
  expect((await studentVerificationContext(actors.student)).sections).toEqual([]);
 });
 it('never links a duplicate student number to another student’s history', async () => {
  await insert('student_profiles',{user_id:'demo-student',student_number:details.studentNumber,year_level:4}).run();
  const before=await list("SELECT * FROM entries WHERE placement_id='placement-1'");
  await expect(submitStudentVerification(actors.student,details)).rejects.toThrow('already in use');
  expect(await request()).toMatchObject({status:'DRAFT',approvedStudentId:null});
  expect(await one('SELECT id FROM student_profiles WHERE user_id=?',actors.student.id)).toBeNull();
  expect(await list("SELECT * FROM entries WHERE placement_id='placement-1'")).toEqual(before);
 });
 it('rolls back the profile and form when enrollment cannot be saved', async () => {
  await insert('enrollments',{class_id:'class-it',student_id:actors.student.id,active:1}).run();
  await expect(submitStudentVerification(actors.student,{...details,legalName:'Must not persist'})).rejects.toThrow('No partial registration');
  expect(await request()).toMatchObject({status:'DRAFT',version:1});
  expect(await one('SELECT id FROM student_profiles WHERE user_id=?',actors.student.id)).toBeNull();
  expect((await one('SELECT name FROM users WHERE id=?',actors.student.id))?.name).toBe('Isabel Mendoza');
 });
 it('lets legacy pending students finish without review and makes retries idempotent', async () => {
  sql.prepare("UPDATE student_verifications SET status='PENDING' WHERE requester_id=?").run(actors.student.id);
  await submitStudentVerification(actors.student,details);await submitStudentVerification(actors.student,details);
  expect(await list('SELECT id FROM student_profiles WHERE user_id=?',actors.student.id)).toHaveLength(1);
  expect(await list("SELECT id FROM audit WHERE action='STUDENT_REGISTRATION_COMPLETED' AND resource_id=?",(await request()).id)).toHaveLength(1);
  expect((await retiredReview()).status).toBe(410);
  expect(canAccessWorkspaceView('COORDINATOR','student-verifications')).toBe(false);
  await expect(mutate(actors.coordinator,'joinRequestDecision',{requestId:'req-1',decision:'APPROVE'})).rejects.toThrow('no longer requires approval');
 });
 it('enforces the exact domain on sign-in sessions and rejects client-forged exceptions', async () => {
  expect(isRtuStudentEmail('student@RTU.EDU.PH')).toBe(true);
  for(const email of ['student@rtu.edu.ph.evil','student@dept.rtu.edu.ph','student@yopmail.com','student@rtu.edu.ph@evil.com'])expect(isRtuStudentEmail(email)).toBe(false);
  const cookie=await signIn();
  sql.prepare("UPDATE users SET email='student@yopmail.com' WHERE id=?").run(actors.student.id);
  await expect(identity(sessionRequest(cookie),{allowUnverified:true})).rejects.toThrow('@rtu.edu.ph');
  await expect(submitStudentVerification(actors.student,{...details,emailDomainException:1})).rejects.toThrow('@rtu.edu.ph');
 });
 it('requires explicit Super Admin authorization for an outside-domain provisioned account', async () => {
  const account={name:'Manual fixture',username:'manual.fixture',email:'manual-fixture@yopmail.com',role:'STUDENT',password:'FictionalOnly!2026'};
  await expect(mutate(actors.admin,'account',account)).rejects.toThrow('@rtu.edu.ph');
  const created=await mutate(actors.admin,'account',{...account,studentEmailAccess:'MANUAL_EXCEPTION'});
  expect(await one('SELECT * FROM users WHERE id=?',created.id!)).toMatchObject({emailDomainException:1,courseId:null});
  const cookie=await signIn({username:account.username,password:account.password});
  const user=await identity(sessionRequest(cookie),{allowUnverified:true});
  await submitStudentVerification(user,{...details,studentNumber:'2026-IT-0050'});
  expect((await identity(sessionRequest(cookie))).id).toBe(created.id);
  expect(await one("SELECT id FROM audit WHERE action='STUDENT_EMAIL_EXCEPTION_GRANTED' AND resource_id=?",created.id!)).not.toBeNull();
 });
 it('rejects cross-origin form submission without changing the registration', async () => {
  const cookie=await signIn();
  const response=await submitRoute(new Request(origin+'/api/student-verification',{method:'POST',headers:{Cookie:cookie,Origin:'http://different-origin.local','Content-Type':'application/json'},body:JSON.stringify(details)}));
  expect(response.status).toBe(403);expect((await request()).status).toBe('DRAFT');
 });
 it('allows scoped removal, preserves login, and prevents rejoining around removal', async () => {
  const cookie=await signIn();await submitStudentVerification(actors.student,details);
  await expect(mutate(actors.other,'removeStudent',{classId:'class-it',studentId:actors.student.id})).rejects.toThrow('denied');
  await mutate(actors.coordinator,'removeStudent',{classId:'class-it',studentId:actors.student.id});
  const user=await identity(sessionRequest(cookie));expect(user.status).toBe('ACTIVE');
  expect(await one('SELECT id FROM student_profiles WHERE user_id=?',user.id)).not.toBeNull();
  expect((await snapshot(user)).classes).toEqual([]);
  expect((await snapshot(actors.coordinator)).classMembers?.some(item=>item.studentId===user.id)).toBe(false);
  await expect(mutate(user,'join',{code:'SYNC4A'})).rejects.toThrow('removed');
  await expect(mutate(user,'join',{code:'SYNC4B'})).resolves.toMatchObject({message:'You joined the class.'});
  expect(await one("SELECT e.id FROM enrollments e JOIN classes c ON c.id=e.class_id AND c.tenant_id=e.tenant_id WHERE e.student_id=? AND e.active=1 AND c.code_label='SYNC4B'",user.id)).not.toBeNull();
  expect(await list('SELECT id FROM join_requests WHERE student_id=?',user.id)).toEqual([]);
 });
});
