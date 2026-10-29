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
 END;RAISE EXCEPTION 'FAILED: accepted %',label;
END $$;
SELECT pg_temp.ok('54 planned demo tasks',(SELECT count(*)=54 FROM project_tasks));
SELECT pg_temp.ok('three synthetic issues',(SELECT count(*)=3 FROM project_issues));
SELECT pg_temp.ok('one event per seed row',(SELECT count(*)=57 FROM project_work_events));
SELECT pg_temp.ok('no fake completion',(SELECT count(*)=0 FROM project_tasks WHERE status='DONE'));
SELECT pg_temp.ok('all current members summarized',(SELECT count(*)=54 FROM project_member_work_summary));
SELECT pg_temp.ok('all projects summarized',(SELECT count(*)=23 FROM project_team_work_summary));
SELECT pg_temp.ok('progress derived from real rows',(SELECT bool_and(progress_percent=0 AND total_tasks=1) FROM project_member_work_summary));
CREATE TEMP TABLE fixture AS
 SELECT t.id AS task_id,t.project_id,t.assigned_to AS owner_id,
 (SELECT student_id FROM project_students WHERE project_id=t.project_id AND student_id<>t.assigned_to AND left_at IS NULL ORDER BY student_id LIMIT 1) AS teammate,
 (SELECT student_id FROM project_students WHERE project_id<>t.project_id AND left_at IS NULL ORDER BY student_id LIMIT 1) AS outsider,
 (SELECT supervisor_id FROM project_supervisors WHERE project_id=t.project_id ORDER BY supervisor_id LIMIT 1) AS supervisor,
 (SELECT id FROM project_issues WHERE project_id=t.project_id LIMIT 1) AS issue_id
 FROM project_tasks t WHERE EXISTS(SELECT 1 FROM project_issues i WHERE i.project_id=t.project_id) ORDER BY t.id LIMIT 1;
SELECT pg_temp.reject('teammate cannot complete another task',$q$SELECT set_project_task_status(teammate,task_id,0,'DONE') FROM fixture$q$,'Only task assignee');
SELECT pg_temp.reject('supervisor cannot complete task',$q$SELECT set_project_task_status(supervisor,task_id,0,'DONE') FROM fixture$q$,'Only task assignee');
SELECT pg_temp.reject('outsider cannot create task',$q$INSERT INTO project_tasks(project_id,created_by,updated_by,assigned_to,title) SELECT project_id,outsider,outsider,owner_id,'Invalid' FROM fixture$q$,'creator must be');
SELECT pg_temp.reject('assignee from another team rejected',$q$INSERT INTO project_tasks(project_id,created_by,updated_by,assigned_to,title) SELECT project_id,owner_id,owner_id,outsider,'Invalid' FROM fixture$q$,'assignee must be');
SELECT pg_temp.reject('cannot pre-complete someone task',$q$INSERT INTO project_tasks(project_id,created_by,updated_by,assigned_to,title,status) SELECT project_id,teammate,teammate,owner_id,'Invalid','DONE' FROM fixture$q$,'starts as TODO');
SELECT set_project_task_status(owner_id,task_id,0,'IN_PROGRESS',true) FROM fixture;
SELECT pg_temp.ok('owner can request help',(SELECT bool_and(t.status='IN_PROGRESS' AND t.needs_help AND t.revision=1) FROM project_tasks t JOIN fixture f ON f.task_id=t.id));
SELECT pg_temp.reject('stale task revision rejected',$q$SELECT set_project_task_status(owner_id,task_id,0,'DONE') FROM fixture$q$,'revision conflict');
SELECT set_project_task_status(owner_id,task_id,1,'DONE') FROM fixture;
SELECT pg_temp.ok('completion clears help and sets timestamp',(SELECT bool_and(t.status='DONE' AND NOT t.needs_help AND t.completed_at IS NOT NULL AND t.revision=2) FROM project_tasks t JOIN fixture f ON f.task_id=t.id));
SELECT pg_temp.ok('progress updates to 100',(SELECT bool_and(s.progress_percent=100) FROM project_member_work_summary s JOIN fixture f ON f.project_id=s.project_id AND f.owner_id=s.student_id));
SELECT pg_temp.ok('history records successful changes only',(SELECT count(*)=59 FROM project_work_events));
SELECT pg_temp.reject('task cannot move projects',$q$UPDATE project_tasks SET project_id=(SELECT project_id FROM project_students WHERE student_id=(SELECT outsider FROM fixture) LIMIT 1) WHERE id=(SELECT task_id FROM fixture)$q$,'current teammate');
SELECT pg_temp.reject('history cannot be edited',$q$UPDATE project_work_events SET event_key='UPDATED'$q$,'append only');
SELECT pg_temp.reject('history cannot be deleted',$q$DELETE FROM project_work_events$q$,'append only');
SELECT pg_temp.reject('outsider cannot resolve issue',$q$SELECT set_project_issue_status(outsider,issue_id,0,'RESOLVED','Fixed') FROM fixture$q$,'current teammate');
SELECT pg_temp.reject('supervisor cannot resolve issue',$q$SELECT set_project_issue_status(supervisor,issue_id,0,'RESOLVED','Fixed') FROM fixture$q$,'current teammate');
SELECT pg_temp.reject('resolution requires explanation',$q$SELECT set_project_issue_status(teammate,issue_id,0,'RESOLVED','') FROM fixture$q$,'check constraint');
SELECT set_project_issue_status(teammate,issue_id,0,'RESOLVED','Mounting clearance measured and confirmed.') FROM fixture;
SELECT pg_temp.ok('any teammate resolves issue',(SELECT bool_and(i.resolved_by=f.teammate AND i.resolved_at IS NOT NULL AND i.revision=1) FROM project_issues i JOIN fixture f ON f.issue_id=i.id));
SELECT pg_temp.reject('stale issue revision rejected',$q$SELECT set_project_issue_status(owner_id,issue_id,0,'MONITORING') FROM fixture$q$,'revision conflict');
SELECT pg_temp.ok('failed operations leave no duplicate side effects',(SELECT count(*)=60 FROM project_work_events));
SELECT set_project_task_status(owner_id,task_id,2,'TODO') FROM fixture;
SELECT pg_temp.ok('owner can correct completion',(SELECT bool_and(t.completed_at IS NULL AND t.status='TODO') FROM project_tasks t JOIN fixture f ON f.task_id=t.id));
SELECT pg_temp.ok('credentials remain untouched',(SELECT count(*)=0 FROM accounts WHERE password_hash IS NOT NULL));
ROLLBACK;
