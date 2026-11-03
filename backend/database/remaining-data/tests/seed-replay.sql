-- Disposable database only: preserve genuine edits while replaying all six demonstration seeds twice.
SET search_path=labassist_student,public;
\ir helpers.sql
SELECT assign_workshop_table(owner,project,'C1',0) FROM f;
SELECT assign_workshop_table(manager,(SELECT id FROM projects WHERE seed_key='TEAM02'),'R1',0) FROM f;
SELECT update_catalog_part(manager,'arduino_uno',0,'Curated UNO title','عنوان محفوظ','Curator edit',false) FROM f;
SELECT update_market_offer(manager,(SELECT id FROM market_offers WHERE seed_key='DEMO_OFFER_1_arduino_uno'),0,42,1,'ACTIVE') FROM f;
UPDATE resale_sources SET status='REJECTED' WHERE seed_key='DEMO_SOURCE_1';
INSERT INTO ids SELECT 'circuit',id FROM circuit_documents WHERE seed_key='DEMO_CIRCUIT_TEAM01';
INSERT INTO ids SELECT 'head',save_circuit(f.owner,d.id,d.revision,(SELECT data||'{"user_note":"Keep my draft"}'::jsonb FROM circuit_versions WHERE id=d.head_version),'Keep my draft') FROM f JOIN circuit_documents d ON d.id=(SELECT id FROM ids WHERE key='circuit');
SELECT share_circuit_with_team(owner,(SELECT id FROM ids WHERE key='circuit'),1,true,project) FROM f;
INSERT INTO ids SELECT 'bookmark',bookmark_learning(owner,(SELECT id FROM learning_lessons WHERE slug='led-resistor')) FROM f;
INSERT INTO ids SELECT 'thread',id FROM ai_conversations WHERE seed_key='DEMO_AI_CONVERSATION';
SELECT append_ai_message(f.owner,a.id,a.revision,gen_random_uuid(),'Keep this project explanation.') FROM f JOIN ai_conversations a ON a.id=(SELECT id FROM ids WHERE key='thread');
INSERT INTO ids SELECT 'pin',pin_ai_conversation(f.owner,a.id,a.revision,'Keep my pinned conversation') FROM f JOIN ai_conversations a ON a.id=(SELECT id FROM ids WHERE key='thread');
SELECT append_ai_message(f.owner,a.id,a.revision,gen_random_uuid(),'Continuation after pin.') FROM f JOIN ai_conversations a ON a.id=(SELECT id FROM ids WHERE key='thread');
CREATE TEMP TABLE replay_fingerprints(table_name TEXT PRIMARY KEY,fingerprint TEXT);
DO $$ DECLARE t TEXT;value TEXT;BEGIN
 FOREACH t IN ARRAY ARRAY['workshop_days','workshop_attendance','workshop_absence_policies','workshop_table_assignments','workshop_table_history','workshop_handovers','workshop_handover_items','catalog_models','catalog_pins','catalog_parts','catalog_guides','catalog_documents','market_sellers','resale_sources','market_offers','market_offer_history','circuit_documents','circuit_versions','circuit_version_parts','circuit_version_wires','circuit_publications','learning_lessons','learning_resources','learning_bookmarks','ai_conversations','ai_messages','ai_jobs','learning_ai_snapshots','notification_events','notification_inbox','audit_events'] LOOP
  EXECUTE format('SELECT md5(COALESCE(string_agg(to_jsonb(x)::text,''|'' ORDER BY to_jsonb(x)::text),'''')) FROM %I x',t) INTO value;
  INSERT INTO replay_fingerprints VALUES(t,value);
 END LOOP;
END $$;
\ir ../../workshop-operations-stage6/sql/16-demo-seed.sql
\ir ../../catalog-stage7/sql/18-demo-seed.sql
\ir ../../marketplace-stage8/sql/20-demo-seed.sql
\ir ../../circuits-stage9/sql/22-demo-seed.sql
\ir ../../learning-stage10/sql/24-demo-seed.sql
\ir ../../ai-stage11/sql/26-demo-seed.sql
\ir ../../workshop-operations-stage6/sql/16-demo-seed.sql
\ir ../../catalog-stage7/sql/18-demo-seed.sql
\ir ../../marketplace-stage8/sql/20-demo-seed.sql
\ir ../../circuits-stage9/sql/22-demo-seed.sql
\ir ../../learning-stage10/sql/24-demo-seed.sql
\ir ../../ai-stage11/sql/26-demo-seed.sql
DO $$ DECLARE row RECORD;value TEXT;BEGIN
 FOR row IN SELECT * FROM replay_fingerprints LOOP
  EXECUTE format('SELECT md5(COALESCE(string_agg(to_jsonb(x)::text,''|'' ORDER BY to_jsonb(x)::text),'''')) FROM %I x',row.table_name) INTO value;
  IF value IS DISTINCT FROM row.fingerprint THEN RAISE EXCEPTION 'Seed changed persisted state in %',row.table_name;END IF;
 END LOOP;
END $$;
SELECT pg_temp.ok('all six seeds preserve full row contents, custom allocations, prices, drafts, saved lessons and pinned conversations',true);
SELECT pg_temp.ok('pinned conversation remains frozen while original continues',(SELECT jsonb_array_length(read_ai_snapshot(owner,(SELECT id FROM ids WHERE key='pin'))->'messages')=2 FROM f));
SELECT pg_temp.ok('pending activation fixtures and credentials remain untouched',NOT EXISTS(SELECT 1 FROM accounts WHERE seed_key ~ '^STU[0-9]{2}$' AND status<>'PENDING_ACTIVATION') AND NOT EXISTS(SELECT 1 FROM activation_invitations));
