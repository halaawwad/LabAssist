-- PostgreSQL 17. Apply after stages 01-10. The backend supplies authenticated actors.
BEGIN;
SET search_path=labassist_student,public;

CREATE TABLE reporting_periods (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,
 term_id UUID NOT NULL REFERENCES academic_terms(id),week_number INT NOT NULL CHECK(week_number>0),
 week_start DATE NOT NULL CHECK(extract(isodow FROM week_start)=1),
 opens_at TIMESTAMPTZ NOT NULL,due_at TIMESTAMPTZ NOT NULL,late_until TIMESTAMPTZ NOT NULL,
 UNIQUE(term_id,week_number),UNIQUE(term_id,week_start),UNIQUE(id,term_id),
 CHECK(opens_at<due_at AND due_at<=late_until)
);
CREATE TABLE presentation_templates (
 id TEXT NOT NULL,version INT NOT NULL CHECK(version>0),name TEXT NOT NULL,category TEXT NOT NULL,
 design JSONB NOT NULL CHECK(jsonb_typeof(design)='object'),is_active BOOLEAN NOT NULL DEFAULT true,
 PRIMARY KEY(id,version)
);
CREATE TABLE report_submission_windows (
 project_id UUID NOT NULL REFERENCES projects(id),kind TEXT NOT NULL CHECK(kind IN ('FINAL','PRESENTATION')),
 is_open BOOLEAN NOT NULL DEFAULT false,closes_at TIMESTAMPTZ,
 updated_by UUID NOT NULL REFERENCES accounts(id),revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(project_id,kind)
);
CREATE TABLE report_documents (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,project_id UUID NOT NULL REFERENCES projects(id),
 kind TEXT NOT NULL CHECK(kind IN ('WEEKLY','FINAL','PRESENTATION')),period_id UUID REFERENCES reporting_periods(id),
 state TEXT NOT NULL DEFAULT 'DRAFT' CHECK(state IN ('DRAFT','SUBMITTED')),
 draft_content JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(draft_content)='object'),
 appearance JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(appearance)='object'),
 template_id TEXT,template_version INT,imported_file_id UUID REFERENCES files(id),
 created_by UUID NOT NULL REFERENCES accounts(id),updated_by UUID NOT NULL REFERENCES accounts(id),
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),deleted_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((kind='WEEKLY')=(period_id IS NOT NULL)),
 CHECK((template_id IS NULL)=(template_version IS NULL)),
 CHECK(kind='PRESENTATION' OR (template_id IS NULL AND imported_file_id IS NULL)),
 FOREIGN KEY(template_id,template_version) REFERENCES presentation_templates(id,version)
);
CREATE UNIQUE INDEX one_weekly_report_per_team_period ON report_documents(project_id,period_id) WHERE kind='WEEKLY';
CREATE UNIQUE INDEX one_shared_final_workspace ON report_documents(project_id,kind) WHERE kind<>'WEEKLY';
CREATE TABLE report_versions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),document_id UUID NOT NULL REFERENCES report_documents(id),
 version_number INT NOT NULL CHECK(version_number>0),document_revision INT NOT NULL CHECK(document_revision>=0),
 content JSONB NOT NULL CHECK(jsonb_typeof(content)='object'),appearance JSONB NOT NULL CHECK(jsonb_typeof(appearance)='object'),
 template_id TEXT,template_version INT,imported_file_id UUID REFERENCES files(id),
 created_by UUID NOT NULL REFERENCES accounts(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(document_id,version_number),UNIQUE(document_id,document_revision),UNIQUE(id,document_id),
 FOREIGN KEY(template_id,template_version) REFERENCES presentation_templates(id,version)
);
CREATE TABLE report_version_files (
 version_id UUID NOT NULL REFERENCES report_versions(id),file_id UUID NOT NULL REFERENCES files(id),
 purpose TEXT NOT NULL CHECK(purpose IN ('ATTACHMENT','IMAGE','BACKGROUND','PPTX_SOURCE','PDF_EXPORT','PPTX_EXPORT')),
 content_key TEXT NOT NULL DEFAULT '',attached_by UUID NOT NULL REFERENCES accounts(id),
 storage_key TEXT NOT NULL,original_name TEXT NOT NULL,mime_type TEXT NOT NULL,byte_size BIGINT NOT NULL,
 sha256 CHAR(64) NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 PRIMARY KEY(version_id,file_id,purpose,content_key)
);
CREATE TABLE report_submissions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,
 document_id UUID NOT NULL REFERENCES report_documents(id),version_id UUID NOT NULL,
 request_key UUID NOT NULL,request_payload JSONB NOT NULL CHECK(jsonb_typeof(request_payload)='object'),
 submitted_by UUID NOT NULL REFERENCES accounts(id),submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 is_late BOOLEAN NOT NULL DEFAULT false,student_note TEXT NOT NULL DEFAULT '',
 state TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK(state IN ('SUBMITTED','WITHDRAWN','SUPERSEDED')),
 first_viewed_by UUID REFERENCES accounts(id),first_viewed_at TIMESTAMPTZ,
 changed_by UUID NOT NULL REFERENCES accounts(id),changed_at TIMESTAMPTZ,
 change_reason TEXT CHECK(change_reason IN ('WITHDRAWAL','STUDENT_EDIT','RESUBMISSION')),
 UNIQUE(document_id,request_key),FOREIGN KEY(version_id,document_id) REFERENCES report_versions(id,document_id),
 CHECK((first_viewed_by IS NULL)=(first_viewed_at IS NULL)),
 CHECK(first_viewed_at IS NULL OR first_viewed_at>=submitted_at),
 CHECK((state='SUBMITTED' AND changed_at IS NULL AND change_reason IS NULL) OR
       (state<>'SUBMITTED' AND changed_at IS NOT NULL AND change_reason IS NOT NULL AND changed_at>=submitted_at))
);
CREATE UNIQUE INDEX one_active_report_submission ON report_submissions(document_id) WHERE state='SUBMITTED';
CREATE TABLE report_feedback (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),submission_id UUID NOT NULL REFERENCES report_submissions(id),
 request_key UUID NOT NULL,request_payload JSONB NOT NULL CHECK(jsonb_typeof(request_payload)='object'),
 kind TEXT NOT NULL CHECK(kind IN ('REVIEW','COMMENT')),
 decision TEXT CHECK(decision IN ('REVIEWED','NEEDS_CHANGES','APPROVED')),
 body TEXT NOT NULL CHECK(length(btrim(body))>0),section_id TEXT,page_number INT CHECK(page_number>0),slide_id TEXT,
 created_by UUID NOT NULL REFERENCES accounts(id),updated_by UUID NOT NULL REFERENCES accounts(id),
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 seen_by_student_id UUID REFERENCES accounts(id),seen_by_student_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(submission_id,request_key),CHECK((kind='REVIEW')=(decision IS NOT NULL)),
 CHECK((seen_by_student_id IS NULL)=(seen_by_student_at IS NULL)),
 CHECK(seen_by_student_at IS NULL OR seen_by_student_at>=created_at)
);
CREATE TABLE report_check_runs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),version_id UUID NOT NULL REFERENCES report_versions(id),
 requested_by UUID NOT NULL REFERENCES accounts(id),kind TEXT NOT NULL CHECK(kind IN ('STRUCTURE','ABET','AI_ASSISTED')),
 engine TEXT NOT NULL,model TEXT,status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SUCCEEDED','FAILED')),
 result JSONB,error_text TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),finished_at TIMESTAMPTZ,
 CHECK((status='PENDING' AND finished_at IS NULL AND result IS NULL AND error_text IS NULL) OR
 (status='SUCCEEDED' AND finished_at IS NOT NULL AND result IS NOT NULL AND jsonb_typeof(result)='object' AND error_text IS NULL) OR
 (status='FAILED' AND finished_at IS NOT NULL AND result IS NULL AND length(btrim(error_text))>0)),
 CHECK(finished_at IS NULL OR finished_at>=created_at)
);
CREATE INDEX reports_project_kind ON report_documents(project_id,kind,updated_at DESC);
CREATE INDEX report_version_history ON report_versions(document_id,version_number DESC);
CREATE INDEX report_submission_history ON report_submissions(document_id,submitted_at DESC,id);
CREATE INDEX report_feedback_submission ON report_feedback(submission_id,created_at,id);
CREATE INDEX report_file_lookup ON report_version_files(file_id);
CREATE INDEX report_checks_version ON report_check_runs(version_id,created_at DESC);

