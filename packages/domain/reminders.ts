import { auditStatement,database,insert,list,one,statement,type PreparedStatement } from '../db/demo';
import { inputs,type Identity,type Row } from '../validation/contracts';
import { DomainError,requireRole } from './policies';
import { reminderTimes } from './deadline-time';

export async function scheduleDeadline(user:Identity,eventId:string,d:{eventType:string;endDate:string;endTime?:string;remindersEnabled:number;reminderTarget:string;status?:string},tx:PreparedStatement[],now=new Date()){
 const [targetKind,targetId]=d.reminderTarget==='NONE'?['NONE','']:d.reminderTarget.split(':');
 if(targetKind!=='NONE'){
  const table=targetKind==='CUSTOM_TEMPLATE'?'custom_document_templates':targetKind==='DOCUMENT_TEMPLATE'?'document_templates':null;
  if(!table||!targetId||!await one(`SELECT id FROM ${table} WHERE tenant_id=? AND id=? AND status='PUBLISHED'`,user.tenantId,targetId))throw new DomainError('Choose a published document form from this university.');
 }
 const old=await one('SELECT * FROM deadline_reminder_policies WHERE tenant_id=? AND event_id=?',user.tenantId,eventId),revision=Number(old?.revision??0)+1,time=now.toISOString();
 const enabled=d.eventType==='DEADLINE'&&d.remindersEnabled===1&&d.status!=='CANCELLED';
 tx.push(...cancelDeadlineSchedules(user.tenantId,eventId));
 if(old)tx.push(statement('UPDATE deadline_reminder_policies SET enabled=?,target_kind=?,target_id=?,revision=?,updated_at=?,updated_by=? WHERE tenant_id=? AND id=?',enabled?1:0,targetKind,targetId||null,revision,time,user.id,user.tenantId,old.id));
 else tx.push(insert('deadline_reminder_policies',{tenant_id:user.tenantId,event_id:eventId,enabled:enabled?1:0,target_kind:targetKind,target_id:targetId||null,revision,updated_at:time,updated_by:user.id}));
 if(enabled)for(const slot of reminderTimes(d.endDate,d.endTime)){if(slot.dueAt<=time||slot.dueAt>=slot.deadlineAt)continue;tx.push(insert('deadline_reminder_slots',{tenant_id:user.tenantId,event_id:eventId,policy_revision:revision,lead_days:slot.leadDays,due_at:slot.dueAt,deadline_at:slot.deadlineAt,next_attempt_at:slot.dueAt}));}
}
export function deleteDeadlineSchedules(tenantId:string,eventId:string){return [
 statement('DELETE FROM deadline_reminder_deliveries WHERE tenant_id=? AND slot_id IN (SELECT id FROM deadline_reminder_slots WHERE tenant_id=? AND event_id=?)',tenantId,tenantId,eventId),
 statement('DELETE FROM deadline_reminder_slots WHERE tenant_id=? AND event_id=?',tenantId,eventId),
 statement('DELETE FROM deadline_reminder_policies WHERE tenant_id=? AND event_id=?',tenantId,eventId),
];}
export function cancelDeadlineSchedules(tenantId:string,eventId:string){return [statement("UPDATE deadline_reminder_slots SET status='CANCELLED' WHERE tenant_id=? AND event_id=? AND status IN ('PENDING','FAILED')",tenantId,eventId)];}

function completionPredicate(policy:Row,studentAlias='u'): {sql:string;args:string[]} {
 const table=policy.targetKind==='CUSTOM_TEMPLATE'?'custom_document_responses':policy.targetKind==='DOCUMENT_TEMPLATE'?'document_submissions':null;
 if(!table)return {sql:'1=1',args:[]};
 return {sql:`NOT EXISTS (SELECT 1 FROM ${table} r JOIN placements p ON p.id=r.placement_id AND p.tenant_id=r.tenant_id WHERE r.tenant_id=${studentAlias}.tenant_id AND p.student_id=${studentAlias}.id AND r.template_id=? AND r.status IN ('SUBMITTED','APPROVED') AND (? IS NULL OR p.class_id=?))`,args:[String(policy.targetId),policy.classId as string,policy.classId as string]};
}
function recipientQuery(policy:Row,slot:Row){
 const completion=completionPredicate(policy);
 return {sql:`SELECT u.id FROM users u WHERE u.tenant_id=? AND u.role='STUDENT' AND u.status='ACTIVE' AND u.created_at<=? AND NOT EXISTS (SELECT 1 FROM student_verifications v WHERE v.tenant_id=u.tenant_id AND v.requester_id=u.id AND (v.status<>'APPROVED' OR v.approved_student_id IS NULL OR v.approved_student_id<>u.id)) AND NOT EXISTS (SELECT 1 FROM notification_preferences n WHERE n.tenant_id=u.tenant_id AND n.user_id=u.id AND n.deadline_reminders=0) AND (?='UNIVERSITY' OR EXISTS(SELECT 1 FROM enrollments e JOIN classes c ON c.id=e.class_id AND c.tenant_id=e.tenant_id WHERE e.tenant_id=u.tenant_id AND e.student_id=u.id AND e.class_id=? AND e.active=1 AND c.revoked=0 AND e.created_at<=?)) AND ${completion.sql}`,args:[policy.tenantId,String(slot.dueAt),String(policy.audience),policy.classId as string,String(slot.dueAt),...completion.args]};
}

