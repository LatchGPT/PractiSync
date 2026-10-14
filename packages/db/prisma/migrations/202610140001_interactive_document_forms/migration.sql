ALTER TABLE completion_responses
  ALTER COLUMN submitted_at DROP NOT NULL,
  ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP::text,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'SUBMITTED',
  ADD COLUMN review_note TEXT,
  ADD COLUMN reviewer_id TEXT,
  ADD COLUMN reviewed_at TEXT;

ALTER TABLE completion_responses
  DROP CONSTRAINT completion_form_type,
  ADD CONSTRAINT completion_form_type CHECK (form_type IN (
    'STUDENT_INFO_SHEET',
    'TRAINING_AGREEMENT',
    'PARENT_GUARDIAN_CONSENT',
    'FINAL_SELF_ASSESSMENT',
    'OJT_EXIT_SURVEY'
  )),
  ADD CONSTRAINT completion_form_status CHECK (status IN (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REVISION_REQUESTED'
  ));

CREATE INDEX completion_response_review_queue
  ON completion_responses (tenant_id, status, updated_at);
