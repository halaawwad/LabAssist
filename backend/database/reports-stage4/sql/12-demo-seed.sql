-- Synthetic report fixtures. No uploads, credentials, AI responses or external delivery.
-- Requires the accepted 23 current / 15 previous semester fixture.
BEGIN;
SET search_path=labassist_student,public;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM academic_terms WHERE seed_key='PREVIOUS_DEMO_TERM' AND is_demo)
 OR (SELECT count(*) FROM projects WHERE seed_key LIKE 'PAST_TEAM%')<>15
 OR (SELECT count(*) FROM projects WHERE seed_key ~ '^TEAM[0-9]{2}$')<>23
 THEN RAISE EXCEPTION 'Apply the two-semester demo seed before reports'; END IF;
END $$;

INSERT INTO presentation_templates(id,version,name,category,design) VALUES
 ('margin',1,'Quiet Margin','Minimal','{"layout_key":"margin","canvas":"free"}'),
 ('editorial',1,'The Editorial','Editorial','{"layout_key":"editorial","canvas":"free"}'),
 ('stripe',1,'Bold Statement','Modern','{"layout_key":"stripe","canvas":"free"}'),
 ('night',1,'After Hours','Modern','{"layout_key":"night","canvas":"free"}'),
 ('arch',1,'Open Window','Creative','{"layout_key":"arch","canvas":"free"}'),
 ('gallery',1,'Gallery Wall','Photo','{"layout_key":"gallery","canvas":"free"}'),
 ('split',1,'Two Sides','Minimal','{"layout_key":"split","canvas":"free"}'),
 ('outline',1,'Fine Frame','Formal','{"layout_key":"outline","canvas":"free"}'),
 ('cards',1,'Component Bench','Electronics','{"layout_key":"cards","canvas":"free"}'),
 ('notebook',1,'Field Notes','Editorial','{"layout_key":"notebook","canvas":"free"}'),
 ('circuit',1,'Circuit Board','Electronics','{"layout_key":"circuit","canvas":"free"}'),
 ('swiss',1,'Breadboard Lab','Electronics','{"layout_key":"swiss","canvas":"free"}'),
 ('timeline',1,'Signal Path','Electronics','{"layout_key":"timeline","canvas":"free"}'),
 ('spotlight',1,'In the Spotlight','Creative','{"layout_key":"spotlight","canvas":"free"}'),
 ('academic',1,'Thesis Hall','Formal','{"layout_key":"academic","canvas":"free"}'),
 ('dashboard',1,'Scope Studio','Electronics','{"layout_key":"dashboard","canvas":"free"}'),
 ('mosaic',1,'Mosaic Studio','Photo','{"layout_key":"mosaic","canvas":"free"}'),
 ('ribbon',1,'The Bookmark','Formal','{"layout_key":"ribbon","canvas":"free"}'),
 ('type',1,'Type First','Editorial','{"layout_key":"type","canvas":"free"}'),
 ('horizon',1,'New Horizon','Minimal','{"layout_key":"horizon","canvas":"free"}')
ON CONFLICT DO NOTHING;

-- Backfill only state-entry/time guards, transactionally, on synthetic fixtures.
-- Snapshot immutability, FK/UNIQUE/CHECK constraints and audit remain active.
ALTER TABLE report_documents DISABLE TRIGGER report_document_scope;
ALTER TABLE report_submission_windows DISABLE TRIGGER report_window_scope;
ALTER TABLE report_submissions DISABLE TRIGGER report_submission_scope;
ALTER TABLE report_feedback DISABLE TRIGGER report_feedback_scope;
DO $$
DECLARE term RECORD;week_start DATE;first_monday DATE;week_no INT;last_day DATE;project RECORD;
 author UUID;supervisor UUID;period RECORD;document UUID;version UUID;submission UUID;
 submitted TIMESTAMPTZ;reviewed TIMESTAMPTZ;content JSONB;sections JSONB;students JSONB;report_kind TEXT;
