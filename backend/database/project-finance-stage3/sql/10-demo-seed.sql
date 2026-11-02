BEGIN;
SET search_path=labassist_student,public;
INSERT INTO project_budgets(project_id,currency,amount,created_by,updated_by)
 SELECT p.id,'USD',250,m.student_id,m.student_id FROM projects p JOIN academic_terms term ON term.id=p.term_id AND term.is_demo
 CROSS JOIN LATERAL(SELECT student_id FROM project_students WHERE project_id=p.id AND left_at IS NULL ORDER BY student_id LIMIT 1) m
 WHERE p.seed_key IS NOT NULL AND term.seed_key='DEMO_TERM' ON CONFLICT DO NOTHING;
INSERT INTO project_bom_items(id,seed_key,project_id,name,quantity_required,estimated_unit_price,created_by,updated_by)
 SELECT md5('bom:'||p.id::text||':'||part.key)::uuid,'DEMO_BOM_'||p.seed_key||'_'||part.key,
 p.id,part.name,part.quantity,part.price,m.student_id,m.student_id
 FROM projects p JOIN academic_terms term ON term.id=p.term_id AND term.is_demo
 CROSS JOIN LATERAL(SELECT student_id FROM project_students WHERE project_id=p.id AND left_at IS NULL ORDER BY student_id LIMIT 1) m
 CROSS JOIN (VALUES('UNO','Arduino Uno',1,22),('DRIVER','L298N Motor Driver',1,8),('SENSOR','HC-SR04 Ultrasonic Sensor',2,8),('BATTERY','18650 Li-ion Battery',1,6)) part(key,name,quantity,price)
 WHERE p.seed_key IS NOT NULL AND term.seed_key='DEMO_TERM' ON CONFLICT DO NOTHING;
-- Planning fixtures only. Actual expenses and receipts are not seeded.
COMMIT;
