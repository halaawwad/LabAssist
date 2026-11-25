-- Sprint 6 Task 3: offer ownership, status transitions, per-price observations, exact part identity,
-- source-approval revocation, bounded pages and explicit pin-metadata status.
-- Existing IDs and values are preserved. Existing prices receive legacy observations with no observation date,
-- no recorder, no part identity and no verification claim.
BEGIN;
SET search_path=labassist_student,public;

-- Shared bounded page size: default 50, maximum 100; out-of-range requests are rejected, never truncated.
CREATE FUNCTION page_size_limit(requested INT) RETURNS INT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN IF requested IS NULL THEN RETURN 50;END IF;IF requested<1 OR requested>100 THEN RAISE EXCEPTION 'Page size must be between 1 and 100';END IF;RETURN requested;END $$;

-- Offer ownership: managers maintain SHOP sellers; a STUDENT seller is curated only by its active student owner.
CREATE FUNCTION market_curator(actor UUID,seller UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM market_sellers s WHERE s.id=seller AND ((s.kind='SHOP' AND data_manager(actor)) OR (s.kind='STUDENT' AND s.account_id=actor AND data_student(actor))))
$$;

-- Exact identity is owned by the catalog. NULL means unknown; each part lists which fields are relevant for an exact match.
ALTER TABLE catalog_parts ADD COLUMN exact_identity_fields TEXT[] NOT NULL DEFAULT ARRAY['MANUFACTURER','MODEL','PACKAGE_OR_REVISION']
 CHECK(exact_identity_fields <@ ARRAY['MANUFACTURER','MODEL','PACKAGE_OR_REVISION']);
