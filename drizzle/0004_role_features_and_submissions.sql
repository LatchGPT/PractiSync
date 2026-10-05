CREATE TABLE feature_settings (
  tenant_id TEXT NOT NULL,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  PRIMARY KEY (tenant_id, role, module)
);
ALTER TABLE incidents ADD COLUMN escalated_at TEXT;
ALTER TABLE incidents ADD COLUMN escalated_by TEXT;
ALTER TABLE incidents ADD COLUMN escalation_note TEXT;
ALTER TABLE documents ADD COLUMN content_type TEXT;
ALTER TABLE documents ADD COLUMN content_base64 TEXT;
