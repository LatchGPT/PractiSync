import {StudentVerificationRequired} from '@/packages/domain/student-verification';
import {forbidden,redirect} from 'next/navigation';
import {pageIdentity} from '@/app/server-identity';
import {dashboardPathForRole} from '@/packages/auth/routes';
import type {Identity} from '@/packages/validation/contracts';
import {settings} from '@/packages/db/demo';
import {demoAllowed,DomainError} from '@/packages/domain/policies';
import PractiSync from './practisync';
export const dynamic='force-dynamic';
export default async function Page(){
 const cfg=settings();
 let user:Identity|undefined;
 let denied=false;
 let initialError:string|null=null;
 try{
  user=await pageIdentity();
 }catch(error){
  if(error instanceof StudentVerificationRequired)redirect('/student-verification');
  console.error('Page error:',error);
  if(error instanceof DomainError&&error.status===403)denied=true;
  else if(!(error instanceof DomainError&&(error.status===401||error.status===503)))initialError='PractiSync could not load your workspace. Check your connection and try again.';
 }
 if(denied)forbidden();
 if(user)redirect(dashboardPathForRole(user.role));
 return <PractiSync initial={null} initialError={initialError} demo={demoAllowed(cfg.DEPLOYMENT_MODE,cfg.DEMO_ENABLED)} authConfigured={!!cfg.AUTH_SECRET}/>;
}
