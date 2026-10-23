import { identity } from '@/packages/auth/auth';
import { withConsent } from '@/packages/privacy/api-guard';
import { withTenant } from '@/packages/db/tenant-context';
import { readImageBody, uploadWeeklyImage } from '@/packages/domain/weekly-images';
import { DomainError } from '@/packages/domain/policies';
import { weeklyError } from '@/packages/domain/weekly-http';
export const runtime='nodejs';
async function post(request:Request){try{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new DomainError('Request origin is not allowed.',403);
  const user=await identity(request),q=new URL(request.url).searchParams;
  const bytes=await readImageBody(request);
  return Response.json(await withTenant(user.tenantId,()=>uploadWeeklyImage(user,q.get('reportId')||'',bytes,q.get('name')||'Weekly evidence')),{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return weeklyError(e);}}
export const POST=withConsent(post);
