const {Client} = require('pg');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const {applySharedDataUpdates} = require('./shared-data-updates.cjs');

async function main() {
  const {PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE} = process.env;
  if (!PGHOST || !PGPORT || !PGUSER || !PGPASSWORD || !PGDATABASE) throw new Error('Missing database connection configuration');
  const url = new URL('postgresql://localhost');
  url.hostname = PGHOST;
  url.port = PGPORT;
  url.username = PGUSER;
  url.password = PGPASSWORD;
  url.pathname = `/${PGDATABASE}`;
  url.searchParams.set('schema', 'labassist_student');
  const client = new Client({connectionString: url.toString()});
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('labassist-compose-updates'))");
    const env = {...process.env, DATABASE_URL: url.toString()};
    const migration = spawnSync(process.execPath, [path.join(__dirname, 'prepare.cjs')], {env, stdio: 'inherit'});
    if (migration.error || migration.status !== 0) throw new Error('Database migration failed; shared data updates were not run');
    await applySharedDataUpdates(client, path.resolve(__dirname, '../shared-data'));
  } finally {
    await client.end();
  }
}
main().catch(error => {console.error(error.message); process.exitCode = 1;});
