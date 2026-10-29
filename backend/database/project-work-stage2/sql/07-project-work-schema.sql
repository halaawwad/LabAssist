-- Project tasks/issues only. Apply after the three Stage 1 modules.
BEGIN;
SET search_path=labassist_student,public;
CREATE TABLE project_tasks (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), seed_key TEXT UNIQUE,
 project_id UUID NOT NULL REFERENCES projects(id),
 created_by UUID NOT NULL REFERENCES accounts(id),
 assigned_to UUID NOT NULL REFERENCES accounts(id),
 updated_by UUID NOT NULL REFERENCES accounts(id),
 title TEXT NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 240),
 description TEXT NOT NULL DEFAULT '',due_on DATE,
 status TEXT NOT NULL DEFAULT 'TODO' CHECK(status IN ('TODO','IN_PROGRESS','DONE')),
 needs_help BOOLEAN NOT NULL DEFAULT false,
 completed_at TIMESTAMPTZ,
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((status='DONE')=(completed_at IS NOT NULL)),
 CHECK(status<>'DONE' OR NOT needs_help)
);
CREATE TABLE project_issues (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,
 project_id UUID NOT NULL REFERENCES projects(id),
 created_by UUID NOT NULL REFERENCES accounts(id),updated_by UUID NOT NULL REFERENCES accounts(id),
 title TEXT NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 240),
 description TEXT NOT NULL DEFAULT '',
 priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW','MEDIUM','HIGH')),
 status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','MONITORING','RESOLVED')),
 resolution TEXT NOT NULL DEFAULT '',resolved_by UUID REFERENCES accounts(id),resolved_at TIMESTAMPTZ,
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((status='RESOLVED' AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND length(btrim(resolution))>0)
 OR (status<>'RESOLVED' AND resolved_by IS NULL AND resolved_at IS NULL AND resolution=''))
);
CREATE TABLE project_work_events (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 project_id UUID NOT NULL REFERENCES projects(id),actor_id UUID NOT NULL REFERENCES accounts(id),
 task_id UUID REFERENCES project_tasks(id),issue_id UUID REFERENCES project_issues(id),
 event_key TEXT NOT NULL CHECK(event_key IN ('CREATED','UPDATED')),
 before_state JSONB,after_state JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((task_id IS NULL)<>(issue_id IS NULL))
);
CREATE INDEX task_project_owner_status ON project_tasks(project_id,assigned_to,status);
CREATE INDEX issue_project_status ON project_issues(project_id,status);
CREATE INDEX work_activity_project ON project_work_events(project_id,created_at DESC,id DESC);

-- actor columns are supplied by a trusted backend, never accepted as client identity.
CREATE FUNCTION project_work_guard() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT team_member(NEW.created_by,NEW.project_id) AND TG_OP='INSERT' THEN RAISE EXCEPTION 'Task or issue creator must be a current teammate'; END IF;
 IF NOT team_member(NEW.updated_by,NEW.project_id) THEN RAISE EXCEPTION 'Work actor must be a current teammate'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.seed_key,NEW.project_id,NEW.created_by,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.seed_key,OLD.project_id,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Work identity is immutable'; END IF;
  NEW.revision=OLD.revision+1;
 ELSE
  IF NEW.updated_by<>NEW.created_by OR NEW.revision<>0 THEN RAISE EXCEPTION 'Initial work actor and revision invalid'; END IF;
 END IF;
 IF TG_TABLE_NAME='project_tasks' THEN
  IF TG_OP='INSERT' THEN
   IF NOT team_member(NEW.assigned_to,NEW.project_id) THEN RAISE EXCEPTION 'Task assignee must be a current teammate'; END IF;
   IF NEW.status<>'TODO' THEN RAISE EXCEPTION 'New task starts as TODO; assignee confirms progress'; END IF;
  ELSE
   IF NEW.assigned_to<>OLD.assigned_to THEN RAISE EXCEPTION 'Task reassignment is not implemented'; END IF;
   IF NEW.updated_by<>OLD.assigned_to THEN RAISE EXCEPTION 'Only task assignee may update their task'; END IF;
  END IF;
  IF NEW.status='DONE' THEN
   IF TG_OP='UPDATE' AND OLD.status='DONE' THEN NEW.completed_at=OLD.completed_at;
   ELSE NEW.completed_at=clock_timestamp(); END IF;
   NEW.needs_help=false;
  ELSE NEW.completed_at=NULL; END IF;
 ELSE
  IF TG_OP='INSERT' AND NEW.status<>'OPEN' THEN RAISE EXCEPTION 'New issue starts as OPEN'; END IF;
  IF NEW.status='RESOLVED' THEN
   IF TG_OP='UPDATE' AND OLD.status='RESOLVED' THEN NEW.resolved_by=OLD.resolved_by;NEW.resolved_at=OLD.resolved_at;
   ELSE NEW.resolved_by=NEW.updated_by;NEW.resolved_at=clock_timestamp(); END IF;
  ELSE NEW.resolved_by=NULL;NEW.resolved_at=NULL;NEW.resolution=''; END IF;
 END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER work_guard BEFORE INSERT OR UPDATE ON project_tasks FOR EACH ROW EXECUTE FUNCTION project_work_guard();
