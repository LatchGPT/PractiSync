import { auditStatement, database, insert, list, one, statement } from '../db/demo';
import { inputs, type Identity, type Row } from '../validation/contracts';
import { DomainError, requireRole, scope } from './policies';

export { verifiedEmployerAttribution, verifiedEmployerEvidence, latestEmployerEvidence } from './feedback-evidence';

export async function feedbackAction(user: Identity, action: string, payload: unknown) {
 if (action !== 'industryFeedback' && action !== 'invalidateIndustryFeedback') return null;
 if (action === 'invalidateIndustryFeedback') {
  requireRole(user, 'SUPER_ADMIN');
  const d = inputs.invalidateIndustryFeedback.parse(payload);
  const row = await one('SELECT * FROM industry_feedback WHERE tenant_id=? AND id=?', user.tenantId, d.feedbackId);
  if (!row || row.verificationState !== 'VERIFIED' || Number(row.version) !== d.version) throw new DomainError('Feedback changed or is no longer verified. Refresh the ledger.', 409);
  const time = new Date().toISOString();
  await database().batch([
   insert('industry_feedback_history', { tenant_id:user.tenantId, feedback_id:row.id, version:Number(row.version), actor_id:user.id, record_json:JSON.stringify(row) }),
   statement("UPDATE industry_feedback SET verification_state='INVALIDATED',invalidated_by=?,invalidation_reason=?,invalidated_at=?,version=CASE WHEN version=? AND verification_state='VERIFIED' THEN version+1 ELSE NULL END WHERE tenant_id=? AND id=?", user.id,d.reason,time,d.version,user.tenantId,row.id),
   auditStatement(user.id,'INDUSTRY_FEEDBACK_INVALIDATED',row.id,d.reason,user.tenantId),
  ]).catch(() => { throw new DomainError('Feedback changed. Refresh the ledger before trying again.',409); });
  return {id:row.id,message:'Feedback invalidated. Its history is retained and it is excluded from analytics.'};
 }
 requireRole(user,'SUPERVISOR');
 const d = inputs.industryFeedback.parse(payload), s = scope(user);
 const p = await one(`SELECT p.* FROM placements p WHERE ${s.sql} AND p.id=? AND p.status IN ('ACTIVE','COMPLETED')`, ...s.args,d.placementId);
 if (!p) throw new DomainError('Feedback requires a verified company and an active assignment to this placement.',403);
 const assignment = await one("SELECT a.id FROM assignments a JOIN users u ON u.id=a.supervisor_id AND u.tenant_id=a.tenant_id JOIN companies c ON c.id=u.company_id AND c.tenant_id=u.tenant_id WHERE a.tenant_id=? AND a.placement_id=? AND a.supervisor_id=? AND a.active=1 AND u.status='ACTIVE' AND u.role='SUPERVISOR' AND u.supervisor_verified=1 AND c.status='APPROVED' AND c.id=? ORDER BY a.id LIMIT 1",user.tenantId,p.id,user.id,String(p.companyId));
 if (!assignment) throw new DomainError('Your supervisor assignment is no longer available.',403);
 const old = await one("SELECT * FROM industry_feedback WHERE tenant_id=? AND placement_id=? AND evaluator_id=? AND authorship_method='DIRECT'",user.tenantId,p.id,user.id);
 if (Number(old?.version ?? 0) !== d.version) throw new DomainError('Feedback changed. Refresh before submitting another revision.',409);
 if (old?.verificationState === 'INVALIDATED') throw new DomainError('This response was invalidated. Contact the Internship Office before resubmitting.',409);
 const id = old?.id ?? crypto.randomUUID(), time = new Date().toISOString();
 const values = {tenant_id:user.tenantId,placement_id:p.id,company_id:String(p.companyId),supervisor_id:user.id,evaluator_id:user.id,entered_by:user.id,assignment_id:assignment.id,authorship_method:'DIRECT',verification_state:'VERIFIED',verified_at:time,submitted_at:time,course_id:String(p.courseId),academic_period:String(p.period),framework_version:1,workplace_readiness:d.workplaceReadiness,competency_relevance:d.competencyRelevance,supervision_support:d.supervisionSupport,curriculum_alignment:d.curriculumAlignment,technical_gaps:d.technicalGaps??null,soft_skill_gaps:d.softSkillGaps??null,recommendations:d.recommendations,status:'SUBMITTED'};
 const tx = [];
 if (old) {
  tx.push(insert('industry_feedback_history',{tenant_id:user.tenantId,feedback_id:id,version:Number(old.version),actor_id:user.id,record_json:JSON.stringify(old)}));
  const entries = Object.entries(values).filter(([key])=>key!=='tenant_id');
  tx.push(statement(`UPDATE industry_feedback SET ${entries.map(([key])=>key+'=?').join(',')},version=CASE WHEN version=? AND verification_state='VERIFIED' THEN version+1 ELSE NULL END WHERE tenant_id=? AND id=?`,...entries.map(([,v])=>v),d.version,user.tenantId,id));
 } else tx.push(insert('industry_feedback',values,id));
 // A transaction-time guard closes the gap between eligibility lookup and commit.
 tx.push(statement("UPDATE industry_feedback SET version=CASE WHEN EXISTS (SELECT 1 FROM assignments a JOIN users u ON u.id=a.supervisor_id AND u.tenant_id=a.tenant_id JOIN companies c ON c.id=u.company_id AND c.tenant_id=u.tenant_id JOIN placements p ON p.id=a.placement_id AND p.tenant_id=a.tenant_id WHERE a.id=? AND a.tenant_id=? AND a.active=1 AND u.id=? AND u.status='ACTIVE' AND u.role='SUPERVISOR' AND u.supervisor_verified=1 AND c.status='APPROVED' AND c.id=p.company_id AND p.id=? AND p.status IN ('ACTIVE','COMPLETED')) THEN version ELSE NULL END WHERE tenant_id=? AND id=?",assignment.id,user.tenantId,user.id,p.id,user.tenantId,id));
 tx.push(auditStatement(user.id,'INDUSTRY_FEEDBACK_SUBMITTED',id,null,user.tenantId));
 await database().batch(tx).catch(()=>{throw new DomainError('Feedback changed or your assignment was revoked. Refresh before trying again.',409);});
 return {id,message:old?'Feedback revision submitted. Previous authorship is preserved.':'Feedback submitted with verified supervisor attribution.'};
}

export async function feedbackHistory(user: Identity): Promise<Row[]> {
 if (!['COORDINATOR','SUPER_ADMIN'].includes(user.role)) return [];
 const s=scope(user);
 return list(`SELECT h.* FROM industry_feedback_history h JOIN industry_feedback f ON f.id=h.feedback_id AND f.tenant_id=h.tenant_id WHERE h.tenant_id=? AND f.placement_id IN (SELECT p.id FROM placements p WHERE ${s.sql}) ORDER BY h.created_at DESC LIMIT 200`,user.tenantId,...s.args);
}
