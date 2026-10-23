import { database, insert, list, one, statement, auditStatement } from '../db/demo';
import type { Identity, Row } from '../validation/contracts';
import { DomainError, requireRole, scope } from './policies';
import { assessmentPeriod, manilaToday } from './assessment-period';
import { weeklyActionSchema, weeklyPrompts, type WeeklyQuestion, type WeeklyReport, type WeeklyView, type WeeklyAggregate } from './weekly-report-contract';

export function weeklyPeriod(date: string) {
  try { return assessmentPeriod('WEEKLY', date); } catch { throw new DomainError('Choose a valid reporting week.'); }
}
function json<T>(value: unknown): T { return JSON.parse(String(value)); }
const str = (row: Row, key: string) => String(row[key] ?? '');
export async function weeklyPlacement(user: Identity, id: string, write = false) {
  requireRole(user, 'STUDENT', 'COORDINATOR');
  if (write) requireRole(user, 'STUDENT');
  const s = scope(user);
  const p = await one(`SELECT p.*,u.name AS student_name,c.name AS course_name FROM placements p JOIN users u ON u.id=p.student_id AND u.tenant_id=p.tenant_id JOIN courses c ON c.id=p.course_id AND c.tenant_id=p.tenant_id WHERE p.id=? AND ${s.sql}`, id, ...s.args);
  if (!p) throw new DomainError('This placement is unavailable.', 404);
  return p;
}
function eligible(p: Row, week: string) {
  const period = weeklyPeriod(week);
  if (period.start !== week || week > weeklyPeriod(manilaToday()).start || period.end < str(p, 'startsAt') || week > str(p, 'endsAt') || p.status === 'PLANNED') throw new DomainError('Choose a current or past week within an active training placement.');
  return period;
}
async function sources(tenantId: string, courseId: string, week: string) {
  const general = await one('SELECT * FROM weekly_question_sets WHERE tenant_id=? AND course_id=? AND effective_week<=? ORDER BY effective_week DESC,created_at DESC,id DESC LIMIT 1', tenantId, '', week);
  const course = await one('SELECT * FROM weekly_question_sets WHERE tenant_id=? AND course_id=? AND effective_week<=? ORDER BY effective_week DESC,created_at DESC,id DESC LIMIT 1', tenantId, courseId, week);
  if (!general || !course) return null;
  const questions = [...json<WeeklyQuestion[]>(general.questionsJson).map(q => ({...q, id: `general:${q.id}`})), ...json<WeeklyQuestion[]>(course.questionsJson).map(q => ({...q, id: `course:${q.id}`}))];
  return { general, course, questions };
}
async function getPeriod(tenantId: string, courseId: string, week: string, pin: boolean) {
  const existing = await one('SELECT * FROM weekly_course_periods WHERE tenant_id=? AND course_id=? AND week=?', tenantId, courseId, week);
  if (existing) return existing;
  const selected = await sources(tenantId, courseId, week);
  if (!selected || !pin) return selected ? {id: '', questionsJson: JSON.stringify(selected.questions)} : null;
  await statement('INSERT INTO weekly_course_periods (id,tenant_id,created_at,course_id,week,questions_json,general_set_id,course_set_id) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(tenant_id,course_id,week) DO NOTHING', crypto.randomUUID(), tenantId, new Date().toISOString(), courseId, week, JSON.stringify(selected.questions), selected.general.id, selected.course.id).run();
  return one('SELECT * FROM weekly_course_periods WHERE tenant_id=? AND course_id=? AND week=?', tenantId, courseId, week);
}
export async function canAuthorCourse(user: Identity, courseId: string) {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role !== 'COORDINATOR') return false;
  return Boolean(await one('SELECT g.id FROM weekly_question_grants g WHERE g.tenant_id=? AND g.course_id=? AND g.coordinator_id=? AND g.active=1 AND EXISTS (SELECT 1 FROM classes c WHERE c.tenant_id=g.tenant_id AND c.course_id=g.course_id AND c.coordinator_id=g.coordinator_id)', user.tenantId, courseId, user.id));
}
export async function saveWeeklyReport(user: Identity, raw: unknown) {
  const d = weeklyActionSchema.parse(raw);
  if (d.action === 'publish') {
    requireRole(user, 'SUPER_ADMIN', 'COORDINATOR');
    const week = weeklyPeriod(d.week).start;
    const current = weeklyPeriod(manilaToday()).start;
    if (week !== d.week || week < current) throw new DomainError('Publish for this Monday or a future Monday.');
    if (!d.courseId) requireRole(user, 'SUPER_ADMIN');
    else {
      if (!await one('SELECT id FROM courses WHERE tenant_id=? AND id=?', user.tenantId, d.courseId) || !await canAuthorCourse(user, d.courseId)) throw new DomainError('You need a course authoring grant and an assigned class.', 403);
    }
    if (week === current && await one('SELECT id FROM weekly_question_sets WHERE tenant_id=? AND course_id=? AND effective_week<=? LIMIT 1', user.tenantId, d.courseId, current)) throw new DomainError('This week already has a published set. Schedule changes for a future week.');
    if (new Set(d.questions.map(q => q.id)).size !== d.questions.length) throw new DomainError('Question identifiers must be unique.');
    const id = crypto.randomUUID();
    await database().batch([insert('weekly_question_sets', {course_id:d.courseId,effective_week:week,questions_json:JSON.stringify(d.questions),author_id:user.id},id), auditStatement(user.id,'WEEKLY_QUESTIONS_PUBLISHED',id)]);
    return {message:'Question set published. Historical submissions keep their original questions.'};
  }
  if (d.action === 'grant') {
    requireRole(user, 'SUPER_ADMIN');
    const owner = await one("SELECT c.id FROM classes c JOIN users u ON u.id=c.coordinator_id AND u.tenant_id=c.tenant_id WHERE c.tenant_id=? AND c.course_id=? AND c.coordinator_id=? AND u.role='COORDINATOR'", user.tenantId,d.courseId,d.coordinatorId);
    if (d.active && !owner) throw new DomainError('Choose a coordinator with an assigned class in this course.');
    if (!d.active && !await one('SELECT id FROM weekly_question_grants WHERE tenant_id=? AND course_id=? AND coordinator_id=?',user.tenantId,d.courseId,d.coordinatorId)) throw new DomainError('This authoring grant is unavailable.',404);
    await database().batch([statement('INSERT INTO weekly_question_grants (id,tenant_id,created_at,course_id,coordinator_id,active) VALUES (?,?,?,?,?,?) ON CONFLICT(tenant_id,course_id,coordinator_id) DO UPDATE SET active=excluded.active',crypto.randomUUID(),user.tenantId,new Date().toISOString(),d.courseId,d.coordinatorId,d.active?1:0),auditStatement(user.id,'WEEKLY_AUTHOR_GRANT',d.coordinatorId,d.active?'Granted':'Revoked')]);
    return {message:'Course authoring permission saved.'};
  }
  const p = await weeklyPlacement(user,d.placementId,d.action==='save');
  eligible(p,d.week);
  const existing = await one('SELECT * FROM weekly_reports WHERE tenant_id=? AND placement_id=? AND week=?',user.tenantId,p.id,d.week);
  if (d.action === 'excuse') {
    requireRole(user,'COORDINATOR');
    if (existing?.status === 'SUBMITTED') throw new DomainError('A submitted report cannot be excused.',409);
    const changed=await one(`INSERT INTO weekly_reports (id,tenant_id,created_at,placement_id,week,status,content_json,answers_json,updated_at,version,excuse_reason) VALUES (?,?,?,?,?,'EXCUSED','{}','{}',?,1,?) ON CONFLICT(tenant_id,placement_id,week) DO UPDATE SET status='EXCUSED',excuse_reason=excluded.excuse_reason,updated_at=excluded.updated_at,version=weekly_reports.version+1 WHERE weekly_reports.status='DRAFT' RETURNING id`,crypto.randomUUID(),user.tenantId,new Date().toISOString(),p.id,d.week,new Date().toISOString(),d.reason);
    if(!changed)throw new DomainError('This report was finalized while you were recording the break.',409);
    await auditStatement(user.id,'WEEKLY_REPORT_EXCUSED',changed.id,d.reason).run();
    return {message:'Approved break recorded for this week.'};
  }
  if (existing && existing.status !== 'DRAFT') throw new DomainError('This weekly report is already finalized.',409);
  if (Number(existing?.version??0)!==d.version) throw new DomainError('The draft changed in another window. Refresh before saving.',409);
  const period = await getPeriod(user.tenantId,str(p,'courseId'),d.week,true);
  const questions = period ? json<WeeklyQuestion[]>(period.questionsJson) : [];
  const answers = Object.fromEntries(Object.entries(d.answers).filter(([id])=>questions.some(q=>q.id===id)));
  if (d.submit) {
    if (d.content.noActivity) { if (d.content.noActivityReason.length<5) throw new DomainError('Explain why there was no activity this week.'); }
    else if (weeklyPrompts.some(([key])=>d.content[key].length<5)) throw new DomainError('Complete each weekly report prompt (at least 5 characters).');
    if (!questions.length) throw new DomainError('Waiting for published general and course questions. Your report can still be saved as a draft.');
    if (questions.some(q=>!answers[q.id])) throw new DomainError('Answer every competency question before submitting.');
  }
  const now = new Date().toISOString();
  const reportId = existing?.id ?? crypto.randomUUID();
  if (existing) {
    const changed=await one("UPDATE weekly_reports SET content_json=?,answers_json=?,period_id=?,status=?,submitted_at=?,updated_at=?,version=version+1 WHERE tenant_id=? AND id=? AND version=? AND status='DRAFT' RETURNING id",JSON.stringify(d.content),JSON.stringify(answers),period?.id||null,d.submit?'SUBMITTED':'DRAFT',d.submit?now:null,now,user.tenantId,reportId,d.version);
    if (!changed) throw new DomainError('The draft changed. Refresh before saving.',409);
  } else {
    const changed=await one('INSERT INTO weekly_reports (id,tenant_id,created_at,placement_id,week,status,content_json,answers_json,period_id,updated_at,submitted_at,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(tenant_id,placement_id,week) DO NOTHING RETURNING id',reportId,user.tenantId,now,p.id,d.week,d.submit?'SUBMITTED':'DRAFT',JSON.stringify(d.content),JSON.stringify(answers),period?.id||null,now,d.submit?now:null);
    if (!changed) throw new DomainError('This report was already created. Refresh before saving.',409);
  }
  return {message:d.submit?'Weekly report and competency check submitted.':'Draft saved.',id:reportId,version:d.version+1};
}

