-- Acceptance for backend/api/prisma/migrations/20261124000100_market_price_integrity.
-- Run on a disposable demo database: stages.json "demo" files, then the Prisma migrations in order, then this file.
BEGIN;SET search_path=labassist_student,public;
\ir ../../remaining-data/tests/helpers.sql

-- Existing records are preserved without invented dates, identity or verification.
SELECT pg_temp.ok('every existing offer keeps its price as one legacy observation without date or recorder',(SELECT count(*)=(SELECT count(*) FROM market_offers) AND count(*)>0 AND bool_and(p.is_legacy AND p.observed_at IS NULL AND p.recorded_by IS NULL AND p.unit_price=o.unit_price AND p.source_id=o.source_id AND p.offer_revision=o.revision) FROM market_price_observations p JOIN market_offers o ON o.id=p.offer_id));
SELECT pg_temp.ok('no part identity, offer link, revocation or verification is invented',NOT EXISTS(SELECT 1 FROM catalog_part_variants) AND NOT EXISTS(SELECT 1 FROM market_offers WHERE variant_id IS NOT NULL) AND NOT EXISTS(SELECT 1 FROM resale_sources WHERE status='REVOKED') AND NOT EXISTS(SELECT 1 FROM catalog_documents WHERE source_verified_at IS NOT NULL) AND (SELECT bool_and(exact_identity_fields=ARRAY['MANUFACTURER','MODEL','PACKAGE_OR_REVISION']) FROM catalog_parts));
SELECT pg_temp.ok('legacy demo comparison is unchanged and flags unknown observation dates',(SELECT jsonb_array_length(c)=3 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c) e WHERE NOT (e->>'price_observation_legacy')::boolean OR e->'price_observed_at'<>'null'::jsonb OR (e->>'identity_exact')::boolean) FROM (SELECT compare_part_offers(owner,'arduino_uno','ILS',NULL,'',true) c FROM f) x));

-- Fixtures: a student seller owned by the TEAM01 owner, with approved, pending and later sources.
INSERT INTO ids SELECT 'shop_offer',id FROM market_offers WHERE seed_key='DEMO_OFFER_1_arduino_uno';
WITH s AS (INSERT INTO market_sellers(kind,account_id,name,city) SELECT 'STUDENT',owner,'Owner sheet','Nablus' FROM f RETURNING id) INSERT INTO ids SELECT 'seller',id FROM s;
WITH r AS (INSERT INTO resale_sources(seller_id,kind,observed_at,status,reviewed_by,reviewed_at) SELECT (SELECT id FROM ids WHERE key='seller'),'SPREADSHEET',now()-interval '3 days','APPROVED',manager,now() FROM f RETURNING id) INSERT INTO ids SELECT 'src_old',id FROM r;
WITH r AS (INSERT INTO resale_sources(seller_id,kind,observed_at,status,reviewed_by,reviewed_at) SELECT (SELECT id FROM ids WHERE key='seller'),'MANUAL',now()-interval '1 hour','APPROVED',manager,now() FROM f RETURNING id) INSERT INTO ids SELECT 'src_new',id FROM r;
WITH r AS (INSERT INTO resale_sources(seller_id,kind,observed_at,status,reviewed_by,reviewed_at) SELECT (SELECT id FROM ids WHERE key='seller'),'MANUAL',now()-interval '10 minutes','APPROVED',manager,now() FROM f RETURNING id) INSERT INTO ids SELECT 'src_fresh',id FROM r;
WITH r AS (INSERT INTO resale_sources(seller_id,kind,observed_at) SELECT id,'MANUAL',now()-interval '30 minutes' FROM ids WHERE key='seller' RETURNING id) INSERT INTO ids SELECT 'src_pending',id FROM r;
WITH o AS (INSERT INTO market_offers(seller_id,source_id,catalog_key,part_name,condition,unit_price,currency,quantity,status,updated_by) SELECT (SELECT id FROM ids WHERE key='seller'),(SELECT id FROM ids WHERE key='src_old'),'arduino_uno','Arduino Uno','USED',20,'ILS',1,'ACTIVE',owner FROM f RETURNING id) INSERT INTO ids SELECT 'offer',id FROM o;
SELECT pg_temp.ok('a new offer records its first price at its source evidence date',(SELECT count(*)=1 AND bool_and(NOT is_legacy AND observed_at=now()-interval '3 days' AND recorded_by=(SELECT owner FROM f)) FROM market_price_observations WHERE offer_id=(SELECT id FROM ids WHERE key='offer')));

