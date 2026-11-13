-- Source: student-stage1/sql/01-schema.sql
-- LabAssist: Stage 1 student accounts and project relationships only.
-- PostgreSQL 17+. Clean installation into a new labassist_student schema.
BEGIN;
CREATE SCHEMA labassist_student;
SET search_path=labassist_student,public;

CREATE TABLE accounts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 seed_key TEXT UNIQUE,
 role TEXT NOT NULL CHECK(role IN ('STUDENT','SUPERVISOR')),
 full_name TEXT NOT NULL CHECK(length(btrim(full_name)) BETWEEN 1 AND 160),
 university_number VARCHAR(8) UNIQUE,
 email VARCHAR(254) NOT NULL UNIQUE CHECK(email=lower(btrim(email))),
 account_supervisor_id UUID REFERENCES accounts(id),
 status TEXT NOT NULL DEFAULT 'PENDING_ACTIVATION' CHECK(status IN ('REFERENCE_ONLY','PENDING_ACTIVATION','ACTIVE','DISABLED')),
 password_hash TEXT,
 activated_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(role<>'STUDENT' OR (university_number ~ '^[0-9]{8}$' AND university_number IS NOT NULL AND email='s'||university_number||'@stu.najah.edu' AND account_supervisor_id IS NOT NULL AND status<>'REFERENCE_ONLY')),
 CHECK(role<>'SUPERVISOR' OR (university_number IS NULL AND account_supervisor_id IS NULL AND email ~ '^[a-z0-9][a-z0-9._%+-]*@najah[.]edu$')),
 CHECK(password_hash IS NULL OR (password_hash LIKE '$argon2id$%' AND length(password_hash)>=60)),
 CHECK(status<>'ACTIVE' OR (password_hash IS NOT NULL AND activated_at IS NOT NULL)),
 CHECK(status NOT IN ('PENDING_ACTIVATION','REFERENCE_ONLY') OR (password_hash IS NULL AND activated_at IS NULL))
);
CREATE TABLE files (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),uploaded_by UUID NOT NULL REFERENCES accounts(id),
 storage_key TEXT NOT NULL UNIQUE,original_name TEXT NOT NULL,mime_type TEXT NOT NULL,
 byte_size BIGINT NOT NULL CHECK(byte_size>=0),sha256 CHAR(64) CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','READY','REJECTED')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE student_profiles (
 account_id UUID PRIMARY KEY REFERENCES accounts(id),
 university TEXT NOT NULL DEFAULT 'An-Najah National University',major TEXT,study_year SMALLINT CHECK(study_year BETWEEN 1 AND 8),
 birth_year SMALLINT CHECK(birth_year BETWEEN 1900 AND 2100),phone TEXT,github_url TEXT CHECK(github_url IS NULL OR github_url ~ '^https?://'),
 photo_file_id UUID REFERENCES files(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE student_settings (
 account_id UUID PRIMARY KEY REFERENCES accounts(id),ui_locale TEXT NOT NULL DEFAULT 'en' CHECK(ui_locale IN ('ar','en')),
 assistant_language TEXT NOT NULL DEFAULT 'mixed' CHECK(assistant_language IN ('ar','en','mixed')),
 motion BOOLEAN NOT NULL DEFAULT true,background BOOLEAN NOT NULL DEFAULT true,large_text BOOLEAN NOT NULL DEFAULT false,
 message_previews BOOLEAN NOT NULL DEFAULT true,enter_to_send BOOLEAN NOT NULL DEFAULT true,
 meeting_reminders BOOLEAN NOT NULL DEFAULT true,report_reminders BOOLEAN NOT NULL DEFAULT true,team_updates BOOLEAN NOT NULL DEFAULT true,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE academic_terms (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,name TEXT NOT NULL,
 starts_on DATE NOT NULL,ends_on DATE CHECK(ends_on IS NULL OR ends_on>=starts_on),
 is_demo BOOLEAN NOT NULL DEFAULT false,timezone TEXT NOT NULL DEFAULT 'Asia/Hebron' CHECK(timezone='Asia/Hebron'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE student_enrollments (
 student_id UUID NOT NULL REFERENCES accounts(id),term_id UUID NOT NULL REFERENCES academic_terms(id),
 incomplete_until TIMESTAMPTZ,extended_by UUID REFERENCES accounts(id),
 PRIMARY KEY(student_id,term_id),CHECK((incomplete_until IS NULL)=(extended_by IS NULL))
);
CREATE TABLE term_workshop_capacity (
 term_id UUID PRIMARY KEY REFERENCES academic_terms(id),team_capacity SMALLINT NOT NULL DEFAULT 25 CHECK(team_capacity>0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE projects (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,
 term_id UUID NOT NULL REFERENCES academic_terms(id),name TEXT NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 220),
 subtitle TEXT NOT NULL DEFAULT '',abstract TEXT NOT NULL DEFAULT '',cover_file_id UUID REFERENCES files(id),
 formed_by UUID NOT NULL REFERENCES accounts(id),status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','IN_PROGRESS','ON_HOLD','COMPLETED','ARCHIVED')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,term_id)
);
CREATE TABLE project_students (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),project_id UUID NOT NULL,term_id UUID NOT NULL,
 student_id UUID NOT NULL,joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),left_at TIMESTAMPTZ,
 UNIQUE(project_id,student_id),FOREIGN KEY(project_id,term_id) REFERENCES projects(id,term_id),
 FOREIGN KEY(student_id,term_id) REFERENCES student_enrollments(student_id,term_id),
 CHECK(left_at IS NULL OR left_at>=joined_at)
);
CREATE UNIQUE INDEX one_current_team_per_student_per_term ON project_students(student_id,term_id) WHERE left_at IS NULL;
CREATE TABLE project_supervisors (
 project_id UUID NOT NULL REFERENCES projects(id),supervisor_id UUID NOT NULL REFERENCES accounts(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(project_id,supervisor_id)
);
CREATE TABLE activation_invitations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),student_id UUID NOT NULL REFERENCES accounts(id),
 invited_by UUID NOT NULL REFERENCES accounts(id),token_hash CHAR(64) NOT NULL UNIQUE CHECK(token_hash ~ '^[0-9a-f]{64}$'),
 expires_at TIMESTAMPTZ NOT NULL,used_at TIMESTAMPTZ,revoked_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),CHECK(expires_at>created_at)
);
CREATE UNIQUE INDEX one_live_activation_per_student ON activation_invitations(student_id) WHERE used_at IS NULL AND revoked_at IS NULL;
CREATE TABLE personal_notes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),student_id UUID NOT NULL UNIQUE REFERENCES accounts(id),
 title TEXT NOT NULL DEFAULT 'My notes',body TEXT NOT NULL DEFAULT '',revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE personal_tasks (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),student_id UUID NOT NULL REFERENCES accounts(id),
 title TEXT NOT NULL CHECK(length(btrim(title))>0),completed_at TIMESTAMPTZ,sort_order INT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE personal_reminders (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),student_id UUID NOT NULL REFERENCES accounts(id),
 body TEXT NOT NULL CHECK(length(btrim(body))>0),remind_at TIMESTAMPTZ NOT NULL,dismissed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE audit_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),actor_id UUID REFERENCES accounts(id),
 event_key TEXT NOT NULL,subject_id UUID,payload JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(payload)='object'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX project_students_lookup ON project_students(project_id,student_id) WHERE left_at IS NULL;
CREATE INDEX supervisor_projects_lookup ON project_supervisors(supervisor_id,project_id);
CREATE INDEX invitation_student_lookup ON activation_invitations(student_id,created_at DESC);

CREATE FUNCTION touch_row() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=clock_timestamp(); RETURN NEW; END $$;
DO $$ DECLARE t TEXT; BEGIN FOREACH t IN ARRAY ARRAY['accounts','student_profiles','student_settings','term_workshop_capacity','projects','personal_notes','personal_tasks'] LOOP EXECUTE format('CREATE TRIGGER touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_row()',t); END LOOP; END $$;

CREATE FUNCTION account_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NEW.role='STUDENT' AND NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_supervisor_id AND role='SUPERVISOR') THEN RAISE EXCEPTION 'Student requires a supervisor account reference'; END IF;
 IF TG_OP='UPDATE' AND ROW(NEW.role,NEW.university_number,NEW.email,NEW.account_supervisor_id) IS DISTINCT FROM ROW(OLD.role,OLD.university_number,OLD.email,OLD.account_supervisor_id) THEN RAISE EXCEPTION 'University account identity is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER account_identity BEFORE INSERT OR UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION account_guard();
CREATE FUNCTION student_scope_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE student UUID;
BEGIN
 IF TG_TABLE_NAME IN ('student_profiles','student_settings') THEN student=NEW.account_id; ELSE student=NEW.student_id; END IF;
 IF NOT EXISTS(SELECT 1 FROM accounts WHERE id=student AND role='STUDENT') THEN RAISE EXCEPTION 'Student account required'; END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE t TEXT; BEGIN FOREACH t IN ARRAY ARRAY['student_profiles','student_settings','student_enrollments','personal_notes','personal_tasks','personal_reminders'] LOOP EXECUTE format('CREATE TRIGGER student_scope BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION student_scope_guard()',t); END LOOP; END $$;
CREATE FUNCTION allocation_lock() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(25102701);
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
DO $$ DECLARE t TEXT; BEGIN FOREACH t IN ARRAY ARRAY['projects','project_students','project_supervisors','term_workshop_capacity'] LOOP EXECUTE format('CREATE TRIGGER allocation_lock BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION allocation_lock()',t); END LOOP; END $$;
CREATE FUNCTION validate_allocations() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM projects p JOIN accounts a ON a.id=p.formed_by WHERE a.role<>'SUPERVISOR') THEN RAISE EXCEPTION 'Only supervisor may form a project'; END IF;
 IF EXISTS(SELECT 1 FROM project_supervisors ps JOIN accounts a ON a.id=ps.supervisor_id WHERE a.role<>'SUPERVISOR') THEN RAISE EXCEPTION 'Project supervisor role invalid'; END IF;
 IF EXISTS(SELECT 1 FROM project_students m JOIN accounts a ON a.id=m.student_id WHERE m.left_at IS NULL AND a.role<>'STUDENT') THEN RAISE EXCEPTION 'Only students in student teams'; END IF;
 IF EXISTS(SELECT 1 FROM projects p LEFT JOIN project_students m ON m.project_id=p.id AND m.left_at IS NULL WHERE p.status<>'ARCHIVED' GROUP BY p.id HAVING count(m.id) NOT BETWEEN 2 AND 3) THEN RAISE EXCEPTION 'Each current project needs two or three students'; END IF;
 IF EXISTS(SELECT 1 FROM projects p WHERE p.status<>'ARCHIVED' AND NOT EXISTS(SELECT 1 FROM project_supervisors ps WHERE ps.project_id=p.id)) THEN RAISE EXCEPTION 'Project needs at least one supervisor'; END IF;
 IF EXISTS(SELECT 1 FROM project_students m JOIN accounts a ON a.id=m.student_id WHERE m.left_at IS NULL AND NOT EXISTS(SELECT 1 FROM project_supervisors ps WHERE ps.project_id=m.project_id AND ps.supervisor_id=a.account_supervisor_id)) THEN RAISE EXCEPTION 'Student account supervisor must be linked to project'; END IF;
 IF EXISTS(SELECT 1 FROM project_supervisors ps JOIN projects p ON p.id=ps.project_id WHERE p.status<>'ARCHIVED' GROUP BY ps.supervisor_id,p.term_id HAVING count(DISTINCT p.id)>4) THEN RAISE EXCEPTION 'Supervisor capacity is four projects per term'; END IF;
 IF EXISTS(SELECT 1 FROM projects p LEFT JOIN term_workshop_capacity c ON c.term_id=p.term_id WHERE p.status<>'ARCHIVED' GROUP BY p.term_id,c.team_capacity HAVING c.team_capacity IS NULL OR count(p.id)>c.team_capacity) THEN RAISE EXCEPTION 'Workshop team capacity exceeded or missing'; END IF;
 RETURN NULL;
END $$;
DO $$ DECLARE t TEXT; BEGIN FOREACH t IN ARRAY ARRAY['projects','project_students','project_supervisors','term_workshop_capacity','accounts'] LOOP EXECUTE format('CREATE CONSTRAINT TRIGGER valid_allocations AFTER INSERT OR UPDATE OR DELETE ON %I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_allocations()',t); END LOOP; END $$;
CREATE FUNCTION membership_window_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE term UUID; start DATE; tz TEXT;
BEGIN
 term=CASE WHEN TG_OP='DELETE' THEN OLD.term_id ELSE NEW.term_id END;
 SELECT starts_on,timezone INTO start,tz FROM academic_terms WHERE id=term;
 IF (now() AT TIME ZONE tz)::date<start OR (now() AT TIME ZONE tz)::date>=start+14 THEN RAISE EXCEPTION 'Team changes allowed only in the first two term weeks'; END IF;
 IF TG_OP='UPDATE' AND ROW(NEW.project_id,NEW.term_id,NEW.student_id) IS DISTINCT FROM ROW(OLD.project_id,OLD.term_id,OLD.student_id) THEN RAISE EXCEPTION 'Close old membership then insert a new one'; END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER membership_window BEFORE INSERT OR UPDATE OR DELETE ON project_students FOR EACH ROW EXECUTE FUNCTION membership_window_guard();
CREATE FUNCTION invitation_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.student_id AND role='STUDENT' AND status='PENDING_ACTIVATION' AND account_supervisor_id=NEW.invited_by) THEN RAISE EXCEPTION 'Assigned supervisor and pending student required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER activation_scope BEFORE INSERT ON activation_invitations FOR EACH ROW EXECUTE FUNCTION invitation_guard();

-- Backend validates the chosen password, hashes it with Argon2id, and passes
-- only that hash. Hash of a high-entropy activation token is separate.
CREATE FUNCTION activate_student(invitation_hash TEXT,registered_email TEXT,new_password_hash TEXT) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE invite activation_invitations%ROWTYPE; student accounts%ROWTYPE;
BEGIN
 SELECT * INTO invite FROM activation_invitations WHERE token_hash=invitation_hash FOR UPDATE;
 IF NOT FOUND OR invite.used_at IS NOT NULL OR invite.revoked_at IS NOT NULL OR invite.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Activation link invalid or expired'; END IF;
 SELECT * INTO student FROM accounts WHERE id=invite.student_id FOR UPDATE;
 IF student.status<>'PENDING_ACTIVATION' OR student.email<>lower(btrim(registered_email)) THEN RAISE EXCEPTION 'Activation email mismatch or account already activated'; END IF;
 IF new_password_hash IS NULL OR new_password_hash NOT LIKE '$argon2id$%' OR length(new_password_hash)<60 THEN RAISE EXCEPTION 'Backend-generated Argon2id hash required'; END IF;
 UPDATE accounts SET password_hash=new_password_hash,status='ACTIVE',activated_at=clock_timestamp() WHERE id=student.id;
 UPDATE activation_invitations SET used_at=clock_timestamp() WHERE id=invite.id;
 INSERT INTO audit_events(actor_id,event_key,subject_id) VALUES(student.id,'STUDENT_ACTIVATED',student.id);
 RETURN student.id;
END $$;
CREATE FUNCTION team_member(student UUID,project UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM project_students WHERE project_id=project AND student_id=student AND left_at IS NULL)
$$;
CREATE FUNCTION project_supervisor(supervisor UUID,project UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM project_supervisors WHERE project_id=project AND supervisor_id=supervisor)
$$;
CREATE VIEW seed_team_overview AS SELECT p.seed_key AS team_key,p.name,p.status,
 (SELECT count(*) FROM project_students m WHERE m.project_id=p.id AND m.left_at IS NULL) AS students,
 (SELECT count(*) FROM project_supervisors ps WHERE ps.project_id=p.id) AS supervisors
 FROM projects p;
CREATE VIEW workshop_capacity_summary AS SELECT c.term_id,c.team_capacity,count(p.id) AS current_teams,c.team_capacity-count(p.id) AS remaining_teams
 FROM term_workshop_capacity c LEFT JOIN projects p ON p.term_id=c.term_id AND p.status<>'ARCHIVED' GROUP BY c.term_id,c.team_capacity;
REVOKE ALL ON ALL TABLES IN SCHEMA labassist_student FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;

-- Source: supervisor-stage1/sql/03-supervisor-schema.sql
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

-- Source: workshop-stage1/sql/05-workshop-schema.sql
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

-- Source: project-work-stage2/sql/07-project-work-schema.sql
-- Project tasks/issues only. Apply after the three Stage 1 modules.
BEGIN;
SET search_path=labassist_student,public;
CREATE TABLE project_tasks (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), seed_key TEXT UNIQUE,
 project_id UUID NOT NULL REFERENCES projects(id),
 created_by UUID NOT NULL REFERENCES accounts(id),
 assigned_to UUID NOT NULL REFERENCES accounts(id),
 updated_by UUID NOT NULL REFERENCES accounts(id),
 title TEXT NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 240),
 description TEXT NOT NULL DEFAULT '',due_on DATE,
 status TEXT NOT NULL DEFAULT 'TODO' CHECK(status IN ('TODO','IN_PROGRESS','DONE')),
 needs_help BOOLEAN NOT NULL DEFAULT false,
 completed_at TIMESTAMPTZ,
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((status='DONE')=(completed_at IS NOT NULL)),
 CHECK(status<>'DONE' OR NOT needs_help)
);
CREATE TABLE project_issues (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,
 project_id UUID NOT NULL REFERENCES projects(id),
 created_by UUID NOT NULL REFERENCES accounts(id),updated_by UUID NOT NULL REFERENCES accounts(id),
 title TEXT NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 240),
 description TEXT NOT NULL DEFAULT '',
 priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW','MEDIUM','HIGH')),
 status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','MONITORING','RESOLVED')),
 resolution TEXT NOT NULL DEFAULT '',resolved_by UUID REFERENCES accounts(id),resolved_at TIMESTAMPTZ,
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((status='RESOLVED' AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND length(btrim(resolution))>0)
 OR (status<>'RESOLVED' AND resolved_by IS NULL AND resolved_at IS NULL AND resolution=''))
);
CREATE TABLE project_work_events (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 project_id UUID NOT NULL REFERENCES projects(id),actor_id UUID NOT NULL REFERENCES accounts(id),
 task_id UUID REFERENCES project_tasks(id),issue_id UUID REFERENCES project_issues(id),
 event_key TEXT NOT NULL CHECK(event_key IN ('CREATED','UPDATED')),
 before_state JSONB,after_state JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((task_id IS NULL)<>(issue_id IS NULL))
);
CREATE INDEX task_project_owner_status ON project_tasks(project_id,assigned_to,status);
CREATE INDEX issue_project_status ON project_issues(project_id,status);
CREATE INDEX work_activity_project ON project_work_events(project_id,created_at DESC,id DESC);

-- actor columns are supplied by a trusted backend, never accepted as client identity.
CREATE FUNCTION project_work_guard() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT team_member(NEW.created_by,NEW.project_id) AND TG_OP='INSERT' THEN RAISE EXCEPTION 'Task or issue creator must be a current teammate'; END IF;
 IF NOT team_member(NEW.updated_by,NEW.project_id) THEN RAISE EXCEPTION 'Work actor must be a current teammate'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.seed_key,NEW.project_id,NEW.created_by,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.seed_key,OLD.project_id,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Work identity is immutable'; END IF;
  NEW.revision=OLD.revision+1;
 ELSE
  IF NEW.updated_by<>NEW.created_by OR NEW.revision<>0 THEN RAISE EXCEPTION 'Initial work actor and revision invalid'; END IF;
 END IF;
 IF TG_TABLE_NAME='project_tasks' THEN
  IF TG_OP='INSERT' THEN
   IF NOT team_member(NEW.assigned_to,NEW.project_id) THEN RAISE EXCEPTION 'Task assignee must be a current teammate'; END IF;
   IF NEW.status<>'TODO' THEN RAISE EXCEPTION 'New task starts as TODO; assignee confirms progress'; END IF;
  ELSE
   IF NEW.assigned_to<>OLD.assigned_to THEN RAISE EXCEPTION 'Task reassignment is not implemented'; END IF;
   IF NEW.updated_by<>OLD.assigned_to THEN RAISE EXCEPTION 'Only task assignee may update their task'; END IF;
  END IF;
  IF NEW.status='DONE' THEN
   IF TG_OP='UPDATE' AND OLD.status='DONE' THEN NEW.completed_at=OLD.completed_at;
   ELSE NEW.completed_at=clock_timestamp(); END IF;
   NEW.needs_help=false;
  ELSE NEW.completed_at=NULL; END IF;
 ELSE
  IF TG_OP='INSERT' AND NEW.status<>'OPEN' THEN RAISE EXCEPTION 'New issue starts as OPEN'; END IF;
  IF NEW.status='RESOLVED' THEN
   IF TG_OP='UPDATE' AND OLD.status='RESOLVED' THEN NEW.resolved_by=OLD.resolved_by;NEW.resolved_at=OLD.resolved_at;
   ELSE NEW.resolved_by=NEW.updated_by;NEW.resolved_at=clock_timestamp(); END IF;
  ELSE NEW.resolved_by=NULL;NEW.resolved_at=NULL;NEW.resolution=''; END IF;
 END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER work_guard BEFORE INSERT OR UPDATE ON project_tasks FOR EACH ROW EXECUTE FUNCTION project_work_guard();
CREATE TRIGGER work_guard BEFORE INSERT OR UPDATE ON project_issues FOR EACH ROW EXECUTE FUNCTION project_work_guard();
CREATE FUNCTION log_project_work() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
BEGIN
 INSERT INTO project_work_events(project_id,actor_id,task_id,issue_id,event_key,before_state,after_state)
 VALUES(NEW.project_id,NEW.updated_by,CASE WHEN TG_TABLE_NAME='project_tasks' THEN NEW.id END,
 CASE WHEN TG_TABLE_NAME='project_issues' THEN NEW.id END,
 CASE WHEN TG_OP='INSERT' THEN 'CREATED' ELSE 'UPDATED' END,
 CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) END,to_jsonb(NEW));RETURN NEW;
END $$;
CREATE TRIGGER log_work AFTER INSERT OR UPDATE ON project_tasks FOR EACH ROW EXECUTE FUNCTION log_project_work();
CREATE TRIGGER log_work AFTER INSERT OR UPDATE ON project_issues FOR EACH ROW EXECUTE FUNCTION log_project_work();
CREATE FUNCTION immutable_work_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Project work history is append only'; END $$;
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON project_work_events FOR EACH ROW EXECUTE FUNCTION immutable_work_history();

CREATE FUNCTION set_project_task_status(actor UUID,task UUID,expected_revision INT,next_status TEXT,help BOOLEAN DEFAULT false)
RETURNS project_tasks LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current_task project_tasks%ROWTYPE;
BEGIN
 SELECT * INTO current_task FROM project_tasks WHERE id=task FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Task not found'; END IF;
 IF NOT team_member(actor,current_task.project_id) OR actor<>current_task.assigned_to THEN RAISE EXCEPTION 'Only task assignee may update their task'; END IF;
 IF expected_revision IS NULL OR current_task.revision<>expected_revision THEN RAISE EXCEPTION 'Work revision conflict'; END IF;
 UPDATE project_tasks SET status=next_status,needs_help=help,updated_by=actor WHERE id=task RETURNING * INTO current_task;
 RETURN current_task;
END $$;
CREATE FUNCTION set_project_issue_status(actor UUID,issue UUID,expected_revision INT,next_status TEXT,solution TEXT DEFAULT '')
RETURNS project_issues LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current_issue project_issues%ROWTYPE;
BEGIN
 SELECT * INTO current_issue FROM project_issues WHERE id=issue FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Issue not found'; END IF;
 IF NOT team_member(actor,current_issue.project_id) THEN RAISE EXCEPTION 'Work actor must be a current teammate'; END IF;
 IF expected_revision IS NULL OR current_issue.revision<>expected_revision THEN RAISE EXCEPTION 'Work revision conflict'; END IF;
 UPDATE project_issues SET status=next_status,resolution=solution,updated_by=actor WHERE id=issue RETURNING * INTO current_issue;
 RETURN current_issue;
END $$;
CREATE VIEW project_member_work_summary AS
 SELECT m.project_id,m.student_id,count(t.id) AS total_tasks,
 count(t.id) FILTER(WHERE t.status='DONE') AS completed_tasks,
 count(t.id) FILTER(WHERE t.status='IN_PROGRESS') AS in_progress_tasks,
 count(t.id) FILTER(WHERE t.status='TODO') AS remaining_tasks,
 count(t.id) FILTER(WHERE t.status<>'DONE' AND t.due_on<(now() AT TIME ZONE 'Asia/Hebron')::date) AS overdue_tasks,
 COALESCE(round(100.0*count(t.id) FILTER(WHERE t.status='DONE')/NULLIF(count(t.id),0),2),0) AS progress_percent
 FROM project_students m LEFT JOIN project_tasks t ON t.project_id=m.project_id AND t.assigned_to=m.student_id
 WHERE m.left_at IS NULL GROUP BY m.project_id,m.student_id;
CREATE VIEW project_team_work_summary AS
 SELECT p.id AS project_id,
 COALESCE((SELECT round(avg(s.progress_percent),2) FROM project_member_work_summary s WHERE s.project_id=p.id),0) AS average_progress_percent,
 (SELECT count(*) FROM project_tasks t WHERE t.project_id=p.id AND t.status<>'DONE') AS open_tasks,
 (SELECT count(*) FROM project_issues i WHERE i.project_id=p.id AND i.status<>'RESOLVED') AS open_issues
 FROM projects p;
REVOKE ALL ON project_tasks,project_issues,project_work_events,project_member_work_summary,project_team_work_summary FROM PUBLIC;
REVOKE ALL ON FUNCTION project_work_guard(),log_project_work(),immutable_work_history(),set_project_task_status(UUID,UUID,INT,TEXT,BOOLEAN),set_project_issue_status(UUID,UUID,INT,TEXT,TEXT) FROM PUBLIC;
COMMIT;

-- Source: project-finance-stage3/sql/09-project-finance-schema.sql
BEGIN;
SET search_path=labassist_student,public;

CREATE TABLE project_budgets (
 project_id UUID PRIMARY KEY REFERENCES projects(id),
 currency VARCHAR(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 amount NUMERIC(14,2) NOT NULL CHECK(amount>=0 AND amount<>'NaN'::numeric),
 created_by UUID NOT NULL REFERENCES accounts(id),updated_by UUID NOT NULL REFERENCES accounts(id),
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE project_bom_items (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,
 project_id UUID NOT NULL REFERENCES project_budgets(project_id),
 name TEXT NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 240),
 quantity_required INT NOT NULL CHECK(quantity_required>0),
 estimated_unit_price NUMERIC(14,2) CHECK(estimated_unit_price>=0 AND estimated_unit_price<>'NaN'::numeric),
 is_needed BOOLEAN NOT NULL DEFAULT true,not_needed_reason TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '',
 created_by UUID NOT NULL REFERENCES accounts(id),updated_by UUID NOT NULL REFERENCES accounts(id),
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,project_id),CHECK(NOT is_needed OR not_needed_reason='')
);
CREATE TABLE project_expenses (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id UUID NOT NULL REFERENCES project_budgets(project_id),
 request_key UUID NOT NULL,request_payload JSONB NOT NULL CHECK(jsonb_typeof(request_payload)='object'),
 purchased_on DATE NOT NULL,seller_name TEXT NOT NULL DEFAULT '',
 receipt_file_id UUID REFERENCES files(id),
 status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','POSTED','VOIDED')),
 created_by UUID NOT NULL REFERENCES accounts(id),updated_by UUID NOT NULL REFERENCES accounts(id),
 voided_by UUID REFERENCES accounts(id),voided_at TIMESTAMPTZ,void_reason TEXT NOT NULL DEFAULT '',
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(project_id,request_key),UNIQUE(id,project_id),
 CHECK((status='VOIDED' AND voided_by IS NOT NULL AND voided_at IS NOT NULL AND length(btrim(void_reason))>0)
 OR (status<>'VOIDED' AND voided_by IS NULL AND voided_at IS NULL AND void_reason=''))
);
CREATE TABLE project_expense_lines (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 expense_id UUID NOT NULL,project_id UUID NOT NULL,bom_item_id UUID,
 label TEXT NOT NULL CHECK(length(btrim(label)) BETWEEN 1 AND 240),
 quantity INT NOT NULL CHECK(quantity>0),unit_price NUMERIC(14,2) NOT NULL CHECK(unit_price>=0 AND unit_price<>'NaN'::numeric),
 total NUMERIC(24,2) GENERATED ALWAYS AS (quantity::numeric*unit_price) STORED,
 FOREIGN KEY(expense_id,project_id) REFERENCES project_expenses(id,project_id),
 FOREIGN KEY(bom_item_id,project_id) REFERENCES project_bom_items(id,project_id)
);
CREATE INDEX bom_project_needed ON project_bom_items(project_id,is_needed);
CREATE INDEX expenses_project_status_date ON project_expenses(project_id,status,purchased_on);
CREATE INDEX expense_line_item ON project_expense_lines(bom_item_id,expense_id);
CREATE INDEX expense_line_header ON project_expense_lines(expense_id);

