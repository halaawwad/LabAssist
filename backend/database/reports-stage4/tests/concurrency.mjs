// Disposable PostgreSQL only. Uses independent psql connections, never an in-memory substitute.
// node concurrency.mjs [--container disposable-container-name]
import { spawn, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const containerIndex = process.argv.indexOf('--container');
const container = containerIndex < 0 ? null : process.argv[containerIndex + 1];
if (containerIndex >= 0 && !container) throw new Error('Container name required');
const command = container ? 'docker' : 'psql';
const args = container
  ? ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'labassist_reports_checks']
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
  const a = connection(`reports_a_${tag}`);
  let b;
  try {
    a.child.stdin.write(`${first}; SELECT 'HOLDER_READY';\n`);
    await until(() => {
      if (a.closed) throw new Error(a.error);
      return a.out.includes('HOLDER_READY');
    }, 'first connection holds its transaction');
    b = connection(`reports_b_${tag}`);
    b.child.stdin.end(`${second}; COMMIT;\n`);
    // Prove actual overlap: PostgreSQL reports B blocked by another backend.
    await until(() => {
      if (b.closed) throw new Error(`Second operation did not wait: ${b.error}`);
      return query(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='reports_b_${tag}' AND cardinality(pg_blocking_pids(pid))>0)`) === 't';
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
const weekly = JSON.stringify({ work: 'Sensor tested', progress: 12, progressNote: 'Initial work', tasks: 'Test sensor',
  hasDelays: false, delayReason: '', delayAction: '', problems: '', plan: 'Repeat measurements' });
const content = `'${weekly}'::jsonb`;
function fixture(team) {
  return JSON.parse(query(`SELECT json_build_object('project',p.id,'owner',m.owner,'teammate',m.teammate,
    'supervisor',(SELECT supervisor_id FROM project_supervisors WHERE project_id=p.id ORDER BY supervisor_id LIMIT 1),
    'period',(SELECT id FROM reporting_periods WHERE term_id=p.term_id AND week_number=2))
    FROM projects p CROSS JOIN LATERAL(SELECT min(student_id::text) AS owner,max(student_id::text) AS teammate
    FROM project_students WHERE project_id=p.id) m WHERE p.seed_key='${team}'`));
}
const q = value => `'${value}'`;
const create = f => `SELECT create_report_document(${q(f.owner)},${q(f.project)},'WEEKLY',${q(f.period)},${content})`;
const a = fixture('TEAM02');
const document = query(create(a));
await race('simultaneous draft edits: one save and one revision conflict',
  `SELECT save_report_draft(${q(a.owner)},${q(document)},0,${content})`,
  `SELECT save_report_draft(${q(a.teammate)},${q(document)},0,${content})`, /revision conflict/i);
assert.equal(query(`SELECT revision||':'||(SELECT count(*) FROM report_versions WHERE document_id=d.id) FROM report_documents d WHERE id=${q(document)}`), '1:2');
query(`UPDATE reporting_periods SET opens_at=now()-interval '2 hours',due_at=now()+interval '1 hour',late_until=now()+interval '1 day' WHERE id=${q(a.period)}`);
await race('different submission requests: one accepted, competing transaction rolled back',
  `SELECT submit_report(${q(a.owner)},${q(document)},1,${q(randomUUID())})`,
  `SELECT submit_report(${q(a.teammate)},${q(document)},1,${q(randomUUID())})`, /revision conflict|locked/i);
assert.equal(query(`SELECT count(*) FROM report_submissions WHERE document_id=${q(document)} AND state='SUBMITTED'`), '1');

const c = fixture('TEAM03');
const cDoc = query(create(c));
const request = randomUUID();
const same = `SELECT submit_report(${q(c.owner)},${q(cDoc)},0,${q(request)})`;
const result = await race('same submission retry key: both connections receive one submission', same, same);
const firstId = result.a.split(/\r?\n/).find(line => /^[0-9a-f-]{36}$/.test(line));
assert.ok(firstId);
assert.ok(result.b.includes(firstId));
assert.equal(query(`SELECT count(*) FROM report_submissions WHERE document_id=${q(cDoc)}`), '1');
const revision = query(`SELECT revision FROM report_documents WHERE id=${q(cDoc)}`);
await race('supervisor opening versus withdrawal: viewed submission cannot disappear',
  `SELECT open_report_submission(${q(c.supervisor)},${q(firstId)})`,
  `SELECT revise_weekly_report(${q(c.owner)},${q(firstId)},${revision},true)`, /viewed|seen/i);
assert.equal(query(`SELECT state||':'||(first_viewed_at IS NOT NULL)::text FROM report_submissions WHERE id=${q(firstId)}`), 'SUBMITTED:true');

const d = fixture('TEAM04');
const shared = await race('simultaneous workspace creation returns the same shared report', create(d), create(d));
const sharedId = shared.a.split(/\r?\n/).find(line => /^[0-9a-f-]{36}$/.test(line));
assert.ok(sharedId && shared.b.includes(sharedId));
assert.equal(query(`SELECT count(*) FROM report_documents WHERE project_id=${q(d.project)} AND period_id=${q(d.period)}`), '1');
console.log('PASS: persisted states verified after all five multi-connection races');