CREATE TABLE catalog_part_variants (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),part_key TEXT NOT NULL REFERENCES catalog_parts(key),
 manufacturer TEXT CHECK(manufacturer IS NULL OR length(btrim(manufacturer)) BETWEEN 1 AND 160),
 model_number TEXT CHECK(model_number IS NULL OR length(btrim(model_number)) BETWEEN 1 AND 160),
 package_or_revision TEXT CHECK(package_or_revision IS NULL OR length(btrim(package_or_revision)) BETWEEN 1 AND 160),
 source_url TEXT CHECK(source_url IS NULL OR source_url ~ '^https?://[^[:space:]]+$'),
 created_by UUID NOT NULL REFERENCES accounts(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(id,part_key)
);
CREATE UNIQUE INDEX catalog_variant_identity ON catalog_part_variants(part_key,lower(manufacturer),lower(model_number),lower(package_or_revision)) NULLS NOT DISTINCT;
CREATE TRIGGER variant_immutable BEFORE UPDATE OR DELETE ON catalog_part_variants FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE FUNCTION catalog_variant_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT data_manager(NEW.created_by) THEN RAISE EXCEPTION 'Workshop manager curator required';END IF;NEW.created_at=clock_timestamp();RETURN NEW;END $$;
CREATE TRIGGER variant_scope BEFORE INSERT ON catalog_part_variants FOR EACH ROW EXECUTE FUNCTION catalog_variant_guard();
CREATE FUNCTION part_variant_exact(variant_ref UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT COALESCE((SELECT ('MANUFACTURER'<>ALL(p.exact_identity_fields) OR v.manufacturer IS NOT NULL)
  AND ('MODEL'<>ALL(p.exact_identity_fields) OR v.model_number IS NOT NULL)
  AND ('PACKAGE_OR_REVISION'<>ALL(p.exact_identity_fields) OR v.package_or_revision IS NOT NULL)
  FROM catalog_part_variants v JOIN catalog_parts p ON p.key=v.part_key WHERE v.id=variant_ref),false)
$$;
CREATE FUNCTION create_part_variant(actor UUID,part TEXT,maker_name TEXT,model_name TEXT,package_name TEXT,source_link TEXT DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value UUID;BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager curator required';END IF;
 INSERT INTO catalog_part_variants(part_key,manufacturer,model_number,package_or_revision,source_url,created_by)
 VALUES(part,NULLIF(btrim(maker_name),''),NULLIF(btrim(model_name),''),NULLIF(btrim(package_name),''),NULLIF(btrim(source_link),''),actor) RETURNING id INTO value;RETURN value;
END $$;
CREATE FUNCTION set_part_identity_fields(actor UUID,part TEXT,expected INT,fields TEXT[]) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Workshop manager curator required';END IF;IF fields IS NULL THEN RAISE EXCEPTION 'Identity field list required';END IF;
 SELECT revision INTO value FROM catalog_parts WHERE key=part FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Catalog part not found';END IF;PERFORM data_revision(value,expected);
 UPDATE catalog_parts SET exact_identity_fields=ARRAY(SELECT DISTINCT f FROM unnest(fields) f ORDER BY f),revision=revision+1 WHERE key=part RETURNING revision INTO value;RETURN value;
END $$;

-- Offers reference catalog identity; once assigned it is part of the immutable comparison identity.
ALTER TABLE market_offers ADD COLUMN variant_id UUID,ADD CONSTRAINT market_offer_variant_part FOREIGN KEY(variant_id,catalog_key) REFERENCES catalog_part_variants(id,part_key),
 ADD CONSTRAINT market_offer_variant_needs_part CHECK(variant_id IS NULL OR catalog_key IS NOT NULL),ADD CONSTRAINT market_offer_observation_key UNIQUE(id,seller_id,currency);

-- Source review: PENDING -> APPROVED/REJECTED once; APPROVED -> REVOKED with actor, time and reason. The original approval stays.
ALTER TABLE resale_sources DROP CONSTRAINT resale_sources_status_check,
 ADD CONSTRAINT resale_sources_status_check CHECK(status IN ('PENDING','APPROVED','REJECTED','REVOKED')),
 ADD COLUMN revoked_by UUID REFERENCES accounts(id),ADD COLUMN revoked_at TIMESTAMPTZ,ADD COLUMN revocation_reason TEXT,
 ADD CONSTRAINT resale_source_revocation CHECK((status='REVOKED')=(revoked_by IS NOT NULL AND revoked_at IS NOT NULL AND revocation_reason IS NOT NULL)
  AND (revocation_reason IS NULL OR length(btrim(revocation_reason)) BETWEEN 1 AND 1000));
CREATE OR REPLACE FUNCTION resale_source_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Source provenance cannot be deleted';END IF;
 IF NEW.file_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM files WHERE id=NEW.file_id AND status='READY' AND sha256 IS NOT NULL) THEN RAISE EXCEPTION 'Source sheet must be a ready hashed file';END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.status='REVOKED' THEN RAISE EXCEPTION 'Only an approved source can be revoked';END IF;
  IF NEW.status<>'PENDING' AND (NOT data_manager(NEW.reviewed_by) OR NEW.reviewed_at IS NULL) THEN RAISE EXCEPTION 'Manager source review required';END IF;
  RETURN NEW;
 END IF;
 IF ROW(NEW.id,NEW.seller_id,NEW.kind,NEW.url,NEW.file_id,NEW.observed_at,NEW.content_hash) IS DISTINCT FROM ROW(OLD.id,OLD.seller_id,OLD.kind,OLD.url,OLD.file_id,OLD.observed_at,OLD.content_hash) THEN RAISE EXCEPTION 'Source evidence is immutable';END IF;
 IF NEW.status=OLD.status THEN
  IF ROW(NEW.reviewed_by,NEW.reviewed_at,NEW.revoked_by,NEW.revoked_at,NEW.revocation_reason) IS DISTINCT FROM ROW(OLD.reviewed_by,OLD.reviewed_at,OLD.revoked_by,OLD.revoked_at,OLD.revocation_reason) THEN RAISE EXCEPTION 'Source review record is immutable';END IF;
 ELSIF OLD.status='PENDING' AND NEW.status IN ('APPROVED','REJECTED') THEN
  IF NOT data_manager(NEW.reviewed_by) OR NEW.reviewed_at IS NULL THEN RAISE EXCEPTION 'Manager source review required';END IF;
 ELSIF OLD.status='APPROVED' AND NEW.status='REVOKED' THEN
  IF ROW(NEW.reviewed_by,NEW.reviewed_at) IS DISTINCT FROM ROW(OLD.reviewed_by,OLD.reviewed_at) THEN RAISE EXCEPTION 'Source review record is immutable';END IF;
  IF NOT data_manager(NEW.revoked_by) THEN RAISE EXCEPTION 'Manager source review required';END IF;
 ELSE RAISE EXCEPTION 'Source review transition not allowed';
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION revoke_resale_source(actor UUID,source UUID,reason TEXT) RETURNS VOID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT data_manager(actor) THEN RAISE EXCEPTION 'Manager source review required';END IF;
 IF reason IS NULL OR length(btrim(reason))=0 THEN RAISE EXCEPTION 'Revocation reason required';END IF;
 UPDATE resale_sources SET status='REVOKED',revoked_by=actor,revoked_at=clock_timestamp(),revocation_reason=btrim(reason) WHERE id=source AND status='APPROVED';
 IF NOT FOUND THEN IF EXISTS(SELECT 1 FROM resale_sources WHERE id=source) THEN RAISE EXCEPTION 'Only an approved source can be revoked';END IF;RAISE EXCEPTION 'Source not found';END IF;
END $$;

-- Each price observation has its own source, currency and observation date. Legacy rows mark prices whose date is unknown.
CREATE TABLE market_price_observations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),offer_id UUID NOT NULL,seller_id UUID NOT NULL,currency CHAR(3) NOT NULL,
 offer_revision INT NOT NULL CHECK(offer_revision>=0),source_id UUID NOT NULL,
 unit_price NUMERIC(14,2) NOT NULL CHECK(unit_price>=0 AND unit_price<>'NaN'::numeric),
 shipping_cost NUMERIC(14,2) CHECK(shipping_cost>=0 AND shipping_cost<>'NaN'::numeric),
 observed_at TIMESTAMPTZ,is_legacy BOOLEAN NOT NULL DEFAULT false,recorded_by UUID REFERENCES accounts(id),recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(is_legacy=(observed_at IS NULL)),CHECK(is_legacy=(recorded_by IS NULL)),UNIQUE(offer_id,offer_revision),
 FOREIGN KEY(offer_id,seller_id,currency) REFERENCES market_offers(id,seller_id,currency),
 FOREIGN KEY(source_id,seller_id) REFERENCES resale_sources(id,seller_id)
);
INSERT INTO market_price_observations(offer_id,seller_id,currency,offer_revision,source_id,unit_price,shipping_cost,observed_at,is_legacy,recorded_by)
 SELECT id,seller_id,currency,revision,source_id,unit_price,shipping_cost,NULL,true,NULL FROM market_offers;
