BEGIN;
SET search_path=labassist_student,public;
DO $$ BEGIN
 IF (SELECT count(*) FROM projects WHERE seed_key ~ '^(TEAM|PAST_TEAM)[0-9]+$' AND subtitle LIKE 'Repository-inspired demo%')<>38
 THEN RAISE EXCEPTION 'Expected 38 sourced project ideas'; END IF;
 IF (SELECT count(*) FROM accounts WHERE seed_key ~ '^(STU|PAST_STU)[0-9]+$')<>89
 THEN RAISE EXCEPTION 'Expected 89 student fixtures'; END IF;
 IF EXISTS(SELECT 1 FROM accounts WHERE password_hash IS NOT NULL OR activated_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Seed must not activate real identities'; END IF;
 IF NOT EXISTS(SELECT 1 FROM accounts WHERE seed_key='REPOSITORY_DEMO_HEAD'
 AND full_name='الدكتور عبد الله راشد' AND employee_number='0' AND status='REFERENCE_ONLY')
 THEN RAISE EXCEPTION 'Head fixture identity incorrect'; END IF;
 IF EXISTS(SELECT 1 FROM projects WHERE seed_key ~ '^(TEAM|PAST_TEAM)[0-9]+$' AND length(abstract)<50)
 THEN RAISE EXCEPTION 'Adapted project summaries required'; END IF;
 IF (SELECT count(*) FROM projects p JOIN academic_terms t ON t.id=p.term_id WHERE t.seed_key='DEMO_TERM' AND p.status='IN_PROGRESS')<>23
 OR (SELECT count(*) FROM projects p JOIN academic_terms t ON t.id=p.term_id WHERE t.seed_key='PREVIOUS_DEMO_TERM' AND p.status='COMPLETED')<>15
 THEN RAISE EXCEPTION 'Term allocation changed'; END IF;
END $$;
SELECT 'PASS: repository seed counts, summaries, head identity and inactive credentials';
ROLLBACK;