CREATE FUNCTION finance_member_guard() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT team_member(NEW.updated_by,NEW.project_id) THEN RAISE EXCEPTION 'Finance actor must be a current teammate'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.updated_by<>NEW.created_by OR NEW.revision<>0 THEN RAISE EXCEPTION 'Initial finance actor and revision invalid'; END IF;
 ELSE
  IF ROW(NEW.project_id,NEW.created_by,NEW.created_at) IS DISTINCT FROM ROW(OLD.project_id,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Finance identity is immutable'; END IF;
  NEW.revision=OLD.revision+1;
 END IF;
 IF TG_TABLE_NAME='project_budgets' THEN
  IF TG_OP='UPDATE' AND NEW.currency<>OLD.currency THEN RAISE EXCEPTION 'Budget currency is immutable'; END IF;
 ELSE
  IF TG_OP='UPDATE' AND ROW(NEW.id,NEW.seed_key) IS DISTINCT FROM ROW(OLD.id,OLD.seed_key) THEN RAISE EXCEPTION 'BOM identity is immutable'; END IF;
 END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER finance_member BEFORE INSERT OR UPDATE ON project_budgets FOR EACH ROW EXECUTE FUNCTION finance_member_guard();
CREATE TRIGGER finance_member BEFORE INSERT OR UPDATE ON project_bom_items FOR EACH ROW EXECUTE FUNCTION finance_member_guard();

CREATE FUNCTION expense_guard() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Expense history cannot be deleted; void the expense'; END IF;
 IF NOT team_member(NEW.updated_by,NEW.project_id) THEN RAISE EXCEPTION 'Finance actor must be a current teammate'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.created_by<>NEW.updated_by OR NEW.status<>'DRAFT' OR NEW.revision<>0 THEN RAISE EXCEPTION 'Expense must start as an owned draft'; END IF;
 ELSE
  IF ROW(NEW.id,NEW.project_id,NEW.request_key,NEW.request_payload,NEW.purchased_on,NEW.seller_name,NEW.receipt_file_id,NEW.created_by,NEW.created_at)
   IS DISTINCT FROM ROW(OLD.id,OLD.project_id,OLD.request_key,OLD.request_payload,OLD.purchased_on,OLD.seller_name,OLD.receipt_file_id,OLD.created_by,OLD.created_at)
   THEN RAISE EXCEPTION 'Recorded expense is immutable; void and replace'; END IF;
  IF NOT ((OLD.status='DRAFT' AND NEW.status='POSTED' AND NEW.updated_by=OLD.created_by)
       OR (OLD.status='POSTED' AND NEW.status='VOIDED')) THEN RAISE EXCEPTION 'Invalid expense transition'; END IF;
  NEW.revision=OLD.revision+1;
 END IF;
 IF NEW.receipt_file_id IS NOT NULL AND TG_OP='INSERT' THEN
  IF NOT EXISTS(SELECT 1 FROM files f WHERE f.id=NEW.receipt_file_id AND f.uploaded_by=NEW.created_by AND f.status='READY' AND (f.mime_type LIKE 'image/%' OR f.mime_type='application/pdf')) THEN
   RAISE EXCEPTION 'Receipt must be an owned ready image or PDF'; END IF;
 END IF;
 IF NEW.status='VOIDED' THEN NEW.voided_by=NEW.updated_by;NEW.voided_at=clock_timestamp(); END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER expense_scope BEFORE INSERT OR UPDATE OR DELETE ON project_expenses FOR EACH ROW EXECUTE FUNCTION expense_guard();
CREATE FUNCTION expense_line_guard() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
DECLARE header project_expenses%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Expense lines are immutable; void and replace'; END IF;
 SELECT * INTO header FROM project_expenses WHERE id=NEW.expense_id FOR UPDATE;
 IF NOT FOUND OR header.status<>'DRAFT' THEN RAISE EXCEPTION 'Lines require a draft expense'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER expense_line_scope BEFORE INSERT OR UPDATE OR DELETE ON project_expense_lines FOR EACH ROW EXECUTE FUNCTION expense_line_guard();
CREATE FUNCTION validate_posted_expenses() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM project_expenses WHERE status='DRAFT') THEN RAISE EXCEPTION 'Expense draft must be posted in the same transaction'; END IF;
 IF EXISTS(SELECT 1 FROM project_expenses e WHERE NOT EXISTS(SELECT 1 FROM project_expense_lines l WHERE l.expense_id=e.id)) THEN RAISE EXCEPTION 'Expense requires at least one line'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER complete_expense AFTER INSERT OR UPDATE ON project_expenses DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_posted_expenses();
CREATE FUNCTION log_project_finance() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
BEGIN
 INSERT INTO audit_events(actor_id,event_key,subject_id,payload)
 VALUES(NEW.updated_by,TG_TABLE_NAME||'_'||TG_OP,NEW.project_id,
 jsonb_build_object('before',CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) END,'after',to_jsonb(NEW)));
 RETURN NEW;
END $$;
DO $$ DECLARE t TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['project_budgets','project_bom_items','project_expenses'] LOOP
  EXECUTE format('CREATE TRIGGER finance_audit AFTER INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION log_project_finance()',t);
 END LOOP;
END $$;

-- The backend derives actor from its authenticated session, not request body data.
CREATE FUNCTION record_project_expense(actor UUID,project UUID,idempotency_key UUID,purchase_date DATE,seller TEXT,items JSONB,receipt UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE payload JSONB;existing project_expenses%ROWTYPE;expense UUID;item JSONB;
BEGIN
 IF NOT team_member(actor,project) THEN RAISE EXCEPTION 'Finance actor must be a current teammate'; END IF;
 IF jsonb_typeof(items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Expense items must be an array'; END IF;
 IF jsonb_array_length(items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Expense requires 1 to 100 lines'; END IF;
 payload=jsonb_build_object('actor',actor,'date',purchase_date,'seller',COALESCE(seller,''),'items',items,'receipt',receipt);
 SELECT * INTO existing FROM project_expenses WHERE project_id=project AND request_key=idempotency_key;
 IF FOUND THEN
  IF existing.request_payload<>payload THEN RAISE EXCEPTION 'Expense request key reused with different data'; END IF;
  RETURN existing.id;
 END IF;
 INSERT INTO project_expenses(project_id,request_key,request_payload,purchased_on,seller_name,receipt_file_id,created_by,updated_by)
 VALUES(project,idempotency_key,payload,purchase_date,COALESCE(seller,''),receipt,actor,actor)
 ON CONFLICT(project_id,request_key) DO NOTHING RETURNING id INTO expense;
 IF expense IS NULL THEN
  SELECT * INTO existing FROM project_expenses WHERE project_id=project AND request_key=idempotency_key;
  IF existing.request_payload<>payload THEN RAISE EXCEPTION 'Expense request key reused with different data'; END IF;
  RETURN existing.id;
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(items) LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR jsonb_typeof(item->'quantity') IS DISTINCT FROM 'number'
   OR jsonb_typeof(item->'unit_price') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'label') IS DISTINCT FROM 'string'
   THEN RAISE EXCEPTION 'Expense line fields invalid'; END IF;
  IF (item->>'quantity') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Expense quantity must be a positive integer'; END IF;
  IF (item->>'unit_price')::numeric<0 OR scale((item->>'unit_price')::numeric)>2 THEN RAISE EXCEPTION 'Expense price must be nonnegative with at most two decimals'; END IF;
  INSERT INTO project_expense_lines(expense_id,project_id,bom_item_id,label,quantity,unit_price)
  VALUES(expense,project,(item->>'bom_item_id')::uuid,item->>'label',(item->>'quantity')::int,(item->>'unit_price')::numeric);
 END LOOP;
 UPDATE project_expenses SET status='POSTED' WHERE id=expense;
 RETURN expense;
END $$;
CREATE FUNCTION void_project_expense(actor UUID,expense UUID,expected_revision INT,reason TEXT)
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current_expense project_expenses%ROWTYPE;
BEGIN
 SELECT * INTO current_expense FROM project_expenses WHERE id=expense FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found'; END IF;
 IF NOT team_member(actor,current_expense.project_id) THEN RAISE EXCEPTION 'Finance actor must be a current teammate'; END IF;
 IF expected_revision IS NULL OR current_expense.revision<>expected_revision THEN RAISE EXCEPTION 'Finance revision conflict'; END IF;
 UPDATE project_expenses SET status='VOIDED',updated_by=actor,void_reason=reason WHERE id=expense;
 RETURN expense;
END $$;
CREATE FUNCTION set_project_bom_needed(actor UUID,item UUID,expected_revision INT,needed BOOLEAN,reason TEXT DEFAULT '')
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current_item project_bom_items%ROWTYPE;
BEGIN
 SELECT * INTO current_item FROM project_bom_items WHERE id=item FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'BOM item not found'; END IF;
 IF NOT team_member(actor,current_item.project_id) THEN RAISE EXCEPTION 'Finance actor must be a current teammate'; END IF;
 IF expected_revision IS NULL OR current_item.revision<>expected_revision THEN RAISE EXCEPTION 'Finance revision conflict'; END IF;
 UPDATE project_bom_items SET is_needed=needed,not_needed_reason=CASE WHEN needed THEN '' ELSE COALESCE(reason,'') END,updated_by=actor WHERE id=item;
 RETURN item;
END $$;

CREATE VIEW project_expense_totals AS
 SELECT e.id,e.project_id,e.status,COALESCE(sum(l.total),0) AS amount
 FROM project_expenses e LEFT JOIN project_expense_lines l ON l.expense_id=e.id GROUP BY e.id;
CREATE VIEW project_bom_summary AS
 SELECT b.*,
 COALESCE(q.acquired_quantity,0) AS acquired_quantity,
 CASE WHEN NOT b.is_needed THEN 0 ELSE greatest(b.quantity_required-COALESCE(q.acquired_quantity,0),0) END AS missing_quantity,
 CASE WHEN NOT b.is_needed THEN 'NOT_NEEDED'
  WHEN COALESCE(q.acquired_quantity,0)>=b.quantity_required THEN 'ACQUIRED'
  WHEN COALESCE(q.acquired_quantity,0)>0 THEN 'PARTIAL' ELSE 'NEEDED' END AS supply_status
 FROM project_bom_items b LEFT JOIN LATERAL(
  SELECT sum(l.quantity) AS acquired_quantity FROM project_expense_lines l JOIN project_expenses e ON e.id=l.expense_id
  WHERE l.bom_item_id=b.id AND e.status='POSTED'
 ) q ON true;
CREATE VIEW project_finance_summary AS
 SELECT b.project_id,b.currency,b.amount AS budget,
 COALESCE(s.spent,0) AS spent,b.amount-COALESCE(s.spent,0) AS remaining,
 COALESCE(e.estimated_known,0) AS estimated_known,
 COALESCE(e.unpriced_items,0) AS unpriced_items
 FROM project_budgets b
 LEFT JOIN LATERAL(SELECT sum(t.amount) AS spent FROM project_expense_totals t WHERE t.project_id=b.project_id AND t.status='POSTED') s ON true
 LEFT JOIN LATERAL(SELECT sum(i.quantity_required::numeric*i.estimated_unit_price) AS estimated_known,
 count(*) FILTER(WHERE i.estimated_unit_price IS NULL) AS unpriced_items
 FROM project_bom_items i WHERE i.project_id=b.project_id AND i.is_needed) e ON true;
REVOKE ALL ON project_budgets,project_bom_items,project_expenses,project_expense_lines,project_expense_totals,project_bom_summary,project_finance_summary FROM PUBLIC;
REVOKE ALL ON FUNCTION finance_member_guard(),expense_guard(),expense_line_guard(),validate_posted_expenses(),log_project_finance(),record_project_expense(UUID,UUID,UUID,DATE,TEXT,JSONB,UUID),void_project_expense(UUID,UUID,INT,TEXT),set_project_bom_needed(UUID,UUID,INT,BOOLEAN,TEXT) FROM PUBLIC;
COMMIT;

-- Source: reports-stage4/sql/11-reports-schema.sql
-- PostgreSQL 17. Apply after stages 01-10. The backend supplies authenticated actors.
BEGIN;
SET search_path=labassist_student,public;

CREATE TABLE reporting_periods (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,
 term_id UUID NOT NULL REFERENCES academic_terms(id),week_number INT NOT NULL CHECK(week_number>0),
 week_start DATE NOT NULL CHECK(extract(isodow FROM week_start)=1),
 opens_at TIMESTAMPTZ NOT NULL,due_at TIMESTAMPTZ NOT NULL,late_until TIMESTAMPTZ NOT NULL,
 UNIQUE(term_id,week_number),UNIQUE(term_id,week_start),UNIQUE(id,term_id),
 CHECK(opens_at<due_at AND due_at<=late_until)
);
CREATE TABLE presentation_templates (
 id TEXT NOT NULL,version INT NOT NULL CHECK(version>0),name TEXT NOT NULL,category TEXT NOT NULL,
 design JSONB NOT NULL CHECK(jsonb_typeof(design)='object'),is_active BOOLEAN NOT NULL DEFAULT true,
 PRIMARY KEY(id,version)
);
CREATE TABLE report_submission_windows (
 project_id UUID NOT NULL REFERENCES projects(id),kind TEXT NOT NULL CHECK(kind IN ('FINAL','PRESENTATION')),
 is_open BOOLEAN NOT NULL DEFAULT false,closes_at TIMESTAMPTZ,
 updated_by UUID NOT NULL REFERENCES accounts(id),revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(project_id,kind)
);
CREATE TABLE report_documents (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,project_id UUID NOT NULL REFERENCES projects(id),
 kind TEXT NOT NULL CHECK(kind IN ('WEEKLY','FINAL','PRESENTATION')),period_id UUID REFERENCES reporting_periods(id),
 state TEXT NOT NULL DEFAULT 'DRAFT' CHECK(state IN ('DRAFT','SUBMITTED')),
 draft_content JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(draft_content)='object'),
 appearance JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(appearance)='object'),
 template_id TEXT,template_version INT,imported_file_id UUID REFERENCES files(id),
 created_by UUID NOT NULL REFERENCES accounts(id),updated_by UUID NOT NULL REFERENCES accounts(id),
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),deleted_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((kind='WEEKLY')=(period_id IS NOT NULL)),
 CHECK((template_id IS NULL)=(template_version IS NULL)),
 CHECK(kind='PRESENTATION' OR (template_id IS NULL AND imported_file_id IS NULL)),
 FOREIGN KEY(template_id,template_version) REFERENCES presentation_templates(id,version)
);
CREATE UNIQUE INDEX one_weekly_report_per_team_period ON report_documents(project_id,period_id) WHERE kind='WEEKLY';
CREATE UNIQUE INDEX one_shared_final_workspace ON report_documents(project_id,kind) WHERE kind<>'WEEKLY';
CREATE TABLE report_versions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),document_id UUID NOT NULL REFERENCES report_documents(id),
 version_number INT NOT NULL CHECK(version_number>0),document_revision INT NOT NULL CHECK(document_revision>=0),
 content JSONB NOT NULL CHECK(jsonb_typeof(content)='object'),appearance JSONB NOT NULL CHECK(jsonb_typeof(appearance)='object'),
 template_id TEXT,template_version INT,imported_file_id UUID REFERENCES files(id),
 created_by UUID NOT NULL REFERENCES accounts(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(document_id,version_number),UNIQUE(document_id,document_revision),UNIQUE(id,document_id),
 FOREIGN KEY(template_id,template_version) REFERENCES presentation_templates(id,version)
);
CREATE TABLE report_version_files (
 version_id UUID NOT NULL REFERENCES report_versions(id),file_id UUID NOT NULL REFERENCES files(id),
 purpose TEXT NOT NULL CHECK(purpose IN ('ATTACHMENT','IMAGE','BACKGROUND','PPTX_SOURCE','PDF_EXPORT','PPTX_EXPORT')),
 content_key TEXT NOT NULL DEFAULT '',attached_by UUID NOT NULL REFERENCES accounts(id),
 storage_key TEXT NOT NULL,original_name TEXT NOT NULL,mime_type TEXT NOT NULL,byte_size BIGINT NOT NULL,
 sha256 CHAR(64) NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 PRIMARY KEY(version_id,file_id,purpose,content_key)
);
CREATE TABLE report_submissions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,
 document_id UUID NOT NULL REFERENCES report_documents(id),version_id UUID NOT NULL,
 request_key UUID NOT NULL,request_payload JSONB NOT NULL CHECK(jsonb_typeof(request_payload)='object'),
 submitted_by UUID NOT NULL REFERENCES accounts(id),submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 is_late BOOLEAN NOT NULL DEFAULT false,student_note TEXT NOT NULL DEFAULT '',
 state TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK(state IN ('SUBMITTED','WITHDRAWN','SUPERSEDED')),
 first_viewed_by UUID REFERENCES accounts(id),first_viewed_at TIMESTAMPTZ,
 changed_by UUID NOT NULL REFERENCES accounts(id),changed_at TIMESTAMPTZ,
 change_reason TEXT CHECK(change_reason IN ('WITHDRAWAL','STUDENT_EDIT','RESUBMISSION')),
 UNIQUE(document_id,request_key),FOREIGN KEY(version_id,document_id) REFERENCES report_versions(id,document_id),
 CHECK((first_viewed_by IS NULL)=(first_viewed_at IS NULL)),
 CHECK(first_viewed_at IS NULL OR first_viewed_at>=submitted_at),
 CHECK((state='SUBMITTED' AND changed_at IS NULL AND change_reason IS NULL) OR
       (state<>'SUBMITTED' AND changed_at IS NOT NULL AND change_reason IS NOT NULL AND changed_at>=submitted_at))
);
CREATE UNIQUE INDEX one_active_report_submission ON report_submissions(document_id) WHERE state='SUBMITTED';
CREATE TABLE report_feedback (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),submission_id UUID NOT NULL REFERENCES report_submissions(id),
 request_key UUID NOT NULL,request_payload JSONB NOT NULL CHECK(jsonb_typeof(request_payload)='object'),
 kind TEXT NOT NULL CHECK(kind IN ('REVIEW','COMMENT')),
 decision TEXT CHECK(decision IN ('REVIEWED','NEEDS_CHANGES','APPROVED')),
 body TEXT NOT NULL CHECK(length(btrim(body))>0),section_id TEXT,page_number INT CHECK(page_number>0),slide_id TEXT,
 created_by UUID NOT NULL REFERENCES accounts(id),updated_by UUID NOT NULL REFERENCES accounts(id),
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 seen_by_student_id UUID REFERENCES accounts(id),seen_by_student_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(submission_id,request_key),CHECK((kind='REVIEW')=(decision IS NOT NULL)),
 CHECK((seen_by_student_id IS NULL)=(seen_by_student_at IS NULL)),
 CHECK(seen_by_student_at IS NULL OR seen_by_student_at>=created_at)
);
CREATE TABLE report_check_runs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),version_id UUID NOT NULL REFERENCES report_versions(id),
 requested_by UUID NOT NULL REFERENCES accounts(id),kind TEXT NOT NULL CHECK(kind IN ('STRUCTURE','ABET','AI_ASSISTED')),
 engine TEXT NOT NULL,model TEXT,status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SUCCEEDED','FAILED')),
 result JSONB,error_text TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),finished_at TIMESTAMPTZ,
 CHECK((status='PENDING' AND finished_at IS NULL AND result IS NULL AND error_text IS NULL) OR
 (status='SUCCEEDED' AND finished_at IS NOT NULL AND result IS NOT NULL AND jsonb_typeof(result)='object' AND error_text IS NULL) OR
 (status='FAILED' AND finished_at IS NOT NULL AND result IS NULL AND length(btrim(error_text))>0)),
 CHECK(finished_at IS NULL OR finished_at>=created_at)
);
CREATE INDEX reports_project_kind ON report_documents(project_id,kind,updated_at DESC);
CREATE INDEX report_version_history ON report_versions(document_id,version_number DESC);
CREATE INDEX report_submission_history ON report_submissions(document_id,submitted_at DESC,id);
CREATE INDEX report_feedback_submission ON report_feedback(submission_id,created_at,id);
CREATE INDEX report_file_lookup ON report_version_files(file_id);
CREATE INDEX report_checks_version ON report_check_runs(version_id,created_at DESC);

CREATE FUNCTION report_student_can_write(actor UUID,project UUID) RETURNS BOOLEAN LANGUAGE sql STABLE
SET search_path=labassist_student,pg_temp AS $$
 SELECT team_member(actor,project) AND EXISTS(
 SELECT 1 FROM projects p JOIN academic_terms t ON t.id=p.term_id
 JOIN accounts a ON a.id=actor WHERE p.id=project AND p.status NOT IN ('COMPLETED','ARCHIVED')
 AND a.role='STUDENT' AND a.status<>'DISABLED'
 AND (t.ends_on IS NULL OR (now() AT TIME ZONE 'Asia/Hebron')::date<=t.ends_on OR EXISTS(
 SELECT 1 FROM student_enrollments e WHERE e.student_id=actor AND e.term_id=t.id AND e.incomplete_until>now())))
$$;
CREATE FUNCTION report_is_open(project UUID,report_kind TEXT) RETURNS BOOLEAN LANGUAGE sql STABLE
SET search_path=labassist_student,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM report_submission_windows WHERE project_id=project AND kind=report_kind
 AND is_open AND (closes_at IS NULL OR closes_at>=now()))
$$;
CREATE FUNCTION report_content_valid(report_kind TEXT,content JSONB,submitting BOOLEAN DEFAULT false) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE key TEXT;block JSONB;section JSONB;slide JSONB;
BEGIN
 IF jsonb_typeof(content) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 IF NOT submitting AND content='{}'::jsonb THEN RETURN true; END IF;
 IF report_kind='WEEKLY' THEN
  IF jsonb_typeof(content->'progress') IS DISTINCT FROM 'number' OR
   (content->>'progress')::numeric NOT BETWEEN 0 AND 100 OR
   jsonb_typeof(content->'hasDelays') IS DISTINCT FROM 'boolean' THEN RETURN false; END IF;
  FOREACH key IN ARRAY ARRAY['work','progressNote','tasks','delayReason','delayAction','problems','plan'] LOOP
   IF jsonb_typeof(content->key) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  END LOOP;
  IF submitting AND (length(btrim(content->>'work'))=0 OR length(btrim(content->>'tasks'))=0 OR length(btrim(content->>'plan'))=0
   OR ((content->>'hasDelays')::boolean AND (length(btrim(content->>'delayReason'))=0 OR length(btrim(content->>'delayAction'))=0))) THEN RETURN false; END IF;
 ELSIF report_kind='FINAL' THEN
  IF jsonb_typeof(content->'meta') IS DISTINCT FROM 'object' OR jsonb_typeof(content->'sections') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF submitting AND (COALESCE(length(btrim(content->'meta'->>'title')),0)=0 OR jsonb_array_length(content->'sections')=0) THEN RETURN false; END IF;
  FOR section IN SELECT value FROM jsonb_array_elements(content->'sections') LOOP
   IF jsonb_typeof(section) IS DISTINCT FROM 'object' OR COALESCE(length(section->>'id'),0)=0 OR jsonb_typeof(section->'blocks') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
   FOR block IN SELECT value FROM jsonb_array_elements(section->'blocks') LOOP
    IF jsonb_typeof(block) IS DISTINCT FROM 'object' OR COALESCE(block->>'kind','') NOT IN ('paragraph','heading','image','table') THEN RETURN false; END IF;
   END LOOP;
  END LOOP;
  IF (SELECT count(*)<>count(DISTINCT value->>'id') FROM jsonb_array_elements(content->'sections')) THEN RETURN false; END IF;
 ELSIF report_kind='PRESENTATION' THEN
  IF jsonb_typeof(content->'slides') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF submitting AND (COALESCE(length(btrim(content->>'title')),0)=0 OR jsonb_array_length(content->'slides')=0) THEN RETURN false; END IF;
  FOR slide IN SELECT value FROM jsonb_array_elements(content->'slides') LOOP
   IF jsonb_typeof(slide) IS DISTINCT FROM 'object' OR COALESCE(length(slide->>'id'),0)=0 OR
    (slide ? 'objects' AND jsonb_typeof(slide->'objects') IS DISTINCT FROM 'array') THEN RETURN false; END IF;
  END LOOP;
  IF (SELECT count(*)<>count(DISTINCT value->>'id') FROM jsonb_array_elements(content->'slides')) THEN RETURN false; END IF;
 ELSE RETURN false;
 END IF;
 RETURN true;
END $$;

CREATE FUNCTION report_window_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Report window history cannot be deleted'; END IF;
 IF EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'Completed project reports are read only'; END IF;
 IF NOT project_supervisor(NEW.updated_by,NEW.project_id) THEN RAISE EXCEPTION 'Project supervisor required'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.project_id,NEW.kind) IS DISTINCT FROM ROW(OLD.project_id,OLD.kind) THEN RAISE EXCEPTION 'Window identity is immutable'; END IF;
  NEW.revision=OLD.revision+1;
 ELSIF NEW.revision<>0 THEN RAISE EXCEPTION 'Initial window revision invalid'; END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER report_window_scope BEFORE INSERT OR UPDATE OR DELETE ON report_submission_windows FOR EACH ROW EXECUTE FUNCTION report_window_guard();

CREATE FUNCTION report_document_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE student_actor BOOLEAN;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Report history cannot be deleted; discard the draft'; END IF;
 IF EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'Completed project reports are read only'; END IF;
 student_actor=report_student_can_write(NEW.updated_by,NEW.project_id);
 IF TG_OP='INSERT' THEN
  IF NOT student_actor OR NEW.created_by<>NEW.updated_by OR NEW.state<>'DRAFT' OR NEW.revision<>0 THEN RAISE EXCEPTION 'Report starts as a teammate draft'; END IF;
 ELSE
  IF ROW(NEW.id,NEW.seed_key,NEW.project_id,NEW.kind,NEW.period_id,NEW.created_by,NEW.created_at) IS DISTINCT FROM
     ROW(OLD.id,OLD.seed_key,OLD.project_id,OLD.kind,OLD.period_id,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Report identity is immutable'; END IF;
  IF NOT student_actor THEN
   IF NOT project_supervisor(NEW.updated_by,NEW.project_id) OR OLD.kind='WEEKLY' OR OLD.state<>'SUBMITTED' OR NEW.state<>'DRAFT'
    OR ROW(NEW.draft_content,NEW.appearance,NEW.template_id,NEW.template_version,NEW.imported_file_id,NEW.deleted_at) IS DISTINCT FROM
       ROW(OLD.draft_content,OLD.appearance,OLD.template_id,OLD.template_version,OLD.imported_file_id,OLD.deleted_at)
    OR NOT report_is_open(NEW.project_id,NEW.kind) THEN RAISE EXCEPTION 'Only supervisor may reopen a submitted final or presentation'; END IF;
  ELSIF OLD.state='SUBMITTED' AND NEW.state='DRAFT' THEN
   IF OLD.kind<>'WEEKLY' OR EXISTS(SELECT 1 FROM report_submissions WHERE document_id=OLD.id AND state='SUBMITTED') THEN RAISE EXCEPTION 'Submitted document is locked'; END IF;
  ELSIF OLD.state='SUBMITTED' THEN RAISE EXCEPTION 'Submitted document is locked';
  END IF;
  IF NEW.state='SUBMITTED' AND (NEW.draft_content<>OLD.draft_content OR NEW.appearance<>OLD.appearance OR
   ROW(NEW.template_id,NEW.template_version,NEW.imported_file_id) IS DISTINCT FROM ROW(OLD.template_id,OLD.template_version,OLD.imported_file_id)
   OR NOT EXISTS(SELECT 1 FROM report_submissions WHERE document_id=OLD.id AND state='SUBMITTED')) THEN RAISE EXCEPTION 'Submission requires a frozen version'; END IF;
  NEW.revision=OLD.revision+1;
 END IF;
 IF NEW.kind='WEEKLY' AND NOT EXISTS(SELECT 1 FROM reporting_periods r JOIN projects p ON p.term_id=r.term_id WHERE r.id=NEW.period_id AND p.id=NEW.project_id) THEN RAISE EXCEPTION 'Weekly period belongs to another term'; END IF;
 IF NEW.kind<>'WEEKLY' AND student_actor AND NEW.state='DRAFT' AND NOT report_is_open(NEW.project_id,NEW.kind) THEN RAISE EXCEPTION 'Supervisor has not opened this document'; END IF;
 IF NEW.template_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM presentation_templates WHERE id=NEW.template_id AND version=NEW.template_version AND is_active) THEN RAISE EXCEPTION 'Presentation template unavailable'; END IF;
 IF NEW.imported_file_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM files f WHERE f.id=NEW.imported_file_id AND team_member(f.uploaded_by,NEW.project_id)
  AND f.status='READY' AND f.mime_type='application/vnd.openxmlformats-officedocument.presentationml.presentation') THEN RAISE EXCEPTION 'Imported presentation must be a ready team PPTX'; END IF;
 IF NOT report_content_valid(NEW.kind,NEW.draft_content) THEN RAISE EXCEPTION 'Invalid report content'; END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER report_document_scope BEFORE INSERT OR UPDATE OR DELETE ON report_documents FOR EACH ROW EXECUTE FUNCTION report_document_guard();

CREATE FUNCTION report_version_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Report versions are immutable'; END IF;
 SELECT * INTO doc FROM report_documents WHERE id=NEW.document_id FOR UPDATE;
 IF NOT FOUND OR doc.state<>'DRAFT' OR NOT team_member(NEW.created_by,doc.project_id) OR NEW.created_by<>doc.updated_by OR
  ROW(NEW.document_revision,NEW.content,NEW.appearance,NEW.template_id,NEW.template_version,NEW.imported_file_id) IS DISTINCT FROM
  ROW(doc.revision,doc.draft_content,doc.appearance,doc.template_id,doc.template_version,doc.imported_file_id)
  OR NEW.version_number<>(SELECT COALESCE(max(version_number),0)+1 FROM report_versions WHERE document_id=doc.id) THEN RAISE EXCEPTION 'Version must snapshot the current draft'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER report_version_scope BEFORE INSERT OR UPDATE OR DELETE ON report_versions FOR EACH ROW EXECUTE FUNCTION report_version_guard();
CREATE FUNCTION snapshot_report_draft() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NEW.state='DRAFT' AND team_member(NEW.updated_by,NEW.project_id) AND NEW.deleted_at IS NULL THEN
  INSERT INTO report_versions(document_id,version_number,document_revision,content,appearance,template_id,template_version,imported_file_id,created_by,created_at)
  SELECT NEW.id,COALESCE(max(version_number),0)+1,NEW.revision,NEW.draft_content,NEW.appearance,NEW.template_id,NEW.template_version,NEW.imported_file_id,NEW.updated_by,NEW.updated_at
  FROM report_versions WHERE document_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER report_draft_snapshot AFTER INSERT OR UPDATE ON report_documents FOR EACH ROW EXECUTE FUNCTION snapshot_report_draft();

CREATE FUNCTION report_file_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;asset files%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Version assets are immutable'; END IF;
 SELECT d.* INTO doc FROM report_documents d JOIN report_versions v ON v.document_id=d.id WHERE v.id=NEW.version_id FOR UPDATE OF d;
 IF NOT FOUND OR doc.state<>'DRAFT' OR NOT report_student_can_write(NEW.attached_by,doc.project_id)
  OR EXISTS(SELECT 1 FROM report_submissions WHERE version_id=NEW.version_id) THEN RAISE EXCEPTION 'Assets require an unsubmitted team draft version'; END IF;
 SELECT * INTO asset FROM files WHERE id=NEW.file_id;
 IF NOT FOUND OR asset.status<>'READY' OR asset.sha256 IS NULL OR NOT team_member(asset.uploaded_by,doc.project_id) THEN RAISE EXCEPTION 'Asset must be a ready hashed team file'; END IF;
 IF NEW.purpose IN ('IMAGE','BACKGROUND') AND asset.mime_type NOT LIKE 'image/%' OR
    NEW.purpose='PDF_EXPORT' AND asset.mime_type<>'application/pdf' OR
    NEW.purpose IN ('PPTX_SOURCE','PPTX_EXPORT') AND (doc.kind<>'PRESENTATION' OR asset.mime_type<>'application/vnd.openxmlformats-officedocument.presentationml.presentation') THEN RAISE EXCEPTION 'Asset type does not match purpose'; END IF;
 NEW.storage_key=asset.storage_key;NEW.original_name=asset.original_name;NEW.mime_type=asset.mime_type;NEW.byte_size=asset.byte_size;NEW.sha256=asset.sha256;
 RETURN NEW;
