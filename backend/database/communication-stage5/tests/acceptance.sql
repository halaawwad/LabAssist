BEGIN;
SET search_path=labassist_student,public;
CREATE FUNCTION pg_temp.ok(label TEXT,value BOOLEAN) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label;END IF;RETURN 'PASS: '||label;END $$;
CREATE FUNCTION pg_temp.reject(label TEXT,statement TEXT,expected TEXT) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE statement;EXCEPTION WHEN OTHERS THEN
  IF strpos(lower(SQLERRM),lower(expected))=0 THEN RAISE EXCEPTION 'FAILED %: unexpected %',label,SQLERRM;END IF;
  RETURN 'PASS: '||label;
 END;RAISE EXCEPTION 'FAILED: % was accepted',label;
END $$;
CREATE TEMP TABLE f AS SELECT p.id AS project,p.term_id,
 (SELECT student_id FROM project_students WHERE project_id=p.id ORDER BY student_id LIMIT 1) AS owner,
 (SELECT student_id FROM project_students WHERE project_id=p.id ORDER BY student_id OFFSET 1 LIMIT 1) AS teammate,
 (SELECT student_id FROM project_students WHERE project_id<>p.id AND term_id=p.term_id ORDER BY student_id LIMIT 1) AS outsider,
 (SELECT supervisor_id FROM project_supervisors WHERE project_id=p.id ORDER BY supervisor_id LIMIT 1) AS supervisor,
 (SELECT id FROM accounts WHERE role='WORKSHOP_MANAGER' LIMIT 1) AS manager,
 (SELECT id FROM conversations WHERE project_id=p.id) AS chat
 FROM projects p WHERE seed_key='TEAM01';
CREATE TEMP TABLE ids(key TEXT PRIMARY KEY,id UUID NOT NULL);
CREATE TEMP TABLE counts(key TEXT PRIMARY KEY,value BIGINT NOT NULL);

SELECT pg_temp.ok('one automatic conversation for every project',(SELECT count(*)=38 FROM conversations WHERE kind='PROJECT'));
SELECT pg_temp.ok('all current students have private self conversations',(SELECT count(*)=54 FROM conversations WHERE kind='SELF'));
SELECT pg_temp.ok('project chat membership matches students and every linked supervisor',NOT EXISTS(
 SELECT 1 FROM conversations c JOIN conversation_members m ON m.conversation_id=c.id WHERE c.kind='PROJECT' AND m.active AND NOT (team_member(m.account_id,c.project_id) OR project_supervisor(m.account_id,c.project_id))) AND NOT EXISTS(
 SELECT 1 FROM conversations c JOIN project_students s ON s.project_id=c.project_id WHERE c.kind='PROJECT' AND s.left_at IS NULL AND NOT EXISTS(SELECT 1 FROM conversation_members m WHERE m.conversation_id=c.id AND m.account_id=s.student_id AND m.active)) AND NOT EXISTS(
 SELECT 1 FROM conversations c JOIN project_supervisors s ON s.project_id=c.project_id WHERE c.kind='PROJECT' AND NOT EXISTS(SELECT 1 FROM conversation_members m WHERE m.conversation_id=c.id AND m.account_id=s.supervisor_id AND m.active)));
SELECT pg_temp.ok('previous semester meetings are completed',(SELECT count(*)=15 FROM meetings WHERE seed_key LIKE 'COMM_MEETING_PAST_TEAM%' AND status='COMPLETED'));
SELECT pg_temp.ok('current semester meeting examples are scheduled',(SELECT count(*)=23 FROM meetings WHERE seed_key ~ '^COMM_MEETING_TEAM[0-9]{2}$' AND status='SCHEDULED'));
SELECT pg_temp.ok('seed does not create upload or activation credentials',NOT EXISTS(SELECT 1 FROM chat_message_files) AND NOT EXISTS(SELECT 1 FROM activation_invitations));
SELECT pg_temp.ok('invitation notifications target only the invited recipient',NOT EXISTS(
 SELECT 1 FROM notification_events e JOIN notification_inbox i ON i.event_id=e.id WHERE e.kind='MEETING_INVITE' AND i.recipient_id::text IS DISTINCT FROM e.data->>'target'));
