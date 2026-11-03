BEGIN;SET search_path=labassist_student,public;
\ir ../../remaining-data/tests/helpers.sql
SELECT pg_temp.ok('basic lesson has a circuit and bilingual expected result',(SELECT jsonb_array_length(circuit_data->'parts')=3 AND length(expected_result_ar)>0 AND length(expected_result_en)>0 FROM learning_lessons WHERE slug='led-resistor'));
SELECT pg_temp.ok('three foundational lessons have independently validated model circuits',(SELECT count(*)=3 FROM learning_lessons WHERE slug IN ('led-resistor','ldr-divider','button-pullup')));
SELECT pg_temp.ok('lesson pieces refer to real catalog parts',(SELECT count(*)=2 FROM learning_lesson_parts WHERE lesson_id=(SELECT id FROM learning_lessons WHERE slug='led-resistor')));
SELECT pg_temp.ok('learning sources retain publisher and URL provenance',NOT EXISTS(SELECT 1 FROM learning_resources WHERE publisher='' OR url !~ '^https?://'));
SELECT pg_temp.ok('existing sources are not labeled freshly verified',NOT EXISTS(SELECT 1 FROM learning_resources WHERE source_verified_at IS NOT NULL));
INSERT INTO ids SELECT 'lesson',id FROM learning_lessons WHERE slug='led-resistor';
INSERT INTO ids SELECT 'bookmark',bookmark_learning(owner,(SELECT id FROM ids WHERE key='lesson')) FROM f;
SELECT pg_temp.ok('bookmark retry creates one private saved item',(SELECT bookmark_learning(owner,(SELECT id FROM ids WHERE key='lesson'))=(SELECT id FROM ids WHERE key='bookmark') FROM f));
SELECT pg_temp.ok('another student has a separate saved library',(SELECT read_learning_bookmarks(teammate)='[]'::jsonb FROM f));
SELECT pg_temp.reject('supervisor cannot claim a students saved library',$q$SELECT bookmark_learning(supervisor,(SELECT id FROM ids WHERE key='lesson')) FROM f$q$,'student required');
SELECT pg_temp.reject('saved item must reference exactly one target',$q$SELECT bookmark_learning(owner,(SELECT id FROM ids WHERE key='lesson'),(SELECT id FROM learning_resources LIMIT 1)) FROM f$q$,'exactly one');
SELECT pg_temp.reject('lesson versions are immutable',$q$UPDATE learning_lessons SET expected_result_en='Changed' WHERE id=(SELECT id FROM ids WHERE key='lesson')$q$,'immutable');
SELECT pg_temp.reject('new lesson must have a valid circuit',$q$INSERT INTO learning_lessons(slug,version,title_en,title_ar,content,circuit_data,expected_result_en,expected_result_ar) VALUES('bad',1,'Bad','Bad','{}','{}','Bad','Bad')$q$,'arrays required');
SELECT bookmark_learning(owner,(SELECT id FROM ids WHERE key='lesson'),NULL,false) FROM f;
SELECT pg_temp.ok('unbookmark removes only the owners item',(SELECT read_learning_bookmarks(owner)='[]'::jsonb FROM f));
ROLLBACK;
