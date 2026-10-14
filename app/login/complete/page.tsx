import {forbidden,redirect} from 'next/navigation';
import {pageIdentity} from '@/app/server-identity';
import {postLoginPath,safeInternalPath} from '@/packages/auth/routes';
import {DomainError} from '@/packages/domain/policies';
import type {Identity} from '@/packages/validation/contracts';

export const dynamic='force-dynamic';

export default async function LoginCompletePage({searchParams}:{searchParams:Promise<{redirect?:string|string[]}>}){
 const query=await searchParams;
 const requested=Array.isArray(query.redirect)?query.redirect[0]:query.redirect;
 const returnTo=safeInternalPath(requested)??'/';
 let user:Identity;
 try{
  user=await pageIdentity();
 }catch(error){
  if(error instanceof DomainError&&error.status===403)forbidden();
  if(error instanceof DomainError&&error.status===401)redirect('/login?redirect='+encodeURIComponent(returnTo));
  throw error;
 }
 redirect(postLoginPath(user.role,returnTo));
}
