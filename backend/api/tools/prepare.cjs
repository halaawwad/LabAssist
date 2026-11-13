require('./env.cjs');
const {Client}=require('pg'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
(async()=>{
 const base=path.resolve(__dirname,'..');const sql=fs.readFileSync(path.join(base,'prisma/migrations/00000000000000_baseline/migration.sql'));
 const expected=crypto.createHash('sha256').update(sql).digest('hex');
 const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();let adopted=false;
 try{
  const result=await c.query("SELECT to_regclass('labassist_student._prisma_migrations') tracked,to_regclass('public.labassist_bootstrap') marker");
  if(result.rows[0].tracked){const done=await c.query("SELECT 1 FROM labassist_student._prisma_migrations WHERE migration_name='00000000000000_baseline' AND finished_at IS NOT NULL AND rolled_back_at IS NULL");if(!done.rowCount)throw Error('Existing migration history needs manual review. No baseline was changed.');}
  else {
   if(!result.rows[0].marker)throw Error('No verified Compose bootstrap marker. Back up and review the existing database; baseline was not applied.');
   const marker=await c.query('SELECT baseline_sha256 FROM public.labassist_bootstrap');if(marker.rows.length!==1||marker.rows[0].baseline_sha256!==expected)throw Error('Baseline checksum differs. Review before adopting this database.');
   adopted=true;
  }
 }finally{await c.end();}
 const cli=path.join(base,'node_modules/prisma/build/index.js');
 if(adopted)cp.execFileSync(process.execPath,[cli,'migrate','resolve','--applied','00000000000000_baseline'],{cwd:base,stdio:'inherit'});
 cp.execFileSync(process.execPath,[cli,'migrate','deploy'],{cwd:base,stdio:'inherit'});
})().catch(e=>{console.error(e.message);process.exitCode=1;});
