require('./env.cjs');
const {Client}=require('pg'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
(async()=>{
 const api=path.resolve(__dirname,'..'),database=path.resolve(api,'../database'),manifest=require('../../database/stages.json');
 const connection=new URL(process.env.DATABASE_URL);const name=decodeURIComponent(connection.pathname.slice(1))+'_demo';
 if(!/^[a-z][a-z0-9_]{1,55}_demo$/.test(name))throw Error('Demo database name must be a simple identifier ending _demo.');
 connection.pathname='/postgres';const admin=new Client({connectionString:connection.toString()});await admin.connect();
 try{if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount)throw Error('Demo database already exists. No data was changed.');await admin.query('CREATE DATABASE "'+name+'"');}finally{await admin.end();}
 connection.pathname='/'+name;const url=connection.toString(),db=new Client({connectionString:url});await db.connect();
 try{for(const file of manifest.demo)await db.query(fs.readFileSync(path.join(database,file),'utf8'));}finally{await db.end();}
 const cli=path.join(api,'node_modules/prisma/build/index.js'),env={...process.env,DATABASE_URL:url};
 cp.execFileSync(process.execPath,[cli,'migrate','resolve','--applied','00000000000000_baseline'],{cwd:api,env,stdio:'inherit'});
 cp.execFileSync(process.execPath,[cli,'migrate','deploy'],{cwd:api,env,stdio:'inherit'});
 console.log('Created separate demo database: '+name+'. The configured development database was not changed.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
