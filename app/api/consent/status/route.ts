import { identity } from '@/packages/auth/auth';
import { getConsentStatus } from '@/packages/privacy/consent';
import { consentError, consentHeaders } from '@/packages/privacy/http';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request:Request) {
 try {
  const state=await getConsentStatus(await identity(request,{allowUnverified:true}));
  return Response.json(state,{headers:{...consentHeaders,ETag:`"${state.policy.version}"`}});
 }catch(error){return consentError(error);}
}
