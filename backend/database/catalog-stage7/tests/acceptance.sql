BEGIN;SET search_path=labassist_student,public;
\ir ../../remaining-data/tests/helpers.sql
SELECT pg_temp.ok('all 43 existing component cards are represented',(SELECT count(*)=43 FROM catalog_parts));
SELECT pg_temp.ok('54 model definitions and 1733 pins are preserved',(SELECT count(*)=54 FROM catalog_models WHERE sealed) AND (SELECT count(*)=1733 FROM catalog_pins));
SELECT pg_temp.ok('catalog categories have Arabic and English names',(SELECT count(*)=8 AND bool_and(length(name_ar)>0 AND length(name_en)>0) FROM catalog_categories));
SELECT pg_temp.ok('drawing dimensions are not physical measurements',NOT EXISTS(SELECT 1 FROM catalog_models WHERE render_units<>'MODEL_UNITS' OR physical_dimensions_mm IS NOT NULL));
SELECT pg_temp.ok('copied source URLs are not falsely marked freshly verified',NOT EXISTS(SELECT 1 FROM catalog_documents WHERE source_verified_at IS NOT NULL));
SELECT pg_temp.ok('every component has an inline connection guide',(SELECT count(*)=43 FROM catalog_guides));
SELECT pg_temp.ok('catalog search resolves real part names',(SELECT jsonb_array_length(read_catalog(owner,'Arduino'))>=2 FROM f));
SELECT pg_temp.reject('students cannot curate shared catalog',$q$SELECT update_catalog_part(owner,'arduino_uno',0,'Changed','Changed','',true) FROM f$q$,'curator required');
SELECT update_catalog_part(manager,'arduino_uno',0,'UNO R3 reference','مرجع UNO R3','Updated curator note',true) FROM f;
SELECT pg_temp.reject('stale catalog edits conflict',$q$SELECT update_catalog_part(manager,'arduino_uno',0,'Changed','Changed','',true) FROM f$q$,'revision conflict');
SELECT pg_temp.reject('sealed model definitions cannot be overwritten',$q$UPDATE catalog_models SET definition='{}' WHERE id='arduino-uno' AND version=1$q$,'immutable');
SELECT pg_temp.reject('sealed pins cannot be changed',$q$UPDATE catalog_pins SET name='Wrong' WHERE model_id='arduino-uno' AND pin_index=0$q$,'immutable');
SELECT pg_temp.reject('sealed models cannot gain extra pins',$q$INSERT INTO catalog_pins VALUES('arduino-uno',1,999,'WRONG','digital','io','socket',5,NULL,'')$q$,'immutable');
SELECT pg_temp.reject('catalog references require a real model',$q$INSERT INTO catalog_parts(key,model_id,model_version,category_id,name_en,name_ar) VALUES('wrong','missing',1,'boards','Wrong','Wrong')$q$,'foreign key');
SELECT pg_temp.reject('guide versions preserve their original instructions',$q$UPDATE catalog_guides SET content='{}' WHERE part_key='arduino_uno'$q$,'immutable');
ROLLBACK;
