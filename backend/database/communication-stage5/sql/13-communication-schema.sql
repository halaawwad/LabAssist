-- PostgreSQL 17. Apply after reports Stage 4. Actor arguments belong to the trusted backend.
BEGIN;
SET search_path=labassist_student,public;

CREATE TABLE conversations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,
 kind TEXT NOT NULL CHECK(kind IN ('SELF','DIRECT','PROJECT')),
 project_id UUID UNIQUE REFERENCES projects(id),owner_id UUID UNIQUE REFERENCES accounts(id),
 peer_low UUID REFERENCES accounts(id),peer_high UUID REFERENCES accounts(id),
 name TEXT NOT NULL DEFAULT '' CHECK(length(name)<=220),photo_file_id UUID REFERENCES files(id),
 created_by UUID NOT NULL REFERENCES accounts(id),revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((kind='PROJECT')=(project_id IS NOT NULL)),CHECK((kind='SELF')=(owner_id IS NOT NULL)),
 CHECK((kind='DIRECT')=(peer_low IS NOT NULL AND peer_high IS NOT NULL)),
 CHECK(kind='DIRECT' OR (peer_low IS NULL AND peer_high IS NULL)),
 CHECK(peer_low IS NULL OR peer_low<peer_high),
 CHECK(kind='PROJECT' OR (name='' AND photo_file_id IS NULL)),UNIQUE(peer_low,peer_high)
);
CREATE TABLE conversation_members (
 conversation_id UUID NOT NULL REFERENCES conversations(id),account_id UUID NOT NULL REFERENCES accounts(id),
 active BOOLEAN NOT NULL DEFAULT true,starred BOOLEAN NOT NULL DEFAULT false,muted BOOLEAN NOT NULL DEFAULT false,
 last_read_sequence BIGINT NOT NULL DEFAULT 0 CHECK(last_read_sequence>=0),
 revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(conversation_id,account_id)
);
CREATE TABLE chat_messages (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
 conversation_id UUID NOT NULL REFERENCES conversations(id),sender_id UUID NOT NULL REFERENCES accounts(id),
 request_key UUID NOT NULL,request_payload JSONB NOT NULL CHECK(jsonb_typeof(request_payload)='object'),
 body TEXT NOT NULL DEFAULT '' CHECK(length(body)<=30000),reply_to UUID,forward_from UUID REFERENCES chat_messages(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),created_txid BIGINT NOT NULL DEFAULT txid_current(),UNIQUE(sender_id,request_key),UNIQUE(id,conversation_id),
 FOREIGN KEY(reply_to,conversation_id) REFERENCES chat_messages(id,conversation_id)
);
CREATE TABLE chat_message_files (
 message_id UUID NOT NULL REFERENCES chat_messages(id),file_id UUID NOT NULL REFERENCES files(id),
 storage_key TEXT NOT NULL,original_name TEXT NOT NULL,mime_type TEXT NOT NULL,byte_size BIGINT NOT NULL,
 sha256 CHAR(64) NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),PRIMARY KEY(message_id,file_id)
);
CREATE TABLE chat_message_links (
 message_id UUID NOT NULL REFERENCES chat_messages(id),url TEXT NOT NULL CHECK(url ~ '^https?://[^[:space:]]+$' AND length(url)<=2048),
 label TEXT NOT NULL DEFAULT '' CHECK(length(label)<=240),PRIMARY KEY(message_id,url)
);
CREATE TABLE chat_message_stars (
 message_id UUID NOT NULL REFERENCES chat_messages(id),account_id UUID NOT NULL REFERENCES accounts(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(message_id,account_id)
);
CREATE TABLE meetings (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),seed_key TEXT UNIQUE,organizer_id UUID NOT NULL REFERENCES accounts(id),
 project_id UUID REFERENCES projects(id),conversation_id UUID REFERENCES conversations(id),
 request_key UUID NOT NULL,request_payload JSONB NOT NULL CHECK(jsonb_typeof(request_payload)='object'),
 title TEXT NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 220),agenda TEXT NOT NULL DEFAULT '',
 starts_at TIMESTAMPTZ NOT NULL,ends_at TIMESTAMPTZ NOT NULL CHECK(ends_at>starts_at),
 location TEXT NOT NULL DEFAULT '',meeting_url TEXT CHECK(meeting_url IS NULL OR meeting_url ~ '^https://[^[:space:]]+$'),
 status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED','COMPLETED','CANCELLED')),
 notes TEXT NOT NULL DEFAULT '',revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),updated_by UUID NOT NULL REFERENCES accounts(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(organizer_id,request_key)
);
CREATE TABLE meeting_participants (
 meeting_id UUID NOT NULL REFERENCES meetings(id),account_id UUID NOT NULL REFERENCES accounts(id),
 invited_by UUID NOT NULL REFERENCES accounts(id),response TEXT NOT NULL DEFAULT 'PENDING' CHECK(response IN ('PENDING','ACCEPTED','DECLINED')),
 responded_at TIMESTAMPTZ,revision INT NOT NULL DEFAULT 0 CHECK(revision>=0),invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(meeting_id,account_id),CHECK((response='PENDING')=(responded_at IS NULL))
);
CREATE TABLE notification_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),event_key TEXT NOT NULL UNIQUE CHECK(length(event_key) BETWEEN 1 AND 240),
 kind TEXT NOT NULL CHECK(kind IN ('MESSAGE','MEETING_INVITE','MEETING_UPDATED','MEETING_RESPONSE','REPORT_SUBMITTED','REPORT_REVIEWED','REPORT_REOPENED')),
 actor_id UUID NOT NULL REFERENCES accounts(id),message_id UUID REFERENCES chat_messages(id),meeting_id UUID REFERENCES meetings(id),
 submission_id UUID REFERENCES report_submissions(id),feedback_id UUID REFERENCES report_feedback(id),document_id UUID REFERENCES report_documents(id),
 data JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(data)='object'),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(message_id,meeting_id,submission_id,feedback_id,document_id)=1),
 CHECK((kind='MESSAGE')=(message_id IS NOT NULL)),
 CHECK((kind IN ('MEETING_INVITE','MEETING_UPDATED','MEETING_RESPONSE'))=(meeting_id IS NOT NULL)),
 CHECK((kind='REPORT_SUBMITTED')=(submission_id IS NOT NULL)),CHECK((kind='REPORT_REVIEWED')=(feedback_id IS NOT NULL)),
 CHECK((kind='REPORT_REOPENED')=(document_id IS NOT NULL))
);
CREATE TABLE notification_inbox (
 event_id UUID NOT NULL REFERENCES notification_events(id),recipient_id UUID NOT NULL REFERENCES accounts(id),
 read_at TIMESTAMPTZ,dismissed_at TIMESTAMPTZ,PRIMARY KEY(event_id,recipient_id),
 CHECK(dismissed_at IS NULL OR read_at IS NOT NULL)
);
CREATE INDEX conversation_member_account ON conversation_members(account_id,conversation_id) WHERE active;
CREATE INDEX chat_timeline ON chat_messages(conversation_id,sequence DESC);
CREATE INDEX meeting_participant_account ON meeting_participants(account_id,meeting_id);
CREATE INDEX meeting_calendar ON meetings(starts_at) WHERE status='SCHEDULED';
CREATE INDEX notification_recipient_unread ON notification_inbox(recipient_id,event_id) WHERE read_at IS NULL AND dismissed_at IS NULL;

