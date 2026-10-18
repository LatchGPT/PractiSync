import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

import { seed, one, list, installTestDatabase, type DemoDatabase, type PreparedStatement } from '../packages/db/demo';
import { snapshot } from '../packages/domain/read';
import { mutate } from '../packages/domain/actions';
import {
  calculateOutcomeEvaluation,
} from '../packages/domain/outcome-evaluation';
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

const users = {} as Record<string, Identity>;

beforeAll(async () => {
  vi.stubEnv('DEPLOYMENT_MODE', 'demo');
  vi.stubEnv('DEMO_ENABLED', 'true');
  vi.stubEnv('AUTH_SECRET', 'test-secret-that-is-not-a-production-secret');
  sql = new DatabaseSync(':memory:');
  const migration = readFileSync('packages/db/prisma/migrations/202610110001_demo_runtime/migration.sql', 'utf8').split('INSERT INTO "assessment_schedules"')[0]!;
  sql.exec(migration);
  sql.exec(readFileSync('packages/db/prisma/migrations/202610150001_calendar_events/migration.sql','utf8'));
  sql.exec(readFileSync('packages/db/prisma/migrations/202610110003_limited_hte_workflows/migration.sql', 'utf8'));
  sql.exec(`ALTER TABLE completion_responses ADD COLUMN status TEXT NOT NULL DEFAULT 'SUBMITTED';
ALTER TABLE completion_responses ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
ALTER TABLE completion_responses ADD COLUMN review_note TEXT;
ALTER TABLE completion_responses ADD COLUMN reviewer_id TEXT;
ALTER TABLE completion_responses ADD COLUMN reviewed_at TEXT;
UPDATE completion_responses SET updated_at=COALESCE(submitted_at,created_at);`);
  sql.exec(readFileSync('drizzle/0007_outcome_evaluations.sql', 'utf8').replace(/--> statement-breakpoint/g, ''));
  sql.exec(readFileSync('drizzle/0008_industry_feedback.sql', 'utf8'));
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
  await seed();
  for (const role of ['student', 'coordinator', 'admin']) {
    users[role] = ((await one('SELECT * FROM users WHERE id=?', 'demo-' + role)) as unknown) as Identity;
  }
});

afterAll(() => {
  installTestDatabase(undefined);
  vi.unstubAllEnvs();
});

