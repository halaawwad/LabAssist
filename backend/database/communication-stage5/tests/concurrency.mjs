// Disposable PostgreSQL only. Uses independent psql connections, never an in-memory substitute.
// node concurrency.mjs [--container disposable-container-name]
import { spawn, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const containerIndex = process.argv.indexOf('--container');
const container = containerIndex < 0 ? null : process.argv[containerIndex + 1];
if (containerIndex >= 0 && !container) throw new Error('Container name required');
const command = container ? 'docker' : 'psql';
const databaseIndex = process.argv.indexOf('--database');
const database = databaseIndex < 0 ? 'labassist_communication_checks' : process.argv[databaseIndex + 1];
const args = container
  ? ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', database]
  : [];
args.push('-X', '-qAt', '-v', 'ON_ERROR_STOP=1');
const prefix = "SET search_path=labassist_student,public; SET statement_timeout='10s'; SET lock_timeout='8s';";
function query(sql) {
  const result = spawnSync(command, args, { input: prefix + sql, encoding: 'utf8', timeout: 15000 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr);
  return result.stdout.trim();
}
function connection(name) {
  const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
  const state = { child, out: '', error: '', closed: false };
  child.stdout.on('data', data => { state.out += data; });
  child.stderr.on('data', data => { state.error += data; });
  state.done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => { state.closed = true; resolve(code); });
  });
  child.stdin.write(`${prefix} SET application_name='${name}'; BEGIN;\n`);
  return state;
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, description) {
  const deadline = Date.now() + 7000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await delay(60);
  }
  throw new Error(`Timed out: ${description}`);
}
async function race(label, first, second, expectedError = null) {
  const tag = randomUUID().replaceAll('-', '');
  const a = connection(`communication_a_${tag}`);
  let b;
  try {
    a.child.stdin.write(`${first}; SELECT 'HOLDER_READY';\n`);
    await until(() => {
      if (a.closed) throw new Error(a.error);
      return a.out.includes('HOLDER_READY');
    }, 'first connection holds its transaction');
    b = connection(`communication_b_${tag}`);
    b.child.stdin.end(`${second}; COMMIT;\n`);
    // Prove actual overlap: PostgreSQL reports B blocked by another backend.
    await until(() => {
      if (b.closed) throw new Error(`Second operation did not wait: ${b.error}`);
      return query(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='communication_b_${tag}' AND cardinality(pg_blocking_pids(pid))>0)`) === 't';
    }, 'second independent connection waits for the first');
    a.child.stdin.end('COMMIT;\n');
    assert.equal(await a.done, 0, a.error);
    const code = await b.done;
    if (expectedError) {
      assert.notEqual(code, 0, 'Competing write must fail');
      assert.match(b.error, expectedError);
    } else assert.equal(code, 0, b.error);
    console.log(`PASS: ${label}`);
    return { a: a.out, b: b.out };
  } finally {
    if (!a.closed) a.child.stdin.end('ROLLBACK;\n');
    if (b && !b.closed) b.child.kill();
  }
}

const q = value => `'${value}'`;
function fixture(team) {
  return JSON.parse(query(`SELECT json_build_object('project',p.id,'chat',c.id,
   'student',(SELECT student_id FROM project_students WHERE project_id=p.id ORDER BY student_id LIMIT 1),
   'peer',(SELECT student_id FROM project_students WHERE project_id=p.id ORDER BY student_id OFFSET 1 LIMIT 1),
   'supervisor',(SELECT supervisor_id FROM project_supervisors WHERE project_id=p.id ORDER BY supervisor_id LIMIT 1))
   FROM projects p JOIN conversations c ON c.project_id=p.id WHERE p.seed_key='${team}'`));
}
const f = fixture('TEAM05');
const other = fixture('TEAM06');
const idLine = output => output.split(/\r?\n/).find(line => /^[0-9a-f-]{36}$/.test(line));
const direct = await race('opposite direct-chat requests create one shared conversation',
  `SELECT open_direct_conversation(${q(f.student)},${q(other.student)})`,
  `SELECT open_direct_conversation(${q(other.student)},${q(f.student)})`);
assert.ok(idLine(direct.a) && direct.b.includes(idLine(direct.a)));
assert.equal(query(`SELECT count(*) FROM conversations WHERE kind='DIRECT' AND peer_low=least(${q(f.student)}::uuid,${q(other.student)}::uuid) AND peer_high=greatest(${q(f.student)}::uuid,${q(other.student)}::uuid)`), '1');

const sameKey = randomUUID();
const sameSend = `SELECT send_chat_message(${q(f.student)},${q(f.chat)},${q(sameKey)},'Concurrent sensor note')`;
const sent = await race('same message retry creates one message and one notification event', sameSend, sameSend);
const message = idLine(sent.a);
assert.ok(message && sent.b.includes(message));
assert.equal(query(`SELECT count(*) FROM chat_messages WHERE sender_id=${q(f.student)} AND request_key=${q(sameKey)}`), '1');
assert.equal(query(`SELECT count(*) FROM notification_events WHERE message_id=${q(message)}`), '1');
assert.equal(query(`SELECT count(*)=(SELECT count(*) FROM conversation_members WHERE conversation_id=${q(f.chat)} AND active AND NOT muted AND account_id<>${q(f.student)}) FROM notification_inbox i JOIN notification_events e ON e.id=i.event_id WHERE e.message_id=${q(message)}`), 't');

const conflictKey = randomUUID();
await race('message-key payload conflict rolls back without a second delivery effect',
  `SELECT send_chat_message(${q(f.student)},${q(f.chat)},${q(conflictKey)},'Winner content')`,
  `SELECT send_chat_message(${q(f.student)},${q(f.chat)},${q(conflictKey)},'Conflicting content')`, /different data/i);
assert.equal(query(`SELECT body FROM chat_messages WHERE sender_id=${q(f.student)} AND request_key=${q(conflictKey)}`), 'Winner content');
assert.equal(query(`SELECT count(*) FROM notification_events e JOIN chat_messages m ON m.id=e.message_id WHERE m.sender_id=${q(f.student)} AND m.request_key=${q(conflictKey)}`), '1');

const time = JSON.parse(query("SELECT json_build_object('start',now()+interval '5 days','end',now()+interval '5 days 30 minutes','next',now()+interval '6 days','nextEnd',now()+interval '6 days 30 minutes')"));
const meetingKey = randomUUID();
const meetingCall = `SELECT create_meeting(${q(f.student)},${q(meetingKey)},'Concurrent meeting',${q(time.start)},${q(time.end)},ARRAY[${q(f.peer)}::uuid])`;
const created = await race('duplicate meeting requests create one meeting and invitation', meetingCall, meetingCall);
const meeting = idLine(created.a);
assert.ok(meeting && created.b.includes(meeting));
assert.equal(query(`SELECT count(*) FROM meeting_participants WHERE meeting_id=${q(meeting)}`), '2');
assert.equal(query(`SELECT count(*) FROM notification_inbox i JOIN notification_events e ON e.id=i.event_id WHERE e.kind='MEETING_INVITE' AND e.meeting_id=${q(meeting)}`), '1');

await race('competing accept/decline responses have one revision winner',
  `SELECT respond_to_meeting(${q(f.peer)},${q(meeting)},0,'ACCEPTED')`,
  `SELECT respond_to_meeting(${q(f.peer)},${q(meeting)},0,'DECLINED')`, /revision conflict/i);
assert.equal(query(`SELECT response||':'||revision FROM meeting_participants WHERE meeting_id=${q(meeting)} AND account_id=${q(f.peer)}`), 'ACCEPTED:1');
assert.equal(query(`SELECT count(*) FROM notification_events WHERE meeting_id=${q(meeting)} AND kind='MEETING_RESPONSE'`), '1');

await race('reschedule versus response preserves renewed pending confirmation',
  `SELECT update_meeting(${q(f.student)},${q(meeting)},0,'Concurrent meeting',${q(time.next)},${q(time.nextEnd)},'New agenda','Workshop',NULL)`,
  `SELECT respond_to_meeting(${q(f.peer)},${q(meeting)},1,'DECLINED')`, /revision conflict/i);
assert.equal(query(`SELECT response||':'||revision FROM meeting_participants WHERE meeting_id=${q(meeting)} AND account_id=${q(f.peer)}`), 'PENDING:2');
await race('cancellation versus acceptance rejects the closed invitation',
  `SELECT update_meeting(${q(f.student)},${q(meeting)},1,'Concurrent meeting',${q(time.next)},${q(time.nextEnd)},'New agenda','Workshop',NULL,'CANCELLED')`,
  `SELECT respond_to_meeting(${q(f.peer)},${q(meeting)},2,'ACCEPTED')`, /closed/i);
assert.equal(query(`SELECT status FROM meetings WHERE id=${q(meeting)}`), 'CANCELLED');
assert.equal(query(`SELECT count(*) FROM notification_events WHERE meeting_id=${q(meeting)} AND kind='MEETING_RESPONSE'`), '1');

const lastMessage = query(`SELECT send_chat_message(${q(f.student)},${q(f.chat)},${q(randomUUID())},'Latest cursor')`);
await race('overlapping read cursors keep the furthest message',
  `SELECT mark_conversation_read(${q(f.peer)},${q(f.chat)},${q(lastMessage)})`,
  `SELECT mark_conversation_read(${q(f.peer)},${q(f.chat)},${q(message)})`);
assert.equal(query(`SELECT last_read_sequence=(SELECT sequence FROM chat_messages WHERE id=${q(lastMessage)}) FROM conversation_members WHERE conversation_id=${q(f.chat)} AND account_id=${q(f.peer)}`), 't');
const event = query(`SELECT id FROM notification_events WHERE message_id=${q(lastMessage)}`);
await race('read versus dismissal keeps one private read/dismiss state',
  `SELECT update_notification_state(${q(f.peer)},${q(event)})`,
  `SELECT update_notification_state(${q(f.peer)},${q(event)},true,true)`);
assert.equal(query(`SELECT read_at IS NOT NULL AND dismissed_at IS NOT NULL FROM notification_inbox WHERE event_id=${q(event)} AND recipient_id=${q(f.peer)}`), 't');
assert.equal(query(`SELECT dismissed_at IS NULL FROM notification_inbox WHERE event_id=${q(event)} AND recipient_id=${q(f.supervisor)}`), 't');
console.log('PASS: persisted state, conflict rollback and duplicate effects verified for all nine races');
