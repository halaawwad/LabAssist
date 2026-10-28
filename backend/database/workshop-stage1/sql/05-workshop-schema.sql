-- Additive workshop foundation, after student-stage1 and supervisor-stage1.
BEGIN;
SET search_path=labassist_student,public;
ALTER TABLE accounts DROP CONSTRAINT accounts_role_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_role_check CHECK(role IN ('STUDENT','SUPERVISOR','WORKSHOP_MANAGER'));
ALTER TABLE accounts ADD CONSTRAINT manager_identity CHECK(role<>'WORKSHOP_MANAGER' OR (university_number IS NULL AND account_supervisor_id IS NULL));
CREATE UNIQUE INDEX one_current_workshop_manager ON accounts(role) WHERE role='WORKSHOP_MANAGER' AND status<>'DISABLED';
CREATE TABLE workshop_manager_profiles (
 account_id UUID PRIMARY KEY REFERENCES accounts(id),
 photo_file_id UUID REFERENCES files(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE workshop_manager_settings (
 account_id UUID PRIMARY KEY REFERENCES accounts(id),
 ui_locale TEXT NOT NULL DEFAULT 'en' CHECK(ui_locale IN ('ar','en')),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE workshop_notification_reads (
 manager_id UUID NOT NULL REFERENCES accounts(id),
 notification_key TEXT NOT NULL CHECK(length(btrim(notification_key)) BETWEEN 1 AND 240),
 read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(manager_id,notification_key)
);
CREATE TABLE workshop_availability (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 manager_id UUID NOT NULL REFERENCES accounts(id),
 applies_on DATE NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('ON_DUTY','AWAY','ABSENT')),
 away_from TIME,away_until TIME,reason TEXT,
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(manager_id,applies_on),
 CHECK((status='AWAY' AND away_from IS NOT NULL AND away_until IS NOT NULL AND away_until>away_from)
    OR (status<>'AWAY' AND away_from IS NULL AND away_until IS NULL))
);
CREATE FUNCTION workshop_manager_scope_guard() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
DECLARE actor UUID;
BEGIN
 IF TG_TABLE_NAME IN ('workshop_manager_profiles','workshop_manager_settings') THEN actor=NEW.account_id; ELSE actor=NEW.manager_id; END IF;
 IF NOT EXISTS(SELECT 1 FROM accounts WHERE id=actor AND role='WORKSHOP_MANAGER') THEN RAISE EXCEPTION 'Workshop manager account required'; END IF;
 IF TG_TABLE_NAME='workshop_manager_profiles' THEN
  IF NEW.photo_file_id IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM files WHERE id=NEW.photo_file_id AND uploaded_by=actor AND status='READY' AND mime_type LIKE 'image/%') THEN
    RAISE EXCEPTION 'Manager photo must be an owned ready image';
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE t TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['workshop_manager_profiles','workshop_manager_settings','workshop_notification_reads','workshop_availability'] LOOP
  EXECUTE format('CREATE TRIGGER manager_scope BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION workshop_manager_scope_guard()',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['workshop_manager_profiles','workshop_manager_settings','workshop_availability'] LOOP
  EXECUTE format('CREATE TRIGGER touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_row()',t);
 END LOOP;
END $$;
CREATE VIEW workshop_project_students AS
 SELECT p.term_id,p.id AS project_id,p.name AS project_name,a.id AS student_id,a.full_name,a.university_number
 FROM projects p JOIN project_students m ON m.project_id=p.id AND m.left_at IS NULL
 JOIN accounts a ON a.id=m.student_id;
COMMENT ON VIEW workshop_project_students IS 'Shared workshop roster projection. Backend must authorize manager access; this view is not an authorization boundary.';
COMMIT;
