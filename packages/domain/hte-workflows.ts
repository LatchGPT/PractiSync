import {hteActivationStatements} from '../auth/accounts';
import {runtimeTenantId} from '../auth/runtime';
import { auditStatement, database, insert, list, one, statement, type PreparedStatement } from '../db/demo';
import { hashPassword, verifyPassword } from '../auth/password';
import { limit } from '../auth/auth';
import { hteRegistration, companyDetails, jobDetails, evaluationQuestions } from '../validation/hte';
import { inputs, type Action, type Identity, type Row, type Snapshot } from '../validation/contracts';
import { DomainError, requireRole, scope } from './policies';

const num = (row: Row, key: string) => Number(row[key] ?? 0);
const str = (row: Row, key: string) => String(row[key] ?? '');
const now = () => new Date().toISOString();
const conflict = () => new DomainError('This record changed. Refresh before trying again.', 409);

async function commit(user: Identity, action: string, id: string, tx: PreparedStatement[], message: string) {
 try { await database().batch([...tx, auditStatement(user.id, action, id)]); }
 catch (error) {
  if (/null|unique|constraint/i.test(String(error))) throw conflict();
  throw error;
 }
 return { id, message };
}
function notify(user: Identity, userId: string, title: string, message: string, linkPage: string) {
 return insert('notifications', { tenant_id: user.tenantId, user_id: userId, title, message, type: 'HTE', resource_type: 'hte', link_page: linkPage });
}
async function notifyAdmins(user: Identity, title: string, message: string) {
 return (await list("SELECT id FROM users WHERE tenant_id=? AND role='SUPER_ADMIN' AND status='ACTIVE'", user.tenantId)).map(admin => notify(user, admin.id, title, message, 'hte-requests'));
}
export async function verifiedHte(user: Identity) {
 requireRole(user, 'SUPERVISOR');
 const company = await one("SELECT c.* FROM companies c JOIN users u ON u.company_id=c.id AND u.tenant_id=c.tenant_id WHERE u.tenant_id=? AND u.id=? AND u.status='ACTIVE' AND u.role='SUPERVISOR' AND u.supervisor_verified=1 AND u.can_post=1 AND c.status='APPROVED' AND c.can_post=1", user.tenantId, user.id);
 if (!company) throw new DomainError('Super Admin approval is required before you can use this feature.', 403);
 return company;
}
async function placement(user: Identity, id: string) {
 if (user.role === 'SUPERVISOR') await verifiedHte(user);
 const s = scope(user);
 const p = await one(`SELECT p.* FROM placements p WHERE ${s.sql} AND p.id=?`, ...s.args, id);
 if (!p) throw new DomainError('Placement not found in your assigned scope.', 403);
 return p;
}
// The placement row serializes attendance edits, final submissions and decisions.
export function attendanceGuard(user: Identity, p: Row, editable = false) {
 return statement(`UPDATE placements SET dtr_revision=CASE WHEN dtr_revision=? ${editable ? "AND NOT EXISTS (SELECT 1 FROM final_dtrs f WHERE f.tenant_id=placements.tenant_id AND f.placement_id=placements.id AND f.status IN ('SUBMITTED','VERIFIED'))" : ''} THEN dtr_revision+1 ELSE NULL END WHERE tenant_id=? AND id=?`, num(p, 'dtrRevision'), user.tenantId, p.id);
}
async function finalDtr(user: Identity, placementId: string, version: unknown) {
 const record = await one('SELECT * FROM final_dtrs WHERE tenant_id=? AND placement_id=?', user.tenantId, placementId);
 if (!record || num(record, 'version') !== Number(version)) throw conflict();
 return record;
}
function archiveDtr(user: Identity, record: Row) {
 return insert('final_dtr_history', { tenant_id: user.tenantId, final_dtr_id: record.id, version: num(record, 'version'), record_json: JSON.stringify(record) });
}
function archiveEvaluation(user: Identity, record: Row) {
 return insert('hte_evaluation_history', { tenant_id: user.tenantId, response_id: record.id, version: num(record, 'version'), record_json: JSON.stringify(record) });
}
function requestRecord(user: Identity, companyId: string, resourceId: string, kind: string, payload: unknown, baseVersion: number) {
 const id = crypto.randomUUID();
 return { id, query: insert('hte_requests', { tenant_id: user.tenantId, requester_id: user.id, company_id: companyId, resource_id: resourceId, kind, payload_json: JSON.stringify(payload), base_version: baseVersion, status: 'PENDING' }, id) };
}

