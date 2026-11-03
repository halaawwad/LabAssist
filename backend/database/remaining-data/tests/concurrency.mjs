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
const database = databaseIndex < 0 ? 'labassist_remaining_checks' : process.argv[databaseIndex + 1];
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
  const a = connection(`remaining_a_${tag}`);
  let b;
  try {
    a.child.stdin.write(`${first}; SELECT 'HOLDER_READY';\n`);
    await until(() => {
      if (a.closed) throw new Error(a.error);
      return a.out.includes('HOLDER_READY');
    }, 'first connection holds its transaction');
    b = connection(`remaining_b_${tag}`);
    b.child.stdin.end(`${second}; COMMIT;\n`);
    // Prove actual overlap: PostgreSQL reports B blocked by another backend.
    await until(() => {
      if (b.closed) throw new Error(`Second operation did not wait: ${b.error}`);
      return query(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='remaining_b_${tag}' AND cardinality(pg_blocking_pids(pid))>0)`) === 't';
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

const q = value => `'${String(value).replaceAll("'", "''")}'`;
const idLine = output => output.split(/\r?\n/).find(line => /^[0-9a-f-]{36}$/.test(line));
function fixture(team) {
 return JSON.parse(query(`SELECT json_build_object('project',p.id,'term',p.term_id,'currency',b.currency,
 'owner',(SELECT student_id FROM project_students WHERE project_id=p.id ORDER BY student_id LIMIT 1),
 'peer',(SELECT student_id FROM project_students WHERE project_id=p.id ORDER BY student_id OFFSET 1 LIMIT 1),
 'manager',(SELECT id FROM accounts WHERE role='WORKSHOP_MANAGER' AND status<>'DISABLED'),
 'day',(SELECT max(day) FROM workshop_days WHERE term_id=p.term_id AND is_working),
 'circuit',(SELECT id FROM circuit_documents WHERE project_id=p.id AND seed_key IS NOT NULL),
 'loan',(SELECT id FROM workshop_handovers WHERE project_id=p.id)) FROM projects p JOIN project_budgets b ON b.project_id=p.id WHERE p.seed_key='${team}'`));
}
const f=fixture('TEAM07'),other=fixture('TEAM08');
await race('attendance updates have one revision winner',
 `SELECT record_attendance(${q(f.manager)},${q(f.term)},${q(f.day)},${q(f.owner)},0,'ABSENT')`,
 `SELECT record_attendance(${q(f.manager)},${q(f.term)},${q(f.day)},${q(f.owner)},0,'PRESENT')`,/revision conflict/i);
assert.equal(query(`SELECT status||':'||revision FROM workshop_attendance WHERE term_id=${q(f.term)} AND day=${q(f.day)} AND student_id=${q(f.owner)}`),'ABSENT:1');
query(`SELECT set_absence_policy(${q(f.manager)},${q(f.term)},0,1)`);
const alertSQL=`SELECT check_repeated_absence(${q(f.manager)},${q(f.owner)},${q(f.term)})`;
const alerts=await race('repeated absence overlap creates one alert and one notification source',alertSQL,alertSQL);
assert.ok(idLine(alerts.a) && alerts.b.includes(idLine(alerts.a)));
assert.equal(query(`SELECT count(*) FROM workshop_records WHERE kind='ABSENCE_ALERT' AND term_id=${q(f.term)} AND student_id=${q(f.owner)}`),'1');
assert.equal(query(`SELECT count(*) FROM notification_events WHERE workshop_record_id=${q(idLine(alerts.a))}`),'1');
const notice=query(`SELECT create_workshop_record(${q(f.manager)},${q(f.term)},${q(f.project)},'NOTICE','Original notice',true,true)`);
await race('first notice viewing prevents a concurrent late edit',
 `SELECT read_workshop_record(${q(f.owner)},${q(notice)})`,
 `SELECT edit_workshop_record(${q(f.manager)},${q(notice)},0,'Late overwrite')`,/seen/i);
assert.equal(query(`SELECT body FROM workshop_records WHERE id=${q(notice)}`),'Original notice');
assert.equal(query(`SELECT read_at IS NOT NULL FROM workshop_record_recipients WHERE record_id=${q(notice)} AND account_id=${q(f.owner)}`),'t');
await race('two teams cannot take the last table slot',
 `SELECT assign_workshop_table(${q(f.manager)},${q(f.project)},'R24',0)`,
 `SELECT assign_workshop_table(${q(f.manager)},${q(other.project)},'R24',0)`,/capacity exceeded/i);
assert.equal(query(`SELECT count(*) FROM workshop_table_assignments WHERE term_id=${q(f.term)} AND table_id='R24'`),'1');
assert.equal(query(`SELECT table_id||':'||revision FROM workshop_table_assignments WHERE project_id=${q(other.project)}`),'R8:0');
const tool=query(`SELECT id FROM workshop_handover_items WHERE handover_id=${q(f.loan)} ORDER BY id LIMIT 1`);
const returnKey=randomUUID(),returnPayload=q(JSON.stringify([{id:tool,good:1,damaged:0,missing:0}]));
const returnSQL=`SELECT update_tool_return(${q(f.manager)},${q(f.loan)},0,${q(returnKey)},${returnPayload}::jsonb)`;
await race('duplicate tool return has one persisted effect',returnSQL,returnSQL);
assert.equal(query(`SELECT count(*) FROM workshop_return_updates WHERE handover_id=${q(f.loan)} AND request_key=${q(returnKey)}`),'1');
assert.equal(query(`SELECT outstanding FROM workshop_handover_summary WHERE id=${q(f.loan)}`),'2');
await race('catalog curation refuses stale concurrent changes',
 `SELECT update_catalog_part(${q(f.manager)},'resistor_220',0,'Resistor A','Resistor A','A',true)`,
 `SELECT update_catalog_part(${q(f.manager)},'resistor_220',0,'Resistor B','Resistor B','B',true)`,/revision conflict/i);
assert.equal(query("SELECT name_en||':'||revision FROM catalog_parts WHERE key='resistor_220'"),'Resistor A:1');
const offer=query("SELECT id FROM market_offers WHERE seed_key='DEMO_OFFER_2_hc_sr04'");
await race('competing price changes preserve one versioned price',
 `SELECT update_market_offer(${q(f.manager)},${q(offer)},0,16,2,'ACTIVE')`,
 `SELECT update_market_offer(${q(f.manager)},${q(offer)},0,17,2,'ACTIVE')`,/revision conflict/i);
assert.equal(query(`SELECT unit_price::int||':'||revision FROM market_offers WHERE id=${q(offer)}`),'16:1');
assert.equal(query(`SELECT count(*) FROM market_offer_history WHERE offer_id=${q(offer)}`),'2');
query(`SELECT share_circuit_with_team(${q(f.owner)},${q(f.circuit)},0,true,${q(f.project)})`);
const source=query(`SELECT head_version FROM circuit_documents WHERE id=${q(f.circuit)}`);
const data=query(`SELECT data::text FROM circuit_versions WHERE id=${q(source)}`);
await race('shared circuit saves preserve the owner checkpoint and reject lost updates',
 `SELECT save_circuit(${q(f.owner)},${q(f.circuit)},1,${q(data)}::jsonb||'{"race":"winner"}'::jsonb,'Winner')`,
 `SELECT save_circuit(${q(f.peer)},${q(f.circuit)},1,${q(data)}::jsonb||'{"race":"loser"}'::jsonb,'Loser')`,/revision conflict/i);
assert.equal(query(`SELECT count(*) FROM circuit_versions WHERE circuit_id=${q(f.circuit)}`),'2');
assert.equal(query(`SELECT share_checkpoint_version=${q(source)}::uuid FROM circuit_documents WHERE id=${q(f.circuit)}`),'t');
const publication=query(`SELECT publish_circuit(${q(f.owner)},${q(f.circuit)},(SELECT head_version FROM circuit_documents WHERE id=${q(f.circuit)}),'COPY','Concurrent copy example')`);
const forkKey=randomUUID(),forkSQL=`SELECT fork_circuit(${q(other.owner)},${q(publication)},${q(forkKey)})`;
const forked=await race('duplicate editable-copy requests return one independent circuit',forkSQL,forkSQL);
assert.ok(idLine(forked.a) && forked.b.includes(idLine(forked.a)));
assert.equal(query(`SELECT count(*) FROM circuit_forks WHERE owner_id=${q(other.owner)} AND request_key=${q(forkKey)}`),'1');
assert.equal(query(`SELECT id<>${q(f.circuit)}::uuid AND owner_id=${q(other.owner)}::uuid FROM circuit_documents WHERE id=${q(idLine(forked.a))}`),'t');
const lesson=query("SELECT id FROM learning_lessons WHERE slug='led-resistor'");
const bookmarkSQL=`SELECT bookmark_learning(${q(f.owner)},${q(lesson)})`;
const bookmarks=await race('saved lessons are deduplicated across independent connections',bookmarkSQL,bookmarkSQL);
assert.ok(idLine(bookmarks.a) && bookmarks.b.includes(idLine(bookmarks.a)));
const thread=query(`SELECT create_ai_conversation(${q(f.owner)},'Concurrent context',${q(f.project)})`);
query(`SELECT append_ai_message(${q(f.owner)},${q(thread)},0,${q(randomUUID())},'Initial project context')`);
const pinSQL=`SELECT pin_ai_conversation(${q(f.owner)},${q(thread)},1,'Concurrent saved snapshot')`;
const pins=await race('simultaneous pins preserve one immutable conversation cutoff',pinSQL,pinSQL);
assert.ok(idLine(pins.a) && pins.b.includes(idLine(pins.a)));
await race('concurrent AI context appends cannot silently overwrite each other',
 `SELECT append_ai_message(${q(f.owner)},${q(thread)},1,${q(randomUUID())},'Winning context')`,
 `SELECT append_ai_message(${q(f.owner)},${q(thread)},1,${q(randomUUID())},'Losing context')`,/revision conflict/i);
assert.equal(query(`SELECT count(*) FROM ai_messages WHERE conversation_id=${q(thread)}`),'2');
assert.equal(query(`SELECT jsonb_array_length(snapshot->'messages') FROM learning_ai_snapshots WHERE id=${q(idLine(pins.a))}`),'1');
const job=query(`SELECT request_ai_job(${q(f.owner)},${q(thread)},2,${q(randomUUID())},'CHAT')`);
// SKIP LOCKED deliberately does not wait. Keep A's claim transaction open while B claims another row.
const holder=connection('remaining_claim_holder_'+randomUUID().replaceAll('-',''));
let firstClaim,secondClaim;
try {
 holder.child.stdin.write("SELECT claim_ai_job('worker-a',300); SELECT 'HOLDER_READY';\n");
 await until(()=>{if(holder.closed)throw new Error(holder.error);return holder.out.includes('HOLDER_READY');},'held worker claim');
 firstClaim=JSON.parse(holder.out.split(/\r?\n/).find(line=>line.startsWith('{')));
 secondClaim=JSON.parse(query("SELECT claim_ai_job('worker-b',300)"));
 assert.ok(firstClaim?.id && secondClaim?.id && firstClaim.id!==secondClaim.id);
 holder.child.stdin.end('COMMIT;\n');assert.equal(await holder.done,0,holder.error);
} finally {if(!holder.closed)holder.child.stdin.end('ROLLBACK;\n');}
console.log('PASS: independent workers skip a locked queue row and claim different jobs');
const claim=firstClaim.id===job?firstClaim:secondClaim;
assert.equal(claim.id,job);
const answer=JSON.stringify({answer:'Fixture completion, no model call.',suggestions:[{catalog_key:'led_red',name:'Red LED',quantity:1,price:1,currency:f.currency,reason:'Concurrency fixture'}]});
const finish=`SELECT complete_ai_job(${q(job)},${q(claim.claim_token)},'concurrency-fixture',${q(answer)}::jsonb)`;
await race('two worker completions create one assistant answer and one result',finish,finish,/claim conflict/i);
assert.equal(query(`SELECT count(*) FROM ai_messages WHERE job_id=${q(job)}`),'1');
assert.equal(query(`SELECT status FROM ai_jobs WHERE id=${q(job)}`),'SUCCEEDED');
query(`SELECT set_ai_sharing(${q(f.owner)},${q(thread)},3,true)`);
const suggestion=query(`SELECT id FROM ai_part_suggestions WHERE job_id=${q(job)}`);
const adopted=await race('teammates adopting one suggestion create one BOM item',
 `SELECT apply_ai_suggestion(${q(f.owner)},${q(suggestion)},${q(f.project)})`,
 `SELECT apply_ai_suggestion(${q(f.peer)},${q(suggestion)},${q(f.project)})`);
assert.ok(idLine(adopted.a) && adopted.b.includes(idLine(adopted.a)));
assert.equal(query(`SELECT count(*) FROM project_bom_items WHERE ai_suggestion_id=${q(suggestion)}`),'1');
// Isolated fixture only: temporarily free the singleton manager slot, then restore the original account status.
const managerStatus=query(`SELECT status FROM accounts WHERE id=${q(f.manager)}`);
const managerA=randomUUID(),managerB=randomUUID();
query(`UPDATE accounts SET status='DISABLED' WHERE id=${q(f.manager)}`);
try {
 await race('competing manager provisioning cannot create two current managers',
  `INSERT INTO accounts(id,role,full_name,email,status) VALUES(${q(managerA)},'WORKSHOP_MANAGER','Fixture manager A',${q('race.'+managerA+'@najah.edu')},'REFERENCE_ONLY')`,
  `INSERT INTO accounts(id,role,full_name,email,status) VALUES(${q(managerB)},'WORKSHOP_MANAGER','Fixture manager B',${q('race.'+managerB+'@najah.edu')},'REFERENCE_ONLY')`,/one_current_workshop_manager|unique constraint/i);
 assert.equal(query("SELECT count(*) FROM accounts WHERE role='WORKSHOP_MANAGER' AND status<>'DISABLED'"),'1');
 assert.equal(query(`SELECT count(*) FROM accounts WHERE id=${q(managerB)}`),'0');
} finally {
 query(`UPDATE accounts SET status='DISABLED' WHERE id=${q(managerA)};UPDATE accounts SET status=${q(managerStatus)} WHERE id=${q(f.manager)}`);
}
console.log('PASS: final states, loser rollback and deduplicated effects verified for all sixteen races');
