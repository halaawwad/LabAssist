-- Demo backfill only. Apply after the SQL stages 01-10, never to real term data.
BEGIN;
SET search_path=labassist_student,public;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM academic_terms WHERE seed_key='DEMO_TERM' AND is_demo)
 OR (SELECT count(*) FROM projects p JOIN academic_terms t ON t.id=p.term_id WHERE t.seed_key='DEMO_TERM')<>23
 THEN RAISE EXCEPTION 'The 23-team demo foundation is required'; END IF;
END $$;

-- Historical imports bypass only date/state-entry guards inside this transaction.
-- Foreign keys, row checks, allocation validation and activity logging stay enabled.
ALTER TABLE project_students DISABLE TRIGGER membership_window;
ALTER TABLE project_tasks DISABLE TRIGGER work_guard;
ALTER TABLE project_issues DISABLE TRIGGER work_guard;
DO $$
DECLARE previous UUID=md5('PREVIOUS_DEMO_TERM')::uuid;current_term UUID;
 first_snapshot BOOLEAN;as_of DATE;start_date DATE;end_date DATE;
 project UUID;supervisor UUID;student UUID;first_student UUID;task UUID;
 g INT;j INT;k INT;n INT=0;members INT;student_number TEXT;
 part RECORD;lines JSONB;current_task RECORD;
