BEGIN;
SET search_path=labassist_student,public;
CREATE TABLE ai_conversations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,owner_id UUID NOT NULL REFERENCES accounts(id),project_id UUID REFERENCES projects(id),
 title TEXT NOT NULL,shared_with_team BOOLEAN NOT NULL DEFAULT false,revision INT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),CHECK(NOT shared_with_team OR project_id IS NOT NULL)
);
CREATE TABLE ai_jobs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id UUID NOT NULL REFERENCES ai_conversations(id),request_key UUID NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('CHAT','DESIGN')),input_snapshot JSONB NOT NULL CHECK(jsonb_typeof(input_snapshot)='object'),base_revision INT NOT NULL,
 status TEXT NOT NULL DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED')),
 worker_id TEXT,claim_token UUID,lease_until TIMESTAMPTZ,revision INT NOT NULL DEFAULT 0,
 model TEXT,result JSONB,error_text TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),finished_at TIMESTAMPTZ,
 UNIQUE(conversation_id,request_key),UNIQUE(id,conversation_id),
 CHECK((status IN ('SUCCEEDED','FAILED'))=(finished_at IS NOT NULL)),CHECK(status<>'SUCCEEDED' OR result IS NOT NULL AND model IS NOT NULL),
 CHECK(status<>'RUNNING' OR claim_token IS NOT NULL AND lease_until IS NOT NULL)
);
CREATE TABLE ai_messages (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
 role TEXT NOT NULL CHECK(role IN ('USER','ASSISTANT')),body TEXT NOT NULL CHECK(length(btrim(body))>0),request_key UUID NOT NULL,job_id UUID UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(conversation_id,request_key),
 FOREIGN KEY(job_id,conversation_id) REFERENCES ai_jobs(id,conversation_id),CHECK((role='ASSISTANT')=(job_id IS NOT NULL))
);
CREATE TABLE ai_project_designs (
 job_id UUID PRIMARY KEY REFERENCES ai_jobs(id),image_file_id UUID NOT NULL REFERENCES files(id),
 length_mm NUMERIC NOT NULL CHECK(length_mm>0 AND length_mm<1000000),width_mm NUMERIC NOT NULL CHECK(width_mm>0 AND width_mm<1000000),height_mm NUMERIC NOT NULL CHECK(height_mm>0 AND height_mm<1000000),
 sizing_method TEXT NOT NULL CHECK(length(btrim(sizing_method))>0),assumptions JSONB NOT NULL CHECK(jsonb_typeof(assumptions)='array'),
 is_estimate BOOLEAN NOT NULL DEFAULT true CHECK(is_estimate)
);
CREATE TABLE ai_part_suggestions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),job_id UUID NOT NULL REFERENCES ai_jobs(id),catalog_key TEXT REFERENCES catalog_parts(key),
 name TEXT NOT NULL,quantity INT NOT NULL CHECK(quantity>0),estimated_unit_price NUMERIC(14,2) CHECK(estimated_unit_price>=0 AND estimated_unit_price<>'NaN'::numeric),
 currency CHAR(3) CHECK(currency ~ '^[A-Z]{3}$'),reason TEXT NOT NULL,CHECK((estimated_unit_price IS NULL)=(currency IS NULL))
);
CREATE TABLE ai_sources (
 job_id UUID NOT NULL REFERENCES ai_jobs(id),url TEXT NOT NULL CHECK(url ~ '^https?://[^[:space:]]+$'),title TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('WEB','VIDEO','DATASHEET')),verified_at TIMESTAMPTZ,PRIMARY KEY(job_id,url)
);
CREATE TABLE learning_ai_snapshots (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),student_id UUID NOT NULL REFERENCES accounts(id),conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
 title TEXT NOT NULL,cutoff_sequence BIGINT NOT NULL,snapshot JSONB NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(student_id,conversation_id,cutoff_sequence)
);
ALTER TABLE project_bom_items ADD COLUMN ai_suggestion_id UUID UNIQUE REFERENCES ai_part_suggestions(id);
CREATE INDEX ai_job_queue ON ai_jobs(status,created_at) WHERE status IN ('QUEUED','RUNNING');
CREATE INDEX ai_message_thread ON ai_messages(conversation_id,sequence);
CREATE FUNCTION ai_readable(actor UUID,conversation UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT data_student(actor) AND EXISTS(SELECT 1 FROM ai_conversations c WHERE c.id=conversation AND (c.owner_id=actor OR c.shared_with_team AND team_member(actor,c.project_id)))
$$;
CREATE FUNCTION ai_bom_source_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE thread UUID;
BEGIN
 IF TG_OP='UPDATE' AND OLD.ai_suggestion_id IS NOT NULL AND NEW.ai_suggestion_id IS DISTINCT FROM OLD.ai_suggestion_id THEN RAISE EXCEPTION 'AI suggestion provenance is immutable';END IF;
 IF TG_OP='UPDATE' AND OLD.ai_suggestion_id IS NOT NULL THEN RETURN NEW;END IF;
 IF NEW.ai_suggestion_id IS NOT NULL THEN
  SELECT j.conversation_id INTO thread FROM ai_part_suggestions s JOIN ai_jobs j ON j.id=s.job_id WHERE s.id=NEW.ai_suggestion_id;
  IF NOT ai_readable(NEW.updated_by,thread) OR EXISTS(SELECT 1 FROM ai_conversations WHERE id=thread AND project_id IS NOT NULL AND project_id<>NEW.project_id) THEN RAISE EXCEPTION 'AI suggestion access denied';END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER ai_bom_source_scope BEFORE INSERT OR UPDATE ON project_bom_items FOR EACH ROW EXECUTE FUNCTION ai_bom_source_guard();
CREATE FUNCTION ai_thread_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'AI history cannot be deleted';END IF;
 IF NOT data_student(NEW.owner_id) THEN RAISE EXCEPTION 'Student AI owner required';END IF;
 IF NEW.project_id IS NOT NULL AND NOT team_member(NEW.owner_id,NEW.project_id) THEN RAISE EXCEPTION 'AI owner project membership required';END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.owner_id,NEW.project_id,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.owner_id,OLD.project_id,OLD.created_at) THEN RAISE EXCEPTION 'AI conversation identity immutable';END IF;
  NEW.revision=OLD.revision+1;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER ai_thread_scope BEFORE INSERT OR UPDATE OR DELETE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION ai_thread_guard();
