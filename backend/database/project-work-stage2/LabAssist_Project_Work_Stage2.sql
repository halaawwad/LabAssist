-- Source: ../student-stage1/sql/01-schema.sql
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

-- Source: ../student-stage1/sql/02-demo-seed.sql
-- Synthetic first-week demonstration seed. No emails sent; no passwords or invitation tokens.
-- Replay is additive/idempotent by seed identity: never resets an activated account.
BEGIN;
SET search_path=labassist_student,public;
INSERT INTO academic_terms(id,seed_key,name,starts_on,ends_on,is_demo)
VALUES('10000000-0000-4000-8000-000000000100','DEMO_TERM','Demo term - first week',(now() AT TIME ZONE 'Asia/Hebron')::date,NULL,true)
ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO term_workshop_capacity(term_id,team_capacity) VALUES('10000000-0000-4000-8000-000000000100',25) ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,email,status)
VALUES('10000000-0000-4000-8000-000000000001','SUP01','SUPERVISOR','دكتور تجريبي 01','demo.supervisor01@najah.edu','REFERENCE_ONLY') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,email,status)
VALUES('10000000-0000-4000-8000-000000000002','SUP02','SUPERVISOR','دكتور تجريبي 02','demo.supervisor02@najah.edu','REFERENCE_ONLY') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,email,status)
VALUES('10000000-0000-4000-8000-000000000003','SUP03','SUPERVISOR','دكتور تجريبي 03','demo.supervisor03@najah.edu','REFERENCE_ONLY') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,email,status)
VALUES('10000000-0000-4000-8000-000000000004','SUP04','SUPERVISOR','دكتور تجريبي 04','demo.supervisor04@najah.edu','REFERENCE_ONLY') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,email,status)
VALUES('10000000-0000-4000-8000-000000000005','SUP05','SUPERVISOR','دكتور تجريبي 05','demo.supervisor05@najah.edu','REFERENCE_ONLY') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,email,status)
VALUES('10000000-0000-4000-8000-000000000006','SUP06','SUPERVISOR','دكتور تجريبي 06','demo.supervisor06@najah.edu','REFERENCE_ONLY') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,email,status)
VALUES('10000000-0000-4000-8000-000000000007','SUP07','SUPERVISOR','دكتور تجريبي 07','demo.supervisor07@najah.edu','REFERENCE_ONLY') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001001','STU01','STUDENT','نور أحمد سالم','20260001','s20260001@stu.najah.edu','10000000-0000-4000-8000-000000000001','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001001') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001001') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001001','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001002','STU02','STUDENT','سارة محمد حسن','20260002','s20260002@stu.najah.edu','10000000-0000-4000-8000-000000000001','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001002') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001002') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001002','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001003','STU03','STUDENT','لينا سامر عودة','20260003','s20260003@stu.najah.edu','10000000-0000-4000-8000-000000000001','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001003') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001003') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001003','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001004','STU04','STUDENT','آية خالد ناصر','20260004','s20260004@stu.najah.edu','10000000-0000-4000-8000-000000000001','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001004') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001004') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001004','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001005','STU05','STUDENT','رنا يوسف خليل','20260005','s20260005@stu.najah.edu','10000000-0000-4000-8000-000000000001','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001005') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001005') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001005','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001006','STU06','STUDENT','مريم عمر صالح','20260006','s20260006@stu.najah.edu','10000000-0000-4000-8000-000000000001','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001006') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001006') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001006','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001007','STU07','STUDENT','أحمد طارق منصور','20260007','s20260007@stu.najah.edu','10000000-0000-4000-8000-000000000007','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001007') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001007') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001007','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001008','STU08','STUDENT','عمر علي حمدان','20260008','s20260008@stu.najah.edu','10000000-0000-4000-8000-000000000002','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001008') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001008') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001008','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001009','STU09','STUDENT','ليان حسام زيد','20260009','s20260009@stu.najah.edu','10000000-0000-4000-8000-000000000002','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001009') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001009') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001009','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001010','STU10','STUDENT','دانا رائد عيسى','20260010','s20260010@stu.najah.edu','10000000-0000-4000-8000-000000000002','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001010') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001010') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001010','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001011','STU11','STUDENT','محمد أنس داود','20260011','s20260011@stu.najah.edu','10000000-0000-4000-8000-000000000002','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001011') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001011') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001011','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001012','STU12','STUDENT','يوسف إياد شهاب','20260012','s20260012@stu.najah.edu','10000000-0000-4000-8000-000000000002','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001012') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001012') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001012','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001013','STU13','STUDENT','هدى أمجد جابر','20260013','s20260013@stu.najah.edu','10000000-0000-4000-8000-000000000002','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001013') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001013') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001013','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001014','STU14','STUDENT','ريم نزار حمد','20260014','s20260014@stu.najah.edu','10000000-0000-4000-8000-000000000002','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001014') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001014') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001014','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001015','STU15','STUDENT','فراس ماهر سعد','20260015','s20260015@stu.najah.edu','10000000-0000-4000-8000-000000000002','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001015') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001015') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001015','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001016','STU16','STUDENT','جنى عادل طه','20260016','s20260016@stu.najah.edu','10000000-0000-4000-8000-000000000002','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001016') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001016') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001016','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001017','STU17','STUDENT','مالك وسام قاسم','20260017','s20260017@stu.najah.edu','10000000-0000-4000-8000-000000000002','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001017') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001017') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001017','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001018','STU18','STUDENT','سلمى وائل حجازي','20260018','s20260018@stu.najah.edu','10000000-0000-4000-8000-000000000003','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001018') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001018') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001018','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001019','STU19','STUDENT','تالا سعيد عوض','20260019','s20260019@stu.najah.edu','10000000-0000-4000-8000-000000000003','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001019') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001019') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001019','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001020','STU20','STUDENT','باسل نائل شحادة','20260020','s20260020@stu.najah.edu','10000000-0000-4000-8000-000000000003','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001020') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001020') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001020','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001021','STU21','STUDENT','رزان ناصر عامر','20260021','s20260021@stu.najah.edu','10000000-0000-4000-8000-000000000003','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001021') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001021') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001021','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001022','STU22','STUDENT','كريم فؤاد حمدان','20260022','s20260022@stu.najah.edu','10000000-0000-4000-8000-000000000003','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001022') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001022') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001022','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001023','STU23','STUDENT','شهد تيسير ياسين','20260023','s20260023@stu.najah.edu','10000000-0000-4000-8000-000000000003','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001023') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001023') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001023','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001024','STU24','STUDENT','أمير جمال نجار','20260024','s20260024@stu.najah.edu','10000000-0000-4000-8000-000000000003','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001024') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001024') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001024','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001025','STU25','STUDENT','جود شادي عزام','20260025','s20260025@stu.najah.edu','10000000-0000-4000-8000-000000000003','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001025') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001025') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001025','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001026','STU26','STUDENT','رغد زاهر حسن','20260026','s20260026@stu.najah.edu','10000000-0000-4000-8000-000000000003','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001026') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001026') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001026','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001027','STU27','STUDENT','حمزة عمار سلمان','20260027','s20260027@stu.najah.edu','10000000-0000-4000-8000-000000000004','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001027') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001027') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001027','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001028','STU28','STUDENT','لانا نضال مراد','20260028','s20260028@stu.najah.edu','10000000-0000-4000-8000-000000000004','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001028') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001028') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001028','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001029','STU29','STUDENT','رامي زياد عطا','20260029','s20260029@stu.najah.edu','10000000-0000-4000-8000-000000000004','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001029') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001029') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001029','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001030','STU30','STUDENT','هبة أشرف زيدان','20260030','s20260030@stu.najah.edu','10000000-0000-4000-8000-000000000004','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001030') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001030') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001030','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001031','STU31','STUDENT','ياسمين نبيل غانم','20260031','s20260031@stu.najah.edu','10000000-0000-4000-8000-000000000004','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001031') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001031') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001031','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001032','STU32','STUDENT','معتز ثائر بدر','20260032','s20260032@stu.najah.edu','10000000-0000-4000-8000-000000000004','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001032') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001032') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001032','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001033','STU33','STUDENT','فرح وليد سليم','20260033','s20260033@stu.najah.edu','10000000-0000-4000-8000-000000000004','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001033') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001033') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001033','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001034','STU34','STUDENT','قصي حاتم شاهين','20260034','s20260034@stu.najah.edu','10000000-0000-4000-8000-000000000005','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001034') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001034') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001034','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001035','STU35','STUDENT','ملك أسامة خضر','20260035','s20260035@stu.najah.edu','10000000-0000-4000-8000-000000000005','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001035') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001035') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001035','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001036','STU36','STUDENT','يزن مروان سرحان','20260036','s20260036@stu.najah.edu','10000000-0000-4000-8000-000000000005','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001036') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001036') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001036','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001037','STU37','STUDENT','سما فادي عثمان','20260037','s20260037@stu.najah.edu','10000000-0000-4000-8000-000000000005','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001037') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001037') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001037','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001038','STU38','STUDENT','سليم هاني مسعود','20260038','s20260038@stu.najah.edu','10000000-0000-4000-8000-000000000005','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001038') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001038') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001038','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001039','STU39','STUDENT','حلا فايز عودة','20260039','s20260039@stu.najah.edu','10000000-0000-4000-8000-000000000005','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001039') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001039') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001039','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001040','STU40','STUDENT','ليث كمال خليل','20260040','s20260040@stu.najah.edu','10000000-0000-4000-8000-000000000005','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001040') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001040') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001040','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001041','STU41','STUDENT','ديما منذر عبيد','20260041','s20260041@stu.najah.edu','10000000-0000-4000-8000-000000000006','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001041') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001041') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001041','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001042','STU42','STUDENT','زيد حسني رباح','20260042','s20260042@stu.najah.edu','10000000-0000-4000-8000-000000000006','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001042') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001042') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001042','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001043','STU43','STUDENT','روان أدهم نعيم','20260043','s20260043@stu.najah.edu','10000000-0000-4000-8000-000000000006','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001043') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001043') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001043','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001044','STU44','STUDENT','نادر توفيق شريف','20260044','s20260044@stu.najah.edu','10000000-0000-4000-8000-000000000006','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001044') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001044') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001044','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001045','STU45','STUDENT','لمى عاصم منصور','20260045','s20260045@stu.najah.edu','10000000-0000-4000-8000-000000000006','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001045') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001045') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001045','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001046','STU46','STUDENT','أنس طلال صافي','20260046','s20260046@stu.najah.edu','10000000-0000-4000-8000-000000000006','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001046') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001046') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001046','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001047','STU47','STUDENT','ميار كاظم حماد','20260047','s20260047@stu.najah.edu','10000000-0000-4000-8000-000000000006','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001047') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001047') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001047','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001048','STU48','STUDENT','إياد رشيد نمر','20260048','s20260048@stu.najah.edu','10000000-0000-4000-8000-000000000007','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001048') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001048') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001048','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001049','STU49','STUDENT','بتول عارف شقير','20260049','s20260049@stu.najah.edu','10000000-0000-4000-8000-000000000007','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001049') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001049') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001049','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001050','STU50','STUDENT','سامر عزت مطر','20260050','s20260050@stu.najah.edu','10000000-0000-4000-8000-000000000007','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001050') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001050') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001050','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001051','STU51','STUDENT','نوران رامي فراج','20260051','s20260051@stu.najah.edu','10000000-0000-4000-8000-000000000007','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001051') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001051') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001051','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001052','STU52','STUDENT','هادي جلال ناصر','20260052','s20260052@stu.najah.edu','10000000-0000-4000-8000-000000000007','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001052') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001052') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001052','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001053','STU53','STUDENT','تسنيم هشام بركات','20260053','s20260053@stu.najah.edu','10000000-0000-4000-8000-000000000007','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001053') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001053') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001053','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status)
VALUES('10000000-0000-4000-8000-000000001054','STU54','STUDENT','بلال حازم عبده','20260054','s20260054@stu.najah.edu','10000000-0000-4000-8000-000000000007','PENDING_ACTIVATION') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO student_profiles(account_id) VALUES('10000000-0000-4000-8000-000000001054') ON CONFLICT DO NOTHING;
INSERT INTO student_settings(account_id) VALUES('10000000-0000-4000-8000-000000001054') ON CONFLICT DO NOTHING;
INSERT INTO student_enrollments(student_id,term_id) VALUES('10000000-0000-4000-8000-000000001054','10000000-0000-4000-8000-000000000100') ON CONFLICT DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002001','TEAM01','10000000-0000-4000-8000-000000000100','CropBot','روبوت لمراقبة المزروعات','10000000-0000-4000-8000-000000000001','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002001','10000000-0000-4000-8000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002001','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001001'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002001' AND student_id='10000000-0000-4000-8000-000000001001')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002001','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001002'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002001' AND student_id='10000000-0000-4000-8000-000000001002')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002001','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001003'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002001' AND student_id='10000000-0000-4000-8000-000000001003')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002002','TEAM02','10000000-0000-4000-8000-000000000100','Smart Parking','نظام إرشاد للمواقف','10000000-0000-4000-8000-000000000001','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002002','10000000-0000-4000-8000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002002','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001004'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002002' AND student_id='10000000-0000-4000-8000-000000001004')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002002','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001005'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002002' AND student_id='10000000-0000-4000-8000-000000001005')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002003','TEAM03','10000000-0000-4000-8000-000000000100','WaterWatch','مراقبة جودة المياه','10000000-0000-4000-8000-000000000001','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002003','10000000-0000-4000-8000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002003','10000000-0000-4000-8000-000000000007') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002003','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001006'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002003' AND student_id='10000000-0000-4000-8000-000000001006')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002003','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001007'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002003' AND student_id='10000000-0000-4000-8000-000000001007')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002004','TEAM04','10000000-0000-4000-8000-000000000100','Smart Greenhouse','بيت زراعي ذكي','10000000-0000-4000-8000-000000000002','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002004','10000000-0000-4000-8000-000000000002') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002004','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001008'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002004' AND student_id='10000000-0000-4000-8000-000000001008')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002004','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001009'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002004' AND student_id='10000000-0000-4000-8000-000000001009')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002004','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001010'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002004' AND student_id='10000000-0000-4000-8000-000000001010')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002005','TEAM05','10000000-0000-4000-8000-000000000100','SafeGas','كشف تسرب الغاز','10000000-0000-4000-8000-000000000002','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002005','10000000-0000-4000-8000-000000000002') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002005','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001011'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002005' AND student_id='10000000-0000-4000-8000-000000001011')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002005','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001012'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002005' AND student_id='10000000-0000-4000-8000-000000001012')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002006','TEAM06','10000000-0000-4000-8000-000000000100','Solar Tracker','تتبّع اتجاه الشمس','10000000-0000-4000-8000-000000000002','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002006','10000000-0000-4000-8000-000000000002') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002006','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001013'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002006' AND student_id='10000000-0000-4000-8000-000000001013')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002006','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001014'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002006' AND student_id='10000000-0000-4000-8000-000000001014')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002007','TEAM07','10000000-0000-4000-8000-000000000100','Delivery Rover','عربة توصيل صغيرة','10000000-0000-4000-8000-000000000002','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002007','10000000-0000-4000-8000-000000000002') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002007','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001015'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002007' AND student_id='10000000-0000-4000-8000-000000001015')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002007','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001016'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002007' AND student_id='10000000-0000-4000-8000-000000001016')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002007','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001017'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002007' AND student_id='10000000-0000-4000-8000-000000001017')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002008','TEAM08','10000000-0000-4000-8000-000000000100','Smart Irrigation','ري بحسب رطوبة التربة','10000000-0000-4000-8000-000000000003','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002008','10000000-0000-4000-8000-000000000003') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002008','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001018'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002008' AND student_id='10000000-0000-4000-8000-000000001018')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002008','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001019'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002008' AND student_id='10000000-0000-4000-8000-000000001019')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002009','TEAM09','10000000-0000-4000-8000-000000000100','Fire Alert','كشف دخان وتنبيه مبكر','10000000-0000-4000-8000-000000000003','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002009','10000000-0000-4000-8000-000000000003') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002009','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001020'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002009' AND student_id='10000000-0000-4000-8000-000000001020')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002009','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001021'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002009' AND student_id='10000000-0000-4000-8000-000000001021')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002010','TEAM10','10000000-0000-4000-8000-000000000100','Gesture Hand','يد تستجيب للإيماءات','10000000-0000-4000-8000-000000000003','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002010','10000000-0000-4000-8000-000000000003') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002010','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001022'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002010' AND student_id='10000000-0000-4000-8000-000000001022')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002010','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001023'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002010' AND student_id='10000000-0000-4000-8000-000000001023')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002010','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001024'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002010' AND student_id='10000000-0000-4000-8000-000000001024')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002011','TEAM11','10000000-0000-4000-8000-000000000100','Air Monitor','مراقبة جودة الهواء','10000000-0000-4000-8000-000000000003','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002011','10000000-0000-4000-8000-000000000003') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002011','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001025'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002011' AND student_id='10000000-0000-4000-8000-000000001025')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002011','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001026'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002011' AND student_id='10000000-0000-4000-8000-000000001026')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002012','TEAM12','10000000-0000-4000-8000-000000000100','Smart Bin','حاوية ذكية لفرز تجريبي','10000000-0000-4000-8000-000000000004','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002012','10000000-0000-4000-8000-000000000004') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002012','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001027'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002012' AND student_id='10000000-0000-4000-8000-000000001027')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002012','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001028'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002012' AND student_id='10000000-0000-4000-8000-000000001028')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002013','TEAM13','10000000-0000-4000-8000-000000000100','Energy Meter','مراقبة استهلاك الطاقة','10000000-0000-4000-8000-000000000004','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002013','10000000-0000-4000-8000-000000000004') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002013','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001029'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002013' AND student_id='10000000-0000-4000-8000-000000001029')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002013','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001030'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002013' AND student_id='10000000-0000-4000-8000-000000001030')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002013','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001031'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002013' AND student_id='10000000-0000-4000-8000-000000001031')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002014','TEAM14','10000000-0000-4000-8000-000000000100','Line Follower','روبوت يتتبع مسارًا','10000000-0000-4000-8000-000000000004','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002014','10000000-0000-4000-8000-000000000004') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002014','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001032'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002014' AND student_id='10000000-0000-4000-8000-000000001032')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002014','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001033'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002014' AND student_id='10000000-0000-4000-8000-000000001033')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002015','TEAM15','10000000-0000-4000-8000-000000000100','Medicine Reminder','صندوق تذكير بالأدوية','10000000-0000-4000-8000-000000000005','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002015','10000000-0000-4000-8000-000000000005') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002015','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001034'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002015' AND student_id='10000000-0000-4000-8000-000000001034')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002015','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001035'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002015' AND student_id='10000000-0000-4000-8000-000000001035')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002016','TEAM16','10000000-0000-4000-8000-000000000100','Weather Station','محطة طقس مصغّرة','10000000-0000-4000-8000-000000000005','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002016','10000000-0000-4000-8000-000000000005') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002016','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001036'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002016' AND student_id='10000000-0000-4000-8000-000000001036')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002016','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001037'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002016' AND student_id='10000000-0000-4000-8000-000000001037')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002016','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001038'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002016' AND student_id='10000000-0000-4000-8000-000000001038')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002017','TEAM17','10000000-0000-4000-8000-000000000100','Access Control','نظام دخول إلكتروني','10000000-0000-4000-8000-000000000005','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002017','10000000-0000-4000-8000-000000000005') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002017','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001039'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002017' AND student_id='10000000-0000-4000-8000-000000001039')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002017','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001040'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002017' AND student_id='10000000-0000-4000-8000-000000001040')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002018','TEAM18','10000000-0000-4000-8000-000000000100','Tank Level','قياس مستوى خزان','10000000-0000-4000-8000-000000000006','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002018','10000000-0000-4000-8000-000000000006') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002018','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001041'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002018' AND student_id='10000000-0000-4000-8000-000000001041')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002018','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001042'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002018' AND student_id='10000000-0000-4000-8000-000000001042')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002019','TEAM19','10000000-0000-4000-8000-000000000100','Assistive Cane','عصا مساعدة بحساسات','10000000-0000-4000-8000-000000000006','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002019','10000000-0000-4000-8000-000000000006') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002019','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001043'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002019' AND student_id='10000000-0000-4000-8000-000000001043')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002019','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001044'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002019' AND student_id='10000000-0000-4000-8000-000000001044')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002019','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001045'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002019' AND student_id='10000000-0000-4000-8000-000000001045')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002020','TEAM20','10000000-0000-4000-8000-000000000100','Smart Lighting','إضاءة تستجيب لشدة الضوء','10000000-0000-4000-8000-000000000006','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002020','10000000-0000-4000-8000-000000000006') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002020','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001046'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002020' AND student_id='10000000-0000-4000-8000-000000001046')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002020','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001047'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002020' AND student_id='10000000-0000-4000-8000-000000001047')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002021','TEAM21','10000000-0000-4000-8000-000000000100','Sorting Conveyor','سير فرز قطع تجريبي','10000000-0000-4000-8000-000000000007','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002021','10000000-0000-4000-8000-000000000007') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002021','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001048'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002021' AND student_id='10000000-0000-4000-8000-000000001048')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002021','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001049'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002021' AND student_id='10000000-0000-4000-8000-000000001049')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002022','TEAM22','10000000-0000-4000-8000-000000000100','Leak Detector','كشف تسرب المياه','10000000-0000-4000-8000-000000000007','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002022','10000000-0000-4000-8000-000000000007') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002022','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001050'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002022' AND student_id='10000000-0000-4000-8000-000000001050')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002022','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001051'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002022' AND student_id='10000000-0000-4000-8000-000000001051')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002022','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001052'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002022' AND student_id='10000000-0000-4000-8000-000000001052')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO projects(id,seed_key,term_id,name,subtitle,formed_by,status)
VALUES('10000000-0000-4000-8000-000000002023','TEAM23','10000000-0000-4000-8000-000000000100','Room Comfort','مراقبة ظروف الغرفة','10000000-0000-4000-8000-000000000007','DRAFT') ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002023','10000000-0000-4000-8000-000000000007') ON CONFLICT DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002023','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001053'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002023' AND student_id='10000000-0000-4000-8000-000000001053')
ON CONFLICT(project_id,student_id) DO NOTHING;
INSERT INTO project_students(project_id,term_id,student_id)
SELECT '10000000-0000-4000-8000-000000002023','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001054'
WHERE NOT EXISTS(SELECT 1 FROM project_students WHERE project_id='10000000-0000-4000-8000-000000002023' AND student_id='10000000-0000-4000-8000-000000001054')
ON CONFLICT(project_id,student_id) DO NOTHING;
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;

