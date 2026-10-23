import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deliverAccountMail } from '../packages/auth/mail';
import { runtimeTenantId } from '../packages/auth/runtime';
import { runDeadlineReminders } from '../packages/domain/reminders';
import { reconcileQueue } from '../packages/domain/queue';
import { seed } from '../packages/db/demo';

if(process.argv.includes('--local-demo')){if(process.env.DEPLOYMENT_MODE!=='demo')throw new Error('Local demo worker requires DEPLOYMENT_MODE=demo.');process.env.PRACTISYNC_LOCAL_DEMO='true';process.env.DEMO_ENABLED='true';process.env.AUTH_SECRET=readFileSync(join(process.cwd(),'.local','auth-secret'),'utf8').trim();}
let stopping=false,wake:()=>void=()=>{};
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true;wake();});
await seed();
const tenantId=runtimeTenantId();
let lastReminderCheck=0;
let failed=false;
async function tick(){
 try{await reconcileQueue(tenantId);}catch(error){console.error('Queue check failed:',error instanceof Error?error.message:'Queue maintenance failure');failed=true;}
 if(Date.now()-lastReminderCheck>=60000||process.argv.includes('--once')){
  try{await runDeadlineReminders(tenantId);await deliverAccountMail(new Date(),tenantId);lastReminderCheck=Date.now();}catch(error){console.error('Workflow check failed:',error instanceof Error?error.message:'Workflow maintenance failure');failed=true;}
 }
}
do{
 await tick();
 if(process.argv.includes('--once')){if(failed)process.exitCode=1;break;}
 if(!stopping)await new Promise<void>(resolve=>{const timer=setTimeout(resolve,5000);wake=()=>{clearTimeout(timer);resolve();};});
}while(!stopping);
