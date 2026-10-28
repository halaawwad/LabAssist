-- Additive extension of student-stage1. PostgreSQL 17.
BEGIN;
SET search_path=labassist_student,public;
CREATE TABLE supervisor_profiles (
 account_id UUID PRIMARY KEY REFERENCES accounts(id),
 specialization TEXT NOT NULL DEFAULT '',
 photo_file_id UUID REFERENCES files(id),
 office_hours TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE supervisor_settings (
 account_id UUID PRIMARY KEY REFERENCES accounts(id),
 ui_locale TEXT NOT NULL DEFAULT 'en' CHECK(ui_locale IN ('ar','en')),
 meeting_notifications BOOLEAN NOT NULL DEFAULT true,
 report_notifications BOOLEAN NOT NULL DEFAULT true,
 attendance_notifications BOOLEAN NOT NULL DEFAULT true,
 issue_notifications BOOLEAN NOT NULL DEFAULT true,
 workshop_notifications BOOLEAN NOT NULL DEFAULT true,
 email_summary BOOLEAN NOT NULL DEFAULT false,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE supervisor_notification_reads (
 supervisor_id UUID NOT NULL REFERENCES accounts(id),
 notification_key TEXT NOT NULL CHECK(length(btrim(notification_key)) BETWEEN 1 AND 240),
 read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(supervisor_id,notification_key)
);
CREATE FUNCTION supervisor_scope_guard() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
DECLARE actor UUID;
BEGIN
 IF TG_TABLE_NAME='supervisor_notification_reads' THEN actor=NEW.supervisor_id; ELSE actor=NEW.account_id; END IF;
 IF NOT EXISTS(SELECT 1 FROM accounts WHERE id=actor AND role='SUPERVISOR') THEN
  RAISE EXCEPTION 'Supervisor account required';
 END IF;
 IF TG_TABLE_NAME='supervisor_profiles' THEN
 IF NEW.photo_file_id IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM files WHERE id=NEW.photo_file_id AND uploaded_by=actor AND status='READY' AND mime_type LIKE 'image/%') THEN
   RAISE EXCEPTION 'Supervisor photo must be an owned ready image';
  END IF;
 END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER supervisor_scope BEFORE INSERT OR UPDATE ON supervisor_profiles FOR EACH ROW EXECUTE FUNCTION supervisor_scope_guard();
CREATE TRIGGER supervisor_scope BEFORE INSERT OR UPDATE ON supervisor_settings FOR EACH ROW EXECUTE FUNCTION supervisor_scope_guard();
CREATE TRIGGER supervisor_scope BEFORE INSERT OR UPDATE ON supervisor_notification_reads FOR EACH ROW EXECUTE FUNCTION supervisor_scope_guard();
CREATE TRIGGER touch BEFORE UPDATE ON supervisor_profiles FOR EACH ROW EXECUTE FUNCTION touch_row();
CREATE TRIGGER touch BEFORE UPDATE ON supervisor_settings FOR EACH ROW EXECUTE FUNCTION touch_row();
-- Project membership, not account creator, determines supervisor project access.
CREATE VIEW supervisor_project_students AS
 SELECT ps.supervisor_id,p.id AS project_id,p.term_id,p.name AS project_name,
 a.id AS student_id,a.full_name,a.university_number,a.email,a.account_supervisor_id
 FROM project_supervisors ps JOIN projects p ON p.id=ps.project_id
 JOIN project_students m ON m.project_id=p.id AND m.left_at IS NULL
 JOIN accounts a ON a.id=m.student_id;
COMMENT ON VIEW supervisor_project_students IS 'Relationship projection, not an authorization boundary. Backend must scope queries by authenticated supervisor; no database credentials in clients.';
COMMIT;