-- Ownership: managers keep shop offers; student offers belong to their student owner only.
SELECT pg_temp.reject('a workshop manager cannot edit a student offer',$q$SELECT update_market_offer(manager,(SELECT id FROM ids WHERE key='offer'),0,20,1,'WITHDRAWN') FROM f$q$,'curator');
SELECT pg_temp.reject('a teammate cannot edit another student offer',$q$SELECT update_market_offer(teammate,(SELECT id FROM ids WHERE key='offer'),0,20,1,'WITHDRAWN') FROM f$q$,'curator');
SELECT pg_temp.reject('a student cannot record a shop price',$q$SELECT record_market_price(owner,(SELECT id FROM ids WHERE key='shop_offer'),0,(SELECT id FROM resale_sources WHERE seed_key='DEMO_SOURCE_1'),9,NULL,'ILS',now()) FROM f$q$,'curator');
SELECT pg_temp.ok('workshop managers still maintain shop offers',(SELECT update_market_offer(manager,(SELECT id FROM ids WHERE key='shop_offer'),0,13,1,'ACTIVE')=1 FROM f));

-- Price observations.
SELECT pg_temp.reject('a changed price cannot inherit the previous observation',$q$SELECT update_market_offer(owner,(SELECT id FROM ids WHERE key='offer'),0,18,1,'ACTIVE') FROM f$q$,'new observation');
SELECT pg_temp.reject('observations must be newer than the previous observation',$q$SELECT record_market_price(owner,(SELECT id FROM ids WHERE key='offer'),0,(SELECT id FROM ids WHERE key='src_new'),18,NULL,'ILS',now()-interval '4 days') FROM f$q$,'newer');
SELECT pg_temp.reject('observation currency must match the offer',$q$SELECT record_market_price(owner,(SELECT id FROM ids WHERE key='offer'),0,(SELECT id FROM ids WHERE key='src_new'),18,NULL,'USD',now()-interval '1 hour') FROM f$q$,'currency');
SELECT pg_temp.reject('negative observed prices are rejected',$q$SELECT record_market_price(owner,(SELECT id FROM ids WHERE key='offer'),0,(SELECT id FROM ids WHERE key='src_new'),-1,NULL,'ILS',now()-interval '1 hour') FROM f$q$,'check constraint');
SELECT pg_temp.reject('observation dates cannot be in the future',$q$SELECT record_market_price(owner,(SELECT id FROM ids WHERE key='offer'),0,(SELECT id FROM ids WHERE key='src_new'),18,NULL,'ILS',now()+interval '1 day') FROM f$q$,'future');
SELECT pg_temp.ok('a new price carries its own source, currency and date',(SELECT record_market_price(owner,(SELECT id FROM ids WHERE key='offer'),0,(SELECT id FROM ids WHERE key='src_new'),18,NULL,'ILS',now()-interval '1 hour')=1 FROM f));
SELECT pg_temp.ok('public comparison shows the newest approved price with its own date',(SELECT jsonb_array_length(c)=1 AND c->0->>'unit_price'='18.00' AND (c->0->>'price_observed_at')::timestamptz=now()-interval '1 hour' AND c->0->>'price_source_id'=(SELECT id::text FROM ids WHERE key='src_new') FROM (SELECT compare_part_offers(owner,'arduino_uno','ILS') c FROM f) x));
SELECT pg_temp.ok('a pending observation is recorded',(SELECT record_market_price(owner,(SELECT id FROM ids WHERE key='offer'),1,(SELECT id FROM ids WHERE key='src_pending'),15,NULL,'ILS',now()-interval '30 minutes')=2 FROM f));
SELECT pg_temp.ok('a pending observation does not replace the public price',(SELECT compare_part_offers(owner,'arduino_uno','ILS')->0->>'unit_price'='18.00' FROM f));
SELECT bookmark_market_offer(teammate,(SELECT id FROM ids WHERE key='offer'),true) FROM f;

