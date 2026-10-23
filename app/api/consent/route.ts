import { identity } from '@/packages/auth/auth';
import { DomainError } from '@/packages/domain/policies';
import { recordConsent } from '@/packages/privacy/consent';
import { consentError, consentHeaders, consentMetadata } from '@/packages/privacy/http';
import { readJsonObject } from '@/packages/validation/request-body';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request:Request) {
 try {
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new DomainError('Request origin is not allowed.',403);
  // Consent is available before student registration and uses the actual signed-in account.
  const user=await identity(request,{allowUnverified:true});
  const payload=await readJsonObject(request,4096);
  return Response.json(await recordConsent(user,payload,consentMetadata(request),request.headers.get('if-match')),{headers:consentHeaders});
 }catch(error){return consentError(error);}
}
