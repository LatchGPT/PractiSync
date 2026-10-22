import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runtimeFixture } from './runtime-fixture';
import { one, statement } from '../packages/db/demo';
import { registerHte } from '../packages/domain/hte-workflows';
import { mutate } from '../packages/domain/actions';
import { snapshot } from '../packages/domain/read';
import { hteRegistration } from '../packages/validation/hte';
import { emailApplicantHref, recruitmentCourseIds } from '../packages/validation/recruitment';
import type { Identity, Row } from '../packages/validation/contracts';

let fixture: Awaited<ReturnType<typeof runtimeFixture>>;
let admin: Identity, supervisor: Identity, student: Identity, coordinator: Identity;
const details = { name:'Recruitment test partner', industry:'Technology', location:'Pasig', description:'Fictional company for recruitment verification.', contactName:'Rina Santos', contactPosition:'Training coordinator', contactPhone:'+63 917 555 0148', website:'https://example.invalid', email:'recruitment-test@example.invalid', username:'recruitment.test', password:'FictionalTest!2026' };
const post = { title:'OJT systems and operations intern', description:'Assist with software and business process documentation.', location:'Pasig · Hybrid', skills:'Documentation, Communication', openings:4, courseId:'course-it', courseIds:['course-it','course-business'] };
const review = async (id: string, decision = 'APPROVE', note = '') => { const request = (await one("SELECT * FROM hte_requests WHERE resource_id=? AND status='PENDING'",id))!; return mutate(admin,'hteRequestReview',{requestId:request.id,version:Number(request.version),decision,note}); };
beforeAll(async () => { fixture = await runtimeFixture(); admin = await fixture.actor('demo-admin'); supervisor = await fixture.actor('demo-supervisor'); student = await fixture.actor('demo-student'); coordinator = await fixture.actor('demo-coordinator'); });
afterAll(() => fixture.cleanup());