CREATE FUNCTION communication_actor(actor UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM accounts a WHERE a.id=actor AND a.status<>'DISABLED' AND
  (a.role IN ('SUPERVISOR','WORKSHOP_MANAGER') OR a.role='STUDENT' AND EXISTS(
   SELECT 1 FROM project_students s WHERE s.student_id=a.id AND s.left_at IS NULL)))
$$;
CREATE FUNCTION conversation_access(actor UUID,conversation UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM conversations c WHERE c.id=conversation AND CASE c.kind
  WHEN 'SELF' THEN c.owner_id=actor WHEN 'DIRECT' THEN actor IN (c.peer_low,c.peer_high)
  ELSE team_member(actor,c.project_id) OR project_supervisor(actor,c.project_id) END)
$$;
CREATE FUNCTION conversation_writable(actor UUID,conversation UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT communication_actor(actor) AND conversation_access(actor,conversation) AND NOT EXISTS(
  SELECT 1 FROM conversations c JOIN projects p ON p.id=c.project_id WHERE c.id=conversation AND p.status IN ('COMPLETED','ARCHIVED'))
$$;
CREATE FUNCTION meeting_access(actor UUID,meeting UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path=labassist_student,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM meetings m WHERE m.id=meeting AND (m.organizer_id=actor OR EXISTS(
  SELECT 1 FROM meeting_participants p WHERE p.meeting_id=m.id AND p.account_id=actor)))
$$;
CREATE FUNCTION communication_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Communication history is immutable'; END $$;
CREATE TRIGGER immutable_message BEFORE UPDATE OR DELETE ON chat_messages FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER immutable_message_file BEFORE UPDATE OR DELETE ON chat_message_files FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER immutable_message_link BEFORE UPDATE OR DELETE ON chat_message_links FOR EACH ROW EXECUTE FUNCTION communication_immutable();
CREATE TRIGGER immutable_notification_event BEFORE UPDATE OR DELETE ON notification_events FOR EACH ROW EXECUTE FUNCTION communication_immutable();

CREATE FUNCTION conversation_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Conversation history cannot be deleted'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.kind,NEW.project_id,NEW.owner_id,NEW.peer_low,NEW.peer_high,NEW.created_by,NEW.created_at) IS DISTINCT FROM
    ROW(OLD.id,OLD.kind,OLD.project_id,OLD.owner_id,OLD.peer_low,OLD.peer_high,OLD.created_by,OLD.created_at)
  THEN RAISE EXCEPTION 'Conversation identity is immutable'; END IF;
  NEW.revision=OLD.revision+1;NEW.updated_at=clock_timestamp();
 ELSE
  IF NEW.kind='SELF' AND NEW.created_by<>NEW.owner_id OR NEW.kind='DIRECT' AND NEW.created_by NOT IN (NEW.peer_low,NEW.peer_high)
  THEN RAISE EXCEPTION 'Conversation creator must be a participant'; END IF;
  IF NEW.kind<>'PROJECT' AND NOT communication_actor(NEW.created_by) THEN RAISE EXCEPTION 'Registered communication account required'; END IF;
  IF NEW.kind='DIRECT' AND (NOT communication_actor(NEW.peer_low) OR NOT communication_actor(NEW.peer_high)) THEN RAISE EXCEPTION 'Registered recipient required'; END IF;
  IF NEW.kind='PROJECT' AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND formed_by=NEW.created_by) THEN RAISE EXCEPTION 'Project conversation identity invalid'; END IF;
 END IF;
 IF NEW.photo_file_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM files f WHERE f.id=NEW.photo_file_id AND f.status='READY'
  AND f.mime_type LIKE 'image/%' AND conversation_access(f.uploaded_by,NEW.id)) THEN RAISE EXCEPTION 'Group photo must be a ready participant image'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER conversation_scope BEFORE INSERT OR UPDATE OR DELETE ON conversations FOR EACH ROW EXECUTE FUNCTION conversation_guard();