CREATE TRIGGER ai_message_history BEFORE UPDATE OR DELETE ON ai_messages FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER ai_design_history BEFORE UPDATE OR DELETE ON ai_project_designs FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER ai_suggestion_history BEFORE UPDATE OR DELETE ON ai_part_suggestions FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER ai_snapshot_history BEFORE UPDATE OR DELETE ON learning_ai_snapshots FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE FUNCTION ai_job_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'AI job history cannot be deleted';END IF;
 IF TG_OP='UPDATE' AND (OLD.status IN ('SUCCEEDED','FAILED') OR ROW(NEW.id,NEW.conversation_id,NEW.request_key,NEW.kind,NEW.input_snapshot,NEW.base_revision,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.conversation_id,OLD.request_key,OLD.kind,OLD.input_snapshot,OLD.base_revision,OLD.created_at)) THEN RAISE EXCEPTION 'AI job input and terminal result are immutable';END IF;
 IF TG_OP='UPDATE' THEN NEW.revision=OLD.revision+1;END IF;RETURN NEW;
END $$;
CREATE TRIGGER ai_job_scope BEFORE UPDATE OR DELETE ON ai_jobs FOR EACH ROW EXECUTE FUNCTION ai_job_guard();
CREATE FUNCTION create_ai_conversation(actor UUID,title TEXT,project UUID DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Student required';END IF;
 INSERT INTO ai_conversations(owner_id,project_id,title) VALUES(actor,project,title) RETURNING id INTO result;RETURN result;END $$;
CREATE FUNCTION set_ai_sharing(actor UUID,conversation UUID,expected INT,shared BOOLEAN) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;BEGIN SELECT revision INTO value FROM ai_conversations WHERE id=conversation AND owner_id=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_student(actor) THEN RAISE EXCEPTION 'AI conversation owner required';END IF;PERFORM data_revision(value,expected);
 UPDATE ai_conversations SET shared_with_team=shared WHERE id=conversation RETURNING revision INTO value;RETURN value;END $$;
CREATE FUNCTION append_ai_message(actor UUID,conversation UUID,expected INT,request UUID,message TEXT) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;existing ai_messages%ROWTYPE;result UUID;
BEGIN SELECT revision INTO value FROM ai_conversations WHERE id=conversation AND owner_id=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_student(actor) THEN RAISE EXCEPTION 'AI conversation owner required';END IF;
 SELECT * INTO existing FROM ai_messages WHERE conversation_id=conversation AND request_key=request;
 IF FOUND THEN IF existing.role<>'USER' OR existing.body<>message THEN RAISE EXCEPTION 'AI message key reused with different data';END IF;RETURN existing.id;END IF;
 PERFORM data_revision(value,expected);INSERT INTO ai_messages(conversation_id,role,body,request_key) VALUES(conversation,'USER',message,request) RETURNING id INTO result;
 UPDATE ai_conversations SET revision=revision+1 WHERE id=conversation;RETURN result;
END $$;
CREATE FUNCTION request_ai_job(actor UUID,conversation UUID,expected INT,request UUID,job_kind TEXT) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;result UUID;existing_kind TEXT;input JSONB;
BEGIN SELECT revision INTO value FROM ai_conversations WHERE id=conversation AND owner_id=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_student(actor) THEN RAISE EXCEPTION 'AI conversation owner required';END IF;
 SELECT id,kind INTO result,existing_kind FROM ai_jobs WHERE conversation_id=conversation AND request_key=request;
 IF FOUND THEN IF existing_kind<>job_kind THEN RAISE EXCEPTION 'AI request key reused with different kind';END IF;RETURN result;END IF;PERFORM data_revision(value,expected);
 SELECT jsonb_build_object('messages',COALESCE(jsonb_agg(jsonb_build_object('sequence',sequence,'role',role,'body',body) ORDER BY sequence),'[]')) INTO input FROM ai_messages WHERE conversation_id=conversation;
 IF jsonb_array_length(input->'messages')=0 THEN RAISE EXCEPTION 'AI request needs student context';END IF;
 INSERT INTO ai_jobs(conversation_id,request_key,kind,input_snapshot,base_revision) VALUES(conversation,request,job_kind,input,value) RETURNING id INTO result;RETURN result;
END $$;
-- Service-worker operation. Never grant to client/student database roles.
CREATE FUNCTION claim_ai_job(worker TEXT,lease_seconds INT DEFAULT 120) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE job ai_jobs%ROWTYPE;
BEGIN IF COALESCE(length(btrim(worker)),0)=0 OR lease_seconds IS NULL OR lease_seconds NOT BETWEEN 10 AND 900 THEN RAISE EXCEPTION 'Valid worker and lease required';END IF;
 SELECT * INTO job FROM ai_jobs WHERE status='QUEUED' OR status='RUNNING' AND lease_until<clock_timestamp() ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL;END IF;
 UPDATE ai_jobs SET status='RUNNING',worker_id=worker,claim_token=gen_random_uuid(),lease_until=clock_timestamp()+make_interval(secs=>lease_seconds) WHERE id=job.id RETURNING * INTO job;
 RETURN jsonb_build_object('id',job.id,'claim_token',job.claim_token,'input',job.input_snapshot,'kind',job.kind);
END $$;
CREATE FUNCTION complete_ai_job(job UUID,token UUID,model_name TEXT,output JSONB) RETURNS VOID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current ai_jobs%ROWTYPE;owner UUID;entry JSONB;image UUID;
BEGIN
 SELECT conversation_id INTO owner FROM ai_jobs WHERE id=job;PERFORM 1 FROM ai_conversations WHERE id=owner FOR UPDATE;
 SELECT * INTO current FROM ai_jobs WHERE id=job FOR UPDATE;
 IF NOT FOUND OR current.status<>'RUNNING' OR current.claim_token IS DISTINCT FROM token OR current.lease_until<=clock_timestamp() THEN RAISE EXCEPTION 'AI claim conflict or lease expired';END IF;
 IF COALESCE(length(btrim(model_name)),0)=0 OR COALESCE(length(btrim(output->>'answer')),0)=0 THEN RAISE EXCEPTION 'Model and answer required';END IF;
 SELECT owner_id INTO owner FROM ai_conversations WHERE id=current.conversation_id;
 IF current.kind='DESIGN' THEN
  image=(output->'design'->>'image_file_id')::uuid;
  IF image IS NULL OR NOT EXISTS(SELECT 1 FROM files WHERE id=image AND uploaded_by=owner AND status='READY' AND mime_type LIKE 'image/%' AND sha256 IS NOT NULL) THEN RAISE EXCEPTION 'Design needs an owned ready image';END IF;
  INSERT INTO ai_project_designs VALUES(job,image,(output->'design'->>'length_mm')::numeric,(output->'design'->>'width_mm')::numeric,(output->'design'->>'height_mm')::numeric,output->'design'->>'method',output->'design'->'assumptions',true);
 END IF;
 FOR entry IN SELECT x FROM jsonb_array_elements(COALESCE(output->'suggestions','[]')) x LOOP
  INSERT INTO ai_part_suggestions(job_id,catalog_key,name,quantity,estimated_unit_price,currency,reason) VALUES(job,entry->>'catalog_key',entry->>'name',(entry->>'quantity')::int,(entry->>'price')::numeric,entry->>'currency',entry->>'reason');
 END LOOP;
 FOR entry IN SELECT x FROM jsonb_array_elements(COALESCE(output->'sources','[]')) x LOOP INSERT INTO ai_sources(job_id,url,title,kind) VALUES(job,entry->>'url',entry->>'title',entry->>'kind');END LOOP;
 INSERT INTO ai_messages(conversation_id,role,body,request_key,job_id) VALUES(current.conversation_id,'ASSISTANT',output->>'answer',current.id,current.id);
 UPDATE ai_conversations SET revision=revision+1 WHERE id=current.conversation_id;
 UPDATE ai_jobs SET status='SUCCEEDED',model=model_name,result=output,finished_at=clock_timestamp() WHERE id=job;
END $$;
CREATE FUNCTION fail_ai_job(job UUID,token UUID,reason TEXT) RETURNS VOID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN UPDATE ai_jobs SET status='FAILED',error_text=reason,finished_at=clock_timestamp() WHERE id=job AND status='RUNNING' AND claim_token=token AND lease_until>clock_timestamp();IF NOT FOUND THEN RAISE EXCEPTION 'AI claim conflict';END IF;END $$;
CREATE FUNCTION pin_ai_conversation(actor UUID,conversation UUID,expected INT,title TEXT) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;cutoff BIGINT;content JSONB;result UUID;
BEGIN SELECT revision INTO value FROM ai_conversations WHERE id=conversation AND owner_id=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_student(actor) THEN RAISE EXCEPTION 'AI conversation owner required';END IF;PERFORM data_revision(value,expected);
 SELECT max(sequence),jsonb_build_object('messages',COALESCE(jsonb_agg(jsonb_build_object('sequence',sequence,'role',role,'body',body) ORDER BY sequence),'[]')) INTO cutoff,content FROM ai_messages WHERE conversation_id=conversation;
 IF cutoff IS NULL THEN RAISE EXCEPTION 'Empty conversation cannot be pinned';END IF;
 content=content||jsonb_build_object('results',(SELECT COALESCE(jsonb_agg(j.result),'[]') FROM ai_jobs j WHERE j.conversation_id=conversation AND j.status='SUCCEEDED'));
 INSERT INTO learning_ai_snapshots(student_id,conversation_id,title,cutoff_sequence,snapshot) VALUES(actor,conversation,title,cutoff,content) ON CONFLICT(student_id,conversation_id,cutoff_sequence) DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN SELECT id INTO result FROM learning_ai_snapshots WHERE student_id=actor AND conversation_id=conversation AND cutoff_sequence=cutoff;END IF;RETURN result;
END $$;
CREATE FUNCTION read_ai_conversation(actor UUID,conversation UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT ai_readable(actor,conversation) THEN RAISE EXCEPTION 'AI conversation access denied';END IF;
 RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'sequence',sequence,'role',role,'body',body) ORDER BY sequence),'[]') FROM ai_messages WHERE conversation_id=conversation);END $$;
