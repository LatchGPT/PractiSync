import { identity } from '@/packages/auth/auth';
import { withConsent } from '@/packages/privacy/api-guard';
import { withTenant } from '@/packages/db/tenant-context';
import { getWeeklyImage, deleteWeeklyImage } from '@/packages/domain/weekly-images';
import { DomainError } from '@/packages/domain/policies';
import { weeklyError } from '@/packages/domain/weekly-http';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
async function get(request:Request,context:Context){try{const user=await identity(request),{id}=await context.params;
  const image=await withTenant(user.tenantId,()=>getWeeklyImage(user,id));
  return new Response(new Uint8Array(image.bytes),{headers:{'Content-Type':image.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline; filename="weekly-evidence.webp"'}});
}catch(e){return weeklyError(e);}}
async function remove(request:Request,context:Context){try{if(request.headers.get('origin')!==new URL(request.url).origin)throw new DomainError('Request origin is not allowed.',403);
  const user=await identity(request),{id}=await context.params;await withTenant(user.tenantId,()=>deleteWeeklyImage(user,id));return Response.json({message:'Image removed.'});
}catch(e){return weeklyError(e);}}
export const GET=withConsent(get);
export const DELETE=withConsent(remove);
