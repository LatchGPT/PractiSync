ALTER TABLE companies ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE jobs ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE placements ADD COLUMN dtr_revision integer NOT NULL DEFAULT 0;

CREATE TABLE hte_requests (
 id text PRIMARY KEY NOT NULL, tenant_id text NOT NULL, created_at text NOT NULL,
 requester_id text NOT NULL, company_id text NOT NULL, resource_id text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('REGISTRATION','PROFILE','JOB_CREATE','JOB_EDIT','JOB_CLOSE')),
 payload_json text NOT NULL, base_version integer NOT NULL DEFAULT 1,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
 note text, reviewed_by text, reviewed_at text, version integer NOT NULL DEFAULT 1
);
CREATE INDEX hte_requests_queue ON hte_requests(tenant_id,status,created_at);
CREATE UNIQUE INDEX hte_requests_pending_resource ON hte_requests(tenant_id,resource_id) WHERE status='PENDING';

CREATE TABLE final_dtrs (
 id text PRIMARY KEY NOT NULL, tenant_id text NOT NULL, created_at text NOT NULL,
 placement_id text NOT NULL, version integer NOT NULL DEFAULT 1,
 attendance_revision integer NOT NULL, snapshot_json text NOT NULL, total_minutes integer NOT NULL,
 status text NOT NULL CHECK(status IN ('SUBMITTED','VERIFIED','REVISION_REQUESTED')),
 submitted_by text NOT NULL, reviewed_by text, reviewed_at text, note text,
 UNIQUE(tenant_id,placement_id)
);
CREATE TABLE final_dtr_history (
 id text PRIMARY KEY NOT NULL, tenant_id text NOT NULL, created_at text NOT NULL,
 final_dtr_id text NOT NULL, version integer NOT NULL, record_json text NOT NULL,
 UNIQUE(tenant_id,final_dtr_id,version)
);
CREATE TABLE final_dtr_reopens (
 id text PRIMARY KEY NOT NULL, tenant_id text NOT NULL, created_at text NOT NULL,
 placement_id text NOT NULL, final_dtr_version integer NOT NULL, student_id text NOT NULL,
 reason text NOT NULL, status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
 note text, reviewed_by text, reviewed_at text, version integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX final_dtr_reopen_pending ON final_dtr_reopens(tenant_id,placement_id) WHERE status='PENDING';

CREATE TABLE hte_evaluation_templates (
 id text PRIMARY KEY NOT NULL, tenant_id text NOT NULL, created_at text NOT NULL, created_by text NOT NULL,
 title text NOT NULL, filename text NOT NULL, pdf_base64 text NOT NULL,
 questions_json text NOT NULL DEFAULT '[]', status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','ARCHIVED')),
 version integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX hte_evaluation_published ON hte_evaluation_templates(tenant_id) WHERE status='PUBLISHED';
CREATE TABLE hte_evaluation_responses (
 id text PRIMARY KEY NOT NULL, tenant_id text NOT NULL, created_at text NOT NULL,
 placement_id text NOT NULL, evaluator_id text NOT NULL, template_id text NOT NULL,
 final_dtr_version integer NOT NULL, answers_json text NOT NULL,
 status text NOT NULL CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','REVISION_REQUESTED')),
 note text, reviewed_by text, reviewed_at text, updated_at text NOT NULL, version integer NOT NULL DEFAULT 1,
 UNIQUE(tenant_id,placement_id)
);
CREATE TABLE hte_evaluation_history (
 id text PRIMARY KEY NOT NULL, tenant_id text NOT NULL, created_at text NOT NULL,
 response_id text NOT NULL, version integer NOT NULL, record_json text NOT NULL,
 UNIQUE(tenant_id,response_id,version)
);
