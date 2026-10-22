import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deliverAccountMail } from '../packages/auth/mail';
import { runtimeTenantId } from '../packages/auth/runtime';
import { runDeadlineReminders } from '../packages/domain/reminders';
import { seed } from '../packages/db/demo';

if(process.argv.includes('--local-demo')){if(process.env.DEPLOYMENT_MODE!=='demo')throw new Error('Local demo worker requires DEPLOYMENT_MODE=demo.');process.env.PRACTISYNC_LOCAL_DEMO='true';process.env.DEMO_ENABLED='true';process.env.AUTH_SECRET=readFileSync(join(process.cwd(),'.local','auth-secret'),'utf8').trim();}
let stopping=false,wake:()=>void=()=>{};
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true;wake();});
await seed();
const tenantId=runtimeTenantId();
async function tick(){await runDeadlineReminders(tenantId);await deliverAccountMail(new Date(),tenantId);}
do{
 try{await tick();console.log('Workflow check completed',new Date().toISOString());}catch(error){console.error('Workflow check failed:',error instanceof Error?error.message:'Worker failure');if(process.argv.includes('--once'))process.exitCode=1;}
 if(process.argv.includes('--once'))break;
 if(!stopping)await new Promise<void>(resolve=>{const timer=setTimeout(resolve,60000);wake=()=>{clearTimeout(timer);resolve();};});
}while(!stopping);
