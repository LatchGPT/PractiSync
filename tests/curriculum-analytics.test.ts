import { acceptFixtureUsers } from './consent-fixture';
import { workflowTargetFixtures } from './runtime-fixture';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

import { calculateCurriculumAnalytics } from '../packages/domain/curriculum-analytics';
import { mutate } from '../packages/domain/actions';
import { snapshot } from '../packages/domain/read';
import { seed, list, installTestDatabase, type DemoDatabase, type PreparedStatement } from '../packages/db/demo';
import type { Identity, Row } from '../packages/validation/contracts';

let sql: DatabaseSync;
function prepared(query: string, values: unknown[] = []): unknown {
  return {
    bind: (...args: unknown[]) => prepared(query, args),
    all: async () => ({ results: sql.prepare(query).all(...(values as (string | number | null)[])) }),
    first: async () => sql.prepare(query).get(...(values as (string | number | null)[])) ?? null,
    run: async () => ({ meta: sql.prepare(query).run(...(values as (string | number | null)[])) }),
  };
}

const mockPlacements: Row[] = [
  { id: 'p1', courseId: 'course-it', period: '2026-T1', companyId: 'comp-1', studentId: 's1', tenantId: 'fictional-university', createdAt: '2026-09-01' },
  { id: 'p2', courseId: 'course-it', period: '2026-T1', companyId: 'comp-1', studentId: 's2', tenantId: 'fictional-university', createdAt: '2026-09-01' },
  { id: 'p3', courseId: 'course-it', period: '2026-T1', companyId: 'comp-2', studentId: 's3', tenantId: 'fictional-university', createdAt: '2026-09-01' },
  { id: 'p4', courseId: 'course-it', period: '2026-T1', companyId: 'comp-2', studentId: 's4', tenantId: 'fictional-university', createdAt: '2026-09-01' },
  { id: 'p5', courseId: 'course-it', period: '2026-T1', companyId: 'comp-3', studentId: 's5', tenantId: 'fictional-university', createdAt: '2026-09-01' },
  { id: 'p6', courseId: 'course-business', period: '2026-T1', companyId: 'comp-1', studentId: 's6', tenantId: 'fictional-university', createdAt: '2026-09-01' },
];

const mockFeedback: Row[] = [
  {
    id: 'fb-1',
    placementId: 'p1',
    companyId: 'comp-1',
    supervisorId: 'sup-1', evaluatorId:'sup-1', enteredBy:'sup-1', assignmentId:'a1', authorshipMethod:'DIRECT', verificationState:'VERIFIED', verifiedAt:'2026-10-01', status:'SUBMITTED',
    courseId: 'course-it',
    academicPeriod: '2026-T1',
    frameworkVersion: 1,
    workplaceReadiness: 4,
    competencyRelevance: 4,
    supervisionSupport: 5,
    curriculumAlignment: 4,
    technicalGaps: 'Git branching, Docker containerization',
    softSkillGaps: 'Meeting participation',
    recommendations: 'Include Docker in lab coursework.',
    createdAt: '2026-10-01',
    tenantId: 'fictional-university',
  },
  {
    id: 'fb-2',
    placementId: 'p2',
    companyId: 'comp-1',
    supervisorId: 'sup-1', evaluatorId:'sup-1', enteredBy:'sup-1', assignmentId:'a1', authorshipMethod:'DIRECT', verificationState:'VERIFIED', verifiedAt:'2026-10-01', status:'SUBMITTED',
    courseId: 'course-it',
    academicPeriod: '2026-T1',
    frameworkVersion: 1,
    workplaceReadiness: 3,
    competencyRelevance: 4,
    supervisionSupport: 4,
    curriculumAlignment: 3,
    technicalGaps: 'Git branching, Automated testing',
    softSkillGaps: 'Client communication',
    recommendations: 'Focus more on unit testing and version control.',
    createdAt: '2026-10-02',
    tenantId: 'fictional-university',
  },
  {
    id: 'fb-3',
    placementId: 'p3',
    companyId: 'comp-2',
    supervisorId: 'sup-2', evaluatorId:'sup-2', enteredBy:'sup-2', assignmentId:'a2', authorshipMethod:'DIRECT', verificationState:'VERIFIED', verifiedAt:'2026-10-01', status:'SUBMITTED',
    courseId: 'course-it',
    academicPeriod: '2026-T1',
    frameworkVersion: 1,
    workplaceReadiness: 5,
    competencyRelevance: 5,
    supervisionSupport: 4,
    curriculumAlignment: 4,
    technicalGaps: 'Git branching, Cloud deployment',
    softSkillGaps: 'None observed',
    recommendations: 'Solid programming skills. Cloud exposure would be great.',
    createdAt: '2026-10-03',
    tenantId: 'fictional-university',
  },
];

