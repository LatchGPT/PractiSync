import { identity } from '../auth/auth';
import { requireConsent } from './consent';
import { consentError } from './http';

type RouteContext={params:Promise<Record<string,string|string[]>>};
/** Every protected Route Handler uses this adapter, including legacy/retired handlers. */
export function withConsent(handler:(request:Request)=>Response|Promise<Response>):(request:Request)=>Promise<Response>;
export function withConsent<Context=RouteContext>(handler:(request:Request,context:Context)=>Response|Promise<Response>):(request:Request,context:Context)=>Promise<Response>;
export function withConsent<Context>(handler:(request:Request,context:Context)=>Response|Promise<Response>):unknown {
 return async(request:Request,context:Context)=>{
  try{
   const user=await identity(request,{allowUnverified:true});
   await requireConsent(user);
   const response=await handler(request,context);
   // Older handlers catch DomainError themselves. Preserve the consent code after a racing withdrawal.
   if(response.status===403)await requireConsent(user);
   return response;
  }catch(error){return consentError(error);}
 };
}