CREATE TRIGGER price_observation_immutable BEFORE UPDATE OR DELETE ON market_price_observations FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE FUNCTION market_observation_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NEW.is_legacy THEN RAISE EXCEPTION 'Legacy observations are created only by migration';END IF;
 IF NOT market_curator(NEW.recorded_by,NEW.seller_id) THEN RAISE EXCEPTION 'Seller or manager curator required';END IF;
 IF NEW.observed_at>clock_timestamp()+interval '5 minutes' THEN RAISE EXCEPTION 'Observation date cannot be in the future';END IF;
 IF NOT EXISTS(SELECT 1 FROM resale_sources WHERE id=NEW.source_id AND status IN ('PENDING','APPROVED')) THEN RAISE EXCEPTION 'Observation source was rejected or revoked';END IF;
 NEW.recorded_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER price_observation_scope BEFORE INSERT ON market_price_observations FOR EACH ROW EXECUTE FUNCTION market_observation_guard();
-- A new offer's first price is the price shown by its source evidence, observed at that evidence's date.
CREATE FUNCTION market_initial_observation() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN INSERT INTO market_price_observations(offer_id,seller_id,currency,offer_revision,source_id,unit_price,shipping_cost,observed_at,recorded_by)
 SELECT NEW.id,NEW.seller_id,NEW.currency,NEW.revision,NEW.source_id,NEW.unit_price,NEW.shipping_cost,r.observed_at,NEW.updated_by FROM resale_sources r WHERE r.id=NEW.source_id;RETURN NEW;END $$;