END $$;
CREATE TRIGGER report_asset_scope BEFORE INSERT OR UPDATE OR DELETE ON report_version_files FOR EACH ROW EXECUTE FUNCTION report_file_guard();

CREATE FUNCTION report_submission_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;version report_versions%ROWTYPE;period reporting_periods%ROWTYPE;prior_late BOOLEAN;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Submission history cannot be deleted'; END IF;
 SELECT * INTO doc FROM report_documents WHERE id=NEW.document_id FOR UPDATE;
 IF TG_OP='INSERT' THEN
  IF NOT FOUND OR NOT report_student_can_write(NEW.submitted_by,doc.project_id) OR doc.state<>'DRAFT' OR doc.deleted_at IS NOT NULL OR NEW.state<>'SUBMITTED' THEN RAISE EXCEPTION 'Submission requires an editable team draft'; END IF;
  SELECT * INTO version FROM report_versions WHERE id=NEW.version_id AND document_id=doc.id;
  IF NOT FOUND OR version.document_revision<>doc.revision OR NOT report_content_valid(doc.kind,version.content,true) THEN RAISE EXCEPTION 'Submission requires the latest complete draft snapshot'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_path_query(version.content,'$.**.file_id') ref WHERE NOT EXISTS(
   SELECT 1 FROM report_version_files a WHERE a.version_id=version.id AND a.file_id=(ref #>> '{}')::uuid))
   OR version.imported_file_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM report_version_files WHERE version_id=version.id AND file_id=version.imported_file_id AND purpose='PPTX_SOURCE') THEN RAISE EXCEPTION 'Report content references an unattached file'; END IF;
  NEW.submitted_at=clock_timestamp();NEW.is_late=false;
  IF doc.kind='WEEKLY' THEN
   SELECT * INTO period FROM reporting_periods WHERE id=doc.period_id;
   SELECT is_late INTO prior_late FROM report_submissions WHERE document_id=doc.id AND state='SUPERSEDED' AND change_reason='STUDENT_EDIT' ORDER BY submitted_at LIMIT 1;
   IF NOT FOUND AND (NEW.submitted_at<period.opens_at OR NEW.submitted_at>period.late_until) THEN RAISE EXCEPTION 'Weekly submission window is closed'; END IF;
   NEW.is_late=COALESCE(prior_late,NEW.submitted_at>period.due_at);
  ELSIF NOT report_is_open(doc.project_id,doc.kind) THEN RAISE EXCEPTION 'Final or presentation submission window is closed'; END IF;
  NEW.changed_by=NEW.submitted_by;NEW.changed_at=NULL;NEW.change_reason=NULL;NEW.first_viewed_at=NULL;NEW.first_viewed_by=NULL;
 ELSE
  IF ROW(NEW.id,NEW.seed_key,NEW.document_id,NEW.version_id,NEW.request_key,NEW.request_payload,NEW.submitted_by,NEW.submitted_at,NEW.is_late,NEW.student_note) IS DISTINCT FROM
     ROW(OLD.id,OLD.seed_key,OLD.document_id,OLD.version_id,OLD.request_key,OLD.request_payload,OLD.submitted_by,OLD.submitted_at,OLD.is_late,OLD.student_note) THEN RAISE EXCEPTION 'Submitted content is immutable'; END IF;
  IF OLD.state<>'SUBMITTED' THEN RAISE EXCEPTION 'Previous submissions are read only'; END IF;
  IF NEW.state=OLD.state THEN
   IF NOT project_supervisor(NEW.changed_by,doc.project_id) OR OLD.first_viewed_at IS NOT NULL OR NEW.first_viewed_at IS NULL OR NEW.first_viewed_by<>NEW.changed_by
    OR ROW(NEW.changed_at,NEW.change_reason) IS DISTINCT FROM ROW(OLD.changed_at,OLD.change_reason) THEN RAISE EXCEPTION 'Invalid submission read marker'; END IF;
   NEW.first_viewed_at=clock_timestamp();
  ELSE
   IF NOT report_student_can_write(NEW.changed_by,doc.project_id) OR ROW(NEW.first_viewed_at,NEW.first_viewed_by) IS DISTINCT FROM ROW(OLD.first_viewed_at,OLD.first_viewed_by) THEN RAISE EXCEPTION 'Only a teammate may revise or withdraw'; END IF;
   IF NEW.state='WITHDRAWN' THEN
    IF doc.kind<>'WEEKLY' OR OLD.first_viewed_at IS NOT NULL OR NEW.change_reason<>'WITHDRAWAL' THEN RAISE EXCEPTION 'Only an unseen weekly report may be withdrawn'; END IF;
   ELSIF NEW.state='SUPERSEDED' AND NEW.change_reason='STUDENT_EDIT' THEN
    IF doc.kind<>'WEEKLY' OR EXISTS(SELECT 1 FROM report_feedback WHERE submission_id=OLD.id AND kind='REVIEW') THEN RAISE EXCEPTION 'Reviewed weekly reports cannot be revised'; END IF;
   ELSIF NEW.state='SUPERSEDED' AND NEW.change_reason='RESUBMISSION' THEN
    IF doc.kind='WEEKLY' OR doc.state<>'DRAFT' OR NOT report_is_open(doc.project_id,doc.kind) THEN RAISE EXCEPTION 'Supervisor reopening required'; END IF;
   ELSE RAISE EXCEPTION 'Invalid submission transition'; END IF;
   NEW.changed_at=clock_timestamp();
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER report_submission_scope BEFORE INSERT OR UPDATE OR DELETE ON report_submissions FOR EACH ROW EXECUTE FUNCTION report_submission_guard();
CREATE FUNCTION lock_submitted_report() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN UPDATE report_documents SET state='SUBMITTED',updated_by=NEW.submitted_by WHERE id=NEW.document_id;RETURN NEW;END $$;
CREATE TRIGGER report_submission_lock AFTER INSERT ON report_submissions FOR EACH ROW EXECUTE FUNCTION lock_submitted_report();

CREATE FUNCTION report_feedback_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;submission report_submissions%ROWTYPE;version report_versions%ROWTYPE;read_only_change BOOLEAN;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Feedback history cannot be deleted'; END IF;
 SELECT d.* INTO doc FROM report_documents d JOIN report_submissions s ON s.document_id=d.id WHERE s.id=NEW.submission_id FOR UPDATE OF d;
 SELECT * INTO submission FROM report_submissions WHERE id=NEW.submission_id;
 SELECT * INTO version FROM report_versions WHERE id=submission.version_id;
 IF EXISTS(SELECT 1 FROM projects WHERE id=doc.project_id AND status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'Completed project reports are read only'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.submission_id,NEW.request_key,NEW.request_payload,NEW.kind,NEW.created_by,NEW.created_at) IS DISTINCT FROM
     ROW(OLD.id,OLD.submission_id,OLD.request_key,OLD.request_payload,OLD.kind,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Feedback identity is immutable'; END IF;
  read_only_change=ROW(NEW.body,NEW.decision,NEW.section_id,NEW.page_number,NEW.slide_id,NEW.updated_by,NEW.revision) IS NOT DISTINCT FROM
                   ROW(OLD.body,OLD.decision,OLD.section_id,OLD.page_number,OLD.slide_id,OLD.updated_by,OLD.revision);
  IF read_only_change AND OLD.seen_by_student_at IS NULL AND NEW.seen_by_student_at IS NOT NULL AND team_member(NEW.seen_by_student_id,doc.project_id) THEN
   NEW.seen_by_student_at=clock_timestamp();NEW.updated_at=OLD.updated_at;RETURN NEW;
  END IF;
  IF OLD.seen_by_student_at IS NOT NULL THEN RAISE EXCEPTION 'Feedback already read by a student'; END IF;
  IF ROW(NEW.seen_by_student_id,NEW.seen_by_student_at) IS DISTINCT FROM ROW(OLD.seen_by_student_id,OLD.seen_by_student_at) OR NEW.updated_by<>OLD.created_by THEN RAISE EXCEPTION 'Only feedback author may edit unread feedback'; END IF;
  NEW.revision=OLD.revision+1;
 ELSE
  IF NEW.created_by<>NEW.updated_by OR NEW.revision<>0 OR NEW.seen_by_student_at IS NOT NULL THEN RAISE EXCEPTION 'Invalid new feedback'; END IF;
  NEW.created_at=clock_timestamp();
 END IF;
 IF submission.state<>'SUBMITTED' OR NOT project_supervisor(NEW.updated_by,doc.project_id) OR submission.first_viewed_at IS NULL THEN RAISE EXCEPTION 'Project supervisor must open the current submission first'; END IF;
 IF NEW.decision='APPROVED' AND doc.kind='WEEKLY' THEN RAISE EXCEPTION 'Weekly reports use feedback, not final approval'; END IF;
 IF NEW.slide_id IS NOT NULL AND (doc.kind<>'PRESENTATION' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(version.content->'slides') s WHERE s->>'id'=NEW.slide_id)) THEN RAISE EXCEPTION 'Slide is not in the submitted version'; END IF;
 IF NEW.section_id IS NOT NULL AND (doc.kind<>'FINAL' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(version.content->'sections') s WHERE s->>'id'=NEW.section_id)) THEN RAISE EXCEPTION 'Section is not in the submitted version'; END IF;
 IF NEW.page_number IS NOT NULL AND doc.kind='PRESENTATION' THEN RAISE EXCEPTION 'Presentation comments target a slide'; END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER report_feedback_scope BEFORE INSERT OR UPDATE OR DELETE ON report_feedback FOR EACH ROW EXECUTE FUNCTION report_feedback_guard();

CREATE FUNCTION report_check_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE project UUID;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Report check history cannot be deleted'; END IF;
 SELECT d.project_id INTO project FROM report_documents d JOIN report_versions v ON v.document_id=d.id WHERE v.id=NEW.version_id;
 IF NOT team_member(NEW.requested_by,project) THEN RAISE EXCEPTION 'Report check requester must be a teammate'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.status<>'PENDING' OR NEW.status='PENDING' OR ROW(NEW.id,NEW.version_id,NEW.requested_by,NEW.kind,NEW.engine,NEW.model,NEW.created_at) IS DISTINCT FROM
   ROW(OLD.id,OLD.version_id,OLD.requested_by,OLD.kind,OLD.engine,OLD.model,OLD.created_at) THEN RAISE EXCEPTION 'Report check result is immutable'; END IF;
  NEW.finished_at=clock_timestamp();
 ELSE
  IF NEW.status<>'PENDING' THEN RAISE EXCEPTION 'Report check starts pending'; END IF;
  NEW.created_at=clock_timestamp();
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER report_check_scope BEFORE INSERT OR UPDATE OR DELETE ON report_check_runs FOR EACH ROW EXECUTE FUNCTION report_check_guard();

CREATE FUNCTION create_report_document(actor UUID,project UUID,report_kind TEXT,period UUID DEFAULT NULL,content JSONB DEFAULT '{}',template TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE existing UUID;document UUID;
BEGIN
 IF NOT report_student_can_write(actor,project) THEN RAISE EXCEPTION 'Current teammate required'; END IF;
 -- Serialize creation only within a project; the unique indexes remain the final invariant.
 PERFORM 1 FROM projects WHERE id=project FOR UPDATE;
 SELECT id INTO existing FROM report_documents WHERE project_id=project AND kind=report_kind AND period_id IS NOT DISTINCT FROM period;
 IF FOUND THEN RETURN existing; END IF;
 INSERT INTO report_documents(project_id,kind,period_id,draft_content,template_id,template_version,created_by,updated_by)
 VALUES(project,report_kind,period,content,template,CASE WHEN template IS NOT NULL THEN 1 END,actor,actor) RETURNING id INTO document;
 RETURN document;
END $$;
CREATE FUNCTION save_report_draft(actor UUID,document UUID,expected_revision INT,content JSONB,style JSONB DEFAULT '{}',template TEXT DEFAULT NULL,template_revision INT DEFAULT NULL,imported UUID DEFAULT NULL,assets JSONB DEFAULT '[]')
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;version UUID;asset JSONB;
BEGIN
 SELECT * INTO doc FROM report_documents WHERE id=document FOR UPDATE;
 IF NOT FOUND OR NOT report_student_can_write(actor,doc.project_id) THEN RAISE EXCEPTION 'Current teammate required'; END IF;
 IF expected_revision IS NULL OR expected_revision<>doc.revision THEN RAISE EXCEPTION 'Report revision conflict'; END IF;
 IF doc.state<>'DRAFT' THEN RAISE EXCEPTION 'Submitted document is locked'; END IF;
 IF jsonb_typeof(assets) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Assets must be an array'; END IF;
 UPDATE report_documents SET draft_content=content,appearance=style,template_id=template,template_version=template_revision,imported_file_id=imported,updated_by=actor,deleted_at=NULL WHERE id=document RETURNING * INTO doc;
 SELECT id INTO version FROM report_versions WHERE document_id=document AND document_revision=doc.revision;
 FOR asset IN SELECT value FROM jsonb_array_elements(assets) LOOP
  INSERT INTO report_version_files(version_id,file_id,purpose,content_key,attached_by,storage_key,original_name,mime_type,byte_size,sha256)
  VALUES(version,(asset->>'file_id')::uuid,asset->>'purpose',COALESCE(asset->>'content_key',''),actor,'','','',0,repeat('0',64));
 END LOOP;
 RETURN version;
END $$;
CREATE FUNCTION set_report_window(actor UUID,project UUID,report_kind TEXT,expected_revision INT,opened BOOLEAN,deadline TIMESTAMPTZ DEFAULT NULL)
RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current_revision INT;
BEGIN
 IF NOT project_supervisor(actor,project) THEN RAISE EXCEPTION 'Project supervisor required'; END IF;
 PERFORM 1 FROM projects WHERE id=project FOR UPDATE;
 -- Serialize closing a window with saves, reopening and submission of its workspace.
 PERFORM 1 FROM report_documents WHERE project_id=project AND kind=report_kind ORDER BY id FOR UPDATE;
 SELECT revision INTO current_revision FROM report_submission_windows WHERE project_id=project AND kind=report_kind FOR UPDATE;
 IF NOT FOUND THEN
  IF expected_revision IS DISTINCT FROM -1 THEN RAISE EXCEPTION 'Window revision conflict'; END IF;
  INSERT INTO report_submission_windows(project_id,kind,is_open,closes_at,updated_by) VALUES(project,report_kind,opened,deadline,actor) RETURNING revision INTO current_revision;
 ELSE
  IF expected_revision IS NULL OR expected_revision<>current_revision THEN RAISE EXCEPTION 'Window revision conflict'; END IF;
  UPDATE report_submission_windows SET is_open=opened,closes_at=deadline,updated_by=actor WHERE project_id=project AND kind=report_kind RETURNING revision INTO current_revision;
 END IF;
 RETURN current_revision;
END $$;
CREATE FUNCTION submit_report(actor UUID,document UUID,expected_revision INT,idempotency_key UUID,note TEXT DEFAULT '')
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;existing report_submissions%ROWTYPE;payload JSONB;version UUID;previous_version UUID;submission UUID;
BEGIN
 SELECT * INTO doc FROM report_documents WHERE id=document FOR UPDATE;
 IF NOT FOUND OR NOT report_student_can_write(actor,doc.project_id) THEN RAISE EXCEPTION 'Current teammate required'; END IF;
 payload=jsonb_build_object('actor',actor,'revision',expected_revision,'note',COALESCE(note,''));
 SELECT * INTO existing FROM report_submissions WHERE document_id=document AND request_key=idempotency_key;
 IF FOUND THEN
  IF existing.request_payload<>payload THEN RAISE EXCEPTION 'Submission key reused with different data'; END IF;
  RETURN existing.id;
 END IF;
 IF expected_revision IS NULL OR expected_revision<>doc.revision THEN RAISE EXCEPTION 'Report revision conflict'; END IF;
 IF doc.state<>'DRAFT' THEN RAISE EXCEPTION 'Submitted document is locked'; END IF;
 SELECT id INTO version FROM report_versions WHERE document_id=document AND document_revision=doc.revision;
 IF NOT FOUND THEN
  -- Reopening changes the document revision but never the submitted snapshot.
  SELECT id INTO previous_version FROM report_versions WHERE document_id=document ORDER BY version_number DESC LIMIT 1;
  UPDATE report_documents SET updated_by=actor WHERE id=document RETURNING * INTO doc;
  SELECT id INTO version FROM report_versions WHERE document_id=document AND document_revision=doc.revision;
  INSERT INTO report_version_files(version_id,file_id,purpose,content_key,attached_by)
   SELECT version,file_id,purpose,content_key,actor FROM report_version_files WHERE version_id=previous_version;
 END IF;
 UPDATE report_submissions SET state='SUPERSEDED',change_reason='RESUBMISSION',changed_by=actor WHERE document_id=document AND state='SUBMITTED';
 INSERT INTO report_submissions(document_id,version_id,request_key,request_payload,submitted_by,changed_by,student_note)
 VALUES(document,version,idempotency_key,payload,actor,actor,COALESCE(note,'')) RETURNING id INTO submission;
 RETURN submission;
END $$;
CREATE FUNCTION open_report_submission(actor UUID,submission UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;item report_submissions%ROWTYPE;content JSONB;
BEGIN
 SELECT d.* INTO doc FROM report_documents d JOIN report_submissions s ON s.document_id=d.id WHERE s.id=submission FOR UPDATE OF d;
 IF NOT FOUND OR NOT (team_member(actor,doc.project_id) OR project_supervisor(actor,doc.project_id)) THEN RAISE EXCEPTION 'Project report access denied'; END IF;
 SELECT * INTO item FROM report_submissions WHERE id=submission;
 IF item.state='WITHDRAWN' THEN RAISE EXCEPTION 'Submission was withdrawn'; END IF;
 IF project_supervisor(actor,doc.project_id) AND item.state='SUBMITTED' AND item.first_viewed_at IS NULL THEN
  UPDATE report_submissions SET first_viewed_by=actor,first_viewed_at=clock_timestamp(),changed_by=actor WHERE id=submission;
 END IF;
 SELECT v.content INTO content FROM report_versions v WHERE v.id=item.version_id;
 RETURN content;
END $$;
CREATE FUNCTION read_report_draft(actor UUID,document UUID) RETURNS JSONB LANGUAGE plpgsql STABLE SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;
BEGIN
 SELECT * INTO doc FROM report_documents WHERE id=document;
 IF NOT FOUND OR NOT team_member(actor,doc.project_id) THEN RAISE EXCEPTION 'Draft is private to the team'; END IF;
 RETURN doc.draft_content;
END $$;
CREATE FUNCTION revise_weekly_report(actor UUID,submission UUID,expected_revision INT,withdraw BOOLEAN DEFAULT false,discard BOOLEAN DEFAULT false)
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;item report_submissions%ROWTYPE;
BEGIN
 SELECT d.* INTO doc FROM report_documents d JOIN report_submissions s ON s.document_id=d.id WHERE s.id=submission FOR UPDATE OF d;
 IF NOT FOUND OR NOT report_student_can_write(actor,doc.project_id) OR doc.kind<>'WEEKLY' THEN RAISE EXCEPTION 'Weekly teammate revision required'; END IF;
 IF expected_revision IS NULL OR expected_revision<>doc.revision THEN RAISE EXCEPTION 'Report revision conflict'; END IF;
 SELECT * INTO item FROM report_submissions WHERE id=submission;
 IF item.state<>'SUBMITTED' OR EXISTS(SELECT 1 FROM report_feedback WHERE submission_id=submission AND kind='REVIEW') THEN RAISE EXCEPTION 'Reviewed weekly reports cannot be revised'; END IF;
 IF discard AND NOT withdraw THEN RAISE EXCEPTION 'Discard requires withdrawal'; END IF;
 UPDATE report_submissions SET state=CASE WHEN withdraw THEN 'WITHDRAWN' ELSE 'SUPERSEDED' END,changed_by=actor,
  change_reason=CASE WHEN withdraw THEN 'WITHDRAWAL' ELSE 'STUDENT_EDIT' END WHERE id=submission;
 UPDATE report_documents SET state='DRAFT',updated_by=actor,deleted_at=CASE WHEN discard THEN clock_timestamp() END WHERE id=doc.id;
 RETURN doc.id;
END $$;
CREATE FUNCTION reopen_report(actor UUID,document UUID,expected_revision INT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;
BEGIN
 SELECT * INTO doc FROM report_documents WHERE id=document FOR UPDATE;
 IF NOT FOUND OR NOT project_supervisor(actor,doc.project_id) OR doc.kind='WEEKLY' THEN RAISE EXCEPTION 'Project supervisor reopening required'; END IF;
 IF expected_revision IS NULL OR expected_revision<>doc.revision THEN RAISE EXCEPTION 'Report revision conflict'; END IF;
 IF doc.state<>'SUBMITTED' THEN RAISE EXCEPTION 'Only submitted documents need reopening'; END IF;
 UPDATE report_documents SET state='DRAFT',updated_by=actor WHERE id=document RETURNING revision INTO expected_revision;
 RETURN expected_revision;
END $$;
CREATE FUNCTION add_report_feedback(actor UUID,submission UUID,idempotency_key UUID,feedback_kind TEXT,text_body TEXT,review_decision TEXT DEFAULT NULL,section TEXT DEFAULT NULL,page INT DEFAULT NULL,slide TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;existing report_feedback%ROWTYPE;payload JSONB;feedback UUID;
BEGIN
 SELECT d.* INTO doc FROM report_documents d JOIN report_submissions s ON s.document_id=d.id WHERE s.id=submission FOR UPDATE OF d;
 IF NOT FOUND OR NOT project_supervisor(actor,doc.project_id) THEN RAISE EXCEPTION 'Project supervisor required'; END IF;
 payload=jsonb_build_object('actor',actor,'kind',feedback_kind,'body',text_body,'decision',review_decision,'section',section,'page',page,'slide',slide);
 SELECT * INTO existing FROM report_feedback WHERE submission_id=submission AND request_key=idempotency_key;
 IF FOUND THEN
  IF existing.request_payload<>payload THEN RAISE EXCEPTION 'Feedback key reused with different data'; END IF;
  RETURN existing.id;
 END IF;
 PERFORM open_report_submission(actor,submission);
 INSERT INTO report_feedback(submission_id,request_key,request_payload,kind,decision,body,section_id,page_number,slide_id,created_by,updated_by)
 VALUES(submission,idempotency_key,payload,feedback_kind,review_decision,text_body,section,page,slide,actor,actor) RETURNING id INTO feedback;
 RETURN feedback;
END $$;
CREATE FUNCTION edit_report_feedback(actor UUID,feedback UUID,expected_revision INT,text_body TEXT,review_decision TEXT DEFAULT NULL)
RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE item report_feedback%ROWTYPE;document UUID;
BEGIN
 SELECT s.document_id INTO document FROM report_feedback f JOIN report_submissions s ON s.id=f.submission_id WHERE f.id=feedback;
 PERFORM 1 FROM report_documents WHERE id=document FOR UPDATE;
 SELECT * INTO item FROM report_feedback WHERE id=feedback FOR UPDATE;
 IF NOT FOUND OR actor<>item.created_by THEN RAISE EXCEPTION 'Only feedback author may edit'; END IF;
 IF expected_revision IS NULL OR expected_revision<>item.revision THEN RAISE EXCEPTION 'Feedback revision conflict'; END IF;
 UPDATE report_feedback SET body=text_body,decision=review_decision,updated_by=actor WHERE id=feedback RETURNING revision INTO expected_revision;
 RETURN expected_revision;
END $$;
CREATE FUNCTION acknowledge_report_feedback(actor UUID,submission UUID) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE project UUID;document UUID;changed INT;
BEGIN
 SELECT d.project_id,d.id INTO project,document FROM report_documents d JOIN report_submissions s ON s.document_id=d.id WHERE s.id=submission;
 IF NOT FOUND OR NOT team_member(actor,project) THEN RAISE EXCEPTION 'Current teammate required'; END IF;
 PERFORM 1 FROM report_documents WHERE id=document FOR UPDATE;
 UPDATE report_feedback SET seen_by_student_id=actor,seen_by_student_at=clock_timestamp() WHERE submission_id=submission AND seen_by_student_at IS NULL;
 GET DIAGNOSTICS changed=ROW_COUNT;RETURN changed;
END $$;
CREATE FUNCTION discard_report_draft(actor UUID,document UUID,expected_revision INT) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;
BEGIN
 SELECT * INTO doc FROM report_documents WHERE id=document FOR UPDATE;
 IF NOT FOUND OR NOT report_student_can_write(actor,doc.project_id) THEN RAISE EXCEPTION 'Current teammate required'; END IF;
 IF expected_revision IS NULL OR expected_revision<>doc.revision THEN RAISE EXCEPTION 'Report revision conflict'; END IF;
 IF doc.state<>'DRAFT' THEN RAISE EXCEPTION 'Submitted document is locked'; END IF;
 IF EXISTS(SELECT 1 FROM report_submissions WHERE document_id=document AND first_viewed_at IS NOT NULL) THEN RAISE EXCEPTION 'A viewed submission cannot be discarded'; END IF;
 UPDATE report_documents SET deleted_at=clock_timestamp(),updated_by=actor WHERE id=document;
 RETURN document;
END $$;

CREATE VIEW project_report_status AS
 SELECT d.id AS document_id,d.project_id,d.kind,d.period_id,d.revision,d.deleted_at,
 CASE WHEN d.state='DRAFT' THEN 'DRAFT'
  WHEN EXISTS(SELECT 1 FROM report_feedback f WHERE f.submission_id=s.id AND f.decision='APPROVED') THEN 'APPROVED'
  WHEN EXISTS(SELECT 1 FROM report_feedback f WHERE f.submission_id=s.id AND f.decision='NEEDS_CHANGES') THEN 'NEEDS_CHANGES'
  WHEN EXISTS(SELECT 1 FROM report_feedback f WHERE f.submission_id=s.id AND f.kind='REVIEW') THEN 'REVIEWED'
  ELSE 'SUBMITTED' END AS status,s.id AS submission_id,s.version_id,s.submitted_at,s.is_late,s.first_viewed_at
 FROM report_documents d LEFT JOIN report_submissions s ON s.document_id=d.id AND s.state='SUBMITTED';
CREATE VIEW project_saved_report_drafts AS SELECT d.* FROM report_documents d WHERE state='DRAFT' AND deleted_at IS NULL;
COMMENT ON VIEW project_report_status IS 'Backend scopes reads by authenticated project membership. One project supervisor approval is sufficient; checks never grant approval.';

CREATE FUNCTION log_report_change() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE actor UUID;subject UUID;
BEGIN
 IF TG_TABLE_NAME='report_documents' THEN actor=NEW.updated_by;subject=NEW.id;
 ELSIF TG_TABLE_NAME='report_submission_windows' THEN actor=NEW.updated_by;subject=NEW.project_id;
 ELSIF TG_TABLE_NAME='report_submissions' THEN actor=NEW.changed_by;subject=NEW.id;
 ELSE actor=NEW.updated_by;subject=NEW.id; END IF;
 INSERT INTO audit_events(actor_id,event_key,subject_id,payload) VALUES(actor,TG_TABLE_NAME||'_'||TG_OP,subject,
 jsonb_build_object('revision',to_jsonb(NEW)->'revision','state',to_jsonb(NEW)->'state'));
 RETURN NEW;
END $$;
DO $$ DECLARE table_name TEXT; BEGIN
 FOREACH table_name IN ARRAY ARRAY['report_documents','report_submission_windows','report_submissions','report_feedback'] LOOP
  EXECUTE format('CREATE TRIGGER report_audit AFTER INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION log_report_change()',table_name);
 END LOOP;
END $$;
REVOKE ALL ON reporting_periods,presentation_templates,report_submission_windows,report_documents,report_versions,report_version_files,report_submissions,report_feedback,report_check_runs,project_report_status,project_saved_report_drafts FROM PUBLIC;
-- No direct SQL credentials belong in clients. Grant only approved operations to backend roles.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
CREATE FUNCTION presentation_template_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Published template versions cannot be deleted'; END IF;
 IF ROW(NEW.id,NEW.version,NEW.name,NEW.category,NEW.design) IS DISTINCT FROM ROW(OLD.id,OLD.version,OLD.name,OLD.category,OLD.design)
 THEN RAISE EXCEPTION 'Template design is immutable; create a new version'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER presentation_template_history BEFORE UPDATE OR DELETE ON presentation_templates FOR EACH ROW EXECUTE FUNCTION presentation_template_guard();
REVOKE ALL ON FUNCTION presentation_template_guard() FROM PUBLIC;
COMMIT;

-- Source: communication-stage5/sql/13-communication-schema.sql
-- PostgreSQL 17. Apply after reports Stage 4. Actor arguments belong to the trusted backend.
BEGIN;
SET search_path=labassist_student,public;

CREATE TABLE conversations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,
 kind TEXT NOT NULL CHECK(kind IN ('SELF','DIRECT','PROJECT')),
 project_id UUID UNIQUE REFERENCES projects(id),owner_id UUID UNIQUE REFERENCES accounts(id),
 peer_low UUID REFERENCES accounts(id),peer_high UUID REFERENCES accounts(id),
 name TEXT NOT NULL DEFAULT '' CHECK(length(name)<=220),photo_file_id UUID REFERENCES files(id),
 created_by UUID NOT NULL REFERENCES accounts(id),revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((kind='PROJECT')=(project_id IS NOT NULL)),CHECK((kind='SELF')=(owner_id IS NOT NULL)),
 CHECK((kind='DIRECT')=(peer_low IS NOT NULL AND peer_high IS NOT NULL)),
 CHECK(kind='DIRECT' OR (peer_low IS NULL AND peer_high IS NULL)),
 CHECK(peer_low IS NULL OR peer_low<peer_high),
 CHECK(kind='PROJECT' OR (name='' AND photo_file_id IS NULL)),UNIQUE(peer_low,peer_high)
);
CREATE TABLE conversation_members (
 conversation_id UUID NOT NULL REFERENCES conversations(id),account_id UUID NOT NULL REFERENCES accounts(id),
 active BOOLEAN NOT NULL DEFAULT true,starred BOOLEAN NOT NULL DEFAULT false,muted BOOLEAN NOT NULL DEFAULT false,
 last_read_sequence BIGINT NOT NULL DEFAULT 0 CHECK(last_read_sequence>=0),
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(conversation_id,account_id)
);
CREATE TABLE chat_messages (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
 conversation_id UUID NOT NULL REFERENCES conversations(id),sender_id UUID NOT NULL REFERENCES accounts(id),
 request_key UUID NOT NULL,request_payload JSONB NOT NULL CHECK(jsonb_typeof(request_payload)='object'),
 body TEXT NOT NULL DEFAULT '' CHECK(length(body)<=30000),reply_to UUID,forward_from UUID REFERENCES chat_messages(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),created_txid BIGINT NOT NULL DEFAULT txid_current(),UNIQUE(sender_id,request_key),UNIQUE(id,conversation_id),
 FOREIGN KEY(reply_to,conversation_id) REFERENCES chat_messages(id,conversation_id)
);
CREATE TABLE chat_message_files (
 message_id UUID NOT NULL REFERENCES chat_messages(id),file_id UUID NOT NULL REFERENCES files(id),
 storage_key TEXT NOT NULL,original_name TEXT NOT NULL,mime_type TEXT NOT NULL,byte_size BIGINT NOT NULL,
 sha256 CHAR(64) NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),PRIMARY KEY(message_id,file_id)
);
CREATE TABLE chat_message_links (
 message_id UUID NOT NULL REFERENCES chat_messages(id),url TEXT NOT NULL CHECK(url ~ '^https?://[^[:space:]]+$' AND length(url)<=2048),
 label TEXT NOT NULL DEFAULT '' CHECK(length(label)<=240),PRIMARY KEY(message_id,url)
);
CREATE TABLE chat_message_stars (
 message_id UUID NOT NULL REFERENCES chat_messages(id),account_id UUID NOT NULL REFERENCES accounts(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(message_id,account_id)
);
CREATE TABLE meetings (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,organizer_id UUID NOT NULL REFERENCES accounts(id),
 project_id UUID REFERENCES projects(id),conversation_id UUID REFERENCES conversations(id),
 request_key UUID NOT NULL,request_payload JSONB NOT NULL CHECK(jsonb_typeof(request_payload)='object'),
 title TEXT NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 220),agenda TEXT NOT NULL DEFAULT '',
 starts_at TIMESTAMPTZ NOT NULL,ends_at TIMESTAMPTZ NOT NULL CHECK(ends_at>starts_at),
 location TEXT NOT NULL DEFAULT '',meeting_url TEXT CHECK(meeting_url IS NULL OR meeting_url ~ '^https://[^[:space:]]+$'),
 status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED','COMPLETED','CANCELLED')),
 notes TEXT NOT NULL DEFAULT '',revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),updated_by UUID NOT NULL REFERENCES accounts(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(organizer_id,request_key)
);
CREATE TABLE meeting_participants (
 meeting_id UUID NOT NULL REFERENCES meetings(id),account_id UUID NOT NULL REFERENCES accounts(id),
 invited_by UUID NOT NULL REFERENCES accounts(id),response TEXT NOT NULL DEFAULT 'PENDING' CHECK(response IN ('PENDING','ACCEPTED','DECLINED')),
 responded_at TIMESTAMPTZ,revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(meeting_id,account_id),CHECK((response='PENDING')=(responded_at IS NULL))
);
CREATE TABLE notification_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),event_key TEXT NOT NULL UNIQUE CHECK(length(event_key) BETWEEN 1 AND 240),
 kind TEXT NOT NULL CHECK(kind IN ('MESSAGE','MEETING_INVITE','MEETING_UPDATED','MEETING_RESPONSE','REPORT_SUBMITTED','REPORT_REVIEWED','REPORT_REOPENED')),
 actor_id UUID NOT NULL REFERENCES accounts(id),message_id UUID REFERENCES chat_messages(id),meeting_id UUID REFERENCES meetings(id),
 submission_id UUID REFERENCES report_submissions(id),feedback_id UUID REFERENCES report_feedback(id),document_id UUID REFERENCES report_documents(id),
 data JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(data)='object'),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(message_id,meeting_id,submission_id,feedback_id,document_id)=1),
 CHECK((kind='MESSAGE')=(message_id IS NOT NULL)),
 CHECK((kind IN ('MEETING_INVITE','MEETING_UPDATED','MEETING_RESPONSE'))=(meeting_id IS NOT NULL)),
 CHECK((kind='REPORT_SUBMITTED')=(submission_id IS NOT NULL)),CHECK((kind='REPORT_REVIEWED')=(feedback_id IS NOT NULL)),
 CHECK((kind='REPORT_REOPENED')=(document_id IS NOT NULL))
);
CREATE TABLE notification_inbox (
 event_id UUID NOT NULL REFERENCES notification_events(id),recipient_id UUID NOT NULL REFERENCES accounts(id),
 read_at TIMESTAMPTZ,dismissed_at TIMESTAMPTZ,PRIMARY KEY(event_id,recipient_id),
 CHECK(dismissed_at IS NULL OR read_at IS NOT NULL)
);
CREATE INDEX conversation_member_account ON conversation_members(account_id,conversation_id) WHERE active;
CREATE INDEX chat_timeline ON chat_messages(conversation_id,sequence DESC);
CREATE INDEX meeting_participant_account ON meeting_participants(account_id,meeting_id);
CREATE INDEX meeting_calendar ON meetings(starts_at) WHERE status='SCHEDULED';
CREATE INDEX notification_recipient_unread ON notification_inbox(recipient_id,event_id) WHERE read_at IS NULL AND dismissed_at IS NULL;

