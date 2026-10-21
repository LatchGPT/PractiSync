import { beforeAll,afterAll,beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import { runtimeFixture } from './runtime-fixture';
import { insert,list,one,statement,installTestDatabase,type PreparedStatement } from '../packages/db/demo';
import { mutate } from '../packages/domain/actions';
import { runDeadlineReminders } from '../packages/domain/reminders';
import { reminderTimes,deadlineTime } from '../packages/domain/deadline-time';
let fixture:Awaited<ReturnType<typeof runtimeFixture>>;
beforeAll(async()=>{fixture=await runtimeFixture();});
beforeEach(async()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-01T00:00:00Z'));for(const table of ['deadline_reminder_deliveries','deadline_reminder_slots','deadline_reminder_policies','notification_preferences'])await statement(`DELETE FROM ${table}`).run();await statement("DELETE FROM notifications WHERE resource_type='deadline_reminder'").run();});
afterEach(()=>vi.useRealTimers());afterAll(()=>fixture.cleanup());
const deadline={eventType:'DEADLINE',title:'Fictional document deadline',description:'Submit the linked university form.',startDate:'2026-11-01',endDate:'2026-11-10',audience:'CLASS',classId:'class-it',remindersEnabled:1,reminderTarget:'NONE'};
const create=async(extra:Record<string,unknown>={})=>mutate(await fixture.actor('demo-coordinator'),'calendarEvent',{...deadline,...extra});
describe('Scheduled Manila document reminders',()=>{
 it('computes date-only and explicit cutoffs and does not deliver on publication',async()=>{
  expect(reminderTimes('2026-11-10').map(r=>r.dueAt)).toEqual(['2026-11-07T01:00:00.000Z','2026-11-09T01:00:00.000Z']);
  expect(deadlineTime('2026-11-10').toISOString()).toBe('2026-11-10T15:59:00.000Z');
  expect(deadlineTime('2026-11-10','17:00').toISOString()).toBe('2026-11-10T09:00:00.000Z');
  await create();expect(await runDeadlineReminders('fictional-university',new Date('2026-11-07T00:59:59Z'))).toBe(0);
  expect((await list("SELECT * FROM notifications WHERE resource_type='deadline_reminder'"))).toHaveLength(0);
 });
 it('delivers once at 09:00 Manila and remains deduplicated on repeated runs',async()=>{
  const event=await create();const now=new Date('2026-11-07T01:00:00Z');
  expect(await runDeadlineReminders('fictional-university',now)).toBeGreaterThan(0);
  const before=await list("SELECT * FROM notifications WHERE resource_type='deadline_reminder' AND resource_id=?",event.id!);
  expect(before.some(n=>n.userId==='demo-student')).toBe(true);
  expect(await runDeadlineReminders('fictional-university',now)).toBe(0);
  expect((await list("SELECT * FROM notifications WHERE resource_type='deadline_reminder' AND resource_id=?",event.id!))).toHaveLength(before.length);
 });
 it('suppresses submitted forms and permits the remaining slot after correction',async()=>{
  await insert('custom_document_templates',{title:'Reminder fixture',instructions:'Fictional form',created_by:'demo-admin',category:'OJT',fields_json:'[]',status:'PUBLISHED'},'reminder-template').run();
  await insert('custom_document_responses',{placement_id:'placement-1',template_id:'reminder-template',template_version:1,response_json:'{}',template_json:'{}',status:'SUBMITTED',submitted_at:'2026-11-01T00:00:00Z',updated_at:'2026-11-01T00:00:00Z',version:1},'reminder-response').run();
  const event=await create({reminderTarget:'CUSTOM_TEMPLATE:reminder-template'});
  await runDeadlineReminders('fictional-university',new Date('2026-11-07T01:00:00Z'));
  expect(await one("SELECT id FROM notifications WHERE resource_type='deadline_reminder' AND resource_id=? AND user_id='demo-student'",event.id!)).toBeNull();
  await statement("UPDATE custom_document_responses SET status='REVISION_REQUESTED' WHERE id='reminder-response'").run();
  await runDeadlineReminders('fictional-university',new Date('2026-11-09T01:00:00Z'));
  expect(await one("SELECT id FROM notifications WHERE resource_type='deadline_reminder' AND resource_id=? AND user_id='demo-student'",event.id!)).not.toBeNull();
 });
 it('suppresses removed recipients, preferences, canceled events and stale schedules',async()=>{
  const actor=await fixture.actor('demo-student');await mutate(actor,'reminderPreference',{enabled:0});const event=await create();
  await runDeadlineReminders('fictional-university',new Date('2026-11-07T01:00:00Z'));
  expect(await one("SELECT id FROM notifications WHERE resource_type='deadline_reminder' AND user_id='demo-student'")).toBeNull();
  await mutate(await fixture.actor('demo-coordinator'),'cancelCalendarEvent',{eventId:event.id});
  expect(await runDeadlineReminders('fictional-university',new Date('2026-11-09T01:00:00Z'))).toBe(0);
  await create();await statement("UPDATE enrollments SET active=0 WHERE student_id='demo-student'").run();
  await runDeadlineReminders('fictional-university',new Date('2026-11-09T01:00:00Z'));
  expect(await one("SELECT id FROM notifications WHERE resource_type='deadline_reminder' AND user_id='demo-student'")).toBeNull();
  await statement("UPDATE enrollments SET active=1 WHERE student_id='demo-student'").run();
 });
 it('coalesces missed reminders, expires late jobs, and denies cross-class calendar edits',async()=>{
  const event=await create();await runDeadlineReminders('fictional-university',new Date('2026-11-09T03:00:00Z'));
  expect((await list("SELECT * FROM notifications WHERE resource_type='deadline_reminder' AND user_id='demo-student' AND resource_id=?",event.id!))).toHaveLength(1);
  expect((await list("SELECT * FROM deadline_reminder_slots WHERE event_id=? AND status='SUPERSEDED'",event.id!))).toHaveLength(1);
  expect(await runDeadlineReminders('fictional-university',new Date('2026-11-11T00:00:00Z'))).toBe(0);
  await expect(mutate(await fixture.actor('coordinator-other'),'cancelCalendarEvent',{eventId:event.id})).rejects.toThrow('assigned classes');
  const uni=await mutate(await fixture.actor('demo-admin'),'calendarEvent',{...deadline,audience:'UNIVERSITY',classId:''});
  await expect(mutate(await fixture.actor('demo-coordinator'),'deleteCalendarEvent',{eventId:uni.id})).rejects.toThrow('assigned classes');
 });
 it('records delivery failure, uses bounded backoff and permits an authorized retry',async()=>{
  const event=await create();
  const fail=(source:PreparedStatement):PreparedStatement=>({bind:(...values)=>fail(source.bind(...values)),all:()=>source.all(),first:()=>source.first(),run:async()=>{throw new Error('Simulated transactional notification failure.');}});
  installTestDatabase({prepare:query=>query.startsWith('INSERT INTO notifications')?fail(fixture.db.prepare(query)):fixture.db.prepare(query),batch:queries=>fixture.db.batch(queries)});
  try{
   for(const now of ['2026-11-07T01:00:00Z','2026-11-07T01:01:01Z','2026-11-07T01:06:02Z'])expect(await runDeadlineReminders('fictional-university',new Date(now))).toBe(0);
   const slot=await one("SELECT * FROM deadline_reminder_slots WHERE event_id=? AND lead_days=3",event.id!);
   expect(slot?.status).toBe('FAILED');expect(slot?.attempts).toBe(3);expect(slot?.lastError).toContain('failed');
   expect(await one("SELECT id FROM notifications WHERE resource_type='deadline_reminder' AND resource_id=?",event.id!)).toBeNull();
  }finally{installTestDatabase(fixture.db);}
  const slot=(await one("SELECT * FROM deadline_reminder_slots WHERE event_id=? AND lead_days=3",event.id!))!;
  vi.setSystemTime(new Date('2026-11-07T01:07:00Z'));
  await mutate(await fixture.actor('demo-coordinator'),'retryDeadlineReminder',{slotId:slot.id});
  expect(await runDeadlineReminders('fictional-university',new Date())).toBeGreaterThan(0);
  expect((await one('SELECT * FROM deadline_reminder_slots WHERE id=?',slot.id))?.status).toBe('DISPATCHED');
 });
});