CREATE TRIGGER offer_initial_observation AFTER INSERT ON market_offers FOR EACH ROW EXECUTE FUNCTION market_initial_observation();

-- Offer rules: ownership, explicit closing (zero quantity never implies SOLD), approved transitions, price changes only with an observation.
CREATE OR REPLACE FUNCTION market_offer_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE obs_revision INT;obs_status TEXT;last_open INT;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Offer history cannot be deleted';END IF;
 IF NOT market_curator(NEW.updated_by,NEW.seller_id) THEN RAISE EXCEPTION 'Seller or manager curator required';END IF;
 IF NEW.status='ACTIVE' AND NEW.quantity<=0 THEN RAISE EXCEPTION 'Active offer requires available quantity; choose an explicit closing status';END IF;
 IF NEW.status='ACTIVE' AND NEW.valid_until IS NOT NULL AND NEW.valid_until<=clock_timestamp() AND (TG_OP='INSERT' OR OLD.status<>'ACTIVE') THEN RAISE EXCEPTION 'Active offer requires a future expiry';END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.status NOT IN ('DRAFT','ACTIVE') THEN RAISE EXCEPTION 'New offers start as draft or active';END IF;
  IF NEW.status='ACTIVE' AND NOT EXISTS(SELECT 1 FROM resale_sources WHERE id=NEW.source_id AND seller_id=NEW.seller_id AND status='APPROVED') THEN RAISE EXCEPTION 'Active offer requires reviewed source';END IF;
 ELSE
  IF OLD.status IN ('SOLD','WITHDRAWN') THEN RAISE EXCEPTION 'Closed offers cannot change';END IF;
  IF ROW(NEW.id,NEW.seller_id,NEW.source_id,NEW.catalog_key,NEW.variant,NEW.condition,NEW.currency) IS DISTINCT FROM ROW(OLD.id,OLD.seller_id,OLD.source_id,OLD.catalog_key,OLD.variant,OLD.condition,OLD.currency)
   OR (OLD.variant_id IS NOT NULL AND NEW.variant_id IS DISTINCT FROM OLD.variant_id) THEN RAISE EXCEPTION 'Offer comparison identity is immutable';END IF;
  IF ROW(NEW.unit_price,NEW.shipping_cost) IS DISTINCT FROM ROW(OLD.unit_price,OLD.shipping_cost) AND NOT EXISTS(SELECT 1 FROM market_price_observations
   WHERE offer_id=NEW.id AND offer_revision=OLD.revision+1 AND unit_price=NEW.unit_price AND shipping_cost IS NOT DISTINCT FROM NEW.shipping_cost) THEN RAISE EXCEPTION 'Price change requires a new observation';END IF;
  IF NEW.status<>OLD.status THEN
   IF (OLD.status,NEW.status) NOT IN (('DRAFT','ACTIVE'),('DRAFT','WITHDRAWN'),('ACTIVE','SOLD'),('ACTIVE','WITHDRAWN'),('ACTIVE','EXPIRED'),('EXPIRED','ACTIVE')) THEN RAISE EXCEPTION 'Offer status transition not allowed';END IF;
   IF NEW.status='ACTIVE' THEN
    SELECT p.offer_revision,r.status INTO obs_revision,obs_status FROM market_price_observations p JOIN resale_sources r ON r.id=p.source_id
     WHERE p.offer_id=NEW.id AND r.status IN ('APPROVED','REVOKED') ORDER BY p.offer_revision DESC LIMIT 1;
    IF obs_status IS DISTINCT FROM 'APPROVED' THEN RAISE EXCEPTION 'Active offer requires reviewed source';END IF;
    IF OLD.status='EXPIRED' THEN
     SELECT max(revision) INTO last_open FROM market_offer_history WHERE offer_id=NEW.id AND snapshot->>'status'<>'EXPIRED';
     IF obs_revision<=COALESCE(last_open,-1) THEN RAISE EXCEPTION 'Reactivating an expired offer requires a new price observation';END IF;
    END IF;
   END IF;
  END IF;
  NEW.revision=OLD.revision+1;
 END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE FUNCTION record_market_price(actor UUID,offer UUID,expected INT,source UUID,price NUMERIC,shipping NUMERIC,money CHAR(3),observed TIMESTAMPTZ,expires TIMESTAMPTZ DEFAULT NULL) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE o market_offers;previous TIMESTAMPTZ;value INT;BEGIN
 SELECT * INTO o FROM market_offers WHERE id=offer FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found';END IF;PERFORM data_revision(o.revision,expected);
 IF observed IS NULL THEN RAISE EXCEPTION 'Observation date required';END IF;
 IF money IS DISTINCT FROM o.currency THEN RAISE EXCEPTION 'Observation currency must match the offer currency';END IF;
 SELECT max(observed_at) INTO previous FROM market_price_observations WHERE offer_id=offer;
 IF previous IS NOT NULL AND observed<=previous THEN RAISE EXCEPTION 'Observation must be newer than the previous observation';END IF;
 INSERT INTO market_price_observations(offer_id,seller_id,currency,offer_revision,source_id,unit_price,shipping_cost,observed_at,recorded_by) VALUES(offer,o.seller_id,money,o.revision+1,source,price,shipping,observed,actor);
 UPDATE market_offers SET unit_price=price,shipping_cost=shipping,valid_until=COALESCE(expires,valid_until),updated_by=actor WHERE id=offer RETURNING revision INTO value;RETURN value;
