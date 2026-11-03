BEGIN;
SET search_path=labassist_student,public;
CREATE TABLE catalog_categories(id TEXT PRIMARY KEY,name_en TEXT NOT NULL,name_ar TEXT NOT NULL,sort_order INT NOT NULL UNIQUE);
CREATE TABLE catalog_models (
 id TEXT NOT NULL,version INT NOT NULL CHECK(version>0),name TEXT NOT NULL,definition JSONB NOT NULL CHECK(jsonb_typeof(definition)='object'),
 render_units TEXT NOT NULL DEFAULT 'MODEL_UNITS' CHECK(render_units='MODEL_UNITS'),
 physical_dimensions_mm JSONB CHECK(physical_dimensions_mm IS NULL OR jsonb_typeof(physical_dimensions_mm)='object'),
 sealed BOOLEAN NOT NULL DEFAULT false,PRIMARY KEY(id,version)
);
CREATE TABLE catalog_pins (
 model_id TEXT NOT NULL,model_version INT NOT NULL,pin_index INT NOT NULL CHECK(pin_index>=0),
 name TEXT NOT NULL,kind TEXT NOT NULL,direction TEXT NOT NULL CHECK(direction IN ('in','out','io')),
 connector TEXT NOT NULL CHECK(connector IN ('socket','header','terminal','solder','unknown')),voltage NUMERIC,
 physical_number INT,functions TEXT NOT NULL DEFAULT '',PRIMARY KEY(model_id,model_version,pin_index),
 FOREIGN KEY(model_id,model_version) REFERENCES catalog_models(id,version)
);
CREATE TABLE catalog_parts (
 key TEXT PRIMARY KEY,model_id TEXT NOT NULL,model_version INT NOT NULL,category_id TEXT NOT NULL REFERENCES catalog_categories(id),
 name_en TEXT NOT NULL,name_ar TEXT NOT NULL,typical_supply_voltage NUMERIC CHECK(typical_supply_voltage>=0),
 description TEXT NOT NULL DEFAULT '',active BOOLEAN NOT NULL DEFAULT true,revision INT NOT NULL DEFAULT 0,
 FOREIGN KEY(model_id,model_version) REFERENCES catalog_models(id,version)
);
CREATE TABLE catalog_documents (
 part_key TEXT NOT NULL REFERENCES catalog_parts(key),url TEXT NOT NULL CHECK(url ~ '^https?://[^[:space:]]+$'),
 title TEXT NOT NULL,publisher TEXT NOT NULL,format TEXT NOT NULL CHECK(format IN ('PDF','Web')),reference_scope TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '',source_verified_at TIMESTAMPTZ,PRIMARY KEY(part_key,url)
);
CREATE TABLE catalog_guides (
 part_key TEXT NOT NULL REFERENCES catalog_parts(key),version INT NOT NULL CHECK(version>0),language TEXT NOT NULL CHECK(language IN ('ar','en','mixed')),
 content JSONB NOT NULL CHECK(jsonb_typeof(content)='object'),PRIMARY KEY(part_key,version,language)
);
CREATE TRIGGER guide_immutable BEFORE UPDATE OR DELETE ON catalog_guides FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER pin_immutable BEFORE UPDATE OR DELETE ON catalog_pins FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE FUNCTION catalog_model_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='catalog_pins' THEN
  IF EXISTS(SELECT 1 FROM catalog_models WHERE id=NEW.model_id AND version=NEW.model_version AND sealed) THEN
   IF EXISTS(SELECT 1 FROM catalog_pins p WHERE p.model_id=NEW.model_id AND p.model_version=NEW.model_version AND p.pin_index=NEW.pin_index AND to_jsonb(p)=to_jsonb(NEW)) THEN RETURN NULL;END IF;
   RAISE EXCEPTION 'Sealed model pins are immutable';END IF;
 ELSE
  IF TG_OP='DELETE' OR OLD.sealed THEN RAISE EXCEPTION 'Sealed model is immutable; create a new version';END IF;
  IF ROW(NEW.id,NEW.version,NEW.name,NEW.definition,NEW.render_units,NEW.physical_dimensions_mm) IS DISTINCT FROM ROW(OLD.id,OLD.version,OLD.name,OLD.definition,OLD.render_units,OLD.physical_dimensions_mm) THEN RAISE EXCEPTION 'Model identity and definition are immutable';END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER pin_model_scope BEFORE INSERT ON catalog_pins FOR EACH ROW EXECUTE FUNCTION catalog_model_guard();
CREATE TRIGGER model_history BEFORE UPDATE OR DELETE ON catalog_models FOR EACH ROW EXECUTE FUNCTION catalog_model_guard();
CREATE FUNCTION update_catalog_part(actor UUID,part TEXT,expected INT,english TEXT,arabic TEXT,description TEXT,enabled BOOLEAN) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager curator required';END IF;
 SELECT revision INTO value FROM catalog_parts WHERE key=part FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Catalog part not found';END IF;PERFORM data_revision(value,expected);
 IF length(btrim(english))=0 OR length(btrim(arabic))=0 THEN RAISE EXCEPTION 'Both display names required';END IF;
 UPDATE catalog_parts SET name_en=english,name_ar=arabic,description=update_catalog_part.description,active=enabled,revision=revision+1 WHERE key=part RETURNING revision INTO value;RETURN value;
END $$;
ALTER TABLE project_bom_items ADD COLUMN catalog_key TEXT REFERENCES catalog_parts(key);
CREATE INDEX bom_catalog_lookup ON project_bom_items(catalog_key);
CREATE FUNCTION read_catalog(actor UUID,search TEXT DEFAULT '') RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered reader required';END IF;
 RETURN (SELECT COALESCE(jsonb_agg(x ORDER BY name_en),'[]') FROM (SELECT p.* FROM catalog_parts p WHERE p.active AND
 (strpos(lower(p.name_en),lower(search))>0 OR strpos(p.name_ar,search)>0 OR strpos(p.key,lower(search))>0)) x);
END $$;
REVOKE ALL ON catalog_categories,catalog_models,catalog_pins,catalog_parts,catalog_documents,catalog_guides FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;