describe('Industry Partner registration and recruitment', () => {
 it('requires contact information and rejects unsafe websites and malformed phones', () => {
  expect(hteRegistration.safeParse(details).success).toBe(true);
  expect(hteRegistration.safeParse({...details,contactPhone:undefined}).success).toBe(false);
  expect(hteRegistration.safeParse({...details,contactPosition:''}).success).toBe(false);
  expect(hteRegistration.safeParse({...details,contactPhone:'.......'}).success).toBe(false);
  expect(hteRegistration.safeParse({...details,website:'javascript:alert(1)'}).success).toBe(false);
 });
 it('retains company contacts through registration rejection, correction, approval, and staged profile changes', async () => {
  const created = await registerHte(details);
  const request = (await one('SELECT * FROM hte_requests WHERE id=?',created.id!))!;
  let partner = await fixture.actor(String(request.requesterId));
  expect(await one('SELECT * FROM companies WHERE id=?',partner.companyId!)).toMatchObject({contactPhone:details.contactPhone,contactPosition:details.contactPosition,contactEmail:details.email});
  expect(JSON.stringify(request)).not.toContain(details.password);
  expect((await snapshot(partner)).applications).toEqual([]);
  await review(partner.companyId!,'REJECT','Correct the address.');
  await mutate(partner,'companyProfile',{...details,contactEmail:details.email,location:'Mandaluyong'});
  await review(partner.companyId!);
  partner = await fixture.actor(partner.id);
  const company = (await one('SELECT * FROM companies WHERE id=?',partner.companyId!))!;
  await mutate(partner,'hteProfileChange',{...details,contactEmail:details.email,contactPhone:'+63 917 555 0177',version:Number(company.version)});
  expect((await one('SELECT * FROM companies WHERE id=?',company.id))?.contactPhone).toBe(details.contactPhone);
  await review(company.id);
  expect((await one('SELECT * FROM companies WHERE id=?',company.id))?.contactPhone).toBe('+63 917 555 0177');
 });
 it('validates program ownership, intern counts, and coordinator program scope', async () => {
  await expect(mutate(supervisor,'job',{...post,openings:0})).rejects.toThrow();
  await expect(mutate(supervisor,'job',{...post,openings:1.5})).rejects.toThrow();
  await expect(mutate(supervisor,'job',{...post,courseIds:[]})).rejects.toThrow();
  await expect(mutate(supervisor,'job',{...post,courseIds:['course-it','foreign-program']})).rejects.toThrow('valid programs');
  await expect(mutate(coordinator,'job',{...post,companyId:supervisor.companyId,courseIds:['course-it','course-education']})).rejects.toThrow('assigned to your classes');
 });
 it('publishes multiple programs only after approval, preserves approved edits, and hides approved closures', async () => {
  const created = await mutate(supervisor,'job',post);
  expect((await snapshot(student)).jobs.some(job => job.id === created.id)).toBe(false);
  await review(created.id!);
  let job = (await one('SELECT * FROM jobs WHERE id=?',created.id!))!;
  expect(recruitmentCourseIds(job)).toEqual(['course-it','course-business']);
  expect((await snapshot(student)).jobs.some(item => item.id === job.id)).toBe(true);
  await mutate(supervisor,'hteJobChange',{...post,title:'Revised OJT position',courseIds:['course-it','course-education'],jobId:job.id,version:Number(job.version)});
  expect(recruitmentCourseIds((await one('SELECT * FROM jobs WHERE id=?',job.id))!)).toEqual(['course-it','course-business']);
  await review(job.id,'REJECT','Keep the original programs.');
  expect((await one('SELECT * FROM jobs WHERE id=?',job.id))?.title).toBe(post.title);
  await mutate(supervisor,'hteJobChange',{...post,title:'Approved OJT position',jobId:job.id,version:Number(job.version)});
  await review(job.id);
  job = (await one('SELECT * FROM jobs WHERE id=?',job.id))!;
  expect(job.title).toBe('Approved OJT position');
  await mutate(supervisor,'hteJobClose',{jobId:job.id,version:Number(job.version)});
  expect((await snapshot(student)).jobs.some(item => item.id === job.id)).toBe(true);
  await review(job.id);
  expect((await snapshot(student)).jobs.some(item => item.id === job.id)).toBe(false);
 });
 it('accepts a secondary-program applicant and confirms that program’s class and hours policy', async () => {
  const created = await mutate(supervisor,'job',post); await review(created.id!);
  const applicant = await fixture.actor('student-2');
  const applied = await mutate(applicant,'application',{jobId:created.id,coverLetter:'I can contribute business process documentation.',contactPhone:'+63 917 555 0131'});
  await expect(mutate(applicant,'application',{jobId:created.id,coverLetter:'Duplicate'})).rejects.toThrow('already applied');
  await expect(mutate(await fixture.actor('student-4'),'application',{jobId:created.id,coverLetter:'Different program'})).rejects.toThrow('course');
  await mutate(supervisor,'selectApplication',{applicationId:applied.id,decision:'SHORTLISTED'});
  await statement("UPDATE placements SET status='COMPLETED' WHERE student_id=?",applicant.id).run();
  await expect(mutate(coordinator,'confirmPlacement',{applicationId:applied.id,classId:'class-it',startsAt:'2026-10-22',endsAt:'2026-12-20'})).rejects.toThrow('class');
  const confirmed = await mutate(coordinator,'confirmPlacement',{applicationId:applied.id,classId:'class-business',startsAt:'2026-10-22',endsAt:'2026-12-20'});
  expect(await one('SELECT * FROM placements WHERE id=?',confirmed.id!)).toMatchObject({courseId:'course-business',classId:'class-business',requiredMinutes:24000});
 });
 it('exposes contacts only to the owning approved partner and scoped university staff', async () => {
  const visible = (await snapshot(supervisor)).applications.find(application => application.contactPhone === '+63 917 555 0131')!;
  expect(visible.studentEmail).toBe((await fixture.actor('student-2')).email);
  expect((await snapshot(coordinator)).applications.some(application => application.id === visible.id)).toBe(true);
  await statement('UPDATE users SET can_post=1 WHERE id=?','supervisor-brightside').run();
  expect((await snapshot(await fixture.actor('supervisor-brightside'))).applications.some(application => application.id === visible.id)).toBe(false);
  expect((await snapshot(await fixture.actor('coordinator-other'))).applications.some(application => application.id === visible.id)).toBe(false);
  expect((await snapshot(student)).applications.some(application => application.id === visible.id)).toBe(false);
  expect((await snapshot({...supervisor,tenantId:'other-university'})).applications).toEqual([]);
 });
 it('preserves legacy single-program records and constructs email links without header injection', async () => {
  const legacy = (await one('SELECT * FROM jobs WHERE id=?','job-1'))!;
  expect(recruitmentCourseIds(legacy)).toEqual(['course-it']);
  const href = emailApplicantHref('applicant@rtu.edu.ph','QA & testing');
  expect(href).toContain('mailto:applicant%40rtu.edu.ph?subject=');
  expect(decodeURIComponent(href!)).toContain('OJT application: QA & testing');
  expect(emailApplicantHref('x@example.com?bcc=outsider@example.com','QA')).toBeUndefined();
  expect(emailApplicantHref('x@example.com\r\nbcc:outsider@example.com','QA')).toBeUndefined();
  expect(recruitmentCourseIds({...legacy,requiredCoursesJson:'broken'} as Row)).toEqual(['course-it']);
 });
});
