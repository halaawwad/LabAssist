-- Service-owned shop ingestion. No person is impersonated by an automated run.
BEGIN;
SET search_path=labassist_student,public;
CREATE FUNCTION price_pipeline() RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
 SELECT COALESCE(current_setting('labassist.price_pipeline',true),'')='on'
$$;
ALTER TABLE catalog_part_variants ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE shop_price_feeds ALTER COLUMN configured_by DROP NOT NULL;
ALTER TABLE market_offers ALTER COLUMN updated_by DROP NOT NULL;
ALTER TABLE market_offer_history ALTER COLUMN changed_by DROP NOT NULL;
ALTER TABLE resale_sources ADD COLUMN verification_method TEXT NOT NULL DEFAULT 'HUMAN'
 CHECK(verification_method IN ('HUMAN','AUTOMATED','OWNER_REPORTED'));
ALTER TABLE resale_sources ADD COLUMN verified_at TIMESTAMPTZ;
ALTER TABLE resale_sources ADD COLUMN submitted_by UUID REFERENCES accounts(id);
ALTER TABLE shop_price_mappings ADD COLUMN matching_method TEXT NOT NULL DEFAULT 'HUMAN'
 CHECK(matching_method IN ('HUMAN','AUTOMATED'));
ALTER TABLE shop_price_mappings ADD COLUMN matched_at TIMESTAMPTZ;
ALTER TABLE market_price_observations ADD COLUMN recording_method TEXT NOT NULL DEFAULT 'HUMAN'
 CHECK(recording_method IN ('HUMAN','AUTOMATED'));
-- Replace only actor/review CHECKs. Preserve all FKs, identity, stock and currency constraints.
DO $$ DECLARE r RECORD; BEGIN
 FOR r IN SELECT conrelid::regclass AS tbl,conname FROM pg_constraint
 WHERE connamespace='labassist_student'::regnamespace AND contype='c'
 AND ((conrelid='resale_sources'::regclass AND pg_get_constraintdef(oid) LIKE '%reviewed_by%')
 OR (conrelid='shop_price_mappings'::regclass AND pg_get_constraintdef(oid) LIKE '%reviewed_by%')
 OR (conrelid='market_price_observations'::regclass AND pg_get_constraintdef(oid) LIKE '%recorded_by%'))
 LOOP EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',r.tbl,r.conname);END LOOP;
END $$;
ALTER TABLE resale_sources ADD CONSTRAINT source_verification_identity CHECK(
 (verification_method='HUMAN' AND ((status='PENDING')=(reviewed_by IS NULL AND reviewed_at IS NULL))) OR
 (verification_method='AUTOMATED' AND kind='SHOP_PAGE' AND reviewed_by IS NULL AND reviewed_at IS NULL AND verified_at IS NOT NULL) OR
 (verification_method='OWNER_REPORTED' AND submitted_by IS NOT NULL AND reviewed_by IS NULL AND reviewed_at IS NULL AND verified_at IS NOT NULL));
