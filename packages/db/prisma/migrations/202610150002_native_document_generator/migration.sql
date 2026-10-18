CREATE TABLE native_document_sources (
 id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,created_at TEXT NOT NULL,created_by TEXT NOT NULL,
 filename TEXT NOT NULL,sha256 TEXT NOT NULL,content_base64 TEXT NOT NULL,fonts_json TEXT NOT NULL,scanned_at TEXT NOT NULL
);
CREATE TABLE native_document_templates (
 id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,created_at TEXT NOT NULL,created_by TEXT NOT NULL,
 name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'ACTIVE',published_version_id TEXT,last_version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX native_templates_tenant ON native_document_templates(tenant_id,status);
CREATE TABLE native_document_versions (
 id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,created_at TEXT NOT NULL,template_id TEXT NOT NULL REFERENCES native_document_templates(id),
 source_id TEXT NOT NULL REFERENCES native_document_sources(id),version INTEGER NOT NULL,revision INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL CHECK(status IN ('WORKING','PUBLISHED')),fields_json TEXT NOT NULL DEFAULT '[]',
 tokenized_base64 TEXT NOT NULL DEFAULT '',published_at TEXT,original_pages INTEGER NOT NULL DEFAULT 0,
 UNIQUE(template_id,version)
);
CREATE TABLE native_document_fields (
 id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,created_at TEXT NOT NULL,version_id TEXT NOT NULL REFERENCES native_document_versions(id),
 variable_key TEXT NOT NULL,label TEXT NOT NULL,type TEXT NOT NULL,config_json TEXT NOT NULL,display_order INTEGER NOT NULL,
 UNIQUE(version_id,variable_key)
);
CREATE TABLE native_document_occurrences (
 id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,created_at TEXT NOT NULL,field_id TEXT NOT NULL REFERENCES native_document_fields(id) ON DELETE CASCADE,
 location_json TEXT NOT NULL
);
CREATE TABLE native_document_drafts (
 id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,created_at TEXT NOT NULL,user_id TEXT NOT NULL,
 version_id TEXT NOT NULL REFERENCES native_document_versions(id),values_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,
 UNIQUE(tenant_id,user_id,version_id)
);
CREATE TABLE native_generated_documents (
 id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,created_at TEXT NOT NULL,user_id TEXT NOT NULL,
 draft_id TEXT NOT NULL REFERENCES native_document_drafts(id),version_id TEXT NOT NULL REFERENCES native_document_versions(id),
 format TEXT NOT NULL CHECK(format IN ('pdf','docx')),values_json TEXT NOT NULL,file_base64 TEXT NOT NULL,
 expires_at TEXT NOT NULL,expired_at TEXT
);
CREATE INDEX native_generated_owner ON native_generated_documents(tenant_id,user_id,created_at);
CREATE TABLE native_document_render_cache (
 id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,pdf_base64 TEXT NOT NULL,page_count INTEGER NOT NULL
);
