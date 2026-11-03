BEGIN;
SET search_path=labassist_student,public;
CREATE TABLE circuit_documents (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,owner_id UUID NOT NULL REFERENCES accounts(id),project_id UUID REFERENCES projects(id),
 name TEXT NOT NULL CHECK(length(btrim(name))>0),team_shared BOOLEAN NOT NULL DEFAULT false,
 request_key UUID NOT NULL,request_payload JSONB NOT NULL,head_version UUID,share_checkpoint_version UUID,origin_version UUID,
 updated_by UUID NOT NULL REFERENCES accounts(id),revision INT NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(NOT team_shared OR project_id IS NOT NULL),UNIQUE(owner_id,request_key),UNIQUE(id,owner_id)
);
CREATE TABLE circuit_versions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),circuit_id UUID NOT NULL REFERENCES circuit_documents(id),version_number INT NOT NULL CHECK(version_number>0),
 label TEXT NOT NULL DEFAULT '',data JSONB NOT NULL CHECK(jsonb_typeof(data)='object'),created_by UUID NOT NULL REFERENCES accounts(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(circuit_id,version_number),UNIQUE(id,circuit_id)
);
ALTER TABLE circuit_documents ADD FOREIGN KEY(head_version,id) REFERENCES circuit_versions(id,circuit_id);
ALTER TABLE circuit_documents ADD FOREIGN KEY(share_checkpoint_version,id) REFERENCES circuit_versions(id,circuit_id);
ALTER TABLE circuit_documents ADD FOREIGN KEY(origin_version) REFERENCES circuit_versions(id);
CREATE TABLE circuit_version_parts (
 version_id UUID NOT NULL REFERENCES circuit_versions(id),instance_key TEXT NOT NULL,model_id TEXT NOT NULL,model_version INT NOT NULL,
 x NUMERIC NOT NULL,z NUMERIC NOT NULL,rotation INT NOT NULL CHECK(rotation BETWEEN 0 AND 3),properties JSONB NOT NULL DEFAULT '{}',
 PRIMARY KEY(version_id,instance_key),FOREIGN KEY(model_id,model_version) REFERENCES catalog_models(id,version)
);
CREATE TABLE circuit_version_wires (
 version_id UUID NOT NULL REFERENCES circuit_versions(id),instance_key TEXT NOT NULL,
 from_part TEXT NOT NULL,from_pin INT NOT NULL CHECK(from_pin>=0),to_part TEXT NOT NULL,to_pin INT NOT NULL CHECK(to_pin>=0),
 wire_type TEXT NOT NULL CHECK(wire_type IN ('jumper-mm','jumper-mf','jumper-fm','jumper-ff','power')),
 color TEXT NOT NULL CHECK(color ~ '^#[0-9A-Fa-f]{6}$'),gauge INT,control_point JSONB,
 PRIMARY KEY(version_id,instance_key),FOREIGN KEY(version_id,from_part) REFERENCES circuit_version_parts(version_id,instance_key),
 FOREIGN KEY(version_id,to_part) REFERENCES circuit_version_parts(version_id,instance_key),CHECK(ROW(from_part,from_pin)<>ROW(to_part,to_pin)),
 CHECK((wire_type='power' AND gauge IN (18,20,22)) OR (wire_type<>'power' AND gauge IS NULL))
);
CREATE TABLE circuit_publications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),circuit_id UUID NOT NULL,version_id UUID NOT NULL,
 published_by UUID NOT NULL REFERENCES accounts(id),title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',
 copy_mode TEXT NOT NULL CHECK(copy_mode IN ('VIEW','COPY')),active BOOLEAN NOT NULL DEFAULT true,revision INT NOT NULL DEFAULT 0,
 published_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(circuit_id,version_id),UNIQUE(id,version_id),FOREIGN KEY(version_id,circuit_id) REFERENCES circuit_versions(id,circuit_id)
);
CREATE TABLE circuit_copy_requests (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),publication_id UUID NOT NULL REFERENCES circuit_publications(id),student_id UUID NOT NULL REFERENCES accounts(id),
 status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','DENIED')),decided_by UUID REFERENCES accounts(id),revision INT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(publication_id,student_id),CHECK((status='PENDING')=(decided_by IS NULL))
);
CREATE TABLE circuit_forks (
 owner_id UUID NOT NULL REFERENCES accounts(id),request_key UUID NOT NULL,publication_id UUID NOT NULL REFERENCES circuit_publications(id),
 source_version UUID NOT NULL REFERENCES circuit_versions(id),copy_id UUID NOT NULL UNIQUE REFERENCES circuit_documents(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(owner_id,request_key),
 FOREIGN KEY(publication_id,source_version) REFERENCES circuit_publications(id,version_id),FOREIGN KEY(copy_id,owner_id) REFERENCES circuit_documents(id,owner_id)
);
CREATE INDEX circuit_model_search ON circuit_version_parts(model_id,version_id);
CREATE INDEX circuit_team_lookup ON circuit_documents(project_id) WHERE team_shared;
CREATE FUNCTION circuit_readable(actor UUID,circuit UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT data_student(actor) AND EXISTS(SELECT 1 FROM circuit_documents d WHERE d.id=circuit AND (d.owner_id=actor OR d.team_shared AND team_member(actor,d.project_id)))
$$;
CREATE FUNCTION circuit_writable(actor UUID,circuit UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT circuit_readable(actor,circuit) AND NOT EXISTS(SELECT 1 FROM circuit_documents d JOIN projects p ON p.id=d.project_id WHERE d.id=circuit AND p.status IN ('COMPLETED','ARCHIVED'))
$$;
CREATE FUNCTION circuit_document_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Circuit history cannot be deleted';END IF;
 IF TG_OP='INSERT' THEN
  IF NOT data_student(NEW.owner_id) OR NEW.updated_by<>NEW.owner_id THEN RAISE EXCEPTION 'Student owner required';END IF;
 ELSE
  IF NOT circuit_writable(NEW.updated_by,OLD.id) THEN RAISE EXCEPTION 'Editable student circuit required';END IF;
  IF ROW(NEW.id,NEW.owner_id,NEW.request_key,NEW.request_payload,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.owner_id,OLD.request_key,OLD.request_payload,OLD.created_at) THEN RAISE EXCEPTION 'Circuit identity is immutable';END IF;
  IF NEW.updated_by<>OLD.owner_id AND ROW(NEW.project_id,NEW.team_shared,NEW.name,NEW.origin_version,NEW.share_checkpoint_version) IS DISTINCT FROM ROW(OLD.project_id,OLD.team_shared,OLD.name,OLD.origin_version,OLD.share_checkpoint_version) THEN RAISE EXCEPTION 'Only owner changes circuit sharing';END IF;
  NEW.revision=OLD.revision+1;
 END IF;
 IF NEW.project_id IS NOT NULL AND NOT team_member(NEW.owner_id,NEW.project_id) THEN RAISE EXCEPTION 'Owner project membership required';END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER circuit_document_scope BEFORE INSERT OR UPDATE OR DELETE ON circuit_documents FOR EACH ROW EXECUTE FUNCTION circuit_document_guard();
CREATE TRIGGER circuit_version_immutable BEFORE UPDATE OR DELETE ON circuit_versions FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER circuit_part_immutable BEFORE UPDATE OR DELETE ON circuit_version_parts FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER circuit_wire_immutable BEFORE UPDATE OR DELETE ON circuit_version_wires FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER circuit_fork_immutable BEFORE UPDATE OR DELETE ON circuit_forks FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE FUNCTION wire_fit_checked(model_a TEXT,rev_a INT,pin_a INT,model_b TEXT,rev_b INT,pin_b INT,wire TEXT) RETURNS BOOLEAN LANGUAGE plpgsql STABLE SET search_path=labassist_student,pg_temp AS $$
DECLARE a catalog_pins%ROWTYPE;b catalog_pins%ROWTYPE;end_a TEXT;end_b TEXT;
BEGIN
 SELECT * INTO a FROM catalog_pins WHERE model_id=model_a AND model_version=rev_a AND pin_index=pin_a;
 SELECT * INTO b FROM catalog_pins WHERE model_id=model_b AND model_version=rev_b AND pin_index=pin_b;
 IF a.name IS NULL OR b.name IS NULL OR a.connector='unknown' OR b.connector='unknown' THEN RETURN false;END IF;
 IF wire='power' THEN RETURN NOT(model_a='s-60-12' AND a.name IN ('L','N','PE') OR model_b='s-60-12' AND b.name IN ('L','N','PE'));END IF;
 end_a=CASE wire WHEN 'jumper-mm' THEN 'male' WHEN 'jumper-mf' THEN 'male' WHEN 'jumper-fm' THEN 'female' WHEN 'jumper-ff' THEN 'female' END;
 end_b=CASE wire WHEN 'jumper-mm' THEN 'male' WHEN 'jumper-mf' THEN 'female' WHEN 'jumper-fm' THEN 'male' WHEN 'jumper-ff' THEN 'female' END;
 RETURN COALESCE((a.connector='socket' AND end_a='male' OR a.connector='header' AND end_a='female') AND (b.connector='socket' AND end_b='male' OR b.connector='header' AND end_b='female'),false);
END $$;
CREATE FUNCTION validate_circuit_data(content JSONB) RETURNS VOID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE part JSONB;wire JSONB;a JSONB;b JSONB;
BEGIN
 IF jsonb_typeof(content->'parts') IS DISTINCT FROM 'array' OR jsonb_typeof(content->'wires') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Circuit parts and wires arrays required';END IF;
 IF (SELECT count(*)<>count(DISTINCT x->>'id') FROM jsonb_array_elements(content->'parts') x) OR (SELECT count(*)<>count(DISTINCT x->>'id') FROM jsonb_array_elements(content->'wires') x) THEN RAISE EXCEPTION 'Duplicate circuit instance ID';END IF;
 FOR part IN SELECT x FROM jsonb_array_elements(content->'parts') x LOOP
  IF COALESCE(part->>'id','')='' OR jsonb_typeof(part->'x') IS DISTINCT FROM 'number' OR jsonb_typeof(part->'z') IS DISTINCT FROM 'number' OR jsonb_typeof(part->'rot') IS DISTINCT FROM 'number'
   OR (part->>'rot')::numeric NOT IN (0,1,2,3) OR NOT EXISTS(SELECT 1 FROM catalog_models WHERE id=part->>'type' AND version=COALESCE((part->>'modelVersion')::int,1) AND sealed)
  THEN RAISE EXCEPTION 'Invalid circuit part or sealed model';END IF;
 END LOOP;
 FOR wire IN SELECT x FROM jsonb_array_elements(content->'wires') x LOOP
  IF COALESCE(wire->>'id','')='' OR jsonb_typeof(wire->'from'->'pin') IS DISTINCT FROM 'number' OR jsonb_typeof(wire->'to'->'pin') IS DISTINCT FROM 'number'
   OR (wire->'from'->>'pin')::numeric<>trunc((wire->'from'->>'pin')::numeric) OR (wire->'to'->>'pin')::numeric<>trunc((wire->'to'->>'pin')::numeric) THEN RAISE EXCEPTION 'Invalid wire endpoint';END IF;
  SELECT x INTO a FROM jsonb_array_elements(content->'parts') x WHERE x->>'id'=wire->'from'->>'partId';
  SELECT x INTO b FROM jsonb_array_elements(content->'parts') x WHERE x->>'id'=wire->'to'->>'partId';
  IF NOT wire_fit_checked(a->>'type',COALESCE((a->>'modelVersion')::int,1),(wire->'from'->>'pin')::int,b->>'type',COALESCE((b->>'modelVersion')::int,1),(wire->'to'->>'pin')::int,COALESCE(wire->>'type','jumper-mm')) THEN RAISE EXCEPTION 'Wire connector mismatch or unverified endpoint';END IF;
 END LOOP;
END $$;
CREATE FUNCTION circuit_version_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT circuit_writable(NEW.created_by,NEW.circuit_id) THEN RAISE EXCEPTION 'Editable student circuit required';END IF;
 PERFORM 1 FROM circuit_documents WHERE id=NEW.circuit_id FOR UPDATE;
 IF NEW.version_number<>(SELECT COALESCE(max(version_number),0)+1 FROM circuit_versions WHERE circuit_id=NEW.circuit_id) THEN RAISE EXCEPTION 'Circuit version sequence conflict';END IF;
 PERFORM validate_circuit_data(NEW.data);RETURN NEW;
END $$;
CREATE TRIGGER circuit_version_scope BEFORE INSERT ON circuit_versions FOR EACH ROW EXECUTE FUNCTION circuit_version_guard();
CREATE FUNCTION circuit_publication_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Publication history cannot be deleted';END IF;
 IF NOT data_student(NEW.published_by) OR NOT EXISTS(SELECT 1 FROM circuit_documents WHERE id=NEW.circuit_id AND owner_id=NEW.published_by) THEN RAISE EXCEPTION 'Student circuit owner required';END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.circuit_id,NEW.version_id,NEW.published_by,NEW.title,NEW.description,NEW.published_at) IS DISTINCT FROM ROW(OLD.id,OLD.circuit_id,OLD.version_id,OLD.published_by,OLD.title,OLD.description,OLD.published_at) THEN RAISE EXCEPTION 'Published version is immutable';END IF;
  NEW.revision=OLD.revision+1;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER circuit_publication_scope BEFORE INSERT OR UPDATE OR DELETE ON circuit_publications FOR EACH ROW EXECUTE FUNCTION circuit_publication_guard();
CREATE FUNCTION normalized_circuit_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE content JSONB;item JSONB;
BEGIN
 SELECT data INTO content FROM circuit_versions WHERE id=NEW.version_id;
 IF TG_TABLE_NAME='circuit_version_parts' THEN
  SELECT p INTO item FROM jsonb_array_elements(content->'parts') p WHERE p->>'id'=NEW.instance_key;
  IF item IS NULL OR ROW(NEW.model_id,NEW.model_version,NEW.x,NEW.z,NEW.rotation,NEW.properties) IS DISTINCT FROM ROW(item->>'type',COALESCE((item->>'modelVersion')::int,1),(item->>'x')::numeric,(item->>'z')::numeric,(item->>'rot')::int,item-'id'-'type'-'x'-'z'-'rot') THEN RAISE EXCEPTION 'Part index must match frozen version';END IF;
 ELSE
  SELECT w INTO item FROM jsonb_array_elements(content->'wires') w WHERE w->>'id'=NEW.instance_key;
  IF item IS NULL OR ROW(NEW.from_part,NEW.from_pin,NEW.to_part,NEW.to_pin,NEW.wire_type,NEW.color,NEW.gauge,NEW.control_point) IS DISTINCT FROM ROW(item->'from'->>'partId',(item->'from'->>'pin')::int,item->'to'->>'partId',(item->'to'->>'pin')::int,COALESCE(item->>'type','jumper-mm'),item->>'color',CASE WHEN item->>'type'='power' THEN COALESCE((item->>'gauge')::int,22) END,item->'ctrl') THEN RAISE EXCEPTION 'Wire index must match frozen version';END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER circuit_part_snapshot BEFORE INSERT ON circuit_version_parts FOR EACH ROW EXECUTE FUNCTION normalized_circuit_guard();
CREATE TRIGGER circuit_wire_snapshot BEFORE INSERT ON circuit_version_wires FOR EACH ROW EXECUTE FUNCTION normalized_circuit_guard();
CREATE FUNCTION index_circuit_version() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE p JSONB;w JSONB;
BEGIN
 FOR p IN SELECT x FROM jsonb_array_elements(NEW.data->'parts') x LOOP
  INSERT INTO circuit_version_parts VALUES(NEW.id,p->>'id',p->>'type',COALESCE((p->>'modelVersion')::int,1),(p->>'x')::numeric,(p->>'z')::numeric,(p->>'rot')::int,p-'id'-'type'-'x'-'z'-'rot');
 END LOOP;
 FOR w IN SELECT x FROM jsonb_array_elements(NEW.data->'wires') x LOOP
  INSERT INTO circuit_version_wires VALUES(NEW.id,w->>'id',w->'from'->>'partId',(w->'from'->>'pin')::int,w->'to'->>'partId',(w->'to'->>'pin')::int,COALESCE(w->>'type','jumper-mm'),w->>'color',CASE WHEN w->>'type'='power' THEN COALESCE((w->>'gauge')::int,22) END,w->'ctrl');
 END LOOP;RETURN NEW;
END $$;
CREATE TRIGGER circuit_version_index AFTER INSERT ON circuit_versions FOR EACH ROW EXECUTE FUNCTION index_circuit_version();
CREATE FUNCTION save_circuit(actor UUID,circuit UUID,expected INT,content JSONB,label TEXT DEFAULT '') RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;version UUID;
BEGIN SELECT revision INTO value FROM circuit_documents WHERE id=circuit FOR UPDATE;
 IF NOT FOUND OR NOT circuit_writable(actor,circuit) THEN RAISE EXCEPTION 'Editable student circuit required';END IF;PERFORM data_revision(value,expected);
 INSERT INTO circuit_versions(circuit_id,version_number,label,data,created_by) SELECT circuit,COALESCE(max(version_number),0)+1,save_circuit.label,content,actor FROM circuit_versions WHERE circuit_id=circuit RETURNING id INTO version;
 UPDATE circuit_documents SET head_version=version,updated_by=actor WHERE id=circuit;RETURN version;
END $$;
CREATE FUNCTION create_circuit(actor UUID,request UUID,title TEXT,project UUID DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;payload JSONB;existing JSONB;
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Student owner required';END IF;PERFORM 1 FROM accounts WHERE id=actor FOR UPDATE;
 payload=jsonb_build_object('title',title,'project',project);
 SELECT id,request_payload INTO result,existing FROM circuit_documents WHERE owner_id=actor AND request_key=request;
 IF FOUND THEN IF existing<>payload THEN RAISE EXCEPTION 'Circuit key reused with different data';END IF;RETURN result;END IF;
 INSERT INTO circuit_documents(owner_id,project_id,name,request_key,request_payload,updated_by) VALUES(actor,project,title,request,payload,actor) RETURNING id INTO result;
 PERFORM save_circuit(actor,result,0,'{"parts":[],"wires":[]}','Initial');RETURN result;
END $$;
CREATE FUNCTION share_circuit_with_team(actor UUID,circuit UUID,expected INT,enabled BOOLEAN,project UUID DEFAULT NULL) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE d circuit_documents%ROWTYPE;BEGIN SELECT * INTO d FROM circuit_documents WHERE id=circuit FOR UPDATE;
 IF NOT FOUND OR d.owner_id<>actor OR NOT data_student(actor) THEN RAISE EXCEPTION 'Circuit owner required';END IF;PERFORM data_revision(d.revision,expected);
 IF enabled AND (project IS NULL OR NOT team_member(actor,project)) THEN RAISE EXCEPTION 'Own team project required';END IF;
 UPDATE circuit_documents SET team_shared=enabled,project_id=COALESCE(project,d.project_id),share_checkpoint_version=CASE WHEN enabled THEN d.head_version ELSE d.share_checkpoint_version END,updated_by=actor WHERE id=circuit RETURNING revision INTO expected;RETURN expected;
END $$;
CREATE FUNCTION read_circuit(actor UUID,circuit UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT circuit_readable(actor,circuit) THEN RAISE EXCEPTION 'Circuit access denied';END IF;
 RETURN (SELECT jsonb_build_object('id',d.id,'owner',d.owner_id,'revision',d.revision,'head_version',d.head_version,'data',v.data,'team_shared',d.team_shared) FROM circuit_documents d JOIN circuit_versions v ON v.id=d.head_version WHERE d.id=circuit);END $$;
CREATE FUNCTION publish_circuit(actor UUID,circuit UUID,version UUID,mode TEXT,title TEXT) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;BEGIN
 PERFORM 1 FROM circuit_documents WHERE id=circuit AND owner_id=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_student(actor) THEN RAISE EXCEPTION 'Student circuit owner required';END IF;
 INSERT INTO circuit_publications(circuit_id,version_id,published_by,title,copy_mode) VALUES(circuit,version,actor,title,mode)
 ON CONFLICT(circuit_id,version_id) DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN SELECT id INTO result FROM circuit_publications WHERE circuit_id=circuit AND version_id=version;END IF;RETURN result;
END $$;
CREATE FUNCTION request_circuit_copy(actor UUID,publication UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE p circuit_publications%ROWTYPE;result UUID;
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Students only';END IF;
 SELECT * INTO p FROM circuit_publications WHERE id=publication AND active FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Publication not available';END IF;
 IF p.copy_mode='COPY' OR EXISTS(SELECT 1 FROM circuit_documents d JOIN projects x ON x.id=d.project_id WHERE d.id=p.circuit_id AND x.status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'A direct copy is available; no request required';END IF;
 INSERT INTO circuit_copy_requests(publication_id,student_id) VALUES(publication,actor) ON CONFLICT(publication_id,student_id) DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN SELECT id INTO result FROM circuit_copy_requests WHERE publication_id=publication AND student_id=actor;END IF;RETURN result;
END $$;
CREATE FUNCTION decide_circuit_copy(actor UUID,request UUID,expected INT,approve BOOLEAN) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE r circuit_copy_requests%ROWTYPE;p circuit_publications%ROWTYPE;
BEGIN SELECT * INTO p FROM circuit_publications WHERE id=(SELECT publication_id FROM circuit_copy_requests WHERE id=request) FOR UPDATE;
 IF NOT FOUND OR p.published_by<>actor OR NOT data_student(actor) THEN RAISE EXCEPTION 'Published circuit owner required';END IF;
 SELECT * INTO r FROM circuit_copy_requests WHERE id=request FOR UPDATE;PERFORM data_revision(r.revision,expected);
 IF r.status<>'PENDING' THEN RAISE EXCEPTION 'Copy request already decided';END IF;
 UPDATE circuit_copy_requests SET status=CASE WHEN approve THEN 'APPROVED' ELSE 'DENIED' END,decided_by=actor,revision=revision+1 WHERE id=request RETURNING revision INTO expected;RETURN expected;
END $$;
CREATE FUNCTION fork_circuit(actor UUID,publication UUID,request UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE p circuit_publications%ROWTYPE;result UUID;source UUID;payload JSONB;value INT;
BEGIN
 IF NOT data_student(actor) THEN RAISE EXCEPTION 'Students only';END IF;PERFORM 1 FROM accounts WHERE id=actor FOR UPDATE;
 SELECT copy_id,publication_id INTO result,source FROM circuit_forks WHERE owner_id=actor AND request_key=request;
 IF FOUND THEN IF source<>publication THEN RAISE EXCEPTION 'Fork key reused with different publication';END IF;RETURN result;END IF;
 SELECT * INTO p FROM circuit_publications WHERE id=publication AND active FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Publication not available';END IF;
 IF p.copy_mode<>'COPY' AND NOT EXISTS(SELECT 1 FROM circuit_copy_requests WHERE publication_id=publication AND student_id=actor AND status='APPROVED') AND NOT EXISTS(SELECT 1 FROM circuit_documents d JOIN projects x ON x.id=d.project_id WHERE d.id=p.circuit_id AND x.status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'Copy approval required';END IF;
 SELECT data INTO payload FROM circuit_versions WHERE id=p.version_id;
 result=create_circuit(actor,request,p.title||' (copy)');SELECT revision INTO value FROM circuit_documents WHERE id=result;
 PERFORM save_circuit(actor,result,value,payload,'Copied published version');
 UPDATE circuit_documents SET origin_version=p.version_id,updated_by=actor WHERE id=result;
 INSERT INTO circuit_forks VALUES(actor,request,publication,p.version_id,result,clock_timestamp());RETURN result;
END $$;
CREATE FUNCTION search_published_circuits(actor UUID,search TEXT DEFAULT '') RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Students only';END IF;
 RETURN (SELECT COALESCE(jsonb_agg(x),'[]') FROM (
  SELECT p.id,p.title,p.version_id,p.copy_mode,a.full_name AS student_name,pr.name AS project_name FROM circuit_publications p JOIN circuit_documents d ON d.id=p.circuit_id JOIN accounts a ON a.id=d.owner_id LEFT JOIN projects pr ON pr.id=d.project_id
  WHERE p.active AND (strpos(lower(p.title||' '||a.full_name||' '||COALESCE(pr.name,'')),lower(search))>0 OR EXISTS(SELECT 1 FROM circuit_version_parts n JOIN catalog_models m ON m.id=n.model_id AND m.version=n.model_version WHERE n.version_id=p.version_id AND strpos(lower(m.name||' '||m.id),lower(search))>0)) ORDER BY p.published_at DESC LIMIT 100
 ) x);END $$;
CREATE FUNCTION read_published_circuit(actor UUID,publication UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Students only';END IF;RETURN (SELECT v.data FROM circuit_publications p JOIN circuit_versions v ON v.id=p.version_id WHERE p.id=publication AND p.active);END $$;
CREATE FUNCTION withdraw_circuit_publication(actor UUID,publication UUID,expected INT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;BEGIN SELECT revision INTO value FROM circuit_publications WHERE id=publication AND published_by=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_student(actor) THEN RAISE EXCEPTION 'Publication owner required';END IF;PERFORM data_revision(value,expected);
 UPDATE circuit_publications SET active=false,revision=revision+1 WHERE id=publication RETURNING revision INTO value;RETURN value;END $$;
CREATE FUNCTION set_circuit_publication_access(actor UUID,publication UUID,expected INT,mode TEXT,enabled BOOLEAN) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;BEGIN SELECT revision INTO value FROM circuit_publications WHERE id=publication AND published_by=actor FOR UPDATE;
 IF NOT FOUND OR NOT data_student(actor) THEN RAISE EXCEPTION 'Publication owner required';END IF;PERFORM data_revision(value,expected);
 UPDATE circuit_publications SET copy_mode=mode,active=enabled WHERE id=publication RETURNING revision INTO value;RETURN value;END $$;
REVOKE ALL ON circuit_documents,circuit_versions,circuit_version_parts,circuit_version_wires,circuit_publications,circuit_copy_requests,circuit_forks FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;