export async function runDeadlineReminders(tenantId:string,now=new Date()):Promise<number>{
 const time=now.toISOString();let delivered=0;
 await statement("UPDATE deadline_reminder_slots SET status='EXPIRED' WHERE tenant_id=? AND deadline_at<=? AND status IN ('PENDING','FAILED')",tenantId,time).run();
 const slots=await list("SELECT * FROM deadline_reminder_slots WHERE tenant_id=? AND status='PENDING' AND next_attempt_at<=? AND deadline_at>? ORDER BY due_at DESC LIMIT 200",tenantId,time,time);
 const seen=new Set<string>();
 for(const slot of slots){
  const key=`${slot.eventId}:${slot.policyRevision}`;
  if(seen.has(key)){await statement("UPDATE deadline_reminder_slots SET status='SUPERSEDED' WHERE tenant_id=? AND id=? AND status='PENDING'",tenantId,slot.id).run();continue;}seen.add(key);
  try{
   const policy=await one("SELECT r.*,e.title,e.audience,e.class_id,e.end_date,e.end_time FROM deadline_reminder_policies r JOIN calendar_events e ON e.id=r.event_id AND e.tenant_id=r.tenant_id WHERE r.tenant_id=? AND r.event_id=? AND r.revision=? AND r.enabled=1 AND e.status='ACTIVE' AND e.event_type='DEADLINE'",tenantId,String(slot.eventId),Number(slot.policyRevision));
   if(!policy){await statement("UPDATE deadline_reminder_slots SET status='CANCELLED' WHERE tenant_id=? AND id=?",tenantId,slot.id).run();continue;}
   const q=recipientQuery(policy,slot),recipients=await list(q.sql,...q.args);
   for(const recipient of recipients){
    const id=`${slot.id}:${recipient.id}`,claim=crypto.randomUUID(),dueLabel=`${policy.endDate} ${policy.endTime||'23:59'} Manila`;
    const tx=[
     statement("INSERT INTO deadline_reminder_deliveries (id,tenant_id,created_at,slot_id,user_id) VALUES (?,?,?,?,?) ON CONFLICT(tenant_id,slot_id,user_id) DO NOTHING",id,tenantId,time,slot.id,recipient.id),
     statement("UPDATE deadline_reminder_deliveries SET claim_id=?,status='SENDING' WHERE tenant_id=? AND id=? AND status='PENDING'",claim,tenantId,id),
     statement(`INSERT INTO notifications (id,tenant_id,created_at,user_id,title,message,type,resource_type,resource_id,link_page) SELECT ?,?,?,?,'Document deadline reminder',?,'CALENDAR','deadline_reminder',?,'calendar' WHERE EXISTS (SELECT 1 FROM deadline_reminder_deliveries WHERE tenant_id=? AND id=? AND claim_id=? AND status='SENDING') AND EXISTS (SELECT 1 FROM deadline_reminder_policies r JOIN calendar_events e ON e.id=r.event_id AND e.tenant_id=r.tenant_id WHERE r.tenant_id=? AND r.event_id=? AND r.revision=? AND r.enabled=1 AND e.status='ACTIVE') AND ? IN (${q.sql})`,id,tenantId,time,recipient.id,`${policy.title} is due ${dueLabel}.${policy.targetKind==='NONE'?' General deadline notice; completion is not tracked.':' Submit the linked document if it still needs action.'}`,String(slot.eventId),tenantId,id,claim,tenantId,String(slot.eventId),Number(slot.policyRevision),recipient.id,...q.args),
     statement("UPDATE deadline_reminder_deliveries SET status=CASE WHEN EXISTS(SELECT 1 FROM notifications WHERE tenant_id=? AND id=?) THEN 'DELIVERED' ELSE 'SUPPRESSED' END,delivered_at=? WHERE tenant_id=? AND id=? AND claim_id=?",tenantId,id,time,tenantId,id,claim),
    ];
    await database().batch(tx);if(await one("SELECT id FROM deadline_reminder_deliveries WHERE tenant_id=? AND id=? AND status='DELIVERED' AND claim_id=?",tenantId,id,claim))delivered++;
   }
   await statement("UPDATE deadline_reminder_slots SET status='DISPATCHED',last_error=NULL WHERE tenant_id=? AND id=? AND status='PENDING'",tenantId,slot.id).run();
  }catch{
   const attempts=Number(slot.attempts)+1,delay=[60000,300000,900000][Math.min(attempts-1,2)];
   await statement('UPDATE deadline_reminder_slots SET attempts=?,status=?,next_attempt_at=?,last_error=? WHERE tenant_id=? AND id=?',attempts,attempts>=3?'FAILED':'PENDING',new Date(now.getTime()+delay).toISOString(),'Reminder processing failed. Check database and document configuration, then retry.',tenantId,slot.id).run();
  }
 }
 await statement('INSERT INTO workflow_worker_state (id,tenant_id,created_at,checked_at,last_error) VALUES (?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at,last_error=NULL',`workflows:${tenantId}`,tenantId,time,time).run();
 return delivered;
}

