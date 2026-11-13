const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const database=path.resolve(__dirname,'../../database'),manifest=require('../../database/stages.json');
const expected=manifest.schema.map(p=>'-- Source: '+p+'\n'+fs.readFileSync(path.join(database,p),'utf8')).join('\n');
const actual=fs.readFileSync(path.resolve(__dirname,'../prisma/migrations/00000000000000_baseline/migration.sql'),'utf8');
const normalize=s=>s.replaceAll('\r\n','\n').replace(/^\uFEFF/,'').trim();
assert.equal(normalize(actual),normalize(expected),'SQL stages and frozen Prisma baseline differ. Review; do not regenerate a published baseline.');
console.log('Verified: 14 structural SQL files through department stage 12; no demo seeds in baseline.');
