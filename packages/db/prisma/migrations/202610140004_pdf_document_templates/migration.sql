ALTER TABLE custom_document_templates
  ADD COLUMN original_filename TEXT NOT NULL DEFAULT '',
  ADD COLUMN pdf_base64 TEXT NOT NULL DEFAULT '';

ALTER TABLE custom_document_responses
  ADD COLUMN template_json TEXT NOT NULL DEFAULT '{}';