SELECT pg_temp.ok('organizer receives no self invitation alert',NOT EXISTS(SELECT 1 FROM notification_events e JOIN notification_inbox i ON i.event_id=e.id WHERE e.kind='MEETING_INVITE' AND i.recipient_id=e.actor_id));
SELECT pg_temp.ok('historical message alerts retain the original source date',NOT EXISTS(SELECT 1 FROM notification_events e JOIN chat_messages m ON m.id=e.message_id WHERE e.created_at<>m.created_at));
SELECT pg_temp.ok('current first-week report notifications reach project supervisors',(SELECT count(*)=23 FROM notification_events WHERE kind='REPORT_SUBMITTED'));
CREATE TEMP TABLE extra_supervisor AS SELECT a.id FROM accounts a CROSS JOIN f WHERE a.role='SUPERVISOR'
 AND NOT project_supervisor(a.id,f.project) AND (SELECT count(*) FROM project_supervisors ps JOIN projects p ON p.id=ps.project_id WHERE ps.supervisor_id=a.id AND p.term_id=f.term_id)<4 ORDER BY a.id LIMIT 1;
INSERT INTO project_supervisors(project_id,supervisor_id) SELECT f.project,e.id FROM f CROSS JOIN extra_supervisor e;
SELECT pg_temp.ok('newly linked project supervisor joins automatically',EXISTS(SELECT 1 FROM conversation_members m CROSS JOIN f CROSS JOIN extra_supervisor e WHERE m.conversation_id=f.chat AND m.account_id=e.id AND m.active));
DELETE FROM project_supervisors WHERE project_id=(SELECT project FROM f) AND supervisor_id=(SELECT id FROM extra_supervisor);
SELECT pg_temp.ok('removed supervisor loses current group access',NOT conversation_access((SELECT id FROM extra_supervisor),(SELECT chat FROM f)) AND EXISTS(SELECT 1 FROM conversation_members WHERE conversation_id=(SELECT chat FROM f) AND account_id=(SELECT id FROM extra_supervisor) AND NOT active));
SELECT pg_temp.ok('search uses real accounts across teams',(SELECT EXISTS(SELECT 1 FROM search_chat_people(f.owner,(SELECT university_number FROM accounts WHERE id=f.outsider)) WHERE id=f.outsider) FROM f));
SELECT pg_temp.reject('disabled historical accounts cannot start conversations',$q$SELECT open_self_conversation((SELECT id FROM accounts WHERE seed_key='PAST_STU01'))$q$,'registered');
SELECT pg_temp.ok('self conversation retry returns the same workspace',(SELECT open_self_conversation(owner)=open_self_conversation(owner) FROM f));
INSERT INTO ids SELECT 'self',open_self_conversation(owner) FROM f;
SELECT pg_temp.reject('another student cannot read private self messages',$q$SELECT read_chat_messages(f.teammate,(SELECT id FROM ids WHERE key='self')) FROM f$q$,'access denied');
SELECT pg_temp.ok('direct conversation is symmetric and unique',(SELECT open_direct_conversation(owner,outsider)=open_direct_conversation(outsider,owner) FROM f));
INSERT INTO ids SELECT 'direct',open_direct_conversation(owner,outsider) FROM f;
SELECT pg_temp.reject('project supervisor cannot read a student private direct chat',$q$SELECT read_chat_messages(supervisor,(SELECT id FROM ids WHERE key='direct')) FROM f$q$,'access denied');
SELECT pg_temp.reject('foreign participant cannot be added to project chat',$q$INSERT INTO conversation_members(conversation_id,account_id) SELECT chat,outsider FROM f$q$,'scope');
SELECT pg_temp.reject('outsider cannot rename the group',$q$SELECT update_conversation(outsider,chat,0,'Wrong') FROM f$q$,'editable');
SELECT update_conversation(owner,chat,0,'Our prototype team') FROM f;
SELECT pg_temp.reject('group rename requires the current revision',$q$SELECT update_conversation(teammate,chat,0,'Stale') FROM f$q$,'revision conflict');
INSERT INTO files(id,uploaded_by,storage_key,original_name,mime_type,byte_size,sha256,status)
 SELECT '55000000-0000-4000-8000-000000000001'::uuid,owner,'acceptance/chat-photo','group.png','image/png',80,repeat('a',64),'READY' FROM f
 UNION ALL SELECT '55000000-0000-4000-8000-000000000002',outsider,'acceptance/foreign-file','foreign.pdf','application/pdf',40,repeat('b',64),'READY' FROM f
 UNION ALL SELECT '55000000-0000-4000-8000-000000000003',owner,'acceptance/pending-file','pending.png','image/png',40,NULL,'PENDING' FROM f;
