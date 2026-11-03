BEGIN;
SET search_path=labassist_student,public;
CREATE TABLE market_sellers (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,kind TEXT NOT NULL CHECK(kind IN ('SHOP','STUDENT')),
 account_id UUID REFERENCES accounts(id),name TEXT NOT NULL CHECK(length(btrim(name))>0),city TEXT NOT NULL,
 latitude NUMERIC(9,6) CHECK(latitude BETWEEN -90 AND 90),longitude NUMERIC(9,6) CHECK(longitude BETWEEN -180 AND 180),
 phone TEXT,website TEXT CHECK(website IS NULL OR website ~ '^https?://'),is_demo BOOLEAN NOT NULL DEFAULT false,
 CHECK((latitude IS NULL)=(longitude IS NULL)),CHECK(kind='STUDENT' OR account_id IS NULL)
);
CREATE TABLE resale_sources (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,seller_id UUID NOT NULL REFERENCES market_sellers(id),
 kind TEXT NOT NULL CHECK(kind IN ('FACEBOOK','SPREADSHEET','SHOP_PAGE','MANUAL')),url TEXT CHECK(url IS NULL OR url ~ '^https?://'),
 file_id UUID REFERENCES files(id),observed_at TIMESTAMPTZ NOT NULL,content_hash CHAR(64) CHECK(content_hash ~ '^[0-9a-f]{64}$'),
 status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),reviewed_by UUID REFERENCES accounts(id),reviewed_at TIMESTAMPTZ,
 CHECK((status='PENDING')=(reviewed_by IS NULL AND reviewed_at IS NULL)),UNIQUE(id,seller_id)
);
CREATE TABLE market_offers (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,seller_id UUID NOT NULL REFERENCES market_sellers(id),source_id UUID NOT NULL,
 catalog_key TEXT REFERENCES catalog_parts(key),part_name TEXT NOT NULL,variant TEXT NOT NULL DEFAULT '',condition TEXT NOT NULL CHECK(condition IN ('NEW','USED')),
 unit_price NUMERIC(14,2) NOT NULL CHECK(unit_price>=0 AND unit_price<>'NaN'::numeric),currency CHAR(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 quantity INT NOT NULL CHECK(quantity>=0),shipping_cost NUMERIC(14,2) CHECK(shipping_cost>=0 AND shipping_cost<>'NaN'::numeric),
 valid_until TIMESTAMPTZ,status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('DRAFT','ACTIVE','SOLD','EXPIRED','WITHDRAWN')),
 updated_by UUID NOT NULL REFERENCES accounts(id),revision INT NOT NULL DEFAULT 0,updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(source_id,seller_id) REFERENCES resale_sources(id,seller_id)
);
CREATE TABLE market_offer_history (
 offer_id UUID NOT NULL REFERENCES market_offers(id),revision INT NOT NULL,snapshot JSONB NOT NULL,
 changed_by UUID NOT NULL REFERENCES accounts(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(offer_id,revision)
);
CREATE TABLE market_bookmarks(student_id UUID NOT NULL REFERENCES accounts(id),offer_id UUID NOT NULL REFERENCES market_offers(id),PRIMARY KEY(student_id,offer_id));
CREATE TRIGGER market_history_immutable BEFORE UPDATE OR DELETE ON market_offer_history FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE INDEX market_comparison ON market_offers(catalog_key,currency,condition,unit_price) WHERE status='ACTIVE';
CREATE FUNCTION resale_source_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Source provenance cannot be deleted';END IF;
 IF NEW.status<>'PENDING' AND (NOT data_manager(NEW.reviewed_by) OR NEW.reviewed_at IS NULL) THEN RAISE EXCEPTION 'Manager source review required';END IF;
 IF NEW.file_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM files WHERE id=NEW.file_id AND status='READY' AND sha256 IS NOT NULL) THEN RAISE EXCEPTION 'Source sheet must be a ready hashed file';END IF;
 IF TG_OP='UPDATE' AND ROW(NEW.id,NEW.seller_id,NEW.kind,NEW.url,NEW.file_id,NEW.observed_at,NEW.content_hash) IS DISTINCT FROM ROW(OLD.id,OLD.seller_id,OLD.kind,OLD.url,OLD.file_id,OLD.observed_at,OLD.content_hash) THEN RAISE EXCEPTION 'Source evidence is immutable';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER source_scope BEFORE INSERT OR UPDATE OR DELETE ON resale_sources FOR EACH ROW EXECUTE FUNCTION resale_source_guard();