CREATE FUNCTION communication_actor(actor UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM accounts a WHERE a.id=actor AND a.status<>'DISABLED' AND
  (a.role IN ('SUPERVISOR','WORKSHOP_MANAGER') OR a.role='STUDENT' AND EXISTS(
   SELECT 1 FROM project_students s WHERE s.student_id=a.id AND s.left_at IS NULL)))
$$;
CREATE FUNCTION conversation_access(actor UUID,conversation UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM conversations c WHERE c.id=conversation AND CASE c.kind
  WHEN 'SELF' THEN c.owner_id=actor WHEN 'DIRECT' THEN actor IN (c.peer_low,c.peer_high)
  ELSE team_member(actor,c.project_id) OR project_supervisor(actor,c.project_id) END)
$$;
CREATE FUNCTION conversation_writable(actor UUID,conversation UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT communication_actor(actor) AND conversation_access(actor,conversation) AND NOT EXISTS(
  SELECT 1 FROM conversations c JOIN projects p ON p.id=c.project_id WHERE c.id=conversation AND p.status IN ('COMPLETED','ARCHIVED'))
$$;
CREATE FUNCTION meeting_access(actor UUID,meeting UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM meetings m WHERE m.id=meeting AND (m.organizer_id=actor OR EXISTS(
  SELECT 1 FROM meeting_participants p WHERE p.meeting_id=m.id AND p.account_id=actor)))
$$;
CREATE FUNCTION communication_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Communication history is immutable'; END $$;
CREATE TRIGGER immutable_message BEFORE UPDATE OR DELETE ON chat_messages FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER immutable_message_file BEFORE UPDATE OR DELETE ON chat_message_files FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER immutable_message_link BEFORE UPDATE OR DELETE ON chat_message_links FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER immutable_notification_event BEFORE UPDATE OR DELETE ON notification_events FOR EACH ROW EXECUTE FUNCTION communication_immutable();

CREATE FUNCTION conversation_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Conversation history cannot be deleted'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.kind,NEW.project_id,NEW.owner_id,NEW.peer_low,NEW.peer_high,NEW.created_by,NEW.created_at) IS DISTINCT FROM
    ROW(OLD.id,OLD.kind,OLD.project_id,OLD.owner_id,OLD.peer_low,OLD.peer_high,OLD.created_by,OLD.created_at)
  THEN RAISE EXCEPTION 'Conversation identity is immutable'; END IF;
  NEW.revision=OLD.revision+1;NEW.updated_at=clock_timestamp();
 ELSE
  IF NEW.kind='SELF' AND NEW.created_by<>NEW.owner_id OR NEW.kind='DIRECT' AND NEW.created_by NOT IN (NEW.peer_low,NEW.peer_high)
  THEN RAISE EXCEPTION 'Conversation creator must be a participant'; END IF;
  IF NEW.kind<>'PROJECT' AND NOT communication_actor(NEW.created_by) THEN RAISE EXCEPTION 'Registered communication account required'; END IF;
  IF NEW.kind='DIRECT' AND (NOT communication_actor(NEW.peer_low) OR NOT communication_actor(NEW.peer_high)) THEN RAISE EXCEPTION 'Registered recipient required'; END IF;
  IF NEW.kind='PROJECT' AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND formed_by=NEW.created_by) THEN RAISE EXCEPTION 'Project conversation identity invalid'; END IF;
 END IF;
 IF NEW.photo_file_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM files f WHERE f.id=NEW.photo_file_id AND f.status='READY'
  AND f.mime_type LIKE 'image/%' AND conversation_access(f.uploaded_by,NEW.id)) THEN RAISE EXCEPTION 'Group photo must be a ready participant image'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER conversation_scope BEFORE INSERT OR UPDATE OR DELETE ON conversations FOR EACH ROW EXECUTE FUNCTION conversation_guard();
CREATE FUNCTION sync_project_conversation(project UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE conversation UUID;
BEGIN
 PERFORM 1 FROM projects WHERE id=project FOR UPDATE;
 INSERT INTO conversations(kind,project_id,name,created_by,created_at,updated_at)
 SELECT 'PROJECT',p.id,p.name,p.formed_by,p.created_at,p.updated_at FROM projects p WHERE p.id=project ON CONFLICT(project_id) DO NOTHING;
 SELECT id INTO conversation FROM conversations WHERE project_id=project;
 UPDATE conversation_members m SET active=false WHERE m.conversation_id=conversation AND NOT
  (team_member(m.account_id,project) OR project_supervisor(m.account_id,project));
 INSERT INTO conversation_members(conversation_id,account_id,joined_at)
 SELECT conversation,student_id,joined_at FROM project_students WHERE project_id=project AND left_at IS NULL
 UNION SELECT conversation,supervisor_id,created_at FROM project_supervisors WHERE project_id=project
 ON CONFLICT(conversation_id,account_id) DO UPDATE SET active=true WHERE NOT conversation_members.active;
 RETURN conversation;
END $$;
CREATE FUNCTION project_chat_sync_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='projects' THEN PERFORM sync_project_conversation(NEW.id);RETURN NEW; END IF;
 IF TG_OP<>'INSERT' THEN PERFORM sync_project_conversation(OLD.project_id); END IF;
 IF TG_OP<>'DELETE' AND (TG_OP='INSERT' OR NEW.project_id IS DISTINCT FROM OLD.project_id) THEN PERFORM sync_project_conversation(NEW.project_id); END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
END $$;
CREATE TRIGGER project_chat_created AFTER INSERT ON projects FOR EACH ROW EXECUTE FUNCTION project_chat_sync_trigger();
CREATE TRIGGER project_chat_students AFTER INSERT OR UPDATE OR DELETE ON project_students FOR EACH ROW EXECUTE FUNCTION project_chat_sync_trigger();
CREATE TRIGGER project_chat_supervisors AFTER INSERT OR UPDATE OR DELETE ON project_supervisors FOR EACH ROW EXECUTE FUNCTION project_chat_sync_trigger();
DO $$ DECLARE project UUID;BEGIN FOR project IN SELECT id FROM projects ORDER BY id LOOP PERFORM sync_project_conversation(project);END LOOP;END $$;

CREATE FUNCTION open_self_conversation(actor UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered communication account required'; END IF;
 PERFORM 1 FROM accounts WHERE id=actor FOR UPDATE;
 INSERT INTO conversations(kind,owner_id,created_by) VALUES('SELF',actor,actor) ON CONFLICT(owner_id) DO NOTHING;
 SELECT id INTO result FROM conversations WHERE owner_id=actor;
 INSERT INTO conversation_members(conversation_id,account_id) VALUES(result,actor) ON CONFLICT DO NOTHING;
 RETURN result;
END $$;
CREATE FUNCTION open_direct_conversation(actor UUID,peer UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;low_id UUID;high_id UUID;
BEGIN
 IF actor=peer THEN RETURN open_self_conversation(actor); END IF;
 IF NOT communication_actor(actor) OR NOT communication_actor(peer) THEN RAISE EXCEPTION 'Registered participants required'; END IF;
 low_id=least(actor,peer);high_id=greatest(actor,peer);
 PERFORM 1 FROM accounts WHERE id=low_id FOR UPDATE;
 INSERT INTO conversations(kind,peer_low,peer_high,created_by) VALUES('DIRECT',low_id,high_id,actor) ON CONFLICT(peer_low,peer_high) DO NOTHING;
 SELECT id INTO result FROM conversations WHERE peer_low=low_id AND peer_high=high_id;
 INSERT INTO conversation_members(conversation_id,account_id) VALUES(result,actor),(result,peer) ON CONFLICT DO NOTHING;
 RETURN result;
END $$;
CREATE FUNCTION update_conversation(actor UUID,conversation UUID,expected_revision INT,title TEXT,photo UUID DEFAULT NULL) RETURNS INT
LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current conversations%ROWTYPE;
BEGIN
 SELECT * INTO current FROM conversations WHERE id=conversation FOR UPDATE;
 IF NOT FOUND OR current.kind<>'PROJECT' OR NOT conversation_writable(actor,conversation) THEN RAISE EXCEPTION 'Editable project conversation required'; END IF;
 IF expected_revision IS NULL OR current.revision<>expected_revision THEN RAISE EXCEPTION 'Conversation revision conflict'; END IF;
 IF length(btrim(title))=0 THEN RAISE EXCEPTION 'Group name required'; END IF;
 UPDATE conversations SET name=title,photo_file_id=photo WHERE id=conversation RETURNING revision INTO expected_revision;
 RETURN expected_revision;
END $$;
CREATE FUNCTION update_conversation_preferences(actor UUID,conversation UUID,expected_revision INT,is_starred BOOLEAN,is_muted BOOLEAN) RETURNS INT
LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current_revision INT;
BEGIN
 IF NOT communication_actor(actor) OR NOT conversation_access(actor,conversation) THEN RAISE EXCEPTION 'Conversation access denied'; END IF;
 SELECT revision INTO current_revision FROM conversation_members WHERE conversation_id=conversation AND account_id=actor AND active FOR UPDATE;
 IF NOT FOUND OR expected_revision IS NULL OR current_revision<>expected_revision THEN RAISE EXCEPTION 'Member revision conflict'; END IF;
 UPDATE conversation_members SET starred=is_starred,muted=is_muted,revision=revision+1 WHERE conversation_id=conversation AND account_id=actor RETURNING revision INTO current_revision;
 RETURN current_revision;
END $$;

CREATE FUNCTION chat_message_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT conversation_writable(NEW.sender_id,NEW.conversation_id) THEN RAISE EXCEPTION 'Writable conversation membership required'; END IF;
 IF NEW.forward_from IS NOT NULL AND NOT EXISTS(SELECT 1 FROM chat_messages m WHERE m.id=NEW.forward_from AND conversation_access(NEW.sender_id,m.conversation_id))
 THEN RAISE EXCEPTION 'Forward source access denied'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER message_scope BEFORE INSERT ON chat_messages FOR EACH ROW EXECUTE FUNCTION chat_message_guard();
CREATE FUNCTION chat_file_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE message chat_messages%ROWTYPE;asset files%ROWTYPE;forward_asset chat_message_files%ROWTYPE;
BEGIN
 SELECT * INTO message FROM chat_messages WHERE id=NEW.message_id;
 IF message.created_txid<>txid_current() THEN RAISE EXCEPTION 'Message attachments must be frozen in the send transaction'; END IF;
 SELECT * INTO asset FROM files WHERE id=NEW.file_id;
 IF NOT FOUND OR asset.status<>'READY' OR asset.sha256 IS NULL THEN RAISE EXCEPTION 'Ready hashed attachment required'; END IF;
 IF message.forward_from IS NOT NULL THEN
  SELECT * INTO forward_asset FROM chat_message_files WHERE message_id=message.forward_from AND file_id=NEW.file_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attachment not present in forward source'; END IF;
  NEW.storage_key=forward_asset.storage_key;NEW.original_name=forward_asset.original_name;NEW.mime_type=forward_asset.mime_type;NEW.byte_size=forward_asset.byte_size;NEW.sha256=forward_asset.sha256;
 ELSE
  IF asset.uploaded_by<>message.sender_id THEN RAISE EXCEPTION 'Attachment must belong to sender'; END IF;
  NEW.storage_key=asset.storage_key;NEW.original_name=asset.original_name;NEW.mime_type=asset.mime_type;NEW.byte_size=asset.byte_size;NEW.sha256=asset.sha256;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER message_file_scope BEFORE INSERT ON chat_message_files FOR EACH ROW EXECUTE FUNCTION chat_file_guard();
CREATE FUNCTION chat_link_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE message chat_messages%ROWTYPE;
BEGIN
 SELECT * INTO message FROM chat_messages WHERE id=NEW.message_id;
 IF message.created_txid<>txid_current() THEN RAISE EXCEPTION 'Message links must be frozen in the send transaction'; END IF;
 IF message.forward_from IS NOT NULL AND NOT EXISTS(SELECT 1 FROM chat_message_links WHERE message_id=message.forward_from AND url=NEW.url AND label=NEW.label)
 THEN RAISE EXCEPTION 'Link not present in forward source'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER message_link_scope BEFORE INSERT ON chat_message_links FOR EACH ROW EXECUTE FUNCTION chat_link_guard();
CREATE FUNCTION chat_content_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF length(btrim(NEW.body))=0 AND NOT EXISTS(SELECT 1 FROM chat_message_files WHERE message_id=NEW.id) AND NOT EXISTS(SELECT 1 FROM chat_message_links WHERE message_id=NEW.id)
 THEN RAISE EXCEPTION 'Message content required'; END IF;RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER message_has_content AFTER INSERT ON chat_messages DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION chat_content_guard();
CREATE FUNCTION communication_member_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NEW.active AND NOT conversation_access(NEW.account_id,NEW.conversation_id) THEN RAISE EXCEPTION 'Conversation member scope invalid'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.conversation_id,NEW.account_id,NEW.joined_at) IS DISTINCT FROM ROW(OLD.conversation_id,OLD.account_id,OLD.joined_at) THEN RAISE EXCEPTION 'Conversation member identity is immutable'; END IF;
  IF NEW.last_read_sequence<OLD.last_read_sequence THEN RAISE EXCEPTION 'Read cursor cannot move backwards'; END IF;
 END IF;
 IF NEW.last_read_sequence<>0 AND NOT EXISTS(SELECT 1 FROM chat_messages WHERE conversation_id=NEW.conversation_id AND sequence=NEW.last_read_sequence) THEN RAISE EXCEPTION 'Read cursor must target this conversation'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER conversation_member_scope BEFORE INSERT OR UPDATE ON conversation_members FOR EACH ROW EXECUTE FUNCTION communication_member_guard();
CREATE FUNCTION chat_star_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM chat_messages m WHERE m.id=NEW.message_id AND conversation_access(NEW.account_id,m.conversation_id)) THEN RAISE EXCEPTION 'Message star access denied'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER message_star_scope BEFORE INSERT OR UPDATE ON chat_message_stars FOR EACH ROW EXECUTE FUNCTION chat_star_guard();
CREATE FUNCTION send_chat_message(actor UUID,conversation UUID,request UUID,text_body TEXT DEFAULT '',reply UUID DEFAULT NULL,forward UUID DEFAULT NULL,
 attachments JSONB DEFAULT '[]',links JSONB DEFAULT '[]') RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE existing chat_messages%ROWTYPE;source chat_messages%ROWTYPE;payload JSONB;message UUID;entry JSONB;actual_body TEXT;
BEGIN
 PERFORM 1 FROM conversations WHERE id=conversation FOR UPDATE;
 IF NOT FOUND OR NOT conversation_writable(actor,conversation) THEN RAISE EXCEPTION 'Writable conversation membership required'; END IF;
 IF jsonb_typeof(attachments) IS DISTINCT FROM 'array' OR jsonb_typeof(links) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Attachment and link arrays required'; END IF;
 payload=jsonb_build_object('conversation',conversation,'body',text_body,'reply',reply,'forward',forward,'files',attachments,'links',links);
 SELECT * INTO existing FROM chat_messages WHERE sender_id=actor AND request_key=request;
 IF FOUND THEN IF existing.request_payload<>payload THEN RAISE EXCEPTION 'Message key reused with different data'; END IF;RETURN existing.id; END IF;
 actual_body=COALESCE(text_body,'');
 IF forward IS NOT NULL THEN
  IF actual_body<>'' OR attachments<>'[]' OR links<>'[]' THEN RAISE EXCEPTION 'Forward copies source content, not replacement content'; END IF;
  SELECT * INTO source FROM chat_messages WHERE id=forward;
  IF NOT FOUND OR NOT conversation_access(actor,source.conversation_id) THEN RAISE EXCEPTION 'Forward source access denied'; END IF;
  actual_body=source.body;
 ELSIF length(btrim(actual_body))=0 AND jsonb_array_length(attachments)=0 AND jsonb_array_length(links)=0 THEN RAISE EXCEPTION 'Message content required'; END IF;
 INSERT INTO chat_messages(conversation_id,sender_id,request_key,request_payload,body,reply_to,forward_from)
 VALUES(conversation,actor,request,payload,actual_body,reply,forward) ON CONFLICT(sender_id,request_key) DO NOTHING RETURNING id INTO message;
 IF message IS NULL THEN
  SELECT * INTO existing FROM chat_messages WHERE sender_id=actor AND request_key=request;
  IF existing.request_payload<>payload THEN RAISE EXCEPTION 'Message key reused with different data'; END IF;RETURN existing.id;
 END IF;
 IF forward IS NOT NULL THEN
  INSERT INTO chat_message_files SELECT message,file_id,storage_key,original_name,mime_type,byte_size,sha256 FROM chat_message_files WHERE message_id=forward;
  INSERT INTO chat_message_links SELECT message,url,label FROM chat_message_links WHERE message_id=forward;
 ELSE
  FOR entry IN SELECT value FROM jsonb_array_elements(attachments) LOOP
   INSERT INTO chat_message_files(message_id,file_id,storage_key,original_name,mime_type,byte_size,sha256) VALUES(message,(entry->>'file_id')::uuid,'','','',0,repeat('0',64));
  END LOOP;
  FOR entry IN SELECT value FROM jsonb_array_elements(links) LOOP INSERT INTO chat_message_links VALUES(message,entry->>'url',COALESCE(entry->>'label',''));END LOOP;
 END IF;
 RETURN message;
END $$;
CREATE FUNCTION set_message_star(actor UUID,message UUID,star BOOLEAN) RETURNS VOID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT communication_actor(actor) OR NOT EXISTS(SELECT 1 FROM chat_messages m WHERE m.id=message AND conversation_access(actor,m.conversation_id)) THEN RAISE EXCEPTION 'Message access denied'; END IF;
 IF star THEN INSERT INTO chat_message_stars VALUES(message,actor,clock_timestamp()) ON CONFLICT DO NOTHING;
 ELSE DELETE FROM chat_message_stars WHERE message_id=message AND account_id=actor;END IF;
END $$;
CREATE FUNCTION mark_conversation_read(actor UUID,conversation UUID,message UUID) RETURNS BIGINT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE cursor_value BIGINT;
BEGIN
 IF NOT communication_actor(actor) OR NOT conversation_access(actor,conversation) THEN RAISE EXCEPTION 'Conversation access denied'; END IF;
 SELECT sequence INTO cursor_value FROM chat_messages WHERE id=message AND conversation_id=conversation;
 IF NOT FOUND THEN RAISE EXCEPTION 'Read cursor must target this conversation'; END IF;
 UPDATE conversation_members SET last_read_sequence=greatest(last_read_sequence,cursor_value),revision=revision+1
 WHERE conversation_id=conversation AND account_id=actor AND active RETURNING last_read_sequence INTO cursor_value;
 RETURN cursor_value;
END $$;

CREATE FUNCTION meeting_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Meeting history cannot be deleted'; END IF;
 IF NOT communication_actor(NEW.organizer_id) OR NEW.updated_by<>NEW.organizer_id THEN RAISE EXCEPTION 'Meeting organizer required'; END IF;
 IF NEW.project_id IS NOT NULL AND NOT (team_member(NEW.organizer_id,NEW.project_id) OR project_supervisor(NEW.organizer_id,NEW.project_id)) THEN RAISE EXCEPTION 'Meeting project access denied'; END IF;
 IF NEW.project_id IS NOT NULL AND EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'Completed project meetings are read only'; END IF;
 IF NEW.conversation_id IS NOT NULL AND NOT conversation_access(NEW.organizer_id,NEW.conversation_id) THEN RAISE EXCEPTION 'Meeting conversation access denied'; END IF;
 IF NEW.project_id IS NOT NULL AND EXISTS(SELECT 1 FROM conversations WHERE id=NEW.conversation_id AND project_id IS NOT NULL AND project_id<>NEW.project_id) THEN RAISE EXCEPTION 'Meeting conversation belongs to another project'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.organizer_id,NEW.project_id,NEW.conversation_id,NEW.request_key,NEW.request_payload,NEW.created_at) IS DISTINCT FROM
    ROW(OLD.id,OLD.organizer_id,OLD.project_id,OLD.conversation_id,OLD.request_key,OLD.request_payload,OLD.created_at) THEN RAISE EXCEPTION 'Meeting identity is immutable'; END IF;
  IF OLD.status<>'SCHEDULED' THEN RAISE EXCEPTION 'Finished meeting is read only'; END IF;
  NEW.revision=OLD.revision+1;
 ELSE
  IF NEW.status<>'SCHEDULED' OR NEW.starts_at<=clock_timestamp() THEN RAISE EXCEPTION 'New meeting must be scheduled in the future'; END IF;
 END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER meeting_scope BEFORE INSERT OR UPDATE OR DELETE ON meetings FOR EACH ROW EXECUTE FUNCTION meeting_guard();
CREATE FUNCTION meeting_participant_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE meeting meetings%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Invitation history cannot be deleted'; END IF;
 SELECT * INTO meeting FROM meetings WHERE id=NEW.meeting_id FOR UPDATE;
 IF meeting.status<>'SCHEDULED' OR meeting.starts_at<=clock_timestamp() THEN RAISE EXCEPTION 'Meeting invitation is closed'; END IF;
 IF NOT communication_actor(NEW.account_id) OR NEW.invited_by<>meeting.organizer_id THEN RAISE EXCEPTION 'Registered participant and organizer invitation required'; END IF;
 IF NEW.account_id=meeting.organizer_id AND NEW.response<>'ACCEPTED' THEN RAISE EXCEPTION 'Organizer is automatically accepted'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.meeting_id,NEW.account_id,NEW.invited_by,NEW.invited_at) IS DISTINCT FROM ROW(OLD.meeting_id,OLD.account_id,OLD.invited_by,OLD.invited_at) THEN RAISE EXCEPTION 'Invitation identity is immutable'; END IF;
  NEW.revision=OLD.revision+1;
 ELSE
  IF NEW.account_id<>meeting.organizer_id AND NEW.response<>'PENDING' THEN RAISE EXCEPTION 'Invitation starts pending'; END IF;
 END IF;
 NEW.responded_at=CASE WHEN NEW.response<>'PENDING' THEN clock_timestamp() END;RETURN NEW;