SELECT update_conversation(teammate,chat,1,'Our prototype team','55000000-0000-4000-8000-000000000001') FROM f;
SELECT pg_temp.ok('group photo references a participant image',(SELECT photo_file_id='55000000-0000-4000-8000-000000000001' FROM conversations WHERE id=(SELECT chat FROM f)));
SELECT pg_temp.reject('foreign photo cannot be assigned',$q$SELECT update_conversation(owner,chat,2,'Wrong','55000000-0000-4000-8000-000000000002') FROM f$q$,'participant image');
SELECT update_conversation_preferences(owner,chat,0,true,true) FROM f;
SELECT pg_temp.ok('conversation star and mute are personal',(SELECT bool_and(CASE WHEN m.account_id=f.owner THEN m.starred AND m.muted ELSE NOT m.starred AND NOT m.muted END) FROM conversation_members m CROSS JOIN f WHERE m.conversation_id=f.chat));
SELECT pg_temp.reject('outsider cannot change conversation preferences',$q$SELECT update_conversation_preferences(outsider,chat,0,true,true) FROM f$q$,'access denied');
SELECT pg_temp.reject('empty message rejected',$q$SELECT send_chat_message(owner,chat,gen_random_uuid()) FROM f$q$,'content required');
SELECT pg_temp.reject('outsider cannot send group messages',$q$SELECT send_chat_message(outsider,chat,gen_random_uuid(),'Wrong') FROM f$q$,'membership');
INSERT INTO ids SELECT 'message',send_chat_message(owner,chat,'55000000-0000-4000-8000-000000000010','Sensor notes') FROM f;
SELECT pg_temp.ok('retry of the same message returns one record',(SELECT send_chat_message(owner,chat,'55000000-0000-4000-8000-000000000010','Sensor notes')=(SELECT id FROM ids WHERE key='message') FROM f));
SELECT pg_temp.reject('message retry key cannot change its payload',$q$SELECT send_chat_message(owner,chat,'55000000-0000-4000-8000-000000000010','Changed') FROM f$q$,'different data');
SELECT pg_temp.reject('message text is immutable',$q$UPDATE chat_messages SET body='Changed' WHERE id=(SELECT id FROM ids WHERE key='message')$q$,'immutable');
SELECT pg_temp.reject('committed messages cannot gain links later',$q$INSERT INTO chat_message_links SELECT m.id,'https://example.com/late','Late' FROM chat_messages m CROSS JOIN f WHERE m.conversation_id=f.chat AND m.request_payload='{"fixture":true}' LIMIT 1$q$,'frozen');
INSERT INTO ids SELECT 'reply',send_chat_message(teammate,chat,gen_random_uuid(),'I will test it.',(SELECT id FROM ids WHERE key='message')) FROM f;
SELECT pg_temp.ok('reply references the original message in this conversation',(SELECT reply_to=(SELECT id FROM ids WHERE key='message') FROM chat_messages WHERE id=(SELECT id FROM ids WHERE key='reply')));
SELECT pg_temp.reject('reply cannot reference another conversation',$q$SELECT send_chat_message(owner,(SELECT id FROM ids WHERE key='self'),gen_random_uuid(),'Wrong',(SELECT id FROM ids WHERE key='message')) FROM f$q$,'foreign key');
INSERT INTO counts SELECT 'failed-send-messages',count(*) FROM chat_messages;
INSERT INTO counts SELECT 'failed-send-events',count(*) FROM notification_events;
INSERT INTO counts SELECT 'failed-send-inbox',count(*) FROM notification_inbox;
SELECT pg_temp.reject('attachment must be sender owned',$q$SELECT send_chat_message(owner,chat,gen_random_uuid(),'Wrong',NULL,NULL,'[{"file_id":"55000000-0000-4000-8000-000000000002"}]') FROM f$q$,'belong to sender');
SELECT pg_temp.reject('pending upload cannot be sent',$q$SELECT send_chat_message(owner,chat,gen_random_uuid(),'Wrong',NULL,NULL,'[{"file_id":"55000000-0000-4000-8000-000000000003"}]') FROM f$q$,'ready hashed');
SELECT pg_temp.ok('failed attachment send rolls back message and notification side effects',
 (SELECT value=(SELECT count(*) FROM chat_messages) FROM counts WHERE key='failed-send-messages') AND
 (SELECT value=(SELECT count(*) FROM notification_events) FROM counts WHERE key='failed-send-events') AND
 (SELECT value=(SELECT count(*) FROM notification_inbox) FROM counts WHERE key='failed-send-inbox'));