CREATE FUNCTION sync_project_conversation(project UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE conversation UUID;
BEGIN
 PERFORM 1 FROM projects WHERE id=project FOR UPDATE;
 INSERT INTO conversations(kind,project_id,name,created_by,created_at,updated_at)
 SELECT 'PROJECT',p.id,p.name,p.formed_by,p.created_at,p.updated_at FROM projects p WHERE p.id=project ON CONFLICT(project_id) DO NOTHING;
 SELECT id INTO conversation FROM conversations WHERE project_id=project;
 UPDATE conversation_members m SET active=false WHERE m.conversation_id=conversation AND NOT
  (team_member(m.account_id,project) OR project_supervisor(m.account_id,project));
 INSERT INTO conversation_members(conversation_id,account_id,joined_at)
 SELECT conversation,student_id,joined_at FROM project_students WHERE project_id=project AND left_at IS NULL
 UNION SELECT conversation,supervisor_id,created_at FROM project_supervisors WHERE project_id=project
 ON CONFLICT(conversation_id,account_id) DO UPDATE SET active=true WHERE NOT conversation_members.active;
 RETURN conversation;
END $$;
CREATE FUNCTION project_chat_sync_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='projects' THEN PERFORM sync_project_conversation(NEW.id);RETURN NEW; END IF;
 IF TG_OP<>'INSERT' THEN PERFORM sync_project_conversation(OLD.project_id); END IF;
 IF TG_OP<>'DELETE' AND (TG_OP='INSERT' OR NEW.project_id IS DISTINCT FROM OLD.project_id) THEN PERFORM sync_project_conversation(NEW.project_id); END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
END $$;
CREATE TRIGGER project_chat_created AFTER INSERT ON projects FOR EACH ROW EXECUTE FUNCTION project_chat_sync_trigger();
CREATE TRIGGER project_chat_students AFTER INSERT OR UPDATE OR DELETE ON project_students FOR EACH ROW EXECUTE FUNCTION project_chat_sync_trigger();
CREATE TRIGGER project_chat_supervisors AFTER INSERT OR UPDATE OR DELETE ON project_supervisors FOR EACH ROW EXECUTE FUNCTION project_chat_sync_trigger();
DO $$ DECLARE project UUID;BEGIN FOR project IN SELECT id FROM projects ORDER BY id LOOP PERFORM sync_project_conversation(project);END LOOP;END $$;

CREATE FUNCTION open_self_conversation(actor UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered communication account required'; END IF;
 PERFORM 1 FROM accounts WHERE id=actor FOR UPDATE;
 INSERT INTO conversations(kind,owner_id,created_by) VALUES('SELF',actor,actor) ON CONFLICT(owner_id) DO NOTHING;
 SELECT id INTO result FROM conversations WHERE owner_id=actor;
 INSERT INTO conversation_members(conversation_id,account_id) VALUES(result,actor) ON CONFLICT DO NOTHING;
 RETURN result;
END $$;
CREATE FUNCTION open_direct_conversation(actor UUID,peer UUID) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;low_id UUID;high_id UUID;
BEGIN
 IF actor=peer THEN RETURN open_self_conversation(actor); END IF;
 IF NOT communication_actor(actor) OR NOT communication_actor(peer) THEN RAISE EXCEPTION 'Registered participants required'; END IF;
 low_id=least(actor,peer);high_id=greatest(actor,peer);
 PERFORM 1 FROM accounts WHERE id=low_id FOR UPDATE;
 INSERT INTO conversations(kind,peer_low,peer_high,created_by) VALUES('DIRECT',low_id,high_id,actor) ON CONFLICT(peer_low,peer_high) DO NOTHING;
 SELECT id INTO result FROM conversations WHERE peer_low=low_id AND peer_high=high_id;
 INSERT INTO conversation_members(conversation_id,account_id) VALUES(result,actor),(result,peer) ON CONFLICT DO NOTHING;
 RETURN result;
END $$;
CREATE FUNCTION update_conversation(actor UUID,conversation UUID,expected_revision INT,title TEXT,photo UUID DEFAULT NULL) RETURNS INT
LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current conversations%ROWTYPE;
BEGIN
 SELECT * INTO current FROM conversations WHERE id=conversation FOR UPDATE;
 IF NOT FOUND OR current.kind<>'PROJECT' OR NOT conversation_writable(actor,conversation) THEN RAISE EXCEPTION 'Editable project conversation required'; END IF;
 IF expected_revision IS NULL OR current.revision<>expected_revision THEN RAISE EXCEPTION 'Conversation revision conflict'; END IF;
 IF length(btrim(title))=0 THEN RAISE EXCEPTION 'Group name required'; END IF;
 UPDATE conversations SET name=title,photo_file_id=photo WHERE id=conversation RETURNING revision INTO expected_revision;
 RETURN expected_revision;
END $$;
CREATE FUNCTION update_conversation_preferences(actor UUID,conversation UUID,expected_revision INT,is_starred BOOLEAN,is_muted BOOLEAN) RETURNS INT
LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current_revision INT;
BEGIN
 IF NOT communication_actor(actor) OR NOT conversation_access(actor,conversation) THEN RAISE EXCEPTION 'Conversation access denied'; END IF;
 SELECT revision INTO current_revision FROM conversation_members WHERE conversation_id=conversation AND account_id=actor AND active FOR UPDATE;
 IF NOT FOUND OR expected_revision IS NULL OR current_revision<>expected_revision THEN RAISE EXCEPTION 'Member revision conflict'; END IF;
 UPDATE conversation_members SET starred=is_starred,muted=is_muted,revision=revision+1 WHERE conversation_id=conversation AND account_id=actor RETURNING revision INTO current_revision;
 RETURN current_revision;
END $$;

CREATE FUNCTION chat_message_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT conversation_writable(NEW.sender_id,NEW.conversation_id) THEN RAISE EXCEPTION 'Writable conversation membership required'; END IF;
 IF NEW.forward_from IS NOT NULL AND NOT EXISTS(SELECT 1 FROM chat_messages m WHERE m.id=NEW.forward_from AND conversation_access(NEW.sender_id,m.conversation_id))
 THEN RAISE EXCEPTION 'Forward source access denied'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER message_scope BEFORE INSERT ON chat_messages FOR EACH ROW EXECUTE FUNCTION chat_message_guard();
CREATE FUNCTION chat_file_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE message chat_messages%ROWTYPE;asset files%ROWTYPE;forward_asset chat_message_files%ROWTYPE;
BEGIN
 SELECT * INTO message FROM chat_messages WHERE id=NEW.message_id;
 IF message.created_txid<>txid_current() THEN RAISE EXCEPTION 'Message attachments must be frozen in the send transaction'; END IF;
 SELECT * INTO asset FROM files WHERE id=NEW.file_id;
 IF NOT FOUND OR asset.status<>'READY' OR asset.sha256 IS NULL THEN RAISE EXCEPTION 'Ready hashed attachment required'; END IF;
 IF message.forward_from IS NOT NULL THEN
  SELECT * INTO forward_asset FROM chat_message_files WHERE message_id=message.forward_from AND file_id=NEW.file_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attachment not present in forward source'; END IF;
  NEW.storage_key=forward_asset.storage_key;NEW.original_name=forward_asset.original_name;NEW.mime_type=forward_asset.mime_type;NEW.byte_size=forward_asset.byte_size;NEW.sha256=forward_asset.sha256;
 ELSE
  IF asset.uploaded_by<>message.sender_id THEN RAISE EXCEPTION 'Attachment must belong to sender'; END IF;
  NEW.storage_key=asset.storage_key;NEW.original_name=asset.original_name;NEW.mime_type=asset.mime_type;NEW.byte_size=asset.byte_size;NEW.sha256=asset.sha256;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER message_file_scope BEFORE INSERT ON chat_message_files FOR EACH ROW EXECUTE FUNCTION chat_file_guard();
CREATE FUNCTION chat_link_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE message chat_messages%ROWTYPE;
BEGIN
 SELECT * INTO message FROM chat_messages WHERE id=NEW.message_id;
 IF message.created_txid<>txid_current() THEN RAISE EXCEPTION 'Message links must be frozen in the send transaction'; END IF;
 IF message.forward_from IS NOT NULL AND NOT EXISTS(SELECT 1 FROM chat_message_links WHERE message_id=message.forward_from AND url=NEW.url AND label=NEW.label)
 THEN RAISE EXCEPTION 'Link not present in forward source'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER message_link_scope BEFORE INSERT ON chat_message_links FOR EACH ROW EXECUTE FUNCTION chat_link_guard();
CREATE FUNCTION chat_content_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF length(btrim(NEW.body))=0 AND NOT EXISTS(SELECT 1 FROM chat_message_files WHERE message_id=NEW.id) AND NOT EXISTS(SELECT 1 FROM chat_message_links WHERE message_id=NEW.id)
 THEN RAISE EXCEPTION 'Message content required'; END IF;RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER message_has_content AFTER INSERT ON chat_messages DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION chat_content_guard();
CREATE FUNCTION communication_member_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NEW.active AND NOT conversation_access(NEW.account_id,NEW.conversation_id) THEN RAISE EXCEPTION 'Conversation member scope invalid'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.conversation_id,NEW.account_id,NEW.joined_at) IS DISTINCT FROM ROW(OLD.conversation_id,OLD.account_id,OLD.joined_at) THEN RAISE EXCEPTION 'Conversation member identity is immutable'; END IF;
  IF NEW.last_read_sequence<OLD.last_read_sequence THEN RAISE EXCEPTION 'Read cursor cannot move backwards'; END IF;
 END IF;
 IF NEW.last_read_sequence<>0 AND NOT EXISTS(SELECT 1 FROM chat_messages WHERE conversation_id=NEW.conversation_id AND sequence=NEW.last_read_sequence) THEN RAISE EXCEPTION 'Read cursor must target this conversation'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER conversation_member_scope BEFORE INSERT OR UPDATE ON conversation_members FOR EACH ROW EXECUTE FUNCTION communication_member_guard();
CREATE FUNCTION chat_star_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM chat_messages m WHERE m.id=NEW.message_id AND conversation_access(NEW.account_id,m.conversation_id)) THEN RAISE EXCEPTION 'Message star access denied'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER message_star_scope BEFORE INSERT OR UPDATE ON chat_message_stars FOR EACH ROW EXECUTE FUNCTION chat_star_guard();
CREATE FUNCTION send_chat_message(actor UUID,conversation UUID,request UUID,text_body TEXT DEFAULT '',reply UUID DEFAULT NULL,forward UUID DEFAULT NULL,
 attachments JSONB DEFAULT '[]',links JSONB DEFAULT '[]') RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE existing chat_messages%ROWTYPE;source chat_messages%ROWTYPE;payload JSONB;message UUID;entry JSONB;actual_body TEXT;
