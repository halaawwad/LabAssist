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
SELECT pg_temp.ok('seven supervisor profiles',(SELECT count(*)=7 FROM supervisor_profiles));
SELECT pg_temp.ok('seven settings',(SELECT count(*)=7 FROM supervisor_settings));
SELECT pg_temp.ok('no password seed',(SELECT count(*)=0 FROM accounts WHERE password_hash IS NOT NULL));
SELECT pg_temp.ok('23 projects preserved',(SELECT count(*)=23 FROM projects));
SELECT pg_temp.ok('54 students preserved',(SELECT count(*)=54 FROM accounts WHERE role='STUDENT'));
SELECT pg_temp.ok('project supervisor pairs are unique',(SELECT count(*)=count(DISTINCT (project_id,supervisor_id)) FROM project_supervisors));
SELECT pg_temp.ok('all assigned students visible',(SELECT count(DISTINCT student_id)=54 FROM supervisor_project_students));
SELECT pg_temp.ok('no unrelated project access',(SELECT count(*)=0 FROM supervisor_project_students v WHERE NOT EXISTS(SELECT 1 FROM project_supervisors ps WHERE ps.project_id=v.project_id AND ps.supervisor_id=v.supervisor_id)));
SELECT pg_temp.reject('student cannot own supervisor profile',$q$INSERT INTO supervisor_profiles(account_id) SELECT id FROM accounts WHERE role='STUDENT' LIMIT 1$q$,'Supervisor account required');
SELECT pg_temp.reject('student cannot own settings',$q$INSERT INTO supervisor_settings(account_id) SELECT id FROM accounts WHERE role='STUDENT' LIMIT 1$q$,'Supervisor account required');
SELECT pg_temp.reject('student cannot own read state',$q$INSERT INTO supervisor_notification_reads(supervisor_id,notification_key) SELECT id,'demo' FROM accounts WHERE role='STUDENT' LIMIT 1$q$,'Supervisor account required');
SELECT pg_temp.reject('invalid locale',$q$UPDATE supervisor_settings SET ui_locale='fr'$q$,'check constraint');
INSERT INTO supervisor_notification_reads(supervisor_id,notification_key) SELECT id,'demo' FROM accounts WHERE seed_key='SUP01';
SELECT pg_temp.reject('duplicate read state',$q$INSERT INTO supervisor_notification_reads(supervisor_id,notification_key) SELECT id,'demo' FROM accounts WHERE seed_key='SUP01'$q$,'unique constraint');
SELECT pg_temp.ok('read state stays private',(SELECT count(*)=1 FROM supervisor_notification_reads));
UPDATE supervisor_settings SET ui_locale='ar' WHERE account_id=(SELECT id FROM accounts WHERE seed_key='SUP01');
SELECT pg_temp.ok('independent language choice',(SELECT count(*)=1 FROM supervisor_settings WHERE ui_locale='ar'));
INSERT INTO files(id,uploaded_by,storage_key,original_name,mime_type,byte_size,status)
SELECT '20000000-0000-4000-8000-000000000001',id,'supervisor-test-photo','demo.png','image/png',10,'READY' FROM accounts WHERE seed_key='SUP01';
UPDATE supervisor_profiles SET photo_file_id='20000000-0000-4000-8000-000000000001' WHERE account_id=(SELECT id FROM accounts WHERE seed_key='SUP01');
SELECT pg_temp.reject('another supervisor cannot use private photo',$q$UPDATE supervisor_profiles SET photo_file_id='20000000-0000-4000-8000-000000000001' WHERE account_id=(SELECT id FROM accounts WHERE seed_key='SUP02')$q$,'owned ready image');
ROLLBACK;