CREATE FUNCTION read_ai_snapshot(actor UUID,snapshot UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result JSONB;BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Student required';END IF;
 SELECT s.snapshot INTO result FROM learning_ai_snapshots s WHERE s.id=read_ai_snapshot.snapshot AND student_id=actor;IF NOT FOUND THEN RAISE EXCEPTION 'Private learning snapshot access denied';END IF;RETURN result;END $$;
CREATE FUNCTION apply_ai_suggestion(actor UUID,suggestion UUID,project UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE s ai_part_suggestions%ROWTYPE;thread UUID;value UUID;currency CHAR(3);
BEGIN IF NOT data_student(actor) OR NOT team_member(actor,project) THEN RAISE EXCEPTION 'Own project teammate required';END IF;
 SELECT b.currency INTO currency FROM project_budgets b WHERE project_id=project FOR UPDATE;
 IF EXISTS(SELECT 1 FROM projects WHERE id=project AND status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'Completed project is read only';END IF;
 SELECT * INTO s FROM ai_part_suggestions WHERE id=suggestion;
 SELECT j.conversation_id INTO thread FROM ai_jobs j WHERE j.id=s.job_id;
 IF NOT ai_readable(actor,thread) OR EXISTS(SELECT 1 FROM ai_conversations WHERE id=thread AND project_id IS NOT NULL AND project_id<>project) THEN RAISE EXCEPTION 'AI suggestion access denied';END IF;
 IF s.currency IS NOT NULL AND s.currency<>currency THEN RAISE EXCEPTION 'Suggestion currency differs from project budget';END IF;
 SELECT id INTO value FROM project_bom_items WHERE ai_suggestion_id=suggestion;IF FOUND THEN RETURN value;END IF;
 INSERT INTO project_bom_items(project_id,name,quantity_required,estimated_unit_price,created_by,updated_by,catalog_key,ai_suggestion_id) VALUES(project,s.name,s.quantity,s.estimated_unit_price,actor,actor,s.catalog_key,suggestion) RETURNING id INTO value;RETURN value;
END $$;
CREATE FUNCTION read_ai_job(actor UUID,job UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE conversation UUID;BEGIN SELECT conversation_id INTO conversation FROM ai_jobs WHERE id=job;
 IF NOT ai_readable(actor,conversation) THEN RAISE EXCEPTION 'AI job access denied';END IF;
 RETURN (SELECT jsonb_build_object('id',id,'kind',kind,'status',status,'model',model,'result',result,'base_revision',base_revision) FROM ai_jobs WHERE id=job);END $$;
CREATE FUNCTION read_learning_hub_saved(actor UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Student required';END IF;
 RETURN jsonb_build_object('bookmarks',read_learning_bookmarks(actor),'ai_snapshots',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'title',title,'cutoff_sequence',cutoff_sequence,'created_at',created_at)),'[]') FROM learning_ai_snapshots WHERE student_id=actor));END $$;
REVOKE ALL ON ai_conversations,ai_jobs,ai_messages,ai_project_designs,ai_part_suggestions,ai_sources,learning_ai_snapshots FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;