export async function registerHte(payload: unknown) {
 const d = hteRegistration.parse(payload);
 if (await one('SELECT id FROM users WHERE username=? OR lower(email)=?', d.username, d.email.toLowerCase())) throw new DomainError('That username or email is already registered. Sign in or choose different details.', 409);
 const userId = crypto.randomUUID(), companyId = crypto.randomUUID();
 const tenantId=runtimeTenantId();
 const activation=process.env.DEPLOYMENT_MODE==='institutional'?await hteActivationStatements(tenantId,userId,d.email.toLowerCase()):[];
 const user = { id: userId, tenantId } as Identity;
 const req = requestRecord(user, companyId, companyId, 'REGISTRATION', { name: d.name, industry: d.industry, location: d.location, description: d.description, contactName: d.contactName, email: d.email }, 1);
 return commit(user, 'HTE_REGISTRATION_SUBMITTED', req.id, [
  insert('companies', { tenant_id: tenantId, name: d.name, industry: d.industry, location: d.location, description: d.description, status: 'PENDING', can_post: 0 }, companyId),
  insert('users', { tenant_id: tenantId, name: d.contactName, username: d.username, email: d.email.toLowerCase(), role: 'SUPERVISOR', status: process.env.DEPLOYMENT_MODE==='institutional'?'INVITED':'ACTIVE', password_hash: await hashPassword(d.password), session_version: 1, is_demo: 0, company_id: companyId, supervisor_verified: 0, can_post: 0 }, userId),
  ...activation,req.query, ...await notifyAdmins(user, 'HTE registration awaiting approval', `${d.name} submitted an HTE registration request.`),
 ], process.env.DEPLOYMENT_MODE==='institutional'?'Registration submitted. Activate your account using the emailed link, then sign in to track Super Admin approval.':'Registration submitted. Sign in to track Super Admin approval.');
}

