const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Updates and their immutable checksums are recorded separately from application data.
async function applySharedDataUpdates(client, directory) {
  await client.query(`CREATE TABLE IF NOT EXISTS public.labassist_shared_updates (
    version TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const files = fs.readdirSync(directory).filter(name => /^\d{14}_[a-z0-9_]+\.cjs$/.test(name)).sort();
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(fullPath));
    const evidencePath = fullPath.replace(/\.cjs$/, '.json');
    if (fs.existsSync(evidencePath)) hash.update(fs.readFileSync(evidencePath));
    const checksum = hash.digest('hex');
    const prior = await client.query('SELECT checksum FROM public.labassist_shared_updates WHERE version=$1', [file]);
    if (prior.rowCount) {
      if (prior.rows[0].checksum !== checksum) throw new Error(`Previously applied shared update changed: ${file}`);
      continue;
    }
    const update = require(fullPath);
    if (typeof update.apply !== 'function') throw new Error(`Shared update has no apply function: ${file}`);
    await client.query('BEGIN');
    try {
      await update.apply(client);
      await client.query('INSERT INTO public.labassist_shared_updates(version, checksum) VALUES($1,$2)', [file, checksum]);
      await client.query('COMMIT');
      console.log(`Applied shared data update ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error && error.code === 'SHARED_DATA_PENDING') {
        console.log(`Shared data update pending: ${file}: ${error.message}`);
        return;
      }
      throw error;
    }
  }
}
module.exports = {applySharedDataUpdates};
