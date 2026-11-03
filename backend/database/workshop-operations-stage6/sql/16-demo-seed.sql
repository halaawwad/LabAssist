-- Demonstration calendar only. Production working days and absence policy are manager-configured.
BEGIN;SET search_path=labassist_student,public;
-- Floor-plan coordinates copied from the current workshop UI; pixels are not physical dimensions.
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R1','RECT',1,'{"cx":325,"cy":117,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R2','RECT',1,'{"cx":527,"cy":117,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R3','RECT',1,'{"cx":728,"cy":117,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R4','RECT',1,'{"cx":929,"cy":117,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R5','RECT',1,'{"cx":1131,"cy":117,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R6','RECT',1,'{"cx":114,"cy":169,"w":70,"h":140,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R7','RECT',1,'{"cx":114,"cy":315,"w":70,"h":140,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R8','RECT',1,'{"cx":114,"cy":461,"w":70,"h":140,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R9','RECT',1,'{"cx":114,"cy":607,"w":70,"h":140,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R10','RECT',1,'{"cx":486,"cy":303,"w":70,"h":140,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R11','RECT',1,'{"cx":591,"cy":268,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R12','RECT',1,'{"cx":731,"cy":268,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R13','RECT',1,'{"cx":871,"cy":268,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R14','RECT',1,'{"cx":591,"cy":338,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R15','RECT',1,'{"cx":731,"cy":338,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R16','RECT',1,'{"cx":871,"cy":338,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R17','RECT',1,'{"cx":976,"cy":303,"w":70,"h":140,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R18','RECT',1,'{"cx":486,"cy":555,"w":70,"h":140,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R19','RECT',1,'{"cx":591,"cy":520,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R20','RECT',1,'{"cx":731,"cy":520,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R21','RECT',1,'{"cx":871,"cy":520,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R22','RECT',1,'{"cx":591,"cy":590,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R23','RECT',1,'{"cx":731,"cy":590,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R24','RECT',1,'{"cx":871,"cy":590,"w":140,"h":70,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('R25','RECT',1,'{"cx":976,"cy":555,"w":70,"h":140,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('C1','ROUND',2,'{"cx":305,"cy":781,"w":122,"h":122,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('C2','ROUND',2,'{"cx":731,"cy":781,"w":122,"h":122,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO workshop_tables(id,shape,team_capacity,geometry) VALUES('C3','ROUND',2,'{"cx":1120,"cy":781,"w":122,"h":122,"floorWidth":1496,"floorHeight":954,"units":"PIXELS"}'::jsonb) ON CONFLICT DO NOTHING;
DO $$ DECLARE manager UUID;term RECORD;project RECORD;fixture_day DATE;student UUID;table_code TEXT;loan UUID;number INT;BEGIN
 SELECT id INTO manager FROM accounts WHERE role='WORKSHOP_MANAGER' AND status<>'DISABLED';IF manager IS NULL THEN RAISE EXCEPTION 'Manager fixture required';END IF;
 FOR number IN 1..25 LOOP INSERT INTO workshop_tables(id,shape,team_capacity) VALUES('R'||number,'RECT',1) ON CONFLICT DO NOTHING;END LOOP;
 FOR number IN 1..3 LOOP INSERT INTO workshop_tables(id,shape,team_capacity) VALUES('C'||number,'ROUND',2) ON CONFLICT DO NOTHING;END LOOP;
 FOR term IN SELECT * FROM academic_terms WHERE is_demo AND seed_key IN ('DEMO_TERM','PREVIOUS_DEMO_TERM') LOOP
  INSERT INTO workshop_absence_policies(term_id,updated_by) VALUES(term.id,manager) ON CONFLICT DO NOTHING;
  FOR fixture_day IN SELECT d::date FROM generate_series(term.starts_on::timestamp,(CASE WHEN term.seed_key='DEMO_TERM' THEN term.starts_on+9 ELSE term.ends_on END)::timestamp,interval '1 day') d LOOP
   INSERT INTO workshop_days VALUES(term.id,fixture_day,extract(isodow FROM fixture_day) NOT IN (5,6),CASE WHEN extract(isodow FROM fixture_day) NOT IN (5,6) THEN '08:00'::time END,CASE WHEN extract(isodow FROM fixture_day) NOT IN (5,6) THEN '15:30'::time END,'Synthetic calendar fixture',0,manager) ON CONFLICT DO NOTHING;
   IF EXISTS(SELECT 1 FROM workshop_days WHERE term_id=term.id AND workshop_days.day=fixture_day AND is_working) THEN
    INSERT INTO workshop_attendance(term_id,day,student_id,status,updated_by) SELECT term.id,fixture_day,e.student_id,'PRESENT',manager FROM student_enrollments e WHERE e.term_id=term.id ON CONFLICT DO NOTHING;
   END IF;
  END LOOP;
 END LOOP;
 FOR project IN SELECT p.*,t.starts_on,t.seed_key AS term_key FROM projects p JOIN academic_terms t ON t.id=p.term_id WHERE t.is_demo ORDER BY p.term_id,p.seed_key LOOP
  number=substring(project.seed_key from '[0-9]+$')::int;table_code='R'||number;
  INSERT INTO workshop_table_assignments(project_id,term_id,table_id,assigned_by,verified_by,verified_at) SELECT project.id,project.term_id,table_code,manager,manager,clock_timestamp() WHERE NOT EXISTS(SELECT 1 FROM workshop_table_assignments WHERE project_id=project.id) ON CONFLICT DO NOTHING;
  loan=md5('DEMO_HANDOVER:'||project.id)::uuid;
  INSERT INTO workshop_handovers(id,seed_key,project_id,issued_by,issued_on) VALUES(loan,'DEMO_HANDOVER_'||project.seed_key,project.id,manager,project.starts_on) ON CONFLICT DO NOTHING;
  INSERT INTO workshop_handover_items(id,handover_id,name,quantity,returned_good) SELECT md5(loan::text||name)::uuid,loan,name,1,CASE WHEN project.term_key='PREVIOUS_DEMO_TERM' THEN 1 ELSE 0 END FROM unnest(ARRAY['Soldering station','Digital multimeter','Hand tool kit']) name ON CONFLICT DO NOTHING;
 END LOOP;
END $$;COMMIT;