CREATE FUNCTION report_student_can_write(actor UUID,project UUID) RETURNS BOOLEAN LANGUAGE sql STABLE
SET search_path=labassist_student,pg_temp AS $$
 SELECT team_member(actor,project) AND EXISTS(
 SELECT 1 FROM projects p JOIN academic_terms t ON t.id=p.term_id
 JOIN accounts a ON a.id=actor WHERE p.id=project AND p.status NOT IN ('COMPLETED','ARCHIVED')
 AND a.role='STUDENT' AND a.status<>'DISABLED'
 AND (t.ends_on IS NULL OR (now() AT TIME ZONE 'Asia/Hebron')::date<=t.ends_on OR EXISTS(
 SELECT 1 FROM student_enrollments e WHERE e.student_id=actor AND e.term_id=t.id AND e.incomplete_until>now())))
$$;
CREATE FUNCTION report_is_open(project UUID,report_kind TEXT) RETURNS BOOLEAN LANGUAGE sql STABLE
SET search_path=labassist_student,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM report_submission_windows WHERE project_id=project AND kind=report_kind
 AND is_open AND (closes_at IS NULL OR closes_at>=now()))
$$;
CREATE FUNCTION report_content_valid(report_kind TEXT,content JSONB,submitting BOOLEAN DEFAULT false) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE key TEXT;block JSONB;section JSONB;slide JSONB;
BEGIN
 IF jsonb_typeof(content) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 IF NOT submitting AND content='{}'::jsonb THEN RETURN true; END IF;
 IF report_kind='WEEKLY' THEN
  IF jsonb_typeof(content->'progress') IS DISTINCT FROM 'number' OR
   (content->>'progress')::numeric NOT BETWEEN 0 AND 100 OR
   jsonb_typeof(content->'hasDelays') IS DISTINCT FROM 'boolean' THEN RETURN false; END IF;
  FOREACH key IN ARRAY ARRAY['work','progressNote','tasks','delayReason','delayAction','problems','plan'] LOOP
   IF jsonb_typeof(content->key) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  END LOOP;
  IF submitting AND (length(btrim(content->>'work'))=0 OR length(btrim(content->>'tasks'))=0 OR length(btrim(content->>'plan'))=0
   OR ((content->>'hasDelays')::boolean AND (length(btrim(content->>'delayReason'))=0 OR length(btrim(content->>'delayAction'))=0))) THEN RETURN false; END IF;
 ELSIF report_kind='FINAL' THEN
  IF jsonb_typeof(content->'meta') IS DISTINCT FROM 'object' OR jsonb_typeof(content->'sections') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF submitting AND (COALESCE(length(btrim(content->'meta'->>'title')),0)=0 OR jsonb_array_length(content->'sections')=0) THEN RETURN false; END IF;
  FOR section IN SELECT value FROM jsonb_array_elements(content->'sections') LOOP
   IF jsonb_typeof(section) IS DISTINCT FROM 'object' OR COALESCE(length(section->>'id'),0)=0 OR jsonb_typeof(section->'blocks') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
   FOR block IN SELECT value FROM jsonb_array_elements(section->'blocks') LOOP
    IF jsonb_typeof(block) IS DISTINCT FROM 'object' OR COALESCE(block->>'kind','') NOT IN ('paragraph','heading','image','table') THEN RETURN false; END IF;
   END LOOP;
  END LOOP;
  IF (SELECT count(*)<>count(DISTINCT value->>'id') FROM jsonb_array_elements(content->'sections')) THEN RETURN false; END IF;
 ELSIF report_kind='PRESENTATION' THEN
  IF jsonb_typeof(content->'slides') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF submitting AND (COALESCE(length(btrim(content->>'title')),0)=0 OR jsonb_array_length(content->'slides')=0) THEN RETURN false; END IF;
  FOR slide IN SELECT value FROM jsonb_array_elements(content->'slides') LOOP
   IF jsonb_typeof(slide) IS DISTINCT FROM 'object' OR COALESCE(length(slide->>'id'),0)=0 OR
    (slide ? 'objects' AND jsonb_typeof(slide->'objects') IS DISTINCT FROM 'array') THEN RETURN false; END IF;
  END LOOP;
  IF (SELECT count(*)<>count(DISTINCT value->>'id') FROM jsonb_array_elements(content->'slides')) THEN RETURN false; END IF;
 ELSE RETURN false;
 END IF;
 RETURN true;
