import { identity } from '@/packages/auth/auth';
import { getConsentHistory } from '@/packages/privacy/history';
import { consentError, consentHeaders } from '@/packages/privacy/http';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
 try {
  const user=await identity(request,{allowUnverified:true});
  return Response.json(await getConsentHistory(user,new URL(request.url).searchParams.get('cursor')),{headers:consentHeaders});
 }catch(error){return consentError(error);}
}
