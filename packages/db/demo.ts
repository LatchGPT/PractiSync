import { runtimeTenantId } from '../auth/runtime';
import { writeTenant } from './tenant-context';
import { prisma } from './client';
import { openLocalDemoDatabase } from './local-demo';
import { seedDemoClassmates } from './demo-classmates';
import { rtuCourses, rtuDepartments } from './rtu-university-structure';
import { TENANT, DomainError, demoAllowed } from '../domain/policies';
import { demoAccounts } from '../test-utils/fixtures';
import { camelRows, type Row } from '../validation/contracts';

type Values = (string | number | null)[];
type RowResult = Record<string, unknown>;

export interface PreparedStatement {
  bind(...values: Values): PreparedStatement;
  all<T extends RowResult = RowResult>(): Promise<{ results: T[] }>;
  first<T extends RowResult = RowResult>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface DemoDatabase {
  prepare(sql: string): PreparedStatement;
  batch(statements: PreparedStatement[]): Promise<unknown[]>;
}

type QueryExecutor = (sql: string, values: Values) => Promise<RowResult[]>;
type RunExecutor = (sql: string, values: Values) => Promise<unknown>;

function compilePostgres(sql: string, values: Values): [string, Values] {
  let query = sql.trim();

  // The notification table is owned by a Prisma migration, not created at runtime.
  if (/^CREATE TABLE IF NOT EXISTS (notifications|outcome_decisions|industry_feedback)\b/i.test(query)) return ['', []];

  query = query.replace(/datetime\('now'\)/gi, "CURRENT_TIMESTAMP::text");
  query = query.replace(/^INSERT\s+OR\s+REPLACE\s+INTO\s+seed_state\b/i, 'INSERT INTO seed_state');
  if (/^INSERT\s+OR\s+REPLACE\s+INTO\s+seed_state\b/i.test(sql.trim())) {
    query += ' ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value';
  } else if (/^INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(query)) {
    query = query.replace(/^INSERT\s+OR\s+IGNORE\s+INTO\b/i, 'INSERT INTO');
    if (!/\bON\s+CONFLICT\b/i.test(query)) query += ' ON CONFLICT DO NOTHING';
  }

  let position = 0;
  let inString = false;
  let compiled = '';
  for (let index = 0; index < query.length; index += 1) {
    const character = query[index]!;
    if (character === "'" && query[index - 1] !== '\\') inString = !inString;
    if (character === '?' && !inString) {
      position += 1;
      compiled += `$${position}`;
    } else {
      compiled += character;
    }
  }

  if (position !== values.length) {
    throw new Error(`Query expected ${position} values but received ${values.length}.`);
  }
  return [compiled, values];
}

class BoundStatement implements PreparedStatement {
  private values: Values = [];

  constructor(
    private readonly source: string,
    private readonly query: QueryExecutor,
    private readonly execute: RunExecutor,
  ) {}

  bind(...values: Values): PreparedStatement {
    this.values = values;
    return this;
  }

  async all<T extends RowResult = RowResult>(): Promise<{ results: T[] }> {
    const [sql, values] = compilePostgres(this.source, this.values);
    if (!sql) return { results: [] };
    return { results: (await this.query(sql, values)) as T[] };
  }

  async first<T extends RowResult = RowResult>(): Promise<T | null> {
    return (await this.all<T>()).results[0] ?? null;
  }

  async run(): Promise<unknown> {
    const [sql, values] = compilePostgres(this.source, this.values);
    if (!sql) return { success: true };
    return this.execute(sql, values);
  }

  async runIn(execute: RunExecutor): Promise<unknown> {
    const [sql, values] = compilePostgres(this.source, this.values);
    if (!sql) return { success: true };
    return execute(sql, values);
  }
}

class PrismaDemoDatabase implements DemoDatabase {
  constructor(private readonly client: typeof prisma) {}

