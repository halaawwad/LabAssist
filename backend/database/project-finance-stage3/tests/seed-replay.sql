-- Disposable database only; edits are retained for the assertions below.
SET search_path=labassist_student,public;
CREATE TEMP TABLE replay_target AS SELECT id,project_id FROM project_bom_items ORDER BY id LIMIT 1;
UPDATE project_budgets SET amount=333 WHERE project_id=(SELECT project_id FROM replay_target);
UPDATE project_bom_items SET notes='Edited planning note' WHERE id=(SELECT id FROM replay_target);
CREATE TEMP TABLE replay_before AS
 SELECT (SELECT count(*) FROM project_budgets) AS budgets,
 (SELECT count(*) FROM project_bom_items) AS items,
 (SELECT count(*) FROM audit_events) AS events;
\ir ../sql/10-demo-seed.sql
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM project_budgets WHERE project_id=(SELECT project_id FROM replay_target) AND amount=333) THEN RAISE EXCEPTION 'Seed reset edited budget'; END IF;
 IF NOT EXISTS(SELECT 1 FROM project_bom_items WHERE id=(SELECT id FROM replay_target) AND notes='Edited planning note') THEN RAISE EXCEPTION 'Seed reset edited BOM'; END IF;
 IF (SELECT count(*) FROM project_budgets)<>(SELECT budgets FROM replay_before)
 OR (SELECT count(*) FROM project_bom_items)<>(SELECT items FROM replay_before)
 OR (SELECT count(*) FROM audit_events)<>(SELECT events FROM replay_before) THEN RAISE EXCEPTION 'Seed duplicated rows or audit events'; END IF;
END $$;
SELECT 'PASS: seed preserves edits and adds no duplicate rows or audit events';
