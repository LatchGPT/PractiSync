import { z } from 'zod';
import { auditStatement, database, insert, list, one, statement, type PreparedStatement } from '../db/demo';
import { inputs, type Action, type Identity } from '../validation/contracts';
import { documentFormAnswerSchemas, documentFormCatalog, type DocumentFormAnswer, type DocumentFormType } from '../validation/document-forms';
import { DomainError, requireRole } from './policies';
import { manilaToday } from './assessment-period';

const tenantId = 'fictional-university';
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), (byte) => byte.toString(16).padStart(2, '0')).join('');
const tokenText = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const isDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

async function save(user: Identity, action: string, id: string, statements: PreparedStatement[], message: string, extra: Record<string, string> = {}) {
  await database().batch([...statements, auditStatement(user.id, action.toUpperCase(), id)]);
  return { message, id, ...extra };
}

async function verifiedSupervisorCompanyId(user: Identity) {
  const companyId = user.companyId ?? '';
  const company = await one(`SELECT c.id FROM users u JOIN companies c ON c.tenant_id=u.tenant_id AND c.id=u.company_id
    WHERE u.tenant_id=? AND u.id=? AND u.role='SUPERVISOR' AND u.company_id=? AND u.supervisor_verified=1 AND u.can_post=1 AND c.status='APPROVED' AND c.can_post=1`, user.tenantId, user.id, companyId);
  if (!company) throw new DomainError('A verified company profile and posting permission are required.', 403);
  return String(company.id);
}

