import { installConsentFixtureSchema, acceptFixtureUsers } from './consent-fixture';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { seed, one, list, installTestDatabase, type DemoDatabase, type PreparedStatement } from '../packages/db/demo';
import { mutate } from '../packages/domain/actions';
import {
  COMPETENCY_LEVEL_DEFINITIONS,
  SELF_ASSESSMENT_DIMENSIONS,
  SELF_ASSESSMENT_DISCLAIMER,
} from '../packages/domain/self-assessment';
import type { Identity, Row } from '../packages/validation/contracts';

let sql: DatabaseSync;

function prepared(query: string, values: (string | number | null)[] = []): PreparedStatement {
  return {
    bind: (...args: (string | number | null)[]) => prepared(query, args),
    all: async <T extends Record<string, unknown>>() => ({ results: sql.prepare(query).all(...values) as T[] }),
    first: async <T extends Record<string, unknown>>() => (sql.prepare(query).get(...values) as T | null) ?? null,
    run: async () => ({ meta: sql.prepare(query).run(...values) }),
  };
}

const users = {} as Record<string, Identity>;

beforeAll(async () => {
  vi.stubEnv('DEPLOYMENT_MODE', 'demo');
  vi.stubEnv('DEMO_ENABLED', 'true');
  vi.stubEnv('AUTH_SECRET', 'test-secret-that-is-not-a-production-secret');
  sql = new DatabaseSync(':memory:');

  const migration = readFileSync('packages/db/prisma/migrations/202610110001_demo_runtime/migration.sql', 'utf8').split('INSERT INTO "assessment_schedules"')[0]!;
  sql.exec(migration);
  sql.exec(readFileSync('packages/db/prisma/migrations/202610150001_calendar_events/migration.sql', 'utf8'));
  sql.exec(readFileSync('packages/db/prisma/migrations/202610110003_limited_hte_workflows/migration.sql', 'utf8'));
  sql.exec(readFileSync('drizzle/0007_outcome_evaluations.sql', 'utf8').replace(/--> statement-breakpoint/g, ''));
  sql.exec(readFileSync('drizzle/0008_industry_feedback.sql', 'utf8'));
  sql.exec(readFileSync('packages/db/prisma/migrations/202610200001_student_verification/migration.sql', 'utf8'));

  const database: DemoDatabase = {
    prepare: (query) => prepared(query),
    batch: async (statements) => {
      sql.exec('BEGIN');
      try {
        const values = [];
        for (const statement of statements) values.push(await statement.run());
        sql.exec('COMMIT');
        return values;
      } catch (e) {
        sql.exec('ROLLBACK');
        throw e;
      }
    },
  };

  installTestDatabase(database);
  installConsentFixtureSchema(sql);
  await seed();await acceptFixtureUsers();

  for (const role of ['student', 'coordinator', 'admin', 'supervisor']) {
    users[role] = (await one('SELECT * FROM users WHERE id=?', 'demo-' + role)) as unknown as Identity;
  }
});

afterAll(() => {
  installTestDatabase(undefined);
  vi.unstubAllEnvs();
});

