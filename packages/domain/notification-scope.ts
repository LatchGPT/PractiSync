import { one } from '../db/demo';
import type { Identity,Row } from '../validation/contracts';
/** Revoke old class reminder visibility together with enrollment, even after delivery. */
export async function scopedNotifications(user:Identity,rows:Row[]):Promise<Row[]>{
 const decisions=new Map<string,Promise<boolean>>();
 const visible=await Promise.all(rows.map(async row=>{
  if(!['calendar_event','deadline_reminder','announcement'].includes(String(row.resourceType)))return true;
  const resourceId=String(row.resourceId),key=String(row.resourceType)+':'+resourceId;
  if(!decisions.has(key))decisions.set(key,(async()=>{
   if(user.role==='SUPERVISOR')return false;
   const event=await one(row.resourceType==='announcement'?'SELECT * FROM announcements WHERE tenant_id=? AND id=?': 'SELECT * FROM calendar_events WHERE tenant_id=? AND id=?',user.tenantId,resourceId);
   if(!event||(row.resourceType==='announcement'&&event.status!=='PUBLISHED'))return false;
   if(row.resourceType==='deadline_reminder'&&event.status!=='ACTIVE')return false;
   if(user.role==='SUPER_ADMIN'||event.audience==='UNIVERSITY')return true;
   return !!await one(user.role==='COORDINATOR'?'SELECT id FROM classes WHERE tenant_id=? AND id=? AND coordinator_id=? AND revoked=0':'SELECT e.id FROM enrollments e JOIN classes c ON c.id=e.class_id AND c.tenant_id=e.tenant_id WHERE e.tenant_id=? AND e.class_id=? AND e.student_id=? AND e.active=1 AND c.revoked=0',user.tenantId,String(event.classId),user.id);
  })());
  return decisions.get(key)!;
 }));
 return rows.filter((_,index)=>visible[index]);
}