END $$;
CREATE TRIGGER meeting_participant_scope BEFORE INSERT OR UPDATE OR DELETE ON meeting_participants FOR EACH ROW EXECUTE FUNCTION meeting_participant_guard();
CREATE FUNCTION create_meeting(actor UUID,request UUID,title TEXT,starts TIMESTAMPTZ,ends TIMESTAMPTZ,invitees UUID[],agenda TEXT DEFAULT '',
 place TEXT DEFAULT '',url TEXT DEFAULT NULL,project UUID DEFAULT NULL,conversation UUID DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE payload JSONB;existing meetings%ROWTYPE;meeting UUID;person UUID;normalized UUID[];
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered organizer required'; END IF;
 SELECT array_agg(DISTINCT x ORDER BY x) INTO normalized FROM unnest(COALESCE(invitees,'{}')||ARRAY[actor]) x;
 IF array_position(normalized,NULL) IS NOT NULL THEN RAISE EXCEPTION 'Participant cannot be null'; END IF;
 payload=jsonb_build_object('title',title,'starts',starts AT TIME ZONE 'UTC','ends',ends AT TIME ZONE 'UTC','invitees',normalized,'agenda',agenda,'place',place,'url',url,'project',project,'conversation',conversation);
 PERFORM 1 FROM accounts WHERE id=actor FOR UPDATE;
 SELECT * INTO existing FROM meetings WHERE organizer_id=actor AND request_key=request;
 IF FOUND THEN IF existing.request_payload<>payload THEN RAISE EXCEPTION 'Meeting key reused with different data'; END IF;RETURN existing.id; END IF;
 INSERT INTO meetings(organizer_id,project_id,conversation_id,request_key,request_payload,title,agenda,starts_at,ends_at,location,meeting_url,updated_by)
 VALUES(actor,project,conversation,request,payload,title,agenda,starts,ends,place,url,actor) RETURNING id INTO meeting;
 FOREACH person IN ARRAY normalized LOOP
  INSERT INTO meeting_participants(meeting_id,account_id,invited_by,response,responded_at) VALUES(meeting,person,actor,
   CASE WHEN person=actor THEN 'ACCEPTED' ELSE 'PENDING' END,CASE WHEN person=actor THEN clock_timestamp() END);
 END LOOP;
 RETURN meeting;
END $$;
CREATE FUNCTION respond_to_meeting(actor UUID,meeting UUID,expected_revision INT,answer TEXT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE invitation meeting_participants%ROWTYPE;
BEGIN
 PERFORM 1 FROM meetings WHERE id=meeting FOR UPDATE;
 SELECT * INTO invitation FROM meeting_participants WHERE meeting_id=meeting AND account_id=actor FOR UPDATE;
 IF NOT FOUND OR NOT communication_actor(actor) THEN RAISE EXCEPTION 'Invited participant required'; END IF;
 IF expected_revision IS NULL OR invitation.revision<>expected_revision THEN RAISE EXCEPTION 'Invitation revision conflict'; END IF;
 IF answer NOT IN ('ACCEPTED','DECLINED') THEN RAISE EXCEPTION 'Accept or decline required'; END IF;
 UPDATE meeting_participants SET response=answer WHERE meeting_id=meeting AND account_id=actor RETURNING revision INTO expected_revision;
 RETURN expected_revision;
END $$;
CREATE FUNCTION update_meeting(actor UUID,meeting UUID,expected_revision INT,title TEXT,starts TIMESTAMPTZ,ends TIMESTAMPTZ,agenda TEXT,place TEXT,url TEXT,
 new_status TEXT DEFAULT 'SCHEDULED',notes TEXT DEFAULT '') RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current meetings%ROWTYPE;
BEGIN
 SELECT * INTO current FROM meetings WHERE id=meeting FOR UPDATE;
 IF NOT FOUND OR NOT communication_actor(actor) OR current.organizer_id<>actor THEN RAISE EXCEPTION 'Meeting organizer required'; END IF;
 IF expected_revision IS NULL OR current.revision<>expected_revision THEN RAISE EXCEPTION 'Meeting revision conflict'; END IF;
 IF new_status='SCHEDULED' AND starts<=clock_timestamp() AND ROW(starts,ends) IS DISTINCT FROM ROW(current.starts_at,current.ends_at) THEN RAISE EXCEPTION 'Rescheduled meeting must be in the future'; END IF;
 IF new_status='COMPLETED' AND starts>clock_timestamp() THEN RAISE EXCEPTION 'Future meeting cannot be completed'; END IF;
 UPDATE meetings SET title=update_meeting.title,starts_at=starts,ends_at=ends,agenda=update_meeting.agenda,location=place,meeting_url=url,
  status=new_status,notes=update_meeting.notes,updated_by=actor WHERE id=meeting RETURNING revision INTO expected_revision;
 IF new_status='SCHEDULED' AND ROW(starts,ends) IS DISTINCT FROM ROW(current.starts_at,current.ends_at) THEN
  UPDATE meeting_participants SET response='PENDING',responded_at=NULL WHERE meeting_id=meeting AND account_id<>actor;
 END IF;
 RETURN expected_revision;
END $$;
CREATE FUNCTION invite_to_meeting(actor UUID,meeting UUID,person UUID) RETURNS VOID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 PERFORM 1 FROM meetings WHERE id=meeting AND organizer_id=actor FOR UPDATE;
 IF NOT FOUND OR NOT communication_actor(actor) THEN RAISE EXCEPTION 'Meeting organizer required'; END IF;
 INSERT INTO meeting_participants(meeting_id,account_id,invited_by) VALUES(meeting,person,actor) ON CONFLICT DO NOTHING;
END $$;

CREATE FUNCTION emit_communication_event(key TEXT,event_kind TEXT,actor UUID,subject UUID,target UUID DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;project UUID;conversation UUID;message UUID;meeting UUID;submission UUID;feedback UUID;document UUID;recipient UUID;
 recipients UUID[];existing notification_events%ROWTYPE;occurred_at TIMESTAMPTZ;
BEGIN
 CASE event_kind
 WHEN 'MESSAGE' THEN
  message=subject;SELECT m.conversation_id,m.created_at INTO conversation,occurred_at FROM chat_messages m WHERE m.id=message AND m.sender_id=actor;
  IF conversation IS NULL THEN RAISE EXCEPTION 'Notification message source invalid'; END IF;
  SELECT array_agg(account_id) INTO recipients FROM conversation_members WHERE conversation_id=conversation AND active AND NOT muted AND account_id<>actor AND conversation_access(account_id,conversation);
 WHEN 'MEETING_INVITE','MEETING_UPDATED','MEETING_RESPONSE' THEN
  meeting=subject;
  SELECT updated_at INTO occurred_at FROM meetings WHERE id=meeting;
  IF NOT meeting_access(actor,meeting) THEN RAISE EXCEPTION 'Notification meeting source invalid'; END IF;
  IF event_kind='MEETING_RESPONSE' THEN
   SELECT ARRAY[organizer_id] INTO recipients FROM meetings WHERE id=meeting;
   SELECT responded_at INTO occurred_at FROM meeting_participants WHERE meeting_id=meeting AND account_id=actor;
  ELSIF event_kind='MEETING_INVITE' THEN
   IF NOT EXISTS(SELECT 1 FROM meetings WHERE id=meeting AND organizer_id=actor) OR NOT EXISTS(SELECT 1 FROM meeting_participants WHERE meeting_id=meeting AND account_id=target)
   THEN RAISE EXCEPTION 'Invitation target invalid'; END IF;
   recipients=ARRAY[target];
   SELECT invited_at INTO occurred_at FROM meeting_participants WHERE meeting_id=meeting AND account_id=target;
  ELSE
   IF NOT EXISTS(SELECT 1 FROM meetings WHERE id=meeting AND organizer_id=actor) THEN RAISE EXCEPTION 'Organizer event required'; END IF;
   SELECT array_agg(account_id) INTO recipients FROM meeting_participants WHERE meeting_id=meeting AND account_id<>actor;
  END IF;
 WHEN 'REPORT_SUBMITTED' THEN
  submission=subject;SELECT d.project_id,s.submitted_at INTO project,occurred_at FROM report_submissions s JOIN report_documents d ON d.id=s.document_id WHERE s.id=submission AND s.submitted_by=actor;
  IF project IS NULL THEN RAISE EXCEPTION 'Notification report source invalid'; END IF;
  SELECT array_agg(supervisor_id) INTO recipients FROM project_supervisors WHERE project_id=project;
 WHEN 'REPORT_REVIEWED' THEN
  feedback=subject;SELECT d.project_id,f.created_at INTO project,occurred_at FROM report_feedback f JOIN report_submissions s ON s.id=f.submission_id JOIN report_documents d ON d.id=s.document_id WHERE f.id=feedback AND f.created_by=actor;
  IF project IS NULL THEN RAISE EXCEPTION 'Notification feedback source invalid'; END IF;
  SELECT array_agg(student_id) INTO recipients FROM project_students WHERE project_id=project AND left_at IS NULL;
 WHEN 'REPORT_REOPENED' THEN
  document=subject;SELECT project_id,updated_at INTO project,occurred_at FROM report_documents WHERE id=document;
  IF project IS NULL OR NOT project_supervisor(actor,project) THEN RAISE EXCEPTION 'Notification reopen source invalid'; END IF;
  SELECT array_agg(student_id) INTO recipients FROM project_students WHERE project_id=project AND left_at IS NULL;
 ELSE RAISE EXCEPTION 'Unsupported notification source';
 END CASE;
 INSERT INTO notification_events(event_key,kind,actor_id,message_id,meeting_id,submission_id,feedback_id,document_id,data,created_at)
 VALUES(key,event_kind,actor,message,meeting,submission,feedback,document,jsonb_build_object('target',target),COALESCE(occurred_at,clock_timestamp())) ON CONFLICT(event_key) DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN
  SELECT * INTO existing FROM notification_events WHERE event_key=key;
  IF ROW(existing.kind,existing.actor_id,existing.message_id,existing.meeting_id,existing.submission_id,existing.feedback_id,existing.document_id)
   IS DISTINCT FROM ROW(event_kind,actor,message,meeting,submission,feedback,document) OR existing.data IS DISTINCT FROM jsonb_build_object('target',target) THEN RAISE EXCEPTION 'Notification key reused with different source'; END IF;
  RETURN existing.id;
 END IF;
 FOREACH recipient IN ARRAY COALESCE(recipients,'{}') LOOP
  IF recipient<>actor THEN INSERT INTO notification_inbox(event_id,recipient_id) VALUES(result,recipient) ON CONFLICT DO NOTHING; END IF;
 END LOOP;
 RETURN result;
END $$;
CREATE FUNCTION communication_event_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='chat_messages' THEN PERFORM emit_communication_event('message:'||NEW.id,'MESSAGE',NEW.sender_id,NEW.id);
 ELSIF TG_TABLE_NAME='meeting_participants' THEN
  IF TG_OP='INSERT' AND NEW.account_id<>NEW.invited_by THEN PERFORM emit_communication_event('meeting-invite:'||NEW.meeting_id||':'||NEW.account_id,'MEETING_INVITE',NEW.invited_by,NEW.meeting_id,NEW.account_id);
  ELSIF TG_OP='UPDATE' AND NEW.response<>'PENDING' AND NEW.response IS DISTINCT FROM OLD.response THEN PERFORM emit_communication_event('meeting-response:'||NEW.meeting_id||':'||NEW.account_id||':'||NEW.revision,'MEETING_RESPONSE',NEW.account_id,NEW.meeting_id);END IF;
 ELSIF TG_TABLE_NAME='meetings' THEN PERFORM emit_communication_event('meeting-update:'||NEW.id||':'||NEW.revision,'MEETING_UPDATED',NEW.organizer_id,NEW.id);
 ELSIF TG_TABLE_NAME='report_submissions' THEN PERFORM emit_communication_event('report-submitted:'||NEW.id,'REPORT_SUBMITTED',NEW.submitted_by,NEW.id);
 ELSIF TG_TABLE_NAME='report_feedback' THEN PERFORM emit_communication_event('report-feedback:'||NEW.id,'REPORT_REVIEWED',NEW.created_by,NEW.id);
 ELSIF TG_TABLE_NAME='report_documents' AND OLD.state='SUBMITTED' AND NEW.state='DRAFT' AND NEW.kind<>'WEEKLY' THEN
  PERFORM emit_communication_event('report-reopen:'||NEW.id||':'||NEW.revision,'REPORT_REOPENED',NEW.updated_by,NEW.id);
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER message_notification AFTER INSERT ON chat_messages FOR EACH ROW EXECUTE FUNCTION communication_event_trigger();
CREATE TRIGGER invitation_notification AFTER INSERT OR UPDATE ON meeting_participants FOR EACH ROW EXECUTE FUNCTION communication_event_trigger();
CREATE TRIGGER meeting_notification AFTER UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION communication_event_trigger();
CREATE TRIGGER report_submission_notification AFTER INSERT ON report_submissions FOR EACH ROW EXECUTE FUNCTION communication_event_trigger();
CREATE TRIGGER report_feedback_notification AFTER INSERT ON report_feedback FOR EACH ROW EXECUTE FUNCTION communication_event_trigger();
CREATE TRIGGER report_reopen_notification AFTER UPDATE ON report_documents FOR EACH ROW EXECUTE FUNCTION communication_event_trigger();
CREATE FUNCTION notification_recipient_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE event notification_events%ROWTYPE;allowed BOOLEAN;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Notification history cannot be deleted; dismiss it'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.event_id,NEW.recipient_id) IS DISTINCT FROM ROW(OLD.event_id,OLD.recipient_id) OR
   OLD.read_at IS NOT NULL AND NEW.read_at IS DISTINCT FROM OLD.read_at OR
   OLD.dismissed_at IS NOT NULL AND NEW.dismissed_at IS DISTINCT FROM OLD.dismissed_at
  THEN RAISE EXCEPTION 'Notification identity and first-read state are immutable'; END IF;RETURN NEW;
 END IF;
 SELECT * INTO event FROM notification_events WHERE id=NEW.event_id;
 IF NEW.recipient_id=event.actor_id THEN RAISE EXCEPTION 'No self notification'; END IF;
 CASE event.kind
 WHEN 'MESSAGE' THEN SELECT conversation_access(NEW.recipient_id,m.conversation_id) INTO allowed FROM chat_messages m WHERE id=event.message_id;
 WHEN 'MEETING_INVITE' THEN allowed=(event.data->>'target')=NEW.recipient_id::text AND meeting_access(NEW.recipient_id,event.meeting_id);
 WHEN 'MEETING_RESPONSE' THEN SELECT organizer_id=NEW.recipient_id INTO allowed FROM meetings WHERE id=event.meeting_id;
 WHEN 'MEETING_UPDATED' THEN allowed=meeting_access(NEW.recipient_id,event.meeting_id);
 WHEN 'REPORT_SUBMITTED' THEN SELECT project_supervisor(NEW.recipient_id,d.project_id) INTO allowed FROM report_submissions s JOIN report_documents d ON d.id=s.document_id WHERE s.id=event.submission_id;
 WHEN 'REPORT_REVIEWED' THEN SELECT team_member(NEW.recipient_id,d.project_id) INTO allowed FROM report_feedback f JOIN report_submissions s ON s.id=f.submission_id JOIN report_documents d ON d.id=s.document_id WHERE f.id=event.feedback_id;
 WHEN 'REPORT_REOPENED' THEN SELECT team_member(NEW.recipient_id,project_id) INTO allowed FROM report_documents WHERE id=event.document_id;
 END CASE;
 IF allowed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Notification recipient scope invalid'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER notification_recipient_scope BEFORE INSERT OR UPDATE OR DELETE ON notification_inbox FOR EACH ROW EXECUTE FUNCTION notification_recipient_guard();
CREATE FUNCTION update_notification_state(actor UUID,event UUID,mark_read BOOLEAN DEFAULT true,dismiss BOOLEAN DEFAULT false) RETURNS VOID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered recipient required'; END IF;
 UPDATE notification_inbox SET read_at=CASE WHEN mark_read OR dismiss THEN COALESCE(read_at,clock_timestamp()) ELSE read_at END,
  dismissed_at=CASE WHEN dismiss THEN COALESCE(dismissed_at,clock_timestamp()) ELSE dismissed_at END WHERE event_id=event AND recipient_id=actor;
 IF NOT FOUND THEN RAISE EXCEPTION 'Notification recipient access denied'; END IF;
END $$;
CREATE FUNCTION read_chat_messages(actor UUID,conversation UUID,after_sequence BIGINT DEFAULT 0,page_size INT DEFAULT 50) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result JSONB;
BEGIN
 IF NOT communication_actor(actor) OR NOT conversation_access(actor,conversation) THEN RAISE EXCEPTION 'Conversation access denied'; END IF;
 SELECT COALESCE(jsonb_agg(row ORDER BY sequence),'[]') INTO result FROM (
  SELECT m.id,m.sequence,m.sender_id,m.body,m.reply_to,(m.forward_from IS NOT NULL) AS forwarded,m.created_at,
   EXISTS(SELECT 1 FROM chat_message_stars WHERE message_id=m.id AND account_id=actor) AS starred,
   (SELECT COALESCE(jsonb_agg(jsonb_build_object('file_id',file_id,'name',original_name,'mime_type',mime_type,'byte_size',byte_size)),'[]') FROM chat_message_files WHERE message_id=m.id) AS files,
   (SELECT COALESCE(jsonb_agg(jsonb_build_object('url',url,'label',label)),'[]') FROM chat_message_links WHERE message_id=m.id) AS links
  FROM chat_messages m WHERE m.conversation_id=conversation AND m.sequence>after_sequence ORDER BY m.sequence LIMIT least(greatest(page_size,1),100)
 ) row;
 RETURN result;
END $$;
CREATE FUNCTION mark_all_notifications_read(actor UUID) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE changed INT;
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered recipient required'; END IF;
 UPDATE notification_inbox SET read_at=clock_timestamp() WHERE recipient_id=actor AND read_at IS NULL;
 GET DIAGNOSTICS changed=ROW_COUNT;RETURN changed;
END $$;
CREATE FUNCTION read_meeting(actor UUID,meeting UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT communication_actor(actor) OR NOT meeting_access(actor,meeting) THEN RAISE EXCEPTION 'Meeting access denied'; END IF;
 RETURN (SELECT to_jsonb(m)-'request_payload'-'request_key'||jsonb_build_object('participants',
  (SELECT jsonb_agg(jsonb_build_object('account_id',account_id,'response',response,'revision',revision)) FROM meeting_participants WHERE meeting_id=m.id)) FROM meetings m WHERE id=meeting);
END $$;
CREATE FUNCTION read_notifications(actor UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered recipient required'; END IF;
 RETURN (SELECT COALESCE(jsonb_agg(item ORDER BY created_at DESC),'[]') FROM (
  SELECT e.id,e.kind,e.message_id,e.meeting_id,e.submission_id,e.feedback_id,e.document_id,e.created_at,i.read_at,i.dismissed_at
  FROM notification_events e JOIN notification_inbox i ON i.event_id=e.id WHERE i.recipient_id=actor AND i.dismissed_at IS NULL
  AND (e.message_id IS NULL OR EXISTS(SELECT 1 FROM chat_messages m WHERE m.id=e.message_id AND conversation_access(actor,m.conversation_id)))
  AND (e.meeting_id IS NULL OR meeting_access(actor,e.meeting_id))
  AND (e.submission_id IS NULL OR EXISTS(SELECT 1 FROM report_submissions s JOIN report_documents d ON d.id=s.document_id WHERE s.id=e.submission_id AND project_supervisor(actor,d.project_id)))
  AND (e.feedback_id IS NULL OR EXISTS(SELECT 1 FROM report_feedback f JOIN report_submissions s ON s.id=f.submission_id JOIN report_documents d ON d.id=s.document_id WHERE f.id=e.feedback_id AND team_member(actor,d.project_id)))
  AND (e.document_id IS NULL OR EXISTS(SELECT 1 FROM report_documents d WHERE d.id=e.document_id AND team_member(actor,d.project_id)))
  ORDER BY e.created_at DESC LIMIT 100
 ) item);
END $$;
CREATE FUNCTION search_chat_people(actor UUID,search TEXT) RETURNS TABLE(id UUID,full_name TEXT,role TEXT,university_number VARCHAR) LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered account required'; END IF;
 RETURN QUERY SELECT a.id,a.full_name,a.role,a.university_number FROM accounts a WHERE a.id<>actor AND communication_actor(a.id)
  AND (strpos(lower(a.full_name),lower(btrim(search)))>0 OR strpos(COALESCE(a.university_number,''),btrim(search))>0)
 ORDER BY a.full_name,a.id LIMIT 50;
END $$;
CREATE VIEW conversation_summary AS
 SELECT c.id AS conversation_id,m.account_id,c.kind,c.project_id,c.revision,c.name,c.photo_file_id,m.starred,m.muted,m.last_read_sequence,
  (SELECT count(*) FROM chat_messages x WHERE x.conversation_id=c.id AND x.sequence>m.last_read_sequence AND x.sender_id<>m.account_id) AS unread_count
 FROM conversations c JOIN conversation_members m ON m.conversation_id=c.id WHERE m.active;
COMMENT ON VIEW conversation_summary IS 'Backend must filter by authenticated account and current conversation_access. SELF avatars/names come from the current account profile, never a duplicate profile row.';
REVOKE ALL ON conversations,conversation_members,chat_messages,chat_message_files,chat_message_links,chat_message_stars,meetings,meeting_participants,notification_events,notification_inbox,conversation_summary FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;

-- Source: workshop-operations-stage6/sql/15-workshop-operations.sql
BEGIN;
SET search_path=labassist_student,public;
CREATE FUNCTION data_student(actor UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$ SELECT communication_actor(actor) AND EXISTS(SELECT 1 FROM accounts WHERE id=actor AND role='STUDENT') $$;
CREATE FUNCTION data_manager(actor UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$ SELECT communication_actor(actor) AND EXISTS(SELECT 1 FROM accounts WHERE id=actor AND role='WORKSHOP_MANAGER') $$;
CREATE FUNCTION data_revision(actual INT,expected INT) RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN IF expected IS NULL OR actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Revision conflict' USING ERRCODE='40001'; END IF;END $$;
CREATE TABLE workshop_days (
 term_id UUID NOT NULL REFERENCES academic_terms(id),day DATE NOT NULL,is_working BOOLEAN NOT NULL,
 opens TIME,closes TIME,reason TEXT NOT NULL DEFAULT '',revision INT NOT NULL DEFAULT 0,
 updated_by UUID NOT NULL REFERENCES accounts(id),PRIMARY KEY(term_id,day),
 CHECK((is_working AND opens IS NOT NULL AND closes IS NOT NULL AND closes>opens) OR (NOT is_working AND opens IS NULL AND closes IS NULL))
);
CREATE TABLE workshop_absence_policies (
 term_id UUID PRIMARY KEY REFERENCES academic_terms(id),limit_percent NUMERIC(5,2) CHECK(limit_percent>0 AND limit_percent<=100),
 updated_by UUID NOT NULL REFERENCES accounts(id),revision INT NOT NULL DEFAULT 0
);
CREATE TABLE workshop_attendance (
 term_id UUID NOT NULL,day DATE NOT NULL,student_id UUID NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('PRESENT','ABSENT')),revision INT NOT NULL DEFAULT 0,updated_by UUID NOT NULL REFERENCES accounts(id),
 PRIMARY KEY(term_id,day,student_id),FOREIGN KEY(term_id,day) REFERENCES workshop_days(term_id,day),
 FOREIGN KEY(student_id,term_id) REFERENCES student_enrollments(student_id,term_id)
);
CREATE TABLE workshop_tables (
 id TEXT PRIMARY KEY,shape TEXT NOT NULL CHECK(shape IN ('RECT','ROUND')),team_capacity INT NOT NULL CHECK(team_capacity BETWEEN 1 AND 2),
 geometry JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(geometry)='object')
);
CREATE TABLE workshop_table_assignments (
 project_id UUID PRIMARY KEY,term_id UUID NOT NULL,table_id TEXT NOT NULL REFERENCES workshop_tables(id),
 assigned_by UUID NOT NULL REFERENCES accounts(id),verified_by UUID REFERENCES accounts(id),verified_at TIMESTAMPTZ,
 revision INT NOT NULL DEFAULT 0,updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(project_id,term_id) REFERENCES projects(id,term_id),CHECK((verified_by IS NULL)=(verified_at IS NULL))
);
CREATE TABLE workshop_table_history (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),project_id UUID NOT NULL REFERENCES projects(id),table_id TEXT NOT NULL REFERENCES workshop_tables(id),
 actor_id UUID NOT NULL REFERENCES accounts(id),revision INT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(project_id,revision)
);
CREATE TRIGGER table_history_immutable BEFORE UPDATE OR DELETE ON workshop_table_history FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TABLE workshop_handovers (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,project_id UUID NOT NULL REFERENCES projects(id),
 issued_by UUID NOT NULL REFERENCES accounts(id),issued_on DATE NOT NULL,revision INT NOT NULL DEFAULT 0,
 request_key UUID,request_payload JSONB,UNIQUE(project_id,request_key)
);
CREATE TABLE workshop_handover_items (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),handover_id UUID NOT NULL REFERENCES workshop_handovers(id),
 name TEXT NOT NULL CHECK(length(btrim(name))>0),quantity INT NOT NULL CHECK(quantity>0),
 returned_good INT NOT NULL DEFAULT 0 CHECK(returned_good>=0),returned_damaged INT NOT NULL DEFAULT 0 CHECK(returned_damaged>=0),
 missing INT NOT NULL DEFAULT 0 CHECK(missing>=0),note TEXT NOT NULL DEFAULT '',
 CHECK(returned_good+returned_damaged+missing<=quantity),UNIQUE(handover_id,name)
);
CREATE TABLE workshop_return_updates (
 handover_id UUID NOT NULL REFERENCES workshop_handovers(id),request_key UUID NOT NULL,payload JSONB NOT NULL,
 actor_id UUID NOT NULL REFERENCES accounts(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(handover_id,request_key)
);
CREATE TRIGGER return_updates_immutable BEFORE UPDATE OR DELETE ON workshop_return_updates FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TABLE workshop_records (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,term_id UUID NOT NULL REFERENCES academic_terms(id),
 project_id UUID,student_id UUID,kind TEXT NOT NULL CHECK(kind IN ('NOTICE','OBSERVATION','ABSENCE_ALERT')),
 category TEXT NOT NULL DEFAULT 'general',body TEXT NOT NULL CHECK(length(btrim(body))>0),
 created_by UUID NOT NULL REFERENCES accounts(id),updated_by UUID NOT NULL REFERENCES accounts(id),revision INT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),FOREIGN KEY(project_id,term_id) REFERENCES projects(id,term_id),
 FOREIGN KEY(student_id,term_id) REFERENCES student_enrollments(student_id,term_id),
 CHECK(kind<>'OBSERVATION' OR project_id IS NOT NULL),CHECK((kind='ABSENCE_ALERT')=(student_id IS NOT NULL))
);
CREATE UNIQUE INDEX one_absence_alert_per_student_term ON workshop_records(term_id,student_id) WHERE kind='ABSENCE_ALERT';
CREATE TABLE workshop_record_recipients (
 record_id UUID NOT NULL REFERENCES workshop_records(id),account_id UUID NOT NULL REFERENCES accounts(id),read_at TIMESTAMPTZ,PRIMARY KEY(record_id,account_id)
);
CREATE INDEX attendance_student_term ON workshop_attendance(student_id,term_id,day);
CREATE INDEX workshop_record_recipient ON workshop_record_recipients(account_id,record_id);
CREATE FUNCTION workshop_operation_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE actor UUID;term UUID;on_day DATE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Workshop history cannot be deleted'; END IF;
 IF TG_TABLE_NAME='workshop_handovers' THEN
  actor=NEW.issued_by;
  IF TG_OP='UPDATE' AND ROW(NEW.id,NEW.project_id,NEW.issued_by,NEW.issued_on,NEW.request_key,NEW.request_payload) IS DISTINCT FROM ROW(OLD.id,OLD.project_id,OLD.issued_by,OLD.issued_on,OLD.request_key,OLD.request_payload) THEN RAISE EXCEPTION 'Handover identity is immutable';END IF;
 ELSE actor=NEW.updated_by;END IF;
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required'; END IF;
 IF TG_TABLE_NAME IN ('workshop_days','workshop_attendance') THEN
  term=NEW.term_id;on_day=NEW.day;
  IF NOT EXISTS(SELECT 1 FROM academic_terms WHERE id=term AND on_day>=starts_on AND (ends_on IS NULL OR on_day<=ends_on)) THEN RAISE EXCEPTION 'Day outside academic term'; END IF;
 END IF;
 IF TG_TABLE_NAME='workshop_attendance' THEN
  IF NOT EXISTS(SELECT 1 FROM workshop_days WHERE term_id=term AND day=on_day AND is_working) THEN RAISE EXCEPTION 'Attendance requires an actual working day'; END IF;
  IF TG_OP='UPDATE' AND ROW(NEW.term_id,NEW.day,NEW.student_id) IS DISTINCT FROM ROW(OLD.term_id,OLD.day,OLD.student_id) THEN RAISE EXCEPTION 'Attendance identity is immutable'; END IF;
 ELSIF TG_TABLE_NAME='workshop_days' THEN
  IF TG_OP='UPDATE' AND ROW(NEW.term_id,NEW.day) IS DISTINCT FROM ROW(OLD.term_id,OLD.day) THEN RAISE EXCEPTION 'Calendar identity is immutable';END IF;
 ELSIF TG_TABLE_NAME='workshop_absence_policies' THEN
  IF TG_OP='UPDATE' AND NEW.term_id<>OLD.term_id THEN RAISE EXCEPTION 'Policy identity is immutable';END IF;
 ELSIF TG_TABLE_NAME='workshop_records' THEN
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.term_id,NEW.project_id,NEW.student_id,NEW.kind,NEW.created_by,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.term_id,OLD.project_id,OLD.student_id,OLD.kind,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Record identity is immutable'; END IF;
  IF EXISTS(SELECT 1 FROM workshop_record_recipients WHERE record_id=OLD.id AND read_at IS NOT NULL) THEN RAISE EXCEPTION 'Seen workshop record is read only'; END IF;
 END IF;END IF;
 IF TG_OP='UPDATE' AND TG_TABLE_NAME<>'workshop_handovers' THEN NEW.revision=OLD.revision+1; END IF;RETURN NEW;
END $$;
DO $$ DECLARE t TEXT;BEGIN FOREACH t IN ARRAY ARRAY['workshop_days','workshop_absence_policies','workshop_attendance','workshop_handovers','workshop_records'] LOOP
 EXECUTE format('CREATE TRIGGER operation_scope BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION workshop_operation_guard()',t);END LOOP;END $$;
CREATE FUNCTION set_workshop_day(actor UUID,term UUID,on_day DATE,working BOOLEAN,start_time TIME,end_time TIME,note TEXT,expected INT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current_revision INT;
BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 PERFORM 1 FROM academic_terms WHERE id=term FOR UPDATE;
 IF EXISTS(SELECT 1 FROM academic_terms WHERE id=term AND ends_on<(clock_timestamp() AT TIME ZONE 'Asia/Hebron')::date) THEN RAISE EXCEPTION 'Past term is read only';END IF;
 SELECT revision INTO current_revision FROM workshop_days WHERE term_id=term AND day=on_day FOR UPDATE;
 PERFORM data_revision(COALESCE(current_revision,-1),expected);
 INSERT INTO workshop_days(term_id,day,is_working,opens,closes,reason,updated_by) VALUES(term,on_day,working,start_time,end_time,note,actor)
 ON CONFLICT(term_id,day) DO UPDATE SET is_working=excluded.is_working,opens=excluded.opens,closes=excluded.closes,reason=excluded.reason,updated_by=actor RETURNING revision INTO current_revision;
 RETURN current_revision;
END $$;
CREATE FUNCTION set_absence_policy(actor UUID,term UUID,expected INT,threshold NUMERIC) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;
BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 PERFORM 1 FROM academic_terms WHERE id=term FOR UPDATE;
 IF EXISTS(SELECT 1 FROM academic_terms WHERE id=term AND ends_on<(clock_timestamp() AT TIME ZONE 'Asia/Hebron')::date) THEN RAISE EXCEPTION 'Past term is read only';END IF;
 SELECT revision INTO value FROM workshop_absence_policies WHERE term_id=term FOR UPDATE;PERFORM data_revision(COALESCE(value,-1),expected);
 INSERT INTO workshop_absence_policies(term_id,limit_percent,updated_by) VALUES(term,threshold,actor) ON CONFLICT(term_id) DO UPDATE SET limit_percent=excluded.limit_percent,updated_by=actor RETURNING revision INTO value;RETURN value;
END $$;
CREATE FUNCTION record_attendance(actor UUID,term UUID,on_day DATE,student UUID,expected INT,new_status TEXT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;today DATE=(clock_timestamp() AT TIME ZONE 'Asia/Hebron')::date;
BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 PERFORM 1 FROM workshop_days WHERE term_id=term AND day=on_day FOR UPDATE;
 IF on_day>today OR today>on_day+7 THEN RAISE EXCEPTION 'Attendance edit window closed';END IF;
 SELECT revision INTO value FROM workshop_attendance WHERE term_id=term AND day=on_day AND student_id=student FOR UPDATE;
 PERFORM data_revision(COALESCE(value,-1),expected);
 INSERT INTO workshop_attendance(term_id,day,student_id,status,updated_by) VALUES(term,on_day,student,new_status,actor)
 ON CONFLICT(term_id,day,student_id) DO UPDATE SET status=excluded.status,updated_by=actor RETURNING revision INTO value;RETURN value;
END $$;
CREATE FUNCTION assignment_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE capacity INT;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Assignment history cannot be deleted';END IF;
 IF NOT(data_manager(NEW.assigned_by) OR data_student(NEW.assigned_by) AND team_member(NEW.assigned_by,NEW.project_id)) THEN RAISE EXCEPTION 'Manager or own teammate required';END IF;
 SELECT team_capacity INTO capacity FROM workshop_tables WHERE id=NEW.table_id FOR UPDATE;
 IF (SELECT count(*) FROM workshop_table_assignments WHERE term_id=NEW.term_id AND table_id=NEW.table_id AND project_id<>NEW.project_id)>=capacity THEN RAISE EXCEPTION 'Table capacity exceeded';END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.project_id,NEW.term_id) IS DISTINCT FROM ROW(OLD.project_id,OLD.term_id) THEN RAISE EXCEPTION 'Assignment identity immutable';END IF;
  NEW.revision=OLD.revision+1;
 END IF;
 IF NEW.verified_by IS NOT NULL AND NOT data_manager(NEW.verified_by) THEN RAISE EXCEPTION 'Manager verification required';END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER assignment_scope BEFORE INSERT OR UPDATE OR DELETE ON workshop_table_assignments FOR EACH ROW EXECUTE FUNCTION assignment_guard();
CREATE FUNCTION assignment_history_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$ BEGIN INSERT INTO workshop_table_history(project_id,table_id,actor_id,revision) VALUES(NEW.project_id,NEW.table_id,NEW.assigned_by,NEW.revision);RETURN NEW;END $$;
CREATE TRIGGER assignment_history AFTER INSERT OR UPDATE ON workshop_table_assignments FOR EACH ROW EXECUTE FUNCTION assignment_history_trigger();
CREATE FUNCTION assign_workshop_table(actor UUID,project UUID,target TEXT,expected INT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;term UUID;
BEGIN
 SELECT term_id INTO term FROM projects WHERE id=project AND status NOT IN ('COMPLETED','ARCHIVED') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current project required';END IF;
 IF NOT(data_manager(actor) OR data_student(actor) AND team_member(actor,project)) THEN RAISE EXCEPTION 'Manager or own teammate required';END IF;
 SELECT revision INTO value FROM workshop_table_assignments WHERE project_id=project FOR UPDATE;PERFORM data_revision(COALESCE(value,-1),expected);
 INSERT INTO workshop_table_assignments(project_id,term_id,table_id,assigned_by) VALUES(project,term,target,actor)
 ON CONFLICT(project_id) DO UPDATE SET table_id=target,assigned_by=actor,verified_by=NULL,verified_at=NULL RETURNING revision INTO value;RETURN value;
END $$;
CREATE FUNCTION verify_workshop_table(actor UUID,project UUID,expected INT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;
BEGIN IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 SELECT revision INTO value FROM workshop_table_assignments WHERE project_id=project FOR UPDATE;PERFORM data_revision(value,expected);
 UPDATE workshop_table_assignments SET verified_by=actor,verified_at=clock_timestamp(),assigned_by=actor WHERE project_id=project RETURNING revision INTO value;RETURN value;END $$;
CREATE FUNCTION update_tool_return(actor UUID,handover UUID,expected INT,request UUID,items JSONB) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;old_payload JSONB;entry JSONB;
BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 SELECT revision INTO value FROM workshop_handovers WHERE id=handover FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Handover not found';END IF;
 IF EXISTS(SELECT 1 FROM workshop_handovers h JOIN projects p ON p.id=h.project_id WHERE h.id=handover AND p.status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'Historical handover is read only';END IF;
 SELECT payload INTO old_payload FROM workshop_return_updates WHERE handover_id=handover AND request_key=request;
 IF FOUND THEN IF old_payload IS DISTINCT FROM items THEN RAISE EXCEPTION 'Return key reused with different data';END IF;RETURN value;END IF;
 PERFORM data_revision(value,expected);
 IF jsonb_typeof(items) IS DISTINCT FROM 'array' OR jsonb_array_length(items)=0 THEN RAISE EXCEPTION 'Return items required';END IF;
 FOR entry IN SELECT x FROM jsonb_array_elements(items) x LOOP
  UPDATE workshop_handover_items SET returned_good=(entry->>'good')::int,returned_damaged=(entry->>'damaged')::int,missing=(entry->>'missing')::int,note=COALESCE(entry->>'note','') WHERE id=(entry->>'id')::uuid AND handover_id=handover;
  IF NOT FOUND THEN RAISE EXCEPTION 'Return item belongs to another team';END IF;
 END LOOP;
 INSERT INTO workshop_return_updates VALUES(handover,request,items,actor,clock_timestamp());
 UPDATE workshop_handovers SET revision=revision+1 WHERE id=handover RETURNING revision INTO value;RETURN value;
END $$;
CREATE VIEW workshop_absence_summary AS SELECT e.student_id,e.term_id,
 (SELECT count(*) FROM workshop_days d WHERE d.term_id=e.term_id AND d.is_working AND d.day<=(clock_timestamp() AT TIME ZONE 'Asia/Hebron')::date) AS working_days,
 (SELECT count(*) FROM workshop_attendance a JOIN workshop_days d USING(term_id,day) WHERE a.term_id=e.term_id AND a.student_id=e.student_id AND d.is_working AND a.status='ABSENT') AS absences
 FROM student_enrollments e;
CREATE VIEW workshop_handover_summary AS SELECT h.id,h.project_id,COALESCE(sum(i.quantity-i.returned_good-i.returned_damaged),0) AS outstanding,
 COALESCE(sum(i.missing),0) AS flagged_missing,COALESCE(sum(i.returned_damaged),0) AS damaged FROM workshop_handovers h LEFT JOIN workshop_handover_items i ON i.handover_id=h.id GROUP BY h.id;
CREATE FUNCTION issue_team_tools(actor UUID,project UUID,request UUID,items JSONB) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;payload JSONB;entry JSONB;
BEGIN IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 PERFORM 1 FROM projects WHERE id=project AND status NOT IN ('COMPLETED','ARCHIVED') FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Current project required';END IF;
 SELECT id,request_payload INTO result,payload FROM workshop_handovers WHERE project_id=project AND request_key=request;
 IF FOUND THEN IF payload<>items THEN RAISE EXCEPTION 'Handover key reused with different items';END IF;RETURN result;END IF;
 IF jsonb_typeof(items) IS DISTINCT FROM 'array' OR jsonb_array_length(items)=0 THEN RAISE EXCEPTION 'Issued tool items required';END IF;
 INSERT INTO workshop_handovers(project_id,issued_by,issued_on,request_key,request_payload) VALUES(project,actor,(clock_timestamp() AT TIME ZONE 'Asia/Hebron')::date,request,items) RETURNING id INTO result;
 FOR entry IN SELECT x FROM jsonb_array_elements(items) x LOOP INSERT INTO workshop_handover_items(handover_id,name,quantity) VALUES(result,entry->>'name',(entry->>'quantity')::int);END LOOP;RETURN result;
END $$;
CREATE FUNCTION read_team_handovers(actor UUID,project UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT communication_actor(actor) OR NOT(data_manager(actor) OR team_member(actor,project) OR project_supervisor(actor,project)) THEN RAISE EXCEPTION 'Handover access denied';END IF;
 RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(s)),'[]') FROM workshop_handover_summary s WHERE project_id=project);END $$;
CREATE FUNCTION create_workshop_record(actor UUID,term UUID,project UUID,record_kind TEXT,message TEXT,students BOOLEAN DEFAULT true,supervisors BOOLEAN DEFAULT false,student UUID DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;event UUID;
BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 IF EXISTS(SELECT 1 FROM academic_terms WHERE id=term AND ends_on<(clock_timestamp() AT TIME ZONE 'Asia/Hebron')::date) THEN RAISE EXCEPTION 'Past term is read only';END IF;
 IF record_kind='ABSENCE_ALERT' THEN
  PERFORM 1 FROM accounts WHERE id=student FOR UPDATE;
  SELECT id INTO result FROM workshop_records WHERE term_id=term AND student_id=student AND kind='ABSENCE_ALERT';IF FOUND THEN RETURN result;END IF;
 END IF;
 INSERT INTO workshop_records(term_id,project_id,student_id,kind,body,created_by,updated_by) VALUES(term,project,student,record_kind,message,actor,actor) RETURNING id INTO result;
 IF record_kind='ABSENCE_ALERT' THEN INSERT INTO workshop_record_recipients VALUES(result,student,NULL);END IF;
 IF students AND record_kind='NOTICE' THEN INSERT INTO workshop_record_recipients SELECT result,s.student_id,NULL::timestamptz FROM project_students s WHERE s.term_id=term AND s.left_at IS NULL AND (project IS NULL OR s.project_id=project) ON CONFLICT DO NOTHING;END IF;
 IF supervisors OR record_kind IN ('OBSERVATION','ABSENCE_ALERT') THEN INSERT INTO workshop_record_recipients SELECT DISTINCT result,s.supervisor_id,NULL::timestamptz FROM project_supervisors s JOIN projects p ON p.id=s.project_id WHERE p.term_id=term AND (project IS NULL OR p.id=project) ON CONFLICT DO NOTHING;END IF;
 RETURN result;
END $$;
CREATE FUNCTION check_repeated_absence(actor UUID,student UUID,term UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE threshold NUMERIC;days BIGINT;missed BIGINT;project UUID;
BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 PERFORM 1 FROM accounts WHERE id=student FOR UPDATE;
 SELECT limit_percent INTO threshold FROM workshop_absence_policies WHERE term_id=term;
 SELECT working_days,absences INTO days,missed FROM workshop_absence_summary WHERE student_id=student AND term_id=term;
 IF threshold IS NULL OR days IS NULL OR days=0 OR 100.0*missed/days<=threshold THEN RETURN NULL;END IF;
 SELECT project_id INTO project FROM project_students WHERE student_id=student AND term_id=term AND left_at IS NULL;
 RETURN create_workshop_record(actor,term,project,'ABSENCE_ALERT','Repeated absence threshold exceeded.',false,true,student);
END $$;
CREATE FUNCTION edit_workshop_record(actor UUID,record UUID,expected INT,message TEXT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;BEGIN SELECT revision INTO value FROM workshop_records WHERE id=record AND created_by=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager author required';END IF;PERFORM data_revision(value,expected);
 UPDATE workshop_records SET body=message,updated_by=actor WHERE id=record RETURNING revision INTO value;RETURN value;END $$;
CREATE FUNCTION read_workshop_record(actor UUID,record UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result JSONB;BEGIN PERFORM 1 FROM workshop_records WHERE id=record FOR UPDATE;
 IF NOT workshop_record_access(actor,record) THEN RAISE EXCEPTION 'Workshop record access denied';END IF;
 IF NOT data_manager(actor) THEN UPDATE workshop_record_recipients SET read_at=COALESCE(read_at,clock_timestamp()) WHERE record_id=record AND account_id=actor;
  IF NOT FOUND OR NOT communication_actor(actor) THEN RAISE EXCEPTION 'Workshop record access denied';END IF;END IF;
 UPDATE notification_inbox i SET read_at=COALESCE(i.read_at,clock_timestamp()) FROM notification_events e WHERE e.id=i.event_id AND e.workshop_record_id=record AND i.recipient_id=actor;
 SELECT to_jsonb(r) INTO result FROM workshop_records r WHERE id=record;RETURN result;END $$;


-- Workshop inbox bridge: same private inbox, no external delivery.
CREATE FUNCTION workshop_record_access(actor UUID,record UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT communication_actor(actor) AND EXISTS(SELECT 1 FROM workshop_records r WHERE r.id=record AND (data_manager(actor) OR EXISTS(SELECT 1 FROM workshop_record_recipients i WHERE i.record_id=r.id AND i.account_id=actor) AND (r.project_id IS NULL OR team_member(actor,r.project_id) OR project_supervisor(actor,r.project_id))))
$$;
ALTER TABLE notification_events ADD COLUMN workshop_record_id UUID REFERENCES workshop_records(id);
DO $$ DECLARE name TEXT;BEGIN FOR name IN SELECT conname FROM pg_constraint WHERE conrelid='notification_events'::regclass AND contype='c' AND (pg_get_constraintdef(oid) LIKE '%kind%' OR pg_get_constraintdef(oid) LIKE '%num_nonnulls%') LOOP EXECUTE format('ALTER TABLE notification_events DROP CONSTRAINT %I',name);END LOOP;END $$;
ALTER TABLE notification_events ADD CONSTRAINT notification_kind_source CHECK(kind IN ('MESSAGE','MEETING_INVITE','MEETING_UPDATED','MEETING_RESPONSE','REPORT_SUBMITTED','REPORT_REVIEWED','REPORT_REOPENED','WORKSHOP_UPDATE')),
 ADD CONSTRAINT notification_source_count CHECK(num_nonnulls(message_id,meeting_id,submission_id,feedback_id,document_id,workshop_record_id)=1),
 ADD CONSTRAINT notification_source_message CHECK((kind='MESSAGE')=(message_id IS NOT NULL)),
 ADD CONSTRAINT notification_source_meeting CHECK((kind IN ('MEETING_INVITE','MEETING_UPDATED','MEETING_RESPONSE'))=(meeting_id IS NOT NULL)),
 ADD CONSTRAINT notification_source_submission CHECK((kind='REPORT_SUBMITTED')=(submission_id IS NOT NULL)),
 ADD CONSTRAINT notification_source_feedback CHECK((kind='REPORT_REVIEWED')=(feedback_id IS NOT NULL)),
 ADD CONSTRAINT notification_source_document CHECK((kind='REPORT_REOPENED')=(document_id IS NOT NULL)),
 ADD CONSTRAINT notification_source_workshop CHECK((kind='WORKSHOP_UPDATE')=(workshop_record_id IS NOT NULL));
CREATE OR REPLACE FUNCTION notification_recipient_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE event notification_events%ROWTYPE;allowed BOOLEAN;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Notification history cannot be deleted; dismiss it'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.event_id,NEW.recipient_id) IS DISTINCT FROM ROW(OLD.event_id,OLD.recipient_id) OR
   OLD.read_at IS NOT NULL AND NEW.read_at IS DISTINCT FROM OLD.read_at OR
   OLD.dismissed_at IS NOT NULL AND NEW.dismissed_at IS DISTINCT FROM OLD.dismissed_at
  THEN RAISE EXCEPTION 'Notification identity and first-read state are immutable'; END IF;RETURN NEW;
 END IF;
 SELECT * INTO event FROM notification_events WHERE id=NEW.event_id;
 IF NEW.recipient_id=event.actor_id THEN RAISE EXCEPTION 'No self notification'; END IF;
 CASE event.kind
 WHEN 'MESSAGE' THEN SELECT conversation_access(NEW.recipient_id,m.conversation_id) INTO allowed FROM chat_messages m WHERE id=event.message_id;
 WHEN 'MEETING_INVITE' THEN allowed=(event.data->>'target')=NEW.recipient_id::text AND meeting_access(NEW.recipient_id,event.meeting_id);
 WHEN 'MEETING_RESPONSE' THEN SELECT organizer_id=NEW.recipient_id INTO allowed FROM meetings WHERE id=event.meeting_id;
 WHEN 'MEETING_UPDATED' THEN allowed=meeting_access(NEW.recipient_id,event.meeting_id);
 WHEN 'REPORT_SUBMITTED' THEN SELECT project_supervisor(NEW.recipient_id,d.project_id) INTO allowed FROM report_submissions s JOIN report_documents d ON d.id=s.document_id WHERE s.id=event.submission_id;
 WHEN 'REPORT_REVIEWED' THEN SELECT team_member(NEW.recipient_id,d.project_id) INTO allowed FROM report_feedback f JOIN report_submissions s ON s.id=f.submission_id JOIN report_documents d ON d.id=s.document_id WHERE f.id=event.feedback_id;
 WHEN 'REPORT_REOPENED' THEN SELECT team_member(NEW.recipient_id,project_id) INTO allowed FROM report_documents WHERE id=event.document_id;
 WHEN 'WORKSHOP_UPDATE' THEN allowed=workshop_record_access(NEW.recipient_id,event.workshop_record_id);
 END CASE;
 IF allowed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Notification recipient scope invalid'; END IF;RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION read_notifications(actor UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered recipient required'; END IF;
 RETURN (SELECT COALESCE(jsonb_agg(item ORDER BY created_at DESC),'[]') FROM (
  SELECT e.id,e.kind,e.message_id,e.meeting_id,e.submission_id,e.feedback_id,e.document_id,e.workshop_record_id,e.created_at,i.read_at,i.dismissed_at
  FROM notification_events e JOIN notification_inbox i ON i.event_id=e.id WHERE i.recipient_id=actor AND i.dismissed_at IS NULL
  AND (e.message_id IS NULL OR EXISTS(SELECT 1 FROM chat_messages m WHERE m.id=e.message_id AND conversation_access(actor,m.conversation_id)))
  AND (e.meeting_id IS NULL OR meeting_access(actor,e.meeting_id))
  AND (e.submission_id IS NULL OR EXISTS(SELECT 1 FROM report_submissions s JOIN report_documents d ON d.id=s.document_id WHERE s.id=e.submission_id AND project_supervisor(actor,d.project_id)))
  AND (e.feedback_id IS NULL OR EXISTS(SELECT 1 FROM report_feedback f JOIN report_submissions s ON s.id=f.submission_id JOIN report_documents d ON d.id=s.document_id WHERE f.id=e.feedback_id AND team_member(actor,d.project_id)))
  AND (e.document_id IS NULL OR EXISTS(SELECT 1 FROM report_documents d WHERE d.id=e.document_id AND team_member(actor,d.project_id)))
  AND (e.workshop_record_id IS NULL OR workshop_record_access(actor,e.workshop_record_id))
  ORDER BY e.created_at DESC LIMIT 100
 ) item);
END $$;
CREATE FUNCTION emit_workshop_notification(record UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;r workshop_records%ROWTYPE;
BEGIN SELECT * INTO r FROM workshop_records WHERE id=record;
 IF NOT FOUND THEN RAISE EXCEPTION 'Workshop record missing';END IF;
 INSERT INTO notification_events(event_key,kind,actor_id,workshop_record_id,created_at) VALUES('workshop-record:'||record,'WORKSHOP_UPDATE',r.created_by,record,r.created_at) ON CONFLICT(event_key) DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN SELECT id INTO result FROM notification_events WHERE event_key='workshop-record:'||record;END IF;
 INSERT INTO notification_inbox(event_id,recipient_id) SELECT result,account_id FROM workshop_record_recipients WHERE record_id=record AND account_id<>r.created_by ON CONFLICT DO NOTHING;
 RETURN result;
END $$;
CREATE FUNCTION workshop_inbox_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE record UUID;BEGIN FOR record IN SELECT DISTINCT record_id FROM added_recipients LOOP PERFORM emit_workshop_notification(record);END LOOP;RETURN NULL;END $$;
CREATE TRIGGER workshop_inbox AFTER INSERT ON workshop_record_recipients REFERENCING NEW TABLE AS added_recipients FOR EACH STATEMENT EXECUTE FUNCTION workshop_inbox_trigger();

REVOKE ALL ON workshop_days,workshop_absence_policies,workshop_attendance,workshop_tables,workshop_table_assignments,workshop_table_history,workshop_handovers,workshop_handover_items,workshop_return_updates,workshop_records,workshop_record_recipients,workshop_absence_summary,workshop_handover_summary FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;

-- Source: catalog-stage7/sql/17-catalog-schema.sql
BEGIN;
SET search_path=labassist_student,public;
CREATE TABLE catalog_categories(id TEXT PRIMARY KEY,name_en TEXT NOT NULL,name_ar TEXT NOT NULL,sort_order INT NOT NULL UNIQUE);
CREATE TABLE catalog_models (
 id TEXT NOT NULL,version INT NOT NULL CHECK(version>0),name TEXT NOT NULL,definition JSONB NOT NULL CHECK(jsonb_typeof(definition)='object'),
 render_units TEXT NOT NULL DEFAULT 'MODEL_UNITS' CHECK(render_units='MODEL_UNITS'),
 physical_dimensions_mm JSONB CHECK(physical_dimensions_mm IS NULL OR jsonb_typeof(physical_dimensions_mm)='object'),
 sealed BOOLEAN NOT NULL DEFAULT false,PRIMARY KEY(id,version)
);
CREATE TABLE catalog_pins (
 model_id TEXT NOT NULL,model_version INT NOT NULL,pin_index INT NOT NULL CHECK(pin_index>=0),
 name TEXT NOT NULL,kind TEXT NOT NULL,direction TEXT NOT NULL CHECK(direction IN ('in','out','io')),
 connector TEXT NOT NULL CHECK(connector IN ('socket','header','terminal','solder','unknown')),voltage NUMERIC,
 physical_number INT,functions TEXT NOT NULL DEFAULT '',PRIMARY KEY(model_id,model_version,pin_index),
 FOREIGN KEY(model_id,model_version) REFERENCES catalog_models(id,version)
);
CREATE TABLE catalog_parts (
 key TEXT PRIMARY KEY,model_id TEXT NOT NULL,model_version INT NOT NULL,category_id TEXT NOT NULL REFERENCES catalog_categories(id),
 name_en TEXT NOT NULL,name_ar TEXT NOT NULL,typical_supply_voltage NUMERIC CHECK(typical_supply_voltage>=0),
 description TEXT NOT NULL DEFAULT '',active BOOLEAN NOT NULL DEFAULT true,revision INT NOT NULL DEFAULT 0,
 FOREIGN KEY(model_id,model_version) REFERENCES catalog_models(id,version)
);
CREATE TABLE catalog_documents (
 part_key TEXT NOT NULL REFERENCES catalog_parts(key),url TEXT NOT NULL CHECK(url ~ '^https?://[^[:space:]]+$'),
 title TEXT NOT NULL,publisher TEXT NOT NULL,format TEXT NOT NULL CHECK(format IN ('PDF','Web')),reference_scope TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '',source_verified_at TIMESTAMPTZ,PRIMARY KEY(part_key,url)
);
CREATE TABLE catalog_guides (
 part_key TEXT NOT NULL REFERENCES catalog_parts(key),version INT NOT NULL CHECK(version>0),language TEXT NOT NULL CHECK(language IN ('ar','en','mixed')),
 content JSONB NOT NULL CHECK(jsonb_typeof(content)='object'),PRIMARY KEY(part_key,version,language)
);
CREATE TRIGGER guide_immutable BEFORE UPDATE OR DELETE ON catalog_guides FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER pin_immutable BEFORE UPDATE OR DELETE ON catalog_pins FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE FUNCTION catalog_model_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='catalog_pins' THEN
  IF EXISTS(SELECT 1 FROM catalog_models WHERE id=NEW.model_id AND version=NEW.model_version AND sealed) THEN
   IF EXISTS(SELECT 1 FROM catalog_pins p WHERE p.model_id=NEW.model_id AND p.model_version=NEW.model_version AND p.pin_index=NEW.pin_index AND to_jsonb(p)=to_jsonb(NEW)) THEN RETURN NULL;END IF;
   RAISE EXCEPTION 'Sealed model pins are immutable';END IF;
 ELSE
  IF TG_OP='DELETE' OR OLD.sealed THEN RAISE EXCEPTION 'Sealed model is immutable; create a new version';END IF;
  IF ROW(NEW.id,NEW.version,NEW.name,NEW.definition,NEW.render_units,NEW.physical_dimensions_mm) IS DISTINCT FROM ROW(OLD.id,OLD.version,OLD.name,OLD.definition,OLD.render_units,OLD.physical_dimensions_mm) THEN RAISE EXCEPTION 'Model identity and definition are immutable';END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER pin_model_scope BEFORE INSERT ON catalog_pins FOR EACH ROW EXECUTE FUNCTION catalog_model_guard();
CREATE TRIGGER model_history BEFORE UPDATE OR DELETE ON catalog_models FOR EACH ROW EXECUTE FUNCTION catalog_model_guard();
CREATE FUNCTION update_catalog_part(actor UUID,part TEXT,expected INT,english TEXT,arabic TEXT,description TEXT,enabled BOOLEAN) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager curator required';END IF;
 SELECT revision INTO value FROM catalog_parts WHERE key=part FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Catalog part not found';END IF;PERFORM data_revision(value,expected);
 IF length(btrim(english))=0 OR length(btrim(arabic))=0 THEN RAISE EXCEPTION 'Both display names required';END IF;
 UPDATE catalog_parts SET name_en=english,name_ar=arabic,description=update_catalog_part.description,active=enabled,revision=revision+1 WHERE key=part RETURNING revision INTO value;RETURN value;
END $$;
ALTER TABLE project_bom_items ADD COLUMN catalog_key TEXT REFERENCES catalog_parts(key);
CREATE INDEX bom_catalog_lookup ON project_bom_items(catalog_key);
CREATE FUNCTION read_catalog(actor UUID,search TEXT DEFAULT '') RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered reader required';END IF;
 RETURN (SELECT COALESCE(jsonb_agg(x ORDER BY name_en),'[]') FROM (SELECT p.* FROM catalog_parts p WHERE p.active AND
 (strpos(lower(p.name_en),lower(search))>0 OR strpos(p.name_ar,search)>0 OR strpos(p.key,lower(search))>0)) x);
END $$;
REVOKE ALL ON catalog_categories,catalog_models,catalog_pins,catalog_parts,catalog_documents,catalog_guides FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;

-- Source: marketplace-stage8/sql/19-marketplace-schema.sql
BEGIN;
SET search_path=labassist_student,public;
CREATE TABLE market_sellers (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,kind TEXT NOT NULL CHECK(kind IN ('SHOP','STUDENT')),
 account_id UUID REFERENCES accounts(id),name TEXT NOT NULL CHECK(length(btrim(name))>0),city TEXT NOT NULL,
 latitude NUMERIC(9,6) CHECK(latitude BETWEEN -90 AND 90),longitude NUMERIC(9,6) CHECK(longitude BETWEEN -180 AND 180),
 phone TEXT,website TEXT CHECK(website IS NULL OR website ~ '^https?://'),is_demo BOOLEAN NOT NULL DEFAULT false,
 CHECK((latitude IS NULL)=(longitude IS NULL)),CHECK(kind='STUDENT' OR account_id IS NULL)
);
CREATE TABLE resale_sources (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,seller_id UUID NOT NULL REFERENCES market_sellers(id),
 kind TEXT NOT NULL CHECK(kind IN ('FACEBOOK','SPREADSHEET','SHOP_PAGE','MANUAL')),url TEXT CHECK(url IS NULL OR url ~ '^https?://'),
 file_id UUID REFERENCES files(id),observed_at TIMESTAMPTZ NOT NULL,content_hash CHAR(64) CHECK(content_hash ~ '^[0-9a-f]{64}$'),
 status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),reviewed_by UUID REFERENCES accounts(id),reviewed_at TIMESTAMPTZ,
 CHECK((status='PENDING')=(reviewed_by IS NULL AND reviewed_at IS NULL)),UNIQUE(id,seller_id)
);
CREATE TABLE market_offers (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,seller_id UUID NOT NULL REFERENCES market_sellers(id),source_id UUID NOT NULL,
 catalog_key TEXT REFERENCES catalog_parts(key),part_name TEXT NOT NULL,variant TEXT NOT NULL DEFAULT '',condition TEXT NOT NULL CHECK(condition IN ('NEW','USED')),
 unit_price NUMERIC(14,2) NOT NULL CHECK(unit_price>=0 AND unit_price<>'NaN'::numeric),currency CHAR(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 quantity INT NOT NULL CHECK(quantity>=0),shipping_cost NUMERIC(14,2) CHECK(shipping_cost>=0 AND shipping_cost<>'NaN'::numeric),
 valid_until TIMESTAMPTZ,status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('DRAFT','ACTIVE','SOLD','EXPIRED','WITHDRAWN')),
 updated_by UUID NOT NULL REFERENCES accounts(id),revision INT NOT NULL DEFAULT 0,updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(source_id,seller_id) REFERENCES resale_sources(id,seller_id)
);
CREATE TABLE market_offer_history (
 offer_id UUID NOT NULL REFERENCES market_offers(id),revision INT NOT NULL,snapshot JSONB NOT NULL,
 changed_by UUID NOT NULL REFERENCES accounts(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(offer_id,revision)
);
CREATE TABLE market_bookmarks(student_id UUID NOT NULL REFERENCES accounts(id),offer_id UUID NOT NULL REFERENCES market_offers(id),PRIMARY KEY(student_id,offer_id));
CREATE TRIGGER market_history_immutable BEFORE UPDATE OR DELETE ON market_offer_history FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE INDEX market_comparison ON market_offers(catalog_key,currency,condition,unit_price) WHERE status='ACTIVE';
CREATE FUNCTION resale_source_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Source provenance cannot be deleted';END IF;
 IF NEW.status<>'PENDING' AND (NOT data_manager(NEW.reviewed_by) OR NEW.reviewed_at IS NULL) THEN RAISE EXCEPTION 'Manager source review required';END IF;
 IF NEW.file_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM files WHERE id=NEW.file_id AND status='READY' AND sha256 IS NOT NULL) THEN RAISE EXCEPTION 'Source sheet must be a ready hashed file';END IF;
 IF TG_OP='UPDATE' AND ROW(NEW.id,NEW.seller_id,NEW.kind,NEW.url,NEW.file_id,NEW.observed_at,NEW.content_hash) IS DISTINCT FROM ROW(OLD.id,OLD.seller_id,OLD.kind,OLD.url,OLD.file_id,OLD.observed_at,OLD.content_hash) THEN RAISE EXCEPTION 'Source evidence is immutable';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER source_scope BEFORE INSERT OR UPDATE OR DELETE ON resale_sources FOR EACH ROW EXECUTE FUNCTION resale_source_guard();
CREATE FUNCTION market_offer_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Offer history cannot be deleted';END IF;
 IF NOT(data_manager(NEW.updated_by) OR data_student(NEW.updated_by) AND EXISTS(SELECT 1 FROM market_sellers WHERE id=NEW.seller_id AND account_id=NEW.updated_by)) THEN RAISE EXCEPTION 'Seller or manager curator required';END IF;
 IF NEW.status='ACTIVE' AND NOT EXISTS(SELECT 1 FROM resale_sources WHERE id=NEW.source_id AND seller_id=NEW.seller_id AND status='APPROVED') THEN RAISE EXCEPTION 'Active offer requires reviewed source';END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.seller_id,NEW.source_id,NEW.catalog_key,NEW.variant,NEW.condition,NEW.currency) IS DISTINCT FROM ROW(OLD.id,OLD.seller_id,OLD.source_id,OLD.catalog_key,OLD.variant,OLD.condition,OLD.currency) THEN RAISE EXCEPTION 'Offer comparison identity is immutable';END IF;
  NEW.revision=OLD.revision+1;
 END IF;NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER offer_scope BEFORE INSERT OR UPDATE OR DELETE ON market_offers FOR EACH ROW EXECUTE FUNCTION market_offer_guard();
CREATE FUNCTION market_history_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN INSERT INTO market_offer_history VALUES(NEW.id,NEW.revision,to_jsonb(NEW),NEW.updated_by,clock_timestamp());RETURN NEW;END $$;
CREATE TRIGGER offer_history AFTER INSERT OR UPDATE ON market_offers FOR EACH ROW EXECUTE FUNCTION market_history_trigger();
CREATE FUNCTION update_market_offer(actor UUID,offer UUID,expected INT,price NUMERIC,available INT,new_status TEXT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;BEGIN SELECT revision INTO value FROM market_offers WHERE id=offer FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found';END IF;PERFORM data_revision(value,expected);
 UPDATE market_offers SET unit_price=price,quantity=available,status=new_status,updated_by=actor WHERE id=offer RETURNING revision INTO value;RETURN value;END $$;
CREATE FUNCTION bookmark_market_offer(actor UUID,offer UUID,save BOOLEAN) RETURNS VOID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Student required';END IF;
 IF save THEN INSERT INTO market_bookmarks VALUES(actor,offer) ON CONFLICT DO NOTHING;ELSE DELETE FROM market_bookmarks WHERE student_id=actor AND offer_id=offer;END IF;END $$;
CREATE FUNCTION compare_part_offers(actor UUID,part TEXT,money CHAR(3),item_condition TEXT DEFAULT NULL,item_variant TEXT DEFAULT '',include_demo BOOLEAN DEFAULT false) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered reader required';END IF;
 RETURN (SELECT COALESCE(jsonb_agg(x ORDER BY unit_price,id),'[]') FROM (
  SELECT o.id,o.part_name,o.variant,o.condition,o.unit_price,o.currency,o.quantity,o.shipping_cost,s.name AS seller,s.city,s.latitude,s.longitude,s.phone,s.website,s.kind AS seller_kind,s.is_demo,r.url AS source_url,r.observed_at,r.reviewed_at
  FROM market_offers o JOIN market_sellers s ON s.id=o.seller_id JOIN resale_sources r ON r.id=o.source_id
  WHERE o.catalog_key=part AND o.currency=money AND o.variant=item_variant AND (item_condition IS NULL OR o.condition=item_condition)
   AND o.status='ACTIVE' AND r.status='APPROVED' AND o.quantity>0 AND (o.valid_until IS NULL OR o.valid_until>=clock_timestamp()) AND (include_demo OR NOT s.is_demo)
 ) x);
END $$;
ALTER TABLE project_expenses ADD COLUMN market_seller_id UUID REFERENCES market_sellers(id);
ALTER TABLE project_expense_lines ADD COLUMN market_offer_id UUID REFERENCES market_offers(id);
REVOKE ALL ON market_sellers,resale_sources,market_offers,market_offer_history,market_bookmarks FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;

-- Source: circuits-stage9/sql/21-circuits-schema.sql
BEGIN;
SET search_path=labassist_student,public;
CREATE TABLE circuit_documents (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,owner_id UUID NOT NULL REFERENCES accounts(id),project_id UUID REFERENCES projects(id),
 name TEXT NOT NULL CHECK(length(btrim(name))>0),team_shared BOOLEAN NOT NULL DEFAULT false,
 request_key UUID NOT NULL,request_payload JSONB NOT NULL,head_version UUID,share_checkpoint_version UUID,origin_version UUID,
 updated_by UUID NOT NULL REFERENCES accounts(id),revision INT NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(NOT team_shared OR project_id IS NOT NULL),UNIQUE(owner_id,request_key),UNIQUE(id,owner_id)
);
CREATE TABLE circuit_versions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),circuit_id UUID NOT NULL REFERENCES circuit_documents(id),version_number INT NOT NULL CHECK(version_number>0),
 label TEXT NOT NULL DEFAULT '',data JSONB NOT NULL CHECK(jsonb_typeof(data)='object'),created_by UUID NOT NULL REFERENCES accounts(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(circuit_id,version_number),UNIQUE(id,circuit_id)
);
ALTER TABLE circuit_documents ADD FOREIGN KEY(head_version,id) REFERENCES circuit_versions(id,circuit_id);
ALTER TABLE circuit_documents ADD FOREIGN KEY(share_checkpoint_version,id) REFERENCES circuit_versions(id,circuit_id);
ALTER TABLE circuit_documents ADD FOREIGN KEY(origin_version) REFERENCES circuit_versions(id);
CREATE TABLE circuit_version_parts (
 version_id UUID NOT NULL REFERENCES circuit_versions(id),instance_key TEXT NOT NULL,model_id TEXT NOT NULL,model_version INT NOT NULL,
 x NUMERIC NOT NULL,z NUMERIC NOT NULL,rotation INT NOT NULL CHECK(rotation BETWEEN 0 AND 3),properties JSONB NOT NULL DEFAULT '{}',
 PRIMARY KEY(version_id,instance_key),FOREIGN KEY(model_id,model_version) REFERENCES catalog_models(id,version)
);
CREATE TABLE circuit_version_wires (
 version_id UUID NOT NULL REFERENCES circuit_versions(id),instance_key TEXT NOT NULL,
 from_part TEXT NOT NULL,from_pin INT NOT NULL CHECK(from_pin>=0),to_part TEXT NOT NULL,to_pin INT NOT NULL CHECK(to_pin>=0),
 wire_type TEXT NOT NULL CHECK(wire_type IN ('jumper-mm','jumper-mf','jumper-fm','jumper-ff','power')),
 color TEXT NOT NULL CHECK(color ~ '^#[0-9A-Fa-f]{6}$'),gauge INT,control_point JSONB,
 PRIMARY KEY(version_id,instance_key),FOREIGN KEY(version_id,from_part) REFERENCES circuit_version_parts(version_id,instance_key),
 FOREIGN KEY(version_id,to_part) REFERENCES circuit_version_parts(version_id,instance_key),CHECK(ROW(from_part,from_pin)<>ROW(to_part,to_pin)),
 CHECK((wire_type='power' AND gauge IN (18,20,22)) OR (wire_type<>'power' AND gauge IS NULL))
);
CREATE TABLE circuit_publications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),circuit_id UUID NOT NULL,version_id UUID NOT NULL,
 published_by UUID NOT NULL REFERENCES accounts(id),title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',
 copy_mode TEXT NOT NULL CHECK(copy_mode IN ('VIEW','COPY')),active BOOLEAN NOT NULL DEFAULT true,revision INT NOT NULL DEFAULT 0,
 published_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(circuit_id,version_id),UNIQUE(id,version_id),FOREIGN KEY(version_id,circuit_id) REFERENCES circuit_versions(id,circuit_id)
);
CREATE TABLE circuit_copy_requests (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),publication_id UUID NOT NULL REFERENCES circuit_publications(id),student_id UUID NOT NULL REFERENCES accounts(id),
 status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','DENIED')),decided_by UUID REFERENCES accounts(id),revision INT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(publication_id,student_id),CHECK((status='PENDING')=(decided_by IS NULL))
);
CREATE TABLE circuit_forks (
 owner_id UUID NOT NULL REFERENCES accounts(id),request_key UUID NOT NULL,publication_id UUID NOT NULL REFERENCES circuit_publications(id),
 source_version UUID NOT NULL REFERENCES circuit_versions(id),copy_id UUID NOT NULL UNIQUE REFERENCES circuit_documents(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(owner_id,request_key),
 FOREIGN KEY(publication_id,source_version) REFERENCES circuit_publications(id,version_id),FOREIGN KEY(copy_id,owner_id) REFERENCES circuit_documents(id,owner_id)
);
CREATE INDEX circuit_model_search ON circuit_version_parts(model_id,version_id);
CREATE INDEX circuit_team_lookup ON circuit_documents(project_id) WHERE team_shared;
CREATE FUNCTION circuit_readable(actor UUID,circuit UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT data_student(actor) AND EXISTS(SELECT 1 FROM circuit_documents d WHERE d.id=circuit AND (d.owner_id=actor OR d.team_shared AND team_member(actor,d.project_id)))
$$;
CREATE FUNCTION circuit_writable(actor UUID,circuit UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT circuit_readable(actor,circuit) AND NOT EXISTS(SELECT 1 FROM circuit_documents d JOIN projects p ON p.id=d.project_id WHERE d.id=circuit AND p.status IN ('COMPLETED','ARCHIVED'))
$$;
CREATE FUNCTION circuit_document_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Circuit history cannot be deleted';END IF;
 IF TG_OP='INSERT' THEN
  IF NOT data_student(NEW.owner_id) OR NEW.updated_by<>NEW.owner_id THEN RAISE EXCEPTION 'Student owner required';END IF;
 ELSE
  IF NOT circuit_writable(NEW.updated_by,OLD.id) THEN RAISE EXCEPTION 'Editable student circuit required';END IF;
  IF ROW(NEW.id,NEW.owner_id,NEW.request_key,NEW.request_payload,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.owner_id,OLD.request_key,OLD.request_payload,OLD.created_at) THEN RAISE EXCEPTION 'Circuit identity is immutable';END IF;
  IF NEW.updated_by<>OLD.owner_id AND ROW(NEW.project_id,NEW.team_shared,NEW.name,NEW.origin_version,NEW.share_checkpoint_version) IS DISTINCT FROM ROW(OLD.project_id,OLD.team_shared,OLD.name,OLD.origin_version,OLD.share_checkpoint_version) THEN RAISE EXCEPTION 'Only owner changes circuit sharing';END IF;
  NEW.revision=OLD.revision+1;
 END IF;
 IF NEW.project_id IS NOT NULL AND NOT team_member(NEW.owner_id,NEW.project_id) THEN RAISE EXCEPTION 'Owner project membership required';END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER circuit_document_scope BEFORE INSERT OR UPDATE OR DELETE ON circuit_documents FOR EACH ROW EXECUTE FUNCTION circuit_document_guard();
CREATE TRIGGER circuit_version_immutable BEFORE UPDATE OR DELETE ON circuit_versions FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER circuit_part_immutable BEFORE UPDATE OR DELETE ON circuit_version_parts FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER circuit_wire_immutable BEFORE UPDATE OR DELETE ON circuit_version_wires FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER circuit_fork_immutable BEFORE UPDATE OR DELETE ON circuit_forks FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE FUNCTION wire_fit_checked(model_a TEXT,rev_a INT,pin_a INT,model_b TEXT,rev_b INT,pin_b INT,wire TEXT) RETURNS BOOLEAN LANGUAGE plpgsql STABLE SET search_path=labassist_student,pg_temp AS $$
DECLARE a catalog_pins%ROWTYPE;b catalog_pins%ROWTYPE;end_a TEXT;end_b TEXT;
BEGIN
 SELECT * INTO a FROM catalog_pins WHERE model_id=model_a AND model_version=rev_a AND pin_index=pin_a;
 SELECT * INTO b FROM catalog_pins WHERE model_id=model_b AND model_version=rev_b AND pin_index=pin_b;
 IF a.name IS NULL OR b.name IS NULL OR a.connector='unknown' OR b.connector='unknown' THEN RETURN false;END IF;
 IF wire='power' THEN RETURN NOT(model_a='s-60-12' AND a.name IN ('L','N','PE') OR model_b='s-60-12' AND b.name IN ('L','N','PE'));END IF;
 end_a=CASE wire WHEN 'jumper-mm' THEN 'male' WHEN 'jumper-mf' THEN 'male' WHEN 'jumper-fm' THEN 'female' WHEN 'jumper-ff' THEN 'female' END;
 end_b=CASE wire WHEN 'jumper-mm' THEN 'male' WHEN 'jumper-mf' THEN 'female' WHEN 'jumper-fm' THEN 'male' WHEN 'jumper-ff' THEN 'female' END;
 RETURN COALESCE((a.connector='socket' AND end_a='male' OR a.connector='header' AND end_a='female') AND (b.connector='socket' AND end_b='male' OR b.connector='header' AND end_b='female'),false);
END $$;
CREATE FUNCTION validate_circuit_data(content JSONB) RETURNS VOID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE part JSONB;wire JSONB;a JSONB;b JSONB;
BEGIN
 IF jsonb_typeof(content->'parts') IS DISTINCT FROM 'array' OR jsonb_typeof(content->'wires') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Circuit parts and wires arrays required';END IF;
 IF (SELECT count(*)<>count(DISTINCT x->>'id') FROM jsonb_array_elements(content->'parts') x) OR (SELECT count(*)<>count(DISTINCT x->>'id') FROM jsonb_array_elements(content->'wires') x) THEN RAISE EXCEPTION 'Duplicate circuit instance ID';END IF;
 FOR part IN SELECT x FROM jsonb_array_elements(content->'parts') x LOOP
  IF COALESCE(part->>'id','')='' OR jsonb_typeof(part->'x') IS DISTINCT FROM 'number' OR jsonb_typeof(part->'z') IS DISTINCT FROM 'number' OR jsonb_typeof(part->'rot') IS DISTINCT FROM 'number'
   OR (part->>'rot')::numeric NOT IN (0,1,2,3) OR NOT EXISTS(SELECT 1 FROM catalog_models WHERE id=part->>'type' AND version=COALESCE((part->>'modelVersion')::int,1) AND sealed)
  THEN RAISE EXCEPTION 'Invalid circuit part or sealed model';END IF;
 END LOOP;
 FOR wire IN SELECT x FROM jsonb_array_elements(content->'wires') x LOOP
  IF COALESCE(wire->>'id','')='' OR jsonb_typeof(wire->'from'->'pin') IS DISTINCT FROM 'number' OR jsonb_typeof(wire->'to'->'pin') IS DISTINCT FROM 'number'
   OR (wire->'from'->>'pin')::numeric<>trunc((wire->'from'->>'pin')::numeric) OR (wire->'to'->>'pin')::numeric<>trunc((wire->'to'->>'pin')::numeric) THEN RAISE EXCEPTION 'Invalid wire endpoint';END IF;
  SELECT x INTO a FROM jsonb_array_elements(content->'parts') x WHERE x->>'id'=wire->'from'->>'partId';
  SELECT x INTO b FROM jsonb_array_elements(content->'parts') x WHERE x->>'id'=wire->'to'->>'partId';
  IF NOT wire_fit_checked(a->>'type',COALESCE((a->>'modelVersion')::int,1),(wire->'from'->>'pin')::int,b->>'type',COALESCE((b->>'modelVersion')::int,1),(wire->'to'->>'pin')::int,COALESCE(wire->>'type','jumper-mm')) THEN RAISE EXCEPTION 'Wire connector mismatch or unverified endpoint';END IF;
 END LOOP;
END $$;
CREATE FUNCTION circuit_version_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT circuit_writable(NEW.created_by,NEW.circuit_id) THEN RAISE EXCEPTION 'Editable student circuit required';END IF;
 PERFORM 1 FROM circuit_documents WHERE id=NEW.circuit_id FOR UPDATE;
 IF NEW.version_number<>(SELECT COALESCE(max(version_number),0)+1 FROM circuit_versions WHERE circuit_id=NEW.circuit_id) THEN RAISE EXCEPTION 'Circuit version sequence conflict';END IF;
 PERFORM validate_circuit_data(NEW.data);RETURN NEW;
END $$;
CREATE TRIGGER circuit_version_scope BEFORE INSERT ON circuit_versions FOR EACH ROW EXECUTE FUNCTION circuit_version_guard();
CREATE FUNCTION circuit_publication_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Publication history cannot be deleted';END IF;
 IF NOT data_student(NEW.published_by) OR NOT EXISTS(SELECT 1 FROM circuit_documents WHERE id=NEW.circuit_id AND owner_id=NEW.published_by) THEN RAISE EXCEPTION 'Student circuit owner required';END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.circuit_id,NEW.version_id,NEW.published_by,NEW.title,NEW.description,NEW.published_at) IS DISTINCT FROM ROW(OLD.id,OLD.circuit_id,OLD.version_id,OLD.published_by,OLD.title,OLD.description,OLD.published_at) THEN RAISE EXCEPTION 'Published version is immutable';END IF;
  NEW.revision=OLD.revision+1;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER circuit_publication_scope BEFORE INSERT OR UPDATE OR DELETE ON circuit_publications FOR EACH ROW EXECUTE FUNCTION circuit_publication_guard();
CREATE FUNCTION normalized_circuit_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE content JSONB;item JSONB;
BEGIN
 SELECT data INTO content FROM circuit_versions WHERE id=NEW.version_id;
 IF TG_TABLE_NAME='circuit_version_parts' THEN
  SELECT p INTO item FROM jsonb_array_elements(content->'parts') p WHERE p->>'id'=NEW.instance_key;
  IF item IS NULL OR ROW(NEW.model_id,NEW.model_version,NEW.x,NEW.z,NEW.rotation,NEW.properties) IS DISTINCT FROM ROW(item->>'type',COALESCE((item->>'modelVersion')::int,1),(item->>'x')::numeric,(item->>'z')::numeric,(item->>'rot')::int,item-'id'-'type'-'x'-'z'-'rot') THEN RAISE EXCEPTION 'Part index must match frozen version';END IF;
 ELSE
  SELECT w INTO item FROM jsonb_array_elements(content->'wires') w WHERE w->>'id'=NEW.instance_key;
  IF item IS NULL OR ROW(NEW.from_part,NEW.from_pin,NEW.to_part,NEW.to_pin,NEW.wire_type,NEW.color,NEW.gauge,NEW.control_point) IS DISTINCT FROM ROW(item->'from'->>'partId',(item->'from'->>'pin')::int,item->'to'->>'partId',(item->'to'->>'pin')::int,COALESCE(item->>'type','jumper-mm'),item->>'color',CASE WHEN item->>'type'='power' THEN COALESCE((item->>'gauge')::int,22) END,item->'ctrl') THEN RAISE EXCEPTION 'Wire index must match frozen version';END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER circuit_part_snapshot BEFORE INSERT ON circuit_version_parts FOR EACH ROW EXECUTE FUNCTION normalized_circuit_guard();
CREATE TRIGGER circuit_wire_snapshot BEFORE INSERT ON circuit_version_wires FOR EACH ROW EXECUTE FUNCTION normalized_circuit_guard();
CREATE FUNCTION index_circuit_version() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE p JSONB;w JSONB;
BEGIN
 FOR p IN SELECT x FROM jsonb_array_elements(NEW.data->'parts') x LOOP
  INSERT INTO circuit_version_parts VALUES(NEW.id,p->>'id',p->>'type',COALESCE((p->>'modelVersion')::int,1),(p->>'x')::numeric,(p->>'z')::numeric,(p->>'rot')::int,p-'id'-'type'-'x'-'z'-'rot');
 END LOOP;
 FOR w IN SELECT x FROM jsonb_array_elements(NEW.data->'wires') x LOOP
  INSERT INTO circuit_version_wires VALUES(NEW.id,w->>'id',w->'from'->>'partId',(w->'from'->>'pin')::int,w->'to'->>'partId',(w->'to'->>'pin')::int,COALESCE(w->>'type','jumper-mm'),w->>'color',CASE WHEN w->>'type'='power' THEN COALESCE((w->>'gauge')::int,22) END,w->'ctrl');
 END LOOP;RETURN NEW;
END $$;
CREATE TRIGGER circuit_version_index AFTER INSERT ON circuit_versions FOR EACH ROW EXECUTE FUNCTION index_circuit_version();
CREATE FUNCTION save_circuit(actor UUID,circuit UUID,expected INT,content JSONB,label TEXT DEFAULT '') RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;version UUID;
BEGIN SELECT revision INTO value FROM circuit_documents WHERE id=circuit FOR UPDATE;
 IF NOT FOUND OR NOT circuit_writable(actor,circuit) THEN RAISE EXCEPTION 'Editable student circuit required';END IF;PERFORM data_revision(value,expected);
 INSERT INTO circuit_versions(circuit_id,version_number,label,data,created_by) SELECT circuit,COALESCE(max(version_number),0)+1,save_circuit.label,content,actor FROM circuit_versions WHERE circuit_id=circuit RETURNING id INTO version;
 UPDATE circuit_documents SET head_version=version,updated_by=actor WHERE id=circuit;RETURN version;
END $$;
CREATE FUNCTION create_circuit(actor UUID,request UUID,title TEXT,project UUID DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;payload JSONB;existing JSONB;
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Student owner required';END IF;PERFORM 1 FROM accounts WHERE id=actor FOR UPDATE;
 payload=jsonb_build_object('title',title,'project',project);
 SELECT id,request_payload INTO result,existing FROM circuit_documents WHERE owner_id=actor AND request_key=request;
 IF FOUND THEN IF existing<>payload THEN RAISE EXCEPTION 'Circuit key reused with different data';END IF;RETURN result;END IF;
 INSERT INTO circuit_documents(owner_id,project_id,name,request_key,request_payload,updated_by) VALUES(actor,project,title,request,payload,actor) RETURNING id INTO result;
 PERFORM save_circuit(actor,result,0,'{"parts":[],"wires":[]}','Initial');RETURN result;
END $$;
CREATE FUNCTION share_circuit_with_team(actor UUID,circuit UUID,expected INT,enabled BOOLEAN,project UUID DEFAULT NULL) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE d circuit_documents%ROWTYPE;BEGIN SELECT * INTO d FROM circuit_documents WHERE id=circuit FOR UPDATE;
 IF NOT FOUND OR d.owner_id<>actor OR NOT data_student(actor) THEN RAISE EXCEPTION 'Circuit owner required';END IF;PERFORM data_revision(d.revision,expected);
 IF enabled AND (project IS NULL OR NOT team_member(actor,project)) THEN RAISE EXCEPTION 'Own team project required';END IF;
 UPDATE circuit_documents SET team_shared=enabled,project_id=COALESCE(project,d.project_id),share_checkpoint_version=CASE WHEN enabled THEN d.head_version ELSE d.share_checkpoint_version END,updated_by=actor WHERE id=circuit RETURNING revision INTO expected;RETURN expected;
END $$;
CREATE FUNCTION read_circuit(actor UUID,circuit UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT circuit_readable(actor,circuit) THEN RAISE EXCEPTION 'Circuit access denied';END IF;
 RETURN (SELECT jsonb_build_object('id',d.id,'owner',d.owner_id,'revision',d.revision,'head_version',d.head_version,'data',v.data,'team_shared',d.team_shared) FROM circuit_documents d JOIN circuit_versions v ON v.id=d.head_version WHERE d.id=circuit);END $$;
CREATE FUNCTION publish_circuit(actor UUID,circuit UUID,version UUID,mode TEXT,title TEXT) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;BEGIN
 PERFORM 1 FROM circuit_documents WHERE id=circuit AND owner_id=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_student(actor) THEN RAISE EXCEPTION 'Student circuit owner required';END IF;
 INSERT INTO circuit_publications(circuit_id,version_id,published_by,title,copy_mode) VALUES(circuit,version,actor,title,mode)
 ON CONFLICT(circuit_id,version_id) DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN SELECT id INTO result FROM circuit_publications WHERE circuit_id=circuit AND version_id=version;END IF;RETURN result;
END $$;
CREATE FUNCTION request_circuit_copy(actor UUID,publication UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE p circuit_publications%ROWTYPE;result UUID;
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Students only';END IF;
 SELECT * INTO p FROM circuit_publications WHERE id=publication AND active FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Publication not available';END IF;
 IF p.copy_mode='COPY' OR EXISTS(SELECT 1 FROM circuit_documents d JOIN projects x ON x.id=d.project_id WHERE d.id=p.circuit_id AND x.status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'A direct copy is available; no request required';END IF;
 INSERT INTO circuit_copy_requests(publication_id,student_id) VALUES(publication,actor) ON CONFLICT(publication_id,student_id) DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN SELECT id INTO result FROM circuit_copy_requests WHERE publication_id=publication AND student_id=actor;END IF;RETURN result;
END $$;
CREATE FUNCTION decide_circuit_copy(actor UUID,request UUID,expected INT,approve BOOLEAN) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE r circuit_copy_requests%ROWTYPE;p circuit_publications%ROWTYPE;
BEGIN SELECT * INTO p FROM circuit_publications WHERE id=(SELECT publication_id FROM circuit_copy_requests WHERE id=request) FOR UPDATE;
 IF NOT FOUND OR p.published_by<>actor OR NOT data_student(actor) THEN RAISE EXCEPTION 'Published circuit owner required';END IF;
 SELECT * INTO r FROM circuit_copy_requests WHERE id=request FOR UPDATE;PERFORM data_revision(r.revision,expected);
 IF r.status<>'PENDING' THEN RAISE EXCEPTION 'Copy request already decided';END IF;
 UPDATE circuit_copy_requests SET status=CASE WHEN approve THEN 'APPROVED' ELSE 'DENIED' END,decided_by=actor,revision=revision+1 WHERE id=request RETURNING revision INTO expected;RETURN expected;
END $$;
CREATE FUNCTION fork_circuit(actor UUID,publication UUID,request UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE p circuit_publications%ROWTYPE;result UUID;source UUID;payload JSONB;value INT;
BEGIN
 IF NOT data_student(actor) THEN RAISE EXCEPTION 'Students only';END IF;PERFORM 1 FROM accounts WHERE id=actor FOR UPDATE;
 SELECT copy_id,publication_id INTO result,source FROM circuit_forks WHERE owner_id=actor AND request_key=request;
 IF FOUND THEN IF source<>publication THEN RAISE EXCEPTION 'Fork key reused with different publication';END IF;RETURN result;END IF;
 SELECT * INTO p FROM circuit_publications WHERE id=publication AND active FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Publication not available';END IF;
 IF p.copy_mode<>'COPY' AND NOT EXISTS(SELECT 1 FROM circuit_copy_requests WHERE publication_id=publication AND student_id=actor AND status='APPROVED') AND NOT EXISTS(SELECT 1 FROM circuit_documents d JOIN projects x ON x.id=d.project_id WHERE d.id=p.circuit_id AND x.status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'Copy approval required';END IF;
 SELECT data INTO payload FROM circuit_versions WHERE id=p.version_id;
 result=create_circuit(actor,request,p.title||' (copy)');SELECT revision INTO value FROM circuit_documents WHERE id=result;
 PERFORM save_circuit(actor,result,value,payload,'Copied published version');
 UPDATE circuit_documents SET origin_version=p.version_id,updated_by=actor WHERE id=result;
 INSERT INTO circuit_forks VALUES(actor,request,publication,p.version_id,result,clock_timestamp());RETURN result;
END $$;
CREATE FUNCTION search_published_circuits(actor UUID,search TEXT DEFAULT '') RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Students only';END IF;
 RETURN (SELECT COALESCE(jsonb_agg(x),'[]') FROM (
  SELECT p.id,p.title,p.version_id,p.copy_mode,a.full_name AS student_name,pr.name AS project_name FROM circuit_publications p JOIN circuit_documents d ON d.id=p.circuit_id JOIN accounts a ON a.id=d.owner_id LEFT JOIN projects pr ON pr.id=d.project_id
  WHERE p.active AND (strpos(lower(p.title||' '||a.full_name||' '||COALESCE(pr.name,'')),lower(search))>0 OR EXISTS(SELECT 1 FROM circuit_version_parts n JOIN catalog_models m ON m.id=n.model_id AND m.version=n.model_version WHERE n.version_id=p.version_id AND strpos(lower(m.name||' '||m.id),lower(search))>0)) ORDER BY p.published_at DESC LIMIT 100
 ) x);END $$;
CREATE FUNCTION read_published_circuit(actor UUID,publication UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Students only';END IF;RETURN (SELECT v.data FROM circuit_publications p JOIN circuit_versions v ON v.id=p.version_id WHERE p.id=publication AND p.active);END $$;
CREATE FUNCTION withdraw_circuit_publication(actor UUID,publication UUID,expected INT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;BEGIN SELECT revision INTO value FROM circuit_publications WHERE id=publication AND published_by=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_student(actor) THEN RAISE EXCEPTION 'Publication owner required';END IF;PERFORM data_revision(value,expected);
 UPDATE circuit_publications SET active=false,revision=revision+1 WHERE id=publication RETURNING revision INTO value;RETURN value;END $$;
CREATE FUNCTION set_circuit_publication_access(actor UUID,publication UUID,expected INT,mode TEXT,enabled BOOLEAN) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;BEGIN SELECT revision INTO value FROM circuit_publications WHERE id=publication AND published_by=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_student(actor) THEN RAISE EXCEPTION 'Publication owner required';END IF;PERFORM data_revision(value,expected);
 UPDATE circuit_publications SET copy_mode=mode,active=enabled WHERE id=publication RETURNING revision INTO value;RETURN value;END $$;
REVOKE ALL ON circuit_documents,circuit_versions,circuit_version_parts,circuit_version_wires,circuit_publications,circuit_copy_requests,circuit_forks FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;

-- Source: learning-stage10/sql/23-learning-schema.sql
BEGIN;
SET search_path=labassist_student,public;
CREATE TABLE learning_resources (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,title_en TEXT NOT NULL,title_ar TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('ARTICLE','VIDEO','DATASHEET')),url TEXT NOT NULL UNIQUE CHECK(url ~ '^https?://[^[:space:]]+$'),
 publisher TEXT NOT NULL,language TEXT NOT NULL CHECK(language IN ('ar','en','mixed')),source_verified_at TIMESTAMPTZ
);
CREATE TABLE learning_lessons (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),slug TEXT NOT NULL,version INT NOT NULL CHECK(version>0),
 title_en TEXT NOT NULL,title_ar TEXT NOT NULL,content JSONB NOT NULL CHECK(jsonb_typeof(content)='object'),
 circuit_data JSONB NOT NULL,expected_result_en TEXT NOT NULL,expected_result_ar TEXT NOT NULL,
 published BOOLEAN NOT NULL DEFAULT true,UNIQUE(slug,version)
);
CREATE TABLE learning_lesson_parts(lesson_id UUID NOT NULL REFERENCES learning_lessons(id),catalog_key TEXT NOT NULL REFERENCES catalog_parts(key),PRIMARY KEY(lesson_id,catalog_key));
CREATE TABLE learning_lesson_resources(lesson_id UUID NOT NULL REFERENCES learning_lessons(id),resource_id UUID NOT NULL REFERENCES learning_resources(id),PRIMARY KEY(lesson_id,resource_id));
CREATE TABLE learning_bookmarks (
 student_id UUID NOT NULL REFERENCES accounts(id),lesson_id UUID REFERENCES learning_lessons(id),resource_id UUID REFERENCES learning_resources(id),
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),CHECK(num_nonnulls(lesson_id,resource_id)=1)
);
CREATE UNIQUE INDEX one_lesson_bookmark ON learning_bookmarks(student_id,lesson_id) WHERE lesson_id IS NOT NULL;
CREATE UNIQUE INDEX one_resource_bookmark ON learning_bookmarks(student_id,resource_id) WHERE resource_id IS NOT NULL;
CREATE FUNCTION learning_lesson_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN PERFORM validate_circuit_data(NEW.circuit_data);RETURN NEW;END $$;
CREATE TRIGGER lesson_circuit_scope BEFORE INSERT ON learning_lessons FOR EACH ROW EXECUTE FUNCTION learning_lesson_guard();
CREATE TRIGGER lesson_history BEFORE UPDATE OR DELETE ON learning_lessons FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE FUNCTION bookmark_learning(actor UUID,lesson UUID DEFAULT NULL,resource UUID DEFAULT NULL,save BOOLEAN DEFAULT true) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Student required';END IF;
 IF num_nonnulls(lesson,resource)<>1 THEN RAISE EXCEPTION 'Exactly one learning target required';END IF;
 PERFORM 1 FROM accounts WHERE id=actor FOR UPDATE;
 SELECT id INTO result FROM learning_bookmarks WHERE student_id=actor AND lesson_id IS NOT DISTINCT FROM lesson AND resource_id IS NOT DISTINCT FROM resource;
 IF save THEN
  IF result IS NULL THEN INSERT INTO learning_bookmarks(student_id,lesson_id,resource_id) VALUES(actor,lesson,resource) RETURNING id INTO result;END IF;
 ELSE DELETE FROM learning_bookmarks WHERE id=result AND student_id=actor;END IF;RETURN result;
END $$;
CREATE FUNCTION read_learning_bookmarks(actor UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Student required';END IF;
 RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(b)),'[]') FROM learning_bookmarks b WHERE student_id=actor);END $$;
REVOKE ALL ON learning_resources,learning_lessons,learning_lesson_parts,learning_lesson_resources,learning_bookmarks FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;

-- Source: ai-stage11/sql/25-ai-schema.sql
BEGIN;
SET search_path=labassist_student,public;
CREATE TABLE ai_conversations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,owner_id UUID NOT NULL REFERENCES accounts(id),project_id UUID REFERENCES projects(id),
 title TEXT NOT NULL,shared_with_team BOOLEAN NOT NULL DEFAULT false,revision INT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),CHECK(NOT shared_with_team OR project_id IS NOT NULL)
);
CREATE TABLE ai_jobs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id UUID NOT NULL REFERENCES ai_conversations(id),request_key UUID NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('CHAT','DESIGN')),input_snapshot JSONB NOT NULL CHECK(jsonb_typeof(input_snapshot)='object'),base_revision INT NOT NULL,
 status TEXT NOT NULL DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED')),
 worker_id TEXT,claim_token UUID,lease_until TIMESTAMPTZ,revision INT NOT NULL DEFAULT 0,
 model TEXT,result JSONB,error_text TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),finished_at TIMESTAMPTZ,
 UNIQUE(conversation_id,request_key),UNIQUE(id,conversation_id),
 CHECK((status IN ('SUCCEEDED','FAILED'))=(finished_at IS NOT NULL)),CHECK(status<>'SUCCEEDED' OR result IS NOT NULL AND model IS NOT NULL),
 CHECK(status<>'RUNNING' OR claim_token IS NOT NULL AND lease_until IS NOT NULL)
);
CREATE TABLE ai_messages (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
 role TEXT NOT NULL CHECK(role IN ('USER','ASSISTANT')),body TEXT NOT NULL CHECK(length(btrim(body))>0),request_key UUID NOT NULL,job_id UUID UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(conversation_id,request_key),
 FOREIGN KEY(job_id,conversation_id) REFERENCES ai_jobs(id,conversation_id),CHECK((role='ASSISTANT')=(job_id IS NOT NULL))
);
CREATE TABLE ai_project_designs (
 job_id UUID PRIMARY KEY REFERENCES ai_jobs(id),image_file_id UUID NOT NULL REFERENCES files(id),
 length_mm NUMERIC NOT NULL CHECK(length_mm>0 AND length_mm<1000000),width_mm NUMERIC NOT NULL CHECK(width_mm>0 AND width_mm<1000000),height_mm NUMERIC NOT NULL CHECK(height_mm>0 AND height_mm<1000000),
 sizing_method TEXT NOT NULL CHECK(length(btrim(sizing_method))>0),assumptions JSONB NOT NULL CHECK(jsonb_typeof(assumptions)='array'),
 is_estimate BOOLEAN NOT NULL DEFAULT true CHECK(is_estimate)
);
CREATE TABLE ai_part_suggestions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),job_id UUID NOT NULL REFERENCES ai_jobs(id),catalog_key TEXT REFERENCES catalog_parts(key),
 name TEXT NOT NULL,quantity INT NOT NULL CHECK(quantity>0),estimated_unit_price NUMERIC(14,2) CHECK(estimated_unit_price>=0 AND estimated_unit_price<>'NaN'::numeric),
 currency CHAR(3) CHECK(currency ~ '^[A-Z]{3}$'),reason TEXT NOT NULL,CHECK((estimated_unit_price IS NULL)=(currency IS NULL))
);
CREATE TABLE ai_sources (
 job_id UUID NOT NULL REFERENCES ai_jobs(id),url TEXT NOT NULL CHECK(url ~ '^https?://[^[:space:]]+$'),title TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('WEB','VIDEO','DATASHEET')),verified_at TIMESTAMPTZ,PRIMARY KEY(job_id,url)
);
CREATE TABLE learning_ai_snapshots (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),student_id UUID NOT NULL REFERENCES accounts(id),conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
 title TEXT NOT NULL,cutoff_sequence BIGINT NOT NULL,snapshot JSONB NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(student_id,conversation_id,cutoff_sequence)
);
ALTER TABLE project_bom_items ADD COLUMN ai_suggestion_id UUID UNIQUE REFERENCES ai_part_suggestions(id);
CREATE INDEX ai_job_queue ON ai_jobs(status,created_at) WHERE status IN ('QUEUED','RUNNING');
CREATE INDEX ai_message_thread ON ai_messages(conversation_id,sequence);
CREATE FUNCTION ai_readable(actor UUID,conversation UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT data_student(actor) AND EXISTS(SELECT 1 FROM ai_conversations c WHERE c.id=conversation AND (c.owner_id=actor OR c.shared_with_team AND team_member(actor,c.project_id)))
$$;
CREATE FUNCTION ai_bom_source_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE thread UUID;
BEGIN
 IF TG_OP='UPDATE' AND OLD.ai_suggestion_id IS NOT NULL AND NEW.ai_suggestion_id IS DISTINCT FROM OLD.ai_suggestion_id THEN RAISE EXCEPTION 'AI suggestion provenance is immutable';END IF;
 IF TG_OP='UPDATE' AND OLD.ai_suggestion_id IS NOT NULL THEN RETURN NEW;END IF;
 IF NEW.ai_suggestion_id IS NOT NULL THEN
  SELECT j.conversation_id INTO thread FROM ai_part_suggestions s JOIN ai_jobs j ON j.id=s.job_id WHERE s.id=NEW.ai_suggestion_id;
  IF NOT ai_readable(NEW.updated_by,thread) OR EXISTS(SELECT 1 FROM ai_conversations WHERE id=thread AND project_id IS NOT NULL AND project_id<>NEW.project_id) THEN RAISE EXCEPTION 'AI suggestion access denied';END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER ai_bom_source_scope BEFORE INSERT OR UPDATE ON project_bom_items FOR EACH ROW EXECUTE FUNCTION ai_bom_source_guard();
CREATE FUNCTION ai_thread_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'AI history cannot be deleted';END IF;
 IF NOT data_student(NEW.owner_id) THEN RAISE EXCEPTION 'Student AI owner required';END IF;
 IF NEW.project_id IS NOT NULL AND NOT team_member(NEW.owner_id,NEW.project_id) THEN RAISE EXCEPTION 'AI owner project membership required';END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.owner_id,NEW.project_id,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.owner_id,OLD.project_id,OLD.created_at) THEN RAISE EXCEPTION 'AI conversation identity immutable';END IF;
  NEW.revision=OLD.revision+1;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER ai_thread_scope BEFORE INSERT OR UPDATE OR DELETE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION ai_thread_guard();
CREATE TRIGGER ai_message_history BEFORE UPDATE OR DELETE ON ai_messages FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER ai_design_history BEFORE UPDATE OR DELETE ON ai_project_designs FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER ai_suggestion_history BEFORE UPDATE OR DELETE ON ai_part_suggestions FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER ai_snapshot_history BEFORE UPDATE OR DELETE ON learning_ai_snapshots FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE FUNCTION ai_job_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'AI job history cannot be deleted';END IF;
 IF TG_OP='UPDATE' AND (OLD.status IN ('SUCCEEDED','FAILED') OR ROW(NEW.id,NEW.conversation_id,NEW.request_key,NEW.kind,NEW.input_snapshot,NEW.base_revision,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.conversation_id,OLD.request_key,OLD.kind,OLD.input_snapshot,OLD.base_revision,OLD.created_at)) THEN RAISE EXCEPTION 'AI job input and terminal result are immutable';END IF;
 IF TG_OP='UPDATE' THEN NEW.revision=OLD.revision+1;END IF;RETURN NEW;
END $$;
CREATE TRIGGER ai_job_scope BEFORE UPDATE OR DELETE ON ai_jobs FOR EACH ROW EXECUTE FUNCTION ai_job_guard();
CREATE FUNCTION create_ai_conversation(actor UUID,title TEXT,project UUID DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Student required';END IF;
 INSERT INTO ai_conversations(owner_id,project_id,title) VALUES(actor,project,title) RETURNING id INTO result;RETURN result;END $$;
CREATE FUNCTION set_ai_sharing(actor UUID,conversation UUID,expected INT,shared BOOLEAN) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;BEGIN SELECT revision INTO value FROM ai_conversations WHERE id=conversation AND owner_id=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_student(actor) THEN RAISE EXCEPTION 'AI conversation owner required';END IF;PERFORM data_revision(value,expected);
 UPDATE ai_conversations SET shared_with_team=shared WHERE id=conversation RETURNING revision INTO value;RETURN value;END $$;
CREATE FUNCTION append_ai_message(actor UUID,conversation UUID,expected INT,request UUID,message TEXT) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;existing ai_messages%ROWTYPE;result UUID;
BEGIN SELECT revision INTO value FROM ai_conversations WHERE id=conversation AND owner_id=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_student(actor) THEN RAISE EXCEPTION 'AI conversation owner required';END IF;
 SELECT * INTO existing FROM ai_messages WHERE conversation_id=conversation AND request_key=request;
 IF FOUND THEN IF existing.role<>'USER' OR existing.body<>message THEN RAISE EXCEPTION 'AI message key reused with different data';END IF;RETURN existing.id;END IF;
 PERFORM data_revision(value,expected);INSERT INTO ai_messages(conversation_id,role,body,request_key) VALUES(conversation,'USER',message,request) RETURNING id INTO result;
 UPDATE ai_conversations SET revision=revision+1 WHERE id=conversation;RETURN result;
END $$;
CREATE FUNCTION request_ai_job(actor UUID,conversation UUID,expected INT,request UUID,job_kind TEXT) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;result UUID;existing_kind TEXT;input JSONB;
BEGIN SELECT revision INTO value FROM ai_conversations WHERE id=conversation AND owner_id=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_student(actor) THEN RAISE EXCEPTION 'AI conversation owner required';END IF;
 SELECT id,kind INTO result,existing_kind FROM ai_jobs WHERE conversation_id=conversation AND request_key=request;
 IF FOUND THEN IF existing_kind<>job_kind THEN RAISE EXCEPTION 'AI request key reused with different kind';END IF;RETURN result;END IF;PERFORM data_revision(value,expected);
 SELECT jsonb_build_object('messages',COALESCE(jsonb_agg(jsonb_build_object('sequence',sequence,'role',role,'body',body) ORDER BY sequence),'[]')) INTO input FROM ai_messages WHERE conversation_id=conversation;
 IF jsonb_array_length(input->'messages')=0 THEN RAISE EXCEPTION 'AI request needs student context';END IF;
 INSERT INTO ai_jobs(conversation_id,request_key,kind,input_snapshot,base_revision) VALUES(conversation,request,job_kind,input,value) RETURNING id INTO result;RETURN result;
END $$;
-- Service-worker operation. Never grant to client/student database roles.
CREATE FUNCTION claim_ai_job(worker TEXT,lease_seconds INT DEFAULT 120) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE job ai_jobs%ROWTYPE;
BEGIN IF COALESCE(length(btrim(worker)),0)=0 OR lease_seconds IS NULL OR lease_seconds NOT BETWEEN 10 AND 900 THEN RAISE EXCEPTION 'Valid worker and lease required';END IF;
 SELECT * INTO job FROM ai_jobs WHERE status='QUEUED' OR status='RUNNING' AND lease_until<clock_timestamp() ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL;END IF;
 UPDATE ai_jobs SET status='RUNNING',worker_id=worker,claim_token=gen_random_uuid(),lease_until=clock_timestamp()+make_interval(secs=>lease_seconds) WHERE id=job.id RETURNING * INTO job;
 RETURN jsonb_build_object('id',job.id,'claim_token',job.claim_token,'input',job.input_snapshot,'kind',job.kind);
END $$;
CREATE FUNCTION complete_ai_job(job UUID,token UUID,model_name TEXT,output JSONB) RETURNS VOID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current ai_jobs%ROWTYPE;owner UUID;entry JSONB;image UUID;
BEGIN
 SELECT conversation_id INTO owner FROM ai_jobs WHERE id=job;PERFORM 1 FROM ai_conversations WHERE id=owner FOR UPDATE;
 SELECT * INTO current FROM ai_jobs WHERE id=job FOR UPDATE;
 IF NOT FOUND OR current.status<>'RUNNING' OR current.claim_token IS DISTINCT FROM token OR current.lease_until<=clock_timestamp() THEN RAISE EXCEPTION 'AI claim conflict or lease expired';END IF;
 IF COALESCE(length(btrim(model_name)),0)=0 OR COALESCE(length(btrim(output->>'answer')),0)=0 THEN RAISE EXCEPTION 'Model and answer required';END IF;
 SELECT owner_id INTO owner FROM ai_conversations WHERE id=current.conversation_id;
 IF current.kind='DESIGN' THEN
  image=(output->'design'->>'image_file_id')::uuid;
  IF image IS NULL OR NOT EXISTS(SELECT 1 FROM files WHERE id=image AND uploaded_by=owner AND status='READY' AND mime_type LIKE 'image/%' AND sha256 IS NOT NULL) THEN RAISE EXCEPTION 'Design needs an owned ready image';END IF;
  INSERT INTO ai_project_designs VALUES(job,image,(output->'design'->>'length_mm')::numeric,(output->'design'->>'width_mm')::numeric,(output->'design'->>'height_mm')::numeric,output->'design'->>'method',output->'design'->'assumptions',true);
 END IF;
 FOR entry IN SELECT x FROM jsonb_array_elements(COALESCE(output->'suggestions','[]')) x LOOP
  INSERT INTO ai_part_suggestions(job_id,catalog_key,name,quantity,estimated_unit_price,currency,reason) VALUES(job,entry->>'catalog_key',entry->>'name',(entry->>'quantity')::int,(entry->>'price')::numeric,entry->>'currency',entry->>'reason');
 END LOOP;
 FOR entry IN SELECT x FROM jsonb_array_elements(COALESCE(output->'sources','[]')) x LOOP INSERT INTO ai_sources(job_id,url,title,kind) VALUES(job,entry->>'url',entry->>'title',entry->>'kind');END LOOP;
 INSERT INTO ai_messages(conversation_id,role,body,request_key,job_id) VALUES(current.conversation_id,'ASSISTANT',output->>'answer',current.id,current.id);
 UPDATE ai_conversations SET revision=revision+1 WHERE id=current.conversation_id;
 UPDATE ai_jobs SET status='SUCCEEDED',model=model_name,result=output,finished_at=clock_timestamp() WHERE id=job;
END $$;
CREATE FUNCTION fail_ai_job(job UUID,token UUID,reason TEXT) RETURNS VOID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN UPDATE ai_jobs SET status='FAILED',error_text=reason,finished_at=clock_timestamp() WHERE id=job AND status='RUNNING' AND claim_token=token AND lease_until>clock_timestamp();IF NOT FOUND THEN RAISE EXCEPTION 'AI claim conflict';END IF;END $$;
CREATE FUNCTION pin_ai_conversation(actor UUID,conversation UUID,expected INT,title TEXT) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;cutoff BIGINT;content JSONB;result UUID;
BEGIN SELECT revision INTO value FROM ai_conversations WHERE id=conversation AND owner_id=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_student(actor) THEN RAISE EXCEPTION 'AI conversation owner required';END IF;PERFORM data_revision(value,expected);
 SELECT max(sequence),jsonb_build_object('messages',COALESCE(jsonb_agg(jsonb_build_object('sequence',sequence,'role',role,'body',body) ORDER BY sequence),'[]')) INTO cutoff,content FROM ai_messages WHERE conversation_id=conversation;
 IF cutoff IS NULL THEN RAISE EXCEPTION 'Empty conversation cannot be pinned';END IF;
 content=content||jsonb_build_object('results',(SELECT COALESCE(jsonb_agg(j.result),'[]') FROM ai_jobs j WHERE j.conversation_id=conversation AND j.status='SUCCEEDED'));
 INSERT INTO learning_ai_snapshots(student_id,conversation_id,title,cutoff_sequence,snapshot) VALUES(actor,conversation,title,cutoff,content) ON CONFLICT(student_id,conversation_id,cutoff_sequence) DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN SELECT id INTO result FROM learning_ai_snapshots WHERE student_id=actor AND conversation_id=conversation AND cutoff_sequence=cutoff;END IF;RETURN result;
END $$;
CREATE FUNCTION read_ai_conversation(actor UUID,conversation UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT ai_readable(actor,conversation) THEN RAISE EXCEPTION 'AI conversation access denied';END IF;
 RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'sequence',sequence,'role',role,'body',body) ORDER BY sequence),'[]') FROM ai_messages WHERE conversation_id=conversation);END $$;