INSERT INTO ids SELECT 'attachment',send_chat_message(owner,chat,gen_random_uuid(),'',NULL,NULL,'[{"file_id":"55000000-0000-4000-8000-000000000001"}]','[{"url":"https://example.com/datasheet","label":"Datasheet"}]') FROM f;
SELECT pg_temp.ok('attachment metadata is frozen',(SELECT original_name='group.png' AND sha256=repeat('a',64) FROM chat_message_files WHERE message_id=(SELECT id FROM ids WHERE key='attachment')));
SELECT pg_temp.reject('unsafe link schemes rejected',$q$SELECT send_chat_message(owner,chat,gen_random_uuid(),'Bad',NULL,NULL,'[]','[{"url":"javascript:alert(1)"}]') FROM f$q$,'check constraint');
INSERT INTO ids SELECT 'forward',send_chat_message(teammate,open_self_conversation(teammate),gen_random_uuid(),'',NULL,(SELECT id FROM ids WHERE key='attachment')) FROM f;
SELECT pg_temp.ok('forward copies accessible source files and links',(SELECT count(*)=1 FROM chat_message_files WHERE message_id=(SELECT id FROM ids WHERE key='forward')) AND (SELECT count(*)=1 FROM chat_message_links WHERE message_id=(SELECT id FROM ids WHERE key='forward')));
SELECT pg_temp.reject('forward cannot read another persons self chat',$q$SELECT send_chat_message(owner,chat,gen_random_uuid(),'',NULL,(SELECT id FROM ids WHERE key='forward')) FROM f$q$,'source access denied');
SELECT pg_temp.ok('read response hides private forward source identifiers',NOT EXISTS(SELECT 1 FROM jsonb_array_elements(read_chat_messages((SELECT teammate FROM f),open_self_conversation((SELECT teammate FROM f)))) x WHERE x ? 'forward_from'));
SELECT set_message_star(owner,(SELECT id FROM ids WHERE key='message'),true) FROM f;
SELECT pg_temp.ok('message star belongs only to the starring account',(SELECT count(*)=1 FROM chat_message_stars WHERE message_id=(SELECT id FROM ids WHERE key='message') AND account_id=(SELECT owner FROM f)));
SELECT pg_temp.reject('outsider cannot star private messages',$q$SELECT set_message_star(outsider,(SELECT id FROM ids WHERE key='message'),true) FROM f$q$,'access denied');
SELECT mark_conversation_read(teammate,chat,(SELECT id FROM ids WHERE key='attachment')) FROM f;
SELECT mark_conversation_read(teammate,chat,(SELECT id FROM ids WHERE key='message')) FROM f;
SELECT pg_temp.ok('read cursors never move backwards',(SELECT m.last_read_sequence=x.sequence FROM conversation_members m CROSS JOIN f JOIN chat_messages x ON x.id=(SELECT id FROM ids WHERE key='attachment') WHERE m.conversation_id=f.chat AND m.account_id=f.teammate));
SELECT pg_temp.reject('read cursor cannot point into another conversation',$q$SELECT mark_conversation_read(teammate,chat,(SELECT id FROM ids WHERE key='forward')) FROM f$q$,'this conversation');
SELECT pg_temp.ok('muted recipient gets no new message alert',NOT EXISTS(SELECT 1 FROM notification_events e JOIN notification_inbox i ON i.event_id=e.id WHERE e.message_id=(SELECT id FROM ids WHERE key='reply') AND i.recipient_id=(SELECT owner FROM f)));