CREATE FUNCTION market_offer_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Offer history cannot be deleted';END IF;
 IF NOT(data_manager(NEW.updated_by) OR data_student(NEW.updated_by) AND EXISTS(SELECT 1 FROM market_sellers WHERE id=NEW.seller_id AND account_id=NEW.updated_by)) THEN RAISE EXCEPTION 'Seller or manager curator required';END IF;
 IF NEW.status='ACTIVE' AND NOT EXISTS(SELECT 1 FROM resale_sources WHERE id=NEW.source_id AND seller_id=NEW.seller_id AND status='APPROVED') THEN RAISE EXCEPTION 'Active offer requires reviewed source';END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.seller_id,NEW.source_id,NEW.catalog_key,NEW.variant,NEW.condition,NEW.currency) IS DISTINCT FROM ROW(OLD.id,OLD.seller_id,OLD.source_id,OLD.catalog_key,OLD.variant,OLD.condition,OLD.currency) THEN RAISE EXCEPTION 'Offer comparison identity is immutable';END IF;
  NEW.revision=OLD.revision+1;
 END IF;NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER offer_scope BEFORE INSERT OR UPDATE OR DELETE ON market_offers FOR EACH ROW EXECUTE FUNCTION market_offer_guard();
CREATE FUNCTION market_history_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN INSERT INTO market_offer_history VALUES(NEW.id,NEW.revision,to_jsonb(NEW),NEW.updated_by,clock_timestamp());RETURN NEW;END $$;
CREATE TRIGGER offer_history AFTER INSERT OR UPDATE ON market_offers FOR EACH ROW EXECUTE FUNCTION market_history_trigger();
CREATE FUNCTION update_market_offer(actor UUID,offer UUID,expected INT,price NUMERIC,available INT,new_status TEXT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT;BEGIN SELECT revision INTO value FROM market_offers WHERE id=offer FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found';END IF;PERFORM data_revision(value,expected);
 UPDATE market_offers SET unit_price=price,quantity=available,status=new_status,updated_by=actor WHERE id=offer RETURNING revision INTO value;RETURN value;END $$;
CREATE FUNCTION bookmark_market_offer(actor UUID,offer UUID,save BOOLEAN) RETURNS VOID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT data_student(actor) THEN RAISE EXCEPTION 'Student required';END IF;
 IF save THEN INSERT INTO market_bookmarks VALUES(actor,offer) ON CONFLICT DO NOTHING;ELSE DELETE FROM market_bookmarks WHERE student_id=actor AND offer_id=offer;END IF;END $$;
CREATE FUNCTION compare_part_offers(actor UUID,part TEXT,money CHAR(3),item_condition TEXT DEFAULT NULL,item_variant TEXT DEFAULT '',include_demo BOOLEAN DEFAULT false) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered reader required';END IF;
 RETURN (SELECT COALESCE(jsonb_agg(x ORDER BY unit_price,id),'[]') FROM (
  SELECT o.id,o.part_name,o.variant,o.condition,o.unit_price,o.currency,o.quantity,o.shipping_cost,s.name AS seller,s.city,s.latitude,s.longitude,s.phone,s.website,s.kind AS seller_kind,s.is_demo,r.url AS source_url,r.observed_at,r.reviewed_at
  FROM market_offers o JOIN market_sellers s ON s.id=o.seller_id JOIN resale_sources r ON r.id=o.source_id
  WHERE o.catalog_key=part AND o.currency=money AND o.variant=item_variant AND (item_condition IS NULL OR o.condition=item_condition)
   AND o.status='ACTIVE' AND r.status='APPROVED' AND o.quantity>0 AND (o.valid_until IS NULL OR o.valid_until>=clock_timestamp()) AND (include_demo OR NOT s.is_demo)
 ) x);
END $$;
ALTER TABLE project_expenses ADD COLUMN market_seller_id UUID REFERENCES market_sellers(id);
ALTER TABLE project_expense_lines ADD COLUMN market_offer_id UUID REFERENCES market_offers(id);
REVOKE ALL ON market_sellers,resale_sources,market_offers,market_offer_history,market_bookmarks FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;