/** Handles only workflows with external HTE or completion-form access rules. */
export async function mutateIndustry(user: Identity, action: Action, payload: unknown) {
  const handled = ['companyProfile', 'companyVerification', 'job', 'jobReview', 'applicationStatus', 'selectApplication', 'confirmPlacement', 'activatePlacement', 'industryFinalEvaluation', 'evaluationReview', 'guestEvaluationLink', 'revokeGuestEvaluationLink', 'completionForm', 'completionFormReview', 'documentTemplate', 'customDocumentForm', 'customDocumentReview', 'completionDecision', 'privateHost'];
  if (!handled.includes(action)) return null;
  const d = inputs[action].parse(payload) as Record<string, unknown>;
  const tx: PreparedStatement[] = [];
  let id = crypto.randomUUID();

  if (action === 'documentTemplate') {
    requireRole(user, 'SUPER_ADMIN');
    const fields = d.fields as { key: string; label: string; kind: string; required: boolean; hint?: string; page: number; x: number; y: number; width: number; height: number }[];
    if (new Set(fields.map(field => field.key)).size !== fields.length) throw new DomainError('Each field needs a unique key.');
    const template=await one('SELECT id,pdf_base64,version FROM custom_document_templates WHERE tenant_id=? AND id=?',user.tenantId,String(d.templateId));
    if(!template||!String(template.pdfBase64??''))throw new DomainError('Uploaded PDF template not found.',404);
    id=String(template.id);
    if(await one('SELECT id FROM custom_document_responses WHERE tenant_id=? AND template_id=? LIMIT 1',user.tenantId,id))throw new DomainError('Students already have responses to this template. Upload a new PDF template to change its fields without changing existing records.',409);
    tx.push(statement('UPDATE custom_document_templates SET title=?,instructions=?,category=?,fields_json=?,status=\'PUBLISHED\',version=version+1 WHERE tenant_id=? AND id=? AND version=?',String(d.title),String(d.instructions),String(d.category),JSON.stringify(fields),user.tenantId,id,Number(template.version)));
    return save(user, action, id, tx, 'PDF template published for students.');
  }

  if (action === 'customDocumentForm') {
    requireRole(user, 'STUDENT');
    const placement = await one('SELECT * FROM placements WHERE tenant_id=? AND id=? AND student_id=? AND status IN (\'PLANNED\',\'ACTIVE\')', user.tenantId, String(d.placementId), user.id);
    if (!placement) throw new DomainError('A configured placement is required to fill this form.', 403);
    const template = await one('SELECT * FROM custom_document_templates WHERE tenant_id=? AND id=? AND status=\'PUBLISHED\'', user.tenantId, String(d.templateId));
    if (!template) throw new DomainError('This form is no longer available.', 404);
    if (template.category === 'OJT') {
      const totals = await one('SELECT COALESCE(SUM(i.minutes),0) AS reported_minutes FROM entries e JOIN intervals i ON i.tenant_id=e.tenant_id AND i.entry_id=e.id WHERE e.tenant_id=? AND e.placement_id=?', user.tenantId, placement.id);
      if (!Number(placement.requiredMinutes) || Number(totals?.reportedMinutes ?? 0) < Number(placement.requiredMinutes)) throw new DomainError('End-of-OJT forms open after your reported DTR reaches the placement target.', 403);
    }
    const fields = JSON.parse(String(template.fieldsJson)) as { key: string; label: string; kind: string; required: boolean }[];
    const answers = d.answers as Record<string, unknown>;
    const allowed = new Set(fields.map(field => field.key));
    if (Object.keys(answers).some(key => !allowed.has(key))) throw new DomainError('The answers include fields not in this template.');
    if (d.mode === 'SUBMIT' && fields.some(field => field.required && (answers[field.key] === undefined || answers[field.key] === '' || answers[field.key] === false))) throw new DomainError('Complete every required field before submitting.');
    for (const field of fields) {
      const value = answers[field.key];
      if (value === undefined || value === '') continue;
      if (field.kind === 'checkbox' ? typeof value !== 'boolean' : field.kind === 'number' ? typeof value !== 'number' || !Number.isFinite(value) : typeof value !== 'string') throw new DomainError(`Check the value entered for ${field.label}.`);
      if (field.kind === 'email' && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new DomainError(`Enter a valid email address for ${field.label}.`);
      if (field.kind === 'date' && typeof value === 'string' && !isDate(value)) throw new DomainError(`Enter a valid date for ${field.label}.`);
      if (field.kind === 'tel' && typeof value === 'string' && value.length > 80) throw new DomainError(`Keep ${field.label} under 80 characters.`);
    }
    const existing = await one('SELECT * FROM custom_document_responses WHERE tenant_id=? AND placement_id=? AND template_id=?', user.tenantId, placement.id, template.id);
    const now = new Date().toISOString();
    const mode = String(d.mode);
    if (existing) {
      if (!['DRAFT','REVISION_REQUESTED'].includes(String(existing.status))) throw new DomainError('This form has already been submitted and is awaiting review.',409);
      if (Number(existing.version) !== Number(d.version ?? 0)) throw new DomainError('This form changed in another session. Refresh and try again.',409);
      id = String(existing.id);
      tx.push(statement('UPDATE custom_document_responses SET response_json=?,template_json=?,template_version=?,status=?,updated_at=?,submitted_at=?,review_note=NULL,reviewer_id=NULL,reviewed_at=NULL,version=version+1 WHERE tenant_id=? AND id=? AND version=?', JSON.stringify(answers), JSON.stringify({title:template.title,instructions:template.instructions,category:template.category,fields}), Number(template.version), mode==='SUBMIT'?'SUBMITTED':'DRAFT', now, mode==='SUBMIT'?now:existing.submittedAt??null, user.tenantId, id, Number(existing.version)));
    } else {
      if (Number(d.version ?? 0)!==0) throw new DomainError('This form changed in another session. Refresh and try again.',409);
      tx.push(insert('custom_document_responses',{placement_id:placement.id,template_id:template.id,template_version:Number(template.version),template_json:JSON.stringify({title:template.title,instructions:template.instructions,category:template.category,fields}),response_json:JSON.stringify(answers),submitted_at:mode==='SUBMIT'?now:null,updated_at:now,status:mode==='SUBMIT'?'SUBMITTED':'DRAFT',review_note:null,reviewer_id:null,reviewed_at:null,version:1},id));
    }
    if (mode==='SUBMIT') {
      const cls=await one('SELECT coordinator_id FROM classes WHERE tenant_id=? AND id=?',user.tenantId,placement.classId);
      if(cls)tx.push(insert('notifications',{user_id:String(cls.coordinatorId),title:'Student form submitted',message:`${user.name} submitted ${String(template.title)} for coordinator review.`,type:'DOCUMENT',resource_type:'document_form',resource_id:id,link_page:'documents'}));
    }
    return save(user,mode==='SUBMIT'?'custom_form_submit':'custom_form_draft',id,tx,mode==='SUBMIT'?'Form submitted to your coordinator for review.':'Draft saved. You can return to finish it later.');
  }

  if (action === 'customDocumentReview') {
    requireRole(user,'COORDINATOR');
    const response=await one('SELECT * FROM custom_document_responses WHERE tenant_id=? AND id=? AND status=\'SUBMITTED\'',user.tenantId,String(d.responseId));
    if(!response)throw new DomainError('Submitted form not found or already reviewed.',404);
    const placement=await one('SELECT * FROM placements WHERE tenant_id=? AND id=?',user.tenantId,String(response.placementId));
    const cls=placement?await one('SELECT id FROM classes WHERE tenant_id=? AND id=? AND coordinator_id=?',user.tenantId,String(placement.classId),user.id):null;
    if(!placement||!cls)throw new DomainError('This form is outside your coordinator scope.',403);
    if(d.decision==='REVISION_REQUESTED'&&!String(d.note??'').trim())throw new DomainError('Add a note explaining the requested changes.');
    id=String(response.id);
    const approved=d.decision==='APPROVED';
    tx.push(statement('UPDATE custom_document_responses SET status=?,review_note=?,reviewer_id=?,reviewed_at=?,updated_at=? WHERE tenant_id=? AND id=? AND status=\'SUBMITTED\'',String(d.decision),String(d.note??'').trim()||null,user.id,new Date().toISOString(),new Date().toISOString(),user.tenantId,id));
    tx.push(insert('notifications',{user_id:String(placement.studentId),title:approved?'Form approved':'Form revision requested',message:approved?'Your custom form was approved.':`Please revise your form: ${String(d.note).trim()}`,type:'DOCUMENT',resource_type:'document_form',resource_id:id,link_page:'documents'}));
    return save(user,action,id,tx,approved?'Form approved.':'Revision requested from the student.');
  }

  if (action === 'companyProfile') {
    requireRole(user, 'SUPERVISOR');
    if (user.companyId) {
      const existing = await one('SELECT id,status FROM companies WHERE tenant_id=? AND id=?', user.tenantId, user.companyId);
      if (!existing || existing.status !== 'REJECTED') throw new DomainError('Your account already has a company profile request.', 409);
      id = String(existing.id);
      tx.push(statement('UPDATE companies SET name=?,industry=?,location=?,description=?,status=\'PENDING\',can_post=0 WHERE tenant_id=? AND id=? AND status=\'REJECTED\'', String(d.name), String(d.industry), String(d.location), String(d.description), user.tenantId, id));
    } else {
      tx.push(insert('companies', { name: String(d.name), industry: String(d.industry), location: String(d.location), description: String(d.description), status: 'PENDING', can_post: 0 }, id));
    }
    tx.push(statement('UPDATE users SET company_id=?,supervisor_verified=0,can_post=0 WHERE tenant_id=? AND id=? AND role=\'SUPERVISOR\' AND company_id IS NULL', id, user.tenantId, user.id));
    if (user.companyId) tx.push(statement('UPDATE users SET supervisor_verified=0,can_post=0 WHERE tenant_id=? AND id=? AND role=\'SUPERVISOR\'', user.tenantId, user.id));
    return save(user, action, id, tx, 'Company profile submitted for university verification. Posting and placement data stay locked until approval.');
  }

  if (action === 'companyVerification') {
    requireRole(user, 'SUPER_ADMIN');
    const company = await one('SELECT * FROM companies WHERE tenant_id=? AND id=? AND status=\'PENDING\'', user.tenantId, String(d.companyId));
    if (!company) throw new DomainError('Pending company profile not found.', 404);
    const approve = d.decision === 'APPROVE';
    id = String(company.id);
    tx.push(statement('UPDATE companies SET status=?,can_post=? WHERE tenant_id=? AND id=? AND status=\'PENDING\'', approve ? 'APPROVED' : 'REJECTED', approve ? 1 : 0, user.tenantId, id));
    tx.push(statement('UPDATE users SET supervisor_verified=?,can_post=? WHERE tenant_id=? AND company_id=? AND role=\'SUPERVISOR\'', approve ? 1 : 0, approve ? 1 : 0, user.tenantId, id));
    return save(user, action, id, tx, approve ? 'Company verified. Its HTE account may submit postings for university approval.' : 'Company profile declined. Its account cannot post.');
  }

  if (action === 'job') {
    const companyId = user.role === 'SUPERVISOR' ? await verifiedSupervisorCompanyId(user) : String(d.companyId ?? (await one('SELECT id FROM companies WHERE tenant_id=? AND status=\'APPROVED\' AND can_post=1 ORDER BY name LIMIT 1', user.tenantId))?.id ?? '');
    if (user.role !== 'SUPERVISOR') requireRole(user, 'COORDINATOR', 'SUPER_ADMIN');
    const company = await one('SELECT id FROM companies WHERE tenant_id=? AND id=? AND status=\'APPROVED\' AND can_post=1', user.tenantId, companyId);
    if (!company) throw new DomainError('A university-verified company with posting access is required.', 403);
    if (!await one('SELECT id FROM courses WHERE tenant_id=? AND id=?', user.tenantId, String(d.courseId))) throw new DomainError('Choose a valid target course.');
    if (user.role === 'COORDINATOR' && !await one('SELECT id FROM classes WHERE tenant_id=? AND coordinator_id=? AND course_id=? LIMIT 1', user.tenantId, user.id, String(d.courseId))) throw new DomainError('You may post only for a course assigned to one of your classes.', 403);
    tx.push(insert('jobs', { company_id: companyId, author_id: user.id, title: String(d.title), description: String(d.description), location: String(d.location), course_id: String(d.courseId), skills: String(d.skills), openings: Number(d.openings), status: 'DRAFT' }, id));
    return save(user, action, id, tx, 'Internship post submitted for university approval. Students will see it after approval.');
  }

  if (action === 'jobReview') {
    requireRole(user, 'COORDINATOR', 'SUPER_ADMIN');
    const job = await one('SELECT j.*,c.status AS company_status,c.can_post FROM jobs j JOIN companies c ON c.id=j.company_id AND c.tenant_id=j.tenant_id WHERE j.tenant_id=? AND j.id=? AND j.status=\'DRAFT\'', user.tenantId, String(d.jobId));
    if (!job) throw new DomainError('Post awaiting review not found.', 404);
    if (job.companyStatus !== 'APPROVED' || Number(job.canPost) !== 1) throw new DomainError('Verify the company profile and posting permission before reviewing its post.', 409);
    if (user.role === 'COORDINATOR' && !await one('SELECT id FROM classes WHERE tenant_id=? AND coordinator_id=? AND course_id=? LIMIT 1', user.tenantId, user.id, job.courseId)) throw new DomainError('This post is outside your assigned course scope.', 403);
    const approve = d.decision === 'APPROVE';
    id = String(job.id);
    tx.push(statement('UPDATE jobs SET status=? WHERE tenant_id=? AND id=? AND status=\'DRAFT\'', approve ? 'PUBLISHED' : 'ARCHIVED', user.tenantId, id));
    if (job.authorId) tx.push(statement('INSERT INTO notifications (id,tenant_id,created_at,user_id,title,message,type,resource_type,resource_id,link_page) VALUES (?,?,?,?,?,?,?,?,?,?)', crypto.randomUUID(), user.tenantId, new Date().toISOString(), job.authorId, approve ? 'Internship post approved' : 'Internship post declined', approve ? 'Your internship post is now visible to eligible students.' : (String(d.note ?? '').trim() || 'The university declined this internship post.'), 'JOB', 'job', id, 'jobs'));
    return save(user, action, id, tx, approve ? 'Internship post approved and published.' : 'Internship post declined and hidden from students.');
  }

  if (action === 'selectApplication') {
    requireRole(user, 'SUPERVISOR');
    const companyId = await verifiedSupervisorCompanyId(user);
    const app = await one('SELECT a.*,j.company_id,j.title,j.course_id FROM applications a JOIN jobs j ON j.id=a.job_id AND j.tenant_id=a.tenant_id WHERE a.tenant_id=? AND a.id=? AND j.company_id=? AND j.status=\'PUBLISHED\'', user.tenantId, String(d.applicationId), companyId);
    if (!app || app.status !== 'SUBMITTED') throw new DomainError('This application is not available for your verified company.', 403);
    id = String(app.id);
    const decision = String(d.decision);
    tx.push(statement('UPDATE applications SET status=? WHERE tenant_id=? AND id=? AND status=\'SUBMITTED\'', decision, user.tenantId, id));
    tx.push(statement('INSERT INTO notifications (id,tenant_id,created_at,user_id,title,message,type,resource_type,resource_id,link_page) VALUES (?,?,?,?,?,?,?,?,?,?)', crypto.randomUUID(), user.tenantId, new Date().toISOString(), app.studentId, decision === 'SHORTLISTED' ? 'Selected for placement review' : 'Application update', decision === 'SHORTLISTED' ? `The HTE selected your application for ${app.title}. The university must confirm the placement.` : `The HTE will not proceed with your application for ${app.title}.`, 'JOB', 'application', id, 'jobs'));
    return save(user, action, id, tx, decision === 'SHORTLISTED' ? 'Applicant selected. A university coordinator must confirm the placement.' : 'Application declined.');
  }

  if (action === 'applicationStatus') {
    requireRole(user, 'COORDINATOR', 'SUPER_ADMIN');
    if (d.status === 'ACCEPTED') throw new DomainError('Use placement confirmation to approve an HTE-selected applicant and create the placement record.');
    throw new DomainError('Only the HTE can shortlist or decline applicants to its own post.');
  }

  if (action === 'confirmPlacement') {
    requireRole(user, 'COORDINATOR', 'SUPER_ADMIN');
    if (!isDate(String(d.startsAt)) || !isDate(String(d.endsAt)) || String(d.endsAt) < String(d.startsAt)) throw new DomainError('Enter valid placement dates, with the end date on or after the start date.');
    const app = await one('SELECT a.*,j.company_id,j.course_id,j.title,j.status AS job_status,c.status AS company_status,c.can_post FROM applications a JOIN jobs j ON j.id=a.job_id AND j.tenant_id=a.tenant_id JOIN companies c ON c.id=j.company_id AND c.tenant_id=j.tenant_id WHERE a.tenant_id=? AND a.id=?', user.tenantId, String(d.applicationId));
    if (!app || app.status !== 'SHORTLISTED') throw new DomainError('Only an HTE-selected applicant can be confirmed.', 409);
    if (app.jobStatus !== 'PUBLISHED' || app.companyStatus !== 'APPROVED' || app.canPost !== 1) throw new DomainError('The internship post and company must still be approved before confirming a placement.', 409);
    const cls = await one('SELECT * FROM classes WHERE tenant_id=? AND id=? AND course_id=?', user.tenantId, String(d.classId), app.courseId);
    if (!cls || (user.role === 'COORDINATOR' && cls.coordinatorId !== user.id)) throw new DomainError('Choose a class in your coordinator scope for this course.', 403);
    const student = await one('SELECT id,course_id FROM users WHERE tenant_id=? AND id=? AND role=\'STUDENT\' AND status=\'ACTIVE\'', user.tenantId, app.studentId);
    if (!student || student.courseId !== app.courseId) throw new DomainError('The selected applicant is not eligible for this course.', 403);
    if (await one('SELECT id FROM placements WHERE tenant_id=? AND student_id=? AND status IN (\'PLANNED\',\'ACTIVE\')', user.tenantId, app.studentId)) throw new DomainError('The student already has an active or planned placement.', 409);
    const policy = await one('SELECT required_minutes,version,period FROM policies WHERE tenant_id=? AND course_id=? ORDER BY version DESC LIMIT 1', user.tenantId, app.courseId);
    if (!policy) throw new DomainError('Set the course hour policy before confirming this placement.', 409);
    const placementId = crypto.randomUUID();
    tx.push(insert('placements', { student_id: app.studentId, company_id: app.companyId, class_id: cls.id, course_id: app.courseId, period: policy.period, starts_at: String(d.startsAt), ends_at: String(d.endsAt), required_minutes: Number(policy.requiredMinutes), policy_version: Number(policy.version), status: 'PLANNED' }, placementId));
    tx.push(statement('INSERT INTO enrollments (id,tenant_id,created_at,class_id,student_id,active) VALUES (?,?,?,?,?,1) ON CONFLICT(tenant_id,class_id,student_id) DO UPDATE SET active=1', crypto.randomUUID(), user.tenantId, new Date().toISOString(), cls.id, app.studentId));
    tx.push(statement('UPDATE applications SET status=\'ACCEPTED\',placement_id=? WHERE tenant_id=? AND id=? AND status=\'SHORTLISTED\'', placementId, user.tenantId, app.id));
    tx.push(insert('completion', { placement_id: placementId, status: 'PENDING', reason: 'Awaiting the student forms and university review.' }));
    tx.push(statement('INSERT INTO assignments (id,tenant_id,created_at,placement_id,supervisor_id,active) SELECT ?,tenant_id,?, ?,id,1 FROM users WHERE tenant_id=? AND company_id=? AND role=\'SUPERVISOR\' AND supervisor_verified=1 AND can_post=1', crypto.randomUUID(), new Date().toISOString(), placementId, user.tenantId, app.companyId));
    tx.push(statement('INSERT INTO notifications (id,tenant_id,created_at,user_id,title,message,type,resource_type,resource_id,link_page) VALUES (?,?,?,?,?,?,?,?,?,?)', crypto.randomUUID(), user.tenantId, new Date().toISOString(), app.studentId, 'Placement confirmed', 'Your university coordinator confirmed your HTE placement.', 'JOB', 'placement', placementId, 'overview'));
    return save(user, action, placementId, tx, 'Placement confirmed. Its record and verified company-supervisor assignments are ready.');
  }

  if (action === 'activatePlacement') {
    requireRole(user, 'COORDINATOR');
    const placement = await one('SELECT p.* FROM placements p WHERE p.tenant_id=? AND p.id=? AND p.class_id IN (SELECT id FROM classes WHERE tenant_id=? AND coordinator_id=?)', user.tenantId, String(d.placementId), user.tenantId, user.id);
    if (!placement) throw new DomainError('Placement is outside your coordinator scope.', 403);
    if (placement.status !== 'PLANNED') throw new DomainError('Only a planned placement can be activated.', 409);
    if (!isDate(String(placement.startsAt)) || String(placement.startsAt) > manilaToday()) throw new DomainError('A placement can be activated on or after its start date.', 409);
    if (String(placement.endsAt) < manilaToday()) throw new DomainError('This placement has already passed its end date and cannot be activated.', 409);
    id = String(placement.id);
    tx.push(statement("UPDATE placements SET status='ACTIVE' WHERE tenant_id=? AND id=? AND status='PLANNED'", user.tenantId, id));
    tx.push(statement('INSERT INTO notifications (id,tenant_id,created_at,user_id,title,message,type,resource_type,resource_id,link_page) VALUES (?,?,?,?,?,?,?,?,?,?)', crypto.randomUUID(), user.tenantId, new Date().toISOString(), placement.studentId, 'OJT placement activated', 'Your university coordinator activated your placement. You can now submit DTR entries.', 'JOB', 'placement', id, 'attendance'));
    return save(user, action, id, tx, 'Placement activated. The student can now submit DTR entries.');
  }

  if (action === 'industryFinalEvaluation') {
    requireRole(user, 'SUPERVISOR');
    const companyId = await verifiedSupervisorCompanyId(user);
    const placement = await one('SELECT * FROM placements WHERE tenant_id=? AND id=? AND company_id=? AND id IN (SELECT placement_id FROM assignments WHERE tenant_id=? AND supervisor_id=? AND active=1) AND status=\'ACTIVE\'', user.tenantId, String(d.placementId), companyId, user.tenantId, user.id);
    if (!placement) throw new DomainError('This placement is not assigned to your verified company account.', 403);
    const scores = d.scores as Record<string, { score: number; evidence: string }>;
    const dimensions = [['Technical skills', scores.technicalSkills], ['Communication', scores.communication], ['Professionalism', scores.professionalism], ['Problem solving', scores.problemSolving]] as const;
    const current = await one('SELECT * FROM evaluations WHERE tenant_id=? AND placement_id=? AND evaluator_id=? AND kind=\'FINAL\' ORDER BY created_at DESC LIMIT 1', user.tenantId, placement.id, user.id);
    if (current && current.status !== 'REVISION_REQUESTED') throw new DomainError('Your final evaluation has already been submitted.', 409);
    const evaluationId = String(current?.id ?? crypto.randomUUID());
    if (current) {
      const previous = await list('SELECT dimension,score,evidence_note FROM scores WHERE tenant_id=? AND evaluation_id=?', user.tenantId, evaluationId);
      tx.push(insert('evaluation_revisions', { evaluation_id: evaluationId, actor_id: user.id, previous_version: Number(current.version), scores_json: JSON.stringify(previous), review_note: current.reviewNote ? String(current.reviewNote) : null }));
      tx.push(statement("UPDATE evaluations SET status='SUBMITTED',version=version+1,review_note=NULL,reviewed_by=NULL,reviewed_at=NULL,evidence_json=? WHERE tenant_id=? AND id=? AND status='REVISION_REQUESTED'", JSON.stringify(Object.fromEntries(dimensions.map(([name, value]) => [name, value.evidence]))), user.tenantId, evaluationId));
      for (const [dimension, value] of dimensions) tx.push(statement('UPDATE scores SET score=?,evidence_note=? WHERE tenant_id=? AND evaluation_id=? AND dimension=?', value.score, value.evidence, user.tenantId, evaluationId, dimension));
    } else {
      tx.push(insert('evaluations', { placement_id: placement.id, evaluator_id: user.id, kind: 'FINAL', framework_version: 1, status: 'SUBMITTED', evidence_json: JSON.stringify(Object.fromEntries(dimensions.map(([name, value]) => [name, value.evidence]))) }, evaluationId));
      for (const [dimension, value] of dimensions) tx.push(insert('scores', { evaluation_id: evaluationId, dimension, score: value.score, evidence_note: value.evidence }));
    }
    const cls = await one('SELECT coordinator_id FROM classes WHERE tenant_id=? AND id=?', user.tenantId, placement.classId);
    if (cls) tx.push(statement('INSERT INTO notifications (id,tenant_id,created_at,user_id,title,message,type,resource_type,resource_id,link_page) VALUES (?,?,?,?,?,?,?,?,?,?)', crypto.randomUUID(), user.tenantId, new Date().toISOString(), cls.coordinatorId, 'HTE evaluation awaiting review', 'An assigned HTE supervisor submitted a final competency rubric.', 'ASSESSMENT', 'evaluation', evaluationId, 'competencies'));
    return save(user, action, evaluationId, tx, current ? 'Revised HTE evaluation submitted for coordinator review.' : 'Final HTE evaluation submitted for coordinator review.');
  }

  if (action === 'evaluationReview') {
    const evaluation = await one('SELECT e.*,u.role AS evaluator_role,u.name AS evaluator_name FROM evaluations e LEFT JOIN users u ON u.id=e.evaluator_id AND u.tenant_id=e.tenant_id WHERE e.tenant_id=? AND e.id=? AND e.kind=\'FINAL\'', user.tenantId, String(d.evaluationId));
    if (!evaluation) return null;
    requireRole(user, 'COORDINATOR');
    if (evaluation.evaluatorRole !== 'SUPERVISOR' && !String(evaluation.evaluatorId).startsWith('guest:')) throw new DomainError('Only an HTE final evaluation can be reviewed through this workflow.', 403);
    if (d.decision === 'REVISION_REQUESTED' && !String(d.note ?? '').trim()) throw new DomainError('Explain what the HTE evaluator should revise.');
    const placement = await one('SELECT p.* FROM placements p WHERE p.tenant_id=? AND p.id=? AND p.class_id IN (SELECT id FROM classes WHERE tenant_id=? AND coordinator_id=?)', user.tenantId, evaluation.placementId, user.tenantId, user.id);
    if (!placement) throw new DomainError('Evaluation is outside your coordinator scope.', 403);
    if (evaluation.status !== 'SUBMITTED') throw new DomainError('This final evaluation is no longer awaiting review.', 409);
    id = String(evaluation.id);
    tx.push(statement('UPDATE evaluations SET status=?,review_note=?,reviewed_by=?,reviewed_at=? WHERE tenant_id=? AND id=? AND status=\'SUBMITTED\'', String(d.decision), String(d.note ?? '').trim() || null, user.id, new Date().toISOString(), user.tenantId, id));
    const student = await one('SELECT student_id FROM placements WHERE tenant_id=? AND id=?', user.tenantId, placement.id);
    if (student) tx.push(statement('INSERT INTO notifications (id,tenant_id,created_at,user_id,title,message,type,resource_type,resource_id,link_page) VALUES (?,?,?,?,?,?,?,?,?,?)', crypto.randomUUID(), user.tenantId, new Date().toISOString(), student.studentId, d.decision === 'APPROVED' ? 'HTE competency evaluation released' : 'HTE evaluation needs follow-up', d.decision === 'APPROVED' ? 'The coordinator reviewed the HTE final evaluation. It is now available in your competency records.' : String(d.note), 'ASSESSMENT', 'evaluation', id, 'competencies'));
    return save(user, action, id, tx, d.decision === 'APPROVED' ? 'Final HTE evaluation approved and released to the student.' : 'Revision requested from the HTE evaluator.');
  }

  if (action === 'guestEvaluationLink') {
    requireRole(user, 'COORDINATOR');
    const placement = await one('SELECT p.* FROM placements p WHERE p.tenant_id=? AND p.id=? AND p.class_id IN (SELECT id FROM classes WHERE tenant_id=? AND coordinator_id=?)', user.tenantId, String(d.placementId), user.tenantId, user.id);
    if (!placement || !['ACTIVE', 'COMPLETED'].includes(String(placement.status))) throw new DomainError('Choose an assigned placement before creating an evaluation link.', 403);
    const token = tokenText(crypto.getRandomValues(new Uint8Array(32)));
    const accessCode = Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => String(byte % 10)).join('');
    const tokenHash = await hash(token);
    const accessCodeHash = await hash(`${id}:${accessCode}`);
    const expiresAt = new Date(Date.now() + Number(d.expiresInDays) * 86400000).toISOString();
    tx.push(insert('guest_evaluation_links', { placement_id: placement.id, token_hash: tokenHash, access_code_hash: accessCodeHash, expires_at: expiresAt, issued_by: user.id, revoked_at: null, used_at: null, submission_id: null }, id));
    return save(user, action, id, tx, 'Single-use evaluation link created. Send the access code separately from the link.', { url: `/evaluate/${token}`, accessCode, expiresAt });
  }

  if (action === 'revokeGuestEvaluationLink') {
    requireRole(user, 'COORDINATOR');
    const link = await one('SELECT l.* FROM guest_evaluation_links l JOIN placements p ON p.id=l.placement_id AND p.tenant_id=l.tenant_id JOIN classes c ON c.id=p.class_id AND c.tenant_id=p.tenant_id WHERE l.tenant_id=? AND l.id=? AND c.coordinator_id=? AND l.used_at IS NULL AND l.revoked_at IS NULL', user.tenantId, String(d.linkId), user.id);
    if (!link) throw new DomainError('Active unused evaluation link not found in your scope.', 404);
    id = String(link.id);
    tx.push(statement('UPDATE guest_evaluation_links SET revoked_at=? WHERE tenant_id=? AND id=? AND used_at IS NULL AND revoked_at IS NULL', new Date().toISOString(), user.tenantId, id));
    return save(user, action, id, tx, 'Evaluation link revoked.');
  }

  if (action === 'completionForm') {
    requireRole(user, 'STUDENT');
    const placement = await one('SELECT * FROM placements WHERE tenant_id=? AND id=? AND student_id=?', user.tenantId, String(d.placementId), user.id);
    if (!placement || !['PLANNED', 'ACTIVE'].includes(String(placement.status))) throw new DomainError('A configured placement in planned or active status is required to fill these forms.', 403);
    const formType = String(d.formType) as DocumentFormType;
    const mode = String(d.mode ?? 'SUBMIT') as 'SAVE_DRAFT' | 'SUBMIT';
    const answers = d.answers as Record<string, DocumentFormAnswer>;
    const definition = documentFormCatalog[formType];
    const answerSchema = documentFormAnswerSchemas[formType];
    if (!definition || !answerSchema) throw new DomainError('Choose a supported form.');

    if (definition.group === 'OJT') {
      if (!Number(placement.requiredMinutes)) throw new DomainError('A configured placement hour target is required before end-of-OJT forms open.', 403);
      const totals = await one('SELECT COALESCE(SUM(i.minutes),0) AS reported_minutes FROM entries e JOIN intervals i ON i.tenant_id=e.tenant_id AND i.entry_id=e.id WHERE e.tenant_id=? AND e.placement_id=?', user.tenantId, placement.id);
      if (Number(totals?.reportedMinutes ?? 0) < Number(placement.requiredMinutes)) throw new DomainError('End-of-OJT forms open after your reported DTR reaches the placement target.', 403);
    }

    const parsed = mode === 'SUBMIT' ? answerSchema.safeParse(answers) : answerSchema.partial().safeParse(answers);
    if (!parsed.success) throw new DomainError(mode === 'SUBMIT' ? 'Complete every required question and field before submitting this form.' : 'One or more form fields are invalid.');
    if (mode === 'SUBMIT' && formType === 'TRAINING_AGREEMENT' && answers.studentAcknowledgement !== true) throw new DomainError('Confirm that you reviewed the sample placement details before submitting.');
    if (mode === 'SUBMIT' && formType === 'PARENT_GUARDIAN_CONSENT' && answers.guardianAcknowledgement !== true) throw new DomainError('Confirm that the fictional OJT information was reviewed before submitting.');
    const existing = await one('SELECT * FROM completion_responses WHERE tenant_id=? AND placement_id=? AND form_type=?', user.tenantId, placement.id, formType);
    if (existing) {
      if (!['DRAFT', 'REVISION_REQUESTED'].includes(String(existing.status ?? 'SUBMITTED'))) throw new DomainError('This form has already been submitted and is awaiting review.', 409);
      if (Number(existing.version) !== Number(d.version ?? 0)) throw new DomainError('This form changed in another session. Refresh and try again.', 409);
      id = String(existing.id);
      tx.push(statement('UPDATE completion_responses SET response_json=?,status=?,updated_at=?,submitted_at=?,review_note=NULL,reviewer_id=NULL,reviewed_at=NULL,version=version+1 WHERE tenant_id=? AND id=? AND version=?', JSON.stringify(parsed.data), mode === 'SUBMIT' ? 'SUBMITTED' : 'DRAFT', new Date().toISOString(), mode === 'SUBMIT' ? new Date().toISOString() : existing.submittedAt ?? null, user.tenantId, existing.id, Number(existing.version)));
    } else {
      if (Number(d.version ?? 0) !== 0) throw new DomainError('This form changed in another session. Refresh and try again.', 409);
      id = crypto.randomUUID();
      const now = new Date().toISOString();
      tx.push(insert('completion_responses', { placement_id: placement.id, form_type: formType, form_version: 1, response_json: JSON.stringify(parsed.data), status: mode === 'SUBMIT' ? 'SUBMITTED' : 'DRAFT', updated_at: now, submitted_at: mode === 'SUBMIT' ? now : null, version: 1, review_note: null, reviewer_id: null, reviewed_at: null }, id));
    }
    if (mode === 'SUBMIT') {
      const cls = await one('SELECT coordinator_id FROM classes WHERE tenant_id=? AND id=?', user.tenantId, placement.classId);
      if (cls) tx.push(insert('notifications', { user_id: String(cls.coordinatorId), title: 'Student form submitted', message: `${user.name} submitted the ${definition.title.toLowerCase()} for coordinator review.`, type: 'DOCUMENT', resource_type: 'document_form', resource_id: id, link_page: 'documents' }));
    }
    return save(user, mode === 'SUBMIT' ? 'form_submit' : 'form_draft', id, tx, mode === 'SUBMIT' ? 'Form submitted to your coordinator for review.' : 'Draft saved. You can return to finish it later.');
  }

  if (action === 'completionFormReview') {
    requireRole(user, 'COORDINATOR');
    const response = await one('SELECT * FROM completion_responses WHERE tenant_id=? AND id=?', user.tenantId, String(d.responseId));
    if (!response || String(response.status) !== 'SUBMITTED') throw new DomainError('Submitted form not found or already reviewed.', 404);
    const placement = await one('SELECT * FROM placements WHERE tenant_id=? AND id=?', user.tenantId, String(response.placementId));
    if (!placement) throw new DomainError('Form placement not found.', 404);
    const formClass = await one('SELECT id FROM classes WHERE tenant_id=? AND id=? AND coordinator_id=?', user.tenantId, placement.classId, user.id);
    if (!formClass) throw new DomainError('This form is outside your coordinator scope.', 403);
    if (d.decision === 'REVISION_REQUESTED' && !String(d.note ?? '').trim()) throw new DomainError('Add a note explaining the requested changes.');
    id = String(response.id);
    tx.push(statement('UPDATE completion_responses SET status=?,review_note=?,reviewer_id=?,reviewed_at=?,updated_at=? WHERE tenant_id=? AND id=? AND status=\'SUBMITTED\'', String(d.decision), String(d.note ?? '').trim() || null, user.id, new Date().toISOString(), new Date().toISOString(), user.tenantId, id));
    const approved = d.decision === 'APPROVED';
    tx.push(insert('notifications', { user_id: String(placement.studentId), title: approved ? 'Form approved' : 'Form revision requested', message: approved ? `Your ${String(response.formType).toLowerCase().replaceAll('_', ' ')} was approved.` : `Please revise your ${String(response.formType).toLowerCase().replaceAll('_', ' ')}: ${String(d.note).trim()}`, type: 'DOCUMENT', resource_type: 'document_form', resource_id: id, link_page: 'documents' }));
    return save(user, action, id, tx, approved ? 'Form approved.' : 'Revision requested from the student.');
  }

  if (action === 'completionDecision') {
    requireRole(user, 'COORDINATOR', 'SUPER_ADMIN');
    const placement = await one(`SELECT p.* FROM placements p WHERE p.tenant_id=? AND p.id=? ${user.role === 'COORDINATOR' ? 'AND p.class_id IN (SELECT id FROM classes WHERE tenant_id=? AND coordinator_id=?)' : ''}`, user.tenantId, String(d.placementId), ...(user.role === 'COORDINATOR' ? [user.tenantId, user.id] : []));
    if (!placement) throw new DomainError('Placement is outside your university scope.', 403);
    const forms = await one('SELECT COUNT(*) AS count FROM completion_responses WHERE tenant_id=? AND placement_id=? AND form_type IN (\'FINAL_SELF_ASSESSMENT\',\'OJT_EXIT_SURVEY\') AND status IN (\'SUBMITTED\',\'APPROVED\')', user.tenantId, placement.id);
    if (d.decision === 'APPROVE' && Number(forms?.count ?? 0) !== 2) throw new DomainError('Both the final competency self-assessment and OJT exit survey are required before approval.', 409);
    id = String(placement.id);
    if (d.decision === 'APPROVE') {
      tx.push(statement('UPDATE completion SET status=\'APPROVED\',reason=?,decided_at=?,decided_by=? WHERE tenant_id=? AND placement_id=?', String(d.note ?? '').trim() || 'Both required forms received and reviewed.', new Date().toISOString(), user.id, user.tenantId, placement.id));
      tx.push(statement('UPDATE placements SET status=\'COMPLETED\' WHERE tenant_id=? AND id=?', user.tenantId, placement.id));
    } else {
      tx.push(statement('UPDATE completion SET status=\'REJECTED\',reason=?,decided_at=?,decided_by=? WHERE tenant_id=? AND placement_id=?', String(d.note ?? '').trim() || 'Coordinator requested follow-up.', new Date().toISOString(), user.id, user.tenantId, placement.id));
    }
    return save(user, action, id, tx, d.decision === 'APPROVE' ? 'Formal completion approved after both required forms were received.' : 'Completion review returned for follow-up.');
  }

  if (action === 'privateHost') {
    requireRole(user, 'COORDINATOR');
    if (!isDate(String(d.startsAt)) || !isDate(String(d.endsAt)) || String(d.endsAt) < String(d.startsAt)) throw new DomainError('Enter valid placement dates, with the end date on or after the start date.');
    const cls = await one('SELECT * FROM classes WHERE tenant_id=? AND id=? AND coordinator_id=?', user.tenantId, String(d.classId), user.id);
    const student = await one('SELECT * FROM users WHERE tenant_id=? AND id=? AND role=\'STUDENT\' AND status=\'ACTIVE\'', user.tenantId, String(d.studentId));
    if (!cls || !student || student.courseId !== cls.courseId) throw new DomainError('Choose a student and class from your coordinator scope.', 403);
    if (await one('SELECT id FROM placements WHERE tenant_id=? AND student_id=? AND status IN (\'PLANNED\',\'ACTIVE\')', user.tenantId, String(d.studentId))) throw new DomainError('The student already has an active or planned placement.', 409);
    const policy = await one('SELECT required_minutes,version,period FROM policies WHERE tenant_id=? AND course_id=? ORDER BY version DESC LIMIT 1', user.tenantId, cls.courseId);
    if (!policy) throw new DomainError('Set the course hour policy before creating a placement.', 409);
    const companyId = crypto.randomUUID();
    const placementId = crypto.randomUUID();
    tx.push(insert('companies', { name: String(d.companyName), industry: String(d.industry), location: String(d.location), description: String(d.description), status: 'PRIVATE', can_post: 0 }, companyId));
    tx.push(insert('placements', { student_id: String(d.studentId), company_id: companyId, class_id: cls.id, course_id: cls.courseId, period: policy.period, starts_at: String(d.startsAt), ends_at: String(d.endsAt), required_minutes: Number(policy.requiredMinutes), policy_version: Number(policy.version), status: 'PLANNED' }, placementId));
    tx.push(insert('completion', { placement_id: placementId, status: 'PENDING', reason: 'Awaiting student forms and coordinator review.' }));
    tx.push(statement('INSERT INTO private_hosts (id,tenant_id,created_at,placement_id,supervisor_name,supervisor_email) VALUES (?,?,?,?,?,?)', crypto.randomUUID(), user.tenantId, new Date().toISOString(), placementId, String(d.supervisorName), String(d.supervisorEmail)));
    return save(user, action, placementId, tx, 'Private host record created for this placement. It is hidden from the company directory; issue a guest evaluation link next.', { companyId });
  }

  return null;
}