END $$;

CREATE FUNCTION report_window_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Report window history cannot be deleted'; END IF;
 IF EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'Completed project reports are read only'; END IF;
 IF NOT project_supervisor(NEW.updated_by,NEW.project_id) THEN RAISE EXCEPTION 'Project supervisor required'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.project_id,NEW.kind) IS DISTINCT FROM ROW(OLD.project_id,OLD.kind) THEN RAISE EXCEPTION 'Window identity is immutable'; END IF;
  NEW.revision=OLD.revision+1;
 ELSIF NEW.revision<>0 THEN RAISE EXCEPTION 'Initial window revision invalid'; END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER report_window_scope BEFORE INSERT OR UPDATE OR DELETE ON report_submission_windows FOR EACH ROW EXECUTE FUNCTION report_window_guard();

CREATE FUNCTION report_document_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE student_actor BOOLEAN;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Report history cannot be deleted; discard the draft'; END IF;
 IF EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'Completed project reports are read only'; END IF;
 student_actor=report_student_can_write(NEW.updated_by,NEW.project_id);
 IF TG_OP='INSERT' THEN
  IF NOT student_actor OR NEW.created_by<>NEW.updated_by OR NEW.state<>'DRAFT' OR NEW.revision<>0 THEN RAISE EXCEPTION 'Report starts as a teammate draft'; END IF;
 ELSE
  IF ROW(NEW.id,NEW.seed_key,NEW.project_id,NEW.kind,NEW.period_id,NEW.created_by,NEW.created_at) IS DISTINCT FROM
     ROW(OLD.id,OLD.seed_key,OLD.project_id,OLD.kind,OLD.period_id,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Report identity is immutable'; END IF;
  IF NOT student_actor THEN
   IF NOT project_supervisor(NEW.updated_by,NEW.project_id) OR OLD.kind='WEEKLY' OR OLD.state<>'SUBMITTED' OR NEW.state<>'DRAFT'
    OR ROW(NEW.draft_content,NEW.appearance,NEW.template_id,NEW.template_version,NEW.imported_file_id,NEW.deleted_at) IS DISTINCT FROM
       ROW(OLD.draft_content,OLD.appearance,OLD.template_id,OLD.template_version,OLD.imported_file_id,OLD.deleted_at)
    OR NOT report_is_open(NEW.project_id,NEW.kind) THEN RAISE EXCEPTION 'Only supervisor may reopen a submitted final or presentation'; END IF;
  ELSIF OLD.state='SUBMITTED' AND NEW.state='DRAFT' THEN
   IF OLD.kind<>'WEEKLY' OR EXISTS(SELECT 1 FROM report_submissions WHERE document_id=OLD.id AND state='SUBMITTED') THEN RAISE EXCEPTION 'Submitted document is locked'; END IF;
  ELSIF OLD.state='SUBMITTED' THEN RAISE EXCEPTION 'Submitted document is locked';
  END IF;
  IF NEW.state='SUBMITTED' AND (NEW.draft_content<>OLD.draft_content OR NEW.appearance<>OLD.appearance OR
   ROW(NEW.template_id,NEW.template_version,NEW.imported_file_id) IS DISTINCT FROM ROW(OLD.template_id,OLD.template_version,OLD.imported_file_id)
   OR NOT EXISTS(SELECT 1 FROM report_submissions WHERE document_id=OLD.id AND state='SUBMITTED')) THEN RAISE EXCEPTION 'Submission requires a frozen version'; END IF;
  NEW.revision=OLD.revision+1;
 END IF;
 IF NEW.kind='WEEKLY' AND NOT EXISTS(SELECT 1 FROM reporting_periods r JOIN projects p ON p.term_id=r.term_id WHERE r.id=NEW.period_id AND p.id=NEW.project_id) THEN RAISE EXCEPTION 'Weekly period belongs to another term'; END IF;
 IF NEW.kind<>'WEEKLY' AND student_actor AND NEW.state='DRAFT' AND NOT report_is_open(NEW.project_id,NEW.kind) THEN RAISE EXCEPTION 'Supervisor has not opened this document'; END IF;
 IF NEW.template_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM presentation_templates WHERE id=NEW.template_id AND version=NEW.template_version AND is_active) THEN RAISE EXCEPTION 'Presentation template unavailable'; END IF;
 IF NEW.imported_file_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM files f WHERE f.id=NEW.imported_file_id AND team_member(f.uploaded_by,NEW.project_id)
  AND f.status='READY' AND f.mime_type='application/vnd.openxmlformats-officedocument.presentationml.presentation') THEN RAISE EXCEPTION 'Imported presentation must be a ready team PPTX'; END IF;
 IF NOT report_content_valid(NEW.kind,NEW.draft_content) THEN RAISE EXCEPTION 'Invalid report content'; END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER report_document_scope BEFORE INSERT OR UPDATE OR DELETE ON report_documents FOR EACH ROW EXECUTE FUNCTION report_document_guard();

CREATE FUNCTION report_version_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Report versions are immutable'; END IF;
 SELECT * INTO doc FROM report_documents WHERE id=NEW.document_id FOR UPDATE;
 IF NOT FOUND OR doc.state<>'DRAFT' OR NOT team_member(NEW.created_by,doc.project_id) OR NEW.created_by<>doc.updated_by OR
  ROW(NEW.document_revision,NEW.content,NEW.appearance,NEW.template_id,NEW.template_version,NEW.imported_file_id) IS DISTINCT FROM
  ROW(doc.revision,doc.draft_content,doc.appearance,doc.template_id,doc.template_version,doc.imported_file_id)
  OR NEW.version_number<>(SELECT COALESCE(max(version_number),0)+1 FROM report_versions WHERE document_id=doc.id) THEN RAISE EXCEPTION 'Version must snapshot the current draft'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER report_version_scope BEFORE INSERT OR UPDATE OR DELETE ON report_versions FOR EACH ROW EXECUTE FUNCTION report_version_guard();
