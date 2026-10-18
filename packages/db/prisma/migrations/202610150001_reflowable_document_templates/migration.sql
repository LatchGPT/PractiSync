CREATE TABLE document_templates (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  title TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'RECOMMENDATION', original_filename TEXT NOT NULL DEFAULT '',
  docx_base64 TEXT NOT NULL DEFAULT '', html_content TEXT NOT NULL, layout_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX document_templates_tenant_kind ON document_templates (tenant_id,kind,status);
CREATE TABLE document_template_fields (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
  template_id TEXT NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  variable_key TEXT NOT NULL, label TEXT NOT NULL, input_type TEXT NOT NULL, data_source TEXT NOT NULL,
  system_map_key TEXT, default_value TEXT NOT NULL DEFAULT '', select_options TEXT NOT NULL DEFAULT '[]',
  is_editable INTEGER NOT NULL DEFAULT 1 CHECK (is_editable IN (0,1)),
  is_required INTEGER NOT NULL DEFAULT 1 CHECK (is_required IN (0,1)),
  tooltip_text TEXT NOT NULL DEFAULT '', placeholder TEXT NOT NULL DEFAULT '', display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (template_id,variable_key)
);
CREATE TABLE document_submissions (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  template_id TEXT NOT NULL REFERENCES document_templates(id), student_id TEXT NOT NULL, placement_id TEXT NOT NULL,
  template_version INTEGER NOT NULL, template_json TEXT NOT NULL, form_data TEXT NOT NULL,
  pdf_base64 TEXT NOT NULL DEFAULT '', status TEXT NOT NULL CHECK (status IN ('DRAFT','GENERATED','APPROVED','REVISION_REQUESTED')),
  version INTEGER NOT NULL DEFAULT 1, review_note TEXT, reviewer_id TEXT,
  UNIQUE (tenant_id,placement_id,template_id)
);
CREATE INDEX document_submissions_student ON document_submissions (tenant_id,student_id);
CREATE INDEX document_submissions_placement ON document_submissions (tenant_id,placement_id,status);