END $$;
CREATE FUNCTION set_offer_variant(actor UUID,offer UUID,expected INT,variant_ref UUID) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;BEGIN
 IF variant_ref IS NULL THEN RAISE EXCEPTION 'Part variant required';END IF;
 SELECT revision INTO value FROM market_offers WHERE id=offer FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found';END IF;PERFORM data_revision(value,expected);
 UPDATE market_offers SET variant_id=variant_ref,updated_by=actor WHERE id=offer RETURNING revision INTO value;RETURN value;
END $$;

-- Public offers: the newest observation whose source was ever approved decides visibility. If that source is revoked
-- the offer leaves public results; older prices are never used as a fallback. Offers, history and bookmarks are untouched.
CREATE VIEW market_public_offers AS
SELECT o.id,o.seller_id,o.catalog_key,o.variant_id,o.part_name,o.variant,o.condition,c.unit_price,o.currency,o.quantity,c.shipping_cost,o.valid_until,
 s.name AS seller,s.city,s.latitude,s.longitude,s.phone,s.website,s.kind AS seller_kind,s.is_demo,
 c.id AS observation_id,c.source_id AS price_source_id,r.url AS source_url,r.observed_at,r.reviewed_at,c.observed_at AS price_observed_at,c.is_legacy AS price_observation_legacy,
 v.manufacturer,v.model_number,v.package_or_revision,(v.id IS NOT NULL AND part_variant_exact(v.id)) AS identity_exact
FROM market_offers o JOIN market_sellers s ON s.id=o.seller_id
JOIN LATERAL (SELECT p.* FROM market_price_observations p JOIN resale_sources ps ON ps.id=p.source_id WHERE p.offer_id=o.id AND ps.status IN ('APPROVED','REVOKED') ORDER BY p.offer_revision DESC LIMIT 1) c ON true
JOIN resale_sources r ON r.id=c.source_id AND r.status='APPROVED'
LEFT JOIN catalog_part_variants v ON v.id=o.variant_id
WHERE o.status='ACTIVE' AND o.quantity>0 AND (o.valid_until IS NULL OR o.valid_until>=clock_timestamp());