export async function weeklyReportAccess(user:Identity,id:string,write=false) {
  const report=await one('SELECT * FROM weekly_reports WHERE tenant_id=? AND id=?',user.tenantId,id);
  if(!report)throw new DomainError('Report unavailable.',404);
  await weeklyPlacement(user,str(report,'placementId'),write);
  if(write&&report.status!=='DRAFT')throw new DomainError('Images can only be changed on a draft.',409);
  return report;
}
export async function weeklyView(user:Identity,requestedWeek:string,courseId=''):Promise<WeeklyView> {
  requireRole(user,'STUDENT','COORDINATOR','SUPER_ADMIN');
  const week=weeklyPeriod(requestedWeek).start;
  if(week>weeklyPeriod(manilaToday()).start)throw new DomainError('Future reporting weeks are unavailable.');
  const s=scope(user);
  const placements=await list(`SELECT p.*,u.name AS student_name,c.name AS course_name FROM placements p JOIN users u ON u.id=p.student_id AND u.tenant_id=p.tenant_id JOIN courses c ON c.id=p.course_id AND c.tenant_id=p.tenant_id WHERE ${s.sql} AND p.starts_at<=? AND p.ends_at>=? AND p.status<>'PLANNED' ${courseId?'AND p.course_id=?':''} ORDER BY u.name`,...s.args,weeklyPeriod(week).end,week,...(courseId?[courseId]:[]));
  const courses=await list(`SELECT c.id,c.name FROM courses c WHERE c.tenant_id=? ${user.role==='COORDINATOR'?'AND c.id IN (SELECT course_id FROM classes WHERE tenant_id=? AND coordinator_id=?)':user.role==='STUDENT'?'AND c.id IN (SELECT course_id FROM placements WHERE tenant_id=? AND student_id=?)':''} ORDER BY c.name`,user.tenantId,...(user.role==='COORDINATOR'||user.role==='STUDENT'?[user.tenantId,user.id]:[]));
  const raw=await list(`SELECT r.*,cp.questions_json FROM weekly_reports r JOIN placements p ON p.id=r.placement_id AND p.tenant_id=r.tenant_id LEFT JOIN weekly_course_periods cp ON cp.id=r.period_id AND cp.tenant_id=r.tenant_id WHERE ${s.sql} AND r.week=? ${courseId?'AND p.course_id=?':''}`, ...s.args,week,...(courseId?[courseId]:[]));
  const sets=user.role==='STUDENT'?[]:await list('SELECT * FROM weekly_question_sets WHERE tenant_id=? ORDER BY effective_week DESC,created_at DESC',user.tenantId);
  const grants=user.role==='STUDENT'?[]:await list('SELECT * FROM weekly_question_grants WHERE tenant_id=?',user.tenantId);
  const authorableCourses=[] as string[];
  for(const c of courses)if(await canAuthorCourse(user,c.id))authorableCourses.push(c.id);
  const base:WeeklyView={week,courses:courses.map(c=>({id:c.id,name:str(c,'name')})),placements:[],reports:[],previewQuestions:{},aggregates:[],questionSets:sets.map(q=>({id:q.id,courseId:str(q,'courseId'),effectiveWeek:str(q,'effectiveWeek'),questions:json(q.questionsJson)})),grants:grants.map(g=>({courseId:str(g,'courseId'),coordinatorId:str(g,'coordinatorId'),active:Number(g.active)})),coordinators:[],authorableCourses};
  if(user.role==='SUPER_ADMIN') {
    const coordinators=await list("SELECT id,name FROM users WHERE tenant_id=? AND role='COORDINATOR' AND status='ACTIVE'",user.tenantId);
    base.coordinators=coordinators.map(c=>({id:c.id,name:str(c,'name')}));
    base.aggregates=aggregateWeekly(week,placements,raw);
    return base;
  }
  base.placements=placements.map(p=>({id:p.id,studentName:str(p,'studentName'),courseId:str(p,'courseId'),courseName:str(p,'courseName'),startsAt:str(p,'startsAt'),endsAt:str(p,'endsAt'),status:str(p,'status')}));
  for(const id of new Set(placements.map(p=>str(p,'courseId')))){
    const period=await getPeriod(user.tenantId,id,week,false);
    base.previewQuestions[id]=period?json(period.questionsJson):[];
  }
  for(const r of raw) {
    const images=await list('SELECT id,name FROM weekly_report_images WHERE tenant_id=? AND report_id=?',user.tenantId,r.id);
    base.reports.push({id:r.id,placementId:str(r,'placementId'),week,status:r.status as WeeklyReport['status'],version:Number(r.version),content:json(r.contentJson),answers:json(r.answersJson),questions:r.questionsJson?json(r.questionsJson):[],submittedAt:r.submittedAt?str(r,'submittedAt'):null,late:Boolean(r.submittedAt&&manilaToday(new Date(str(r,'submittedAt')))>weeklyPeriod(week).end),excuseReason:str(r,'excuseReason'),attachments:images.map(i=>({id:i.id,name:str(i,'name')}))});
  }
  return base;
}

