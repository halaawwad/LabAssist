CREATE FUNCTION pg_temp.ok(label TEXT,value BOOLEAN) RETURNS TEXT LANGUAGE plpgsql AS $$ BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label;END IF;RETURN 'PASS: '||label;END $$;
CREATE FUNCTION pg_temp.reject(label TEXT,statement TEXT,expected TEXT) RETURNS TEXT LANGUAGE plpgsql AS $$ BEGIN
 BEGIN EXECUTE statement;EXCEPTION WHEN OTHERS THEN IF strpos(lower(SQLERRM),lower(expected))=0 THEN RAISE EXCEPTION 'FAILED %: unexpected %',label,SQLERRM;END IF;RETURN 'PASS: '||label;END;RAISE EXCEPTION 'FAILED: % was accepted',label;END $$;
CREATE TEMP TABLE f AS SELECT p.id AS project,p.term_id AS term,
 (SELECT student_id FROM project_students WHERE project_id=p.id ORDER BY student_id LIMIT 1) AS owner,
 (SELECT student_id FROM project_students WHERE project_id=p.id ORDER BY student_id OFFSET 1 LIMIT 1) AS teammate,
 (SELECT student_id FROM project_students WHERE project_id=(SELECT id FROM projects WHERE seed_key='TEAM02') ORDER BY student_id LIMIT 1) AS outsider,
 (SELECT supervisor_id FROM project_supervisors WHERE project_id=p.id ORDER BY supervisor_id LIMIT 1) AS supervisor,
 (SELECT id FROM accounts WHERE role='WORKSHOP_MANAGER' AND status<>'DISABLED') AS manager
 FROM projects p WHERE p.seed_key='TEAM01';
CREATE TEMP TABLE ids(key TEXT PRIMARY KEY,id UUID NOT NULL);
