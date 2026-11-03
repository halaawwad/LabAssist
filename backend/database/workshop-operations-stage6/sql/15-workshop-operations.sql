BEGIN;
SET search_path=labassist_student,public;
CREATE FUNCTION data_student(actor UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$ SELECT communication_actor(actor) AND EXISTS(SELECT 1 FROM accounts WHERE id=actor AND role='STUDENT') $$;
CREATE FUNCTION data_manager(actor UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$ SELECT communication_actor(actor) AND EXISTS(SELECT 1 FROM accounts WHERE id=actor AND role='WORKSHOP_MANAGER') $$;
CREATE FUNCTION data_revision(actual INT,expected INT) RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN IF expected IS NULL OR actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Revision conflict' USING ERRCODE='40001'; END IF;END $$;
CREATE TABLE workshop_days (
 term_id UUID NOT NULL REFERENCES academic_terms(id),day DATE NOT NULL,is_working BOOLEAN NOT NULL,
 opens TIME,closes TIME,reason TEXT NOT NULL DEFAULT '',revision INT NOT NULL DEFAULT 0,
 updated_by UUID NOT NULL REFERENCES accounts(id),PRIMARY KEY(term_id,day),
 CHECK((is_working AND opens IS NOT NULL AND closes IS NOT NULL AND closes>opens) OR (NOT is_working AND opens IS NULL AND closes IS NULL))
);
CREATE TABLE workshop_absence_policies (
 term_id UUID PRIMARY KEY REFERENCES academic_terms(id),limit_percent NUMERIC(5,2) CHECK(limit_percent>0 AND limit_percent<=100),
 updated_by UUID NOT NULL REFERENCES accounts(id),revision INT NOT NULL DEFAULT 0
);
CREATE TABLE workshop_attendance (
 term_id UUID NOT NULL,day DATE NOT NULL,student_id UUID NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('PRESENT','ABSENT')),revision INT NOT NULL DEFAULT 0,updated_by UUID NOT NULL REFERENCES accounts(id),
 PRIMARY KEY(term_id,day,student_id),FOREIGN KEY(term_id,day) REFERENCES workshop_days(term_id,day),
 FOREIGN KEY(student_id,term_id) REFERENCES student_enrollments(student_id,term_id)
);
CREATE TABLE workshop_tables (
 id TEXT PRIMARY KEY,shape TEXT NOT NULL CHECK(shape IN ('RECT','ROUND')),team_capacity INT NOT NULL CHECK(team_capacity BETWEEN 1 AND 2),
 geometry JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(geometry)='object')
);
CREATE TABLE workshop_table_assignments (
 project_id UUID PRIMARY KEY,term_id UUID NOT NULL,table_id TEXT NOT NULL REFERENCES workshop_tables(id),
 assigned_by UUID NOT NULL REFERENCES accounts(id),verified_by UUID REFERENCES accounts(id),verified_at TIMESTAMPTZ,
 revision INT NOT NULL DEFAULT 0,updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(project_id,term_id) REFERENCES projects(id,term_id),CHECK((verified_by IS NULL)=(verified_at IS NULL))
);
CREATE TABLE workshop_table_history (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),project_id UUID NOT NULL REFERENCES projects(id),table_id TEXT NOT NULL REFERENCES workshop_tables(id),
 actor_id UUID NOT NULL REFERENCES accounts(id),revision INT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(project_id,revision)
);
CREATE TRIGGER table_history_immutable BEFORE UPDATE OR DELETE ON workshop_table_history FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TABLE workshop_handovers (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,project_id UUID NOT NULL REFERENCES projects(id),
 issued_by UUID NOT NULL REFERENCES accounts(id),issued_on DATE NOT NULL,revision INT NOT NULL DEFAULT 0,
 request_key UUID,request_payload JSONB,UNIQUE(project_id,request_key)
);
CREATE TABLE workshop_handover_items (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),handover_id UUID NOT NULL REFERENCES workshop_handovers(id),
 name TEXT NOT NULL CHECK(length(btrim(name))>0),quantity INT NOT NULL CHECK(quantity>0),
 returned_good INT NOT NULL DEFAULT 0 CHECK(returned_good>=0),returned_damaged INT NOT NULL DEFAULT 0 CHECK(returned_damaged>=0),
 missing INT NOT NULL DEFAULT 0 CHECK(missing>=0),note TEXT NOT NULL DEFAULT '',
 CHECK(returned_good+returned_damaged+missing<=quantity),UNIQUE(handover_id,name)
);
CREATE TABLE workshop_return_updates (
 handover_id UUID NOT NULL REFERENCES workshop_handovers(id),request_key UUID NOT NULL,payload JSONB NOT NULL,
 actor_id UUID NOT NULL REFERENCES accounts(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(handover_id,request_key)
);
CREATE TRIGGER return_updates_immutable BEFORE UPDATE OR DELETE ON workshop_return_updates FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TABLE workshop_records (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,term_id UUID NOT NULL REFERENCES academic_terms(id),
 project_id UUID,student_id UUID,kind TEXT NOT NULL CHECK(kind IN ('NOTICE','OBSERVATION','ABSENCE_ALERT')),
 category TEXT NOT NULL DEFAULT 'general',body TEXT NOT NULL CHECK(length(btrim(body))>0),
 created_by UUID NOT NULL REFERENCES accounts(id),updated_by UUID NOT NULL REFERENCES accounts(id),revision INT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),FOREIGN KEY(project_id,term_id) REFERENCES projects(id,term_id),
 FOREIGN KEY(student_id,term_id) REFERENCES student_enrollments(student_id,term_id),
 CHECK(kind<>'OBSERVATION' OR project_id IS NOT NULL),CHECK((kind='ABSENCE_ALERT')=(student_id IS NOT NULL))
);
CREATE UNIQUE INDEX one_absence_alert_per_student_term ON workshop_records(term_id,student_id) WHERE kind='ABSENCE_ALERT';
CREATE TABLE workshop_record_recipients (
 record_id UUID NOT NULL REFERENCES workshop_records(id),account_id UUID NOT NULL REFERENCES accounts(id),read_at TIMESTAMPTZ,PRIMARY KEY(record_id,account_id)
);
CREATE INDEX attendance_student_term ON workshop_attendance(student_id,term_id,day);
CREATE INDEX workshop_record_recipient ON workshop_record_recipients(account_id,record_id);
CREATE FUNCTION workshop_operation_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE actor UUID;term UUID;on_day DATE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Workshop history cannot be deleted'; END IF;
 IF TG_TABLE_NAME='workshop_handovers' THEN
  actor=NEW.issued_by;
  IF TG_OP='UPDATE' AND ROW(NEW.id,NEW.project_id,NEW.issued_by,NEW.issued_on,NEW.request_key,NEW.request_payload) IS DISTINCT FROM ROW(OLD.id,OLD.project_id,OLD.issued_by,OLD.issued_on,OLD.request_key,OLD.request_payload) THEN RAISE EXCEPTION 'Handover identity is immutable';END IF;
 ELSE actor=NEW.updated_by;END IF;
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required'; END IF;
 IF TG_TABLE_NAME IN ('workshop_days','workshop_attendance') THEN
  term=NEW.term_id;on_day=NEW.day;
  IF NOT EXISTS(SELECT 1 FROM academic_terms WHERE id=term AND on_day>=starts_on AND (ends_on IS NULL OR on_day<=ends_on)) THEN RAISE EXCEPTION 'Day outside academic term'; END IF;
 END IF;
 IF TG_TABLE_NAME='workshop_attendance' THEN
  IF NOT EXISTS(SELECT 1 FROM workshop_days WHERE term_id=term AND day=on_day AND is_working) THEN RAISE EXCEPTION 'Attendance requires an actual working day'; END IF;
  IF TG_OP='UPDATE' AND ROW(NEW.term_id,NEW.day,NEW.student_id) IS DISTINCT FROM ROW(OLD.term_id,OLD.day,OLD.student_id) THEN RAISE EXCEPTION 'Attendance identity is immutable'; END IF;
 ELSIF TG_TABLE_NAME='workshop_days' THEN
  IF TG_OP='UPDATE' AND ROW(NEW.term_id,NEW.day) IS DISTINCT FROM ROW(OLD.term_id,OLD.day) THEN RAISE EXCEPTION 'Calendar identity is immutable';END IF;
 ELSIF TG_TABLE_NAME='workshop_absence_policies' THEN
  IF TG_OP='UPDATE' AND NEW.term_id<>OLD.term_id THEN RAISE EXCEPTION 'Policy identity is immutable';END IF;
 ELSIF TG_TABLE_NAME='workshop_records' THEN
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.term_id,NEW.project_id,NEW.student_id,NEW.kind,NEW.created_by,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.term_id,OLD.project_id,OLD.student_id,OLD.kind,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Record identity is immutable'; END IF;
  IF EXISTS(SELECT 1 FROM workshop_record_recipients WHERE record_id=OLD.id AND read_at IS NOT NULL) THEN RAISE EXCEPTION 'Seen workshop record is read only'; END IF;
 END IF;END IF;
 IF TG_OP='UPDATE' AND TG_TABLE_NAME<>'workshop_handovers' THEN NEW.revision=OLD.revision+1; END IF;RETURN NEW;
