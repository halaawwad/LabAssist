-- Disposable database only, after migration 20261124000100: genuine market edits made through the new functions
-- survive replaying the catalog and marketplace demonstration seeds twice. Not transactional (seeds commit).
SET search_path=labassist_student,public;
\ir ../../remaining-data/tests/helpers.sql
SELECT record_market_price(manager,(SELECT id FROM market_offers WHERE seed_key='DEMO_OFFER_1_arduino_uno'),0,(SELECT id FROM resale_sources WHERE seed_key='DEMO_SOURCE_1'),42,NULL,'ILS',now()) FROM f;
SELECT revoke_resale_source(manager,(SELECT id FROM resale_sources WHERE seed_key='DEMO_SOURCE_2'),'Replay preservation check') FROM f;
SELECT create_part_variant(manager,'arduino_uno','Arduino','A000066','Rev3') FROM f;
\ir ../../catalog-stage7/sql/18-demo-seed.sql
\ir ../../marketplace-stage8/sql/20-demo-seed.sql
\ir ../../catalog-stage7/sql/18-demo-seed.sql
\ir ../../marketplace-stage8/sql/20-demo-seed.sql
SET search_path=labassist_student,public;
SELECT pg_temp.ok('replayed seeds keep the recorded shop price and its dated observation',(SELECT o.unit_price=42 AND (SELECT count(*)=2 AND count(observed_at)=1 FROM market_price_observations WHERE offer_id=o.id) FROM market_offers o WHERE o.seed_key='DEMO_OFFER_1_arduino_uno'));
SELECT pg_temp.ok('replayed seeds keep the revocation and original approval',(SELECT status='REVOKED' AND revocation_reason='Replay preservation check' AND reviewed_by IS NOT NULL FROM resale_sources WHERE seed_key='DEMO_SOURCE_2'));
SELECT pg_temp.ok('replayed seeds add no offers, observations or identity',(SELECT count(*)=9 FROM market_offers) AND (SELECT count(*)=10 FROM market_price_observations) AND (SELECT count(*)=1 FROM catalog_part_variants));
SELECT pg_temp.ok('revoked demo prices stay out of comparison',(SELECT NOT EXISTS(SELECT 1 FROM jsonb_array_elements(compare_part_offers(owner,'arduino_uno','ILS',NULL,'',true)) e WHERE e->>'seller'='Demo electronics shop 2') FROM f));