-- Source: ../supervisor-stage1/sql/03-supervisor-schema.sql
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

-- Source: ../supervisor-stage1/sql/04-demo-seed.sql
-- Seven existing synthetic supervisor identities; never preset credentials or reset accounts.
BEGIN;
SET search_path=labassist_student,public;
INSERT INTO supervisor_profiles(account_id,specialization)
 SELECT id,'Embedded Systems & Robotics' FROM accounts WHERE seed_key LIKE 'SUP%' AND role='SUPERVISOR'
 ON CONFLICT DO NOTHING;
INSERT INTO supervisor_settings(account_id)
 SELECT id FROM accounts WHERE seed_key LIKE 'SUP%' AND role='SUPERVISOR'
 ON CONFLICT DO NOTHING;
COMMIT;

-- Source: ../workshop-stage1/sql/05-workshop-schema.sql
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

-- Source: ../workshop-stage1/sql/06-demo-seed.sql
-- Synthetic reference identity, not a usable login. No passwords or tokens.
BEGIN;
SET search_path=labassist_student,public;
INSERT INTO accounts(id,seed_key,role,full_name,email,status)
 VALUES('30000000-0000-4000-8000-000000000001','WORKSHOP_MANAGER_DEMO','WORKSHOP_MANAGER','Demo Workshop Manager','demo.workshop@najah.edu','REFERENCE_ONLY')
 ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO workshop_manager_profiles(account_id) SELECT id FROM accounts WHERE seed_key='WORKSHOP_MANAGER_DEMO' ON CONFLICT DO NOTHING;