export async function guestEvaluationContext(token: string, accessCode: string) {
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) throw new DomainError('This evaluation link is invalid or unavailable.', 404);
  const row = await one(`SELECT l.id,l.access_code_hash,p.id AS placement_id,p.period,p.status,l.expires_at,u.name AS student_name,c.name AS company_name,co.code AS course_code
    FROM guest_evaluation_links l
    JOIN placements p ON p.id=l.placement_id AND p.tenant_id=l.tenant_id
    JOIN classes cl ON cl.id=p.class_id AND cl.tenant_id=p.tenant_id AND cl.coordinator_id=l.issued_by
    JOIN users u ON u.id=p.student_id AND u.tenant_id=p.tenant_id
    JOIN companies c ON c.id=p.company_id AND c.tenant_id=p.tenant_id
    JOIN courses co ON co.id=p.course_id AND co.tenant_id=p.tenant_id
    WHERE l.tenant_id=? AND l.token_hash=? AND l.revoked_at IS NULL AND l.used_at IS NULL AND l.expires_at>? AND p.status IN ('ACTIVE','COMPLETED')`, tenantId, await hash(token), new Date().toISOString());
  if (!row || !/^\d{8}$/.test(accessCode) || await hash(`${row.id}:${accessCode}`) !== row.accessCodeHash) throw new DomainError('The access code is invalid or this link is unavailable.', 403);
  return { studentName: row.studentName, companyName: row.companyName, courseCode: row.courseCode, period: row.period, expiresAt: row.expiresAt, rubric: ['Technical skills', 'Communication', 'Professionalism', 'Problem solving'] };
}

