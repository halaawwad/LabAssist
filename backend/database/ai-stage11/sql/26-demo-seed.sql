-- Student context and a queued job only. No fabricated model answers, images or dimensions.
BEGIN;SET search_path=labassist_student,public;
DO $$ DECLARE owner UUID;project UUID;conversation UUID=md5('DEMO_AI_CONVERSATION')::uuid;BEGIN
 SELECT p.id,s.student_id INTO project,owner FROM projects p JOIN project_students s ON s.project_id=p.id WHERE p.seed_key='TEAM01' ORDER BY s.student_id LIMIT 1;
 INSERT INTO ai_conversations(id,seed_key,owner_id,project_id,title) VALUES(conversation,'DEMO_AI_CONVERSATION',owner,project,'Initial project design questions') ON CONFLICT DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM ai_messages WHERE conversation_id=conversation) THEN PERFORM append_ai_message(owner,conversation,0,md5('DEMO_AI_MESSAGE')::uuid,'Help me check the parts for my prototype and explain how an estimated enclosure size would be justified.');END IF;
 IF NOT EXISTS(SELECT 1 FROM ai_jobs WHERE conversation_id=conversation) THEN PERFORM request_ai_job(owner,conversation,(SELECT revision FROM ai_conversations WHERE id=conversation),md5('DEMO_AI_JOB')::uuid,'DESIGN');END IF;
END $$;COMMIT;
