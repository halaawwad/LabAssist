BEGIN;
SET search_path=labassist_student,public;
CREATE FUNCTION pg_temp.ok(label TEXT,condition BOOLEAN) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; RETURN 'PASS: '||label; END $$;
CREATE FUNCTION pg_temp.reject(label TEXT,statement TEXT,expected TEXT) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE statement;SET CONSTRAINTS ALL IMMEDIATE;
 EXCEPTION WHEN OTHERS THEN
  IF position(expected IN SQLERRM)=0 THEN RAISE EXCEPTION 'Wrong failure for %: %',label,SQLERRM; END IF;
  RETURN 'PASS: '||label;
 END;RAISE EXCEPTION 'FAILED: accepted %',label;
END $$;
SELECT pg_temp.ok('23 demo budgets',(SELECT count(*)=23 FROM project_budgets));
SELECT pg_temp.ok('92 planned BOM rows',(SELECT count(*)=92 FROM project_bom_items));
SELECT pg_temp.ok('no invented purchases',(SELECT count(*)=0 FROM project_expenses));
SELECT pg_temp.ok('estimates do not count as spending',(SELECT bool_and(estimated_known=52 AND spent=0 AND remaining=250 AND unpriced_items=0) FROM project_finance_summary));
SELECT pg_temp.ok('initial parts are needed',(SELECT bool_and(supply_status='NEEDED' AND acquired_quantity=0) FROM project_bom_summary));
CREATE TEMP TABLE f AS SELECT b.project_id,b.id AS uno,b.created_by AS owner,
 (SELECT id FROM project_bom_items WHERE project_id=b.project_id AND name='HC-SR04 Ultrasonic Sensor') AS sensor,
 (SELECT id FROM project_bom_items WHERE project_id<>b.project_id ORDER BY id LIMIT 1) AS other_bom,
 (SELECT student_id FROM project_students WHERE project_id=b.project_id AND student_id<>b.created_by AND left_at IS NULL ORDER BY student_id LIMIT 1) AS teammate,
 (SELECT student_id FROM project_students WHERE project_id<>b.project_id AND left_at IS NULL ORDER BY student_id LIMIT 1) AS outsider,
 (SELECT supervisor_id FROM project_supervisors WHERE project_id=b.project_id ORDER BY supervisor_id LIMIT 1) AS supervisor
 FROM project_bom_items b WHERE name='Arduino Uno' ORDER BY b.id LIMIT 1;
CREATE TEMP TABLE saved(id UUID);
CREATE FUNCTION pg_temp.lines(uno UUID,sensor UUID) RETURNS JSONB LANGUAGE sql AS $$
 SELECT jsonb_build_array(jsonb_build_object('bom_item_id',uno,'label','Uno board','quantity',1,'unit_price',20),jsonb_build_object('bom_item_id',sensor,'label','Sensor','quantity',1,'unit_price',5.50))