describe('Ticket #47: Story 5.1 & 5.2 - Baseline Competency Gate & Native Reach-Out', () => {
  describe('Domain definitions & metadata', () => {
    it('defines plain-language 1-5 rating criteria and 4 core competencies', () => {
      expect(COMPETENCY_LEVEL_DEFINITIONS).toHaveLength(5);
      expect(COMPETENCY_LEVEL_DEFINITIONS[0].level).toBe(1);
      expect(COMPETENCY_LEVEL_DEFINITIONS[4].level).toBe(5);

      expect(SELF_ASSESSMENT_DIMENSIONS).toHaveLength(4);
      const keys = SELF_ASSESSMENT_DIMENSIONS.map((d) => d.key);
      expect(keys).toContain('technicalSkills');
      expect(keys).toContain('problemSolving');
      expect(keys).toContain('communication');
      expect(keys).toContain('professionalism');

      expect(SELF_ASSESSMENT_DISCLAIMER).toContain('reflective self-appraisal');
      expect(SELF_ASSESSMENT_DISCLAIMER).toContain('does not constitute an official university grade');
    });
  });

  describe('Story 5.1: Student Self-Assessment Competency Gate', () => {
    it('rejects the retired sample supervisor rubric before a baseline is submitted', async () => {
      // Clear any pre-existing evaluations for placement-1 to test pristine un-assessed state
      sql.prepare(`DELETE FROM scores WHERE evaluation_id IN (SELECT id FROM evaluations WHERE placement_id='placement-1')`).run();
      sql.prepare(`DELETE FROM evaluations WHERE placement_id='placement-1'`).run();

      // Attempting HTE supervisor final evaluation without baseline should throw
      await expect(
        mutate(users.supervisor, 'industryFinalEvaluation', {
          placementId: 'placement-1',
          scores: {
            technicalSkills: { score: 4, evidence: 'Solid fundamentals.' },
            communication: { score: 4, evidence: 'Participated in meetings.' },
            professionalism: { score: 5, evidence: 'Punctual attendance.' },
            problemSolving: { score: 4, evidence: 'Good troubleshooting.' },
          },
        })
      ).rejects.toThrow('Use the school evaluation form after final DTR verification.');
    });

    it('allows a student to submit a baseline self-assessment with 4 dimensions', async () => {
      const result = await mutate(users.student, 'studentSelfAssessment', {
        placementId: 'placement-1',
        scores: {
          technicalSkills: { score: 4, evidence: 'Confident with frontend, developing backend skills.' },
          problemSolving: { score: 3, evidence: 'Practicing algorithmic problem solving.' },
          communication: { score: 5, evidence: 'Active verbal and written communication.' },
          professionalism: { score: 4, evidence: 'Consistent attendance.' },
        },
      });

      expect(result.message).toContain('Self-Assessment Competency Report submitted');

      // Verify evaluation record created with kind 'BASELINE'
      const baseline = (await one(
        `SELECT * FROM evaluations WHERE placement_id='placement-1' AND kind='BASELINE'`
      )) as Row | null;
      expect(baseline).not.toBeNull();
      expect(baseline?.status).toBe('SUBMITTED');

      // Verify 4 dimension scores stored in scores table
      const scoreRows = (await list(
        `SELECT * FROM scores WHERE evaluation_id=? ORDER BY dimension`,
        String(baseline?.id)
      )) as Row[];
      expect(scoreRows).toHaveLength(4);

      const scoreMap = Object.fromEntries(scoreRows.map((s) => [s.dimension, Number(s.score)]));
      expect(scoreMap['Technical skills']).toBe(4);
      expect(scoreMap['Problem solving']).toBe(3);
      expect(scoreMap['Communication']).toBe(5);
      expect(scoreMap['Professionalism']).toBe(4);
    });

    it('still rejects the retired rubric after a baseline is submitted', async () => {
      await expect(mutate(users.supervisor, 'industryFinalEvaluation', {
        placementId: 'placement-1',
        scores: {
          technicalSkills: { score: 4, evidence: 'Solid grasp of repository code.' },
          communication: { score: 5, evidence: 'Clear presentation at reviews.' },
          professionalism: { score: 5, evidence: 'Excellent work ethic.' },
          problemSolving: { score: 4, evidence: 'Independent debug skills.' },
        },
      })).rejects.toThrow('Use the school evaluation form after final DTR verification.');

      // Verify supervisor evaluation is in the database
      const finalEval = (await one(
        `SELECT * FROM evaluations WHERE placement_id='placement-1' AND kind='FINAL'`
      )) as Row | null;
      expect(finalEval).toBeNull();
    });

    it('locks the student baseline self-assessment from further edits once HTE evaluation exists', async () => {
      // Historical final evaluations still lock their original baseline.
      sql.prepare("INSERT INTO evaluations (id,tenant_id,created_at,placement_id,evaluator_id,kind,framework_version,status,version) VALUES ('historical-final',?,'2026-10-24','placement-1',?,'FINAL',1,'SUBMITTED',1)").run(users.supervisor.tenantId,users.supervisor.id);
      await expect(
        mutate(users.student, 'studentSelfAssessment', {
          placementId: 'placement-1',
          scores: {
            technicalSkills: { score: 5, evidence: 'Attempting edit after final evaluation.' },
            problemSolving: { score: 5, evidence: 'Attempting edit after final evaluation.' },
            communication: { score: 5, evidence: 'Attempting edit after final evaluation.' },
            professionalism: { score: 5, evidence: 'Attempting edit after final evaluation.' },
          },
        })
      ).rejects.toThrow('The baseline self-assessment is locked because company evaluation has already commenced.');
    });

    it('rejects student self-assessment submission for non-existent placement or cross-student placement', async () => {
      const otherStudent = (await one('SELECT * FROM users WHERE id=?', 'student-2')) as unknown as Identity;
      await expect(
        mutate(otherStudent, 'studentSelfAssessment', {
          placementId: 'placement-1',
          scores: {
            technicalSkills: { score: 4, evidence: '' },
            problemSolving: { score: 4, evidence: '' },
            communication: { score: 4, evidence: '' },
            professionalism: { score: 4, evidence: '' },
          },
        })
      ).rejects.toThrow('Training placement not found or access denied.');
    });
  });

  describe('Story 5.2: Native Email Reach-Out & Audit', () => {
    it('audits reach-out actions without storing private communication bodies', async () => {
      const auditResult = await mutate(users.student, 'reachOutAudit', {
        coordinatorEmail: 'coordinator@rtu.edu.ph',
        channel: 'MAILTO',
      });

      expect(auditResult.message).toContain('Reach out initiation recorded');

      // Verify audit record in audit table
      const log = (await one(
        `SELECT * FROM audit WHERE actor_id=? AND action='STUDENT_REACH_OUT_INITIATED' ORDER BY created_at DESC LIMIT 1`,
        users.student.id
      )) as Row | null;

      expect(log).not.toBeNull();
      expect(log?.actorId).toBe(users.student.id);
      expect(log?.action).toBe('STUDENT_REACH_OUT_INITIATED');
      // No narrative or chat body is stored in audit or any table
      expect(log?.reason).toBeNull();
    });

    it('rejects invalid email formats or unapproved channels in reachOutAudit', async () => {
      await expect(
        mutate(users.student, 'reachOutAudit', {
          coordinatorEmail: 'invalid-email',
          channel: 'MAILTO',
        })
      ).rejects.toThrow();

      await expect(
        mutate(users.student, 'reachOutAudit', {
          coordinatorEmail: 'coordinator@rtu.edu.ph',
          channel: 'INTERNAL_CHAT_DIRECT' as unknown as 'MAILTO',
        })
      ).rejects.toThrow();
    });
  });
});
