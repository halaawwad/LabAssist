-- Disposable database only. This test intentionally retains changed personal state.
SET search_path=labassist_student,public;
CREATE TEMP TABLE replay_target AS SELECT p.id AS project,c.id AS chat,
 (SELECT student_id FROM project_students WHERE project_id=p.id ORDER BY student_id LIMIT 1) AS student,
 (SELECT id FROM meetings WHERE seed_key='COMM_MEETING_TEAM01') AS meeting
 FROM projects p JOIN conversations c ON c.project_id=p.id WHERE p.seed_key='TEAM01';
SELECT update_conversation(student,chat,(SELECT revision FROM conversations WHERE id=chat),'Student group name') FROM replay_target;
SELECT update_conversation_preferences(student,chat,(SELECT revision FROM conversation_members WHERE conversation_id=chat AND account_id=student),true,true) FROM replay_target;
SELECT respond_to_meeting(student,meeting,(SELECT revision FROM meeting_participants WHERE meeting_id=meeting AND account_id=student),'ACCEPTED') FROM replay_target;
CREATE TEMP TABLE replay_message AS SELECT send_chat_message(student,open_self_conversation(student),gen_random_uuid(),'Student private note retained') AS id FROM replay_target;
SELECT set_message_star(student,(SELECT id FROM replay_message),true) FROM replay_target;
CREATE TEMP TABLE replay_counts AS SELECT
 (SELECT count(*) FROM conversations) AS conversations,(SELECT count(*) FROM conversation_members) AS members,
 (SELECT count(*) FROM chat_messages) AS messages,(SELECT count(*) FROM chat_message_stars) AS stars,
 (SELECT count(*) FROM meetings) AS meetings,(SELECT count(*) FROM meeting_participants) AS participants,
 (SELECT count(*) FROM notification_events) AS events,(SELECT count(*) FROM notification_inbox) AS inbox,
 (SELECT count(*) FROM audit_events) AS audit;
\ir ../sql/14-demo-seed.sql
\ir ../sql/14-demo-seed.sql
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM replay_target r JOIN conversations c ON c.id=r.chat WHERE c.name='Student group name') THEN RAISE EXCEPTION 'Seed reset group name'; END IF;
 IF NOT EXISTS(SELECT 1 FROM replay_target r JOIN conversation_members m ON m.conversation_id=r.chat AND m.account_id=r.student WHERE m.starred AND m.muted) THEN RAISE EXCEPTION 'Seed reset private conversation preferences'; END IF;
 IF NOT EXISTS(SELECT 1 FROM replay_target r JOIN meeting_participants p ON p.meeting_id=r.meeting AND p.account_id=r.student WHERE p.response='ACCEPTED' AND p.revision=1) THEN RAISE EXCEPTION 'Seed reset invitation response'; END IF;
 IF NOT EXISTS(SELECT 1 FROM chat_messages m JOIN replay_message r ON r.id=m.id JOIN chat_message_stars s ON s.message_id=m.id WHERE m.body='Student private note retained') THEN RAISE EXCEPTION 'Seed lost a private message or star'; END IF;
 IF EXISTS(SELECT 1 FROM replay_counts WHERE conversations<>(SELECT count(*) FROM conversations) OR members<>(SELECT count(*) FROM conversation_members)
  OR messages<>(SELECT count(*) FROM chat_messages) OR stars<>(SELECT count(*) FROM chat_message_stars) OR meetings<>(SELECT count(*) FROM meetings)
  OR participants<>(SELECT count(*) FROM meeting_participants) OR events<>(SELECT count(*) FROM notification_events) OR inbox<>(SELECT count(*) FROM notification_inbox)
  OR audit<>(SELECT count(*) FROM audit_events)) THEN RAISE EXCEPTION 'Seed created duplicate rows or side effects'; END IF;
 IF EXISTS(SELECT 1 FROM accounts WHERE seed_key ~ '^STU[0-9]{2}$' AND status<>'PENDING_ACTIVATION') OR EXISTS(SELECT 1 FROM activation_invitations) THEN RAISE EXCEPTION 'Activation fixtures changed'; END IF;
END $$;
SELECT 'PASS: replay preserves custom group names, private preferences, invitation responses, notes and stars without duplicate effects';