export function aggregateWeekly(week:string,placements:Row[],reports:Row[]):WeeklyAggregate[] {
  return [...new Set(placements.map(p=>str(p,'courseId')))].map(courseId=>{
    const ps=placements.filter(p=>p.courseId===courseId);
    const rs=reports.filter(r=>ps.some(p=>p.id===r.placementId));
    const submitted=rs.filter(r=>r.status==='SUBMITTED');
    const unique=new Set(submitted.map(r=>ps.find(p=>p.id===r.placementId)?.studentId));
    const dimensions=new Map<string,{sum:number;count:number;students:Set<string>}>();
    for(const r of submitted){
      const qs=json<WeeklyQuestion[]>(r.questionsJson||'[]'),answers=json<Record<string,number>>(r.answersJson);
      for(const q of qs){const score=answers[q.id];if(!score)continue;const label=(q.id.startsWith('general:')?'General · ':'Course · ')+q.competency;
        const v=dimensions.get(label)??{sum:0,count:0,students:new Set<string>()};v.sum+=score;v.count++;v.students.add(str(ps.find(p=>p.id===r.placementId)!,'studentId'));dimensions.set(label,v);}
    }
    const excused=rs.filter(r=>r.status==='EXCUSED').length;
    return {week,courseId,courseName:str(ps[0],'courseName'),expected:ps.length-excused,submitted:submitted.length,noActivity:submitted.filter(r=>json<{noActivity:boolean}>(r.contentJson).noActivity).length,excused,late:submitted.filter(r=>r.submittedAt&&manilaToday(new Date(str(r,'submittedAt')))>weeklyPeriod(week).end).length,suppressed:unique.size<3,dimensions:unique.size<3?[]:[...dimensions].filter(([,v])=>v.students.size>=3).map(([name,v])=>({name,average:v.sum/v.count,count:v.count}))};
  });
}