BEGIN
 FOR term IN SELECT * FROM academic_terms WHERE seed_key IN ('DEMO_TERM','PREVIOUS_DEMO_TERM') AND is_demo LOOP
  first_monday=term.starts_on+((8-extract(isodow FROM term.starts_on)::int)%7);
  last_day=CASE WHEN term.seed_key='DEMO_TERM' THEN first_monday+7 ELSE term.ends_on END;
  week_no=0;
  FOR week_start IN SELECT d::date FROM generate_series(first_monday::timestamp,last_day::timestamp,interval '7 days') d LOOP
   week_no=week_no+1;
   INSERT INTO reporting_periods(id,seed_key,term_id,week_number,week_start,opens_at,due_at,late_until)
   VALUES(md5('REPORT_PERIOD:'||term.id||':'||week_no)::uuid,'DEMO_REPORT_PERIOD_'||term.seed_key||'_'||week_no,
    term.id,week_no,week_start,(week_start+3)::timestamp AT TIME ZONE 'Asia/Hebron',
    ((week_start+3)::timestamp+interval '21 hours') AT TIME ZONE 'Asia/Hebron',
    ((week_start+4)::timestamp+interval '21 hours') AT TIME ZONE 'Asia/Hebron')
   ON CONFLICT DO NOTHING;
  END LOOP;
 END LOOP;
 FOR project IN SELECT p.*,t.seed_key AS term_key,t.ends_on FROM projects p JOIN academic_terms t ON t.id=p.term_id
  WHERE t.is_demo AND (p.seed_key ~ '^TEAM[0-9]{2}$' OR p.seed_key LIKE 'PAST_TEAM%') ORDER BY p.seed_key LOOP
  SELECT student_id INTO author FROM project_students WHERE project_id=project.id ORDER BY student_id LIMIT 1;
  SELECT supervisor_id INTO supervisor FROM project_supervisors WHERE project_id=project.id ORDER BY supervisor_id LIMIT 1;
  FOREACH report_kind IN ARRAY ARRAY['FINAL','PRESENTATION'] LOOP
   INSERT INTO report_submission_windows(project_id,kind,is_open,updated_by)
   VALUES(project.id,report_kind,false,supervisor) ON CONFLICT DO NOTHING;
  END LOOP;
  FOR period IN SELECT * FROM reporting_periods WHERE term_id=project.term_id
   AND (project.term_key<>'DEMO_TERM' OR week_number=1) ORDER BY week_number LOOP
   document=md5('DEMO_WEEKLY:'||project.id||':'||period.id)::uuid;
   submitted=CASE WHEN project.term_key='DEMO_TERM' THEN greatest(period.opens_at,least(period.opens_at+interval '12 hours',clock_timestamp()-interval '1 minute')) ELSE period.due_at-interval '1 hour' END;
   content=jsonb_build_object('work',CASE WHEN project.term_key='DEMO_TERM' THEN 'Agreed the initial project scope, responsibilities and component list.' ELSE 'Recorded the weekly design, implementation and test work for the completed prototype.' END,
    'progress',CASE WHEN project.term_key='DEMO_TERM' THEN 5 ELSE least(100,round(100.0*period.week_number/(SELECT max(week_number) FROM reporting_periods WHERE term_id=project.term_id)))::int END,
    'progressNote',CASE WHEN project.term_key='DEMO_TERM' THEN 'Planning stage; hardware validation has not been completed.' ELSE 'Progress recorded in the previous-semester demonstration history.' END,
    'tasks',CASE WHEN project.term_key='DEMO_TERM' THEN 'Initial planning and task allocation.' ELSE 'Documented weekly implementation and validation tasks.' END,
    'hasDelays',false,'delayReason','','delayAction','','problems','No blockers recorded.','plan',CASE WHEN project.term_key='DEMO_TERM' THEN 'Start component checks and document the initial circuit.' ELSE 'Continue the next scheduled design and validation step.' END);
   INSERT INTO report_documents(id,seed_key,project_id,kind,period_id,draft_content,created_by,updated_by,created_at,updated_at)
   VALUES(document,'DEMO_WEEKLY_'||project.seed_key||'_'||period.week_number,project.id,'WEEKLY',period.id,content,author,author,submitted-interval '1 hour',submitted-interval '1 minute')
   ON CONFLICT DO NOTHING;
   SELECT id INTO version FROM report_versions WHERE document_id=document ORDER BY version_number LIMIT 1;
   submission=md5('DEMO_SUBMISSION:'||document)::uuid;
   INSERT INTO report_submissions(id,seed_key,document_id,version_id,request_key,request_payload,submitted_by,submitted_at,changed_by)
   VALUES(submission,'DEMO_SUBMISSION_'||document,document,version,md5('DEMO_REQUEST:'||document)::uuid,
    jsonb_build_object('fixture',true,'document',document),author,submitted,author) ON CONFLICT DO NOTHING;
   IF project.term_key<>'DEMO_TERM' THEN
    reviewed=submitted+interval '2 hours';
    UPDATE report_submissions SET first_viewed_by=supervisor,first_viewed_at=reviewed WHERE id=submission AND first_viewed_at IS NULL;
    INSERT INTO report_feedback(id,submission_id,request_key,request_payload,kind,decision,body,created_by,updated_by,created_at,updated_at)
    VALUES(md5('DEMO_FEEDBACK:'||submission)::uuid,submission,md5('DEMO_FEEDBACK_REQUEST:'||submission)::uuid,'{"fixture":true}',
     'REVIEW','REVIEWED','Weekly progress reviewed; retain the test evidence and follow the next-week plan.',supervisor,supervisor,reviewed,reviewed)
    ON CONFLICT DO NOTHING;
   END IF;
  END LOOP;
  IF project.term_key='DEMO_TERM' THEN CONTINUE; END IF;
  SELECT jsonb_agg(jsonb_build_object('name',a.full_name,'number',a.university_number) ORDER BY a.id) INTO students
  FROM project_students m JOIN accounts a ON a.id=m.student_id WHERE m.project_id=project.id;
  SELECT jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'blocks',jsonb_build_array(jsonb_build_object('id',s.id||'-paragraph','kind','paragraph','text',s.text))) ORDER BY s.position)
  INTO sections FROM (VALUES
   (1,'acknowledgment','Acknowledgment','The team acknowledges the supervision and support provided during the project.'),
   (2,'disclaimer','Disclaimer','Synthetic graduation-project report for database demonstrations.'),
   (3,'abbreviations','List of Abbreviations','MCU: Microcontroller. PWM: Pulse Width Modulation. BOM: Bill of Materials.'),
   (4,'abstract','Abstract','The team developed and tested a small hardware prototype with documented requirements and limitations.'),
   (5,'introduction','Introduction','The project addresses a practical sensing and control problem using an affordable embedded design.'),
   (6,'background','Theoretical Background and Previous Work','Previous embedded sensing approaches informed the design and comparison of alternative components.'),
   (7,'methodology','Methodology','The team selected components, assembled the circuit, calibrated the sensors and repeated bench tests.'),
   (8,'results','Results and Analysis','The prototype completed the documented demonstration test sequence. Detailed measurements belong to the project test record.'),
   (9,'discussion','Discussion','Sensor calibration and power stability remain important design considerations. Limitations and improvements are documented.'),
   (10,'conclusions','Conclusions and Recommendations','The team completed the demonstration build and recommends further testing under more varied operating conditions.'),
   (11,'references','References','Demonstration reference list; replace with the project actual component documentation and research sources.')
  ) s(position,id,title,text);
  FOREACH report_kind IN ARRAY ARRAY['FINAL','PRESENTATION'] LOOP
   document=md5('DEMO_'||report_kind||':'||project.id)::uuid;
   submitted=((project.ends_on::timestamp+interval '20 hours 30 minutes') AT TIME ZONE 'Asia/Hebron')+CASE WHEN report_kind='PRESENTATION' THEN interval '15 minutes' ELSE interval '0' END;
   IF report_kind='FINAL' THEN
    content=jsonb_build_object('meta',jsonb_build_object('title',project.name,'department','Computer Engineering','specialization','Hardware Systems','students',students),
     'page',jsonb_build_object('size','A4','font','Times New Roman','fontSize',12),'sections',sections);
   ELSE
    content=jsonb_build_object('title',project.name,'slides',jsonb_build_array(
     jsonb_build_object('id','cover','layout','cover','title',project.name,'body','Graduation project presentation','objects','[]'::jsonb),
     jsonb_build_object('id','problem','layout','bullets','title','Problem and objectives','body','Build and validate an affordable sensing and control prototype.','objects','[]'::jsonb),
     jsonb_build_object('id','design','layout','split','title','System design','body','Controller, sensors, motor driver and power supply.','objects','[]'::jsonb),
     jsonb_build_object('id','results','layout','results','title','Validation','body','Bench tests, calibration checks and limitations.','objects','[]'::jsonb),
     jsonb_build_object('id','closing','layout','closing','title','Conclusions','body','Completed prototype and proposed improvements.','objects','[]'::jsonb)));
   END IF;
   INSERT INTO report_documents(id,seed_key,project_id,kind,draft_content,appearance,template_id,template_version,created_by,updated_by,created_at,updated_at)
   VALUES(document,'DEMO_'||report_kind||'_'||project.seed_key,project.id,report_kind,content,
    CASE WHEN report_kind='PRESENTATION' THEN '{"accent":"#738e61","theme":"sage"}'::jsonb ELSE '{}'::jsonb END,
    CASE WHEN report_kind='PRESENTATION' THEN 'circuit' END,CASE WHEN report_kind='PRESENTATION' THEN 1 END,
    author,author,submitted-interval '10 days',submitted-interval '1 hour') ON CONFLICT DO NOTHING;
   SELECT id INTO version FROM report_versions WHERE document_id=document ORDER BY version_number LIMIT 1;
   submission=md5('DEMO_SUBMISSION:'||document)::uuid;reviewed=submitted+interval '30 minutes';
   INSERT INTO report_submissions(id,seed_key,document_id,version_id,request_key,request_payload,submitted_by,submitted_at,changed_by,student_note,first_viewed_by,first_viewed_at)
   VALUES(submission,'DEMO_SUBMISSION_'||document,document,version,md5('DEMO_REQUEST:'||document)::uuid,'{"fixture":true}',author,submitted,author,
    'Final shared team submission.',supervisor,reviewed) ON CONFLICT DO NOTHING;
   INSERT INTO report_feedback(id,submission_id,request_key,request_payload,kind,decision,body,created_by,updated_by,created_at,updated_at)
   VALUES(md5('DEMO_FEEDBACK:'||submission)::uuid,submission,md5('DEMO_FEEDBACK_REQUEST:'||submission)::uuid,'{"fixture":true}',
    'REVIEW','APPROVED','The submitted team work and its documented limitations have been reviewed.',supervisor,supervisor,reviewed,reviewed)
   ON CONFLICT DO NOTHING;
  END LOOP;
 END LOOP;
END $$;
ALTER TABLE report_documents ENABLE TRIGGER report_document_scope;
ALTER TABLE report_submission_windows ENABLE TRIGGER report_window_scope;
ALTER TABLE report_submissions ENABLE TRIGGER report_submission_scope;
ALTER TABLE report_feedback ENABLE TRIGGER report_feedback_scope;
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;