$$;
SELECT pg_temp.reject('outsider cannot add BOM',$q$INSERT INTO project_bom_items(project_id,name,quantity_required,created_by,updated_by) SELECT project_id,'Invalid',1,outsider,outsider FROM f$q$,'current teammate');
SELECT pg_temp.reject('supervisor cannot change budget',$q$UPDATE project_budgets SET amount=300,updated_by=(SELECT supervisor FROM f) WHERE project_id=(SELECT project_id FROM f)$q$,'current teammate');
SELECT pg_temp.reject('negative budget rejected',$q$UPDATE project_budgets SET amount=-1 WHERE project_id=(SELECT project_id FROM f)$q$,'check constraint');
SELECT pg_temp.reject('budget currency cannot silently change',$q$UPDATE project_budgets SET currency='ILS' WHERE project_id=(SELECT project_id FROM f)$q$,'currency is immutable');
SELECT pg_temp.reject('zero required quantity rejected',$q$UPDATE project_bom_items SET quantity_required=0 WHERE id=(SELECT uno FROM f)$q$,'check constraint');
SELECT pg_temp.reject('negative estimate rejected',$q$UPDATE project_bom_items SET estimated_unit_price=-1 WHERE id=(SELECT uno FROM f)$q$,'check constraint');
SELECT pg_temp.reject('outsider cannot record expense',$q$SELECT record_project_expense(outsider,project_id,'40000000-0000-4000-8000-000000000001',CURRENT_DATE,'Shop',pg_temp.lines(uno,sensor)) FROM f$q$,'current teammate');
SELECT pg_temp.reject('empty purchase rejected',$q$SELECT record_project_expense(owner,project_id,'40000000-0000-4000-8000-000000000001',CURRENT_DATE,'Shop','[]') FROM f$q$,'1 to 100');
INSERT INTO saved SELECT record_project_expense(owner,project_id,'40000000-0000-4000-8000-000000000001',CURRENT_DATE,'Shop',pg_temp.lines(uno,sensor)) FROM f;
SELECT pg_temp.ok('purchase totals use actual prices',(SELECT amount=25.50 FROM project_expense_totals WHERE id=(SELECT id FROM saved)));
SELECT pg_temp.ok('remaining excludes estimated cost',(SELECT s.spent=25.50 AND s.remaining=224.50 AND s.estimated_known=52 FROM project_finance_summary s JOIN f USING(project_id)));
SELECT pg_temp.ok('one of two sensors is partial',(SELECT acquired_quantity=1 AND missing_quantity=1 AND supply_status='PARTIAL' FROM project_bom_summary WHERE id=(SELECT sensor FROM f)));
SELECT pg_temp.ok('one acquired board ready',(SELECT supply_status='ACQUIRED' FROM project_bom_summary WHERE id=(SELECT uno FROM f)));
SELECT record_project_expense(owner,project_id,'40000000-0000-4000-8000-000000000001',CURRENT_DATE,'Shop',pg_temp.lines(uno,sensor)) FROM f;
SELECT pg_temp.ok('retry creates no duplicate header or lines',(SELECT count(*)=1 FROM project_expenses) AND (SELECT count(*)=2 FROM project_expense_lines));
SELECT pg_temp.ok('retry creates no duplicate audit',(SELECT count(*)=2 FROM audit_events WHERE event_key LIKE 'project_expenses_%'));
SELECT pg_temp.reject('same key different data conflicts',$q$SELECT record_project_expense(owner,project_id,'40000000-0000-4000-8000-000000000001',CURRENT_DATE,'Different Shop',pg_temp.lines(uno,sensor)) FROM f$q$,'key reused');
SELECT pg_temp.reject('negative actual price rejected',$q$SELECT record_project_expense(owner,project_id,'40000000-0000-4000-8000-000000000002',CURRENT_DATE,'Shop','[{"label":"Invalid","quantity":1,"unit_price":-1}]') FROM f$q$,'nonnegative');
SELECT pg_temp.reject('sub-cent negative price rejected',$q$SELECT record_project_expense(owner,project_id,'40000000-0000-4000-8000-000000000002',CURRENT_DATE,'Shop','[{"label":"Invalid","quantity":1,"unit_price":-0.001}]') FROM f$q$,'nonnegative');
SELECT pg_temp.reject('zero purchase quantity rejected',$q$SELECT record_project_expense(owner,project_id,'40000000-0000-4000-8000-000000000002',CURRENT_DATE,'Shop','[{"label":"Invalid","quantity":0,"unit_price":1}]') FROM f$q$,'check constraint');
SELECT pg_temp.reject('fractional piece count rejected',$q$SELECT record_project_expense(owner,project_id,'40000000-0000-4000-8000-000000000002',CURRENT_DATE,'Shop','[{"label":"Invalid","quantity":1.5,"unit_price":1}]') FROM f$q$,'positive integer');
SELECT pg_temp.reject('cross-project BOM purchase rejected',$q$SELECT record_project_expense(owner,project_id,'40000000-0000-4000-8000-000000000002',CURRENT_DATE,'Shop',pg_temp.lines(uno,other_bom)) FROM f$q$,'foreign key constraint');
SELECT pg_temp.ok('invalid second line rolls back entire purchase',(SELECT count(*)=1 FROM project_expenses) AND (SELECT count(*)=2 FROM project_expense_lines));
SELECT pg_temp.reject('posted price is immutable',$q$UPDATE project_expense_lines SET unit_price=1 WHERE expense_id=(SELECT id FROM saved)$q$,'immutable');
SELECT pg_temp.reject('cannot append to posted purchase',$q$INSERT INTO project_expense_lines(expense_id,project_id,label,quantity,unit_price) SELECT s.id,f.project_id,'Extra',1,1 FROM saved s CROSS JOIN f$q$,'draft expense');
SELECT pg_temp.reject('cannot delete posted purchase',$q$DELETE FROM project_expenses WHERE id=(SELECT id FROM saved)$q$,'cannot be deleted');
SELECT pg_temp.reject('unposted header cannot commit',$q$INSERT INTO project_expenses(project_id,request_key,request_payload,purchased_on,created_by,updated_by) SELECT project_id,'40000000-0000-4000-8000-000000000002','{}',CURRENT_DATE,owner,owner FROM f$q$,'same transaction');
SELECT record_project_expense(teammate,project_id,'40000000-0000-4000-8000-000000000003',CURRENT_DATE,'Already owned',jsonb_build_array(jsonb_build_object('bom_item_id',sensor,'label','Owned sensor','quantity',1,'unit_price',0))) FROM f;
SELECT pg_temp.ok('zero-cost acquired part counts for availability',(SELECT acquired_quantity=2 AND supply_status='ACQUIRED' FROM project_bom_summary WHERE id=(SELECT sensor FROM f)));
SELECT pg_temp.ok('free part does not add spending',(SELECT spent=25.50 FROM project_finance_summary WHERE project_id=(SELECT project_id FROM f)));
SELECT set_project_bom_needed(teammate,uno,0,false,'No longer required') FROM f;
SELECT pg_temp.ok('not needed excludes planned cost only',(SELECT s.spent=25.50 AND s.estimated_known=30 FROM project_finance_summary s JOIN f USING(project_id)));
SELECT pg_temp.ok('not needed retains acquisition history',(SELECT supply_status='NOT_NEEDED' AND acquired_quantity=1 AND missing_quantity=0 FROM project_bom_summary WHERE id=(SELECT uno FROM f)));
SELECT pg_temp.reject('stale BOM revision rejected',$q$SELECT set_project_bom_needed(owner,uno,0,true) FROM f$q$,'revision conflict');
SELECT pg_temp.reject('outsider cannot void expense',$q$SELECT void_project_expense(f.outsider,s.id,1,'Invalid') FROM f CROSS JOIN saved s$q$,'current teammate');
SELECT pg_temp.reject('stale expense revision rejected',$q$SELECT void_project_expense(f.owner,s.id,0,'Duplicate') FROM f CROSS JOIN saved s$q$,'revision conflict');
SELECT pg_temp.reject('void requires reason',$q$SELECT void_project_expense(f.owner,s.id,1,'') FROM f CROSS JOIN saved s$q$,'check constraint');
SELECT void_project_expense(f.teammate,s.id,1,'Recorded in error') FROM f CROSS JOIN saved s;
SELECT pg_temp.ok('voided payment excluded from total',(SELECT spent=0 AND remaining=250 FROM project_finance_summary WHERE project_id=(SELECT project_id FROM f)));
SELECT pg_temp.ok('void preserves original expense and lines',(SELECT count(*)=2 FROM project_expenses) AND (SELECT count(*)=3 FROM project_expense_lines));
SELECT pg_temp.ok('void recalculates supplied quantity',(SELECT acquired_quantity=1 AND supply_status='PARTIAL' FROM project_bom_summary WHERE id=(SELECT sensor FROM f)));
SELECT record_project_expense(owner,project_id,'40000000-0000-4000-8000-000000000001',CURRENT_DATE,'Shop',pg_temp.lines(uno,sensor)) FROM f;
SELECT pg_temp.ok('old retry cannot restore voided expense',(SELECT spent=0 FROM project_finance_summary WHERE project_id=(SELECT project_id FROM f)));
SELECT record_project_expense(owner,project_id,'40000000-0000-4000-8000-000000000004',CURRENT_DATE,'Shipping','[{"label":"Delivery","quantity":1,"unit_price":2.75}]') FROM f;
SELECT pg_temp.ok('general costs count without a BOM item',(SELECT spent=2.75 FROM project_finance_summary WHERE project_id=(SELECT project_id FROM f)));
UPDATE project_bom_items SET estimated_unit_price=NULL,updated_by=(SELECT teammate FROM f) WHERE id=(SELECT sensor FROM f);
SELECT pg_temp.ok('unknown estimate remains explicit',(SELECT unpriced_items=1 FROM project_finance_summary WHERE project_id=(SELECT project_id FROM f)));
UPDATE project_budgets SET amount=1,updated_by=(SELECT teammate FROM f) WHERE project_id=(SELECT project_id FROM f);
SELECT pg_temp.ok('overspend is shown without erasing costs',(SELECT spent=2.75 AND remaining=-1.75 FROM project_finance_summary WHERE project_id=(SELECT project_id FROM f)));
SELECT pg_temp.reject('NaN budget rejected',$q$UPDATE project_budgets SET amount='NaN' WHERE project_id=(SELECT project_id FROM f)$q$,'check constraint');
SELECT pg_temp.reject('NaN estimate rejected',$q$UPDATE project_bom_items SET estimated_unit_price='NaN' WHERE id=(SELECT uno FROM f)$q$,'check constraint');
INSERT INTO files(id,uploaded_by,storage_key,original_name,mime_type,byte_size,status)
 SELECT '50000000-0000-4000-8000-000000000001',owner,'finance-test-own','receipt.pdf','application/pdf',20,'READY' FROM f;
