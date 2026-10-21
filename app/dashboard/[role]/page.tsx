import {StudentVerificationRequired} from '@/packages/domain/student-verification';
import {forbidden,notFound,redirect} from 'next/navigation';
import PractiSync from '@/app/practisync';
import {pageIdentity} from '@/app/server-identity';
import {canAccessWorkspaceView,dashboardPathForRole,roleForDashboardSegment} from '@/packages/auth/routes';
import {DomainError,demoAllowed} from '@/packages/domain/policies';
import {snapshot} from '@/packages/domain/read';
import {settings} from '@/packages/db/demo';
import type {Identity,Snapshot} from '@/packages/validation/contracts';

export const dynamic='force-dynamic';

type SearchParams=Record<string,string|string[]|undefined>;

function queryString(search:SearchParams){
 const params=new URLSearchParams();
 for(const [key,value] of Object.entries(search)){
  if(Array.isArray(value))for(const item of value)params.append(key,item);
  else if(value!==undefined)params.set(key,value);
 }
 const query=params.toString();
 return query?('?'+query):'';
}

export default async function DashboardPage({params,searchParams}:{params:Promise<{role:string}>;searchParams:Promise<SearchParams>}){
 const {role:segment}=await params;
 const expectedRole=roleForDashboardSegment(segment);
 if(!expectedRole)notFound();
 const search=await searchParams;
 let user:Identity|undefined;
 try{
  user=await pageIdentity();
 }catch(error){
  console.error('Workspace authentication failed',error instanceof Error?error.message:'Unknown authentication error');
  if(error instanceof StudentVerificationRequired)redirect('/student-verification');
  if(error instanceof DomainError&&error.status===401){
   const returnTo=dashboardPathForRole(expectedRole)+queryString(search);
   redirect('/login?redirect='+encodeURIComponent(returnTo));
  }
  if(error instanceof DomainError&&error.status===403)forbidden();
  const cfg=settings();
  return <PractiSync initial={null} initialError={error instanceof Error?error.message:'Authentication is temporarily unavailable.'} demo={demoAllowed(cfg.DEPLOYMENT_MODE,cfg.DEMO_ENABLED)} authConfigured={!!cfg.AUTH_SECRET}/>;
 }
 if(!user)forbidden();
 if(user.role!==expectedRole)forbidden();
 const requestedViews=Array.isArray(search.view)?search.view:search.view===undefined?[]:[search.view];
 if(requestedViews.some(view=>!canAccessWorkspaceView(expectedRole,view)))forbidden();
 const cfg=settings();
 let initial:Snapshot|null=null;
 let initialError:string|null=null;
 try{
  initial=await snapshot(user);
 }catch(error){
  console.error('Workspace data load failed',error instanceof Error?error.message:'Unknown data error');
  initialError=error instanceof Error?error.message:'PractiSync could not load your workspace.';
 }
 return <PractiSync initial={initial} initialError={initialError} demo={demoAllowed(cfg.DEPLOYMENT_MODE,cfg.DEMO_ENABLED)} authConfigured={!!cfg.AUTH_SECRET}/>;
}