-- Existing signature kept for current callers; it now reads observations and adds identity/observation fields.
CREATE OR REPLACE FUNCTION compare_part_offers(actor UUID,part TEXT,money CHAR(3),item_condition TEXT DEFAULT NULL,item_variant TEXT DEFAULT '',include_demo BOOLEAN DEFAULT false) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered reader required';END IF;
 RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(v) ORDER BY v.unit_price,v.id),'[]') FROM market_public_offers v
  WHERE v.catalog_key=part AND v.currency=money AND v.variant=item_variant AND (item_condition IS NULL OR v.condition=item_condition) AND (include_demo OR NOT v.is_demo));
END $$;
CREATE FUNCTION market_offer_page(part TEXT,variant_ref UUID,money CHAR(3),item_condition TEXT,item_variant TEXT,include_demo BOOLEAN,page_size INT,page_after JSONB) RETURNS JSONB LANGUAGE plpgsql STABLE SET search_path=labassist_student,pg_temp AS $$
DECLARE size INT:=page_size_limit(page_size);items JSONB;total INT;BEGIN
 SELECT COALESCE(jsonb_agg(to_jsonb(p)-'n' ORDER BY p.n) FILTER (WHERE p.n<=size),'[]'::jsonb),count(*) INTO items,total FROM (
  SELECT v.*,row_number() OVER (ORDER BY v.unit_price,v.id) n FROM market_public_offers v
  WHERE (part IS NULL OR v.catalog_key=part) AND (variant_ref IS NULL OR v.variant_id=variant_ref) AND v.currency=money
   AND (item_condition IS NULL OR v.condition=item_condition) AND (item_variant IS NULL OR v.variant=item_variant) AND (include_demo OR NOT v.is_demo)
   AND (page_after IS NULL OR (v.unit_price,v.id)>((page_after->>'price')::numeric,(page_after->>'id')::uuid))
  ORDER BY v.unit_price,v.id LIMIT size+1) p;
 RETURN jsonb_build_object('items',items,'next',CASE WHEN total>size THEN jsonb_build_object('price',items->(size-1)->'unit_price','id',items->(size-1)->'id') END);
