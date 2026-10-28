-- Synthetic reference identity, not a usable login. No passwords or tokens.
BEGIN;
SET search_path=labassist_student,public;
INSERT INTO accounts(id,seed_key,role,full_name,email,status)
 VALUES('30000000-0000-4000-8000-000000000001','WORKSHOP_MANAGER_DEMO','WORKSHOP_MANAGER','Demo Workshop Manager','demo.workshop@najah.edu','REFERENCE_ONLY')
 ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO workshop_manager_profiles(account_id) SELECT id FROM accounts WHERE seed_key='WORKSHOP_MANAGER_DEMO' ON CONFLICT DO NOTHING;
INSERT INTO workshop_manager_settings(account_id) SELECT id FROM accounts WHERE seed_key='WORKSHOP_MANAGER_DEMO' ON CONFLICT DO NOTHING;
-- No historical attendance, fixed absence threshold, lending stock or sent notices are invented.
COMMIT;