BEGIN
 SELECT id INTO current_term FROM academic_terms WHERE seed_key='DEMO_TERM';
 first_snapshot=NOT EXISTS(SELECT 1 FROM academic_terms WHERE seed_key='PREVIOUS_DEMO_TERM');
 INSERT INTO academic_terms(id,seed_key,name,starts_on,ends_on,is_demo)
 VALUES(previous,'PREVIOUS_DEMO_TERM','Previous demo semester',(now() AT TIME ZONE 'Asia/Hebron')::date-180,(now() AT TIME ZONE 'Asia/Hebron')::date-60,true)
 ON CONFLICT(seed_key) DO NOTHING;
 SELECT (created_at AT TIME ZONE 'Asia/Hebron')::date INTO as_of FROM academic_terms WHERE id=previous;
 start_date=as_of-180;end_date=as_of-60;
 INSERT INTO term_workshop_capacity(term_id,team_capacity) VALUES(previous,25) ON CONFLICT DO NOTHING;
 FOR g IN 1..15 LOOP
  project=md5('PREVIOUS_DEMO_PROJECT_'||g)::uuid;
  SELECT id INTO supervisor FROM accounts WHERE seed_key='SUP'||lpad((((g-1)%7)+1)::text,2,'0');
  members=CASE WHEN g%3=0 THEN 3 ELSE 2 END;
  first_student=NULL;
  INSERT INTO projects(id,seed_key,term_id,name,subtitle,abstract,formed_by,status,created_at)
  VALUES(project,'PAST_TEAM'||lpad(g::text,2,'0'),previous,'Completed hardware project '||lpad(g::text,2,'0'),
   'Previous semester demo','Synthetic completed-project fixture for history and filtering.',supervisor,'COMPLETED',start_date::timestamptz)
  ON CONFLICT(seed_key) DO NOTHING;
  INSERT INTO project_supervisors(project_id,supervisor_id) VALUES(project,supervisor) ON CONFLICT DO NOTHING;
  FOR j IN 1..members LOOP
   n=n+1;student_number=(20250000+n)::text;
   student=md5('PREVIOUS_DEMO_STUDENT_'||student_number)::uuid;
   IF first_student IS NULL THEN first_student=student; END IF;
   INSERT INTO accounts(id,seed_key,role,full_name,university_number,email,account_supervisor_id,status,created_at)
   VALUES(student,'PAST_STU'||lpad(n::text,2,'0'),'STUDENT','Demo Graduate '||lpad(n::text,2,'0'),student_number,
    's'||student_number||'@stu.najah.edu',supervisor,'DISABLED',start_date::timestamptz)
   ON CONFLICT(seed_key) DO NOTHING;
   INSERT INTO student_profiles(account_id,major,study_year) VALUES(student,'Computer Engineering',5) ON CONFLICT DO NOTHING;
   INSERT INTO student_settings(account_id) VALUES(student) ON CONFLICT DO NOTHING;
   INSERT INTO student_enrollments(student_id,term_id) VALUES(student,previous) ON CONFLICT DO NOTHING;
   INSERT INTO project_students(project_id,term_id,student_id,joined_at)
   SELECT project,previous,student,start_date::timestamptz WHERE NOT EXISTS(
    SELECT 1 FROM project_students m WHERE m.project_id=project AND m.student_id=student)
   ON CONFLICT DO NOTHING;
   FOR k IN 1..4 LOOP
    task=md5('PREVIOUS_DEMO_TASK_'||student::text||'_'||k)::uuid;
    INSERT INTO project_tasks(id,seed_key,project_id,created_by,assigned_to,updated_by,title,description,due_on,status,completed_at,created_at,updated_at)
    VALUES(task,'PAST_TASK_'||n||'_'||k,project,student,student,student,
     (ARRAY['Assemble prototype','Validate connections','Record test results','Complete project documentation'])[k],
     'Synthetic historical completion, not a real student record.',end_date-3,'DONE',(end_date-5)::timestamptz,
     (start_date+7)::timestamptz,(end_date-5)::timestamptz)
    ON CONFLICT(seed_key) DO NOTHING;
   END LOOP;
  END LOOP;
  INSERT INTO project_issues(id,seed_key,project_id,created_by,updated_by,title,description,status,resolution,resolved_by,resolved_at,created_at,updated_at)
  VALUES(md5('PREVIOUS_DEMO_ISSUE_'||g)::uuid,'PAST_ISSUE_'||g,project,first_student,first_student,
   'Sensor calibration discrepancy','Synthetic previous-semester issue.','RESOLVED','Calibration was verified against the recorded test procedure.',
   first_student,(end_date-12)::timestamptz,(start_date+30)::timestamptz,(end_date-12)::timestamptz)
  ON CONFLICT(seed_key) DO NOTHING;
  INSERT INTO project_budgets(project_id,currency,amount,created_by,updated_by,created_at)
  VALUES(project,'USD',300,first_student,first_student,start_date::timestamptz) ON CONFLICT DO NOTHING;
  lines='[]'::jsonb;
  FOR part IN SELECT * FROM (VALUES('UNO','Arduino Uno',1,22,20),('DRIVER','L298N Motor Driver',1,8,7),
   ('SENSOR','HC-SR04 Ultrasonic Sensor',2,8,7.50),('BATTERY','18650 Li-ion Battery',1,6,5)) p(key,name,quantity,estimate,paid)
  LOOP
   INSERT INTO project_bom_items(id,seed_key,project_id,name,quantity_required,estimated_unit_price,created_by,updated_by,created_at)
   VALUES(md5('bom:'||project::text||':'||part.key)::uuid,'DEMO_BOM_PAST_TEAM'||lpad(g::text,2,'0')||'_'||part.key,
    project,part.name,part.quantity,part.estimate,first_student,first_student,start_date::timestamptz)
   ON CONFLICT DO NOTHING;
   lines=lines||jsonb_build_array(jsonb_build_object('bom_item_id',md5('bom:'||project::text||':'||part.key)::uuid,
    'label',part.name,'quantity',part.quantity,'unit_price',part.paid));
  END LOOP;
  PERFORM record_project_expense(first_student,project,md5('PREVIOUS_DEMO_PURCHASE_'||g)::uuid,end_date-15,'Demo previous-semester supplier',lines);
 END LOOP;
 IF first_snapshot THEN
  -- Freeze the snapshot at day 10 of the current demo term (week two).
  UPDATE academic_terms SET starts_on=as_of-9,name='Current demo term - week two' WHERE id=current_term;
  UPDATE projects SET status='IN_PROGRESS' WHERE term_id=current_term AND status='DRAFT';
 END IF;
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE project_students ENABLE TRIGGER membership_window;
ALTER TABLE project_tasks ENABLE TRIGGER work_guard;
ALTER TABLE project_issues ENABLE TRIGGER work_guard;

-- Current-semester activity remains light: one task per each of six demo teams.
DO $$ DECLARE t RECORD; BEGIN
 FOR t IN
  SELECT * FROM (SELECT DISTINCT ON (p.id) task.id,task.assigned_to,task.revision,p.seed_key
  FROM project_tasks task JOIN projects p ON p.id=task.project_id
  WHERE p.seed_key IN ('TEAM01','TEAM02','TEAM03','TEAM04','TEAM05','TEAM06')
  AND task.seed_key LIKE 'DEMO_TASK_STU%'
  ORDER BY p.id,task.id) selected WHERE selected.revision=0
 LOOP
  PERFORM set_project_task_status(t.assigned_to,t.id,t.revision,
   CASE WHEN t.seed_key IN ('TEAM01','TEAM02','TEAM03') THEN 'DONE' ELSE 'IN_PROGRESS' END);
 END LOOP;
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;