-- Revoking source approval.
SELECT pg_temp.reject('only managers revoke source approval',$q$SELECT revoke_resale_source(owner,(SELECT id FROM ids WHERE key='src_new'),'Edited') FROM f$q$,'review required');
SELECT pg_temp.reject('revocation needs a reason',$q$SELECT revoke_resale_source(manager,(SELECT id FROM ids WHERE key='src_new'),'  ') FROM f$q$,'reason');
SELECT pg_temp.reject('pending sources cannot be revoked',$q$SELECT revoke_resale_source(manager,(SELECT id FROM ids WHERE key='src_pending'),'Edited') FROM f$q$,'only an approved');
SELECT revoke_resale_source(manager,(SELECT id FROM ids WHERE key='src_new'),'Sheet was edited after review') FROM f;
SELECT pg_temp.ok('revocation records actor, time and reason and keeps the original approval',(SELECT status='REVOKED' AND revoked_by=(SELECT manager FROM f) AND revoked_at IS NOT NULL AND revocation_reason='Sheet was edited after review' AND reviewed_by=(SELECT manager FROM f) AND reviewed_at IS NOT NULL FROM resale_sources WHERE id=(SELECT id FROM ids WHERE key='src_new')));
SELECT pg_temp.ok('the affected offer leaves public comparison without falling back to an older price',(SELECT compare_part_offers(owner,'arduino_uno','ILS')='[]'::jsonb FROM f));
SELECT pg_temp.ok('evidence, observations, history, bookmarks and status are preserved',(SELECT count(*)=3 FROM market_price_observations WHERE offer_id=(SELECT id FROM ids WHERE key='offer')) AND (SELECT count(*)=3 FROM market_offer_history WHERE offer_id=(SELECT id FROM ids WHERE key='offer')) AND EXISTS(SELECT 1 FROM market_bookmarks b JOIN f ON b.student_id=f.teammate WHERE b.offer_id=(SELECT id FROM ids WHERE key='offer')) AND (SELECT status='ACTIVE' FROM market_offers WHERE id=(SELECT id FROM ids WHERE key='offer')) AND (SELECT url IS NULL AND observed_at=now()-interval '1 hour' FROM resale_sources WHERE id=(SELECT id FROM ids WHERE key='src_new')));
SELECT pg_temp.reject('a revoked source cannot be approved again',$q$UPDATE resale_sources SET status='APPROVED' WHERE id=(SELECT id FROM ids WHERE key='src_new')$q$,'transition');
SELECT pg_temp.reject('an approval can no longer be overwritten by rejection',$q$UPDATE resale_sources SET status='REJECTED' WHERE seed_key='DEMO_SOURCE_1'$q$,'transition');
SELECT pg_temp.reject('the revocation record is immutable',$q$UPDATE resale_sources SET revocation_reason='Other' WHERE id=(SELECT id FROM ids WHERE key='src_new')$q$,'immutable');
SELECT pg_temp.reject('observations cannot use a revoked source',$q$SELECT record_market_price(owner,(SELECT id FROM ids WHERE key='offer'),2,(SELECT id FROM ids WHERE key='src_new'),14,NULL,'ILS',now()-interval '5 minutes') FROM f$q$,'rejected or revoked');
SELECT pg_temp.reject('recorded observations are immutable',$q$UPDATE market_price_observations SET unit_price=1$q$,'immutable');