CREATE FUNCTION snapshot_report_draft() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NEW.state='DRAFT' AND team_member(NEW.updated_by,NEW.project_id) AND NEW.deleted_at IS NULL THEN
  INSERT INTO report_versions(document_id,version_number,document_revision,content,appearance,template_id,template_version,imported_file_id,created_by,created_at)
  SELECT NEW.id,COALESCE(max(version_number),0)+1,NEW.revision,NEW.draft_content,NEW.appearance,NEW.template_id,NEW.template_version,NEW.imported_file_id,NEW.updated_by,NEW.updated_at
  FROM report_versions WHERE document_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER report_draft_snapshot AFTER INSERT OR UPDATE ON report_documents FOR EACH ROW EXECUTE FUNCTION snapshot_report_draft();

CREATE FUNCTION report_file_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;asset files%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Version assets are immutable'; END IF;
 SELECT d.* INTO doc FROM report_documents d JOIN report_versions v ON v.document_id=d.id WHERE v.id=NEW.version_id FOR UPDATE OF d;
 IF NOT FOUND OR doc.state<>'DRAFT' OR NOT report_student_can_write(NEW.attached_by,doc.project_id)
  OR EXISTS(SELECT 1 FROM report_submissions WHERE version_id=NEW.version_id) THEN RAISE EXCEPTION 'Assets require an unsubmitted team draft version'; END IF;
 SELECT * INTO asset FROM files WHERE id=NEW.file_id;
 IF NOT FOUND OR asset.status<>'READY' OR asset.sha256 IS NULL OR NOT team_member(asset.uploaded_by,doc.project_id) THEN RAISE EXCEPTION 'Asset must be a ready hashed team file'; END IF;
 IF NEW.purpose IN ('IMAGE','BACKGROUND') AND asset.mime_type NOT LIKE 'image/%' OR
    NEW.purpose='PDF_EXPORT' AND asset.mime_type<>'application/pdf' OR
    NEW.purpose IN ('PPTX_SOURCE','PPTX_EXPORT') AND (doc.kind<>'PRESENTATION' OR asset.mime_type<>'application/vnd.openxmlformats-officedocument.presentationml.presentation') THEN RAISE EXCEPTION 'Asset type does not match purpose'; END IF;
 NEW.storage_key=asset.storage_key;NEW.original_name=asset.original_name;NEW.mime_type=asset.mime_type;NEW.byte_size=asset.byte_size;NEW.sha256=asset.sha256;
 RETURN NEW;
END $$;
CREATE TRIGGER report_asset_scope BEFORE INSERT OR UPDATE OR DELETE ON report_version_files FOR EACH ROW EXECUTE FUNCTION report_file_guard();

