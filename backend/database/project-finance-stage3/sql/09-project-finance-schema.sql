BEGIN;
SET search_path=labassist_student,public;

CREATE TABLE project_budgets (
 project_id UUID PRIMARY KEY REFERENCES projects(id),
 currency VARCHAR(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 amount NUMERIC(14,2) NOT NULL CHECK(amount>=0 AND amount<>'NaN'::numeric),
 created_by UUID NOT NULL REFERENCES accounts(id),updated_by UUID NOT NULL REFERENCES accounts(id),
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE project_bom_items (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,
 project_id UUID NOT NULL REFERENCES project_budgets(project_id),
 name TEXT NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 240),
 quantity_required INT NOT NULL CHECK(quantity_required>0),
 estimated_unit_price NUMERIC(14,2) CHECK(estimated_unit_price>=0 AND estimated_unit_price<>'NaN'::numeric),
 is_needed BOOLEAN NOT NULL DEFAULT true,not_needed_reason TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '',
 created_by UUID NOT NULL REFERENCES accounts(id),updated_by UUID NOT NULL REFERENCES accounts(id),
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,project_id),CHECK(NOT is_needed OR not_needed_reason='')
);
CREATE TABLE project_expenses (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id UUID NOT NULL REFERENCES project_budgets(project_id),
 request_key UUID NOT NULL,request_payload JSONB NOT NULL CHECK(jsonb_typeof(request_payload)='object'),
 purchased_on DATE NOT NULL,seller_name TEXT NOT NULL DEFAULT '',
 receipt_file_id UUID REFERENCES files(id),
 status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','POSTED','VOIDED')),
 created_by UUID NOT NULL REFERENCES accounts(id),updated_by UUID NOT NULL REFERENCES accounts(id),
 voided_by UUID REFERENCES accounts(id),voided_at TIMESTAMPTZ,void_reason TEXT NOT NULL DEFAULT '',
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(project_id,request_key),UNIQUE(id,project_id),
 CHECK((status='VOIDED' AND voided_by IS NOT NULL AND voided_at IS NOT NULL AND length(btrim(void_reason))>0)
 OR (status<>'VOIDED' AND voided_by IS NULL AND voided_at IS NULL AND void_reason=''))
);
CREATE TABLE project_expense_lines (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 expense_id UUID NOT NULL,project_id UUID NOT NULL,bom_item_id UUID,
 label TEXT NOT NULL CHECK(length(btrim(label)) BETWEEN 1 AND 240),
 quantity INT NOT NULL CHECK(quantity>0),unit_price NUMERIC(14,2) NOT NULL CHECK(unit_price>=0 AND unit_price<>'NaN'::numeric),
 total NUMERIC(24,2) GENERATED ALWAYS AS (quantity::numeric*unit_price) STORED,
 FOREIGN KEY(expense_id,project_id) REFERENCES project_expenses(id,project_id),
 FOREIGN KEY(bom_item_id,project_id) REFERENCES project_bom_items(id,project_id)
);
CREATE INDEX bom_project_needed ON project_bom_items(project_id,is_needed);
CREATE INDEX expenses_project_status_date ON project_expenses(project_id,status,purchased_on);
CREATE INDEX expense_line_item ON project_expense_lines(bom_item_id,expense_id);
CREATE INDEX expense_line_header ON project_expense_lines(expense_id);