INSERT INTO ids SELECT 'meeting',create_meeting(owner,'55000000-0000-4000-8000-000000000020','Independent meeting',now()+interval '3 days',now()+interval '3 days 30 minutes',ARRAY[teammate,outsider],'Review the sensor','Workshop') FROM f;
SELECT pg_temp.ok('meeting does not require a project or conversation',(SELECT project_id IS NULL AND conversation_id IS NULL FROM meetings WHERE id=(SELECT id FROM ids WHERE key='meeting')));
SELECT pg_temp.ok('organizer accepted, other invitees pending',(SELECT bool_and(CASE WHEN p.account_id=f.owner THEN p.response='ACCEPTED' ELSE p.response='PENDING' END) FROM meeting_participants p CROSS JOIN f WHERE p.meeting_id=(SELECT id FROM ids WHERE key='meeting')));
SELECT pg_temp.ok('duplicate meeting request has one result',(SELECT create_meeting(owner,'55000000-0000-4000-8000-000000000020','Independent meeting',now()+interval '3 days',now()+interval '3 days 30 minutes',ARRAY[outsider,teammate],'Review the sensor','Workshop')=(SELECT id FROM ids WHERE key='meeting') FROM f));
SELECT pg_temp.reject('changed meeting request key is rejected',$q$SELECT create_meeting(owner,'55000000-0000-4000-8000-000000000020','Changed',now()+interval '3 days',now()+interval '3 days 30 minutes',ARRAY[outsider,teammate]) FROM f$q$,'different data');
SELECT pg_temp.reject('invited student cannot change another invitation',$q$SELECT respond_to_meeting(supervisor,(SELECT id FROM ids WHERE key='meeting'),0,'ACCEPTED') FROM f$q$,'invited participant');
SELECT respond_to_meeting(teammate,(SELECT id FROM ids WHERE key='meeting'),0,'ACCEPTED') FROM f;
SELECT respond_to_meeting(outsider,(SELECT id FROM ids WHERE key='meeting'),0,'DECLINED') FROM f;
SELECT pg_temp.ok('each invitee controls their own acceptance',(SELECT count(*)=1 FROM meeting_participants WHERE meeting_id=(SELECT id FROM ids WHERE key='meeting') AND account_id=(SELECT teammate FROM f) AND response='ACCEPTED') AND (SELECT count(*)=1 FROM meeting_participants WHERE meeting_id=(SELECT id FROM ids WHERE key='meeting') AND response='DECLINED'));
SELECT pg_temp.reject('stale invitation response conflicts',$q$SELECT respond_to_meeting(teammate,(SELECT id FROM ids WHERE key='meeting'),0,'DECLINED') FROM f$q$,'revision conflict');
SELECT pg_temp.reject('uninvited supervisor cannot read the meeting',$q$SELECT read_meeting(supervisor,(SELECT id FROM ids WHERE key='meeting')) FROM f$q$,'access denied');
SELECT pg_temp.reject('invitee cannot invite other people',$q$SELECT invite_to_meeting(teammate,(SELECT id FROM ids WHERE key='meeting'),supervisor) FROM f$q$,'organizer');
SELECT invite_to_meeting(owner,(SELECT id FROM ids WHERE key='meeting'),manager) FROM f;
SELECT pg_temp.ok('organizer can invite workshop manager independently',EXISTS(SELECT 1 FROM meeting_participants WHERE meeting_id=(SELECT id FROM ids WHERE key='meeting') AND account_id=(SELECT manager FROM f)));
SELECT pg_temp.reject('invitee cannot edit meeting details',$q$SELECT update_meeting(teammate,(SELECT id FROM ids WHERE key='meeting'),0,'Wrong',now()+interval '3 days',now()+interval '3 days 30 minutes','','',NULL) FROM f$q$,'organizer');
SELECT update_meeting(owner,(SELECT id FROM ids WHERE key='meeting'),0,'Independent meeting',now()+interval '4 days',now()+interval '4 days 30 minutes','Updated agenda','Workshop',NULL) FROM f;
SELECT pg_temp.ok('rescheduling resets invitation responses for confirmation',(SELECT bool_and(response='PENDING' AND responded_at IS NULL) FROM meeting_participants WHERE meeting_id=(SELECT id FROM ids WHERE key='meeting') AND account_id<>(SELECT owner FROM f)));
SELECT pg_temp.reject('stale meeting edit rejected',$q$SELECT update_meeting(owner,(SELECT id FROM ids WHERE key='meeting'),0,'Wrong',now()+interval '4 days',now()+interval '4 days 30 minutes','','',NULL) FROM f$q$,'revision conflict');
SELECT update_meeting(owner,(SELECT id FROM ids WHERE key='meeting'),1,'Independent meeting',now()+interval '4 days',now()+interval '4 days 30 minutes','Updated agenda','Workshop',NULL,'CANCELLED') FROM f;
SELECT pg_temp.reject('cancelled meeting cannot accept responses',$q$SELECT respond_to_meeting(teammate,(SELECT id FROM ids WHERE key='meeting'),2,'ACCEPTED') FROM f$q$,'closed');
SELECT pg_temp.reject('historical meeting remains read only',$q$SELECT update_meeting(m.organizer_id,m.id,m.revision,m.title,m.starts_at,m.ends_at,m.agenda,m.location,m.meeting_url,'SCHEDULED') FROM meetings m WHERE seed_key='COMM_MEETING_PAST_TEAM01'$q$,'read only');
SELECT pg_temp.reject('meeting cannot attach to a foreign project',$q$SELECT create_meeting(outsider,gen_random_uuid(),'Wrong',now()+interval '2 days',now()+interval '2 days 30 minutes',ARRAY[owner],'','',NULL,project) FROM f$q$,'project access denied');
SELECT pg_temp.reject('new meeting cannot start in the past',$q$SELECT create_meeting(owner,gen_random_uuid(),'Wrong',now()-interval '2 days',now()-interval '2 days -30 minutes',ARRAY[teammate]) FROM f$q$,'future');