CREATE FUNCTION report_submission_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;version report_versions%ROWTYPE;period reporting_periods%ROWTYPE;prior_late BOOLEAN;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Submission history cannot be deleted'; END IF;
 SELECT * INTO doc FROM report_documents WHERE id=NEW.document_id FOR UPDATE;
 IF TG_OP='INSERT' THEN
  IF NOT FOUND OR NOT report_student_can_write(NEW.submitted_by,doc.project_id) OR doc.state<>'DRAFT' OR doc.deleted_at IS NOT NULL OR NEW.state<>'SUBMITTED' THEN RAISE EXCEPTION 'Submission requires an editable team draft'; END IF;
  SELECT * INTO version FROM report_versions WHERE id=NEW.version_id AND document_id=doc.id;
  IF NOT FOUND OR version.document_revision<>doc.revision OR NOT report_content_valid(doc.kind,version.content,true) THEN RAISE EXCEPTION 'Submission requires the latest complete draft snapshot'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_path_query(version.content,'$.**.file_id') ref WHERE NOT EXISTS(
   SELECT 1 FROM report_version_files a WHERE a.version_id=version.id AND a.file_id=(ref #>> '{}')::uuid))
   OR version.imported_file_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM report_version_files WHERE version_id=version.id AND file_id=version.imported_file_id AND purpose='PPTX_SOURCE') THEN RAISE EXCEPTION 'Report content references an unattached file'; END IF;
  NEW.submitted_at=clock_timestamp();NEW.is_late=false;
  IF doc.kind='WEEKLY' THEN
   SELECT * INTO period FROM reporting_periods WHERE id=doc.period_id;
   SELECT is_late INTO prior_late FROM report_submissions WHERE document_id=doc.id AND state='SUPERSEDED' AND change_reason='STUDENT_EDIT' ORDER BY submitted_at LIMIT 1;
   IF NOT FOUND AND (NEW.submitted_at<period.opens_at OR NEW.submitted_at>period.late_until) THEN RAISE EXCEPTION 'Weekly submission window is closed'; END IF;
   NEW.is_late=COALESCE(prior_late,NEW.submitted_at>period.due_at);
  ELSIF NOT report_is_open(doc.project_id,doc.kind) THEN RAISE EXCEPTION 'Final or presentation submission window is closed'; END IF;
  NEW.changed_by=NEW.submitted_by;NEW.changed_at=NULL;NEW.change_reason=NULL;NEW.first_viewed_at=NULL;NEW.first_viewed_by=NULL;
 ELSE
  IF ROW(NEW.id,NEW.seed_key,NEW.document_id,NEW.version_id,NEW.request_key,NEW.request_payload,NEW.submitted_by,NEW.submitted_at,NEW.is_late,NEW.student_note) IS DISTINCT FROM
     ROW(OLD.id,OLD.seed_key,OLD.document_id,OLD.version_id,OLD.request_key,OLD.request_payload,OLD.submitted_by,OLD.submitted_at,OLD.is_late,OLD.student_note) THEN RAISE EXCEPTION 'Submitted content is immutable'; END IF;
  IF OLD.state<>'SUBMITTED' THEN RAISE EXCEPTION 'Previous submissions are read only'; END IF;
  IF NEW.state=OLD.state THEN
   IF NOT project_supervisor(NEW.changed_by,doc.project_id) OR OLD.first_viewed_at IS NOT NULL OR NEW.first_viewed_at IS NULL OR NEW.first_viewed_by<>NEW.changed_by
    OR ROW(NEW.changed_at,NEW.change_reason) IS DISTINCT FROM ROW(OLD.changed_at,OLD.change_reason) THEN RAISE EXCEPTION 'Invalid submission read marker'; END IF;
   NEW.first_viewed_at=clock_timestamp();
  ELSE
   IF NOT report_student_can_write(NEW.changed_by,doc.project_id) OR ROW(NEW.first_viewed_at,NEW.first_viewed_by) IS DISTINCT FROM ROW(OLD.first_viewed_at,OLD.first_viewed_by) THEN RAISE EXCEPTION 'Only a teammate may revise or withdraw'; END IF;
   IF NEW.state='WITHDRAWN' THEN
    IF doc.kind<>'WEEKLY' OR OLD.first_viewed_at IS NOT NULL OR NEW.change_reason<>'WITHDRAWAL' THEN RAISE EXCEPTION 'Only an unseen weekly report may be withdrawn'; END IF;
   ELSIF NEW.state='SUPERSEDED' AND NEW.change_reason='STUDENT_EDIT' THEN
    IF doc.kind<>'WEEKLY' OR EXISTS(SELECT 1 FROM report_feedback WHERE submission_id=OLD.id AND kind='REVIEW') THEN RAISE EXCEPTION 'Reviewed weekly reports cannot be revised'; END IF;
   ELSIF NEW.state='SUPERSEDED' AND NEW.change_reason='RESUBMISSION' THEN
    IF doc.kind='WEEKLY' OR doc.state<>'DRAFT' OR NOT report_is_open(doc.project_id,doc.kind) THEN RAISE EXCEPTION 'Supervisor reopening required'; END IF;
   ELSE RAISE EXCEPTION 'Invalid submission transition'; END IF;
   NEW.changed_at=clock_timestamp();
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER report_submission_scope BEFORE INSERT OR UPDATE OR DELETE ON report_submissions FOR EACH ROW EXECUTE FUNCTION report_submission_guard();
CREATE FUNCTION lock_submitted_report() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN UPDATE report_documents SET state='SUBMITTED',updated_by=NEW.submitted_by WHERE id=NEW.document_id;RETURN NEW;END $$;
CREATE TRIGGER report_submission_lock AFTER INSERT ON report_submissions FOR EACH ROW EXECUTE FUNCTION lock_submitted_report();

CREATE FUNCTION report_feedback_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;submission report_submissions%ROWTYPE;version report_versions%ROWTYPE;read_only_change BOOLEAN;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Feedback history cannot be deleted'; END IF;
 SELECT d.* INTO doc FROM report_documents d JOIN report_submissions s ON s.document_id=d.id WHERE s.id=NEW.submission_id FOR UPDATE OF d;
 SELECT * INTO submission FROM report_submissions WHERE id=NEW.submission_id;
 SELECT * INTO version FROM report_versions WHERE id=submission.version_id;
 IF EXISTS(SELECT 1 FROM projects WHERE id=doc.project_id AND status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'Completed project reports are read only'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.submission_id,NEW.request_key,NEW.request_payload,NEW.kind,NEW.created_by,NEW.created_at) IS DISTINCT FROM
     ROW(OLD.id,OLD.submission_id,OLD.request_key,OLD.request_payload,OLD.kind,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Feedback identity is immutable'; END IF;
  read_only_change=ROW(NEW.body,NEW.decision,NEW.section_id,NEW.page_number,NEW.slide_id,NEW.updated_by,NEW.revision) IS NOT DISTINCT FROM
                   ROW(OLD.body,OLD.decision,OLD.section_id,OLD.page_number,OLD.slide_id,OLD.updated_by,OLD.revision);
  IF read_only_change AND OLD.seen_by_student_at IS NULL AND NEW.seen_by_student_at IS NOT NULL AND team_member(NEW.seen_by_student_id,doc.project_id) THEN
   NEW.seen_by_student_at=clock_timestamp();NEW.updated_at=OLD.updated_at;RETURN NEW;
  END IF;
  IF OLD.seen_by_student_at IS NOT NULL THEN RAISE EXCEPTION 'Feedback already read by a student'; END IF;
  IF ROW(NEW.seen_by_student_id,NEW.seen_by_student_at) IS DISTINCT FROM ROW(OLD.seen_by_student_id,OLD.seen_by_student_at) OR NEW.updated_by<>OLD.created_by THEN RAISE EXCEPTION 'Only feedback author may edit unread feedback'; END IF;
  NEW.revision=OLD.revision+1;
 ELSE
  IF NEW.created_by<>NEW.updated_by OR NEW.revision<>0 OR NEW.seen_by_student_at IS NOT NULL THEN RAISE EXCEPTION 'Invalid new feedback'; END IF;
  NEW.created_at=clock_timestamp();
 END IF;
 IF submission.state<>'SUBMITTED' OR NOT project_supervisor(NEW.updated_by,doc.project_id) OR submission.first_viewed_at IS NULL THEN RAISE EXCEPTION 'Project supervisor must open the current submission first'; END IF;
 IF NEW.decision='APPROVED' AND doc.kind='WEEKLY' THEN RAISE EXCEPTION 'Weekly reports use feedback, not final approval'; END IF;
 IF NEW.slide_id IS NOT NULL AND (doc.kind<>'PRESENTATION' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(version.content->'slides') s WHERE s->>'id'=NEW.slide_id)) THEN RAISE EXCEPTION 'Slide is not in the submitted version'; END IF;
 IF NEW.section_id IS NOT NULL AND (doc.kind<>'FINAL' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(version.content->'sections') s WHERE s->>'id'=NEW.section_id)) THEN RAISE EXCEPTION 'Section is not in the submitted version'; END IF;
 IF NEW.page_number IS NOT NULL AND doc.kind='PRESENTATION' THEN RAISE EXCEPTION 'Presentation comments target a slide'; END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER report_feedback_scope BEFORE INSERT OR UPDATE OR DELETE ON report_feedback FOR EACH ROW EXECUTE FUNCTION report_feedback_guard();

CREATE FUNCTION report_check_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE project UUID;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Report check history cannot be deleted'; END IF;
 SELECT d.project_id INTO project FROM report_documents d JOIN report_versions v ON v.document_id=d.id WHERE v.id=NEW.version_id;
 IF NOT team_member(NEW.requested_by,project) THEN RAISE EXCEPTION 'Report check requester must be a teammate'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.status<>'PENDING' OR NEW.status='PENDING' OR ROW(NEW.id,NEW.version_id,NEW.requested_by,NEW.kind,NEW.engine,NEW.model,NEW.created_at) IS DISTINCT FROM
   ROW(OLD.id,OLD.version_id,OLD.requested_by,OLD.kind,OLD.engine,OLD.model,OLD.created_at) THEN RAISE EXCEPTION 'Report check result is immutable'; END IF;
  NEW.finished_at=clock_timestamp();
 ELSE
  IF NEW.status<>'PENDING' THEN RAISE EXCEPTION 'Report check starts pending'; END IF;
  NEW.created_at=clock_timestamp();
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER report_check_scope BEFORE INSERT OR UPDATE OR DELETE ON report_check_runs FOR EACH ROW EXECUTE FUNCTION report_check_guard();

