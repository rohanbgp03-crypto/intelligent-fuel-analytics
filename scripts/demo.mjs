// Optional local demonstration using a real, disposable MongoDB process.
// This is never used for production and never substitutes a mock database.
import{MongoMemoryServer}from'mongodb-memory-server';import{spawn}from'node:child_process';
try{process.loadEnvFile('.env');}catch{}
const mongo=await MongoMemoryServer.create({instance:{args:['--setParameter','diagnosticDataCollectionEnabled=false']}});
const env={...process.env,MONGODB_URI:mongo.getUri('ifca_demo'),API_PORT:'3001',NODE_ENV:'development'};
const children=[];const run=(cmd,args)=>{const c=spawn(cmd,args,{env,stdio:'inherit'});children.push(c);return c;};
console.log('Disposable real MongoDB ready. Register an account in the UI. Records are lost when this demo stops.');
if(env.SEED_EMAIL&&env.SEED_PASSWORD){await new Promise((resolve,reject)=>{const child=run(process.execPath,['server/src/seed.js']);child.on('exit',code=>code===0?resolve():reject(Error('Seed failed')));});}
run(process.execPath,['server/src/index.js']);run(process.env.PYTHON_BIN||'python',['-m','uvicorn','app:app','--app-dir','ml-service','--host','127.0.0.1','--port','8001']);run(process.execPath,['node_modules/vite/bin/vite.js','client','--host','0.0.0.0']);
let stopping=false;async function stop(){if(stopping)return;stopping=true;for(const c of children)c.kill('SIGTERM');await mongo.stop();process.exit(0);}process.on('SIGINT',stop);process.on('SIGTERM',stop);for(const c of children)c.on('exit',code=>{if(code&&!stopping){console.error('A demo service exited with an error.');stop();}});

