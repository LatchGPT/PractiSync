ALTER TABLE placements ADD COLUMN is_external integer NOT NULL DEFAULT 0;
ALTER TABLE placements ADD COLUMN external_company_name text;
ALTER TABLE placements ADD COLUMN external_company_location text;
ALTER TABLE placements ADD COLUMN external_supervisor_name text;
ALTER TABLE placements ADD COLUMN external_supervisor_email text;
ALTER TABLE placements ADD COLUMN external_supervisor_phone text;

ALTER TABLE final_dtrs ADD COLUMN attachment_filename text;
ALTER TABLE final_dtrs ADD COLUMN attachment_base64 text;
ALTER TABLE final_dtrs ADD COLUMN verification_method text NOT NULL DEFAULT 'DIRECT_SUPERVISOR';

ALTER TABLE hte_evaluation_responses ADD COLUMN attachment_filename text;
ALTER TABLE hte_evaluation_responses ADD COLUMN attachment_base64 text;
ALTER TABLE hte_evaluation_responses ADD COLUMN submission_channel text NOT NULL DEFAULT 'DIRECT_APP';
