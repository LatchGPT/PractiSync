import {describe,it,expect,beforeAll,afterAll,vi} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {seed,one,list,installTestDatabase,type DemoDatabase,type PreparedStatement} from '../packages/db/demo';
import {snapshot} from '../packages/domain/read';
import {mutate} from '../packages/domain/actions';
import {authHandler,identity,limit} from '../packages/auth/auth';
import {demoAllowed,calculateMinutes} from '../packages/domain/policies';
import {sampleFor} from '../packages/test-utils/fixtures';
import type {Identity} from '../packages/validation/contracts';
import {guestEvaluationContext,submitGuestEvaluation} from '../packages/domain/industry-workflows';
let sql:DatabaseSync;
function prepared(query:string,values:(string|number|null)[]=[]):PreparedStatement{return {bind:(...args:(string|number|null)[])=>prepared(query,args),all:async<T extends Record<string,unknown>>()=>({results:sql.prepare(query).all(...values) as T[]}),first:async<T extends Record<string,unknown>>()=>sql.prepare(query).get(...values) as T|null??null,run:async()=>({meta:sql.prepare(query).run(...values)})};}
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
function installCustomDocumentSchema(){sql.exec(`CREATE TABLE custom_document_templates (id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,created_at TEXT NOT NULL,created_by TEXT NOT NULL,title TEXT NOT NULL,instructions TEXT NOT NULL,category TEXT NOT NULL,fields_json TEXT NOT NULL,status TEXT NOT NULL,version INTEGER NOT NULL,original_filename TEXT NOT NULL DEFAULT '',pdf_base64 TEXT NOT NULL DEFAULT '');CREATE TABLE custom_document_responses (id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,created_at TEXT NOT NULL,placement_id TEXT NOT NULL,template_id TEXT NOT NULL,template_version INTEGER NOT NULL,template_json TEXT NOT NULL DEFAULT '{}',response_json TEXT NOT NULL,submitted_at TEXT,updated_at TEXT NOT NULL,status TEXT NOT NULL,review_note TEXT,reviewer_id TEXT,reviewed_at TEXT,version INTEGER NOT NULL,UNIQUE(tenant_id,placement_id,template_id));`);}
const users={} as Record<string,Identity>;
beforeAll(async()=>{vi.stubEnv('DEPLOYMENT_MODE','demo');vi.stubEnv('DEMO_ENABLED','true');vi.stubEnv('AUTH_SECRET','test-secret-that-is-not-a-production-secret');sql=new DatabaseSync(':memory:');const migration=readFileSync('packages/db/prisma/migrations/202610110001_demo_runtime/migration.sql','utf8').split('INSERT INTO "assessment_schedules"')[0]!;sql.exec(migration);
  sql.exec(readFileSync('packages/db/prisma/migrations/202610150001_calendar_events/migration.sql','utf8'));
  sql.exec(readFileSync('packages/db/prisma/migrations/202610110003_limited_hte_workflows/migration.sql','utf8'));
  sql.exec(readFileSync('packages/db/prisma/migrations/202610190001_hte_approvals_final_dtr/migration.sql','utf8'));installInteractiveFormSchema();sql.exec(readFileSync('drizzle/0007_outcome_evaluations.sql','utf8').replace(/--> statement-breakpoint/g,''));sql.exec(readFileSync('drizzle/0008_industry_feedback.sql','utf8'));installCustomDocumentSchema();sql.exec(`CREATE TRIGGER test_scoped_entry BEFORE INSERT ON entries BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id); END; CREATE TRIGGER test_final_application BEFORE UPDATE OF status ON applications WHEN OLD.status IN ('ACCEPTED','REJECTED') AND NEW.status<>OLD.status BEGIN SELECT RAISE(ABORT, 'Application final decision is immutable'); END;`);const database:DemoDatabase={prepare:(query)=>prepared(query),batch:async(statements)=>{sql.exec('BEGIN');try{const values=[];for(const statement of statements)values.push(await statement.run());sql.exec('COMMIT');return values;}catch(e){sql.exec('ROLLBACK');throw e;}}};installTestDatabase(database);sql.exec(readFileSync('packages/db/prisma/migrations/202610200001_student_verification/migration.sql','utf8').split('ALTER TABLE "StudentProfile"')[0]!);sql.exec(readFileSync('packages/db/prisma/migrations/202610200003_student_registration/migration.sql','utf8'));await seed();for(const role of ['student','coordinator','admin'])users[role]=await one('SELECT * FROM users WHERE id=?','demo-'+role) as unknown as Identity;users.supervisor=await one('SELECT * FROM users WHERE id=?','demo-supervisor') as unknown as Identity;});
