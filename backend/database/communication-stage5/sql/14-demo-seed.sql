-- Synthetic communication examples; no real invitations, delivery, credentials or uploaded files.
BEGIN;
SET search_path=labassist_student,public;
DO $$ BEGIN
 IF (SELECT count(*) FROM projects WHERE seed_key ~ '^TEAM[0-9]{2}$')<>23 OR (SELECT count(*) FROM projects WHERE seed_key LIKE 'PAST_TEAM%')<>15
 THEN RAISE EXCEPTION 'Apply the two-semester demo fixtures first'; END IF;
END $$;
-- Historical examples skip only state-entry guards, inside this transaction.
ALTER TABLE chat_messages DISABLE TRIGGER message_scope;
ALTER TABLE meetings DISABLE TRIGGER meeting_scope;
ALTER TABLE meeting_participants DISABLE TRIGGER meeting_participant_scope;
DO $$
DECLARE project RECORD;student UUID;supervisor UUID;conversation UUID;message UUID;meeting UUID;person UUID;starts TIMESTAMPTZ;historical BOOLEAN;
BEGIN
 FOR student IN SELECT id FROM accounts WHERE seed_key ~ '^STU[0-9]{2}$' ORDER BY id LOOP PERFORM open_self_conversation(student);END LOOP;
 FOR project IN SELECT p.*,t.ends_on FROM projects p JOIN academic_terms t ON t.id=p.term_id WHERE p.seed_key ~ '^TEAM[0-9]{2}$' OR p.seed_key LIKE 'PAST_TEAM%' ORDER BY p.seed_key LOOP
  historical=project.seed_key LIKE 'PAST_TEAM%';
  SELECT student_id INTO student FROM project_students WHERE project_id=project.id ORDER BY student_id LIMIT 1;
  SELECT supervisor_id INTO supervisor FROM project_supervisors WHERE project_id=project.id ORDER BY supervisor_id LIMIT 1;
  SELECT id INTO conversation FROM conversations WHERE project_id=project.id;
  message=md5('COMM_DEMO_MESSAGE:'||project.id)::uuid;
  INSERT INTO chat_messages(id,conversation_id,sender_id,request_key,request_payload,body,created_at)
  VALUES(message,conversation,student,md5('COMM_MESSAGE_REQUEST:'||project.id)::uuid,'{"fixture":true}',
   CASE WHEN historical THEN 'The completed project documentation and prototype notes are ready for reference.' ELSE 'Let us prepare the initial sensor checks and review the next steps together.' END,
   CASE WHEN historical THEN project.ends_on::timestamp AT TIME ZONE 'Asia/Hebron' ELSE clock_timestamp()-interval '1 day' END) ON CONFLICT DO NOTHING;
  meeting=md5('COMM_DEMO_MEETING:'||project.id)::uuid;
  starts=CASE WHEN historical THEN (project.ends_on-7)::timestamp AT TIME ZONE 'Asia/Hebron' ELSE (current_date+2)::timestamp AT TIME ZONE 'Asia/Hebron' END+interval '10 hours';
  INSERT INTO meetings(id,seed_key,organizer_id,project_id,conversation_id,request_key,request_payload,title,agenda,starts_at,ends_at,location,status,notes,updated_by,created_at,updated_at)
  VALUES(meeting,'COMM_MEETING_'||project.seed_key,supervisor,project.id,conversation,md5('COMM_MEETING_REQUEST:'||project.id)::uuid,'{"fixture":true}',
   CASE WHEN historical THEN 'Completed project review' ELSE 'Initial project check-in' END,'Review work, questions and next steps.',starts,starts+interval '30 minutes','Workshop',
   CASE WHEN historical THEN 'COMPLETED' ELSE 'SCHEDULED' END,CASE WHEN historical THEN 'Demonstration review notes for the completed project.' ELSE '' END,supervisor,starts-interval '2 days',starts-interval '1 day') ON CONFLICT DO NOTHING;
  FOR person IN SELECT student_id FROM project_students WHERE project_id=project.id AND left_at IS NULL UNION SELECT supervisor LOOP
   INSERT INTO meeting_participants(meeting_id,account_id,invited_by,response,responded_at,invited_at)
   VALUES(meeting,person,supervisor,CASE WHEN historical OR person=supervisor THEN 'ACCEPTED' ELSE 'PENDING' END,
    CASE WHEN historical OR person=supervisor THEN starts-interval '1 day' END,starts-interval '2 days') ON CONFLICT DO NOTHING;
  END LOOP;
 END LOOP;
 -- A direct conversation example does not require a project or group invitation.
 SELECT student_id INTO student FROM project_students WHERE project_id=(SELECT id FROM projects WHERE seed_key='TEAM01') ORDER BY student_id LIMIT 1;
 SELECT account_supervisor_id INTO supervisor FROM accounts WHERE id=student;
 PERFORM open_direct_conversation(student,supervisor);
 -- Demonstration inbox records for the existing first-week submissions, not live delivery.
 FOR project IN SELECT s.id,s.submitted_by FROM report_submissions s JOIN report_documents d ON d.id=s.document_id JOIN projects p ON p.id=d.project_id
  WHERE p.seed_key ~ '^TEAM[0-9]{2}$' AND d.kind='WEEKLY' AND s.seed_key IS NOT NULL LOOP
  PERFORM emit_communication_event('report-submitted:'||project.id,'REPORT_SUBMITTED',project.submitted_by,project.id);
 END LOOP;
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE chat_messages ENABLE TRIGGER message_scope;
ALTER TABLE meetings ENABLE TRIGGER meeting_scope;
ALTER TABLE meeting_participants ENABLE TRIGGER meeting_participant_scope;
COMMIT;