CREATE FUNCTION read_ai_snapshot(actor UUID,snapshot UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result JSONB;BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Student required';END IF;
 SELECT s.snapshot INTO result FROM learning_ai_snapshots s WHERE s.id=read_ai_snapshot.snapshot AND student_id=actor;IF NOT FOUND THEN RAISE EXCEPTION 'Private learning snapshot access denied';END IF;RETURN result;END $$;
CREATE FUNCTION apply_ai_suggestion(actor UUID,suggestion UUID,project UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE s ai_part_suggestions%ROWTYPE;thread UUID;value UUID;currency CHAR(3);
BEGIN IF NOT data_student(actor) OR NOT team_member(actor,project) THEN RAISE EXCEPTION 'Own project teammate required';END IF;
 SELECT b.currency INTO currency FROM project_budgets b WHERE project_id=project FOR UPDATE;
 IF EXISTS(SELECT 1 FROM projects WHERE id=project AND status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'Completed project is read only';END IF;
 SELECT * INTO s FROM ai_part_suggestions WHERE id=suggestion;
 SELECT j.conversation_id INTO thread FROM ai_jobs j WHERE j.id=s.job_id;
 IF NOT ai_readable(actor,thread) OR EXISTS(SELECT 1 FROM ai_conversations WHERE id=thread AND project_id IS NOT NULL AND project_id<>project) THEN RAISE EXCEPTION 'AI suggestion access denied';END IF;
 IF s.currency IS NOT NULL AND s.currency<>currency THEN RAISE EXCEPTION 'Suggestion currency differs from project budget';END IF;
 SELECT id INTO value FROM project_bom_items WHERE ai_suggestion_id=suggestion;IF FOUND THEN RETURN value;END IF;
 INSERT INTO project_bom_items(project_id,name,quantity_required,estimated_unit_price,created_by,updated_by,catalog_key,ai_suggestion_id) VALUES(project,s.name,s.quantity,s.estimated_unit_price,actor,actor,s.catalog_key,suggestion) RETURNING id INTO value;RETURN value;
END $$;
CREATE FUNCTION read_ai_job(actor UUID,job UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE conversation UUID;BEGIN SELECT conversation_id INTO conversation FROM ai_jobs WHERE id=job;
 IF NOT ai_readable(actor,conversation) THEN RAISE EXCEPTION 'AI job access denied';END IF;
 RETURN (SELECT jsonb_build_object('id',id,'kind',kind,'status',status,'model',model,'result',result,'base_revision',base_revision) FROM ai_jobs WHERE id=job);END $$;
CREATE FUNCTION read_learning_hub_saved(actor UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Student required';END IF;
 RETURN jsonb_build_object('bookmarks',read_learning_bookmarks(actor),'ai_snapshots',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'title',title,'cutoff_sequence',cutoff_sequence,'created_at',created_at)),'[]') FROM learning_ai_snapshots WHERE student_id=actor));END $$;
REVOKE ALL ON ai_conversations,ai_jobs,ai_messages,ai_project_designs,ai_part_suggestions,ai_sources,learning_ai_snapshots FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;

-- Source: department-stage12/sql/27-department-administration.sql
-- PostgreSQL 17. Apply after stages 1–11; existing accounts and projects are preserved.
BEGIN;
SET search_path=labassist_student,public;

ALTER TABLE accounts DROP CONSTRAINT accounts_role_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_role_check
 CHECK(role IN ('STUDENT','SUPERVISOR','WORKSHOP_MANAGER','DEPARTMENT_HEAD'));
ALTER TABLE accounts ADD COLUMN created_by UUID REFERENCES accounts(id);
ALTER TABLE accounts ADD COLUMN employee_number VARCHAR(5) UNIQUE;
ALTER TABLE accounts ADD CONSTRAINT employee_login_number CHECK(
 employee_number IS NULL OR
 (role='SUPERVISOR' AND employee_number ~ '^[0-9]{4}$') OR
 (role='WORKSHOP_MANAGER' AND employee_number ~ '^[0-9]{5}$'));
ALTER TABLE accounts ADD CONSTRAINT head_identity CHECK(role<>'DEPARTMENT_HEAD' OR
 (university_number IS NULL AND account_supervisor_id IS NULL AND employee_number IS NULL));

-- Replace the original student check without relying on its generated constraint name.
DO $$ DECLARE c RECORD; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='accounts'::regclass
 AND contype='c' AND pg_get_constraintdef(oid) LIKE '%account_supervisor_id IS NOT NULL%'
 LOOP EXECUTE format('ALTER TABLE accounts DROP CONSTRAINT %I',c.conname); END LOOP;
END $$;
ALTER TABLE accounts ADD CONSTRAINT student_university_identity CHECK(role<>'STUDENT' OR
 (university_number IS NOT NULL AND university_number ~ '^[0-9]{8}$'
 AND email='s'||university_number||'@stu.najah.edu' AND status<>'REFERENCE_ONLY'));
COMMENT ON COLUMN accounts.account_supervisor_id IS
 'Historical reference only. Current supervision is determined by project_supervisors; new students leave this NULL.';
COMMENT ON COLUMN accounts.created_by IS
 'Account provisioner. Legacy rows may remain NULL; new staff and student accounts require an active department head.';

CREATE OR REPLACE FUNCTION account_guard() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='UPDATE' AND ROW(NEW.role,NEW.university_number,NEW.email,NEW.account_supervisor_id)
 IS DISTINCT FROM ROW(OLD.role,OLD.university_number,OLD.email,OLD.account_supervisor_id)
 THEN RAISE EXCEPTION 'University account identity is immutable'; END IF;
 IF TG_OP='UPDATE' AND OLD.created_by IS NOT NULL AND NEW.created_by IS DISTINCT FROM OLD.created_by
 THEN RAISE EXCEPTION 'Account provisioner is immutable'; END IF;
 IF NEW.created_by IS NOT NULL AND (TG_OP='INSERT' OR NEW.created_by IS DISTINCT FROM OLD.created_by)
 AND NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.created_by AND role='DEPARTMENT_HEAD' AND status='ACTIVE')
 THEN RAISE EXCEPTION 'Active department head required to provision accounts'; END IF;
 IF TG_OP='INSERT' AND NEW.role<>'DEPARTMENT_HEAD' THEN
  IF NEW.created_by IS NULL THEN RAISE EXCEPTION 'Department head must create this account'; END IF;
  IF NEW.account_supervisor_id IS NOT NULL THEN RAISE EXCEPTION 'Assign supervisors through the project'; END IF;
  IF NEW.role IN ('SUPERVISOR','WORKSHOP_MANAGER') AND NEW.employee_number IS NULL
  THEN RAISE EXCEPTION 'Staff login number required'; END IF;
 END IF;
 RETURN NEW;
