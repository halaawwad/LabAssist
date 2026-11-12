-- Disposable PostgreSQL only. Synthetic activation hashes are test fixtures, not credentials.
BEGIN;
SET search_path=labassist_student,public;
CREATE FUNCTION pg_temp.ok(label TEXT,condition BOOLEAN) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; RETURN 'PASS: '||label; END $$;
CREATE FUNCTION pg_temp.reject(label TEXT,statement TEXT,expected TEXT) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE statement; SET CONSTRAINTS ALL IMMEDIATE;
 EXCEPTION WHEN OTHERS THEN
  IF position(expected IN SQLERRM)=0 THEN RAISE EXCEPTION 'Wrong failure for %: %',label,SQLERRM; END IF;
  RETURN 'PASS: '||label;
 END;
 RAISE EXCEPTION 'FAILED: accepted %',label;
END $$;
CREATE TEMP TABLE fixtures(key TEXT PRIMARY KEY,id UUID NOT NULL DEFAULT gen_random_uuid());
INSERT INTO fixtures(key) VALUES('head'),('s1'),('s2'),('d1'),('d2'),('term'),('project');
CREATE FUNCTION pg_temp.id(k TEXT) RETURNS UUID LANGUAGE sql AS $$ SELECT id FROM fixtures WHERE key=k $$;
CREATE TEMP TABLE before_counts AS SELECT (SELECT count(*) FROM accounts) AS accounts,(SELECT count(*) FROM projects) AS projects;
INSERT INTO accounts(id,role,full_name,email,status,password_hash,activated_at)
 VALUES(pg_temp.id('head'),'DEPARTMENT_HEAD','Test department head','department.test@najah.edu','ACTIVE','$argon2id$'||repeat('x',70),now());
INSERT INTO accounts(id,role,full_name,email,employee_number,created_by)
 VALUES(pg_temp.id('d1'),'SUPERVISOR','Test supervisor A','supervisor.a.test@najah.edu','9101',pg_temp.id('head')),
 (pg_temp.id('d2'),'SUPERVISOR','Test supervisor B','supervisor.b.test@najah.edu','9102',pg_temp.id('head'));
INSERT INTO accounts(id,role,full_name,email,university_number,created_by)
 VALUES(pg_temp.id('s1'),'STUDENT','Test student A','s87654321@stu.najah.edu','87654321',pg_temp.id('head')),
 (pg_temp.id('s2'),'STUDENT','Test student B','s87654322@stu.najah.edu','87654322',pg_temp.id('head'));
SELECT pg_temp.ok('student created by head without a personal supervisor',
 (SELECT created_by=pg_temp.id('head') AND account_supervisor_id IS NULL FROM accounts WHERE id=pg_temp.id('s1')));
SELECT pg_temp.reject('doctor cannot create students',format(
 'INSERT INTO accounts(role,full_name,email,university_number,created_by) VALUES(''STUDENT'',''No'',''s87654323@stu.najah.edu'',''87654323'',%L)',pg_temp.id('d1')),'Active department head');
SELECT pg_temp.reject('account creator is required',
 'INSERT INTO accounts(role,full_name,email,university_number) VALUES(''STUDENT'',''No'',''s87654323@stu.najah.edu'',''87654323'')','Department head must create');
SELECT pg_temp.reject('staff number is mandatory',format(
 'INSERT INTO accounts(role,full_name,email,created_by) VALUES(''SUPERVISOR'',''No'',''invalid.test@najah.edu'',%L)',pg_temp.id('head')),'Staff login number');
SELECT pg_temp.reject('supervisor number has four digits',format(
 'INSERT INTO accounts(role,full_name,email,employee_number,created_by) VALUES(''SUPERVISOR'',''No'',''invalid.test@najah.edu'',''91001'',%L)',pg_temp.id('head')),'employee_login_number');
SELECT pg_temp.reject('staff number is unique',format(
 'INSERT INTO accounts(role,full_name,email,employee_number,created_by) VALUES(''SUPERVISOR'',''No'',''invalid.test@najah.edu'',''9101'',%L)',pg_temp.id('head')),'duplicate key');
SELECT pg_temp.reject('workshop login number has five digits',
 'UPDATE accounts SET employee_number=''1234'' WHERE role=''WORKSHOP_MANAGER''','employee_login_number');
UPDATE accounts SET employee_number='54321' WHERE role='WORKSHOP_MANAGER';
SELECT pg_temp.ok('workshop manager retains a unique five-digit login',
 (SELECT count(*)=1 AND bool_and(employee_number ~ '^[0-9]{5}$') FROM accounts WHERE role='WORKSHOP_MANAGER'));
SELECT pg_temp.reject('student university number remains eight digits',format(
 'INSERT INTO accounts(role,full_name,email,university_number,created_by) VALUES(''STUDENT'',''No'',''s123@stu.najah.edu'',''123'',%L)',pg_temp.id('head')),'student_university_identity');
SELECT pg_temp.reject('student email must match university number',format(
 'INSERT INTO accounts(role,full_name,email,university_number,created_by) VALUES(''STUDENT'',''No'',''wrong@stu.najah.edu'',''87654323'',%L)',pg_temp.id('head')),'student_university_identity');
