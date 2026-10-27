-- Disposable database only. Every fixture is rolled back at the end.
BEGIN;
SET search_path=labassist_student,public;
CREATE FUNCTION pg_temp.ok(label TEXT,condition BOOLEAN) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; RETURN 'PASS: '||label; END $$;
CREATE FUNCTION pg_temp.reject(label TEXT,statement TEXT,expected_message TEXT DEFAULT NULL) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE statement; SET CONSTRAINTS ALL IMMEDIATE;
 EXCEPTION WHEN OTHERS THEN
  IF expected_message IS NOT NULL AND position(expected_message IN SQLERRM)=0 THEN RAISE EXCEPTION 'Wrong failure for %: %',label,SQLERRM; END IF;
  RETURN 'PASS: '||label;
 END;
 RAISE EXCEPTION 'FAILED: accepted %',label;
END $$;
SELECT pg_temp.ok('54 synthetic student accounts',(SELECT count(*)=54 FROM accounts WHERE role='STUDENT'));
SELECT pg_temp.ok('23 seeded projects',(SELECT count(*)=23 FROM projects));
SELECT pg_temp.ok('7 dependency-only supervisors',(SELECT count(*)=7 AND bool_and(status='REFERENCE_ONLY') FROM accounts WHERE role='SUPERVISOR'));
SELECT pg_temp.ok('all student accounts await activation',(SELECT bool_and(status='PENDING_ACTIVATION' AND password_hash IS NULL AND activated_at IS NULL) FROM accounts WHERE role='STUDENT'));
SELECT pg_temp.ok('no seeded passwords',(SELECT count(*)=0 FROM accounts WHERE password_hash IS NOT NULL));
SELECT pg_temp.ok('no seeded activation secrets or sent invitations',(SELECT count(*)=0 FROM activation_invitations));
SELECT pg_temp.ok('eight-digit numbers and derived university emails',(SELECT bool_and(university_number ~ '^[0-9]{8}$' AND email='s'||university_number||'@stu.najah.edu') FROM accounts WHERE role='STUDENT'));
SELECT pg_temp.ok('all student profiles exist',(SELECT count(*)=54 FROM student_profiles));
SELECT pg_temp.ok('all student settings exist',(SELECT count(*)=54 FROM student_settings));
SELECT pg_temp.ok('each student in exactly one current team',(SELECT count(*)=54 AND count(DISTINCT student_id)=54 FROM project_students WHERE left_at IS NULL));
SELECT pg_temp.ok('15 two-student and 8 three-student teams',(SELECT count(*) FILTER(WHERE students=2)=15 AND count(*) FILTER(WHERE students=3)=8 FROM seed_team_overview));
SELECT pg_temp.ok('multi-supervisor project has two unique links',(SELECT supervisors=2 FROM seed_team_overview WHERE team_key='TEAM03'));
SELECT pg_temp.ok('24 unique project-supervisor links',(SELECT count(*)=24 FROM project_supervisors));
SELECT pg_temp.ok('capacity 25 with two remaining teams',(SELECT team_capacity=25 AND current_teams=23 AND remaining_teams=2 FROM workshop_capacity_summary));
SELECT pg_temp.ok('demo term starts in first week',(SELECT is_demo AND starts_on=(now() AT TIME ZONE 'Asia/Hebron')::date AND ends_on IS NULL FROM academic_terms WHERE seed_key='DEMO_TERM'));
SELECT pg_temp.ok('no fabricated personal tasks/reminders',(SELECT (SELECT count(*) FROM personal_tasks)=0 AND (SELECT count(*) FROM personal_reminders)=0));
SELECT pg_temp.reject('duplicate university number rejected',$q$INSERT INTO accounts(role,full_name,university_number,email,account_supervisor_id) VALUES('STUDENT','Duplicate','20260001','s20260001@stu.najah.edu','10000000-0000-4000-8000-000000000001')$q$,'duplicate key');
SELECT pg_temp.reject('wrong student email pattern rejected',$q$INSERT INTO accounts(role,full_name,university_number,email,account_supervisor_id) VALUES('STUDENT','Wrong email','99990001','wrong@stu.najah.edu','10000000-0000-4000-8000-000000000001')$q$,'check constraint');
SELECT pg_temp.reject('plaintext password rejected',$q$UPDATE accounts SET password_hash='NoPlaintextAllowed' WHERE seed_key='STU01'$q$,'check constraint');
SELECT pg_temp.reject('activation without hash rejected',$q$UPDATE accounts SET status='ACTIVE',activated_at=now() WHERE seed_key='STU01'$q$,'check constraint');
SELECT pg_temp.reject('student cannot be personal account supervisor',$q$INSERT INTO accounts(role,full_name,university_number,email,account_supervisor_id) VALUES('STUDENT','Wrong supervisor','99990001','s99990001@stu.najah.edu','10000000-0000-4000-8000-000000001001')$q$,'supervisor account reference');
SELECT pg_temp.reject('same supervisor not linked twice to one project',$q$INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002003','10000000-0000-4000-8000-000000000001')$q$,'duplicate key');
SELECT pg_temp.reject('student cannot supervise a project',$q$INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002003','10000000-0000-4000-8000-000000001001')$q$,'supervisor role invalid');
SELECT pg_temp.reject('cannot shrink capacity below current teams',$q$UPDATE term_workshop_capacity SET team_capacity=22$q$,'Workshop team capacity');
SELECT pg_temp.reject('fourth team member rejected',$q$INSERT INTO project_students(project_id,term_id,student_id) VALUES('10000000-0000-4000-8000-000000002001','10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000001004')$q$);
SELECT pg_temp.reject('cannot omit a students personal supervisor from the project',$q$DELETE FROM project_supervisors WHERE project_id='10000000-0000-4000-8000-000000002003' AND supervisor_id='10000000-0000-4000-8000-000000000007'$q$,'account supervisor must be linked');
SELECT pg_temp.reject('cannot exceed four supervised projects',$q$INSERT INTO project_supervisors(project_id,supervisor_id) VALUES('10000000-0000-4000-8000-000000002001','10000000-0000-4000-8000-000000000002')$q$,'four projects');
SELECT pg_temp.ok('personal supervisor can differ within one team',(SELECT count(DISTINCT a.account_supervisor_id)=2 FROM project_students m JOIN accounts a ON a.id=m.student_id JOIN projects p ON p.id=m.project_id WHERE p.seed_key='TEAM03'));
INSERT INTO activation_invitations(id,student_id,invited_by,token_hash,expires_at) VALUES('10000000-0000-4000-8000-000000009001','10000000-0000-4000-8000-000000001001','10000000-0000-4000-8000-000000000001',repeat('a',64),now()+interval '1 hour');
SELECT pg_temp.reject('wrong activation email rejected',$q$SELECT activate_student(repeat('a',64),'s20260002@stu.najah.edu','$argon2id$'||repeat('x',80))$q$,'email mismatch');
SELECT pg_temp.ok('failed activation does not consume invitation',(SELECT used_at IS NULL FROM activation_invitations WHERE token_hash=repeat('a',64)));
SELECT pg_temp.reject('activation rejects plaintext input',$q$SELECT activate_student(repeat('a',64),'s20260001@stu.najah.edu','plain-text')$q$,'Argon2id');
-- Non-login hash fixture: checks database representation only, not Argon2 verification.
SELECT activate_student(repeat('a',64),'s20260001@stu.najah.edu','$argon2id$'||repeat('x',80));
SELECT pg_temp.ok('student activation and token consumption atomic',(SELECT a.status='ACTIVE' AND a.password_hash IS NOT NULL AND i.used_at IS NOT NULL FROM accounts a JOIN activation_invitations i ON i.student_id=a.id WHERE a.seed_key='STU01'));
SELECT pg_temp.reject('activation token single-use',$q$SELECT activate_student(repeat('a',64),'s20260001@stu.najah.edu','$argon2id$'||repeat('x',80))$q$,'invalid or expired');
SELECT pg_temp.ok('activation audit retained',(SELECT count(*)=1 FROM audit_events WHERE event_key='STUDENT_ACTIVATED'));
SELECT pg_temp.reject('wrong supervisor cannot issue activation invitation',$q$INSERT INTO activation_invitations(student_id,invited_by,token_hash,expires_at) VALUES('10000000-0000-4000-8000-000000001002','10000000-0000-4000-8000-000000000007',repeat('b',64),now()+interval '1 hour')$q$,'Assigned supervisor');
INSERT INTO activation_invitations(student_id,invited_by,token_hash,expires_at) VALUES('10000000-0000-4000-8000-000000001002','10000000-0000-4000-8000-000000000001',repeat('c',64),now()+interval '1 hour');
UPDATE activation_invitations SET revoked_at=now() WHERE token_hash=repeat('c',64);
SELECT pg_temp.reject('revoked activation token rejected',$q$SELECT activate_student(repeat('c',64),'s20260002@stu.najah.edu','$argon2id$'||repeat('x',80))$q$,'invalid or expired');
UPDATE academic_terms SET starts_on=starts_on-20 WHERE seed_key='DEMO_TERM';
SELECT pg_temp.reject('team change closed after first two weeks',$q$UPDATE project_students SET left_at=now() WHERE student_id='10000000-0000-4000-8000-000000001001'$q$,'first two term weeks');
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
