import { z } from 'zod';
import { consumePasswordToken, requestRecovery, tokenDigest } from '@/packages/auth/accounts';
import { one } from '@/packages/db/demo';
import { runtimeTenantId,googleConfigured } from '@/packages/auth/runtime';
import { readJsonObject } from '@/packages/validation/request-body';
import { DomainError } from '@/packages/domain/policies';

export const dynamic='force-dynamic';
const input=z.discriminatedUnion('mode',[
 z.object({mode:z.literal('RECOVER'),email:z.string().trim().toLowerCase().email().max(254)}),
 z.object({mode:z.literal('PASSWORD'),token:z.string().regex(/^[A-Za-z0-9_-]{43}$/),password:z.string().min(12).max(128)}),
 z.object({mode:z.literal('GOOGLE_INVITE'),token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}),
]);
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new DomainError('Request origin is not allowed.',403);
  const d=input.parse(await readJsonObject(request,4096)),ip=request.headers.get('x-real-ip')??request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??'local';
  if(d.mode==='RECOVER')return Response.json(await requestRecovery(d.email,ip),{headers});
  if(d.mode==='PASSWORD')return Response.json(await consumePasswordToken(d.token,d.password,ip),{headers});
  if(!googleConfigured())throw new DomainError('Institutional Google sign-in is not configured. Contact the OJT office.',503);
  const token=await one("SELECT id FROM account_tokens WHERE tenant_id=? AND token_hash=? AND purpose='GOOGLE_INVITE' AND used_at IS NULL AND expires_at>?",runtimeTenantId(),tokenDigest(d.token),new Date().toISOString());
  if(!token)throw new DomainError('The invitation is invalid, expired or already used. Request a new invitation.');
  return Response.json({message:'Continue with the RTU Google account named in your invitation.'},{headers:{...headers,'Set-Cookie':`ps_invite=${d.token}; HttpOnly; SameSite=Lax; Secure; Path=/api/auth; Max-Age=600`}});
 }catch(error){return Response.json({error:error instanceof DomainError?error.message:error instanceof z.ZodError?'Enter a valid email or a password of 12–128 characters.':'Account access is unavailable. Your input is safe; try again or contact the OJT office.'},{status:error instanceof DomainError?error.status:400,headers});}
}