INSERT INTO academic_terms(id,name,starts_on,ends_on,is_demo) VALUES(pg_temp.id('term'),'Department test term',current_date,current_date+100,true);
INSERT INTO term_workshop_capacity(term_id,team_capacity) VALUES(pg_temp.id('term'),25);
INSERT INTO student_enrollments(student_id,term_id) VALUES(pg_temp.id('s1'),pg_temp.id('term')),(pg_temp.id('s2'),pg_temp.id('term'));
SET CONSTRAINTS ALL DEFERRED;
INSERT INTO projects(id,term_id,formed_by) VALUES(pg_temp.id('project'),pg_temp.id('term'),pg_temp.id('head'));
INSERT INTO project_students(project_id,term_id,student_id) VALUES(pg_temp.id('project'),pg_temp.id('term'),pg_temp.id('s1')),(pg_temp.id('project'),pg_temp.id('term'),pg_temp.id('s2'));
INSERT INTO project_supervisors(project_id,supervisor_id) VALUES(pg_temp.id('project'),pg_temp.id('d1')),(pg_temp.id('project'),pg_temp.id('d2'));
SET CONSTRAINTS ALL IMMEDIATE;
SELECT pg_temp.ok('head forms group without a group name',(SELECT name='' AND status='DRAFT' FROM projects WHERE id=pg_temp.id('project')));
SELECT pg_temp.ok('two supervisors linked once per project',(SELECT count(*)=2 FROM project_supervisors WHERE project_id=pg_temp.id('project')));
SELECT pg_temp.ok('both supervisors see both students',(SELECT count(*)=4 FROM supervisor_project_students WHERE project_id=pg_temp.id('project')));
SELECT pg_temp.ok('project chat contains students and supervisors',(SELECT count(*)=4 FROM conversation_members m JOIN conversations c ON c.id=m.conversation_id WHERE c.project_id=pg_temp.id('project') AND m.active));
SELECT pg_temp.ok('head is not added to student project chat',NOT EXISTS(SELECT 1 FROM conversation_members m JOIN conversations c ON c.id=m.conversation_id WHERE c.project_id=pg_temp.id('project') AND m.account_id=pg_temp.id('head')));
SELECT pg_temp.reject('same supervisor cannot be linked twice',format('INSERT INTO project_supervisors VALUES(%L,%L,now())',pg_temp.id('project'),pg_temp.id('d1')),'duplicate key');
SELECT pg_temp.reject('supervisor cannot form a group',format('INSERT INTO projects(term_id,formed_by) VALUES(%L,%L)',pg_temp.id('term'),pg_temp.id('d1')),'department head must form');
SELECT pg_temp.reject('group must retain 2–3 students',format('DELETE FROM project_students WHERE project_id=%L AND student_id=%L',pg_temp.id('project'),pg_temp.id('s2')),'two or three students');
SELECT pg_temp.reject('group must retain a supervisor',format('DELETE FROM project_supervisors WHERE project_id=%L',pg_temp.id('project')),'at least one supervisor');
SELECT pg_temp.reject('non-draft project requires a project title',format('UPDATE projects SET status=''IN_PROGRESS'' WHERE id=%L',pg_temp.id('project')),'project_title');
INSERT INTO activation_invitations(student_id,invited_by,token_hash,expires_at)
 VALUES(pg_temp.id('s1'),pg_temp.id('head'),repeat('a',64),now()+interval '1 day'),
 (pg_temp.id('d1'),pg_temp.id('head'),repeat('b',64),now()+interval '1 day');
SELECT pg_temp.reject('doctors cannot issue activation invitations',format(
 'INSERT INTO activation_invitations(student_id,invited_by,token_hash,expires_at) VALUES(%L,%L,repeat(''c'',64),now()+interval ''1 day'')',pg_temp.id('s2'),pg_temp.id('d1')),'Active department head');
SELECT pg_temp.reject('plaintext password rejected','SELECT activate_account(repeat(''a'',64),''s87654321@stu.najah.edu'',''Noor123!'')','Argon2id');
SELECT pg_temp.ok('student activation accepts backend hash',activate_account(repeat('a',64),'s87654321@stu.najah.edu','$argon2id$'||repeat('t',70))=pg_temp.id('s1'));
SELECT pg_temp.ok('supervisor activates with the same flow',activate_account(repeat('b',64),'supervisor.a.test@najah.edu','$argon2id$'||repeat('t',70))=pg_temp.id('d1'));
SELECT pg_temp.reject('activation link is single-use','SELECT activate_account(repeat(''a'',64),''s87654321@stu.najah.edu'',''$argon2id$''||repeat(''t'',70))','invalid or expired');
SELECT pg_temp.ok('account activation is audited',(SELECT count(*)=2 FROM audit_events WHERE event_key='ACCOUNT_ACTIVATED' AND subject_id IN(pg_temp.id('s1'),pg_temp.id('d1'))));
SELECT pg_temp.ok('old accounts and projects remain',(SELECT count(*)=(SELECT accounts+5 FROM before_counts) FROM accounts) AND (SELECT count(*)=(SELECT projects+1 FROM before_counts) FROM projects));
ROLLBACK;