INSERT INTO files(id,uploaded_by,storage_key,original_name,mime_type,byte_size,status)
 SELECT '50000000-0000-4000-8000-000000000002',outsider,'finance-test-other','private.png','image/png',20,'READY' FROM f;
INSERT INTO files(id,uploaded_by,storage_key,original_name,mime_type,byte_size,status)
 SELECT '50000000-0000-4000-8000-000000000003',owner,'finance-test-pending','pending.png','image/png',20,'PENDING' FROM f;
INSERT INTO files(id,uploaded_by,storage_key,original_name,mime_type,byte_size,status)
 SELECT '50000000-0000-4000-8000-000000000004',owner,'finance-test-wrong-type','notes.txt','text/plain',20,'READY' FROM f;
SELECT pg_temp.reject('another student receipt rejected',$q$SELECT record_project_expense(owner,project_id,'40000000-0000-4000-8000-000000000005',CURRENT_DATE,'Shop','[{"label":"Part","quantity":1,"unit_price":1}]','50000000-0000-4000-8000-000000000002') FROM f$q$,'owned ready');
SELECT pg_temp.reject('pending receipt rejected',$q$SELECT record_project_expense(owner,project_id,'40000000-0000-4000-8000-000000000005',CURRENT_DATE,'Shop','[{"label":"Part","quantity":1,"unit_price":1}]','50000000-0000-4000-8000-000000000003') FROM f$q$,'owned ready');
SELECT pg_temp.reject('non-image non-PDF receipt rejected',$q$SELECT record_project_expense(owner,project_id,'40000000-0000-4000-8000-000000000005',CURRENT_DATE,'Shop','[{"label":"Part","quantity":1,"unit_price":1}]','50000000-0000-4000-8000-000000000004') FROM f$q$,'owned ready');
SELECT record_project_expense(owner,project_id,'40000000-0000-4000-8000-000000000005',CURRENT_DATE,'Shop','[{"label":"Part","quantity":1,"unit_price":1}]','50000000-0000-4000-8000-000000000001') FROM f;
SELECT pg_temp.ok('owned ready PDF accepted',(SELECT count(*)=1 FROM project_expenses WHERE receipt_file_id='50000000-0000-4000-8000-000000000001'));
SELECT pg_temp.ok('failed receipt attempts add no expenses',(SELECT count(*)=4 FROM project_expenses));
SELECT pg_temp.ok('credentials remain untouched',(SELECT count(*)=0 FROM accounts WHERE password_hash IS NOT NULL));
ROLLBACK;