CREATE FUNCTION finance_member_guard() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT team_member(NEW.updated_by,NEW.project_id) THEN RAISE EXCEPTION 'Finance actor must be a current teammate'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.updated_by<>NEW.created_by OR NEW.revision<>0 THEN RAISE EXCEPTION 'Initial finance actor and revision invalid'; END IF;
 ELSE
  IF ROW(NEW.project_id,NEW.created_by,NEW.created_at) IS DISTINCT FROM ROW(OLD.project_id,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Finance identity is immutable'; END IF;
  NEW.revision=OLD.revision+1;
 END IF;
 IF TG_TABLE_NAME='project_budgets' THEN
  IF TG_OP='UPDATE' AND NEW.currency<>OLD.currency THEN RAISE EXCEPTION 'Budget currency is immutable'; END IF;
 ELSE
  IF TG_OP='UPDATE' AND ROW(NEW.id,NEW.seed_key) IS DISTINCT FROM ROW(OLD.id,OLD.seed_key) THEN RAISE EXCEPTION 'BOM identity is immutable'; END IF;
 END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER finance_member BEFORE INSERT OR UPDATE ON project_budgets FOR EACH ROW EXECUTE FUNCTION finance_member_guard();
CREATE TRIGGER finance_member BEFORE INSERT OR UPDATE ON project_bom_items FOR EACH ROW EXECUTE FUNCTION finance_member_guard();

CREATE FUNCTION expense_guard() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Expense history cannot be deleted; void the expense'; END IF;
 IF NOT team_member(NEW.updated_by,NEW.project_id) THEN RAISE EXCEPTION 'Finance actor must be a current teammate'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.created_by<>NEW.updated_by OR NEW.status<>'DRAFT' OR NEW.revision<>0 THEN RAISE EXCEPTION 'Expense must start as an owned draft'; END IF;
 ELSE
  IF ROW(NEW.id,NEW.project_id,NEW.request_key,NEW.request_payload,NEW.purchased_on,NEW.seller_name,NEW.receipt_file_id,NEW.created_by,NEW.created_at)
   IS DISTINCT FROM ROW(OLD.id,OLD.project_id,OLD.request_key,OLD.request_payload,OLD.purchased_on,OLD.seller_name,OLD.receipt_file_id,OLD.created_by,OLD.created_at)
   THEN RAISE EXCEPTION 'Recorded expense is immutable; void and replace'; END IF;
  IF NOT ((OLD.status='DRAFT' AND NEW.status='POSTED' AND NEW.updated_by=OLD.created_by)
       OR (OLD.status='POSTED' AND NEW.status='VOIDED')) THEN RAISE EXCEPTION 'Invalid expense transition'; END IF;
  NEW.revision=OLD.revision+1;
 END IF;
 IF NEW.receipt_file_id IS NOT NULL AND TG_OP='INSERT' THEN
  IF NOT EXISTS(SELECT 1 FROM files f WHERE f.id=NEW.receipt_file_id AND f.uploaded_by=NEW.created_by AND f.status='READY' AND (f.mime_type LIKE 'image/%' OR f.mime_type='application/pdf')) THEN
   RAISE EXCEPTION 'Receipt must be an owned ready image or PDF'; END IF;
 END IF;
 IF NEW.status='VOIDED' THEN NEW.voided_by=NEW.updated_by;NEW.voided_at=clock_timestamp(); END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER expense_scope BEFORE INSERT OR UPDATE OR DELETE ON project_expenses FOR EACH ROW EXECUTE FUNCTION expense_guard();
CREATE FUNCTION expense_line_guard() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
DECLARE header project_expenses%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Expense lines are immutable; void and replace'; END IF;
 SELECT * INTO header FROM project_expenses WHERE id=NEW.expense_id FOR UPDATE;
 IF NOT FOUND OR header.status<>'DRAFT' THEN RAISE EXCEPTION 'Lines require a draft expense'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER expense_line_scope BEFORE INSERT OR UPDATE OR DELETE ON project_expense_lines FOR EACH ROW EXECUTE FUNCTION expense_line_guard();
CREATE FUNCTION validate_posted_expenses() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM project_expenses WHERE status='DRAFT') THEN RAISE EXCEPTION 'Expense draft must be posted in the same transaction'; END IF;
 IF EXISTS(SELECT 1 FROM project_expenses e WHERE NOT EXISTS(SELECT 1 FROM project_expense_lines l WHERE l.expense_id=e.id)) THEN RAISE EXCEPTION 'Expense requires at least one line'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER complete_expense AFTER INSERT OR UPDATE ON project_expenses DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_posted_expenses();