afterAll(()=>{installTestDatabase(undefined);vi.unstubAllEnvs();});
describe('PSS-39 calendar events',()=>{
 it('shows university and enrolled-class events and schedules a class document deadline',async()=>{
  const otherClassEvent=await mutate(users.admin,'calendarEvent',{eventType:'ACADEMIC',title:'Other class event',description:'Scope check',startDate:'2026-10-26',endDate:'2026-10-26',audience:'CLASS',classId:'class-ed'});
  const studentEvents=(await snapshot(users.student)).calendarEvents;
  expect(studentEvents.map(event=>event.id)).toContain('calendar-midterms-2026');
  expect(studentEvents.map(event=>event.id)).toContain('calendar-orientation-2026');
  expect(studentEvents.map(event=>event.id)).not.toContain(otherClassEvent.id);
  expect((await snapshot(users.coordinator)).calendarEvents.map(event=>event.id)).not.toContain(otherClassEvent.id);

  const deadline=await mutate(users.coordinator,'calendarEvent',{eventType:'DEADLINE',title:'Passing of Notarized MOA',description:'Submit 2 signed original copies to COE Room 204',startDate:'2026-10-29',endDate:'2026-10-29',startTime:'08:00',endTime:'17:00',location:'COE Office Room 204',audience:'CLASS',classId:'class-it'});
  expect(await one('SELECT * FROM calendar_events WHERE id=?',deadline.id!)).toMatchObject({eventType:'DEADLINE',audience:'CLASS',classId:'class-it',location:'COE Office Room 204'});
  expect((await snapshot(users.student)).calendarEvents.map(event=>event.id)).toContain(deadline.id);
  expect((await snapshot(users.admin)).calendarEvents.map(event=>event.id)).toContain(otherClassEvent.id);
 });

 it('rejects student writes, out-of-scope classes, non-deadline coordinator events, and invalid appointment times',async()=>{
  const deadline={eventType:'DEADLINE',title:'Permission check',startDate:'2026-10-29',endDate:'2026-10-29',audience:'CLASS',classId:'class-it'};
  await expect(mutate(users.student,'calendarEvent',deadline)).rejects.toThrow('permission');
  await expect(mutate(users.coordinator,'calendarEvent',{...deadline,classId:'class-ed'})).rejects.toThrow('allowed to schedule');
  await expect(mutate(users.coordinator,'calendarEvent',{...deadline,eventType:'APPOINTMENT',startTime:'09:00',endTime:'09:30'})).rejects.toThrow('Coordinators can schedule document submission deadlines for their own classes only.');
  await expect(mutate(users.coordinator,'calendarEvent',{...deadline,audience:'UNIVERSITY'})).rejects.toThrow('Coordinators can schedule document submission deadlines for their own classes only.');
  await expect(mutate(users.admin,'calendarEvent',{eventType:'APPOINTMENT',title:'No start time',startDate:'2026-10-29',endDate:'2026-10-29',startTime:'',endTime:'',audience:'UNIVERSITY'})).rejects.toThrow('Appointments need a start time');
  await expect(mutate(users.admin,'calendarEvent',{eventType:'ACADEMIC',title:'Invalid link',startDate:'2026-10-29',endDate:'2026-10-29',audience:'UNIVERSITY',meetingUrl:'http://meet.example.invalid'})).rejects.toThrow('valid HTTPS');
 });

 it('allows coordinators and admins to edit, cancel, and delete calendar events',async()=>{
  const event=await mutate(users.admin,'calendarEvent',{eventType:'DEADLINE',title:'Original Deadline',description:'Submit portfolio draft',startDate:'2026-10-28',endDate:'2026-10-28',audience:'UNIVERSITY'});
  expect((await one('SELECT * FROM calendar_events WHERE id=?',event.id!))?.title).toBe('Original Deadline');
  await mutate(users.admin,'calendarEvent',{eventId:event.id!,eventType:'DEADLINE',title:'Extended Deadline',description:'Submit portfolio final',startDate:'2026-10-30',endDate:'2026-10-30',audience:'UNIVERSITY',status:'ACTIVE'});
  expect((await one('SELECT * FROM calendar_events WHERE id=?',event.id!))?.title).toBe('Extended Deadline');
  await mutate(users.admin,'cancelCalendarEvent',{eventId:event.id!});
  expect((await one('SELECT * FROM calendar_events WHERE id=?',event.id!))?.status).toBe('CANCELLED');
  await mutate(users.admin,'deleteCalendarEvent',{eventId:event.id!});
  expect(await one('SELECT * FROM calendar_events WHERE id=?',event.id!)).toBeNull();
 });
});

