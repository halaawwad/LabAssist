SET search_path=labassist_student,public;
ALTER TABLE market_offers ALTER COLUMN quantity DROP NOT NULL;
ALTER TABLE market_offers ADD COLUMN stock_availability TEXT CHECK(stock_availability IN ('IN_STOCK','OUT_OF_STOCK','ON_DEMAND','COMING_SOON','UNKNOWN'));
ALTER TABLE market_offers ADD COLUMN stock_checked_at TIMESTAMPTZ;
ALTER TABLE shop_price_outcomes ADD COLUMN stock_evidence_verified BOOLEAN NOT NULL DEFAULT false;
-- Older shop counts have no retained type evidence; the public view masks them.
CREATE OR REPLACE FUNCTION market_offer_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE obs_revision INT;obs_status TEXT;last_open INT;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Offer history cannot be deleted';END IF;
 IF NOT market_curator(NEW.updated_by,NEW.seller_id) THEN RAISE EXCEPTION 'Seller or manager curator required';END IF;
 IF NEW.quantity IS NULL AND (SELECT kind FROM market_sellers WHERE id=NEW.seller_id) <> 'SHOP' THEN RAISE EXCEPTION 'Student offer requires quantity'; END IF;
 IF NEW.status='ACTIVE' AND (SELECT kind FROM market_sellers WHERE id=NEW.seller_id) <> 'SHOP' AND NEW.quantity<=0 THEN RAISE EXCEPTION 'Active offer requires available quantity; choose an explicit closing status';END IF;
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
CREATE FUNCTION update_shop_stock(actor UUID, offer UUID, expected INT, available INT, availability TEXT, checked TIMESTAMPTZ) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE value INT; BEGIN
 SELECT o.revision INTO value FROM market_offers o JOIN market_sellers s ON s.id=o.seller_id WHERE o.id=offer AND s.kind='SHOP' FOR UPDATE OF o;
 IF NOT FOUND THEN RAISE EXCEPTION 'Shop offer not found'; END IF;
 PERFORM data_revision(value,expected);
 UPDATE market_offers SET quantity=available,stock_availability=availability,stock_checked_at=checked,status=CASE WHEN status IN ('DRAFT','EXPIRED') THEN 'ACTIVE' ELSE status END,updated_by=actor WHERE id=offer RETURNING revision INTO value;
 RETURN value;
END $$;
REVOKE ALL ON FUNCTION update_shop_stock(UUID,UUID,INT,INT,TEXT,TIMESTAMPTZ) FROM PUBLIC;
CREATE OR REPLACE VIEW market_public_offers AS
SELECT o.id,o.seller_id,o.catalog_key,o.variant_id,o.part_name,o.variant,o.condition,c.unit_price,o.currency,CASE WHEN s.kind='SHOP' AND o.stock_checked_at IS NULL THEN NULL ELSE o.quantity END AS quantity,c.shipping_cost,o.valid_until,
 s.name AS seller,s.city,s.latitude,s.longitude,s.phone,s.website,s.kind AS seller_kind,s.is_demo,
 c.id AS observation_id,c.source_id AS price_source_id,r.url AS source_url,r.observed_at,r.reviewed_at,c.observed_at AS price_observed_at,c.is_legacy AS price_observation_legacy,
 v.manufacturer,v.model_number,v.package_or_revision,(v.id IS NOT NULL AND part_variant_exact(v.id)) AS identity_exact,
 CASE WHEN s.kind='SHOP' THEN CASE WHEN o.stock_checked_at IS NULL THEN 'UNKNOWN' ELSE COALESCE(o.stock_availability,'UNKNOWN') END ELSE NULL END AS stock_availability,
 CASE WHEN s.kind='SHOP' THEN o.stock_checked_at ELSE NULL END AS stock_checked_at
FROM market_offers o JOIN market_sellers s ON s.id=o.seller_id
JOIN LATERAL (SELECT p.* FROM market_price_observations p JOIN resale_sources ps ON ps.id=p.source_id WHERE p.offer_id=o.id AND ps.status IN ('APPROVED','REVOKED') ORDER BY p.offer_revision DESC LIMIT 1) c ON true
JOIN resale_sources r ON r.id=c.source_id AND r.status='APPROVED'
LEFT JOIN catalog_part_variants v ON v.id=o.variant_id
WHERE (o.status='ACTIVE' OR (s.kind='SHOP' AND o.stock_checked_at IS NULL AND o.status IN ('DRAFT','EXPIRED') AND EXISTS (SELECT 1 FROM shop_price_mappings m WHERE m.offer_id=o.id))) AND (s.kind='SHOP' OR o.quantity>0) AND (o.valid_until IS NULL OR o.valid_until>=clock_timestamp());

