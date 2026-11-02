-- Run on a disposable database after acceptance.sql. psql includes are relative to this file.
SET search_path=labassist_student,public;
CREATE TEMP TABLE replay_report AS
 SELECT d.id,d.project_id,d.revision,s.id AS submission_id,
 (SELECT student_id FROM project_students WHERE project_id=d.project_id ORDER BY student_id LIMIT 1) AS actor
 FROM report_documents d JOIN projects p ON p.id=d.project_id
 JOIN report_submissions s ON s.document_id=d.id AND s.state='SUBMITTED'
 WHERE p.seed_key='TEAM01' AND d.kind='WEEKLY';
SELECT revise_weekly_report(actor,submission_id,revision) FROM replay_report;
SELECT save_report_draft(r.actor,d.id,d.revision,jsonb_set(d.draft_content,'{work}','"Student edit preserved after seed replay"'))
 FROM replay_report r JOIN report_documents d ON d.id=r.id;
CREATE TEMP TABLE replay_counts AS SELECT
 (SELECT count(*) FROM reporting_periods) AS periods,
 (SELECT count(*) FROM presentation_templates) AS templates,
 (SELECT count(*) FROM report_documents) AS documents,
 (SELECT count(*) FROM report_versions) AS versions,
 (SELECT count(*) FROM report_submissions) AS submissions,
 (SELECT count(*) FROM report_feedback) AS feedback,
 (SELECT count(*) FROM report_submission_windows) AS windows,
 (SELECT count(*) FROM audit_events) AS audit;
\ir ../sql/12-demo-seed.sql
\ir ../sql/12-demo-seed.sql
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM report_documents d JOIN replay_report r ON r.id=d.id
  WHERE d.state='DRAFT' AND d.draft_content->>'work'='Student edit preserved after seed replay')
 THEN RAISE EXCEPTION 'Report seed overwrote student work'; END IF;
 IF EXISTS(SELECT 1 FROM report_submissions s JOIN replay_report r ON r.submission_id=s.id WHERE s.state<>'SUPERSEDED')
 THEN RAISE EXCEPTION 'Report seed restored an obsolete submission'; END IF;
 IF EXISTS(SELECT 1 FROM replay_counts WHERE periods<>(SELECT count(*) FROM reporting_periods)
  OR templates<>(SELECT count(*) FROM presentation_templates) OR documents<>(SELECT count(*) FROM report_documents)
  OR versions<>(SELECT count(*) FROM report_versions) OR submissions<>(SELECT count(*) FROM report_submissions)
  OR feedback<>(SELECT count(*) FROM report_feedback) OR windows<>(SELECT count(*) FROM report_submission_windows)
  OR audit<>(SELECT count(*) FROM audit_events)) THEN RAISE EXCEPTION 'Seed replay duplicated report data or audit events'; END IF;
 IF EXISTS(SELECT 1 FROM accounts WHERE seed_key ~ '^STU[0-9]+$' AND status<>'PENDING_ACTIVATION')
 THEN RAISE EXCEPTION 'Seed replay changed activation fixtures'; END IF;
END $$;
SELECT 'PASS: repeated report seed preserves edits, retired submissions, activation fixtures and all row counts';