CREATE FUNCTION log_project_finance() RETURNS trigger LANGUAGE plpgsql
SET search_path=labassist_student,pg_temp AS $$
BEGIN
 INSERT INTO audit_events(actor_id,event_key,subject_id,payload)
 VALUES(NEW.updated_by,TG_TABLE_NAME||'_'||TG_OP,NEW.project_id,
 jsonb_build_object('before',CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) END,'after',to_jsonb(NEW)));
 RETURN NEW;
END $$;
DO $$ DECLARE t TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['project_budgets','project_bom_items','project_expenses'] LOOP
  EXECUTE format('CREATE TRIGGER finance_audit AFTER INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION log_project_finance()',t);
 END LOOP;
END $$;

-- The backend derives actor from its authenticated session, not request body data.
CREATE FUNCTION record_project_expense(actor UUID,project UUID,idempotency_key UUID,purchase_date DATE,seller TEXT,items JSONB,receipt UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE payload JSONB;existing project_expenses%ROWTYPE;expense UUID;item JSONB;
BEGIN
 IF NOT team_member(actor,project) THEN RAISE EXCEPTION 'Finance actor must be a current teammate'; END IF;
 IF jsonb_typeof(items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Expense items must be an array'; END IF;
 IF jsonb_array_length(items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Expense requires 1 to 100 lines'; END IF;
 payload=jsonb_build_object('actor',actor,'date',purchase_date,'seller',COALESCE(seller,''),'items',items,'receipt',receipt);
 SELECT * INTO existing FROM project_expenses WHERE project_id=project AND request_key=idempotency_key;
 IF FOUND THEN
  IF existing.request_payload<>payload THEN RAISE EXCEPTION 'Expense request key reused with different data'; END IF;
  RETURN existing.id;
 END IF;
 INSERT INTO project_expenses(project_id,request_key,request_payload,purchased_on,seller_name,receipt_file_id,created_by,updated_by)
 VALUES(project,idempotency_key,payload,purchase_date,COALESCE(seller,''),receipt,actor,actor)
 ON CONFLICT(project_id,request_key) DO NOTHING RETURNING id INTO expense;
 IF expense IS NULL THEN
  SELECT * INTO existing FROM project_expenses WHERE project_id=project AND request_key=idempotency_key;
  IF existing.request_payload<>payload THEN RAISE EXCEPTION 'Expense request key reused with different data'; END IF;
  RETURN existing.id;
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(items) LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR jsonb_typeof(item->'quantity') IS DISTINCT FROM 'number'
   OR jsonb_typeof(item->'unit_price') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'label') IS DISTINCT FROM 'string'
   THEN RAISE EXCEPTION 'Expense line fields invalid'; END IF;
  IF (item->>'quantity') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Expense quantity must be a positive integer'; END IF;
  IF (item->>'unit_price')::numeric<0 OR scale((item->>'unit_price')::numeric)>2 THEN RAISE EXCEPTION 'Expense price must be nonnegative with at most two decimals'; END IF;
  INSERT INTO project_expense_lines(expense_id,project_id,bom_item_id,label,quantity,unit_price)
  VALUES(expense,project,(item->>'bom_item_id')::uuid,item->>'label',(item->>'quantity')::int,(item->>'unit_price')::numeric);
 END LOOP;
 UPDATE project_expenses SET status='POSTED' WHERE id=expense;
 RETURN expense;
END $$;
CREATE FUNCTION void_project_expense(actor UUID,expense UUID,expected_revision INT,reason TEXT)
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current_expense project_expenses%ROWTYPE;
BEGIN
 SELECT * INTO current_expense FROM project_expenses WHERE id=expense FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found'; END IF;
 IF NOT team_member(actor,current_expense.project_id) THEN RAISE EXCEPTION 'Finance actor must be a current teammate'; END IF;
 IF expected_revision IS NULL OR current_expense.revision<>expected_revision THEN RAISE EXCEPTION 'Finance revision conflict'; END IF;
 UPDATE project_expenses SET status='VOIDED',updated_by=actor,void_reason=reason WHERE id=expense;
 RETURN expense;
END $$;
CREATE FUNCTION set_project_bom_needed(actor UUID,item UUID,expected_revision INT,needed BOOLEAN,reason TEXT DEFAULT '')
RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current_item project_bom_items%ROWTYPE;
BEGIN
 SELECT * INTO current_item FROM project_bom_items WHERE id=item FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'BOM item not found'; END IF;
 IF NOT team_member(actor,current_item.project_id) THEN RAISE EXCEPTION 'Finance actor must be a current teammate'; END IF;
 IF expected_revision IS NULL OR current_item.revision<>expected_revision THEN RAISE EXCEPTION 'Finance revision conflict'; END IF;
 UPDATE project_bom_items SET is_needed=needed,not_needed_reason=CASE WHEN needed THEN '' ELSE COALESCE(reason,'') END,updated_by=actor WHERE id=item;
 RETURN item;
END $$;

CREATE VIEW project_expense_totals AS
 SELECT e.id,e.project_id,e.status,COALESCE(sum(l.total),0) AS amount
 FROM project_expenses e LEFT JOIN project_expense_lines l ON l.expense_id=e.id GROUP BY e.id;
CREATE VIEW project_bom_summary AS
 SELECT b.*,
 COALESCE(q.acquired_quantity,0) AS acquired_quantity,
 CASE WHEN NOT b.is_needed THEN 0 ELSE greatest(b.quantity_required-COALESCE(q.acquired_quantity,0),0) END AS missing_quantity,
 CASE WHEN NOT b.is_needed THEN 'NOT_NEEDED'
  WHEN COALESCE(q.acquired_quantity,0)>=b.quantity_required THEN 'ACQUIRED'
  WHEN COALESCE(q.acquired_quantity,0)>0 THEN 'PARTIAL' ELSE 'NEEDED' END AS supply_status
 FROM project_bom_items b LEFT JOIN LATERAL(
  SELECT sum(l.quantity) AS acquired_quantity FROM project_expense_lines l JOIN project_expenses e ON e.id=l.expense_id
  WHERE l.bom_item_id=b.id AND e.status='POSTED'
 ) q ON true;
CREATE VIEW project_finance_summary AS
 SELECT b.project_id,b.currency,b.amount AS budget,
 COALESCE(s.spent,0) AS spent,b.amount-COALESCE(s.spent,0) AS remaining,
 COALESCE(e.estimated_known,0) AS estimated_known,
 COALESCE(e.unpriced_items,0) AS unpriced_items
 FROM project_budgets b
 LEFT JOIN LATERAL(SELECT sum(t.amount) AS spent FROM project_expense_totals t WHERE t.project_id=b.project_id AND t.status='POSTED') s ON true
 LEFT JOIN LATERAL(SELECT sum(i.quantity_required::numeric*i.estimated_unit_price) AS estimated_known,
 count(*) FILTER(WHERE i.estimated_unit_price IS NULL) AS unpriced_items
 FROM project_bom_items i WHERE i.project_id=b.project_id AND i.is_needed) e ON true;
REVOKE ALL ON project_budgets,project_bom_items,project_expenses,project_expense_lines,project_expense_totals,project_bom_summary,project_finance_summary FROM PUBLIC;
REVOKE ALL ON FUNCTION finance_member_guard(),expense_guard(),expense_line_guard(),validate_posted_expenses(),log_project_finance(),record_project_expense(UUID,UUID,UUID,DATE,TEXT,JSONB,UUID),void_project_expense(UUID,UUID,INT,TEXT),set_project_bom_needed(UUID,UUID,INT,BOOLEAN,TEXT) FROM PUBLIC;
COMMIT;
