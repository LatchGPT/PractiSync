ALTER TABLE applications ADD COLUMN placement_id text;
ALTER TABLE evaluations ADD COLUMN evidence_json text;
ALTER TABLE scores ADD COLUMN evidence_note text;
ALTER TABLE completion ADD COLUMN decided_at text;
ALTER TABLE completion ADD COLUMN decided_by text;

CREATE TABLE guest_evaluation_links (
  id text PRIMARY KEY NOT NULL,
  tenant_id text NOT NULL,
  created_at text NOT NULL,
  placement_id text NOT NULL,
  token_hash text NOT NULL,
  access_code_hash text NOT NULL,
  expires_at text NOT NULL,
  issued_by text NOT NULL,
  revoked_at text,
  used_at text,
  submission_id text
);

CREATE UNIQUE INDEX guest_evaluation_token ON guest_evaluation_links (token_hash);
CREATE INDEX guest_evaluation_placement ON guest_evaluation_links (tenant_id, placement_id);

CREATE TABLE completion_responses (
  id text PRIMARY KEY NOT NULL,
  tenant_id text NOT NULL,
  created_at text NOT NULL,
  placement_id text NOT NULL,
  form_type text NOT NULL,
  form_version integer NOT NULL,
  response_json text NOT NULL,
  submitted_at text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT completion_form_type CHECK (form_type IN ('FINAL_SELF_ASSESSMENT', 'OJT_EXIT_SURVEY'))
);

CREATE UNIQUE INDEX completion_response_once ON completion_responses (tenant_id, placement_id, form_type);
CREATE INDEX completion_response_placement ON completion_responses (tenant_id, placement_id);

CREATE TABLE private_hosts (
  id text PRIMARY KEY NOT NULL,
  tenant_id text NOT NULL,
  created_at text NOT NULL,
  placement_id text NOT NULL,
  supervisor_name text NOT NULL,
  supervisor_email text NOT NULL,
  CONSTRAINT private_host_contact_email CHECK (length(supervisor_email) <= 254)
);

CREATE UNIQUE INDEX private_host_placement ON private_hosts (tenant_id, placement_id);
CREATE UNIQUE INDEX evaluation_guest_single ON evaluations (tenant_id, evaluator_id) WHERE evaluator_id LIKE 'guest:%';
CREATE UNIQUE INDEX evaluation_final_evaluator_once ON evaluations (tenant_id, placement_id, evaluator_id) WHERE kind = 'FINAL' AND evaluator_id NOT LIKE 'guest:%';
