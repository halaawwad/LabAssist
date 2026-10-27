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