INSERT INTO workshop_manager_settings(account_id) SELECT id FROM accounts WHERE seed_key='WORKSHOP_MANAGER_DEMO' ON CONFLICT DO NOTHING;
-- No historical attendance, fixed absence threshold, lending stock or sent notices are invented.
COMMIT;

-- Source: sql/07-project-work-schema.sql
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

-- Source: sql/08-demo-seed.sql
-- Synthetic planned work for existing demo projects; no completed work is invented.
BEGIN;
SET search_path=labassist_student,public;
INSERT INTO project_tasks(id,seed_key,project_id,created_by,assigned_to,updated_by,title,description,due_on)
 SELECT md5('project-work-task:'||m.student_id::text)::uuid,'DEMO_TASK_'||a.seed_key,m.project_id,
 first_member.student_id,m.student_id,first_member.student_id,'Review assigned circuit connections',
 'Synthetic first-week task: inspect assigned connections and record findings.',term.starts_on+3
 FROM project_students m JOIN accounts a ON a.id=m.student_id
 JOIN projects p ON p.id=m.project_id JOIN academic_terms term ON term.id=p.term_id
 CROSS JOIN LATERAL(SELECT x.student_id FROM project_students x WHERE x.project_id=m.project_id AND x.left_at IS NULL ORDER BY x.student_id LIMIT 1) first_member
 WHERE m.left_at IS NULL AND term.is_demo AND a.seed_key LIKE 'STU%'
 ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_issues(id,seed_key,project_id,created_by,updated_by,title,description)
 SELECT md5('project-work-issue:'||p.id::text)::uuid,'DEMO_ISSUE_'||p.seed_key,p.id,m.student_id,m.student_id,
 'Confirm sensor mounting clearance','Synthetic example only: check the available mounting space before assembly.'
 FROM (SELECT * FROM projects WHERE seed_key IS NOT NULL ORDER BY seed_key LIMIT 3) p
 CROSS JOIN LATERAL(SELECT student_id FROM project_students WHERE project_id=p.id AND left_at IS NULL ORDER BY student_id LIMIT 1) m
 JOIN academic_terms term ON term.id=p.term_id AND term.is_demo
 ON CONFLICT(seed_key) DO NOTHING;
COMMIT;
