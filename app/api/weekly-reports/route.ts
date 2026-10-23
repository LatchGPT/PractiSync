import { identity } from '@/packages/auth/auth';
import { withConsent } from '@/packages/privacy/api-guard';
import { withTenant } from '@/packages/db/tenant-context';
import { saveWeeklyReport, weeklyView } from '@/packages/domain/weekly-reports';
import { manilaToday } from '@/packages/domain/assessment-period';
import { DomainError } from '@/packages/domain/policies';
import { readJsonObject } from '@/packages/validation/request-body';
import { weeklyError } from '@/packages/domain/weekly-http';

export const dynamic='force-dynamic';
export const runtime='nodejs';
async function get(request:Request) {
  try{const user=await identity(request);const q=new URL(request.url).searchParams;
    const view=await withTenant(user.tenantId,async()=>{
      const result=await weeklyView(user,q.get('week')||manilaToday(),q.get('course')||'');
      if(user.role==='SUPER_ADMIN'){
        result.trend=[];
        for(let n=7;n>=1;n--){const d=new Date(`${result.week}T00:00:00Z`);d.setUTCDate(d.getUTCDate()-7*n);const past=await weeklyView(user,d.toISOString().slice(0,10),q.get('course')||'');result.trend.push(...past.aggregates);}
        result.trend.push(...result.aggregates);
      }
      return result;
    });return Response.json(view,{headers:{'Cache-Control':'private, no-store'}});
  }catch(e){return weeklyError(e);}
}
async function post(request:Request) {
  try{if(request.headers.get('origin')!==new URL(request.url).origin)throw new DomainError('Request origin is not allowed.',403);
    const user=await identity(request),body=await readJsonObject(request,120_000);
    return Response.json(await withTenant(user.tenantId,()=>saveWeeklyReport(user,body)),{headers:{'Cache-Control':'private, no-store'}});
  }catch(e){return weeklyError(e);}
}
export const GET=withConsent(get);
export const POST=withConsent(post);
