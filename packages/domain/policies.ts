import type {Identity} from '../validation/contracts';
export const TENANT='fictional-university';
export class DomainError extends Error{constructor(message:string,public status=400){super(message);}}
export function requireRole(user:Identity,...roles:string[]){if(!roles.includes(user.role))throw new DomainError('You do not have permission for this action.',403);}
export function calculateMinutes(start:string,end:string,breakMinutes:number,placementStart:string,placementEnd:string,now=Date.now()){
 const a=Date.parse(start),b=Date.parse(end);
 if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)throw new DomainError('Time out must be after time in. Use explicit dates for overnight shifts.');
 if(b>now)throw new DomainError('Future attendance cannot be submitted.');
 if(a<Date.parse(placementStart+'T00:00:00+08:00')||b>Date.parse(placementEnd+'T23:59:59+08:00'))throw new DomainError('Attendance must fall within the training placement.');
 const minutes=Math.floor((b-a)/60000)-breakMinutes;
 if(!Number.isInteger(breakMinutes)||breakMinutes<0||minutes<=0)throw new DomainError('Break minutes must leave a positive work interval.');
 return minutes;
}
export function scope(user:Identity,alias='p'):{sql:string;args:string[]}{
 const base=`${alias}.tenant_id=?`;
 if(user.role==='STUDENT')return {sql:`${base} AND ${alias}.student_id=?`,args:[user.tenantId,user.id]};
 if(user.role==='COORDINATOR')return {sql:`${base} AND ${alias}.class_id IN (SELECT id FROM classes WHERE tenant_id=? AND coordinator_id=?)`,args:[user.tenantId,user.tenantId,user.id]};
 if(user.role==='SUPERVISOR')return {sql:`${base} AND ${alias}.id IN (SELECT placement_id FROM assignments WHERE tenant_id=? AND supervisor_id=? AND active=1)`,args:[user.tenantId,user.tenantId,user.id]};
 return {sql:base,args:[user.tenantId]};
}
export function demoAllowed(mode:string|undefined,flag:string|undefined){return mode==='demo'&&flag==='true';}