beforeAll(async () => {
  vi.stubEnv('DEPLOYMENT_MODE', 'demo');
  vi.stubEnv('DEMO_ENABLED', 'true');
  vi.stubEnv('AUTH_SECRET', 'test-secret-that-is-not-a-production-secret');
  sql = new DatabaseSync(':memory:');
  const migration = readFileSync('packages/db/prisma/migrations/202610110001_demo_runtime/migration.sql', 'utf8').split('INSERT INTO "assessment_schedules"')[0]!;
  sql.exec(migration);
  sql.exec(readFileSync('packages/db/prisma/migrations/202610150001_calendar_events/migration.sql','utf8'));
  sql.exec(readFileSync('packages/db/prisma/migrations/202610110003_limited_hte_workflows/migration.sql', 'utf8'));
  sql.exec(readFileSync('packages/db/prisma/migrations/202610190001_hte_approvals_final_dtr/migration.sql','utf8'));
  sql.exec(`ALTER TABLE completion_responses ADD COLUMN status TEXT NOT NULL DEFAULT 'SUBMITTED';
ALTER TABLE completion_responses ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
ALTER TABLE completion_responses ADD COLUMN review_note TEXT;
ALTER TABLE completion_responses ADD COLUMN reviewer_id TEXT;
ALTER TABLE completion_responses ADD COLUMN reviewed_at TEXT;
UPDATE completion_responses SET updated_at=COALESCE(submitted_at,created_at);`);
  sql.exec(readFileSync('drizzle/0007_outcome_evaluations.sql', 'utf8').replace(/--> statement-breakpoint/g, ''));
  sql.exec(readFileSync('drizzle/0008_industry_feedback.sql', 'utf8'));sql.exec(readFileSync('packages/db/prisma/migrations/202610210001_feedback_provenance/migration.sql','utf8'));sql.exec(readFileSync('packages/db/prisma/migrations/202610210002_account_lifecycle/migration.sql','utf8'));sql.exec(readFileSync('packages/db/prisma/migrations/202610210003_deadline_reminders/migration.sql','utf8'));
  sql.exec(`CREATE TABLE custom_document_templates (id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,created_at TEXT NOT NULL,created_by TEXT NOT NULL,title TEXT NOT NULL,instructions TEXT NOT NULL,category TEXT NOT NULL,fields_json TEXT NOT NULL,status TEXT NOT NULL,version INTEGER NOT NULL,original_filename TEXT NOT NULL DEFAULT '',pdf_base64 TEXT NOT NULL DEFAULT '');CREATE TABLE custom_document_responses (id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,created_at TEXT NOT NULL,placement_id TEXT NOT NULL,template_id TEXT NOT NULL,template_version INTEGER NOT NULL,template_json TEXT NOT NULL DEFAULT '{}',response_json TEXT NOT NULL,submitted_at TEXT,updated_at TEXT NOT NULL,status TEXT NOT NULL,review_note TEXT,reviewer_id TEXT,reviewed_at TEXT,version INTEGER NOT NULL,UNIQUE(tenant_id,placement_id,template_id));`);
  const database: DemoDatabase = {
    prepare: (query) => prepared(query) as PreparedStatement,
    batch: async (statements) => {
      sql.exec('BEGIN');
      try {
        const values = [];
        for (const s of statements) values.push(await s.run());
        sql.exec('COMMIT');
        return values;
      } catch (e) {
        sql.exec('ROLLBACK');
        throw e;
      }
    },
  };
  installTestDatabase(database);
  sql.exec(readFileSync('packages/db/prisma/migrations/202610200001_student_verification/migration.sql','utf8').split('ALTER TABLE "StudentProfile"')[0]!);sql.exec(readFileSync('packages/db/prisma/migrations/202610200003_student_registration/migration.sql','utf8'));workflowTargetFixtures(sql);await seed();await acceptFixtureUsers();
});

