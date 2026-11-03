-- Fictional sellers and prices, excluded from normal comparison unless include_demo=true.
BEGIN;SET search_path=labassist_student,public;
DO $$ DECLARE manager UUID;seller UUID;source UUID;n INT;part RECORD;old_student UUID;BEGIN
 SELECT id INTO manager FROM accounts WHERE role='WORKSHOP_MANAGER' AND status<>'DISABLED';
 FOR n IN 1..3 LOOP
  seller=md5('DEMO_MARKET_SELLER:'||n)::uuid;source=md5('DEMO_MARKET_SOURCE:'||n)::uuid;
  SELECT a.id INTO old_student FROM accounts a WHERE a.status='DISABLED' AND a.role='STUDENT' ORDER BY a.id LIMIT 1;
  INSERT INTO market_sellers(id,seed_key,kind,account_id,name,city,is_demo) VALUES(seller,'DEMO_SELLER_'||n,CASE WHEN n=3 THEN 'STUDENT' ELSE 'SHOP' END,CASE WHEN n=3 THEN old_student END,CASE WHEN n=3 THEN 'Demo previous-student sheet' ELSE 'Demo electronics shop '||n END,'Demo location',true) ON CONFLICT DO NOTHING;
  INSERT INTO resale_sources(id,seed_key,seller_id,kind,url,observed_at,status,reviewed_by,reviewed_at) VALUES(source,'DEMO_SOURCE_'||n,seller,CASE WHEN n=3 THEN 'SPREADSHEET' ELSE 'SHOP_PAGE' END,'https://example.invalid/demo/'||n,clock_timestamp(),'APPROVED',manager,clock_timestamp()) ON CONFLICT DO NOTHING;
  FOR part IN SELECT key,name_en FROM catalog_parts WHERE key IN ('arduino_uno','hc_sr04','servo_sg90') LOOP
   INSERT INTO market_offers(id,seed_key,seller_id,source_id,catalog_key,part_name,condition,unit_price,currency,quantity,updated_by) SELECT md5('DEMO_OFFER:'||n||':'||part.key)::uuid,'DEMO_OFFER_'||n||'_'||part.key,seller,source,part.key,part.name_en,CASE WHEN n=3 THEN 'USED' ELSE 'NEW' END,10+n*3,'ILS',2,manager WHERE NOT EXISTS(SELECT 1 FROM market_offers WHERE seed_key='DEMO_OFFER_'||n||'_'||part.key) ON CONFLICT DO NOTHING;
  END LOOP;
 END LOOP;
END $$;COMMIT;