END $$;
CREATE FUNCTION compare_part_offers_page(actor UUID,part TEXT,money CHAR(3),item_condition TEXT DEFAULT NULL,item_variant TEXT DEFAULT '',include_demo BOOLEAN DEFAULT false,page_size INT DEFAULT NULL,page_after JSONB DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql STABLE SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered reader required';END IF;
 RETURN market_offer_page(part,NULL,money,item_condition,COALESCE(item_variant,''),include_demo,page_size,page_after);END $$;
CREATE FUNCTION compare_variant_offers(actor UUID,variant_ref UUID,money CHAR(3),item_condition TEXT DEFAULT NULL,include_demo BOOLEAN DEFAULT false,page_size INT DEFAULT NULL,page_after JSONB DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql STABLE SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered reader required';END IF;
 IF NOT EXISTS(SELECT 1 FROM catalog_part_variants WHERE id=variant_ref) THEN RAISE EXCEPTION 'Part variant not found';END IF;
 IF NOT part_variant_exact(variant_ref) THEN RAISE EXCEPTION 'Variant identity is insufficient for exact comparison';END IF;
 RETURN market_offer_page(NULL,variant_ref,money,item_condition,NULL,include_demo,page_size,page_after);END $$;

-- Bounded catalog search; read_catalog stays for current callers.
CREATE INDEX catalog_part_name_order ON catalog_parts(name_en,key);
CREATE FUNCTION read_catalog_page(actor UUID,search TEXT DEFAULT '',page_size INT DEFAULT NULL,page_after JSONB DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql STABLE SET search_path=labassist_student,pg_temp AS $$
DECLARE size INT:=page_size_limit(page_size);term TEXT:=COALESCE(search,'');items JSONB;total INT;BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered reader required';END IF;
 SELECT COALESCE(jsonb_agg(to_jsonb(p)-'n' ORDER BY p.n) FILTER (WHERE p.n<=size),'[]'::jsonb),count(*) INTO items,total FROM (
  SELECT c.*,row_number() OVER (ORDER BY c.name_en,c.key) n FROM catalog_parts c
  WHERE c.active AND (strpos(lower(c.name_en),lower(term))>0 OR strpos(c.name_ar,term)>0 OR strpos(c.key,lower(term))>0)
   AND (page_after IS NULL OR (c.name_en,c.key)>(page_after->>'name',page_after->>'key'))
  ORDER BY c.name_en,c.key LIMIT size+1) p;
 RETURN jsonb_build_object('items',items,'next',CASE WHEN total>size THEN jsonb_build_object('name',items->(size-1)->>'name_en','key',items->(size-1)->>'key') END);
END $$;

-- Pin metadata with explicit status. No per-pin verification source exists, so values are UNVERIFIED and missing values UNKNOWN.
-- Definition-only fields are used only when the definition pin at the same index has the same name. Wiring safety is never evaluated.
CREATE FUNCTION pin_field(value JSONB) RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE WHEN value IS NULL OR value='null'::jsonb OR value='""'::jsonb OR value='"unknown"'::jsonb THEN jsonb_build_object('value',NULL,'status','UNKNOWN','source',NULL)
 ELSE jsonb_build_object('value',value,'status','UNVERIFIED','source',NULL) END
$$;
CREATE FUNCTION catalog_pin_page(actor UUID,part TEXT,page_size INT DEFAULT NULL,page_after INT DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql STABLE SET search_path=labassist_student,pg_temp AS $$
DECLARE size INT:=page_size_limit(page_size);m RECORD;items JSONB;total INT;BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered reader required';END IF;
 SELECT p.model_id,p.model_version,cm.definition INTO m FROM catalog_parts p JOIN catalog_models cm ON cm.id=p.model_id AND cm.version=p.model_version WHERE p.key=part AND p.active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Catalog part not found';END IF;
 SELECT COALESCE(jsonb_agg(x.item ORDER BY x.pin_index) FILTER (WHERE x.n<=size),'[]'::jsonb),count(*) INTO items,total FROM (
  SELECT q.pin_index,q.n,jsonb_build_object('pin_index',q.pin_index,'name',q.name,'kind',pin_field(to_jsonb(q.kind)),'direction',pin_field(to_jsonb(q.direction)),
   'connector',pin_field(to_jsonb(q.connector)),'voltage',pin_field(to_jsonb(q.voltage)),'physical_number',pin_field(to_jsonb(q.physical_number)),
   'functions',pin_field(to_jsonb(q.functions)),'label',pin_field(q.def->'label'),'max_current',pin_field(q.def->'maxCurrent'),
   'internal_net',pin_field(q.def->'internalNet'),'header_side',pin_field(q.def->'headerSide'),'header_row',pin_field(q.def->'headerRow')) item
  FROM (SELECT c.*,CASE WHEN m.definition->'pins'->c.pin_index->>'name'=c.name THEN m.definition->'pins'->c.pin_index END def,row_number() OVER (ORDER BY c.pin_index) n
   FROM catalog_pins c WHERE c.model_id=m.model_id AND c.model_version=m.model_version AND (page_after IS NULL OR c.pin_index>page_after) ORDER BY c.pin_index LIMIT size+1) q) x;
 RETURN jsonb_build_object('part',part,'model_id',m.model_id,'model_version',m.model_version,'wiring_safety','NOT_EVALUATED','items',items,
  'next',CASE WHEN total>size THEN items->(size-1)->'pin_index' END);
END $$;

REVOKE ALL ON catalog_part_variants,market_price_observations,market_public_offers FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;