describe('foundations and isolation',()=>{
 it('seeds four demo identities idempotently and promotes the password-based HTE fixture',async()=>{const before=await list('SELECT * FROM entries');sql.prepare('UPDATE users SET is_demo=0 WHERE id=?').run('demo-supervisor');await seed();expect((await list('SELECT * FROM users WHERE is_demo=1')).length).toBe(4);expect((await one('SELECT is_demo FROM users WHERE id=?','demo-supervisor'))?.isDemo).toBe(1);expect((await list('SELECT * FROM entries')).length).toBe(before.length);});
 it('fails closed outside isolated demo',()=>{expect(demoAllowed('institutional','true')).toBe(false);expect(demoAllowed('demo','false')).toBe(false);});
 it('student cannot see another placement or private case',async()=>{const s=await snapshot(users.student);expect(s.placements.every(p=>p.studentId===users.student.id)).toBe(true);expect(s.incidents.map(i=>i.id)).toEqual(['case-1']);expect(s.classes.length).toBe(1);expect(s.classes[0]?.coordinatorName).toBe('Andrea Santos');await expect(mutate(users.student,'dtr',{placementId:'placement-2',date:'2026-10-01',startsAt:'2026-10-01T08:00',endsAt:'2026-10-01T17:00',breakMinutes:60,narrative:'Scope-negative test'})).rejects.toThrow('access denied');});
 it('coordinator sees assigned class placements and routed SOS cases',async()=>{const s=await snapshot(users.coordinator);expect(s.placements.length).toBeGreaterThan(0);expect(s.incidents.length).toBeGreaterThan(0);});
 it('coordinator manages several classes but unrelated cases are hidden',async()=>{const s=await snapshot(users.coordinator);expect(s.classes.length).toBeGreaterThan(2);expect(s.incidents.map(i=>i.id)).not.toContain('case-private');await expect(mutate(users.coordinator,'announcement',{title:'Scope-negative',body:'Do not publish this',classId:'class-ed'})).rejects.toThrow('own classes');});
 it('coordinator can assign class reps and remove students without an approval queue',async()=>{await mutate(users.coordinator,'assignClassReps',{classId:'class-it',classRepId:'demo-student',viceClassRepId:'student-5'});const cls=await one('SELECT * FROM classes WHERE id=?','class-it');expect(cls?.classRepId).toBe('demo-student');expect(cls?.viceClassRepId).toBe('student-5');const snap=await snapshot(users.coordinator);expect(snap.joinRequests).toEqual([]);await expect(mutate(users.coordinator,'joinRequestDecision',{requestId:'req-1',decision:'APPROVE'})).rejects.toThrow('no longer requires approval');await mutate(users.coordinator,'removeStudent',{classId:'class-it',studentId:'student-5'});const en=await one('SELECT * FROM enrollments WHERE class_id=? AND student_id=?','class-it','student-5');expect(en?.active).toBe(0);});
 it('super admin has no blanket SOS access',async()=>{expect((await snapshot(users.admin)).incidents).toEqual([]);await expect(mutate(users.admin,'resolveCase',{caseId:'case-1',status:'RESOLVED',resolution:'Denied'})).rejects.toThrow('permission');});
 it('join codes are eligible, idempotent, expire and revoke',async()=>{await expect(mutate(users.student,'join',{code:'SYNC4A'})).resolves.toMatchObject({message:'You are already enrolled in this class.'});for(const code of ['BIZ4A','EXPIRED','REVOKED','FAKE99'])await expect(mutate(users.student,'join',{code})).rejects.toThrow();expect((await one('SELECT role FROM users WHERE id=?',users.student.id))?.role).toBe('STUDENT');});
 it('policies can be managed by coordinator and preserve placement snapshots',async()=>{await expect(mutate(users.student,'policy',{courseId:'course-it',hours:500,version:1})).rejects.toThrow('permission');const before=await one('SELECT required_minutes FROM placements WHERE id=\'placement-1\'');await mutate(users.coordinator,'policy',{courseId:'course-it',hours:500,version:1});expect((await one('SELECT required_minutes FROM placements WHERE id=\'placement-1\''))?.requiredMinutes).toBe(before?.requiredMinutes);await expect(mutate(users.coordinator,'policy',{courseId:'course-it',hours:510,version:1})).rejects.toThrow('changed');});
 it('manual DTR contributes immediately and corrections preserve its history without daily confirmation',async()=>{const d={placementId:'placement-1',date:'2026-10-01',startsAt:'2026-10-01T08:00',endsAt:'2026-10-01T17:00',breakMinutes:60,narrative:'Test completed work'};const r=await mutate(users.student,'dtr',d);expect((await one('SELECT minutes FROM intervals WHERE entry_id=?',r.id!))?.minutes).toBe(480);await expect(mutate(users.coordinator,'confirm',{entryId:r.id,version:1})).rejects.toThrow('replaced');await mutate(users.student,'dtr',{...d,entryId:r.id,version:1,endsAt:'2026-10-01T16:00',reason:'Corrected end time'});expect((await one('SELECT * FROM entries WHERE id=?',r.id!))?.version).toBe(2);expect((await one('SELECT minutes FROM intervals WHERE entry_id=?',r.id!))?.minutes).toBe(420);await expect(mutate(users.student,'dtr',d)).rejects.toThrow('overlaps');});
 it('cross-tenant relationships are rejected by database',()=>{expect(()=>sql.prepare('INSERT INTO entries (id,tenant_id,created_at,placement_id,date,narrative) VALUES (?,?,?,?,?,?)').run('tenant-negative','another-tenant','2026-10-01','placement-1','2026-10-01','Denied')).toThrow('scoped relationship');});
 it('accounts are bounded and demo identities cannot be changed',async()=>{await expect(mutate(users.admin,'role',{userId:'demo-student',role:'SUPER_ADMIN',status:'ACTIVE'})).rejects.toThrow('preserved');});
 it('students cannot write legacy evaluations or publish jobs',async()=>{await expect(mutate(users.student,'job',{title:'x',description:'x',location:'x',courseId:'course-it',skills:'x',openings:1})).rejects.toThrow('permission');await expect(mutate(users.student,'evaluation',{placementId:'placement-1',kind:'FINAL',date:'2026-10-02',technical:4,communication:4,professionalism:5,problemSolving:4})).rejects.toThrow();});
  it('coordinator drafts posts only for approved companies and approval publishes them',async()=>{await expect(mutate(users.coordinator,'job',{companyId:'company-pending',title:'Frontend Intern',description:'Work with React',location:'Mandaluyong',courseId:'course-it',skills:'React, TypeScript',openings:2})).rejects.toThrow('university-verified company');const job=await mutate(users.coordinator,'job',{companyId:'company-northstar',title:'Frontend Intern',description:'Work with React',location:'Mandaluyong',courseId:'course-it',skills:'React, TypeScript',openings:2});expect(job.message).toContain('submitted for university approval');expect((await one('SELECT status FROM jobs WHERE id=?',job.id!))?.status).toBe('DRAFT');await mutate(users.admin,'jobReview',{jobId:job.id!,decision:'APPROVE'});expect((await one('SELECT status FROM jobs WHERE id=?',job.id!))?.status).toBe('PUBLISHED');const postedSample=await mutate(users.coordinator,'job',sampleFor('job',{}));expect((await one('SELECT status FROM jobs WHERE id=?',postedSample.id!))?.status).toBe('DRAFT');await expect(mutate(users.coordinator,'evaluation',{placementId:'placement-1',kind:'WEEKLY',date:'2026-10-02',technical:5,communication:4,professionalism:5,problemSolving:4})).rejects.toThrow('permission');});
 it('supports course cadence, one student assessment per period, and coordinator revision review',async()=>{
  const base={placementId:'placement-1',date:'2026-10-02',technical:4,communication:4,professionalism:5,problemSolving:3};
  await expect(mutate(users.student,'assessmentSchedule',{courseId:'course-it',cadence:'MONTHLY',version:1})).rejects.toThrow('permission');
  await expect(mutate(users.coordinator,'assessmentSchedule',{courseId:'course-education',cadence:'MONTHLY',version:1})).rejects.toThrow('your classes');
  await mutate(users.coordinator,'assessmentSchedule',{courseId:'course-it',cadence:'MONTHLY',version:1});
  await expect(mutate(users.student,'evaluation',{...base,kind:'WEEKLY'})).rejects.toThrow('not enabled');
  await expect(mutate(users.student,'evaluation',{...base,kind:'MONTHLY',date:'2099-01-01'})).rejects.toThrow('current or past');
  const submitted=await mutate(users.student,'evaluation',{...base,kind:'MONTHLY'});
  const row=await one('SELECT * FROM evaluations WHERE id=?',submitted.id!);
  expect(row).toMatchObject({kind:'MONTHLY',periodStart:'2026-10-01',periodEnd:'2026-10-31',status:'SUBMITTED'});
  await expect(mutate(users.student,'evaluation',{...base,kind:'MONTHLY',date:'2026-10-04'})).rejects.toThrow('already been submitted');
  await expect(mutate(users.coordinator,'evaluationReview',{evaluationId:submitted.id,decision:'REVISION_REQUESTED'})).rejects.toThrow('Explain');
  await mutate(users.coordinator,'evaluationReview',{evaluationId:submitted.id,decision:'REVISION_REQUESTED',note:'Review the technical rating.'});
  await expect(mutate(users.student,'evaluation',{...base,kind:'MONTHLY',version:2})).rejects.toThrow('changed');
  await mutate(users.student,'evaluation',{...base,kind:'MONTHLY',version:1,technical:5});
  expect((await one('SELECT * FROM evaluations WHERE id=?',submitted.id!))?.version).toBe(2);
  expect((await one('SELECT score FROM scores WHERE evaluation_id=? AND dimension=?',submitted.id!,'Technical skills'))?.score).toBe(5);
  expect((await list('SELECT * FROM evaluation_revisions WHERE evaluation_id=?',submitted.id!))).toHaveLength(1);
  await mutate(users.coordinator,'evaluationReview',{evaluationId:submitted.id,decision:'APPROVED'});
  await expect(mutate(users.student,'evaluation',{...base,kind:'MONTHLY',version:2})).rejects.toThrow('already been submitted');
  await mutate(users.coordinator,'assessmentSchedule',{courseId:'course-it',cadence:'BOTH',version:2});
  const weekly=await mutate(users.student,'evaluation',{...base,kind:'WEEKLY'});
  expect(await one('SELECT period_start,period_end FROM evaluations WHERE id=?',weekly.id!)).toMatchObject({periodStart:'2026-09-28',periodEnd:'2026-10-04'});
  expect((await snapshot(users.student)).assessmentSchedules.find(schedule=>schedule.courseId==='course-it')?.cadence).toBe('BOTH');
 });
 it('applications require eligible course and cannot duplicate',async()=>{await expect(mutate(users.student,'application',{jobId:'job-2',coverLetter:'Sample'})).rejects.toThrow('course');await expect(mutate(users.student,'application',{jobId:'job-1',coverLetter:'Duplicate'})).rejects.toThrow('already applied');});
  it('HTE selects applicants while the coordinator controls placement confirmation',async()=>{await expect(mutate(users.coordinator,'applicationStatus',{applicationId:'app-1',status:'SHORTLISTED'})).rejects.toThrow('Only the HTE');await mutate(users.supervisor,'selectApplication',{applicationId:'app-1',decision:'SHORTLISTED'});expect((await one('SELECT status FROM applications WHERE id=?','app-1'))?.status).toBe('SHORTLISTED');await expect(mutate(users.coordinator,'confirmPlacement',{applicationId:'app-1',classId:'class-it',startsAt:'2026-08-01',endsAt:'2026-12-20'})).rejects.toThrow('already has an active or planned placement');});
  it('company profile approval, post approval, HTE selection, and university placement confirmation form one chain',async()=>{
   sql.prepare('INSERT INTO users (id,tenant_id,created_at,name,username,email,role,status,password_hash,session_version,is_demo,course_id,company_id,supervisor_verified,can_post) VALUES (?,?,?,?,?,?,?,\'ACTIVE\',NULL,1,0,NULL,NULL,0,0)').run('supervisor-new','fictional-university','2026-10-11T00:00:00Z','Taylor Rivera','demo.supervisor.new','supervisor.new@example.invalid','SUPERVISOR');
   const supervisor=await one('SELECT * FROM users WHERE id=?','supervisor-new') as unknown as Identity;
   const profile=await mutate(supervisor,'companyProfile',{name:'Fictional Studio',industry:'Technology',location:'Pasig',description:'Fictional test company.'});
   expect((await one('SELECT status FROM companies WHERE id=?',profile.id!))?.status).toBe('PENDING');
   await expect(mutate(users.coordinator,'companyVerification',{companyId:profile.id!,decision:'APPROVE'})).rejects.toThrow('permission');
   await mutate(users.admin,'companyVerification',{companyId:profile.id!,decision:'APPROVE'});
   const verified=await one('SELECT * FROM users WHERE id=?','supervisor-new') as unknown as Identity;
   expect(verified.companyId).toBe(profile.id);
   const post=await mutate(verified,'job',{title:'QA Intern',description:'Test fictional products.',location:'Pasig',courseId:'course-it',skills:'Testing',openings:1});
   expect((await one('SELECT status FROM jobs WHERE id=?',post.id!))?.status).toBe('DRAFT');
   await mutate(users.admin,'jobReview',{jobId:post.id!,decision:'APPROVE'});
   expect((await one('SELECT status FROM jobs WHERE id=?',post.id!))?.status).toBe('PUBLISHED');
   sql.prepare('INSERT INTO users (id,tenant_id,created_at,name,username,email,role,status,password_hash,session_version,is_demo,course_id,company_id,supervisor_verified,can_post) VALUES (?,?,?,?,?,?,?,\'ACTIVE\',NULL,1,0,\'course-it\',NULL,0,0)').run('student-candidate','fictional-university','2026-10-11T00:00:00Z','Casey Santos','candidate.it','candidate@example.invalid','STUDENT');
   sql.prepare('INSERT INTO applications (id,tenant_id,created_at,job_id,student_id,cover_letter,status) VALUES (?,?,?,?,?,? ,\'SUBMITTED\')').run('app-candidate','fictional-university','2026-10-11T00:00:00Z',post.id!,'student-candidate','Fictional candidate application.');
   await mutate(verified,'selectApplication',{applicationId:'app-candidate',decision:'SHORTLISTED'});
   sql.prepare('UPDATE companies SET status=\'SUSPENDED\' WHERE id=?').run(profile.id!);
   await expect(mutate(users.coordinator,'confirmPlacement',{applicationId:'app-candidate',classId:'class-it',startsAt:'2026-08-01',endsAt:'2026-12-20'})).rejects.toThrow('must still be approved');
   sql.prepare('UPDATE companies SET status=\'APPROVED\' WHERE id=?').run(profile.id!);
   await mutate(users.coordinator,'confirmPlacement',{applicationId:'app-candidate',classId:'class-it',startsAt:'2026-08-01',endsAt:'2026-12-20'});
   const placed=await one('SELECT * FROM placements WHERE student_id=?','student-candidate');
   expect(placed).toMatchObject({status:'PLANNED',companyId:profile.id});
   expect(await one('SELECT supervisor_id FROM assignments WHERE placement_id=?',placed!.id)).toMatchObject({supervisorId:'supervisor-new'});
  });
  it('private host placements keep contact details private and use a separate guest evaluation code',async()=>{
   sql.prepare('INSERT INTO users (id,tenant_id,created_at,name,username,email,role,status,password_hash,session_version,is_demo,course_id,company_id,supervisor_verified,can_post) VALUES (?,?,?,?,?,?,?,\'ACTIVE\',NULL,1,0,\'course-it\',NULL,0,0)').run('student-private-host','fictional-university','2026-10-11T00:00:00Z','Jordan Lee','student.private.host','private.host@example.invalid','STUDENT');
   const created=await mutate(users.coordinator,'privateHost',{studentId:'student-private-host',classId:'class-it',companyName:'Private Fictional Host',industry:'Technology',location:'Pasig',description:'Coordinator-only host record.',supervisorName:'R. Contact',supervisorEmail:'contact@example.invalid',startsAt:'2026-08-01',endsAt:'2026-12-20'});
   const planned=await one('SELECT * FROM placements WHERE id=?',created.id!);
   expect(planned?.status).toBe('PLANNED');
   expect((await one('SELECT * FROM companies WHERE id=?',planned!.companyId))?.status).toBe('PRIVATE');
   expect((await one('SELECT supervisor_email FROM private_hosts WHERE placement_id=?',planned!.id))?.supervisorEmail).toBe('contact@example.invalid');
   await expect(mutate(users.coordinator,'guestEvaluationLink',{placementId:planned!.id,expiresInDays:7})).rejects.toThrow('assigned placement');
   await mutate(users.coordinator,'activatePlacement',{placementId:planned!.id});
   const student=await one('SELECT * FROM users WHERE id=?','student-private-host') as unknown as Identity;
   const studentView=await snapshot(student);
   expect(studentView.companies.some(company=>company.id===planned!.companyId)).toBe(false);
   expect(studentView.placements.some(placement=>placement.id===planned!.id&&placement.companyName==='Private Fictional Host')).toBe(true);
   expect(studentView.privateHosts).toEqual([]);
   expect((await snapshot(users.coordinator)).privateHosts).toMatchObject([expect.objectContaining({placementId:planned!.id,supervisorName:'R. Contact',supervisorEmail:'contact@example.invalid'})]);
   const guest=await mutate(users.coordinator,'guestEvaluationLink',{placementId:planned!.id,expiresInDays:7});
   expect(await guestEvaluationContext(guest.url!.split('/').pop()!,guest.accessCode!)).toMatchObject({studentName:'Jordan Lee',companyName:'Private Fictional Host'});
  });
  it('HTE snapshot contains only assigned placements and time-only DTR fields',async()=>{
   const s=await snapshot(users.supervisor);
   expect(s.placements.map(p=>p.id).sort()).toEqual(['placement-1','placement-3']);
   expect(s.entries.length).toBeGreaterThan(0);
   expect(s.entries.every(entry=>!('narrative' in entry))).toBe(true);
   expect(s.documents).toEqual([]);
   expect(s.incidents).toEqual([]);
   expect(s.audit).toEqual([]);
   await expect(mutate(users.supervisor,'confirm',{entryId:'entry-placement-1-15',version:1})).rejects.toThrow('replaced');
   await expect(mutate(users.supervisor,'confirm',{entryId:'entry-placement-2-15',version:1})).rejects.toThrow('replaced');
  });
  it('retires the sample HTE rubric and removes placement access when an assignment is revoked',async()=>{await expect(mutate(users.supervisor,'industryFinalEvaluation',{placementId:'placement-3'})).rejects.toThrow('school evaluation form');sql.prepare('UPDATE assignments SET active=0 WHERE placement_id=? AND supervisor_id=?').run('placement-3',users.supervisor.id);expect((await snapshot(users.supervisor)).placements.some(p=>p.id==='placement-3')).toBe(false);sql.prepare('UPDATE assignments SET active=1 WHERE placement_id=? AND supervisor_id=?').run('placement-3',users.supervisor.id);});
  it('guest evaluation requires the separate code and remains hidden until coordinator approval',async()=>{
   const issue=await mutate(users.coordinator,'guestEvaluationLink',{placementId:'placement-1',expiresInDays:7});
   const token=issue.url!.split('/').pop()!;
   await expect(guestEvaluationContext(token,'00000000')).rejects.toThrow('access code');
   const context=await guestEvaluationContext(token,issue.accessCode!);
   expect(context.studentName).toBe('Jamie Reyes');
   const scores={
    'Technical skills':{score:4,evidence:'Completed the sample API task.'},
    Communication:{score:4,evidence:'Shared a clear weekly update.'},
    Professionalism:{score:5,evidence:'Met the agreed schedule.'},
    'Problem solving':{score:4,evidence:'Investigated and documented an issue.'},
   };
   await submitGuestEvaluation(token,{accessCode:issue.accessCode,scores});
   await expect(submitGuestEvaluation(token,{accessCode:issue.accessCode,scores})).rejects.toThrow();
   const pending=await snapshot(users.student);
   expect(pending.evaluations.some(evaluation=>String(evaluation.evaluatorId??'').startsWith('guest:'))).toBe(false);
   const coordinatorView=await snapshot(users.coordinator);
   const evaluation=coordinatorView.evaluations.find(item=>String(item.evaluatorId??'').startsWith('guest:'))!;
   expect(evaluation.status).toBe('SUBMITTED');
   await mutate(users.coordinator,'evaluationReview',{evaluationId:evaluation.id,decision:'APPROVED'});
   expect((await snapshot(users.student)).evaluations.some(item=>item.id===evaluation.id)).toBe(true);
   const revoked=await mutate(users.coordinator,'guestEvaluationLink',{placementId:'placement-1',expiresInDays:7});
   await mutate(users.coordinator,'revokeGuestEvaluationLink',{linkId:revoked.id!});
   await expect(guestEvaluationContext(revoked.url!.split('/').pop()!,revoked.accessCode!)).rejects.toThrow('unavailable');
   const expired=await mutate(users.coordinator,'guestEvaluationLink',{placementId:'placement-1',expiresInDays:7});
   sql.prepare('UPDATE guest_evaluation_links SET expires_at=? WHERE id=?').run('2026-01-01T00:00:00.000Z',expired.id!);
   await expect(guestEvaluationContext(expired.url!.split('/').pop()!,expired.accessCode!)).rejects.toThrow('unavailable');
  });
  it('end-of-OJT forms unlock at reported hours and both are required for completion',async()=>{
   sql.prepare('UPDATE placements SET required_minutes=10021 WHERE id=?').run('placement-1');
   const self={technicalSkills:4,communication:4,professionalism:5,problemSolving:4,reflection:'I improved the way I test and explain my work.'};
   const exit={curriculumRelevance:4,universitySupport:5,workplaceAlignment:4,trainingPlanClarity:4,feedback:'Keep the coordinator check-ins and clarify the training plan early.'};
   await expect(mutate(users.student,'completionForm',{placementId:'placement-1',formType:'FINAL_SELF_ASSESSMENT',answers:self})).rejects.toThrow('reported DTR reaches');
   sql.prepare('UPDATE placements SET required_minutes=10000 WHERE id=?').run('placement-1');
   await mutate(users.student,'completionForm',{placementId:'placement-1',formType:'FINAL_SELF_ASSESSMENT',answers:self});
   await expect(mutate(users.coordinator,'completionDecision',{placementId:'placement-1',decision:'APPROVE'})).rejects.toThrow('verified final DTR');
   await mutate(users.student,'completionForm',{placementId:'placement-1',formType:'OJT_EXIT_SURVEY',answers:exit});
   await expect(mutate(users.student,'completionForm',{placementId:'placement-1',formType:'OJT_EXIT_SURVEY',answers:exit})).rejects.toThrow('already been submitted');
   await expect(mutate(users.coordinator,'completionDecision',{placementId:'placement-1',decision:'APPROVE'})).rejects.toThrow('verified final DTR');
   expect((await one('SELECT status FROM completion WHERE placement_id=?','placement-1'))?.status).toBe('PENDING');
   expect((await one('SELECT status FROM placements WHERE id=?','placement-1'))?.status).toBe('ACTIVE');
  });
  it('HTE feedback is anonymous and withheld below the five-placement threshold',async()=>{
   expect((await snapshot(users.supervisor)).reviews).toEqual([]);
   for(const [id,studentId,placementId] of [['feedback-1','demo-student','placement-1'],['feedback-2','student-2','placement-2'],['feedback-3','student-3','placement-3'],['feedback-4','student-5','placement-5']]) sql.prepare('INSERT INTO reviews (id,tenant_id,created_at,company_id,student_id,placement_id,rating,body,status) VALUES (?,?,?,?,?,?,?,?,?)').run(id,'fictional-university','2026-10-11T00:00:00Z','company-northstar',studentId,placementId,4,'Fictional anonymized feedback.','APPROVED');
   const reviews=(await snapshot(users.supervisor)).reviews;
   expect(reviews).toHaveLength(5);
   expect(reviews.every(review=>!('studentId' in review)&&!('studentName' in review))).toBe(true);
   const studentReviews=(await snapshot(users.student)).reviews.filter(review=>review.companyId==='company-northstar'&&review.studentId!==users.student.id);
   expect(studentReviews.every(review=>review.studentId===null&&review.studentName===null)).toBe(true);
  });
 it('database keeps a final application decision immutable',()=>{sql.prepare('UPDATE applications SET status=? WHERE id=?').run('ACCEPTED','app-1');expect(()=>sql.prepare('UPDATE applications SET status=? WHERE id=?').run('REJECTED','app-1')).toThrow('immutable');expect(sql.prepare('SELECT status FROM applications WHERE id=?').get('app-1')).toMatchObject({status:'ACCEPTED'});});
  it('reviews require formal completion, not a reported hours total',async()=>{const otherStudent=await one('SELECT * FROM users WHERE id=?','student-4') as unknown as Identity;await expect(mutate(otherStudent,'review',{placementId:'placement-4',rating:5,body:'Sample'})).rejects.toThrow('formal placement completion');});
 it('validates overnight minutes, ordering, future and placement boundary',()=>{expect(calculateMinutes('2026-09-25T22:00+08:00','2026-09-26T06:00+08:00',30,'2026-08-01','2026-12-20')).toBe(450);expect(()=>calculateMinutes('2026-09-25T22:00','2026-09-25T06:00',0,'2026-08-01','2026-12-20')).toThrow();expect(()=>calculateMinutes('2027-01-01','2027-01-02',0,'2026-08-01','2026-12-20')).toThrow();});
 it('generating sample values does not persist or submit',async()=>{const before=(await list('SELECT id FROM entries')).length;expect(sampleFor('dtr',{placementId:'placement-1'}).narrative).toContain('Sample');expect((await list('SELECT id FROM entries')).length).toBe(before);});
 it('isolates notifications by user and provides unread tracking',async()=>{const studentSnap=await snapshot(users.student);expect(studentSnap.notifications.length).toBeGreaterThan(0);expect(studentSnap.notifications.every(n=>n.userId===users.student.id)).toBe(true);const unreadBefore=studentSnap.notifications.filter(n=>!n.readAt).length;expect(unreadBefore).toBeGreaterThan(0);await mutate(users.student,'markNotificationRead',{notificationId:'notif-1'});const updatedSnap=await snapshot(users.student);expect(updatedSnap.notifications.find(n=>n.id==='notif-1')?.readAt).not.toBeNull();await mutate(users.student,'markAllNotificationsRead',{});const clearedSnap=await snapshot(users.student);expect(clearedSnap.notifications.every(n=>n.readAt!==null)).toBe(true);});
 it('triggers notifications for document review, attendance confirmation, support cases, and announcements',async()=>{await mutate(users.coordinator,'documentReview',{documentId:'doc-placement-1-2',status:'APPROVED',reason:'All requirements verified.'});const docNotif=await one('SELECT * FROM notifications WHERE user_id=? AND resource_id=? AND type=\'DOCUMENT\'',users.student.id,'doc-placement-1-2');expect(docNotif).not.toBeNull();expect(docNotif?.title).toBe('Document Clearance Approved');await mutate(users.student,'incident',{placementId:'placement-1',subject:'Urgent schedule question',narrative:'Need to clarify company shift changes.'});const caseNotif=await one('SELECT * FROM notifications WHERE user_id=? AND type=\'SUPPORT\' ORDER BY created_at DESC LIMIT 1',users.coordinator.id);expect(caseNotif).not.toBeNull();expect(caseNotif?.title).toBe('New Student Support Inquiry');await mutate(users.coordinator,'announcement',{title:'Midterm Checklist Released',body:'Review all DTRs before Friday.',classId:'class-it'});const annNotif=await one('SELECT * FROM notifications WHERE user_id=? AND type=\'ANNOUNCEMENT\' AND title=?','demo-student','New Class Announcement');expect(annNotif).not.toBeNull();});
});