BEGIN
 PERFORM 1 FROM conversations WHERE id=conversation FOR UPDATE;
 IF NOT FOUND OR NOT conversation_writable(actor,conversation) THEN RAISE EXCEPTION 'Writable conversation membership required'; END IF;
 IF jsonb_typeof(attachments) IS DISTINCT FROM 'array' OR jsonb_typeof(links) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Attachment and link arrays required'; END IF;
 payload=jsonb_build_object('conversation',conversation,'body',text_body,'reply',reply,'forward',forward,'files',attachments,'links',links);
 SELECT * INTO existing FROM chat_messages WHERE sender_id=actor AND request_key=request;
 IF FOUND THEN IF existing.request_payload<>payload THEN RAISE EXCEPTION 'Message key reused with different data'; END IF;RETURN existing.id; END IF;
 actual_body=COALESCE(text_body,'');
 IF forward IS NOT NULL THEN
  IF actual_body<>'' OR attachments<>'[]' OR links<>'[]' THEN RAISE EXCEPTION 'Forward copies source content, not replacement content'; END IF;
  SELECT * INTO source FROM chat_messages WHERE id=forward;
  IF NOT FOUND OR NOT conversation_access(actor,source.conversation_id) THEN RAISE EXCEPTION 'Forward source access denied'; END IF;
  actual_body=source.body;
 ELSIF length(btrim(actual_body))=0 AND jsonb_array_length(attachments)=0 AND jsonb_array_length(links)=0 THEN RAISE EXCEPTION 'Message content required'; END IF;
 INSERT INTO chat_messages(conversation_id,sender_id,request_key,request_payload,body,reply_to,forward_from)
 VALUES(conversation,actor,request,payload,actual_body,reply,forward) ON CONFLICT(sender_id,request_key) DO NOTHING RETURNING id INTO message;
 IF message IS NULL THEN
  SELECT * INTO existing FROM chat_messages WHERE sender_id=actor AND request_key=request;
  IF existing.request_payload<>payload THEN RAISE EXCEPTION 'Message key reused with different data'; END IF;RETURN existing.id;
 END IF;
 IF forward IS NOT NULL THEN
  INSERT INTO chat_message_files SELECT message,file_id,storage_key,original_name,mime_type,byte_size,sha256 FROM chat_message_files WHERE message_id=forward;
  INSERT INTO chat_message_links SELECT message,url,label FROM chat_message_links WHERE message_id=forward;
 ELSE
  FOR entry IN SELECT value FROM jsonb_array_elements(attachments) LOOP
   INSERT INTO chat_message_files(message_id,file_id,storage_key,original_name,mime_type,byte_size,sha256) VALUES(message,(entry->>'file_id')::uuid,'','','',0,repeat('0',64));
  END LOOP;
  FOR entry IN SELECT value FROM jsonb_array_elements(links) LOOP INSERT INTO chat_message_links VALUES(message,entry->>'url',COALESCE(entry->>'label',''));END LOOP;
 END IF;
 RETURN message;
END $$;
CREATE FUNCTION set_message_star(actor UUID,message UUID,star BOOLEAN) RETURNS VOID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT communication_actor(actor) OR NOT EXISTS(SELECT 1 FROM chat_messages m WHERE m.id=message AND conversation_access(actor,m.conversation_id)) THEN RAISE EXCEPTION 'Message access denied'; END IF;
 IF star THEN INSERT INTO chat_message_stars VALUES(message,actor,clock_timestamp()) ON CONFLICT DO NOTHING;
 ELSE DELETE FROM chat_message_stars WHERE message_id=message AND account_id=actor;END IF;
END $$;
CREATE FUNCTION mark_conversation_read(actor UUID,conversation UUID,message UUID) RETURNS BIGINT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE cursor_value BIGINT;
BEGIN
 IF NOT communication_actor(actor) OR NOT conversation_access(actor,conversation) THEN RAISE EXCEPTION 'Conversation access denied'; END IF;
 SELECT sequence INTO cursor_value FROM chat_messages WHERE id=message AND conversation_id=conversation;
 IF NOT FOUND THEN RAISE EXCEPTION 'Read cursor must target this conversation'; END IF;
 UPDATE conversation_members SET last_read_sequence=greatest(last_read_sequence,cursor_value),revision=revision+1
 WHERE conversation_id=conversation AND account_id=actor AND active RETURNING last_read_sequence INTO cursor_value;
 RETURN cursor_value;
