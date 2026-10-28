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
SELECT pg_temp.ok('one manager reference',(SELECT count(*)=1 AND bool_and(status='REFERENCE_ONLY') FROM accounts WHERE role='WORKSHOP_MANAGER'));
SELECT pg_temp.ok('one manager profile',(SELECT count(*)=1 FROM workshop_manager_profiles));
SELECT pg_temp.ok('one manager settings row',(SELECT count(*)=1 FROM workshop_manager_settings));
SELECT pg_temp.ok('54 roster students',(SELECT count(*)=54 FROM workshop_project_students));
SELECT pg_temp.ok('23 shared teams',(SELECT count(DISTINCT project_id)=23 FROM workshop_project_students));
SELECT pg_temp.ok('capacity remains 25',(SELECT bool_and(team_capacity=25) FROM term_workshop_capacity));
SELECT pg_temp.ok('no seeded passwords',(SELECT count(*)=0 FROM accounts WHERE password_hash IS NOT NULL));
SELECT pg_temp.ok('no invented availability history',(SELECT count(*)=0 FROM workshop_availability));
SELECT pg_temp.reject('second current manager',$q$INSERT INTO accounts(role,full_name,email,status) VALUES('WORKSHOP_MANAGER','Second','second.manager@najah.edu','REFERENCE_ONLY')$q$,'unique constraint');
SELECT pg_temp.reject('manager cannot be a student',$q$UPDATE accounts SET university_number='12345678' WHERE role='WORKSHOP_MANAGER'$q$,'identity');
SELECT pg_temp.reject('student cannot own workshop settings',$q$INSERT INTO workshop_manager_settings(account_id) SELECT id FROM accounts WHERE role='STUDENT' LIMIT 1$q$,'Workshop manager account required');
SELECT pg_temp.reject('supervisor cannot own manager profile',$q$INSERT INTO workshop_manager_profiles(account_id) SELECT id FROM accounts WHERE role='SUPERVISOR' LIMIT 1$q$,'Workshop manager account required');
SELECT pg_temp.reject('supervisor cannot create manager availability',$q$INSERT INTO workshop_availability(manager_id,applies_on,status) SELECT id,CURRENT_DATE,'ON_DUTY' FROM accounts WHERE role='SUPERVISOR' LIMIT 1$q$,'Workshop manager account required');
SELECT pg_temp.reject('invalid UI language',$q$UPDATE workshop_manager_settings SET ui_locale='fr'$q$,'check constraint');
INSERT INTO workshop_availability(manager_id,applies_on,status,away_from,away_until)
 SELECT id,CURRENT_DATE,'AWAY','10:00','11:00' FROM accounts WHERE role='WORKSHOP_MANAGER';
SELECT pg_temp.ok('temporary absence recorded',(SELECT count(*)=1 FROM workshop_availability WHERE status='AWAY'));
SELECT pg_temp.reject('end before start',$q$UPDATE workshop_availability SET away_until='09:00'$q$,'check constraint');
SELECT pg_temp.reject('full day cannot have time range',$q$UPDATE workshop_availability SET status='ABSENT'$q$,'check constraint');
SELECT pg_temp.reject('duplicate day',$q$INSERT INTO workshop_availability(manager_id,applies_on,status) SELECT id,CURRENT_DATE,'ON_DUTY' FROM accounts WHERE role='WORKSHOP_MANAGER'$q$,'unique constraint');
UPDATE workshop_availability SET status='ABSENT',away_from=NULL,away_until=NULL;
SELECT pg_temp.ok('full day absence accepted',(SELECT bool_and(status='ABSENT') FROM workshop_availability));
SELECT pg_temp.reject('student cannot own workshop read state',$q$INSERT INTO workshop_notification_reads(manager_id,notification_key) SELECT id,'demo' FROM accounts WHERE role='STUDENT' LIMIT 1$q$,'Workshop manager account required');
INSERT INTO workshop_notification_reads(manager_id,notification_key) SELECT id,'demo' FROM accounts WHERE role='WORKSHOP_MANAGER';
SELECT pg_temp.reject('duplicate read receipt',$q$INSERT INTO workshop_notification_reads(manager_id,notification_key) SELECT id,'demo' FROM accounts WHERE role='WORKSHOP_MANAGER'$q$,'unique constraint');
ROLLBACK;