ALTER TABLE shop_price_mappings ADD CONSTRAINT mapping_verification_identity CHECK(
 (matching_method='AUTOMATED' AND reviewed_by IS NULL AND reviewed_at IS NULL AND matched_at IS NOT NULL
  AND (status<>'APPROVED' OR (part_key IS NOT NULL AND variant_id IS NOT NULL))) OR
 (matching_method='HUMAN' AND ((status='PENDING' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR
 (status IN ('APPROVED','REJECTED') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
 AND (status<>'APPROVED' OR (part_key IS NOT NULL AND variant_id IS NOT NULL))))));
ALTER TABLE market_price_observations ADD CONSTRAINT price_recorder_identity CHECK(
 (recording_method='HUMAN' AND is_legacy=(recorded_by IS NULL)) OR
 (recording_method='AUTOMATED' AND recorded_by IS NULL AND NOT is_legacy));
CREATE OR REPLACE FUNCTION market_curator(actor UUID,seller UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM market_sellers s WHERE s.id=seller AND
 ((s.kind='SHOP' AND (data_manager(actor) OR (actor IS NULL AND price_pipeline()))) OR
 (s.kind='STUDENT' AND s.account_id=actor AND data_student(actor))))
$$;
-- Existing human audit records remain unchanged. Automatic writes have NULL human actors.
DO $$ DECLARE r RECORD;definition TEXT; BEGIN
 FOR r IN SELECT oid,proname FROM pg_proc WHERE pronamespace='labassist_student'::regnamespace
 AND proname IN ('catalog_variant_guard','create_part_variant','resale_source_guard','market_observation_guard','review_shop_price_mapping')
 LOOP
  definition=pg_get_functiondef(r.oid);
  IF r.proname='catalog_variant_guard' THEN
   definition=replace(definition,'NOT data_manager(NEW.created_by)','NOT (data_manager(NEW.created_by) OR (NEW.created_by IS NULL AND price_pipeline()))');
  ELSIF r.proname='create_part_variant' THEN
   definition=replace(definition,'NOT data_manager(actor)','NOT (data_manager(actor) OR (actor IS NULL AND price_pipeline()))');
  ELSIF r.proname='resale_source_guard' THEN
   definition=replace(definition,'IF TG_OP=''INSERT'' THEN', 'IF TG_OP=''INSERT'' THEN IF NEW.verification_method=''OWNER_REPORTED'' THEN IF NEW.status<>''APPROVED'' OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM market_sellers WHERE id=NEW.seller_id AND kind=''STUDENT'' AND account_id=NEW.submitted_by AND data_student(NEW.submitted_by)) THEN RAISE EXCEPTION ''Source owner required''; END IF; NEW.verified_at=clock_timestamp(); RETURN NEW; END IF; IF NEW.verification_method=''AUTOMATED'' THEN IF NOT price_pipeline() OR NEW.kind<>''SHOP_PAGE'' OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM market_sellers WHERE id=NEW.seller_id AND kind=''SHOP'') THEN RAISE EXCEPTION ''Service-owned shop source required''; END IF; NEW.verified_at=clock_timestamp(); RETURN NEW; END IF;');
   definition=replace(definition,'IF ROW(NEW.id,NEW.seller_id,NEW.kind,NEW.url,NEW.file_id,NEW.observed_at,NEW.content_hash)', 'IF ROW(NEW.verification_method,NEW.verified_at,NEW.submitted_by) IS DISTINCT FROM ROW(OLD.verification_method,OLD.verified_at,OLD.submitted_by) THEN RAISE EXCEPTION ''Source verification evidence is immutable''; END IF; IF ROW(NEW.id,NEW.seller_id,NEW.kind,NEW.url,NEW.file_id,NEW.observed_at,NEW.content_hash)');
  ELSIF r.proname='market_observation_guard' THEN
   definition=replace(definition,'IF NEW.is_legacy THEN', 'IF NEW.recorded_by IS NULL AND price_pipeline() AND EXISTS(SELECT 1 FROM market_sellers WHERE id=NEW.seller_id AND kind=''SHOP'') THEN NEW.recording_method=''AUTOMATED''; END IF; IF NEW.is_legacy THEN');
  ELSIF r.proname='review_shop_price_mapping' THEN
   definition=replace(definition,'NOT data_manager(actor)','NOT (actor IS NULL AND price_pipeline())');
   definition=replace(definition,'reviewed_by=actor,reviewed_at=clock_timestamp()', 'matching_method=''AUTOMATED'',matched_at=clock_timestamp(),reviewed_by=NULL,reviewed_at=NULL');
  END IF;
  EXECUTE definition;
 END LOOP;
END $$;
COMMENT ON COLUMN resale_sources.status IS 'Legacy APPROVED label means usable evidence. verification_method distinguishes automatic validation from historical human review.';
COMMENT ON COLUMN shop_price_mappings.status IS 'Legacy APPROVED label means exact match. matching_method records automated matching; no manager approval is required.';
COMMIT;