export async function reminderAction(user:Identity,action:string,payload:unknown){
 if(action==='reminderPreference'){
  const d=inputs.reminderPreference.parse(payload);await database().batch([statement('INSERT INTO notification_preferences (id,tenant_id,created_at,user_id,deadline_reminders) VALUES (?,?,?,?,?) ON CONFLICT(tenant_id,user_id) DO UPDATE SET deadline_reminders=excluded.deadline_reminders',`${user.tenantId}:${user.id}`,user.tenantId,new Date().toISOString(),user.id,d.enabled),auditStatement(user.id,'REMINDER_PREFERENCE_CHANGED',user.id,null,user.tenantId)]);return {message:d.enabled?'Deadline reminders enabled.':'Deadline reminders disabled.'};
 }
 if(action==='retryDeadlineReminder'){
  requireRole(user,'SUPER_ADMIN','COORDINATOR');const d=inputs.retryDeadlineReminder.parse(payload);
  const slot=await one(`SELECT s.id FROM deadline_reminder_slots s JOIN calendar_events e ON e.id=s.event_id AND e.tenant_id=s.tenant_id WHERE s.tenant_id=? AND s.id=? AND s.status='FAILED' AND s.deadline_at>? ${user.role==='COORDINATOR'?"AND e.class_id IN (SELECT id FROM classes WHERE tenant_id=? AND coordinator_id=?)":''}`,user.tenantId,d.slotId,new Date().toISOString(),...(user.role==='COORDINATOR'?[user.tenantId,user.id]:[]));
  if(!slot)throw new DomainError('This reminder is unavailable, expired or outside your scope.',403);
  await database().batch([statement("UPDATE deadline_reminder_slots SET status='PENDING',attempts=0,next_attempt_at=?,last_error=NULL WHERE tenant_id=? AND id=? AND status='FAILED'",new Date().toISOString(),user.tenantId,slot.id),auditStatement(user.id,'REMINDER_RETRY_REQUESTED',slot.id,null,user.tenantId)]);return {message:'Reminder retry queued.'};
 }
 return null;
}

export async function reminderSnapshot(user:Identity){
 const preference=await one('SELECT deadline_reminders FROM notification_preferences WHERE tenant_id=? AND user_id=?',user.tenantId,user.id);
 if(!['COORDINATOR','SUPER_ADMIN'].includes(user.role))return {deadlineRemindersEnabled:preference?.deadlineReminders!==0};
 const scope=user.role==='SUPER_ADMIN'?'1=1':'e.class_id IN (SELECT id FROM classes WHERE tenant_id=? AND coordinator_id=?)',args=user.role==='SUPER_ADMIN'?[]:[user.tenantId,user.id];
 return {deadlineRemindersEnabled:preference?.deadlineReminders!==0,reminderPolicies:await list(`SELECT r.* FROM deadline_reminder_policies r JOIN calendar_events e ON e.id=r.event_id AND e.tenant_id=r.tenant_id WHERE r.tenant_id=? AND ${scope}`,user.tenantId,...args),reminderJobs:await list(`SELECT s.*,e.title FROM deadline_reminder_slots s JOIN calendar_events e ON e.id=s.event_id AND e.tenant_id=s.tenant_id WHERE s.tenant_id=? AND ${scope} ORDER BY s.due_at DESC LIMIT 100`,user.tenantId,...args),workflowWorker:await one('SELECT * FROM workflow_worker_state WHERE tenant_id=?',user.tenantId)};
}
