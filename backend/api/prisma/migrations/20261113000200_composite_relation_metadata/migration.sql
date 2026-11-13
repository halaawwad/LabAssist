-- Redundant unique keys make existing one-to-one composite foreign keys explicit for Prisma.
BEGIN;
SET search_path=labassist_student,public;
ALTER TABLE ai_messages ADD UNIQUE (job_id, conversation_id);
ALTER TABLE circuit_documents ADD UNIQUE (head_version, id);
ALTER TABLE circuit_documents ADD UNIQUE (share_checkpoint_version, id);
ALTER TABLE circuit_forks ADD UNIQUE (copy_id, owner_id);
ALTER TABLE circuit_publications ADD UNIQUE (version_id, circuit_id);
ALTER TABLE workshop_table_assignments ADD UNIQUE (project_id, term_id);
COMMIT;