describe('PSS-26 to PSS-29 workflow regressions',()=>{
 it('unverified HTEs cannot view applicants, create posts, or select candidates',async()=>{
  sql.prepare('INSERT INTO users (id,tenant_id,created_at,name,username,email,role,status,password_hash,session_version,is_demo,course_id,company_id,supervisor_verified,can_post) VALUES (?,?,?,?,?,?,?,\'ACTIVE\',NULL,1,0,NULL,NULL,0,0)').run('supervisor-pending-ticket','fictional-university','2026-10-12T00:00:00Z','Pending Supervisor','pending.ticket','pending.ticket@example.invalid','SUPERVISOR');
  const pending=await one('SELECT * FROM users WHERE id=?','supervisor-pending-ticket') as unknown as Identity;
  const profile=await mutate(pending,'companyProfile',{name:'Pending Fictional Partner',industry:'Technology',location:'Pasig',description:'Pending profile.'});
  const refreshed=await one('SELECT * FROM users WHERE id=?','supervisor-pending-ticket') as unknown as Identity;
  expect((await snapshot(refreshed)).applications).toEqual([]);
  expect((await snapshot(refreshed)).placements).toEqual([]);
  await expect(mutate(refreshed,'job',{title:'Unverified post',description:'Hidden until approval.',location:'Pasig',courseId:'course-it',skills:'Testing',openings:1})).rejects.toThrow('approval');
  await expect(mutate(refreshed,'selectApplication',{applicationId:'app-1',decision:'SHORTLISTED'})).rejects.toThrow('verified company profile');
  expect((await one('SELECT status FROM companies WHERE id=?',profile.id!))?.status).toBe('PENDING');
 });
 it('HTEs only see and select applicants on their own published posts',async()=>{
  const draft=await mutate(users.supervisor,'job',{title:'Hidden draft',description:'Not public yet.',location:'Pasig',courseId:'course-it',skills:'Testing',openings:1});
  sql.prepare('INSERT INTO applications (id,tenant_id,created_at,job_id,student_id,cover_letter,status) VALUES (?,?,?,?,?,?,\'SUBMITTED\')').run('app-draft-ticket','fictional-university','2026-10-12T00:00:00Z',draft.id!,'student-2','Fictional application.');
  expect((await snapshot(users.supervisor)).applications.some(application=>application.id==='app-draft-ticket')).toBe(false);
  await expect(mutate(users.supervisor,'selectApplication',{applicationId:'app-draft-ticket',decision:'SHORTLISTED'})).rejects.toThrow('not available');
 });
 it('guest links stop revealing data when their issuing coordinator loses scope and rate-limit attempts',async()=>{
  const issue=await mutate(users.coordinator,'guestEvaluationLink',{placementId:'placement-1',expiresInDays:7});
  const token=issue.url!.split('/').pop()!;
  sql.prepare('UPDATE classes SET coordinator_id=? WHERE id=?').run(users.admin.id,'class-it');
  await expect(guestEvaluationContext(token,issue.accessCode!)).rejects.toThrow('unavailable');
  sql.prepare('UPDATE classes SET coordinator_id=? WHERE id=?').run(users.coordinator.id,'class-it');
  const key=`guest-evaluation-test:${crypto.randomUUID()}`;
  for(let attempt=0;attempt<5;attempt++)await limit(key,5);
  await expect(limit(key,5)).rejects.toThrow('Too many attempts');
 });
 it('completion forms reject extra fields and cross-student placement access',async()=>{
  sql.prepare(`UPDATE placements SET required_minutes=1,status='ACTIVE' WHERE id=?`).run('placement-1');
  const self={technicalSkills:4,communication:4,professionalism:5,problemSolving:4,reflection:'A valid reflection.'};
  await expect(mutate(users.student,'completionForm',{placementId:'placement-1',formType:'FINAL_SELF_ASSESSMENT',answers:{...self,unexpected:'extra'}})).rejects.toThrow('required question');
  const other=await one('SELECT * FROM users WHERE id=?','student-2') as unknown as Identity;
  await expect(mutate(other,'completionForm',{placementId:'placement-1',formType:'FINAL_SELF_ASSESSMENT',answers:self})).rejects.toThrow('configured placement');
 });
});

