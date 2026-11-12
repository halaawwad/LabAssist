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