export async function mutateHte(user: Identity, action: Action, payload: unknown): Promise<{ id?: string; message: string } | null> {
 if (action === 'confirm') throw new DomainError('Daily confirmations have been replaced by final DTR verification.', 409);
 if (action === 'industryFinalEvaluation') throw new DomainError('Use the school evaluation form after final DTR verification. The old sample rubric is no longer accepting submissions.', 409);
 if (action === 'companyVerification' || action === 'jobReview') {
  requireRole(user, 'SUPER_ADMIN');
  const d = inputs[action].parse(payload);
  const resourceId = 'companyId' in d ? d.companyId : d.jobId;
  const request = await one("SELECT * FROM hte_requests WHERE tenant_id=? AND resource_id=? AND status='PENDING'", user.tenantId, resourceId);
  if (request) return mutateHte(user, 'hteRequestReview', { requestId: request.id, version: num(request, 'version'), decision: d.decision, note: 'note' in d ? d.note ?? '' : '' });
  return null;
 }
 if (action === 'companyProfile' && user.role === 'SUPERVISOR') {
  const d = companyDetails.parse(payload);
  const currentUser = await one('SELECT company_id FROM users WHERE tenant_id=? AND id=?', user.tenantId, user.id);
  const company = currentUser?.companyId ? await one('SELECT * FROM companies WHERE tenant_id=? AND id=?', user.tenantId, currentUser.companyId) : null;
  if (company && company.status !== 'REJECTED') throw new DomainError('A company request already exists. Use Request profile changes for an approved company.', 409);
  const id = company?.id ?? crypto.randomUUID();
  const req = requestRecord(user, id, id, 'REGISTRATION', d, company ? num(company, 'version') : 1);
  return commit(user, 'HTE_REGISTRATION_SUBMITTED', id, [
   ...(company ? [statement("UPDATE companies SET name=?,industry=?,location=?,description=?,status='PENDING' WHERE tenant_id=? AND id=? AND status='REJECTED'", d.name, d.industry, d.location, d.description, user.tenantId, id)] : [insert('companies', { tenant_id: user.tenantId, ...d, status: 'PENDING', can_post: 0 }, id), statement('UPDATE users SET company_id=?,supervisor_verified=0,can_post=0 WHERE tenant_id=? AND id=?', id, user.tenantId, user.id)]),
   req.query, ...await notifyAdmins(user, 'HTE registration awaiting approval', `${d.name} requested verification.`),
  ], 'Company details submitted for Super Admin approval.');
 }
 if (action === 'job' && user.role === 'SUPERVISOR') {
  const company = await verifiedHte(user), d = jobDetails.parse(payload), id = crypto.randomUUID();
  if (!await one('SELECT id FROM courses WHERE tenant_id=? AND id=?', user.tenantId, d.courseId)) throw new DomainError('Choose a valid course.');
  const req = requestRecord(user, company.id, id, 'JOB_CREATE', d, 1);
  return commit(user, 'HTE_JOB_REQUESTED', id, [insert('jobs', { tenant_id: user.tenantId, company_id: company.id, author_id: user.id, title: d.title, description: d.description, location: d.location, course_id: d.courseId, skills: d.skills, openings: d.openings, status: 'DRAFT' }, id), req.query, ...await notifyAdmins(user, 'Internship post awaiting approval', `${user.name} submitted ${d.title}.`)], 'Internship post submitted for Super Admin approval.');
 }
 if (action === 'hteProfileChange' || action === 'hteJobChange' || action === 'hteJobClose') {
  const company = await verifiedHte(user);
  if (action === 'hteProfileChange') {
   const d = inputs.hteProfileChange.parse(payload);
   if (d.version !== num(company, 'version')) throw conflict();
   const req = requestRecord(user, company.id, company.id, 'PROFILE', companyDetails.parse(d), d.version);
   return commit(user, 'HTE_PROFILE_REQUESTED', req.id, [req.query, ...await notifyAdmins(user, 'HTE profile changes awaiting approval', `${str(company, 'name')} requested a profile update.`)], 'Profile changes requested. The approved profile stays in use until approval.');
  }
  const d = action === 'hteJobChange' ? inputs.hteJobChange.parse(payload) : inputs.hteJobClose.parse(payload);
  const job = await one('SELECT * FROM jobs WHERE tenant_id=? AND id=? AND company_id=?', user.tenantId, d.jobId, company.id);
  if (!job || num(job, 'version') !== d.version) throw conflict();
  if (action === 'hteJobClose' && job.status !== 'PUBLISHED') throw new DomainError('Only a published post can be closed.');
  if (action === 'hteJobChange' && !['PUBLISHED','ARCHIVED'].includes(str(job, 'status'))) throw new DomainError('Wait for the current post review before editing.');
   if ('courseId' in d && !await one('SELECT id FROM courses WHERE tenant_id=? AND id=?', user.tenantId, String(d.courseId))) throw new DomainError('Choose a valid course.');
  const req = requestRecord(user, company.id, job.id, action === 'hteJobClose' ? 'JOB_CLOSE' : 'JOB_EDIT', action === 'hteJobChange' ? jobDetails.parse(d) : {}, d.version);
  return commit(user, 'HTE_JOB_CHANGE_REQUESTED', req.id, [req.query, ...await notifyAdmins(user, 'Internship post change awaiting approval', `${user.name} requested a change to ${str(job, 'title')}.`)], 'Request submitted. The current post stays unchanged until Super Admin approval.');
 }
 if (action === 'hteRequestReview') {
  requireRole(user, 'SUPER_ADMIN');
  const d = inputs.hteRequestReview.parse(payload);
  if (d.decision === 'REJECT' && !d.note) throw new DomainError('Explain why this request is rejected.');
  const r = await one('SELECT * FROM hte_requests WHERE tenant_id=? AND id=?', user.tenantId, d.requestId);
  if (!r || r.status !== 'PENDING' || num(r, 'version') !== d.version) throw conflict();
  const company = await one('SELECT * FROM companies WHERE tenant_id=? AND id=?', user.tenantId, r.companyId);
  if (!company) throw new DomainError('Company not found.', 404);
  const approve = d.decision === 'APPROVE', data = JSON.parse(str(r, 'payloadJson'));
  const tx = [statement("UPDATE hte_requests SET version=CASE WHEN version=? AND status='PENDING' THEN version+1 ELSE NULL END,status=?,note=?,reviewed_by=?,reviewed_at=? WHERE tenant_id=? AND id=?", d.version, approve ? 'APPROVED' : 'REJECTED', d.note, user.id, now(), user.tenantId, r.id)];
  if (r.kind === 'REGISTRATION') {
   tx.push(statement('UPDATE companies SET version=CASE WHEN version=? THEN version+1 ELSE NULL END,status=?,can_post=? WHERE tenant_id=? AND id=?', num(r, 'baseVersion'), approve ? 'APPROVED' : 'REJECTED', approve ? 1 : 0, user.tenantId, company.id));
   tx.push(statement("UPDATE users SET supervisor_verified=?,can_post=? WHERE tenant_id=? AND company_id=? AND role='SUPERVISOR'", approve ? 1 : 0, approve ? 1 : 0, user.tenantId, company.id));
  } else if (approve) {
   if (company.status !== 'APPROVED' || !num(company, 'canPost')) throw new DomainError('The company must be approved before this change can be approved.', 409);
   if (r.kind === 'PROFILE') {
    const p = companyDetails.parse(data);
    tx.push(statement('UPDATE companies SET version=CASE WHEN version=? THEN version+1 ELSE NULL END,name=?,industry=?,location=?,description=? WHERE tenant_id=? AND id=?', num(r, 'baseVersion'), p.name, p.industry, p.location, p.description, user.tenantId, company.id));
   } else {
    const job = await one('SELECT * FROM jobs WHERE tenant_id=? AND id=? AND company_id=?', user.tenantId, r.resourceId, company.id);
    if (!job || num(job, 'version') !== num(r, 'baseVersion')) throw conflict();
    if (r.kind === 'JOB_CLOSE') tx.push(statement("UPDATE jobs SET version=CASE WHEN version=? THEN version+1 ELSE NULL END,status='ARCHIVED' WHERE tenant_id=? AND id=?", num(r, 'baseVersion'), user.tenantId, job.id));
    else {
     const p = jobDetails.parse(data);
     tx.push(statement("UPDATE jobs SET version=CASE WHEN version=? THEN version+1 ELSE NULL END,title=?,description=?,location=?,course_id=?,skills=?,openings=?,status='PUBLISHED' WHERE tenant_id=? AND id=?", num(r, 'baseVersion'), p.title, p.description, p.location, p.courseId, p.skills, p.openings, user.tenantId, job.id));
    }
   }
  } else if (r.kind === 'JOB_CREATE') tx.push(statement("UPDATE jobs SET status='ARCHIVED' WHERE tenant_id=? AND id=? AND status='DRAFT'", user.tenantId, r.resourceId));
  tx.push(notify(user, str(r, 'requesterId'), approve ? 'HTE request approved' : 'HTE request rejected', `${str(r, 'kind').replaceAll('_',' ').toLowerCase()}: ${d.note || 'Approved by Super Admin.'}`, 'jobs'));
  return commit(user, 'HTE_REQUEST_REVIEWED', r.id, tx, approve ? 'Request approved and changes applied.' : 'Request rejected. The HTE can review your reason and submit a corrected request.');
 }
 if (action === 'finalDtrSubmit') {
  requireRole(user, 'STUDENT'); const d = inputs.finalDtrSubmit.parse(payload), p = await placement(user, d.placementId);
  if (p.status !== 'ACTIVE') throw new DomainError('Final DTR submission requires an active placement.');
  const current = await one('SELECT * FROM final_dtrs WHERE tenant_id=? AND placement_id=?', user.tenantId, p.id);
  if (Number(current?.version ?? 0) !== d.version || (current && current.status !== 'REVISION_REQUESTED')) throw new DomainError('The final DTR is locked or has changed. Refresh to see its current status.', 409);
  const entries = await list('SELECT e.id,e.date,e.version,i.starts_at,i.ends_at,i.break_minutes,i.minutes FROM entries e JOIN intervals i ON i.entry_id=e.id AND i.tenant_id=e.tenant_id WHERE e.tenant_id=? AND e.placement_id=? ORDER BY e.date,i.starts_at,e.id', user.tenantId, p.id);
  const total = entries.reduce((sum, e) => sum + num(e, 'minutes'), 0);
  if (!num(p, 'requiredMinutes') || total < num(p, 'requiredMinutes')) throw new DomainError('Reach the required hours before submitting the final DTR.', 409);
  const id = current?.id ?? crypto.randomUUID();
  const tx = [attendanceGuard(user, p, true)];
  if (current) tx.push(archiveDtr(user, current), statement("UPDATE final_dtrs SET version=CASE WHEN version=? AND status='REVISION_REQUESTED' THEN version+1 ELSE NULL END,snapshot_json=?,attendance_revision=?,total_minutes=?,status='SUBMITTED',submitted_by=?,reviewed_by=NULL,reviewed_at=NULL,note=NULL WHERE tenant_id=? AND id=?", d.version, JSON.stringify(entries), num(p, 'dtrRevision') + 1, total, user.id, user.tenantId, id));
  else tx.push(insert('final_dtrs', { tenant_id: user.tenantId, placement_id: p.id, attendance_revision: num(p, 'dtrRevision') + 1, snapshot_json: JSON.stringify(entries), total_minutes: total, status: 'SUBMITTED', submitted_by: user.id }, id));
  const supervisors = await list("SELECT u.id FROM assignments a JOIN users u ON u.id=a.supervisor_id AND u.tenant_id=a.tenant_id JOIN companies c ON c.id=u.company_id AND c.tenant_id=u.tenant_id WHERE a.tenant_id=? AND a.placement_id=? AND a.active=1 AND u.status='ACTIVE' AND u.role='SUPERVISOR' AND u.supervisor_verified=1 AND c.id=? AND c.status='APPROVED'", user.tenantId, p.id, p.companyId);
  if (!supervisors.length) throw new DomainError('Your coordinator must assign an approved HTE supervisor before you submit the final DTR.', 409);
  tx.push(...supervisors.map(s => notify(user, s.id, 'Final DTR awaiting verification', `${user.name} submitted their complete attendance for review.`, 'attendance')));
  return commit(user, 'FINAL_DTR_SUBMITTED', id, tx, 'Final DTR submitted. Attendance is locked while the HTE reviews it.');
 }
 if (action === 'finalDtrReview') {
  requireRole(user, 'SUPERVISOR'); const d = inputs.finalDtrReview.parse(payload), p = await placement(user, d.placementId), f = await finalDtr(user, p.id, d.version);
  if (p.status !== 'ACTIVE' || f.status !== 'SUBMITTED' || num(f, 'attendanceRevision') !== num(p, 'dtrRevision')) throw conflict();
  if (d.decision === 'REJECT' && !d.note) throw new DomainError('Explain which dates or times need correction.');
  return commit(user, 'FINAL_DTR_REVIEWED', f.id, [attendanceGuard(user, p), archiveDtr(user, f), statement("UPDATE final_dtrs SET version=CASE WHEN version=? AND status='SUBMITTED' THEN version+1 ELSE NULL END,status=?,attendance_revision=?,note=?,reviewed_by=?,reviewed_at=? WHERE tenant_id=? AND id=?", d.version, d.decision === 'VERIFY' ? 'VERIFIED' : 'REVISION_REQUESTED', num(p, 'dtrRevision') + 1, d.note, user.id, now(), user.tenantId, f.id), notify(user, str(p, 'studentId'), d.decision === 'VERIFY' ? 'Final DTR verified' : 'Final DTR needs correction', d.note || 'Your HTE verified the complete attendance record.', 'attendance')], d.decision === 'VERIFY' ? 'Complete DTR verified. The school evaluation is the next step.' : 'DTR returned to the student for correction and resubmission.');
 }
 if (action === 'finalDtrReopen') {
  requireRole(user, 'STUDENT'); const d = inputs.finalDtrReopen.parse(payload), p = await placement(user, d.placementId), f = await finalDtr(user, p.id, d.version);
  if (f.status !== 'VERIFIED') throw new DomainError('Only a verified final DTR requires a reopening request.');
  const id = crypto.randomUUID(), cls = await one('SELECT coordinator_id FROM classes WHERE tenant_id=? AND id=?', user.tenantId, p.classId);
  return commit(user, 'FINAL_DTR_REOPEN_REQUESTED', id, [attendanceGuard(user, p), statement('UPDATE final_dtrs SET attendance_revision=? WHERE tenant_id=? AND id=?', num(p, 'dtrRevision') + 1, user.tenantId, f.id), insert('final_dtr_reopens', { tenant_id: user.tenantId, placement_id: p.id, final_dtr_version: d.version, student_id: user.id, reason: d.reason }, id), ...(cls ? [notify(user, str(cls, 'coordinatorId'), 'DTR reopening requested', `${user.name}: ${d.reason}`, 'attendance')] : [])], 'Reopening requested. Attendance stays locked until your coordinator approves.');
 }
 if (action === 'finalDtrReopenReview') {
  requireRole(user, 'COORDINATOR'); const d = inputs.finalDtrReopenReview.parse(payload);
  const r = await one('SELECT * FROM final_dtr_reopens WHERE tenant_id=? AND id=?', user.tenantId, d.requestId);
  if (!r || r.status !== 'PENDING' || num(r, 'version') !== d.version) throw conflict();
  const p = await placement(user, str(r, 'placementId')), f = await finalDtr(user, p.id, r.finalDtrVersion);
  if (f.status !== 'VERIFIED') throw conflict();
  const tx = [statement("UPDATE final_dtr_reopens SET version=CASE WHEN version=? AND status='PENDING' THEN version+1 ELSE NULL END,status=?,note=?,reviewed_by=?,reviewed_at=? WHERE tenant_id=? AND id=?", d.version, d.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', d.note, user.id, now(), user.tenantId, r.id)];
  if (d.decision === 'APPROVE') {
   tx.push(attendanceGuard(user, p), archiveDtr(user, f), statement("UPDATE final_dtrs SET version=CASE WHEN version=? THEN version+1 ELSE NULL END,status='REVISION_REQUESTED',note=?,reviewed_by=?,reviewed_at=? WHERE tenant_id=? AND id=?", num(f, 'version'), d.note, user.id, now(), user.tenantId, f.id), statement("UPDATE placements SET status='ACTIVE' WHERE tenant_id=? AND id=?", user.tenantId, p.id), statement("UPDATE completion SET status='PENDING',reason=?,decided_at=NULL,decided_by=NULL WHERE tenant_id=? AND placement_id=?", 'DTR reopened; renewed HTE verification and evaluation review required.', user.tenantId, p.id));
   const evaluation = await one('SELECT * FROM hte_evaluation_responses WHERE tenant_id=? AND placement_id=?', user.tenantId, p.id);
   if (evaluation) tx.push(archiveEvaluation(user, evaluation), statement("UPDATE hte_evaluation_responses SET status='REVISION_REQUESTED',version=version+1,note=?,reviewed_by=NULL,reviewed_at=NULL,updated_at=? WHERE tenant_id=? AND id=?", 'DTR reopened. Review and resubmit after attendance is verified again.', now(), user.tenantId, evaluation.id));
  }
  tx.push(notify(user, str(r, 'studentId'), d.decision === 'APPROVE' ? 'DTR reopening approved' : 'DTR reopening declined', d.note, 'attendance'));
  return commit(user, 'FINAL_DTR_REOPEN_REVIEWED', r.id, tx, d.decision === 'APPROVE' ? 'Attendance reopened. The corrected DTR will require HTE verification again.' : 'Reopening declined. The verified DTR remains unchanged.');
 }
 if (action === 'hteEvaluationPublish' || action === 'hteEvaluationDraft') {
  requireRole(user, 'SUPER_ADMIN'); const d = inputs[action].parse(payload);
  const template = await one("SELECT * FROM hte_evaluation_templates WHERE tenant_id=? AND id=? AND status='DRAFT'", user.tenantId, d.templateId);
  if (!template || num(template, 'version') !== d.version) throw conflict();
  const publish = action === 'hteEvaluationPublish';
  return commit(user, publish ? 'HTE_EVALUATION_PUBLISHED' : 'HTE_EVALUATION_DRAFT_SAVED', template.id, [...(publish ? [statement("UPDATE hte_evaluation_templates SET status='ARCHIVED' WHERE tenant_id=? AND status='PUBLISHED'", user.tenantId)] : []), statement("UPDATE hte_evaluation_templates SET version=CASE WHEN version=? AND status='DRAFT' THEN version+1 ELSE NULL END,title=?,questions_json=?,status=? WHERE tenant_id=? AND id=?", d.version, d.title, JSON.stringify(d.questions), publish ? 'PUBLISHED' : 'DRAFT', user.tenantId, template.id)], publish ? 'School evaluation published for every course and program.' : 'Form setup saved as a draft. It is not visible to HTEs or students yet.');
 }
 if (action === 'hteEvaluationSave') {
  requireRole(user, 'SUPERVISOR'); const d = inputs.hteEvaluationSave.parse(payload), p = await placement(user, d.placementId), f = await finalDtr(user, p.id, d.finalDtrVersion);
  if (p.status !== 'ACTIVE' || f.status !== 'VERIFIED' || num(f, 'attendanceRevision') !== num(p, 'dtrRevision')) throw new DomainError('Verify the current final DTR before completing the evaluation.', 409);
  const existing = await one('SELECT * FROM hte_evaluation_responses WHERE tenant_id=? AND placement_id=?', user.tenantId, p.id);
  if (existing && (existing.evaluatorId !== user.id || !['DRAFT','REVISION_REQUESTED'].includes(str(existing, 'status')))) throw new DomainError('This placement already has an evaluation submitted by its evaluator.', 409);
  if (Number(existing?.version ?? 0) !== d.version || (existing && existing.templateId !== d.templateId)) throw conflict();
  const template = await one(`SELECT * FROM hte_evaluation_templates WHERE tenant_id=? AND id=? ${existing ? "AND status IN ('PUBLISHED','ARCHIVED')" : "AND status='PUBLISHED'"}`, user.tenantId, d.templateId);
  if (!template) throw new DomainError('Waiting for the school evaluation form to be published.', 409);
  const questions = evaluationQuestions.parse(JSON.parse(str(template, 'questionsJson')));
  if (Object.keys(d.answers).some(key => !questions.some(q => q.key === key))) throw new DomainError('Answers include an unknown question.');
  for (const q of questions) {
   const answer = (d.answers[q.key] ?? '').trim();
   if (d.mode === 'SUBMIT' && q.required && !answer) throw new DomainError(`Complete ${q.label}.`);
   if (answer && q.type !== 'text' && !q.options.includes(answer)) throw new DomainError(`Choose a valid answer for ${q.label}.`);
  }
  const id = existing?.id ?? crypto.randomUUID(), status = d.mode === 'SUBMIT' ? 'SUBMITTED' : 'DRAFT';
  const tx = [attendanceGuard(user, p), statement('UPDATE final_dtrs SET attendance_revision=? WHERE tenant_id=? AND id=?', num(p, 'dtrRevision') + 1, user.tenantId, f.id)];
  if (existing) tx.push(archiveEvaluation(user, existing), statement("UPDATE hte_evaluation_responses SET version=CASE WHEN version=? AND status IN ('DRAFT','REVISION_REQUESTED') THEN version+1 ELSE NULL END,answers_json=?,status=?,final_dtr_version=?,note=NULL,reviewed_by=NULL,reviewed_at=NULL,updated_at=? WHERE tenant_id=? AND id=?", d.version, JSON.stringify(d.answers), status, d.finalDtrVersion, now(), user.tenantId, id));
  else tx.push(insert('hte_evaluation_responses', { tenant_id: user.tenantId, placement_id: p.id, evaluator_id: user.id, template_id: template.id, final_dtr_version: d.finalDtrVersion, answers_json: JSON.stringify(d.answers), status, updated_at: now() }, id));
  if(d.mode==='SUBMIT'){
   const assignment=await one('SELECT id FROM assignments WHERE tenant_id=? AND placement_id=? AND supervisor_id=? AND active=1',user.tenantId,p.id,user.id);
   if(!assignment)throw new DomainError('Your supervisor assignment is no longer active.',403);
   tx.push(statement("UPDATE hte_evaluation_responses SET assignment_id=?,entered_by=?,authorship_method='DIRECT',verification_state='VERIFIED',verified_at=? WHERE tenant_id=? AND id=?",assignment.id,user.id,now(),user.tenantId,id));
  }
  const cls = await one('SELECT coordinator_id FROM classes WHERE tenant_id=? AND id=?', user.tenantId, p.classId);
  if (d.mode === 'SUBMIT' && cls) tx.push(notify(user, str(cls, 'coordinatorId'), 'School evaluation awaiting review', `${user.name} submitted an HTE evaluation.`, 'jobs'));
  return commit(user, 'HTE_EVALUATION_SAVED', id, tx, d.mode === 'SUBMIT' ? 'Evaluation submitted for coordinator review.' : 'Evaluation draft saved.');
 }
 if (action === 'hteEvaluationReview') {
  requireRole(user, 'COORDINATOR'); const d = inputs.hteEvaluationReview.parse(payload);
  const e = await one('SELECT * FROM hte_evaluation_responses WHERE tenant_id=? AND id=?', user.tenantId, d.responseId);
  if (!e || e.status !== 'SUBMITTED' || num(e, 'version') !== d.version) throw conflict();
  const p = await placement(user, str(e, 'placementId')), f = await finalDtr(user, p.id, e.finalDtrVersion);
  if (f.status !== 'VERIFIED') throw new DomainError('The current final DTR must be verified.', 409);
  if (d.decision === 'REVISION_REQUESTED' && !d.note) throw new DomainError('Explain what the evaluator needs to revise.');
  return commit(user, 'HTE_EVALUATION_REVIEWED', e.id, [attendanceGuard(user, p), statement('UPDATE final_dtrs SET attendance_revision=? WHERE tenant_id=? AND id=?', num(p, 'dtrRevision') + 1, user.tenantId, f.id), archiveEvaluation(user, e), statement("UPDATE hte_evaluation_responses SET version=CASE WHEN version=? AND status='SUBMITTED' THEN version+1 ELSE NULL END,status=?,note=?,reviewed_by=?,reviewed_at=?,updated_at=? WHERE tenant_id=? AND id=?", d.version, d.decision, d.note, user.id, now(), now(), user.tenantId, e.id), notify(user, str(e, 'evaluatorId'), 'School evaluation reviewed', d.note || 'Evaluation approved.', 'jobs'), notify(user, str(p, 'studentId'), 'School evaluation status updated', d.decision === 'APPROVED' ? 'Your school evaluation has been reviewed and released.' : 'The coordinator requested evaluation follow-up from the HTE.', 'competencies')], d.decision === 'APPROVED' ? 'Evaluation approved and released to the student.' : 'Evaluation returned for revision.');
 }
 if (action === 'hteCredentials') {
  requireRole(user, 'SUPERVISOR'); const d = inputs.hteCredentials.parse(payload);
  if (user.isDemo) throw new DomainError('The fixed demo account cannot change its password.');
  await limit('hte-password:' + user.id, 10);
  const current = await one('SELECT password_hash FROM users WHERE tenant_id=? AND id=?', user.tenantId, user.id);
  if (!await verifyPassword(d.currentPassword, current?.passwordHash as string | null)) throw new DomainError('Current password is incorrect.');
  return commit(user, 'HTE_CREDENTIALS_UPDATED', user.id, [statement('UPDATE users SET name=?,password_hash=?,session_version=session_version+1 WHERE tenant_id=? AND id=?', d.name, await hashPassword(d.newPassword), user.tenantId, user.id)], 'Sign-in details updated. Sign in again with your new password.');
 }
 return null;
}

export async function hteSnapshot(user: Identity): Promise<Pick<Snapshot, 'hteRequests' | 'finalDtrs' | 'finalDtrReopens' | 'hteEvaluationTemplates' | 'hteEvaluationResponses'>> {
 const s = scope(user), sub = `SELECT p.id FROM placements p WHERE ${s.sql}`;
 const [hteRequests, finalDtrs, finalDtrReopens, hteEvaluationTemplates, hteEvaluationResponses] = await Promise.all([
  user.role === 'SUPER_ADMIN' || user.role === 'SUPERVISOR' ? list(`SELECT r.*,u.name AS requester_name,c.name AS company_name FROM hte_requests r JOIN users u ON u.id=r.requester_id AND u.tenant_id=r.tenant_id JOIN companies c ON c.id=r.company_id AND c.tenant_id=r.tenant_id WHERE r.tenant_id=? ${user.role === 'SUPERVISOR' ? 'AND r.requester_id=?' : ''} ORDER BY r.created_at DESC LIMIT 200`, user.tenantId, ...(user.role === 'SUPERVISOR' ? [user.id] : [])) : Promise.resolve([]),
  list(`SELECT * FROM final_dtrs WHERE tenant_id=? AND placement_id IN (${sub}) ORDER BY created_at DESC LIMIT 200`, user.tenantId, ...s.args),
  user.role === 'SUPERVISOR' ? Promise.resolve([]) : list(`SELECT * FROM final_dtr_reopens WHERE tenant_id=? AND placement_id IN (${sub}) ORDER BY created_at DESC LIMIT 200`, user.tenantId, ...s.args),
  list(`SELECT id,tenant_id,created_at,created_by,title,filename,questions_json,status,version FROM hte_evaluation_templates WHERE tenant_id=? ${user.role === 'SUPER_ADMIN' ? '' : "AND status<>'DRAFT'"} ORDER BY created_at DESC LIMIT 100`, user.tenantId),
  list(`SELECT * FROM hte_evaluation_responses WHERE tenant_id=? AND placement_id IN (${sub}) ${user.role === 'STUDENT' ? "AND status='APPROVED'" : user.role === 'SUPERVISOR' ? 'AND evaluator_id=?' : "AND status<>'DRAFT'"} ORDER BY created_at DESC LIMIT 200`, user.tenantId, ...s.args, ...(user.role === 'SUPERVISOR' ? [user.id] : [])),
 ]);
 return { hteRequests, finalDtrs, finalDtrReopens, hteEvaluationTemplates, hteEvaluationResponses };
}

export function applyFinalVerification(entries: Row[], finalDtrs: Row[] = []) {
 return entries.map(entry => {
  const verified = finalDtrs.find(f => f.placementId === entry.placementId && f.status === 'VERIFIED');
  return { ...entry, confirmedVersion: verified ? entry.version : null, confirmedBy: verified?.reviewedBy ?? null };
 });
}

export async function requireFinalCompletion(user: Identity, p: Row) {
 const f = await one("SELECT * FROM final_dtrs WHERE tenant_id=? AND placement_id=? AND status='VERIFIED'", user.tenantId, p.id);
 if (!f || num(f, 'attendanceRevision') !== num(p, 'dtrRevision') || num(f, 'totalMinutes') < num(p, 'requiredMinutes')) throw new DomainError('A verified final DTR meeting the required hours is required before completion.', 409);
 const e = await one("SELECT id FROM hte_evaluation_responses WHERE tenant_id=? AND placement_id=? AND final_dtr_version=? AND status='APPROVED'", user.tenantId, p.id, f.version);
 if (!e) throw new DomainError('The school HTE evaluation must be approved before completion. If the form is unavailable, wait for Super Admin to publish it.', 409);
 return f;
}
