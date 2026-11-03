BEGIN;SET search_path=labassist_student,public;
ALTER TABLE circuit_documents DISABLE TRIGGER circuit_document_scope;
ALTER TABLE circuit_versions DISABLE TRIGGER circuit_version_scope;
ALTER TABLE circuit_publications DISABLE TRIGGER circuit_publication_scope;
DO $$ DECLARE p RECORD;student UUID;c UUID;v UUID;content JSONB='{"parts":[{"id":"supply","type":"power-source","x":-3,"z":0,"rot":0},{"id":"resistor","type":"resistor-220","x":0,"z":0,"rot":0},{"id":"led","type":"led-red","x":3,"z":0,"rot":0}],"wires":[{"id":"w1","from":{"partId":"supply","pin":0},"to":{"partId":"resistor","pin":0},"color":"#e5484d","type":"power","gauge":22},{"id":"w2","from":{"partId":"resistor","pin":1},"to":{"partId":"led","pin":0},"color":"#e5484d","type":"power","gauge":22},{"id":"w3","from":{"partId":"led","pin":1},"to":{"partId":"supply","pin":1},"color":"#2b2f33","type":"power","gauge":22}]}';BEGIN
 PERFORM validate_circuit_data(content);
 FOR p IN SELECT pr.* FROM projects pr JOIN academic_terms t ON t.id=pr.term_id WHERE t.is_demo ORDER BY pr.seed_key LOOP
  SELECT student_id INTO student FROM project_students WHERE project_id=p.id ORDER BY student_id LIMIT 1;
  c=md5('DEMO_CIRCUIT:'||p.id)::uuid;v=md5('DEMO_CIRCUIT_VERSION:'||p.id)::uuid;
  INSERT INTO circuit_documents(id,seed_key,owner_id,project_id,name,request_key,request_payload,updated_by,created_at) VALUES(c,'DEMO_CIRCUIT_'||p.seed_key,student,p.id,'LED and resistor example',md5('DEMO_CIRCUIT_REQUEST:'||p.id)::uuid,'{"fixture":true}',student,p.created_at) ON CONFLICT DO NOTHING;
  INSERT INTO circuit_versions(id,circuit_id,version_number,label,data,created_by,created_at) VALUES(v,c,1,'Synthetic reference example',content,student,p.created_at) ON CONFLICT DO NOTHING;
  UPDATE circuit_documents SET head_version=v WHERE id=c AND head_version IS NULL;
  IF p.status IN ('COMPLETED','ARCHIVED') THEN INSERT INTO circuit_publications(id,circuit_id,version_id,published_by,title,copy_mode,published_at) VALUES(md5('DEMO_PUBLICATION:'||p.id)::uuid,c,v,student,'Previous-semester LED reference','VIEW',p.updated_at) ON CONFLICT DO NOTHING;END IF;
 END LOOP;
END $$;
ALTER TABLE circuit_documents ENABLE TRIGGER circuit_document_scope;
ALTER TABLE circuit_versions ENABLE TRIGGER circuit_version_scope;
ALTER TABLE circuit_publications ENABLE TRIGGER circuit_publication_scope;
COMMIT;