CREATE FUNCTION create_report_document(actor UUID,project UUID,report_kind TEXT,period UUID DEFAULT NULL,content JSONB DEFAULT '{}',template TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE existing UUID;document UUID;
BEGIN
 IF NOT report_student_can_write(actor,project) THEN RAISE EXCEPTION 'Current teammate required'; END IF;
 -- Serialize creation only within a project; the unique indexes remain the final invariant.
 PERFORM 1 FROM projects WHERE id=project FOR UPDATE;
 SELECT id INTO existing FROM report_documents WHERE project_id=project AND kind=report_kind AND period_id IS NOT DISTINCT FROM period;
 IF FOUND THEN RETURN existing; END IF;
 INSERT INTO report_documents(project_id,kind,period_id,draft_content,template_id,template_version,created_by,updated_by)
 VALUES(project,report_kind,period,content,template,CASE WHEN template IS NOT NULL THEN 1 END,actor,actor) RETURNING id INTO document;
 RETURN document;
END $$;
CREATE FUNCTION save_report_draft(actor UUID,document UUID,expected_revision INT,content JSONB,style JSONB DEFAULT '{}',template TEXT DEFAULT NULL,template_revision INT DEFAULT NULL,imported UUID DEFAULT NULL,assets JSONB DEFAULT '[]')
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;version UUID;asset JSONB;
BEGIN
 SELECT * INTO doc FROM report_documents WHERE id=document FOR UPDATE;
 IF NOT FOUND OR NOT report_student_can_write(actor,doc.project_id) THEN RAISE EXCEPTION 'Current teammate required'; END IF;
 IF expected_revision IS NULL OR expected_revision<>doc.revision THEN RAISE EXCEPTION 'Report revision conflict'; END IF;
 IF doc.state<>'DRAFT' THEN RAISE EXCEPTION 'Submitted document is locked'; END IF;
 IF jsonb_typeof(assets) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Assets must be an array'; END IF;
 UPDATE report_documents SET draft_content=content,appearance=style,template_id=template,template_version=template_revision,imported_file_id=imported,updated_by=actor,deleted_at=NULL WHERE id=document RETURNING * INTO doc;
 SELECT id INTO version FROM report_versions WHERE document_id=document AND document_revision=doc.revision;
 FOR asset IN SELECT value FROM jsonb_array_elements(assets) LOOP
  INSERT INTO report_version_files(version_id,file_id,purpose,content_key,attached_by,storage_key,original_name,mime_type,byte_size,sha256)
  VALUES(version,(asset->>'file_id')::uuid,asset->>'purpose',COALESCE(asset->>'content_key',''),actor,'','','',0,repeat('0',64));
 END LOOP;
 RETURN version;
END $$;
CREATE FUNCTION set_report_window(actor UUID,project UUID,report_kind TEXT,expected_revision INT,opened BOOLEAN,deadline TIMESTAMPTZ DEFAULT NULL)
RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current_revision INT;
BEGIN
 IF NOT project_supervisor(actor,project) THEN RAISE EXCEPTION 'Project supervisor required'; END IF;
 PERFORM 1 FROM projects WHERE id=project FOR UPDATE;
 -- Serialize closing a window with saves, reopening and submission of its workspace.
 PERFORM 1 FROM report_documents WHERE project_id=project AND kind=report_kind ORDER BY id FOR UPDATE;
 SELECT revision INTO current_revision FROM report_submission_windows WHERE project_id=project AND kind=report_kind FOR UPDATE;
 IF NOT FOUND THEN
  IF expected_revision IS DISTINCT FROM -1 THEN RAISE EXCEPTION 'Window revision conflict'; END IF;
  INSERT INTO report_submission_windows(project_id,kind,is_open,closes_at,updated_by) VALUES(project,report_kind,opened,deadline,actor) RETURNING revision INTO current_revision;
 ELSE
  IF expected_revision IS NULL OR expected_revision<>current_revision THEN RAISE EXCEPTION 'Window revision conflict'; END IF;
  UPDATE report_submission_windows SET is_open=opened,closes_at=deadline,updated_by=actor WHERE project_id=project AND kind=report_kind RETURNING revision INTO current_revision;
 END IF;
 RETURN current_revision;
END $$;
CREATE FUNCTION submit_report(actor UUID,document UUID,expected_revision INT,idempotency_key UUID,note TEXT DEFAULT '')
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;existing report_submissions%ROWTYPE;payload JSONB;version UUID;previous_version UUID;submission UUID;
BEGIN
 SELECT * INTO doc FROM report_documents WHERE id=document FOR UPDATE;
 IF NOT FOUND OR NOT report_student_can_write(actor,doc.project_id) THEN RAISE EXCEPTION 'Current teammate required'; END IF;
 payload=jsonb_build_object('actor',actor,'revision',expected_revision,'note',COALESCE(note,''));
 SELECT * INTO existing FROM report_submissions WHERE document_id=document AND request_key=idempotency_key;
 IF FOUND THEN
  IF existing.request_payload<>payload THEN RAISE EXCEPTION 'Submission key reused with different data'; END IF;
  RETURN existing.id;
 END IF;
 IF expected_revision IS NULL OR expected_revision<>doc.revision THEN RAISE EXCEPTION 'Report revision conflict'; END IF;
 IF doc.state<>'DRAFT' THEN RAISE EXCEPTION 'Submitted document is locked'; END IF;
 SELECT id INTO version FROM report_versions WHERE document_id=document AND document_revision=doc.revision;
 IF NOT FOUND THEN
  -- Reopening changes the document revision but never the submitted snapshot.
  SELECT id INTO previous_version FROM report_versions WHERE document_id=document ORDER BY version_number DESC LIMIT 1;
  UPDATE report_documents SET updated_by=actor WHERE id=document RETURNING * INTO doc;
  SELECT id INTO version FROM report_versions WHERE document_id=document AND document_revision=doc.revision;
  INSERT INTO report_version_files(version_id,file_id,purpose,content_key,attached_by)
   SELECT version,file_id,purpose,content_key,actor FROM report_version_files WHERE version_id=previous_version;
 END IF;
 UPDATE report_submissions SET state='SUPERSEDED',change_reason='RESUBMISSION',changed_by=actor WHERE document_id=document AND state='SUBMITTED';
 INSERT INTO report_submissions(document_id,version_id,request_key,request_payload,submitted_by,changed_by,student_note)
 VALUES(document,version,idempotency_key,payload,actor,actor,COALESCE(note,'')) RETURNING id INTO submission;
 RETURN submission;
END $$;
CREATE FUNCTION open_report_submission(actor UUID,submission UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;item report_submissions%ROWTYPE;content JSONB;
BEGIN
 SELECT d.* INTO doc FROM report_documents d JOIN report_submissions s ON s.document_id=d.id WHERE s.id=submission FOR UPDATE OF d;
 IF NOT FOUND OR NOT (team_member(actor,doc.project_id) OR project_supervisor(actor,doc.project_id)) THEN RAISE EXCEPTION 'Project report access denied'; END IF;
 SELECT * INTO item FROM report_submissions WHERE id=submission;
 IF item.state='WITHDRAWN' THEN RAISE EXCEPTION 'Submission was withdrawn'; END IF;
 IF project_supervisor(actor,doc.project_id) AND item.state='SUBMITTED' AND item.first_viewed_at IS NULL THEN
  UPDATE report_submissions SET first_viewed_by=actor,first_viewed_at=clock_timestamp(),changed_by=actor WHERE id=submission;
 END IF;
 SELECT v.content INTO content FROM report_versions v WHERE v.id=item.version_id;
 RETURN content;
END $$;
CREATE FUNCTION read_report_draft(actor UUID,document UUID) RETURNS JSONB LANGUAGE plpgsql STABLE SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;
BEGIN
 SELECT * INTO doc FROM report_documents WHERE id=document;
 IF NOT FOUND OR NOT team_member(actor,doc.project_id) THEN RAISE EXCEPTION 'Draft is private to the team'; END IF;
 RETURN doc.draft_content;
END $$;
CREATE FUNCTION revise_weekly_report(actor UUID,submission UUID,expected_revision INT,withdraw BOOLEAN DEFAULT false,discard BOOLEAN DEFAULT false)
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;item report_submissions%ROWTYPE;
BEGIN
 SELECT d.* INTO doc FROM report_documents d JOIN report_submissions s ON s.document_id=d.id WHERE s.id=submission FOR UPDATE OF d;
 IF NOT FOUND OR NOT report_student_can_write(actor,doc.project_id) OR doc.kind<>'WEEKLY' THEN RAISE EXCEPTION 'Weekly teammate revision required'; END IF;
 IF expected_revision IS NULL OR expected_revision<>doc.revision THEN RAISE EXCEPTION 'Report revision conflict'; END IF;
 SELECT * INTO item FROM report_submissions WHERE id=submission;
 IF item.state<>'SUBMITTED' OR EXISTS(SELECT 1 FROM report_feedback WHERE submission_id=submission AND kind='REVIEW') THEN RAISE EXCEPTION 'Reviewed weekly reports cannot be revised'; END IF;
 IF discard AND NOT withdraw THEN RAISE EXCEPTION 'Discard requires withdrawal'; END IF;
 UPDATE report_submissions SET state=CASE WHEN withdraw THEN 'WITHDRAWN' ELSE 'SUPERSEDED' END,changed_by=actor,
  change_reason=CASE WHEN withdraw THEN 'WITHDRAWAL' ELSE 'STUDENT_EDIT' END WHERE id=submission;
 UPDATE report_documents SET state='DRAFT',updated_by=actor,deleted_at=CASE WHEN discard THEN clock_timestamp() END WHERE id=doc.id;
 RETURN doc.id;
END $$;
CREATE FUNCTION reopen_report(actor UUID,document UUID,expected_revision INT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;
BEGIN
 SELECT * INTO doc FROM report_documents WHERE id=document FOR UPDATE;
 IF NOT FOUND OR NOT project_supervisor(actor,doc.project_id) OR doc.kind='WEEKLY' THEN RAISE EXCEPTION 'Project supervisor reopening required'; END IF;
 IF expected_revision IS NULL OR expected_revision<>doc.revision THEN RAISE EXCEPTION 'Report revision conflict'; END IF;
 IF doc.state<>'SUBMITTED' THEN RAISE EXCEPTION 'Only submitted documents need reopening'; END IF;
 UPDATE report_documents SET state='DRAFT',updated_by=actor WHERE id=document RETURNING revision INTO expected_revision;
 RETURN expected_revision;
END $$;
CREATE FUNCTION add_report_feedback(actor UUID,submission UUID,idempotency_key UUID,feedback_kind TEXT,text_body TEXT,review_decision TEXT DEFAULT NULL,section TEXT DEFAULT NULL,page INT DEFAULT NULL,slide TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;existing report_feedback%ROWTYPE;payload JSONB;feedback UUID;
BEGIN
 SELECT d.* INTO doc FROM report_documents d JOIN report_submissions s ON s.document_id=d.id WHERE s.id=submission FOR UPDATE OF d;
 IF NOT FOUND OR NOT project_supervisor(actor,doc.project_id) THEN RAISE EXCEPTION 'Project supervisor required'; END IF;
 payload=jsonb_build_object('actor',actor,'kind',feedback_kind,'body',text_body,'decision',review_decision,'section',section,'page',page,'slide',slide);
 SELECT * INTO existing FROM report_feedback WHERE submission_id=submission AND request_key=idempotency_key;
 IF FOUND THEN
  IF existing.request_payload<>payload THEN RAISE EXCEPTION 'Feedback key reused with different data'; END IF;
  RETURN existing.id;
 END IF;
 PERFORM open_report_submission(actor,submission);
 INSERT INTO report_feedback(submission_id,request_key,request_payload,kind,decision,body,section_id,page_number,slide_id,created_by,updated_by)
 VALUES(submission,idempotency_key,payload,feedback_kind,review_decision,text_body,section,page,slide,actor,actor) RETURNING id INTO feedback;
 RETURN feedback;
END $$;
CREATE FUNCTION edit_report_feedback(actor UUID,feedback UUID,expected_revision INT,text_body TEXT,review_decision TEXT DEFAULT NULL)
RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE item report_feedback%ROWTYPE;document UUID;
BEGIN
 SELECT s.document_id INTO document FROM report_feedback f JOIN report_submissions s ON s.id=f.submission_id WHERE f.id=feedback;
 PERFORM 1 FROM report_documents WHERE id=document FOR UPDATE;
 SELECT * INTO item FROM report_feedback WHERE id=feedback FOR UPDATE;
 IF NOT FOUND OR actor<>item.created_by THEN RAISE EXCEPTION 'Only feedback author may edit'; END IF;
 IF expected_revision IS NULL OR expected_revision<>item.revision THEN RAISE EXCEPTION 'Feedback revision conflict'; END IF;
 UPDATE report_feedback SET body=text_body,decision=review_decision,updated_by=actor WHERE id=feedback RETURNING revision INTO expected_revision;
 RETURN expected_revision;
END $$;
CREATE FUNCTION acknowledge_report_feedback(actor UUID,submission UUID) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE project UUID;document UUID;changed INT;
BEGIN
 SELECT d.project_id,d.id INTO project,document FROM report_documents d JOIN report_submissions s ON s.document_id=d.id WHERE s.id=submission;
 IF NOT FOUND OR NOT team_member(actor,project) THEN RAISE EXCEPTION 'Current teammate required'; END IF;
 PERFORM 1 FROM report_documents WHERE id=document FOR UPDATE;
 UPDATE report_feedback SET seen_by_student_id=actor,seen_by_student_at=clock_timestamp() WHERE submission_id=submission AND seen_by_student_at IS NULL;
 GET DIAGNOSTICS changed=ROW_COUNT;RETURN changed;
END $$;
CREATE FUNCTION discard_report_draft(actor UUID,document UUID,expected_revision INT) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE doc report_documents%ROWTYPE;
BEGIN
 SELECT * INTO doc FROM report_documents WHERE id=document FOR UPDATE;
 IF NOT FOUND OR NOT report_student_can_write(actor,doc.project_id) THEN RAISE EXCEPTION 'Current teammate required'; END IF;
 IF expected_revision IS NULL OR expected_revision<>doc.revision THEN RAISE EXCEPTION 'Report revision conflict'; END IF;
 IF doc.state<>'DRAFT' THEN RAISE EXCEPTION 'Submitted document is locked'; END IF;
 IF EXISTS(SELECT 1 FROM report_submissions WHERE document_id=document AND first_viewed_at IS NOT NULL) THEN RAISE EXCEPTION 'A viewed submission cannot be discarded'; END IF;
 UPDATE report_documents SET deleted_at=clock_timestamp(),updated_by=actor WHERE id=document;
 RETURN document;
END $$;

CREATE VIEW project_report_status AS
 SELECT d.id AS document_id,d.project_id,d.kind,d.period_id,d.revision,d.deleted_at,
 CASE WHEN d.state='DRAFT' THEN 'DRAFT'
  WHEN EXISTS(SELECT 1 FROM report_feedback f WHERE f.submission_id=s.id AND f.decision='APPROVED') THEN 'APPROVED'
  WHEN EXISTS(SELECT 1 FROM report_feedback f WHERE f.submission_id=s.id AND f.decision='NEEDS_CHANGES') THEN 'NEEDS_CHANGES'
  WHEN EXISTS(SELECT 1 FROM report_feedback f WHERE f.submission_id=s.id AND f.kind='REVIEW') THEN 'REVIEWED'
  ELSE 'SUBMITTED' END AS status,s.id AS submission_id,s.version_id,s.submitted_at,s.is_late,s.first_viewed_at
 FROM report_documents d LEFT JOIN report_submissions s ON s.document_id=d.id AND s.state='SUBMITTED';
CREATE VIEW project_saved_report_drafts AS SELECT d.* FROM report_documents d WHERE state='DRAFT' AND deleted_at IS NULL;
COMMENT ON VIEW project_report_status IS 'Backend scopes reads by authenticated project membership. One project supervisor approval is sufficient; checks never grant approval.';

CREATE FUNCTION log_report_change() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE actor UUID;subject UUID;
BEGIN
 IF TG_TABLE_NAME='report_documents' THEN actor=NEW.updated_by;subject=NEW.id;
 ELSIF TG_TABLE_NAME='report_submission_windows' THEN actor=NEW.updated_by;subject=NEW.project_id;
 ELSIF TG_TABLE_NAME='report_submissions' THEN actor=NEW.changed_by;subject=NEW.id;
 ELSE actor=NEW.updated_by;subject=NEW.id; END IF;
 INSERT INTO audit_events(actor_id,event_key,subject_id,payload) VALUES(actor,TG_TABLE_NAME||'_'||TG_OP,subject,
 jsonb_build_object('revision',to_jsonb(NEW)->'revision','state',to_jsonb(NEW)->'state'));
 RETURN NEW;
END $$;
DO $$ DECLARE table_name TEXT; BEGIN
 FOREACH table_name IN ARRAY ARRAY['report_documents','report_submission_windows','report_submissions','report_feedback'] LOOP
  EXECUTE format('CREATE TRIGGER report_audit AFTER INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION log_report_change()',table_name);
 END LOOP;
END $$;
REVOKE ALL ON reporting_periods,presentation_templates,report_submission_windows,report_documents,report_versions,report_version_files,report_submissions,report_feedback,report_check_runs,project_report_status,project_saved_report_drafts FROM PUBLIC;
-- No direct SQL credentials belong in clients. Grant only approved operations to backend roles.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
CREATE FUNCTION presentation_template_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Published template versions cannot be deleted'; END IF;
 IF ROW(NEW.id,NEW.version,NEW.name,NEW.category,NEW.design) IS DISTINCT FROM ROW(OLD.id,OLD.version,OLD.name,OLD.category,OLD.design)
 THEN RAISE EXCEPTION 'Template design is immutable; create a new version'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER presentation_template_history BEFORE UPDATE OR DELETE ON presentation_templates FOR EACH ROW EXECUTE FUNCTION presentation_template_guard();
REVOKE ALL ON FUNCTION presentation_template_guard() FROM PUBLIC;
COMMIT;
