BEGIN;
ALTER TABLE industry_feedback ADD COLUMN evaluator_id TEXT;
ALTER TABLE industry_feedback ADD COLUMN entered_by TEXT;
ALTER TABLE industry_feedback ADD COLUMN assignment_id TEXT;
ALTER TABLE industry_feedback ADD COLUMN authorship_method TEXT NOT NULL DEFAULT 'LEGACY';
ALTER TABLE industry_feedback ADD COLUMN verification_state TEXT NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE industry_feedback ADD COLUMN verified_at TEXT;
ALTER TABLE industry_feedback ADD COLUMN submitted_at TEXT;
ALTER TABLE industry_feedback ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE industry_feedback ADD COLUMN invalidated_by TEXT;
ALTER TABLE industry_feedback ADD COLUMN invalidation_reason TEXT;
ALTER TABLE industry_feedback ADD COLUMN invalidated_at TEXT;
CREATE UNIQUE INDEX industry_feedback_direct_author ON industry_feedback(tenant_id,placement_id,evaluator_id) WHERE authorship_method='DIRECT';
CREATE INDEX industry_feedback_eligibility ON industry_feedback(tenant_id,verification_state,submitted_at);
CREATE TABLE industry_feedback_history (
 id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
 feedback_id TEXT NOT NULL, version INTEGER NOT NULL, actor_id TEXT NOT NULL,
 record_json TEXT NOT NULL,
 UNIQUE(tenant_id,feedback_id,version)
);

COMMIT;
