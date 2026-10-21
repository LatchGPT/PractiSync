BEGIN;
CREATE TABLE deadline_reminder_policies (
 id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
 event_id TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
 target_kind TEXT NOT NULL DEFAULT 'NONE', target_id TEXT,
 revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL,
 UNIQUE(tenant_id,event_id)
);
CREATE TABLE deadline_reminder_slots (
 id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
 event_id TEXT NOT NULL, policy_revision INTEGER NOT NULL, lead_days INTEGER NOT NULL,
 due_at TEXT NOT NULL, deadline_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING',
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, last_error TEXT,
 UNIQUE(tenant_id,event_id,policy_revision,lead_days)
);
CREATE INDEX deadline_reminder_due ON deadline_reminder_slots(tenant_id,status,next_attempt_at);
CREATE TABLE deadline_reminder_deliveries (
 id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
 slot_id TEXT NOT NULL, user_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING',
 claim_id TEXT, delivered_at TEXT, reason TEXT,
 UNIQUE(tenant_id,slot_id,user_id)
);
CREATE TABLE notification_preferences (
 id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
 user_id TEXT NOT NULL, deadline_reminders INTEGER NOT NULL DEFAULT 1,
 UNIQUE(tenant_id,user_id)
);
CREATE TABLE workflow_worker_state (
 id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
 checked_at TEXT NOT NULL, last_error TEXT
);

COMMIT;