-- Status transitions; zero quantity requires an explicit closing status.
SELECT pg_temp.reject('zero quantity never keeps an offer active or implies sold',$q$SELECT update_market_offer(owner,(SELECT id FROM ids WHERE key='offer'),2,15,0,'ACTIVE') FROM f$q$,'explicit closing status');
SELECT pg_temp.reject('active offers cannot return to draft',$q$SELECT update_market_offer(owner,(SELECT id FROM ids WHERE key='offer'),2,15,1,'DRAFT') FROM f$q$,'transition not allowed');
SELECT pg_temp.ok('an explicit closing status is accepted with zero quantity',(SELECT update_market_offer(owner,(SELECT id FROM ids WHERE key='offer'),2,15,0,'SOLD')=3 FROM f));
SELECT pg_temp.reject('sold offers are closed',$q$SELECT update_market_offer(owner,(SELECT id FROM ids WHERE key='offer'),3,15,1,'ACTIVE') FROM f$q$,'closed');
SELECT pg_temp.reject('new offers cannot start closed',$q$INSERT INTO market_offers(seller_id,source_id,catalog_key,part_name,condition,unit_price,currency,quantity,status,updated_by) SELECT (SELECT id FROM ids WHERE key='seller'),(SELECT id FROM ids WHERE key='src_old'),'hc_sr04','HC-SR04','USED',5,'ILS',1,'SOLD',owner FROM f$q$,'start as draft or active');
WITH o AS (INSERT INTO market_offers(seller_id,source_id,catalog_key,part_name,condition,unit_price,currency,quantity,status,updated_by) SELECT (SELECT id FROM ids WHERE key='seller'),(SELECT id FROM ids WHERE key='src_old'),'hc_sr04','HC-SR04','USED',30,'ILS',1,'DRAFT',owner FROM f RETURNING id) INSERT INTO ids SELECT 'draft',id FROM o;
SELECT pg_temp.reject('drafts cannot be marked sold',$q$SELECT update_market_offer(owner,(SELECT id FROM ids WHERE key='draft'),0,30,1,'SOLD') FROM f$q$,'transition not allowed');
SELECT pg_temp.ok('a draft with an approved observation can be published',(SELECT update_market_offer(owner,(SELECT id FROM ids WHERE key='draft'),0,30,1,'ACTIVE')=1 FROM f));
SELECT pg_temp.ok('an active offer can expire',(SELECT update_market_offer(owner,(SELECT id FROM ids WHERE key='draft'),1,30,1,'EXPIRED')=2 FROM f));
SELECT pg_temp.reject('reactivation requires a new observation',$q$SELECT update_market_offer(owner,(SELECT id FROM ids WHERE key='draft'),2,30,1,'ACTIVE') FROM f$q$,'new price observation');
SELECT pg_temp.ok('a fresh approved observation is recorded while expired',(SELECT record_market_price(owner,(SELECT id FROM ids WHERE key='draft'),2,(SELECT id FROM ids WHERE key='src_fresh'),31,NULL,'ILS',now()-interval '5 minutes',now()+interval '7 days')=3 FROM f));
SELECT pg_temp.ok('the expired offer can then be reactivated',(SELECT update_market_offer(owner,(SELECT id FROM ids WHERE key='draft'),3,31,1,'ACTIVE')=4 FROM f));