CREATE TRIGGER work_guard BEFORE INSERT OR UPDATE ON project_issues FOR EACH ROW EXECUTE FUNCTION project_work_guard();
CREATE FUNCTION log_project_work() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
BEGIN
 INSERT INTO project_work_events(project_id,actor_id,task_id,issue_id,event_key,before_state,after_state)
 VALUES(NEW.project_id,NEW.updated_by,CASE WHEN TG_TABLE_NAME='project_tasks' THEN NEW.id END,
 CASE WHEN TG_TABLE_NAME='project_issues' THEN NEW.id END,
 CASE WHEN TG_OP='INSERT' THEN 'CREATED' ELSE 'UPDATED' END,
 CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) END,to_jsonb(NEW));RETURN NEW;
END $$;
CREATE TRIGGER log_work AFTER INSERT OR UPDATE ON project_tasks FOR EACH ROW EXECUTE FUNCTION log_project_work();
CREATE TRIGGER log_work AFTER INSERT OR UPDATE ON project_issues FOR EACH ROW EXECUTE FUNCTION log_project_work();
CREATE FUNCTION immutable_work_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Project work history is append only'; END $$;
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON project_work_events FOR EACH ROW EXECUTE FUNCTION immutable_work_history();

CREATE FUNCTION set_project_task_status(actor UUID,task UUID,expected_revision INT,next_status TEXT,help BOOLEAN DEFAULT false)
RETURNS project_tasks LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current_task project_tasks%ROWTYPE;
BEGIN
 SELECT * INTO current_task FROM project_tasks WHERE id=task FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Task not found'; END IF;
 IF NOT team_member(actor,current_task.project_id) OR actor<>current_task.assigned_to THEN RAISE EXCEPTION 'Only task assignee may update their task'; END IF;
 IF expected_revision IS NULL OR current_task.revision<>expected_revision THEN RAISE EXCEPTION 'Work revision conflict'; END IF;
 UPDATE project_tasks SET status=next_status,needs_help=help,updated_by=actor WHERE id=task RETURNING * INTO current_task;
 RETURN current_task;
END $$;
CREATE FUNCTION set_project_issue_status(actor UUID,issue UUID,expected_revision INT,next_status TEXT,solution TEXT DEFAULT '')
RETURNS project_issues LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current_issue project_issues%ROWTYPE;
BEGIN
 SELECT * INTO current_issue FROM project_issues WHERE id=issue FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Issue not found'; END IF;
 IF NOT team_member(actor,current_issue.project_id) THEN RAISE EXCEPTION 'Work actor must be a current teammate'; END IF;
 IF expected_revision IS NULL OR current_issue.revision<>expected_revision THEN RAISE EXCEPTION 'Work revision conflict'; END IF;
 UPDATE project_issues SET status=next_status,resolution=solution,updated_by=actor WHERE id=issue RETURNING * INTO current_issue;
 RETURN current_issue;
END $$;
CREATE VIEW project_member_work_summary AS
 SELECT m.project_id,m.student_id,count(t.id) AS total_tasks,
 count(t.id) FILTER(WHERE t.status='DONE') AS completed_tasks,
 count(t.id) FILTER(WHERE t.status='IN_PROGRESS') AS in_progress_tasks,
 count(t.id) FILTER(WHERE t.status='TODO') AS remaining_tasks,
 count(t.id) FILTER(WHERE t.status<>'DONE' AND t.due_on<(now() AT TIME ZONE 'Asia/Hebron')::date) AS overdue_tasks,
 COALESCE(round(100.0*count(t.id) FILTER(WHERE t.status='DONE')/NULLIF(count(t.id),0),2),0) AS progress_percent
 FROM project_students m LEFT JOIN project_tasks t ON t.project_id=m.project_id AND t.assigned_to=m.student_id
 WHERE m.left_at IS NULL GROUP BY m.project_id,m.student_id;
CREATE VIEW project_team_work_summary AS
 SELECT p.id AS project_id,
 COALESCE((SELECT round(avg(s.progress_percent),2) FROM project_member_work_summary s WHERE s.project_id=p.id),0) AS average_progress_percent,
 (SELECT count(*) FROM project_tasks t WHERE t.project_id=p.id AND t.status<>'DONE') AS open_tasks,
 (SELECT count(*) FROM project_issues i WHERE i.project_id=p.id AND i.status<>'RESOLVED') AS open_issues
 FROM projects p;
REVOKE ALL ON project_tasks,project_issues,project_work_events,project_member_work_summary,project_team_work_summary FROM PUBLIC;
REVOKE ALL ON FUNCTION project_work_guard(),log_project_work(),immutable_work_history(),set_project_task_status(UUID,UUID,INT,TEXT,BOOLEAN),set_project_issue_status(UUID,UUID,INT,TEXT,TEXT) FROM PUBLIC;
COMMIT;
