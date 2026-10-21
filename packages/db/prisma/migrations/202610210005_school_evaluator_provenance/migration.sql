BEGIN;
ALTER TABLE hte_evaluation_responses ADD COLUMN entered_by TEXT;
ALTER TABLE hte_evaluation_responses ADD CONSTRAINT scope_hte_evaluation_enterer FOREIGN KEY (entered_by,tenant_id) REFERENCES users(id,tenant_id);
COMMIT;