afterAll(() => {
  installTestDatabase(undefined);
  vi.unstubAllEnvs();
});

describe('Industry Feedback & Curriculum Gap Analytics (PSS-20)', () => {
  beforeEach(async () => {
    await seed();
  });

  it('calculates aggregate readiness and curriculum dimensions with transparent sample disclosures', () => {
    const result = calculateCurriculumAnalytics(mockPlacements, mockFeedback, {
      courseId: 'course-it',
      academicPeriod: '2026-T1',
      privacyThreshold: 3,
    });

    expect(result.cohortSize).toBe(5); // 5 IT placements
    expect(result.feedbackCount).toBe(3); // 3 feedbacks
    expect(result.missingCount).toBe(2); // 5 - 3 = 2 missing
    expect(result.responseRatePercent).toBe(60.0);
    expect(result.scaleMin).toBe(1);
    expect(result.scaleMax).toBe(5);
    expect(result.frameworkVersion).toBe(1);
    expect(result.isPrivacySuppressed).toBe(false);
    expect(result.studentReviewsSeparated).toBe(true);

    // Dimension averages:
    // workplaceReadiness: (4 + 3 + 5) / 3 = 4.00
    // competencyRelevance: (4 + 4 + 5) / 3 = 4.33
    // supervisionSupport: (5 + 4 + 4) / 3 = 4.33
    // curriculumAlignment: (4 + 3 + 4) / 3 = 3.67
    const readiness = result.dimensions.find((d) => d.key === 'workplaceReadiness');
    expect(readiness?.averageScore).toBe(4.0);
    expect(readiness?.sampleCount).toBe(3);

    const relevance = result.dimensions.find((d) => d.key === 'competencyRelevance');
    expect(relevance?.averageScore).toBe(4.33);

    const alignment = result.dimensions.find((d) => d.key === 'curriculumAlignment');
    expect(alignment?.averageScore).toBe(3.67);
    expect(alignment?.isGap).toBe(false); // 3.67 >= 3.50 threshold
  });

  it('enforces privacy threshold suppression when sample size is below threshold', () => {
    // Only 1 feedback for company comp-2
    const result = calculateCurriculumAnalytics(mockPlacements, mockFeedback, {
      courseId: 'course-it',
      companyId: 'comp-2',
      privacyThreshold: 3,
    });

    expect(result.feedbackCount).toBe(1);
    expect(result.isPrivacySuppressed).toBe(true);
    expect(result.privacySuppressionNotice).toContain('Data suppressed for privacy');
    expect(result.overallIndex).toBeNull();
    // Dimension averages must be masked
    expect(result.dimensions.every((d) => d.averageScore === null)).toBe(true);
    // Qualitative recommendations must be suppressed
    expect(result.qualitativeRecommendations.length).toBe(0);
    expect(result.curriculumGaps.length).toBe(0);
  });

  it('warns about small sample size without inventing normalized scores when sample is under 5', () => {
    const result = calculateCurriculumAnalytics(mockPlacements, mockFeedback, {
      courseId: 'course-it',
      academicPeriod: '2026-T1',
      privacyThreshold: 2,
    });

    expect(result.isPrivacySuppressed).toBe(false);
    expect(result.isSmallSample).toBe(true);
    expect(result.smallSampleNotice).toContain('Preliminary sample size notice');
    expect(result.smallSampleNotice).toContain('not statistically representative');
  });

  it('identifies recurring curriculum gaps and flags low-scoring dimensions', () => {
    const result = calculateCurriculumAnalytics(mockPlacements, mockFeedback, {
      courseId: 'course-it',
      academicPeriod: '2026-T1',
      privacyThreshold: 3,
    });

    // "Git branching" appeared in all 3 evaluations
    const gitGap = result.curriculumGaps.find((g) => g.topic.toLowerCase() === 'git branching');
    expect(gitGap).toBeDefined();
    expect(gitGap?.mentionCount).toBe(3);
    expect(gitGap?.percentage).toBe(100);
    expect(gitGap?.sampleBasis).toBe('3 of 3 supervisor evaluations');

    // Docker and automated testing
    const dockerGap = result.curriculumGaps.find((g) => g.topic.toLowerCase().includes('docker'));
    expect(dockerGap).toBeDefined();
    expect(dockerGap?.mentionCount).toBe(1);
  });

  it('records supervisor feedback with role authorization and audit logging', async () => {
    const coordinatorUser: Identity = {
      id: 'demo-coordinator',
      name: 'Andrea Santos',
      username: 'demo.coordinator',
      email: 'demo.coordinator@rtu.edu.ph',
      role: 'COORDINATOR',
      status: 'ACTIVE',
      sessionVersion: 1,
      isDemo: 1,
      courseId: null,
      companyId: null,
      tenantId: 'fictional-university',
    };

    const studentUser: Identity = {
      id: 'demo-student',
      name: 'Jamie Reyes',
      username: 'demo.student',
      email: 'demo.student@rtu.edu.ph',
      role: 'STUDENT',
      status: 'ACTIVE',
      sessionVersion: 1,
      isDemo: 1,
      courseId: 'course-it',
      companyId: null,
      tenantId: 'fictional-university',
    };

    // 1. Students must not be permitted to submit employer feedback (only student company reviews)
    await expect(
      mutate(studentUser, 'industryFeedback', {
        placementId: 'placement-1',
        workplaceReadiness: 4,
        competencyRelevance: 4,
        supervisionSupport: 4,
        curriculumAlignment: 4,
        recommendations: 'Student should not be able to submit this.',
      })
    ).rejects.toThrow('You do not have permission');

    // Coordinators cannot impersonate employers.
    await expect(mutate(coordinatorUser,'industryFeedback',{placementId:'placement-1',workplaceReadiness:4,competencyRelevance:4,supervisionSupport:4,curriculumAlignment:4,recommendations:'University entry denied.'})).rejects.toThrow('permission');
    const supervisorUser = {...coordinatorUser,id:'demo-supervisor',role:'SUPERVISOR' as const,companyId:'company-northstar'};
    // 2. An assigned, verified supervisor submits attributed feedback.
    const res = await mutate(supervisorUser, 'industryFeedback', {
      placementId: 'placement-1',
      workplaceReadiness: 5,
      competencyRelevance: 4,
      supervisionSupport: 5,
      curriculumAlignment: 4,
      technicalGaps: 'GraphQL APIs, Microservices architecture',
      softSkillGaps: 'Sprint demo presentations',
      recommendations: 'Student shows exceptional technical adaptability. Adding microservices exposure would further boost workplace readiness.',
    });

    expect(res.message).toContain('verified supervisor attribution');

    // 3. Verify record was stored
    const rows = await list(
      "SELECT * FROM industry_feedback WHERE tenant_id='fictional-university' AND placement_id='placement-1' AND evaluator_id='demo-supervisor'"
    );
    expect(rows.length).toBe(1);
    expect(Number(rows[0].workplaceReadiness)).toBe(5);
    expect(rows[0].technicalGaps).toContain('GraphQL APIs');

    // 4. Verify audit event was logged
    const auditEvents = await list(
      "SELECT * FROM audit WHERE tenant_id='fictional-university' AND action='INDUSTRY_FEEDBACK_SUBMITTED'"
    );
    expect(auditEvents.length).toBeGreaterThan(0);

    // 5. Verify snapshot includes industryFeedback and student reviews remain separate
    const snap = await snapshot(coordinatorUser);
    expect(snap.industryFeedback).toBeDefined();
    expect(snap.industryFeedback.length).toBeGreaterThan(0);
    expect(snap.reviews).toBeDefined(); // Student company reviews exist separately
  });

  it('preserves verified history after revocation, rejects stale revisions and audits invalidation', async () => {
    const actor=async(id:string)=> (await list('SELECT * FROM users WHERE id=?',id))[0] as unknown as Identity;
    const supervisor=await actor('demo-supervisor'), admin=await actor('demo-admin');
    const row=(await list("SELECT * FROM industry_feedback WHERE evaluator_id='demo-supervisor'"))[0];
    const payload={placementId:'placement-1',version:Number(row.version),workplaceReadiness:4,competencyRelevance:4,supervisionSupport:4,curriculumAlignment:4,recommendations:'An authenticated revision with preserved authorship.'};
    await mutate(supervisor,'industryFeedback',payload);
    await expect(mutate(supervisor,'industryFeedback',payload)).rejects.toThrow('changed');
    expect((await list('SELECT * FROM industry_feedback_history WHERE feedback_id=?',row.id))).toHaveLength(1);
    await expect(mutate(supervisor,'industryFeedback',{...payload,placementId:'placement-4',version:0})).rejects.toThrow('assignment');
    sql.exec("UPDATE assignments SET active=0 WHERE supervisor_id='demo-supervisor' AND placement_id='placement-1'");
    await expect(mutate(supervisor,'industryFeedback',{...payload,version:Number(row.version)+1})).rejects.toThrow('assignment');
    expect((await snapshot(supervisor)).industryFeedback).toHaveLength(0);
    const revised=(await list('SELECT * FROM industry_feedback WHERE id=?',row.id))[0];
    const p=(await list("SELECT * FROM placements WHERE id='placement-1'"));
    expect(calculateCurriculumAnalytics(p,[revised],{privacyThreshold:1}).feedbackCount).toBe(1);
    await mutate(admin,'invalidateIndustryFeedback',{feedbackId:row.id,version:Number(revised.version),reason:'Fictional evidence correction test.'});
    const invalid=(await list('SELECT * FROM industry_feedback WHERE id=?',row.id))[0];
    expect(calculateCurriculumAnalytics(p,[invalid],{privacyThreshold:1}).feedbackCount).toBe(0);
    expect((await list('SELECT * FROM industry_feedback_history WHERE feedback_id=?',row.id))).toHaveLength(2);
    sql.exec("UPDATE assignments SET active=1 WHERE supervisor_id='demo-supervisor' AND placement_id='placement-1'");
  });

  it('excludes legacy and foreign records and selects one latest response per placement', () => {
    const recent={...mockFeedback[0],id:'newest',evaluatorId:'sup-other',enteredBy:'sup-other',submittedAt:'2026-10-20',workplaceReadiness:2};
    const legacy={...mockFeedback[1],verificationState:'UNVERIFIED',authorshipMethod:'LEGACY'};
    const foreign={...mockFeedback[2],tenantId:'other-university'};
    const result=calculateCurriculumAnalytics(mockPlacements,[...mockFeedback,recent,legacy,foreign],{privacyThreshold:1});
    expect(result.feedbackCount).toBe(3);
    expect(result.responseRatePercent).toBe(50);
    const empty=calculateCurriculumAnalytics(mockPlacements,[legacy,foreign],{privacyThreshold:1});
    expect(empty.feedbackCount).toBe(0);
  });
});