INSERT INTO ids SELECT 'event',id FROM notification_events WHERE message_id=(SELECT id FROM ids WHERE key='message');
SELECT pg_temp.reject('inbox cannot contain another projects private message alert',$q$INSERT INTO notification_inbox(event_id,recipient_id) SELECT (SELECT id FROM ids WHERE key='event'),outsider FROM f$q$,'scope invalid');
INSERT INTO counts SELECT 'inbox',count(*) FROM notification_inbox;
SELECT emit_communication_event('message:'||(SELECT id FROM ids WHERE key='message'),'MESSAGE',owner,(SELECT id FROM ids WHERE key='message')) FROM f;
SELECT pg_temp.ok('replayed notification event creates no duplicate inbox rows',(SELECT value=(SELECT count(*) FROM notification_inbox) FROM counts WHERE key='inbox'));
SELECT pg_temp.reject('notification key cannot be reused for another source',$q$SELECT emit_communication_event('message:'||(SELECT id FROM ids WHERE key='message'),'MESSAGE',teammate,(SELECT id FROM ids WHERE key='reply')) FROM f$q$,'different source');
SELECT pg_temp.reject('unrelated person cannot mark another inbox item',$q$SELECT update_notification_state(outsider,(SELECT id FROM ids WHERE key='event')) FROM f$q$,'recipient access denied');
SELECT update_notification_state(teammate,(SELECT id FROM ids WHERE key='event')) FROM f;
SELECT pg_temp.ok('notification read state is per recipient',(SELECT read_at IS NOT NULL FROM notification_inbox WHERE event_id=(SELECT id FROM ids WHERE key='event') AND recipient_id=(SELECT teammate FROM f)) AND (SELECT read_at IS NULL FROM notification_inbox WHERE event_id=(SELECT id FROM ids WHERE key='event') AND recipient_id=(SELECT supervisor FROM f)));
SELECT update_notification_state(teammate,(SELECT id FROM ids WHERE key='event'),true,true) FROM f;
SELECT pg_temp.ok('dismissed notification is hidden only for that recipient',NOT EXISTS(SELECT 1 FROM jsonb_array_elements(read_notifications((SELECT teammate FROM f))) x WHERE x->>'id'=(SELECT id::text FROM ids WHERE key='event')) AND EXISTS(SELECT 1 FROM notification_inbox WHERE event_id=(SELECT id FROM ids WHERE key='event') AND recipient_id=(SELECT supervisor FROM f) AND dismissed_at IS NULL));
SELECT mark_all_notifications_read(teammate) FROM f;
SELECT pg_temp.ok('mark all read affects only the authenticated recipients inbox',NOT EXISTS(SELECT 1 FROM notification_inbox WHERE recipient_id=(SELECT teammate FROM f) AND read_at IS NULL) AND EXISTS(SELECT 1 FROM notification_inbox WHERE event_id=(SELECT id FROM ids WHERE key='event') AND recipient_id=(SELECT supervisor FROM f) AND read_at IS NULL));
SELECT pg_temp.ok('notification events do not copy message or password content',NOT EXISTS(SELECT 1 FROM notification_events WHERE data ?| ARRAY['body','password','token','storage_key']));
SELECT pg_temp.ok('all historical import guards restored',(SELECT bool_and(tgenabled='O') FROM pg_trigger WHERE tgname IN ('message_scope','meeting_scope','meeting_participant_scope')));
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