  prepare(sql: string): BoundStatement {
    return new BoundStatement(
      sql,
      (query, values) => this.client.$queryRawUnsafe(query, ...values) as Promise<RowResult[]>,
      (query, values) => this.client.$executeRawUnsafe(query, ...values),
    );
  }

  async batch(statements: PreparedStatement[]): Promise<unknown[]> {
    return this.client.$transaction(async (tx) => {
      const execute: RunExecutor = (query, values) => tx.$executeRawUnsafe(query, ...values);
      const results: unknown[] = [];
      for (const statement of statements) {
        if (!(statement instanceof BoundStatement)) throw new Error('Unsupported database statement.');
        results.push(await statement.runIn(execute));
      }
      return results;
    });
  }
}

let testDatabase: DemoDatabase | undefined;

/** Allows the domain suite to use an isolated SQLite database without a Worker runtime. */
export function installTestDatabase(database: DemoDatabase | undefined) {
  testDatabase = database;
}

export function settings() {
  return process.env as NodeJS.ProcessEnv & {
    AUTH_SECRET?: string;
    DEPLOYMENT_MODE?: string;
    DEMO_ENABLED?: string;
  };
}

export function database(): DemoDatabase {
  const cfg = settings();
  runtimeTenantId();
  if (testDatabase) return testDatabase;
  if (cfg.PRACTISYNC_LOCAL_DEMO === 'true' && demoAllowed(cfg.DEPLOYMENT_MODE,cfg.DEMO_ENABLED)) return (testDatabase = openLocalDemoDatabase());
  if (!cfg.DATABASE_URL) throw new DomainError('The demo database is unavailable. Please try again.', 503);
  return new PrismaDemoDatabase(prisma);
}

export async function list(sql: string, ...args: Values): Promise<Row[]> {
  const result = await database().prepare(sql).bind(...args).all();
  return camelRows(result.results);
}

export async function one(sql: string, ...args: Values) {
  return (await list(sql, ...args))[0] ?? null;
}

export function statement(sql: string, ...args: Values) {
  return database().prepare(sql).bind(...args);
}

export function insert(table: string, values: Record<string, string | number | null>, id = crypto.randomUUID()) {
  const record = { id, tenant_id: writeTenant(), created_at: new Date().toISOString(), ...values };
  const columns = Object.keys(record);
  return statement(
    `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
    ...Object.values(record),
  );
}

export function auditStatement(actorId: string, action: string, resourceId: string, reason: string | null = null, tenantId = writeTenant()) {
  return insert('audit', { tenant_id:tenantId, actor_id: actorId, action, resource_id: resourceId, reason });
}

export async function seed() {
  if (!demoAllowed(settings().DEPLOYMENT_MODE,settings().DEMO_ENABLED)) return;
  const db = database();
  if (!testDatabase) {
    const tenant = await prisma.tenant.upsert({
      where: { id: TENANT },
      update: {},
      create: {
        id: TENANT,
        name: 'Fictional University Demo',
        mode: 'DEMO',
        timezone: 'Asia/Manila',
      },
      select: { mode: true },
    });
    if (tenant.mode !== 'DEMO') {
      throw new DomainError('Demo fixtures cannot be seeded into an institutional tenant.', 403);
    }
  }

  // Promote the existing fictional HTE account for password sign-in without reseeding or resetting demo edits.
  await db.prepare("UPDATE users SET is_demo=1 WHERE id=? AND username=? AND role=?").bind('demo-supervisor', 'demo.supervisor', 'SUPERVISOR').run();

  const existingSeed = await db.prepare("SELECT value FROM seed_state WHERE key='seed-v9'").first();
  const ensureSchedules = () => db.prepare("INSERT OR IGNORE INTO assessment_schedules (id,tenant_id,created_at,course_id,cadence,updated_at,version) SELECT 'schedule-' || id,tenant_id,datetime('now'),id,'WEEKLY',datetime('now'),1 FROM courses").run();
  if (existingSeed) {
    await db.prepare("UPDATE companies SET name=?,location=?,description=? WHERE tenant_id=? AND id=?")
      .bind('Microgenesis Business Systems', 'Not specified', 'Technology partner supporting internship placements.', TENANT, 'company-northstar').run();
    await db.prepare("UPDATE classes SET section=?,name=? WHERE tenant_id=? AND id=?").bind('CEIT-37-701A', 'Internship Practicum', TENANT, 'class-it').run();
    await db.prepare("UPDATE placements SET company_id=? WHERE tenant_id=? AND id=? AND student_id=?").bind('company-northstar', TENANT, 'placement-1', 'demo-student').run();
    await db.prepare("DELETE FROM companies WHERE tenant_id=? AND id=?").bind(TENANT, 'company-microgenesis').run();
    await db.prepare("UPDATE notifications SET title=?,message=? WHERE tenant_id=? AND id=? AND user_id=?")
      .bind('Welcome to CEIT-37-701A', 'You are enrolled in Internship Practicum · CEIT-37-701A with coordinator Andrea Santos.', TENANT, 'notif-3', 'demo-student').run();
    await db.prepare("UPDATE notifications SET message=? WHERE tenant_id=? AND id=?")
      .bind('Luca Tan requested to join practicum section CEIT-37-701A.', TENANT, 'notif-5').run();
    await db.prepare("UPDATE notifications SET message=? WHERE tenant_id=? AND id=?")
      .bind('A fictional document metadata record was submitted in CEIT-37-701A.', TENANT, 'notif-7').run();
    await db.prepare("UPDATE join_requests SET note=? WHERE tenant_id=? AND id=?")
      .bind('Requesting to join section CEIT-37-701A', TENANT, 'req-1').run();
    await ensureSchedules();
    await seedDemoClassmates(db);
    return;
  }
  const now = '2026-10-01T00:00:00Z';
  const statements: PreparedStatement[] = [];
  const add = (table: string, id: string, values: Record<string, string | number | null>) => {
    const record = { id, tenant_id: TENANT, created_at: now, ...values };
    const columns = Object.keys(record);
    statements.push(db.prepare(`INSERT OR IGNORE INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`).bind(...Object.values(record)));
  };
  const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const hash = 'pbkdf2:600000:90bf946a1d0eca8b1e26b35f2f4ca519:8445e1441d3f6f53427022bea343ef58b54f2d3a124483da8118855b46f4c448';
  for (const account of demoAccounts) {
    if (account.id === 'demo-supervisor') continue;
    add('users', account.id, { name: account.name, username: account.username, email: `${account.username}@rtu.edu.ph`, role: account.role, password_hash: hash, is_demo: 1, course_id: account.role === 'STUDENT' ? 'course-it' : null, company_id: null, supervisor_verified: 0, can_post: 0 });
  }
  for (const [id, name, course] of [['student-2', 'Sofia Mendoza', 'course-business'], ['student-3', 'Ethan Flores', 'course-it'], ['student-4', 'Mia Garcia', 'course-education'], ['student-5', 'Luca Tan', 'course-it'], ['student-completed', 'Nina Ramos', 'course-it']]) add('users', id, { name, username: id, email: `${id}@example.invalid`, role: 'STUDENT', course_id: course, is_demo: 0 });
  const additionalStudents = [
    { id: 'demo-student-06', name: 'Hannah Bautista', courseId: 'course-it', companyId: 'company-northstar', classId: 'class-it', placementId: 'placement-sample-06', requiredMinutes: 28800 },
    { id: 'demo-student-07', name: 'Miguel Santos', courseId: 'course-it', companyId: 'company-northstar', classId: 'class-it', placementId: 'placement-sample-07', requiredMinutes: 28800 },
    { id: 'demo-student-08', name: 'Camille Navarro', courseId: 'course-it', companyId: 'company-brightside', classId: 'class-it-b', placementId: 'placement-sample-08', requiredMinutes: 28800 },
    { id: 'demo-student-09', name: 'Rafael Cruz', courseId: 'course-it', companyId: 'company-northstar', classId: 'class-it-b', placementId: 'placement-sample-09', requiredMinutes: 28800 },
    { id: 'demo-student-10', name: 'Lea Villanueva', courseId: 'course-it', companyId: 'company-brightside', classId: 'class-it-b', placementId: 'placement-sample-10', requiredMinutes: 28800 },
    { id: 'demo-student-11', name: 'Diego Reyes', courseId: 'course-business', companyId: 'company-northstar', classId: 'class-business', placementId: 'placement-sample-11', requiredMinutes: 24000 },
    { id: 'demo-student-12', name: 'Bianca Flores', courseId: 'course-business', companyId: 'company-brightside', classId: 'class-business', placementId: 'placement-sample-12', requiredMinutes: 24000 },
    { id: 'demo-student-13', name: 'Adrian Lim', courseId: 'course-business', companyId: 'company-northstar', classId: 'class-business', placementId: 'placement-sample-13', requiredMinutes: 24000 },
    { id: 'demo-student-14', name: 'Clara Aquino', courseId: 'course-education', companyId: 'company-brightside', classId: 'class-ed', placementId: 'placement-sample-14', requiredMinutes: 24000 },
    { id: 'demo-student-15', name: 'Gabriel Mendoza', courseId: 'course-education', companyId: 'company-brightside', classId: 'class-ed', placementId: 'placement-sample-15', requiredMinutes: 24000 },
  ] as const;
  for (const student of additionalStudents) {
    add('users', student.id, { name: student.name, username: student.id, email: `${student.id}@example.invalid`, role: 'STUDENT', course_id: student.courseId, is_demo: 0 });
  }
  add('users', 'coordinator-other', { name: 'Patricia Lim', username: 'coordinator.other', email: 'patricia@example.invalid', role: 'COORDINATOR', is_demo: 0 });
  add('users', 'supervisor-northstar', { name: 'Engr. Marc Torres', username: 'supervisor.northstar', email: 'marc.torres@northstar.example.com', role: 'SUPERVISOR', course_id: null, company_id: 'company-northstar', supervisor_verified: 1, is_demo: 0 });
  add('users', 'supervisor-brightside', { name: 'Dr. Elena Cruz', username: 'supervisor.brightside', email: 'elena.cruz@brightside.example.com', role: 'SUPERVISOR', course_id: null, company_id: 'company-brightside', supervisor_verified: 1, is_demo: 0 });
  for (const department of rtuDepartments) add('departments', department.id, { name: department.name, code: department.code });
  for (const course of rtuCourses) add('courses', course.id, { department_id: course.departmentId, name: course.name, code: course.code });
  for (const department of rtuDepartments) {
    statements.push(db.prepare('UPDATE departments SET name=?,code=? WHERE tenant_id=? AND id=?').bind(department.name, department.code, TENANT, department.id));
  }
  for (const course of rtuCourses) {
    statements.push(db.prepare('UPDATE courses SET department_id=?,name=?,code=? WHERE tenant_id=? AND id=?').bind(course.departmentId, course.name, course.code, TENANT, course.id));
  }
  for (const [id, name, section, course, coordinator, code, expires, revoked, rep, vice] of [['class-it', 'Internship Practicum', 'CEIT-37-701A', 'course-it', 'demo-coordinator', 'SYNC4A', null, 0, 'demo-student', 'student-5'], ['class-it-b', 'OJT Practicum', 'BSIT 4-B', 'course-it', 'demo-coordinator', 'SYNC4B', null, 0, 'student-3', null], ['class-business', 'Business Practicum', 'BSBA 4-A', 'course-business', 'demo-coordinator', 'BIZ4A', null, 0, 'student-2', null], ['class-ed', 'Teaching Internship', 'BSED 4-A', 'course-education', 'coordinator-other', 'EDUC4A', null, 0, 'student-4', null], ['class-expired', 'Archived Practicum', 'BSIT 3-X', 'course-it', 'demo-coordinator', 'EXPIRED', '2026-01-01', 0, null, null], ['class-revoked', 'Archived Practicum', 'BSIT 3-Y', 'course-it', 'demo-coordinator', 'REVOKED', null, 1, null, null]] as const) {
    add('classes', id, { name, section, course_id: course, coordinator_id: coordinator, period: '2026–2027 · First semester', code_hash: await digest(code), code_label: code, expires_at: expires, revoked, class_rep_id: rep, vice_class_rep_id: vice });
  }
  for (const [id, name, industry, location, status, post, description] of [['company-northstar', 'Microgenesis Business Systems', 'Technology', 'Not specified', 'APPROVED', 1, 'Technology partner supporting internship placements.'], ['company-brightside', 'Brightside Learning', 'Education', 'Pasig', 'APPROVED', 1, 'A fictional learning center offering supervised teaching placements.'], ['company-pending', 'Meridian Ventures', 'Business', 'Makati', 'PENDING', 0, 'Fictional company awaiting university verification.']]) add('companies', String(id), { name, industry, location, status, can_post: post, description });
  add('users', 'demo-supervisor', { name: 'Morgan Lee', username: 'demo.supervisor', email: 'demo.supervisor@example.invalid', role: 'SUPERVISOR', password_hash: hash, is_demo: 1, company_id: 'company-northstar', supervisor_verified: 1, can_post: 1 });
  for (const [course, minutes] of [['course-it', 28800], ['course-business', 24000], ['course-education', 24000]] as const) add('policies', `policy-${course}`, { course_id: course, period: '2026–2027 · First semester', required_minutes: minutes, version: 1, author_id: 'demo-admin' });
  const placements = [
    ['placement-1', 'demo-student', 'company-northstar', 'class-it', 'course-it', 28800, 'ACTIVE'],
    ['placement-2', 'student-2', 'company-northstar', 'class-business', 'course-business', 24000, 'ACTIVE'],
    ['placement-3', 'student-3', 'company-northstar', 'class-it-b', 'course-it', 28800, 'ACTIVE'],
    ['placement-4', 'student-4', 'company-brightside', 'class-ed', 'course-education', 24000, 'ACTIVE'],
    ['placement-5', 'student-5', 'company-northstar', 'class-it', 'course-it', null, 'PLANNED'],
    ['placement-completed', 'student-completed', 'company-northstar', 'class-it', 'course-it', 28800, 'COMPLETED'],
    ...additionalStudents.map((student) => [student.placementId, student.id, student.companyId, student.classId, student.courseId, student.requiredMinutes, 'ACTIVE'] as const),
  ] as const;
  for (const [id, student, company, classId, course, minutes, status] of placements) {
    add('placements', id, { student_id: student, company_id: company, class_id: classId, course_id: course, period: '2026–2027 · First semester', starts_at: '2026-08-01', ends_at: '2026-12-20', required_minutes: minutes, policy_version: minutes ? 1 : null, status });
    add('enrollments', `enroll-${student}`, { class_id: classId, student_id: student });
    add('completion', `completion-${id}`, { placement_id: id, status: status === 'COMPLETED' ? 'APPROVED' : 'PENDING', reason: status === 'COMPLETED' ? 'Fictional completed placement.' : 'Completion rules not configured.' });
  }
  for (const placementId of ['placement-1', 'placement-3']) add('assignments', `assignment-${placementId}-demo-supervisor`, { placement_id: placementId, supervisor_id: 'demo-supervisor', active: 1 });
  let intervalIndex = 0;
  for (const [placementId] of placements) {
    for (let day = 1; day <= 20; day += 1) {
      const date = `2026-09-${String(day).padStart(2, '0')}`;
      const entryId = `entry-${placementId}-${day}`;
      const confirmed = day <= 14;
      add('entries', entryId, { placement_id: placementId, date, narrative: day % 3 === 0 ? 'Sample: Collaborated with the team on testing and documented the results.' : 'Sample: Completed supervised project tasks and recorded feedback for the next iteration.', version: 1, confirmed_version: confirmed ? 1 : null, confirmed_by: confirmed ? 'demo-coordinator' : null });
      add('intervals', `interval-${++intervalIndex}`, { entry_id: entryId, starts_at: `${date}T00:00:00.000Z`, ends_at: `${date}T09:00:00.000Z`, break_minutes: 60, minutes: 480 });
    }
    for (const [documentIndex, name, status] of [[1, 'Training agreement', 'APPROVED'], [2, 'Parent / guardian consent', 'PENDING'], [3, 'Student information sheet', 'REJECTED']] as const) add('documents', `doc-${placementId}-${documentIndex}`, { placement_id: placementId, name, filename: `fictional-sample-${documentIndex}.pdf`, status, reason: status === 'REJECTED' ? 'Sample: Please use a readable copy.' : status === 'APPROVED' ? 'Fictional sample metadata only.' : null });
    for (const kind of ['BASELINE', 'FINAL']) {
      const evaluationId = `eval-${placementId}-${kind}`;
      add('evaluations', evaluationId, { placement_id: placementId, evaluator_id: kind === 'BASELINE' ? placements.find((placement) => placement[0] === placementId)![1] : 'demo-coordinator', kind });
      for (const [dimensionIndex, dimension] of ['Technical skills', 'Communication', 'Professionalism', 'Problem solving'].entries()) add('scores', `${evaluationId}-${dimensionIndex}`, { evaluation_id: evaluationId, dimension, score: kind === 'BASELINE' ? [3, 3, 4, 2][dimensionIndex]! : [4, 4, 5, 4][dimensionIndex]! });
    }
  }
  add('incidents', 'case-1', { placement_id: 'placement-1', student_id: 'demo-student', coordinator_id: 'demo-coordinator', subject: 'Request for training-plan guidance', narrative: 'Fictional sample: I would like help discussing a change in my assigned tasks with my coordinator.', status: 'OPEN' });
  add('incidents', 'case-private', { placement_id: 'placement-4', student_id: 'student-4', coordinator_id: 'coordinator-other', subject: 'Unrelated private case', narrative: 'Fictional access-negative fixture.', status: 'OPEN' });
  for (const [id, title, course, skills] of [['job-1', 'Frontend Development Intern', 'course-it', 'React, TypeScript, CSS'], ['job-2', 'Business Operations Intern', 'course-business', 'Spreadsheets, Communication, Reporting'], ['job-3', 'QA & Software Testing Intern', 'course-it', 'Testing, SQL, Documentation']]) add('jobs', id, { company_id: 'company-northstar', author_id: 'demo-coordinator', title, course_id: course, skills, description: 'Sample: Join a supportive team with structured mentoring, weekly feedback, and hands-on project experience.', location: 'Mandaluyong · Hybrid', openings: 3, status: 'PUBLISHED' });
  add('jobs', 'job-pending', { company_id: 'company-pending', author_id: 'demo-coordinator', title: 'Draft internship', course_id: 'course-business', skills: 'Communication', description: 'Fictional unpublished fixture.', location: 'Makati', openings: 1, status: 'DRAFT' });
  add('applications', 'app-1', { job_id: 'job-1', student_id: 'demo-student', cover_letter: 'Sample: I would love to develop accessible interfaces with your team.', status: 'SUBMITTED' });
  add('announcements', 'announcement-1', { author_id: 'demo-coordinator', class_id: 'class-it', title: 'Your October check-in is coming up', body: 'Sample: Our class check-in is on October 9. Update your daily narratives and bring any questions about your training.', audience: 'CLASS' });
  add('announcements', 'announcement-2', { author_id: 'demo-admin', class_id: null, title: 'Welcome to your practicum semester', body: 'This fictional demo brings your attendance, documents, and training progress into one place.', audience: 'UNIVERSITY' });
  add('calendar_events', 'calendar-midterms-2026', { updated_at: now, event_type: 'ACADEMIC', title: 'Midterm assessment week', description: 'Sample: Check course announcements for assessment details and submission deadlines.', start_date: '2026-10-19', end_date: '2026-10-23', start_time: null, end_time: null, all_day: 1, location: null, meeting_url: null, audience: 'UNIVERSITY', class_id: null, created_by: 'demo-admin' });
  add('calendar_events', 'calendar-placement-deadline-2026', { updated_at: now, event_type: 'DEADLINE', title: 'Training plan checkpoint', description: 'Sample: Review your training plan with your coordinator before the end of the week.', start_date: '2026-10-22', end_date: '2026-10-22', start_time: null, end_time: null, all_day: 1, location: null, meeting_url: null, audience: 'UNIVERSITY', class_id: null, created_by: 'demo-admin' });
  add('calendar_events', 'calendar-orientation-2026', { updated_at: now, event_type: 'APPOINTMENT', title: 'OJT orientation', description: 'Sample: Bring your questions about attendance records and office support.', start_date: '2026-10-20', end_date: '2026-10-20', start_time: '10:00', end_time: '11:00', all_day: 0, location: 'COE Office · Room 204', meeting_url: null, audience: 'CLASS', class_id: 'class-it', created_by: 'demo-coordinator' });
  add('calendar_events', 'calendar-foundation-2026', { updated_at: now, event_type: 'HOLIDAY', title: 'University Foundation Day', description: 'Sample: Campus offices are closed for the university holiday.', start_date: '2026-10-27', end_date: '2026-10-27', start_time: null, end_time: null, all_day: 1, location: null, meeting_url: null, audience: 'UNIVERSITY', class_id: null, created_by: 'demo-admin' });
  add('reviews', 'review-1', { company_id: 'company-northstar', student_id: 'student-completed', placement_id: 'placement-completed', rating: 4, body: 'Sample: Thoughtful mentoring, practical project experience, and a welcoming team.', status: 'APPROVED' });
  add('join_requests', 'req-1', { class_id: 'class-it', student_id: 'student-5', status: 'PENDING', note: 'Requesting to join section CEIT-37-701A' });
  for (const [id, userId, title, message, type, resourceType, resourceId, linkPage, readAt] of [
    ['notif-1', 'demo-student', 'Attendance Confirmed', 'Coordinator Andrea Santos verified and confirmed your attendance record.', 'DTR', 'entry', 'entry-placement-1-14', 'attendance', null],
    ['notif-2', 'demo-student', 'Sample Document Record Approved', 'Your fictional document metadata record has been marked as approved.', 'DOCUMENT', 'document', 'doc-placement-1-1', 'documents', null],
    ['notif-3', 'demo-student', 'Welcome to CEIT-37-701A', 'You are enrolled in Internship Practicum · CEIT-37-701A with coordinator Andrea Santos.', 'CLASS', 'class', 'class-it', 'classes', '2026-10-02T08:00:00Z'],
    ['notif-4', 'demo-student', 'Class Announcement', 'Your October check-in is scheduled for Friday. Bring your latest narratives.', 'ANNOUNCEMENT', 'announcement', 'announcement-1', 'announcements', null],
    ['notif-5', 'demo-coordinator', 'New Class Join Request', 'Luca Tan requested to join practicum section CEIT-37-701A.', 'CLASS', 'join_request', 'req-1', 'classes', null],
    ['notif-6', 'demo-coordinator', 'Confidential Support Inquiry', 'Jamie Reyes submitted a request for coordinator guidance.', 'SUPPORT', 'incident', 'case-1', 'incidents', null],
    ['notif-7', 'demo-coordinator', 'Sample Document Record Awaiting Review', 'A fictional document metadata record was submitted in CEIT-37-701A.', 'DOCUMENT', 'document', 'doc-placement-1-2', 'documents', '2026-10-02T08:00:00Z'],
    ['notif-8', 'demo-admin', 'Policy Baseline Active', 'Course policy v1 active for Computing & Technology (480 required hours).', 'POLICY', 'policy', 'policy-course-it', 'policies', '2026-10-01T00:00:00Z'],
  ] as const) add('notifications', id, { user_id: userId, title, message, type, resource_type: resourceType, resource_id: resourceId, link_page: linkPage, read_at: readAt });
  add('outcome_decisions', 'outcome-dec-1', { placement_id: 'placement-completed', coordinator_id: 'demo-coordinator', decision: 'EXEMPLARY', rationale: 'Demonstrated exemplary technical mastery and consistent communication across all evaluation periods.', rubric_version: 1, calculated_score: 4.25, calculated_status: 'ACHIEVED' });
  add('assignments', 'assign-completed', { placement_id: 'placement-completed', supervisor_id: 'supervisor-northstar', active: 1 });
  add('assignments', 'assign-4', { placement_id: 'placement-4', supervisor_id: 'supervisor-brightside', active: 1 });
  add('industry_feedback', 'ind-feed-1', { placement_id: 'placement-completed', company_id: 'company-northstar', supervisor_id: 'supervisor-northstar', course_id: 'course-it', academic_period: '2026–2027 · First semester', framework_version: 1, workplace_readiness: 5, competency_relevance: 4, supervision_support: 5, curriculum_alignment: 4, technical_gaps: 'Git branching workflows, Docker containerization basics', soft_skill_gaps: 'Sprint grooming communication', recommendations: 'Strong foundation in React and TypeScript. Recommend incorporating hands-on Git conflict resolution and containerized deployment in the curriculum.', status: 'SUBMITTED' });
  add('industry_feedback', 'ind-feed-2', { placement_id: 'placement-1', company_id: 'company-northstar', supervisor_id: 'supervisor-northstar', course_id: 'course-it', academic_period: '2026–2027 · First semester', framework_version: 1, workplace_readiness: 4, competency_relevance: 4, supervision_support: 4, curriculum_alignment: 3, technical_gaps: 'Automated testing (Vitest/Jest), API contract validation', soft_skill_gaps: 'Client-facing status updates', recommendations: 'Student demonstrates quick learning and good problem solving. More emphasis on test-driven development and API integration would enhance readiness.', status: 'SUBMITTED' });
  add('industry_feedback', 'ind-feed-3', { placement_id: 'placement-3', company_id: 'company-northstar', supervisor_id: 'supervisor-northstar', course_id: 'course-it', academic_period: '2026–2027 · First semester', framework_version: 1, workplace_readiness: 4, competency_relevance: 5, supervision_support: 4, curriculum_alignment: 4, technical_gaps: 'SQL query optimization, Relational indexing', soft_skill_gaps: 'None observed', recommendations: 'Overall well prepared for engineering tasks. Integrating database performance tuning into advanced database subjects would be beneficial.', status: 'SUBMITTED' });
  add('industry_feedback', 'ind-feed-4', { placement_id: 'placement-4', company_id: 'company-brightside', supervisor_id: 'supervisor-brightside', course_id: 'course-education', academic_period: '2026–2027 · First semester', framework_version: 1, workplace_readiness: 4, competency_relevance: 5, supervision_support: 5, curriculum_alignment: 4, technical_gaps: 'Digital lesson planning tools', soft_skill_gaps: 'Parent-teacher conference facilitation', recommendations: 'Very strong pedagogy and classroom presence. Training on blended learning management systems would be a great addition.', status: 'SUBMITTED' });
  statements.push(db.prepare("INSERT OR REPLACE INTO seed_state (key,value) VALUES ('seed-v9','20261021')"));
  for (let index = 0; index < statements.length; index += 80) await db.batch(statements.slice(index, index + 80));
  await ensureSchedules();
  await seedDemoClassmates(db);
}
