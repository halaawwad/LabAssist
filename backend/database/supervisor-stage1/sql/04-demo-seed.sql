-- Seven existing synthetic supervisor identities; never preset credentials or reset accounts.
BEGIN;
SET search_path=labassist_student,public;
INSERT INTO supervisor_profiles(account_id,specialization)
 SELECT id,'Embedded Systems & Robotics' FROM accounts WHERE seed_key LIKE 'SUP%' AND role='SUPERVISOR'
 ON CONFLICT DO NOTHING;
INSERT INTO supervisor_settings(account_id)
 SELECT id FROM accounts WHERE seed_key LIKE 'SUP%' AND role='SUPERVISOR'
 ON CONFLICT DO NOTHING;
COMMIT;
