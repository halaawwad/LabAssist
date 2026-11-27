import {Client} from 'pg';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {randomBytes} from 'node:crypto';

const {applySharedDataUpdates} = require('../tools/shared-data-updates.cjs');
const {ensureSource} = require('../shared-data/20261126134500_sprint6_prices.cjs');

describe('source evidence reuse', () => {
  const args = ['manager','seller','https://shop.example/','2026-01-01T00:00:00Z',null,'2026-01-02T00:00:00.123456Z'];
  it('reuses a matching approved source without inserting another', async () => {
    const db = {query: jest.fn().mockResolvedValue({rows:[{id:'source',status:'APPROVED',reviewed_by:'manager',review_matches:true}]})};
    await expect(ensureSource(db,...args)).resolves.toMatchObject({id:'source'});
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1][4]).toBe(args[5]);
  });
  it.each([
    [{id:'source',status:'PENDING',reviewed_by:null,review_matches:false}],
    [{id:'source',status:'APPROVED',reviewed_by:'manager',review_matches:false}],
    [{id:'source',status:'APPROVED',reviewed_by:'other',review_matches:true}],
    [{id:'one'},{id:'two'}],
  ])('rejects conflicting or ambiguous existing evidence', async (...rows) => {
    const db = {query: jest.fn().mockResolvedValue({rows})};
    await expect(ensureSource(db,...args)).rejects.toThrow();
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});

describe('versioned shared data updates', () => {
  const suffix = randomBytes(6).toString('hex');
  const version = `20261126134501_test_${suffix}.cjs`;
  const evidence = version.replace(/\.cjs$/, '.json');
  const badVersion = `20261126134502_test_${suffix}.cjs`;
  const pendingVersion = `20261126134503_test_${suffix}.cjs`;
  const laterVersion = `20261126134504_test_${suffix}.cjs`;
  const category = `shared_test_${suffix}`;
  const failedCategory = `failed_test_${suffix}`;
  let db: Client;
  let dir: string;
  beforeAll(async () => {
    const url = process.env.DATABASE_URL;
    if (!url || !new URL(url).pathname.includes('_test')) throw new Error('Dedicated test database required');
    db = new Client({connectionString: url});
    await db.connect();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'labassist-shared-update-'));
  });
  afterAll(async () => {
    if (db) {
      await db.query('DELETE FROM labassist_student.catalog_categories WHERE id=ANY($1::text[])', [[category,failedCategory]]);
      await db.query('DELETE FROM public.labassist_shared_updates WHERE version=ANY($1::text[])', [[version,badVersion,pendingVersion,laterVersion]]);
      await db.end();
    }
    if (dir) {
      for (const name of [version,evidence,badVersion,pendingVersion,laterVersion]) if (fs.existsSync(path.join(dir,name))) fs.unlinkSync(path.join(dir,name));
      fs.rmdirSync(dir);
    }
  });
  it('defers a pending update and does not run later updates', async () => {
    if (fs.existsSync(path.join(dir,badVersion))) fs.unlinkSync(path.join(dir,badVersion));
    fs.writeFileSync(path.join(dir,pendingVersion), "exports.apply=async()=>{const e=Error('reviewer missing');e.code='SHARED_DATA_PENDING';throw e};");
    fs.writeFileSync(path.join(dir,laterVersion), "exports.apply=async()=>{throw Error('later update must wait')};");
    await expect(applySharedDataUpdates(db,dir)).resolves.toBeUndefined();
    const result=await db.query('SELECT version FROM public.labassist_shared_updates WHERE version=ANY($1::text[])',[[pendingVersion,laterVersion]]);
    expect(result.rowCount).toBe(0);
    fs.unlinkSync(path.join(dir,pendingVersion));
    fs.unlinkSync(path.join(dir,laterVersion));
  });
  it('applies once, rejects changes to applied evidence, and rolls back a failed update', async () => {
    const insert = (id: string, sort: number) => `await db.query("INSERT INTO labassist_student.catalog_categories(id,name_en,name_ar,sort_order) VALUES('${id}','Test','Test',${sort})");`;
    fs.writeFileSync(path.join(dir,version), `exports.apply=async db=>{${insert(category,1900000001)}};`);
    fs.writeFileSync(path.join(dir,evidence), '{"value":1}');
    await applySharedDataUpdates(db,dir);
    await applySharedDataUpdates(db,dir);
    expect((await db.query('SELECT id FROM labassist_student.catalog_categories WHERE id=$1',[category])).rowCount).toBe(1);
    fs.appendFileSync(path.join(dir,version), '\n// altered');
    await expect(applySharedDataUpdates(db,dir)).rejects.toThrow('Previously applied shared update changed');
    fs.writeFileSync(path.join(dir,version), `exports.apply=async db=>{${insert(category,1900000001)}};`);
    fs.writeFileSync(path.join(dir,evidence), '{"value":2}');
    await expect(applySharedDataUpdates(db,dir)).rejects.toThrow('Previously applied shared update changed');
    fs.writeFileSync(path.join(dir,evidence), '{"value":1}');
    fs.writeFileSync(path.join(dir,badVersion), `exports.apply=async db=>{${insert(failedCategory,1900000002)}throw Error('failed update')};`);
    await expect(applySharedDataUpdates(db,dir)).rejects.toThrow('failed update');
    expect((await db.query('SELECT id FROM labassist_student.catalog_categories WHERE id=$1',[failedCategory])).rowCount).toBe(0);
    expect((await db.query('SELECT version FROM public.labassist_shared_updates WHERE version=$1',[badVersion])).rowCount).toBe(0);
  });
});