describe('Auth.js Request/Response smoke checks',()=>{
 const origin='http://auth-test.local';
 function cookies(response:Response){return response.headers.getSetCookie().map(v=>v.split(';')[0]);}
 async function signIn(values:Record<string,string>){
  const csrfResponse=await authHandler(new Request(origin+'/api/auth/csrf'));
  const csrf=await csrfResponse.json() as {csrfToken:string};
  const response=await authHandler(new Request(origin+'/api/auth/callback/credentials',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Cookie':cookies(csrfResponse).join('; '),'X-Auth-Return-Redirect':'1'},body:new URLSearchParams({...values,csrfToken:csrf.csrfToken,callbackUrl:origin+'/'} )}));
  const result=await response.json() as {url:string};
  return {result,request:new Request(origin+'/api/data',{headers:{Cookie:cookies(response).join('; ')}})};
 }
  it('four quick sign-ins use Auth.js cookies for their fixed demo identities',async()=>{for(const role of ['student','coordinator','admin','supervisor']){const {result,request}=await signIn({demoId:'demo-'+role});expect(result.url).not.toContain('error=');const user=await identity(request);expect(user.id).toBe('demo-'+role);expect(user.isDemo).toBe(1);expect(user).not.toHaveProperty('passwordHash');}const bad=await signIn({demoId:'demo-not-a-real-account'});expect(bad.result.url).toContain('error=');});
 it('username/password still works for the HTE account',async()=>{const good=await signIn({username:'demo.student',password:'Demo@2026!'});expect((await identity(good.request)).id).toBe('demo-student');const hte=await signIn({username:'demo.supervisor',password:'Demo@2026!'});expect((await identity(hte.request)).role).toBe('SUPERVISOR');const bad=await signIn({username:'demo.student',password:'incorrect-password'});expect(bad.result.url).toContain('error=');await expect(identity(bad.request)).rejects.toThrow('sign in');});
 it('stale signed session fails after version revocation',async()=>{const signed=await signIn({demoId:'demo-student'});sql.prepare('UPDATE users SET session_version=session_version+1 WHERE id=?').run('demo-student');await expect(identity(signed.request)).rejects.toThrow('sign in');});
});
