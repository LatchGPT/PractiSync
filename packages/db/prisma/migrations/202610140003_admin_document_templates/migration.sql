CREATE TABLE custom_document_templates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::text,
  created_by TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('CLEARANCE','OJT')),
  fields_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED','ARCHIVED')),
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX custom_document_templates_tenant_status ON custom_document_templates (tenant_id,status,created_at);

CREATE TABLE custom_document_responses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::text,
  placement_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_version INTEGER NOT NULL,
  response_json TEXT NOT NULL,
  submitted_at TEXT,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REVISION_REQUESTED')),
  review_note TEXT,
  reviewer_id TEXT,
  reviewed_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (tenant_id, placement_id, template_id)
);
CREATE INDEX custom_document_responses_placement ON custom_document_responses (tenant_id,placement_id);
CREATE INDEX custom_document_responses_review_queue ON custom_document_responses (tenant_id,status,updated_at);