END $$;

CREATE FUNCTION meeting_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Meeting history cannot be deleted'; END IF;
 IF NOT communication_actor(NEW.organizer_id) OR NEW.updated_by<>NEW.organizer_id THEN RAISE EXCEPTION 'Meeting organizer required'; END IF;
 IF NEW.project_id IS NOT NULL AND NOT (team_member(NEW.organizer_id,NEW.project_id) OR project_supervisor(NEW.organizer_id,NEW.project_id)) THEN RAISE EXCEPTION 'Meeting project access denied'; END IF;
 IF NEW.project_id IS NOT NULL AND EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND status IN ('COMPLETED','ARCHIVED')) THEN RAISE EXCEPTION 'Completed project meetings are read only'; END IF;
 IF NEW.conversation_id IS NOT NULL AND NOT conversation_access(NEW.organizer_id,NEW.conversation_id) THEN RAISE EXCEPTION 'Meeting conversation access denied'; END IF;
 IF NEW.project_id IS NOT NULL AND EXISTS(SELECT 1 FROM conversations WHERE id=NEW.conversation_id AND project_id IS NOT NULL AND project_id<>NEW.project_id) THEN RAISE EXCEPTION 'Meeting conversation belongs to another project'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.organizer_id,NEW.project_id,NEW.conversation_id,NEW.request_key,NEW.request_payload,NEW.created_at) IS DISTINCT FROM
    ROW(OLD.id,OLD.organizer_id,OLD.project_id,OLD.conversation_id,OLD.request_key,OLD.request_payload,OLD.created_at) THEN RAISE EXCEPTION 'Meeting identity is immutable'; END IF;
  IF OLD.status<>'SCHEDULED' THEN RAISE EXCEPTION 'Finished meeting is read only'; END IF;
  NEW.revision=OLD.revision+1;
 ELSE
  IF NEW.status<>'SCHEDULED' OR NEW.starts_at<=clock_timestamp() THEN RAISE EXCEPTION 'New meeting must be scheduled in the future'; END IF;
 END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER meeting_scope BEFORE INSERT OR UPDATE OR DELETE ON meetings FOR EACH ROW EXECUTE FUNCTION meeting_guard();
CREATE FUNCTION meeting_participant_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE meeting meetings%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Invitation history cannot be deleted'; END IF;
 SELECT * INTO meeting FROM meetings WHERE id=NEW.meeting_id FOR UPDATE;
 IF meeting.status<>'SCHEDULED' OR meeting.starts_at<=clock_timestamp() THEN RAISE EXCEPTION 'Meeting invitation is closed'; END IF;
 IF NOT communication_actor(NEW.account_id) OR NEW.invited_by<>meeting.organizer_id THEN RAISE EXCEPTION 'Registered participant and organizer invitation required'; END IF;
 IF NEW.account_id=meeting.organizer_id AND NEW.response<>'ACCEPTED' THEN RAISE EXCEPTION 'Organizer is automatically accepted'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.meeting_id,NEW.account_id,NEW.invited_by,NEW.invited_at) IS DISTINCT FROM ROW(OLD.meeting_id,OLD.account_id,OLD.invited_by,OLD.invited_at) THEN RAISE EXCEPTION 'Invitation identity is immutable'; END IF;
  NEW.revision=OLD.revision+1;
 ELSE
  IF NEW.account_id<>meeting.organizer_id AND NEW.response<>'PENDING' THEN RAISE EXCEPTION 'Invitation starts pending'; END IF;
 END IF;
 NEW.responded_at=CASE WHEN NEW.response<>'PENDING' THEN clock_timestamp() END;RETURN NEW;
