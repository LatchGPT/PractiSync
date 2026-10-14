import {forbidden,redirect} from 'next/navigation';
import LoginClient from '@/app/login-client';
import {pageIdentity} from '@/app/server-identity';
import {postLoginPath,safeInternalPath} from '@/packages/auth/routes';
import {DomainError,demoAllowed} from '@/packages/domain/policies';
import {settings} from '@/packages/db/demo';
import type {Identity} from '@/packages/validation/contracts';

export const dynamic='force-dynamic';

export default async function LoginPage({searchParams}:{searchParams:Promise<{redirect?:string|string[]}>}){
 const query=await searchParams;
 const requested=Array.isArray(query.redirect)?query.redirect[0]:query.redirect;
 const redirectTo=safeInternalPath(requested)??'/';
 let user:Identity|undefined;
 let unavailable=false;
 try{
  user=await pageIdentity();
 }catch(error){
  if(error instanceof DomainError&&error.status===403)forbidden();
  unavailable=!(error instanceof DomainError&&(error.status===401||error.status===503));
 }
 if(user)redirect(postLoginPath(user.role,redirectTo));
 const cfg=settings();
 return <LoginClient demo={demoAllowed(cfg.DEPLOYMENT_MODE,cfg.DEMO_ENABLED)} configured={!!cfg.AUTH_SECRET&&!unavailable} redirectTo={redirectTo}/>;
}