END $$;

-- A project is the team relationship anchor. It has no separate group-name field.
-- Students supply the project title later; a newly formed draft can be unnamed.
ALTER TABLE projects DROP CONSTRAINT projects_name_check;
ALTER TABLE projects ALTER COLUMN name SET DEFAULT '';
ALTER TABLE projects ADD CONSTRAINT project_title CHECK(
 length(btrim(name))<=220 AND (status='DRAFT' OR length(btrim(name))>=1));
CREATE FUNCTION department_project_creator_guard() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.formed_by AND role='DEPARTMENT_HEAD' AND status='ACTIVE')
 THEN RAISE EXCEPTION 'Active department head must form the group'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER department_project_creator BEFORE INSERT ON projects
 FOR EACH ROW EXECUTE FUNCTION department_project_creator_guard();

CREATE OR REPLACE FUNCTION validate_allocations() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM projects p JOIN accounts a ON a.id=p.formed_by WHERE a.role NOT IN ('SUPERVISOR','DEPARTMENT_HEAD')) THEN RAISE EXCEPTION 'Project provisioner role invalid'; END IF;
 IF EXISTS(SELECT 1 FROM project_supervisors ps JOIN accounts a ON a.id=ps.supervisor_id WHERE a.role<>'SUPERVISOR') THEN RAISE EXCEPTION 'Project supervisor role invalid'; END IF;
 IF EXISTS(SELECT 1 FROM project_students m JOIN accounts a ON a.id=m.student_id WHERE m.left_at IS NULL AND a.role<>'STUDENT') THEN RAISE EXCEPTION 'Only students in student teams'; END IF;
 IF EXISTS(SELECT 1 FROM projects p LEFT JOIN project_students m ON m.project_id=p.id AND m.left_at IS NULL WHERE p.status<>'ARCHIVED' GROUP BY p.id HAVING count(m.id) NOT BETWEEN 2 AND 3) THEN RAISE EXCEPTION 'Each current project needs two or three students'; END IF;
 IF EXISTS(SELECT 1 FROM projects p WHERE p.status<>'ARCHIVED' AND NOT EXISTS(SELECT 1 FROM project_supervisors ps WHERE ps.project_id=p.id)) THEN RAISE EXCEPTION 'Project needs at least one supervisor'; END IF;
 IF EXISTS(SELECT 1 FROM project_supervisors ps JOIN projects p ON p.id=ps.project_id WHERE p.status<>'ARCHIVED' GROUP BY ps.supervisor_id,p.term_id HAVING count(DISTINCT p.id)>4) THEN RAISE EXCEPTION 'Supervisor capacity is four projects per term'; END IF;
 IF EXISTS(SELECT 1 FROM projects p LEFT JOIN term_workshop_capacity c ON c.term_id=p.term_id WHERE p.status<>'ARCHIVED' GROUP BY p.term_id,c.team_capacity HAVING c.team_capacity IS NULL OR count(p.id)>c.team_capacity) THEN RAISE EXCEPTION 'Workshop team capacity exceeded or missing'; END IF;
 RETURN NULL;
