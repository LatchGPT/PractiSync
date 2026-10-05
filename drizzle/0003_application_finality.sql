CREATE TRIGGER application_final_decision_immutable
BEFORE UPDATE OF status ON applications
WHEN OLD.status IN ('ACCEPTED', 'REJECTED') AND NEW.status <> OLD.status
BEGIN
  SELECT RAISE(ABORT, 'Application final decision is immutable');
END;