-- Exact catalog identity.
SELECT pg_temp.reject('students cannot define catalog identity',$q$SELECT create_part_variant(owner,'arduino_uno','Arduino','A000066','Rev3') FROM f$q$,'curator required');
INSERT INTO ids SELECT 'v_exact',create_part_variant(manager,'arduino_uno','Arduino','A000066','Rev3','https://docs.arduino.cc/hardware/uno-rev3/') FROM f;
INSERT INTO ids SELECT 'v_partial',create_part_variant(manager,'arduino_uno','Arduino',NULL,NULL) FROM f;
INSERT INTO ids SELECT 'v_sensor',create_part_variant(manager,'hc_sr04','Generic',NULL,NULL) FROM f;
SELECT pg_temp.reject('identity is unique regardless of letter case',$q$SELECT create_part_variant(manager,'arduino_uno','arduino','a000066','rev3') FROM f$q$,'duplicate');
SELECT pg_temp.reject('catalog identity is immutable',$q$UPDATE catalog_part_variants SET manufacturer='Other'$q$,'immutable');
SELECT pg_temp.reject('insufficient identity is never compared as exact',$q$SELECT compare_variant_offers(owner,(SELECT id FROM ids WHERE key='v_partial'),'ILS') FROM f$q$,'insufficient');
WITH o AS (INSERT INTO market_offers(seller_id,source_id,catalog_key,part_name,condition,unit_price,currency,quantity,status,updated_by) SELECT (SELECT id FROM ids WHERE key='seller'),(SELECT id FROM ids WHERE key='src_old'),'arduino_uno','Arduino Uno R3','NEW',22,'ILS',1,'ACTIVE',owner FROM f RETURNING id) INSERT INTO ids SELECT 'exact_offer',id FROM o;
SELECT pg_temp.reject('an offer cannot reference another part identity',$q$SELECT set_offer_variant(owner,(SELECT id FROM ids WHERE key='exact_offer'),0,(SELECT id FROM ids WHERE key='v_sensor')) FROM f$q$,'foreign key');
SELECT pg_temp.reject('a manager cannot link identity on a student offer',$q$SELECT set_offer_variant(manager,(SELECT id FROM ids WHERE key='exact_offer'),0,(SELECT id FROM ids WHERE key='v_exact')) FROM f$q$,'curator');
SELECT pg_temp.ok('the owner links an offer to catalog identity',(SELECT set_offer_variant(owner,(SELECT id FROM ids WHERE key='exact_offer'),0,(SELECT id FROM ids WHERE key='v_exact'))=1 FROM f));
SELECT pg_temp.reject('linked identity cannot be replaced',$q$SELECT set_offer_variant(owner,(SELECT id FROM ids WHERE key='exact_offer'),1,(SELECT id FROM ids WHERE key='v_partial')) FROM f$q$,'immutable');
SELECT pg_temp.ok('exact comparison returns only offers with sufficient matching identity',(SELECT jsonb_array_length(c->'items')=1 AND c->'items'->0->>'id'=(SELECT id::text FROM ids WHERE key='exact_offer') AND (c->'items'->0->>'identity_exact')::boolean AND c->'next'='null'::jsonb FROM (SELECT compare_variant_offers(owner,(SELECT id FROM ids WHERE key='v_exact'),'ILS') c FROM f) x));
SELECT pg_temp.ok('part comparison marks unlinked offers as not exact',(SELECT bool_and(NOT (e->>'identity_exact')::boolean) FROM f CROSS JOIN LATERAL jsonb_array_elements(compare_part_offers(f.owner,'arduino_uno','ILS',NULL,'',true)) e WHERE e->>'id'<>(SELECT id::text FROM ids WHERE key='exact_offer')));
SELECT pg_temp.reject('unknown identity field names are rejected',$q$SELECT set_part_identity_fields(manager,'arduino_uno',(SELECT revision FROM catalog_parts WHERE key='arduino_uno'),ARRAY['COLOUR']) FROM f$q$,'check constraint');
SELECT pg_temp.ok('managers declare which identity fields are relevant',(SELECT set_part_identity_fields(manager,'arduino_uno',(SELECT revision FROM catalog_parts WHERE key='arduino_uno'),ARRAY['MANUFACTURER'])>0 FROM f));
SELECT pg_temp.ok('a variant is exact once its relevant fields are known',(SELECT jsonb_typeof(compare_variant_offers(owner,(SELECT id FROM ids WHERE key='v_partial'),'ILS')->'items')='array' FROM f));

