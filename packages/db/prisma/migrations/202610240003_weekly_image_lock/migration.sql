-- Serialize attachment changes with final submission so a concurrent upload
-- cannot add evidence to an already submitted report.
CREATE FUNCTION weekly_image_draft_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE report_status TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT status INTO report_status FROM weekly_reports WHERE id=NEW.report_id AND tenant_id=NEW.tenant_id FOR UPDATE;
    IF report_status IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Weekly report is finalized'; END IF;
    IF (SELECT COUNT(*) FROM weekly_report_images WHERE report_id=NEW.report_id AND tenant_id=NEW.tenant_id)>=5 THEN RAISE EXCEPTION 'Weekly report image limit reached'; END IF;
    RETURN NEW;
  END IF;
  SELECT status INTO report_status FROM weekly_reports WHERE id=OLD.report_id AND tenant_id=OLD.tenant_id FOR UPDATE;
  IF report_status IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Weekly report is finalized'; END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER weekly_image_draft_insert BEFORE INSERT ON weekly_report_images FOR EACH ROW EXECUTE FUNCTION weekly_image_draft_guard();
CREATE TRIGGER weekly_image_draft_delete BEFORE DELETE ON weekly_report_images FOR EACH ROW EXECUTE FUNCTION weekly_image_draft_guard();