END $$;


CREATE OR REPLACE FUNCTION invitation_guard() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.student_id AND role<>'DEPARTMENT_HEAD'
 AND status='PENDING_ACTIVATION') OR NOT EXISTS(SELECT 1 FROM accounts
 WHERE id=NEW.invited_by AND role='DEPARTMENT_HEAD' AND status='ACTIVE')
 THEN RAISE EXCEPTION 'Active department head and pending account required'; END IF;
 RETURN NEW;
END $$;
COMMENT ON COLUMN activation_invitations.student_id IS
 'Legacy column name: activation recipient account ID, including staff. Use account_activation_invitations.account_id in new code.';
CREATE VIEW account_activation_invitations AS SELECT id,student_id AS account_id,invited_by,
 token_hash,expires_at,used_at,revoked_at,created_at FROM activation_invitations;

CREATE FUNCTION activate_account(invitation_hash TEXT,registered_email TEXT,new_password_hash TEXT)
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE invite activation_invitations%ROWTYPE; recipient accounts%ROWTYPE;
BEGIN
 SELECT * INTO invite FROM activation_invitations WHERE token_hash=invitation_hash FOR UPDATE;
 IF NOT FOUND OR invite.used_at IS NOT NULL OR invite.revoked_at IS NOT NULL OR invite.expires_at<=clock_timestamp()
 THEN RAISE EXCEPTION 'Activation link invalid or expired'; END IF;
 SELECT * INTO recipient FROM accounts WHERE id=invite.student_id FOR UPDATE;
 IF recipient.status<>'PENDING_ACTIVATION' OR recipient.email<>lower(btrim(registered_email))
 THEN RAISE EXCEPTION 'Activation email mismatch or account already activated'; END IF;
 IF new_password_hash IS NULL OR new_password_hash NOT LIKE '$argon2id$%' OR length(new_password_hash)<60
 THEN RAISE EXCEPTION 'Backend-generated Argon2id hash required'; END IF;
 UPDATE accounts SET password_hash=new_password_hash,status='ACTIVE',activated_at=clock_timestamp() WHERE id=recipient.id;
 UPDATE activation_invitations SET used_at=clock_timestamp() WHERE id=invite.id;
 INSERT INTO audit_events(actor_id,event_key,subject_id) VALUES(recipient.id,'ACCOUNT_ACTIVATED',recipient.id);
 RETURN recipient.id;
END $$;
CREATE OR REPLACE FUNCTION activate_student(invitation_hash TEXT,registered_email TEXT,new_password_hash TEXT)
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM activation_invitations i JOIN accounts a ON a.id=i.student_id
 WHERE i.token_hash=invitation_hash AND a.role='STUDENT') THEN RAISE EXCEPTION 'Student activation required'; END IF;
 RETURN activate_account(invitation_hash,registered_email,new_password_hash);
END $$;

-- Department heads can contact staff; creation does not grant access to student group chats.
CREATE OR REPLACE FUNCTION communication_actor(actor UUID) RETURNS BOOLEAN LANGUAGE sql STABLE
SET search_path=labassist_student,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM accounts a WHERE a.id=actor AND a.status<>'DISABLED' AND
 (a.role IN ('SUPERVISOR','WORKSHOP_MANAGER','DEPARTMENT_HEAD') OR a.role='STUDENT' AND EXISTS(
 SELECT 1 FROM project_students s WHERE s.student_id=a.id AND s.left_at IS NULL)))
$$;
CREATE INDEX account_provisioner_lookup ON accounts(created_by) WHERE created_by IS NOT NULL;
REVOKE ALL ON account_activation_invitations FROM PUBLIC;
REVOKE ALL ON FUNCTION department_project_creator_guard(),activate_account(TEXT,TEXT,TEXT) FROM PUBLIC;
COMMIT;
