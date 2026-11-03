BEGIN;
SET search_path=labassist_student,public;
CREATE TABLE learning_resources (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,title_en TEXT NOT NULL,title_ar TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('ARTICLE','VIDEO','DATASHEET')),url TEXT NOT NULL UNIQUE CHECK(url ~ '^https?://[^[:space:]]+$'),
 publisher TEXT NOT NULL,language TEXT NOT NULL CHECK(language IN ('ar','en','mixed')),source_verified_at TIMESTAMPTZ
);
CREATE TABLE learning_lessons (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),slug TEXT NOT NULL,version INT NOT NULL CHECK(version>0),
 title_en TEXT NOT NULL,title_ar TEXT NOT NULL,content JSONB NOT NULL CHECK(jsonb_typeof(content)='object'),
 circuit_data JSONB NOT NULL,expected_result_en TEXT NOT NULL,expected_result_ar TEXT NOT NULL,
 published BOOLEAN NOT NULL DEFAULT true,UNIQUE(slug,version)
);
CREATE TABLE learning_lesson_parts(lesson_id UUID NOT NULL REFERENCES learning_lessons(id),catalog_key TEXT NOT NULL REFERENCES catalog_parts(key),PRIMARY KEY(lesson_id,catalog_key));
CREATE TABLE learning_lesson_resources(lesson_id UUID NOT NULL REFERENCES learning_lessons(id),resource_id UUID NOT NULL REFERENCES learning_resources(id),PRIMARY KEY(lesson_id,resource_id));
CREATE TABLE learning_bookmarks (
 student_id UUID NOT NULL REFERENCES accounts(id),lesson_id UUID REFERENCES learning_lessons(id),resource_id UUID REFERENCES learning_resources(id),
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),CHECK(num_nonnulls(lesson_id,resource_id)=1)
);
CREATE UNIQUE INDEX one_lesson_bookmark ON learning_bookmarks(student_id,lesson_id) WHERE lesson_id IS NOT NULL;
CREATE UNIQUE INDEX one_resource_bookmark ON learning_bookmarks(student_id,resource_id) WHERE resource_id IS NOT NULL;
CREATE FUNCTION learning_lesson_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN PERFORM validate_circuit_data(NEW.circuit_data);RETURN NEW;END $$;
CREATE TRIGGER lesson_circuit_scope BEFORE INSERT ON learning_lessons FOR EACH ROW EXECUTE FUNCTION learning_lesson_guard();
CREATE TRIGGER lesson_history BEFORE UPDATE OR DELETE ON learning_lessons FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE FUNCTION bookmark_learning(actor UUID,lesson UUID DEFAULT NULL,resource UUID DEFAULT NULL,save BOOLEAN DEFAULT true) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Student required';END IF;
 IF num_nonnulls(lesson,resource)<>1 THEN RAISE EXCEPTION 'Exactly one learning target required';END IF;
 PERFORM 1 FROM accounts WHERE id=actor FOR UPDATE;
 SELECT id INTO result FROM learning_bookmarks WHERE student_id=actor AND lesson_id IS NOT DISTINCT FROM lesson AND resource_id IS NOT DISTINCT FROM resource;
 IF save THEN
  IF result IS NULL THEN INSERT INTO learning_bookmarks(student_id,lesson_id,resource_id) VALUES(actor,lesson,resource) RETURNING id INTO result;END IF;
 ELSE DELETE FROM learning_bookmarks WHERE id=result AND student_id=actor;END IF;RETURN result;
END $$;
CREATE FUNCTION read_learning_bookmarks(actor UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Student required';END IF;
 RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(b)),'[]') FROM learning_bookmarks b WHERE student_id=actor);END $$;
REVOKE ALL ON learning_resources,learning_lessons,learning_lesson_parts,learning_lesson_resources,learning_bookmarks FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;