describe('PSS-19: Transparent Rubric-Based Outcome Evaluation Engine', () => {
  it('calculates weighted score deterministically using configured rubric weights and threshold', () => {
    const mockEvaluations: Row[] = [
      {
        id: 'eval-1',
        placementId: 'placement-1',
        kind: 'WEEKLY',
        status: 'APPROVED',
        frameworkVersion: 1,
        createdAt: '2026-10-01',
        tenantId: 'default',
      },
      {
        id: 'eval-2',
        placementId: 'placement-1',
        kind: 'MONTHLY',
        status: 'APPROVED',
        frameworkVersion: 1,
        createdAt: '2026-10-05',
        tenantId: 'default',
      },
    ];

    const mockScores: Row[] = [
      // Eval 1: Tech=4, Prob=4, Comm=4, Prof=4
      { id: 's1', evaluationId: 'eval-1', dimension: 'Technical skills', score: 4, tenantId: 'default', createdAt: '2026-10-01' },
      { id: 's2', evaluationId: 'eval-1', dimension: 'Problem solving', score: 4, tenantId: 'default', createdAt: '2026-10-01' },
      { id: 's3', evaluationId: 'eval-1', dimension: 'Communication', score: 4, tenantId: 'default', createdAt: '2026-10-01' },
      { id: 's4', evaluationId: 'eval-1', dimension: 'Professionalism', score: 4, tenantId: 'default', createdAt: '2026-10-01' },
      // Eval 2: Tech=4, Prob=2, Comm=3, Prof=5
      { id: 's5', evaluationId: 'eval-2', dimension: 'Technical skills', score: 4, tenantId: 'default', createdAt: '2026-10-05' },
      { id: 's6', evaluationId: 'eval-2', dimension: 'Problem solving', score: 2, tenantId: 'default', createdAt: '2026-10-05' },
      { id: 's7', evaluationId: 'eval-2', dimension: 'Communication', score: 3, tenantId: 'default', createdAt: '2026-10-05' },
      { id: 's8', evaluationId: 'eval-2', dimension: 'Professionalism', score: 5, tenantId: 'default', createdAt: '2026-10-05' },
    ];

    const result = calculateOutcomeEvaluation('placement-1', mockEvaluations, mockScores);

    // Tech avg = 4.00 (weight 0.35) -> 1.40
    // Prob avg = 3.00 (weight 0.25) -> 0.75
    // Comm avg = 3.50 (weight 0.20) -> 0.70
    // Prof avg = 4.50 (weight 0.20) -> 0.90
    // Total weighted = 1.40 + 0.75 + 0.70 + 0.90 = 3.75
    expect(result.evidenceStatus).toBe('COMPLETE');
    expect(result.weightedScore).toBe(3.75);
    expect(result.attainmentThreshold).toBe(3.5);
    expect(result.attainmentStatus).toBe('ACHIEVED');

    // Categorized outcomes
    expect(result.achievedOutcomes).toContain('Technical skills');
    expect(result.achievedOutcomes).toContain('Communication');
    expect(result.achievedOutcomes).toContain('Professionalism');
    expect(result.developingOutcomes).toContain('Problem solving');
    expect(result.gapOutcomes).toHaveLength(0);

    // Formula & derivation visibility
    expect(result.formula).toContain('Technical skills');
    expect(result.formulaApplied).toContain('3.75');
    expect(result.totalApprovedEvaluations).toBe(2);
  });

  it('marks insufficient evidence explicitly and never infers missing dimensions', () => {
    const mockEvaluations: Row[] = [
      {
        id: 'eval-1',
        placementId: 'placement-1',
        kind: 'WEEKLY',
        status: 'APPROVED',
        frameworkVersion: 1,
        createdAt: '2026-10-01',
        tenantId: 'default',
      },
    ];

    // Only 2 of 4 dimensions supplied
    const partialScores: Row[] = [
      { id: 's1', evaluationId: 'eval-1', dimension: 'Technical skills', score: 5, tenantId: 'default', createdAt: '2026-10-01' },
      { id: 's2', evaluationId: 'eval-1', dimension: 'Communication', score: 4, tenantId: 'default', createdAt: '2026-10-01' },
    ];

    const result = calculateOutcomeEvaluation('placement-1', mockEvaluations, partialScores);

    expect(result.evidenceStatus).toBe('INSUFFICIENT');
    expect(result.weightedScore).toBeNull();
    expect(result.attainmentStatus).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.evidenceMessage).toContain('Missing approved assessments');
    expect(result.evidenceMessage).toContain('Problem solving');
    expect(result.evidenceMessage).toContain('Professionalism');
    expect(result.formulaApplied).toBeNull();
  });

  it('detects incompatible framework versions and does not combine them', () => {
    const mockEvaluations: Row[] = [
      {
        id: 'eval-incompatible',
        placementId: 'placement-1',
        kind: 'WEEKLY',
        status: 'APPROVED',
        frameworkVersion: 2, // incompatible version!
        createdAt: '2026-10-01',
        tenantId: 'default',
      },
    ];

    const mockScores: Row[] = [
      { id: 's1', evaluationId: 'eval-incompatible', dimension: 'Technical skills', score: 4, tenantId: 'default', createdAt: '2026-10-01' },
      { id: 's2', evaluationId: 'eval-incompatible', dimension: 'Problem solving', score: 4, tenantId: 'default', createdAt: '2026-10-01' },
      { id: 's3', evaluationId: 'eval-incompatible', dimension: 'Communication', score: 4, tenantId: 'default', createdAt: '2026-10-01' },
      { id: 's4', evaluationId: 'eval-incompatible', dimension: 'Professionalism', score: 4, tenantId: 'default', createdAt: '2026-10-01' },
    ];

    const result = calculateOutcomeEvaluation('placement-1', mockEvaluations, mockScores);

    expect(result.evidenceStatus).toBe('INCOMPATIBLE');
    expect(result.attainmentStatus).toBe('INCOMPATIBLE_EVIDENCE');
    expect(result.weightedScore).toBeNull();
    expect(result.evidenceMessage).toContain('incompatible framework versions');
  });

  it('ignores unapproved student evaluations (draft, submitted, revision_requested)', () => {
    const mockEvaluations: Row[] = [
      {
        id: 'eval-unapproved',
        placementId: 'placement-1',
        kind: 'WEEKLY',
        status: 'SUBMITTED', // not yet coordinator-approved!
        frameworkVersion: 1,
        createdAt: '2026-10-01',
        tenantId: 'default',
      },
    ];

    const mockScores: Row[] = [
      { id: 's1', evaluationId: 'eval-unapproved', dimension: 'Technical skills', score: 5, tenantId: 'default', createdAt: '2026-10-01' },
      { id: 's2', evaluationId: 'eval-unapproved', dimension: 'Problem solving', score: 5, tenantId: 'default', createdAt: '2026-10-01' },
      { id: 's3', evaluationId: 'eval-unapproved', dimension: 'Communication', score: 5, tenantId: 'default', createdAt: '2026-10-01' },
      { id: 's4', evaluationId: 'eval-unapproved', dimension: 'Professionalism', score: 5, tenantId: 'default', createdAt: '2026-10-01' },
    ];

    const result = calculateOutcomeEvaluation('placement-1', mockEvaluations, mockScores);

    // Since unapproved, there is 0 approved evidence
    expect(result.totalApprovedEvaluations).toBe(0);
    expect(result.evidenceStatus).toBe('INSUFFICIENT');
    expect(result.weightedScore).toBeNull();
  });

  it('allows coordinator to record academic decision with rationale and preserves history', async () => {
    const snapBefore = await snapshot(users.coordinator);
    const placement = snapBefore.placements.find((p) => p.id === 'placement-1')!;

    // Non-coordinators cannot record outcome decision
    await expect(
      mutate(users.student, 'outcomeDecision', {
        placementId: placement.id,
        decision: 'EXEMPLARY',
        rationale: 'Student should not evaluate self formally',
      })
    ).rejects.toThrow('permission');

    // Coordinator records decision
    const res = await mutate(users.coordinator, 'outcomeDecision', {
      placementId: placement.id,
      decision: 'SATISFACTORY',
      rationale:
        'Demonstrates solid foundational technical problem solving and adheres to university guidelines.',
    });

    expect(res.message).toContain('Academic outcome decision recorded');

    // Verify stored decision
    const decision = await one('SELECT * FROM outcome_decisions WHERE id=?', res.id!);
    expect(decision).toMatchObject({
      placementId: placement.id,
      coordinatorId: users.coordinator.id,
      decision: 'SATISFACTORY',
    });
    expect(decision?.rationale).toContain('Demonstrates solid foundational');

    // Verify decision does NOT alter completion record (calculated result never auto-certifies OJT)
    const completion = await one('SELECT status FROM completion WHERE placement_id=?', placement.id);
    expect(completion?.status).toBe('PENDING'); // Remains PENDING, not auto-approved!

    // Verify history can record subsequent updated decision
    const res2 = await mutate(users.coordinator, 'outcomeDecision', {
      placementId: placement.id,
      decision: 'EXEMPLARY',
      rationale:
        'Updated after midterm evaluation review: outstanding performance across company placement.',
    });

    const decisions = await list(
      'SELECT * FROM outcome_decisions WHERE placement_id=? ORDER BY created_at DESC',
      placement.id
    );
    expect(decisions.length).toBeGreaterThanOrEqual(2);
    expect(decisions[0]?.decision).toBe('EXEMPLARY');
    expect(decisions[1]?.decision).toBe('SATISFACTORY');

    // Verify snapshot includes outcomeDecisions
    const snapAfter = await snapshot(users.coordinator);
    expect(snapAfter.outcomeDecisions.length).toBeGreaterThan(0);
    expect(snapAfter.outcomeDecisions.some((d) => d.id === res2.id)).toBe(true);
  });
});