END $$;
DO $$ DECLARE t TEXT;BEGIN FOREACH t IN ARRAY ARRAY['workshop_days','workshop_absence_policies','workshop_attendance','workshop_handovers','workshop_records'] LOOP
 EXECUTE format('CREATE TRIGGER operation_scope BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION workshop_operation_guard()',t);END LOOP;END $$;
CREATE FUNCTION set_workshop_day(actor UUID,term UUID,on_day DATE,working BOOLEAN,start_time TIME,end_time TIME,note TEXT,expected INT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current_revision INT;
BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 PERFORM 1 FROM academic_terms WHERE id=term FOR UPDATE;
 IF EXISTS(SELECT 1 FROM academic_terms WHERE id=term AND ends_on<(clock_timestamp() AT TIME ZONE 'Asia/Hebron')::date) THEN RAISE EXCEPTION 'Past term is read only';END IF;
 SELECT revision INTO current_revision FROM workshop_days WHERE term_id=term AND day=on_day FOR UPDATE;
 PERFORM data_revision(COALESCE(current_revision,-1),expected);
 INSERT INTO workshop_days(term_id,day,is_working,opens,closes,reason,updated_by) VALUES(term,on_day,working,start_time,end_time,note,actor)
 ON CONFLICT(term_id,day) DO UPDATE SET is_working=excluded.is_working,opens=excluded.opens,closes=excluded.closes,reason=excluded.reason,updated_by=actor RETURNING revision INTO current_revision;
 RETURN current_revision;
END $$;
CREATE FUNCTION set_absence_policy(actor UUID,term UUID,expected INT,threshold NUMERIC) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;
BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 PERFORM 1 FROM academic_terms WHERE id=term FOR UPDATE;
 IF EXISTS(SELECT 1 FROM academic_terms WHERE id=term AND ends_on<(clock_timestamp() AT TIME ZONE 'Asia/Hebron')::date) THEN RAISE EXCEPTION 'Past term is read only';END IF;
 SELECT revision INTO value FROM workshop_absence_policies WHERE term_id=term FOR UPDATE;PERFORM data_revision(COALESCE(value,-1),expected);
 INSERT INTO workshop_absence_policies(term_id,limit_percent,updated_by) VALUES(term,threshold,actor) ON CONFLICT(term_id) DO UPDATE SET limit_percent=excluded.limit_percent,updated_by=actor RETURNING revision INTO value;RETURN value;
END $$;
CREATE FUNCTION record_attendance(actor UUID,term UUID,on_day DATE,student UUID,expected INT,new_status TEXT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;today DATE=(clock_timestamp() AT TIME ZONE 'Asia/Hebron')::date;
BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 PERFORM 1 FROM workshop_days WHERE term_id=term AND day=on_day FOR UPDATE;
 IF on_day>today OR today>on_day+7 THEN RAISE EXCEPTION 'Attendance edit window closed';END IF;
 SELECT revision INTO value FROM workshop_attendance WHERE term_id=term AND day=on_day AND student_id=student FOR UPDATE;
 PERFORM data_revision(COALESCE(value,-1),expected);
 INSERT INTO workshop_attendance(term_id,day,student_id,status,updated_by) VALUES(term,on_day,student,new_status,actor)
 ON CONFLICT(term_id,day,student_id) DO UPDATE SET status=excluded.status,updated_by=actor RETURNING revision INTO value;RETURN value;
END $$;
CREATE FUNCTION assignment_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE capacity INT;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Assignment history cannot be deleted';END IF;
 IF NOT(data_manager(NEW.assigned_by) OR data_student(NEW.assigned_by) AND team_member(NEW.assigned_by,NEW.project_id)) THEN RAISE EXCEPTION 'Manager or own teammate required';END IF;
 SELECT team_capacity INTO capacity FROM workshop_tables WHERE id=NEW.table_id FOR UPDATE;
 IF (SELECT count(*) FROM workshop_table_assignments WHERE term_id=NEW.term_id AND table_id=NEW.table_id AND project_id<>NEW.project_id)>=capacity THEN RAISE EXCEPTION 'Table capacity exceeded';END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.project_id,NEW.term_id) IS DISTINCT FROM ROW(OLD.project_id,OLD.term_id) THEN RAISE EXCEPTION 'Assignment identity immutable';END IF;
  NEW.revision=OLD.revision+1;
 END IF;
 IF NEW.verified_by IS NOT NULL AND NOT data_manager(NEW.verified_by) THEN RAISE EXCEPTION 'Manager verification required';END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER assignment_scope BEFORE INSERT OR UPDATE OR DELETE ON workshop_table_assignments FOR EACH ROW EXECUTE FUNCTION assignment_guard();
CREATE FUNCTION assignment_history_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$ BEGIN INSERT INTO workshop_table_history(project_id,table_id,actor_id,revision) VALUES(NEW.project_id,NEW.table_id,NEW.assigned_by,NEW.revision);RETURN NEW;END $$;
CREATE TRIGGER assignment_history AFTER INSERT OR UPDATE ON workshop_table_assignments FOR EACH ROW EXECUTE FUNCTION assignment_history_trigger();
CREATE FUNCTION assign_workshop_table(actor UUID,project UUID,target TEXT,expected INT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;term UUID;
BEGIN
 SELECT term_id INTO term FROM projects WHERE id=project AND status NOT IN ('COMPLETED','ARCHIVED') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current project required';END IF;
 IF NOT(data_manager(actor) OR data_student(actor) AND team_member(actor,project)) THEN RAISE EXCEPTION 'Manager or own teammate required';END IF;
 SELECT revision INTO value FROM workshop_table_assignments WHERE project_id=project FOR UPDATE;PERFORM data_revision(COALESCE(value,-1),expected);
 INSERT INTO workshop_table_assignments(project_id,term_id,table_id,assigned_by) VALUES(project,term,target,actor)
 ON CONFLICT(project_id) DO UPDATE SET table_id=target,assigned_by=actor,verified_by=NULL,verified_at=NULL RETURNING revision INTO value;RETURN value;
END $$;
CREATE FUNCTION verify_workshop_table(actor UUID,project UUID,expected INT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;
BEGIN IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 SELECT revision INTO value FROM workshop_table_assignments WHERE project_id=project FOR UPDATE;PERFORM data_revision(value,expected);
 UPDATE workshop_table_assignments SET verified_by=actor,verified_at=clock_timestamp(),assigned_by=actor WHERE project_id=project RETURNING revision INTO value;RETURN value;END $$;
CREATE FUNCTION update_tool_return(actor UUID,handover UUID,expected INT,request UUID,items JSONB) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;old_payload JSONB;entry JSONB;
BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 SELECT revision INTO value FROM workshop_handovers WHERE id=handover FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Handover not found';END IF;
 IF EXISTS(SELECT 1 FROM workshop_handovers h JOIN projects p ON p.id=h.project_id WHERE h.id=handover AND p.status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'Historical handover is read only';END IF;
 SELECT payload INTO old_payload FROM workshop_return_updates WHERE handover_id=handover AND request_key=request;
 IF FOUND THEN IF old_payload IS DISTINCT FROM items THEN RAISE EXCEPTION 'Return key reused with different data';END IF;RETURN value;END IF;
 PERFORM data_revision(value,expected);
 IF jsonb_typeof(items) IS DISTINCT FROM 'array' OR jsonb_array_length(items)=0 THEN RAISE EXCEPTION 'Return items required';END IF;
 FOR entry IN SELECT x FROM jsonb_array_elements(items) x LOOP
  UPDATE workshop_handover_items SET returned_good=(entry->>'good')::int,returned_damaged=(entry->>'damaged')::int,missing=(entry->>'missing')::int,note=COALESCE(entry->>'note','') WHERE id=(entry->>'id')::uuid AND handover_id=handover;
  IF NOT FOUND THEN RAISE EXCEPTION 'Return item belongs to another team';END IF;
 END LOOP;
 INSERT INTO workshop_return_updates VALUES(handover,request,items,actor,clock_timestamp());
 UPDATE workshop_handovers SET revision=revision+1 WHERE id=handover RETURNING revision INTO value;RETURN value;
END $$;
CREATE VIEW workshop_absence_summary AS SELECT e.student_id,e.term_id,
 (SELECT count(*) FROM workshop_days d WHERE d.term_id=e.term_id AND d.is_working AND d.day<=(clock_timestamp() AT TIME ZONE 'Asia/Hebron')::date) AS working_days,
 (SELECT count(*) FROM workshop_attendance a JOIN workshop_days d USING(term_id,day) WHERE a.term_id=e.term_id AND a.student_id=e.student_id AND d.is_working AND a.status='ABSENT') AS absences
 FROM student_enrollments e;
CREATE VIEW workshop_handover_summary AS SELECT h.id,h.project_id,COALESCE(sum(i.quantity-i.returned_good-i.returned_damaged),0) AS outstanding,
 COALESCE(sum(i.missing),0) AS flagged_missing,COALESCE(sum(i.returned_damaged),0) AS damaged FROM workshop_handovers h LEFT JOIN workshop_handover_items i ON i.handover_id=h.id GROUP BY h.id;
CREATE FUNCTION issue_team_tools(actor UUID,project UUID,request UUID,items JSONB) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;payload JSONB;entry JSONB;
BEGIN IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 PERFORM 1 FROM projects WHERE id=project AND status NOT IN ('COMPLETED','ARCHIVED') FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Current project required';END IF;
 SELECT id,request_payload INTO result,payload FROM workshop_handovers WHERE project_id=project AND request_key=request;
 IF FOUND THEN IF payload<>items THEN RAISE EXCEPTION 'Handover key reused with different items';END IF;RETURN result;END IF;
 IF jsonb_typeof(items) IS DISTINCT FROM 'array' OR jsonb_array_length(items)=0 THEN RAISE EXCEPTION 'Issued tool items required';END IF;
 INSERT INTO workshop_handovers(project_id,issued_by,issued_on,request_key,request_payload) VALUES(project,actor,(clock_timestamp() AT TIME ZONE 'Asia/Hebron')::date,request,items) RETURNING id INTO result;
 FOR entry IN SELECT x FROM jsonb_array_elements(items) x LOOP INSERT INTO workshop_handover_items(handover_id,name,quantity) VALUES(result,entry->>'name',(entry->>'quantity')::int);END LOOP;RETURN result;
END $$;
CREATE FUNCTION read_team_handovers(actor UUID,project UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT communication_actor(actor) OR NOT(data_manager(actor) OR team_member(actor,project) OR project_supervisor(actor,project)) THEN RAISE EXCEPTION 'Handover access denied';END IF;
 RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(s)),'[]') FROM workshop_handover_summary s WHERE project_id=project);END $$;
CREATE FUNCTION create_workshop_record(actor UUID,term UUID,project UUID,record_kind TEXT,message TEXT,students BOOLEAN DEFAULT true,supervisors BOOLEAN DEFAULT false,student UUID DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;event UUID;
BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 IF EXISTS(SELECT 1 FROM academic_terms WHERE id=term AND ends_on<(clock_timestamp() AT TIME ZONE 'Asia/Hebron')::date) THEN RAISE EXCEPTION 'Past term is read only';END IF;
 IF record_kind='ABSENCE_ALERT' THEN
  PERFORM 1 FROM accounts WHERE id=student FOR UPDATE;
  SELECT id INTO result FROM workshop_records WHERE term_id=term AND student_id=student AND kind='ABSENCE_ALERT';IF FOUND THEN RETURN result;END IF;
 END IF;
 INSERT INTO workshop_records(term_id,project_id,student_id,kind,body,created_by,updated_by) VALUES(term,project,student,record_kind,message,actor,actor) RETURNING id INTO result;
 IF record_kind='ABSENCE_ALERT' THEN INSERT INTO workshop_record_recipients VALUES(result,student,NULL);END IF;
 IF students AND record_kind='NOTICE' THEN INSERT INTO workshop_record_recipients SELECT result,s.student_id,NULL::timestamptz FROM project_students s WHERE s.term_id=term AND s.left_at IS NULL AND (project IS NULL OR s.project_id=project) ON CONFLICT DO NOTHING;END IF;
 IF supervisors OR record_kind IN ('OBSERVATION','ABSENCE_ALERT') THEN INSERT INTO workshop_record_recipients SELECT DISTINCT result,s.supervisor_id,NULL::timestamptz FROM project_supervisors s JOIN projects p ON p.id=s.project_id WHERE p.term_id=term AND (project IS NULL OR p.id=project) ON CONFLICT DO NOTHING;END IF;
 RETURN result;
END $$;
CREATE FUNCTION check_repeated_absence(actor UUID,student UUID,term UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE threshold NUMERIC;days BIGINT;missed BIGINT;project UUID;
BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager required';END IF;
 PERFORM 1 FROM accounts WHERE id=student FOR UPDATE;
 SELECT limit_percent INTO threshold FROM workshop_absence_policies WHERE term_id=term;
 SELECT working_days,absences INTO days,missed FROM workshop_absence_summary WHERE student_id=student AND term_id=term;
 IF threshold IS NULL OR days IS NULL OR days=0 OR 100.0*missed/days<=threshold THEN RETURN NULL;END IF;
 SELECT project_id INTO project FROM project_students WHERE student_id=student AND term_id=term AND left_at IS NULL;
 RETURN create_workshop_record(actor,term,project,'ABSENCE_ALERT','Repeated absence threshold exceeded.',false,true,student);
END $$;
CREATE FUNCTION edit_workshop_record(actor UUID,record UUID,expected INT,message TEXT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;BEGIN SELECT revision INTO value FROM workshop_records WHERE id=record AND created_by=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager author required';END IF;PERFORM data_revision(value,expected);
 UPDATE workshop_records SET body=message,updated_by=actor WHERE id=record RETURNING revision INTO value;RETURN value;END $$;
CREATE FUNCTION read_workshop_record(actor UUID,record UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result JSONB;BEGIN PERFORM 1 FROM workshop_records WHERE id=record FOR UPDATE;
 IF NOT workshop_record_access(actor,record) THEN RAISE EXCEPTION 'Workshop record access denied';END IF;
 IF NOT data_manager(actor) THEN UPDATE workshop_record_recipients SET read_at=COALESCE(read_at,clock_timestamp()) WHERE record_id=record AND account_id=actor;
  IF NOT FOUND OR NOT communication_actor(actor) THEN RAISE EXCEPTION 'Workshop record access denied';END IF;END IF;
 UPDATE notification_inbox i SET read_at=COALESCE(i.read_at,clock_timestamp()) FROM notification_events e WHERE e.id=i.event_id AND e.workshop_record_id=record AND i.recipient_id=actor;
 SELECT to_jsonb(r) INTO result FROM workshop_records r WHERE id=record;RETURN result;END $$;


-- Workshop inbox bridge: same private inbox, no external delivery.
CREATE FUNCTION workshop_record_access(actor UUID,record UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT communication_actor(actor) AND EXISTS(SELECT 1 FROM workshop_records r WHERE r.id=record AND (data_manager(actor) OR EXISTS(SELECT 1 FROM workshop_record_recipients i WHERE i.record_id=r.id AND i.account_id=actor) AND (r.project_id IS NULL OR team_member(actor,r.project_id) OR project_supervisor(actor,r.project_id))))
$$;
ALTER TABLE notification_events ADD COLUMN workshop_record_id UUID REFERENCES workshop_records(id);
DO $$ DECLARE name TEXT;BEGIN FOR name IN SELECT conname FROM pg_constraint WHERE conrelid='notification_events'::regclass AND contype='c' AND (pg_get_constraintdef(oid) LIKE '%kind%' OR pg_get_constraintdef(oid) LIKE '%num_nonnulls%') LOOP EXECUTE format('ALTER TABLE notification_events DROP CONSTRAINT %I',name);END LOOP;END $$;
ALTER TABLE notification_events ADD CONSTRAINT notification_kind_source CHECK(kind IN ('MESSAGE','MEETING_INVITE','MEETING_UPDATED','MEETING_RESPONSE','REPORT_SUBMITTED','REPORT_REVIEWED','REPORT_REOPENED','WORKSHOP_UPDATE')),
 ADD CONSTRAINT notification_source_count CHECK(num_nonnulls(message_id,meeting_id,submission_id,feedback_id,document_id,workshop_record_id)=1),
 ADD CONSTRAINT notification_source_message CHECK((kind='MESSAGE')=(message_id IS NOT NULL)),
 ADD CONSTRAINT notification_source_meeting CHECK((kind IN ('MEETING_INVITE','MEETING_UPDATED','MEETING_RESPONSE'))=(meeting_id IS NOT NULL)),
 ADD CONSTRAINT notification_source_submission CHECK((kind='REPORT_SUBMITTED')=(submission_id IS NOT NULL)),
 ADD CONSTRAINT notification_source_feedback CHECK((kind='REPORT_REVIEWED')=(feedback_id IS NOT NULL)),
 ADD CONSTRAINT notification_source_document CHECK((kind='REPORT_REOPENED')=(document_id IS NOT NULL)),
 ADD CONSTRAINT notification_source_workshop CHECK((kind='WORKSHOP_UPDATE')=(workshop_record_id IS NOT NULL));
CREATE OR REPLACE FUNCTION notification_recipient_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE event notification_events%ROWTYPE;allowed BOOLEAN;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Notification history cannot be deleted; dismiss it'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.event_id,NEW.recipient_id) IS DISTINCT FROM ROW(OLD.event_id,OLD.recipient_id) OR
   OLD.read_at IS NOT NULL AND NEW.read_at IS DISTINCT FROM OLD.read_at OR
   OLD.dismissed_at IS NOT NULL AND NEW.dismissed_at IS DISTINCT FROM OLD.dismissed_at
  THEN RAISE EXCEPTION 'Notification identity and first-read state are immutable'; END IF;RETURN NEW;
 END IF;
 SELECT * INTO event FROM notification_events WHERE id=NEW.event_id;
 IF NEW.recipient_id=event.actor_id THEN RAISE EXCEPTION 'No self notification'; END IF;
 CASE event.kind
 WHEN 'MESSAGE' THEN SELECT conversation_access(NEW.recipient_id,m.conversation_id) INTO allowed FROM chat_messages m WHERE id=event.message_id;
 WHEN 'MEETING_INVITE' THEN allowed=(event.data->>'target')=NEW.recipient_id::text AND meeting_access(NEW.recipient_id,event.meeting_id);
 WHEN 'MEETING_RESPONSE' THEN SELECT organizer_id=NEW.recipient_id INTO allowed FROM meetings WHERE id=event.meeting_id;
 WHEN 'MEETING_UPDATED' THEN allowed=meeting_access(NEW.recipient_id,event.meeting_id);
 WHEN 'REPORT_SUBMITTED' THEN SELECT project_supervisor(NEW.recipient_id,d.project_id) INTO allowed FROM report_submissions s JOIN report_documents d ON d.id=s.document_id WHERE s.id=event.submission_id;
 WHEN 'REPORT_REVIEWED' THEN SELECT team_member(NEW.recipient_id,d.project_id) INTO allowed FROM report_feedback f JOIN report_submissions s ON s.id=f.submission_id JOIN report_documents d ON d.id=s.document_id WHERE f.id=event.feedback_id;
 WHEN 'REPORT_REOPENED' THEN SELECT team_member(NEW.recipient_id,project_id) INTO allowed FROM report_documents WHERE id=event.document_id;
 WHEN 'WORKSHOP_UPDATE' THEN allowed=workshop_record_access(NEW.recipient_id,event.workshop_record_id);
 END CASE;
 IF allowed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Notification recipient scope invalid'; END IF;RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION read_notifications(actor UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered recipient required'; END IF;
 RETURN (SELECT COALESCE(jsonb_agg(item ORDER BY created_at DESC),'[]') FROM (
  SELECT e.id,e.kind,e.message_id,e.meeting_id,e.submission_id,e.feedback_id,e.document_id,e.workshop_record_id,e.created_at,i.read_at,i.dismissed_at
  FROM notification_events e JOIN notification_inbox i ON i.event_id=e.id WHERE i.recipient_id=actor AND i.dismissed_at IS NULL
  AND (e.message_id IS NULL OR EXISTS(SELECT 1 FROM chat_messages m WHERE m.id=e.message_id AND conversation_access(actor,m.conversation_id)))
  AND (e.meeting_id IS NULL OR meeting_access(actor,e.meeting_id))
  AND (e.submission_id IS NULL OR EXISTS(SELECT 1 FROM report_submissions s JOIN report_documents d ON d.id=s.document_id WHERE s.id=e.submission_id AND project_supervisor(actor,d.project_id)))
  AND (e.feedback_id IS NULL OR EXISTS(SELECT 1 FROM report_feedback f JOIN report_submissions s ON s.id=f.submission_id JOIN report_documents d ON d.id=s.document_id WHERE f.id=e.feedback_id AND team_member(actor,d.project_id)))
  AND (e.document_id IS NULL OR EXISTS(SELECT 1 FROM report_documents d WHERE d.id=e.document_id AND team_member(actor,d.project_id)))
  AND (e.workshop_record_id IS NULL OR workshop_record_access(actor,e.workshop_record_id))
  ORDER BY e.created_at DESC LIMIT 100
 ) item);
END $$;
CREATE FUNCTION emit_workshop_notification(record UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;r workshop_records%ROWTYPE;
BEGIN SELECT * INTO r FROM workshop_records WHERE id=record;
 IF NOT FOUND THEN RAISE EXCEPTION 'Workshop record missing';END IF;
 INSERT INTO notification_events(event_key,kind,actor_id,workshop_record_id,created_at) VALUES('workshop-record:'||record,'WORKSHOP_UPDATE',r.created_by,record,r.created_at) ON CONFLICT(event_key) DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN SELECT id INTO result FROM notification_events WHERE event_key='workshop-record:'||record;END IF;
 INSERT INTO notification_inbox(event_id,recipient_id) SELECT result,account_id FROM workshop_record_recipients WHERE record_id=record AND account_id<>r.created_by ON CONFLICT DO NOTHING;
 RETURN result;
END $$;
CREATE FUNCTION workshop_inbox_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE record UUID;BEGIN FOR record IN SELECT DISTINCT record_id FROM added_recipients LOOP PERFORM emit_workshop_notification(record);END LOOP;RETURN NULL;END $$;
CREATE TRIGGER workshop_inbox AFTER INSERT ON workshop_record_recipients REFERENCING NEW TABLE AS added_recipients FOR EACH STATEMENT EXECUTE FUNCTION workshop_inbox_trigger();

REVOKE ALL ON workshop_days,workshop_absence_policies,workshop_attendance,workshop_tables,workshop_table_assignments,workshop_table_history,workshop_handovers,workshop_handover_items,workshop_return_updates,workshop_records,workshop_record_recipients,workshop_absence_summary,workshop_handover_summary FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;