export async function submitGuestEvaluation(token: string, payload: unknown) {
  const body = z.object({ accessCode: z.string().trim().regex(/^\d{8}$/), scores: z.object({
    'Technical skills': z.object({ score: z.number().int().min(1).max(5), evidence: z.string().trim().min(1).max(1000) }),
    Communication: z.object({ score: z.number().int().min(1).max(5), evidence: z.string().trim().min(1).max(1000) }),
    Professionalism: z.object({ score: z.number().int().min(1).max(5), evidence: z.string().trim().min(1).max(1000) }),
    'Problem solving': z.object({ score: z.number().int().min(1).max(5), evidence: z.string().trim().min(1).max(1000) }),
  }).strict() }).strict().parse(payload);
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) throw new DomainError('This evaluation link is invalid or unavailable.', 404);
  const link = await one(`SELECT l.* FROM guest_evaluation_links l JOIN placements p ON p.id=l.placement_id AND p.tenant_id=l.tenant_id
    JOIN classes cl ON cl.id=p.class_id AND cl.tenant_id=p.tenant_id AND cl.coordinator_id=l.issued_by
    WHERE l.tenant_id=? AND l.token_hash=? AND l.revoked_at IS NULL AND l.used_at IS NULL AND l.expires_at>? AND p.status IN ('ACTIVE','COMPLETED')`, tenantId, await hash(token), new Date().toISOString());
  if (!link || await hash(`${link.id}:${body.accessCode}`) !== link.accessCodeHash) throw new DomainError('The access code is invalid or this link is unavailable.', 403);
  const evaluationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const scores = Object.entries(body.scores) as [string, { score: number; evidence: string }][];
  const tx: PreparedStatement[] = [
    statement('UPDATE guest_evaluation_links SET used_at=?,submission_id=? WHERE tenant_id=? AND id=? AND used_at IS NULL AND revoked_at IS NULL AND expires_at>?', now, evaluationId, tenantId, link.id, now),
    statement(`INSERT INTO evaluations (id,tenant_id,created_at,placement_id,evaluator_id,kind,framework_version,status,version,evidence_json)
      SELECT ?,tenant_id,?,placement_id,?, 'FINAL',1,'SUBMITTED',1,? FROM guest_evaluation_links WHERE tenant_id=? AND id=? AND submission_id=?`, evaluationId, now, `guest:${link.id}`, JSON.stringify(Object.fromEntries(scores.map(([dimension, value]) => [dimension, value.evidence]))), tenantId, link.id, evaluationId),
    ...scores.map(([dimension, value]) => statement(`INSERT INTO scores (id,tenant_id,created_at,evaluation_id,dimension,score,evidence_note)
      SELECT ?,tenant_id,?, ?, ?, ?, ? FROM guest_evaluation_links WHERE tenant_id=? AND id=? AND submission_id=?`, crypto.randomUUID(), now, evaluationId, dimension, value.score, value.evidence, tenantId, link.id, evaluationId)),
  ];
  tx.push(auditStatement(String(link.issuedBy), 'GUEST_EVALUATION_SUBMIT', evaluationId));
  await database().batch(tx);
  return { message: 'Evaluation submitted for coordinator review.' };
}