END $$;
CREATE TRIGGER meeting_participant_scope BEFORE INSERT OR UPDATE OR DELETE ON meeting_participants FOR EACH ROW EXECUTE FUNCTION meeting_participant_guard();
CREATE FUNCTION create_meeting(actor UUID,request UUID,title TEXT,starts TIMESTAMPTZ,ends TIMESTAMPTZ,invitees UUID[],agenda TEXT DEFAULT '',
 place TEXT DEFAULT '',url TEXT DEFAULT NULL,project UUID DEFAULT NULL,conversation UUID DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE payload JSONB;existing meetings%ROWTYPE;meeting UUID;person UUID;normalized UUID[];
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered organizer required'; END IF;
 SELECT array_agg(DISTINCT x ORDER BY x) INTO normalized FROM unnest(COALESCE(invitees,'{}')||ARRAY[actor]) x;
 IF array_position(normalized,NULL) IS NOT NULL THEN RAISE EXCEPTION 'Participant cannot be null'; END IF;
 payload=jsonb_build_object('title',title,'starts',starts AT TIME ZONE 'UTC','ends',ends AT TIME ZONE 'UTC','invitees',normalized,'agenda',agenda,'place',place,'url',url,'project',project,'conversation',conversation);
 PERFORM 1 FROM accounts WHERE id=actor FOR UPDATE;
 SELECT * INTO existing FROM meetings WHERE organizer_id=actor AND request_key=request;
 IF FOUND THEN IF existing.request_payload<>payload THEN RAISE EXCEPTION 'Meeting key reused with different data'; END IF;RETURN existing.id; END IF;
 INSERT INTO meetings(organizer_id,project_id,conversation_id,request_key,request_payload,title,agenda,starts_at,ends_at,location,meeting_url,updated_by)
 VALUES(actor,project,conversation,request,payload,title,agenda,starts,ends,place,url,actor) RETURNING id INTO meeting;
 FOREACH person IN ARRAY normalized LOOP
  INSERT INTO meeting_participants(meeting_id,account_id,invited_by,response,responded_at) VALUES(meeting,person,actor,
   CASE WHEN person=actor THEN 'ACCEPTED' ELSE 'PENDING' END,CASE WHEN person=actor THEN clock_timestamp() END);
 END LOOP;
 RETURN meeting;
END $$;
CREATE FUNCTION respond_to_meeting(actor UUID,meeting UUID,expected_revision INT,answer TEXT) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE invitation meeting_participants%ROWTYPE;
BEGIN
 PERFORM 1 FROM meetings WHERE id=meeting FOR UPDATE;
 SELECT * INTO invitation FROM meeting_participants WHERE meeting_id=meeting AND account_id=actor FOR UPDATE;
 IF NOT FOUND OR NOT communication_actor(actor) THEN RAISE EXCEPTION 'Invited participant required'; END IF;
 IF expected_revision IS NULL OR invitation.revision<>expected_revision THEN RAISE EXCEPTION 'Invitation revision conflict'; END IF;
 IF answer NOT IN ('ACCEPTED','DECLINED') THEN RAISE EXCEPTION 'Accept or decline required'; END IF;
 UPDATE meeting_participants SET response=answer WHERE meeting_id=meeting AND account_id=actor RETURNING revision INTO expected_revision;
 RETURN expected_revision;
END $$;
CREATE FUNCTION update_meeting(actor UUID,meeting UUID,expected_revision INT,title TEXT,starts TIMESTAMPTZ,ends TIMESTAMPTZ,agenda TEXT,place TEXT,url TEXT,
 new_status TEXT DEFAULT 'SCHEDULED',notes TEXT DEFAULT '') RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE current meetings%ROWTYPE;
BEGIN
 SELECT * INTO current FROM meetings WHERE id=meeting FOR UPDATE;
 IF NOT FOUND OR NOT communication_actor(actor) OR current.organizer_id<>actor THEN RAISE EXCEPTION 'Meeting organizer required'; END IF;
 IF expected_revision IS NULL OR current.revision<>expected_revision THEN RAISE EXCEPTION 'Meeting revision conflict'; END IF;
 IF new_status='SCHEDULED' AND starts<=clock_timestamp() AND ROW(starts,ends) IS DISTINCT FROM ROW(current.starts_at,current.ends_at) THEN RAISE EXCEPTION 'Rescheduled meeting must be in the future'; END IF;
 IF new_status='COMPLETED' AND starts>clock_timestamp() THEN RAISE EXCEPTION 'Future meeting cannot be completed'; END IF;
 UPDATE meetings SET title=update_meeting.title,starts_at=starts,ends_at=ends,agenda=update_meeting.agenda,location=place,meeting_url=url,
  status=new_status,notes=update_meeting.notes,updated_by=actor WHERE id=meeting RETURNING revision INTO expected_revision;
 IF new_status='SCHEDULED' AND ROW(starts,ends) IS DISTINCT FROM ROW(current.starts_at,current.ends_at) THEN
  UPDATE meeting_participants SET response='PENDING',responded_at=NULL WHERE meeting_id=meeting AND account_id<>actor;
 END IF;
 RETURN expected_revision;
END $$;
CREATE FUNCTION invite_to_meeting(actor UUID,meeting UUID,person UUID) RETURNS VOID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 PERFORM 1 FROM meetings WHERE id=meeting AND organizer_id=actor FOR UPDATE;
 IF NOT FOUND OR NOT communication_actor(actor) THEN RAISE EXCEPTION 'Meeting organizer required'; END IF;
 INSERT INTO meeting_participants(meeting_id,account_id,invited_by) VALUES(meeting,person,actor) ON CONFLICT DO NOTHING;
END $$;

CREATE FUNCTION emit_communication_event(key TEXT,event_kind TEXT,actor UUID,subject UUID,target UUID DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result UUID;project UUID;conversation UUID;message UUID;meeting UUID;submission UUID;feedback UUID;document UUID;recipient UUID;
 recipients UUID[];existing notification_events%ROWTYPE;occurred_at TIMESTAMPTZ;
BEGIN
 CASE event_kind
 WHEN 'MESSAGE' THEN
  message=subject;SELECT m.conversation_id,m.created_at INTO conversation,occurred_at FROM chat_messages m WHERE m.id=message AND m.sender_id=actor;
  IF conversation IS NULL THEN RAISE EXCEPTION 'Notification message source invalid'; END IF;
  SELECT array_agg(account_id) INTO recipients FROM conversation_members WHERE conversation_id=conversation AND active AND NOT muted AND account_id<>actor AND conversation_access(account_id,conversation);
 WHEN 'MEETING_INVITE','MEETING_UPDATED','MEETING_RESPONSE' THEN
  meeting=subject;
  SELECT updated_at INTO occurred_at FROM meetings WHERE id=meeting;
  IF NOT meeting_access(actor,meeting) THEN RAISE EXCEPTION 'Notification meeting source invalid'; END IF;
  IF event_kind='MEETING_RESPONSE' THEN
   SELECT ARRAY[organizer_id] INTO recipients FROM meetings WHERE id=meeting;
   SELECT responded_at INTO occurred_at FROM meeting_participants WHERE meeting_id=meeting AND account_id=actor;
  ELSIF event_kind='MEETING_INVITE' THEN
   IF NOT EXISTS(SELECT 1 FROM meetings WHERE id=meeting AND organizer_id=actor) OR NOT EXISTS(SELECT 1 FROM meeting_participants WHERE meeting_id=meeting AND account_id=target)
   THEN RAISE EXCEPTION 'Invitation target invalid'; END IF;
   recipients=ARRAY[target];
   SELECT invited_at INTO occurred_at FROM meeting_participants WHERE meeting_id=meeting AND account_id=target;
  ELSE
   IF NOT EXISTS(SELECT 1 FROM meetings WHERE id=meeting AND organizer_id=actor) THEN RAISE EXCEPTION 'Organizer event required'; END IF;
   SELECT array_agg(account_id) INTO recipients FROM meeting_participants WHERE meeting_id=meeting AND account_id<>actor;
  END IF;
 WHEN 'REPORT_SUBMITTED' THEN
  submission=subject;SELECT d.project_id,s.submitted_at INTO project,occurred_at FROM report_submissions s JOIN report_documents d ON d.id=s.document_id WHERE s.id=submission AND s.submitted_by=actor;
  IF project IS NULL THEN RAISE EXCEPTION 'Notification report source invalid'; END IF;
  SELECT array_agg(supervisor_id) INTO recipients FROM project_supervisors WHERE project_id=project;
 WHEN 'REPORT_REVIEWED' THEN
  feedback=subject;SELECT d.project_id,f.created_at INTO project,occurred_at FROM report_feedback f JOIN report_submissions s ON s.id=f.submission_id JOIN report_documents d ON d.id=s.document_id WHERE f.id=feedback AND f.created_by=actor;
  IF project IS NULL THEN RAISE EXCEPTION 'Notification feedback source invalid'; END IF;
  SELECT array_agg(student_id) INTO recipients FROM project_students WHERE project_id=project AND left_at IS NULL;
 WHEN 'REPORT_REOPENED' THEN
  document=subject;SELECT project_id,updated_at INTO project,occurred_at FROM report_documents WHERE id=document;
  IF project IS NULL OR NOT project_supervisor(actor,project) THEN RAISE EXCEPTION 'Notification reopen source invalid'; END IF;
  SELECT array_agg(student_id) INTO recipients FROM project_students WHERE project_id=project AND left_at IS NULL;
 ELSE RAISE EXCEPTION 'Unsupported notification source';
 END CASE;
 INSERT INTO notification_events(event_key,kind,actor_id,message_id,meeting_id,submission_id,feedback_id,document_id,data,created_at)
 VALUES(key,event_kind,actor,message,meeting,submission,feedback,document,jsonb_build_object('target',target),COALESCE(occurred_at,clock_timestamp())) ON CONFLICT(event_key) DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN
  SELECT * INTO existing FROM notification_events WHERE event_key=key;
  IF ROW(existing.kind,existing.actor_id,existing.message_id,existing.meeting_id,existing.submission_id,existing.feedback_id,existing.document_id)
   IS DISTINCT FROM ROW(event_kind,actor,message,meeting,submission,feedback,document) OR existing.data IS DISTINCT FROM jsonb_build_object('target',target) THEN RAISE EXCEPTION 'Notification key reused with different source'; END IF;
  RETURN existing.id;
 END IF;
 FOREACH recipient IN ARRAY COALESCE(recipients,'{}') LOOP
  IF recipient<>actor THEN INSERT INTO notification_inbox(event_id,recipient_id) VALUES(result,recipient) ON CONFLICT DO NOTHING; END IF;
 END LOOP;
 RETURN result;
END $$;
CREATE FUNCTION communication_event_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='chat_messages' THEN PERFORM emit_communication_event('message:'||NEW.id,'MESSAGE',NEW.sender_id,NEW.id);
 ELSIF TG_TABLE_NAME='meeting_participants' THEN
  IF TG_OP='INSERT' AND NEW.account_id<>NEW.invited_by THEN PERFORM emit_communication_event('meeting-invite:'||NEW.meeting_id||':'||NEW.account_id,'MEETING_INVITE',NEW.invited_by,NEW.meeting_id,NEW.account_id);
  ELSIF TG_OP='UPDATE' AND NEW.response<>'PENDING' AND NEW.response IS DISTINCT FROM OLD.response THEN PERFORM emit_communication_event('meeting-response:'||NEW.meeting_id||':'||NEW.account_id||':'||NEW.revision,'MEETING_RESPONSE',NEW.account_id,NEW.meeting_id);END IF;
 ELSIF TG_TABLE_NAME='meetings' THEN PERFORM emit_communication_event('meeting-update:'||NEW.id||':'||NEW.revision,'MEETING_UPDATED',NEW.organizer_id,NEW.id);
 ELSIF TG_TABLE_NAME='report_submissions' THEN PERFORM emit_communication_event('report-submitted:'||NEW.id,'REPORT_SUBMITTED',NEW.submitted_by,NEW.id);
 ELSIF TG_TABLE_NAME='report_feedback' THEN PERFORM emit_communication_event('report-feedback:'||NEW.id,'REPORT_REVIEWED',NEW.created_by,NEW.id);
 ELSIF TG_TABLE_NAME='report_documents' AND OLD.state='SUBMITTED' AND NEW.state='DRAFT' AND NEW.kind<>'WEEKLY' THEN
  PERFORM emit_communication_event('report-reopen:'||NEW.id||':'||NEW.revision,'REPORT_REOPENED',NEW.updated_by,NEW.id);
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER message_notification AFTER INSERT ON chat_messages FOR EACH ROW EXECUTE FUNCTION communication_event_trigger();
CREATE TRIGGER invitation_notification AFTER INSERT OR UPDATE ON meeting_participants FOR EACH ROW EXECUTE FUNCTION communication_event_trigger();
CREATE TRIGGER meeting_notification AFTER UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION communication_event_trigger();
CREATE TRIGGER report_submission_notification AFTER INSERT ON report_submissions FOR EACH ROW EXECUTE FUNCTION communication_event_trigger();
CREATE TRIGGER report_feedback_notification AFTER INSERT ON report_feedback FOR EACH ROW EXECUTE FUNCTION communication_event_trigger();
CREATE TRIGGER report_reopen_notification AFTER UPDATE ON report_documents FOR EACH ROW EXECUTE FUNCTION communication_event_trigger();
CREATE FUNCTION notification_recipient_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE event notification_events%ROWTYPE;allowed BOOLEAN;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Notification history cannot be deleted; dismiss it'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.event_id,NEW.recipient_id) IS DISTINCT FROM ROW(OLD.event_id,OLD.recipient_id) OR
   OLD.read_at IS NOT NULL AND NEW.read_at IS DISTINCT FROM OLD.read_at OR
   OLD.dismissed_at IS NOT NULL AND NEW.dismissed_at IS DISTINCT FROM OLD.dismissed_at
  THEN RAISE EXCEPTION 'Notification identity and first-read state are immutable'; END IF;RETURN NEW;
 END IF;
 SELECT * INTO event FROM notification_events WHERE id=NEW.event_id;
 IF NEW.recipient_id=event.actor_id THEN RAISE EXCEPTION 'No self notification'; END IF;
 CASE event.kind
 WHEN 'MESSAGE' THEN SELECT conversation_access(NEW.recipient_id,m.conversation_id) INTO allowed FROM chat_messages m WHERE id=event.message_id;
 WHEN 'MEETING_INVITE' THEN allowed=(event.data->>'target')=NEW.recipient_id::text AND meeting_access(NEW.recipient_id,event.meeting_id);
 WHEN 'MEETING_RESPONSE' THEN SELECT organizer_id=NEW.recipient_id INTO allowed FROM meetings WHERE id=event.meeting_id;
 WHEN 'MEETING_UPDATED' THEN allowed=meeting_access(NEW.recipient_id,event.meeting_id);
 WHEN 'REPORT_SUBMITTED' THEN SELECT project_supervisor(NEW.recipient_id,d.project_id) INTO allowed FROM report_submissions s JOIN report_documents d ON d.id=s.document_id WHERE s.id=event.submission_id;
 WHEN 'REPORT_REVIEWED' THEN SELECT team_member(NEW.recipient_id,d.project_id) INTO allowed FROM report_feedback f JOIN report_submissions s ON s.id=f.submission_id JOIN report_documents d ON d.id=s.document_id WHERE f.id=event.feedback_id;
 WHEN 'REPORT_REOPENED' THEN SELECT team_member(NEW.recipient_id,project_id) INTO allowed FROM report_documents WHERE id=event.document_id;
 END CASE;
 IF allowed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Notification recipient scope invalid'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER notification_recipient_scope BEFORE INSERT OR UPDATE OR DELETE ON notification_inbox FOR EACH ROW EXECUTE FUNCTION notification_recipient_guard();
CREATE FUNCTION update_notification_state(actor UUID,event UUID,mark_read BOOLEAN DEFAULT true,dismiss BOOLEAN DEFAULT false) RETURNS VOID LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered recipient required'; END IF;
 UPDATE notification_inbox SET read_at=CASE WHEN mark_read OR dismiss THEN COALESCE(read_at,clock_timestamp()) ELSE read_at END,
  dismissed_at=CASE WHEN dismiss THEN COALESCE(dismissed_at,clock_timestamp()) ELSE dismissed_at END WHERE event_id=event AND recipient_id=actor;
 IF NOT FOUND THEN RAISE EXCEPTION 'Notification recipient access denied'; END IF;
END $$;
CREATE FUNCTION read_chat_messages(actor UUID,conversation UUID,after_sequence BIGINT DEFAULT 0,page_size INT DEFAULT 50) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE result JSONB;
BEGIN
 IF NOT communication_actor(actor) OR NOT conversation_access(actor,conversation) THEN RAISE EXCEPTION 'Conversation access denied'; END IF;
 SELECT COALESCE(jsonb_agg(row ORDER BY sequence),'[]') INTO result FROM (
  SELECT m.id,m.sequence,m.sender_id,m.body,m.reply_to,(m.forward_from IS NOT NULL) AS forwarded,m.created_at,
   EXISTS(SELECT 1 FROM chat_message_stars WHERE message_id=m.id AND account_id=actor) AS starred,
   (SELECT COALESCE(jsonb_agg(jsonb_build_object('file_id',file_id,'name',original_name,'mime_type',mime_type,'byte_size',byte_size)),'[]') FROM chat_message_files WHERE message_id=m.id) AS files,
   (SELECT COALESCE(jsonb_agg(jsonb_build_object('url',url,'label',label)),'[]') FROM chat_message_links WHERE message_id=m.id) AS links
  FROM chat_messages m WHERE m.conversation_id=conversation AND m.sequence>after_sequence ORDER BY m.sequence LIMIT least(greatest(page_size,1),100)
 ) row;
 RETURN result;
END $$;
CREATE FUNCTION mark_all_notifications_read(actor UUID) RETURNS INT LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
DECLARE changed INT;
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered recipient required'; END IF;
 UPDATE notification_inbox SET read_at=clock_timestamp() WHERE recipient_id=actor AND read_at IS NULL;
 GET DIAGNOSTICS changed=ROW_COUNT;RETURN changed;
END $$;
CREATE FUNCTION read_meeting(actor UUID,meeting UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT communication_actor(actor) OR NOT meeting_access(actor,meeting) THEN RAISE EXCEPTION 'Meeting access denied'; END IF;
 RETURN (SELECT to_jsonb(m)-'request_payload'-'request_key'||jsonb_build_object('participants',
  (SELECT jsonb_agg(jsonb_build_object('account_id',account_id,'response',response,'revision',revision)) FROM meeting_participants WHERE meeting_id=m.id)) FROM meetings m WHERE id=meeting);
END $$;
CREATE FUNCTION read_notifications(actor UUID) RETURNS JSONB LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered recipient required'; END IF;
 RETURN (SELECT COALESCE(jsonb_agg(item ORDER BY created_at DESC),'[]') FROM (
  SELECT e.id,e.kind,e.message_id,e.meeting_id,e.submission_id,e.feedback_id,e.document_id,e.created_at,i.read_at,i.dismissed_at
  FROM notification_events e JOIN notification_inbox i ON i.event_id=e.id WHERE i.recipient_id=actor AND i.dismissed_at IS NULL
  AND (e.message_id IS NULL OR EXISTS(SELECT 1 FROM chat_messages m WHERE m.id=e.message_id AND conversation_access(actor,m.conversation_id)))
  AND (e.meeting_id IS NULL OR meeting_access(actor,e.meeting_id))
  AND (e.submission_id IS NULL OR EXISTS(SELECT 1 FROM report_submissions s JOIN report_documents d ON d.id=s.document_id WHERE s.id=e.submission_id AND project_supervisor(actor,d.project_id)))
  AND (e.feedback_id IS NULL OR EXISTS(SELECT 1 FROM report_feedback f JOIN report_submissions s ON s.id=f.submission_id JOIN report_documents d ON d.id=s.document_id WHERE f.id=e.feedback_id AND team_member(actor,d.project_id)))
  AND (e.document_id IS NULL OR EXISTS(SELECT 1 FROM report_documents d WHERE d.id=e.document_id AND team_member(actor,d.project_id)))
  ORDER BY e.created_at DESC LIMIT 100
 ) item);
END $$;
CREATE FUNCTION search_chat_people(actor UUID,search TEXT) RETURNS TABLE(id UUID,full_name TEXT,role TEXT,university_number VARCHAR) LANGUAGE plpgsql SET search_path=labassist_student,pg_temp AS $$
BEGIN
 IF NOT communication_actor(actor) THEN RAISE EXCEPTION 'Registered account required'; END IF;
 RETURN QUERY SELECT a.id,a.full_name,a.role,a.university_number FROM accounts a WHERE a.id<>actor AND communication_actor(a.id)
  AND (strpos(lower(a.full_name),lower(btrim(search)))>0 OR strpos(COALESCE(a.university_number,''),btrim(search))>0)
 ORDER BY a.full_name,a.id LIMIT 50;
END $$;
CREATE VIEW conversation_summary AS
 SELECT c.id AS conversation_id,m.account_id,c.kind,c.project_id,c.revision,c.name,c.photo_file_id,m.starred,m.muted,m.last_read_sequence,
  (SELECT count(*) FROM chat_messages x WHERE x.conversation_id=c.id AND x.sequence>m.last_read_sequence AND x.sender_id<>m.account_id) AS unread_count
 FROM conversations c JOIN conversation_members m ON m.conversation_id=c.id WHERE m.active;
COMMENT ON VIEW conversation_summary IS 'Backend must filter by authenticated account and current conversation_access. SELF avatars/names come from the current account profile, never a duplicate profile row.';
REVOKE ALL ON conversations,conversation_members,chat_messages,chat_message_files,chat_message_links,chat_message_stars,meetings,meeting_participants,notification_events,notification_inbox,conversation_summary FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA labassist_student FROM PUBLIC;
COMMIT;