-- Bounded pagination with explicit continuation.
SELECT pg_temp.reject('pages above 100 are rejected',$q$SELECT read_catalog_page(owner,'',101) FROM f$q$,'between 1 and 100');
SELECT pg_temp.reject('empty pages are rejected',$q$SELECT compare_part_offers_page(owner,'arduino_uno','ILS',NULL,'',true,0) FROM f$q$,'between 1 and 100');
SELECT pg_temp.ok('catalog pages default to 50',(SELECT jsonb_array_length(p->'items')=LEAST(50,(SELECT count(*) FROM catalog_parts WHERE active))::int AND (p->'next'='null'::jsonb)=((SELECT count(*) FROM catalog_parts WHERE active)<=50) FROM (SELECT read_catalog_page(owner) p FROM f) x));
CREATE TEMP TABLE catalog_walk AS WITH RECURSIVE walk(n,page) AS (SELECT 1,read_catalog_page((SELECT owner FROM f),'',20) UNION ALL SELECT n+1,read_catalog_page((SELECT owner FROM f),'',20,page->'next') FROM walk WHERE page->'next'<>'null'::jsonb AND n<20) SELECT * FROM walk;
SELECT pg_temp.ok('catalog continuation visits every active part exactly once',(SELECT count(*)=(SELECT count(*) FROM catalog_parts WHERE active) AND count(DISTINCT e->>'key')=count(*) FROM catalog_walk CROSS JOIN LATERAL jsonb_array_elements(page->'items') e) AND (SELECT max(n)>1 FROM catalog_walk));
CREATE TEMP TABLE offer_walk AS WITH RECURSIVE walk(n,page) AS (SELECT 1,compare_part_offers_page((SELECT owner FROM f),'arduino_uno','ILS',NULL,'',true,1) UNION ALL SELECT n+1,compare_part_offers_page((SELECT owner FROM f),'arduino_uno','ILS',NULL,'',true,1,page->'next') FROM walk WHERE page->'next'<>'null'::jsonb AND n<50) SELECT * FROM walk;
SELECT pg_temp.ok('offer pages continue in price order and match the full comparison',(SELECT jsonb_agg(e ORDER BY w.n) FROM offer_walk w CROSS JOIN LATERAL jsonb_array_elements(w.page->'items') e)=(SELECT compare_part_offers(owner,'arduino_uno','ILS',NULL,'',true) FROM f) AND (SELECT max(n)>1 FROM offer_walk));

-- Pin metadata status.
SELECT pg_temp.ok('pin pages never claim verification or wiring safety',(SELECT p->>'wiring_safety'='NOT_EVALUATED' AND strpos(p::text,'"VERIFIED"')=0 AND jsonb_array_length(p->'items')=LEAST(50,(SELECT count(*) FROM catalog_pins WHERE model_id='arduino-uno' AND model_version=1))::int FROM (SELECT catalog_pin_page(owner,'arduino_uno') p FROM f) x));
SELECT pg_temp.ok('missing pin values are UNKNOWN and present values UNVERIFIED',(SELECT count(*)>0 AND bool_and(CASE WHEN c.physical_number IS NULL THEN e->'physical_number'->>'status'='UNKNOWN' ELSE e->'physical_number'->>'status'='UNVERIFIED' END AND CASE WHEN c.voltage IS NULL THEN e->'voltage'->>'status'='UNKNOWN' ELSE e->'voltage'->>'status'='UNVERIFIED' END AND e->'kind'->>'status'='UNVERIFIED') FROM f CROSS JOIN LATERAL jsonb_array_elements(catalog_pin_page(f.owner,'arduino_uno',100)->'items') e JOIN catalog_pins c ON c.model_id='arduino-uno' AND c.model_version=1 AND c.pin_index=(e->>'pin_index')::int));
SELECT pg_temp.ok('pin pages continue from the last pin index',(SELECT catalog_pin_page(owner,'arduino_uno',10)->'next'='9'::jsonb AND catalog_pin_page(owner,'arduino_uno',10,9)->'items'->0->>'pin_index'='10' FROM f));
ROLLBACK;
