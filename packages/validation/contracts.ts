import { z } from 'zod';
export const roles=['SUPER_ADMIN','COORDINATOR','SUPERVISOR','STUDENT'] as const;
export type Role=typeof roles[number];
export type Row={id:string;tenantId:string;createdAt:string;[key:string]:string|number|null};
export interface Identity {id:string;name:string;username:string;email:string;role:Role;status:string;sessionVersion:number;isDemo:number;courseId:string|null;companyId:string|null;tenantId:string;}
export interface Snapshot {user:Identity;users:Row[];studentAccountSummary?:Row[];departments:Row[];courses:Row[];classes:Row[];placements:Row[];entries:Row[];documents:Row[];incidents:Row[];jobs:Row[];applications:Row[];announcements:Row[];evaluations:Row[];assessmentSchedules:Row[];scores:Row[];companies:Row[];reviews:Row[];policies:Row[];completion:Row[];audit:Row[];joinRequests:Row[];notifications:Row[];completionResponses?:Row[];guestEvaluationLinks?:Row[];privateHosts?:Row[];}
const str=(max=500)=>z.string().trim().min(1).max(max);
export const dtrInput=z.object({placementId:str(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),startsAt:str(),endsAt:str(),breakMinutes:z.coerce.number().int().min(0),narrative:str(8000),entryId:z.string().optional(),version:z.coerce.number().int().optional(),reason:z.string().max(1000).optional()});
export const inputs={
 dtr:dtrInput,
 confirm:z.object({entryId:str(),version:z.coerce.number().int()}),
 join:z.object({code:z.string().trim().min(4).max(16)}),
 class:z.object({name:str(100),section:str(60),courseId:str()}),
 revokeCode:z.object({classId:str()}),
 assignClassReps:z.object({classId:str(),classRepId:z.string().nullable().optional(),viceClassRepId:z.string().nullable().optional()}),
 removeStudent:z.object({classId:str(),studentId:str()}),
 joinRequestDecision:z.object({requestId:str(),decision:z.enum(['APPROVE','REJECT']),note:z.string().max(500).optional()}),
 policy:z.object({courseId:str(),hours:z.coerce.number().int().min(1).max(10000),version:z.coerce.number().int()}),
 documentReview:z.object({documentId:str(),status:z.enum(['APPROVED','REJECTED']),reason:str(1000)}),
 incident:z.object({subject:str(160),narrative:str(8000),placementId:str()}),
 resolveCase:z.object({caseId:str(),status:z.enum(['IN_PROGRESS','RESOLVED']),resolution:str(4000)}),
 job:z.object({title:str(160),description:str(8000),location:str(160),courseId:str(),skills:str(400),openings:z.coerce.number().int().min(1).max(1000),companyId:z.string().optional()}),
 companyProfile:z.object({name:str(160),industry:str(120),location:str(240),description:str(2000)}),
 companyVerification:z.object({companyId:str(),decision:z.enum(['APPROVE','REJECT'])}),
 jobReview:z.object({jobId:str(),decision:z.enum(['APPROVE','REJECT']),note:z.string().trim().max(1000).optional()}),
 application:z.object({jobId:str(),coverLetter:str(5000)}),
 applicationStatus:z.object({applicationId:str(),status:z.enum(['SHORTLISTED','ACCEPTED','REJECTED'])}),
 selectApplication:z.object({applicationId:str(),decision:z.enum(['SHORTLISTED','REJECTED'])}),
 confirmPlacement:z.object({applicationId:str(),classId:str(),startsAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),endsAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}),
 activatePlacement:z.object({placementId:str()}),
 industryFinalEvaluation:z.object({placementId:str(),scores:z.object({technicalSkills:z.object({score:z.coerce.number().int().min(1).max(5),evidence:str(1000)}),communication:z.object({score:z.coerce.number().int().min(1).max(5),evidence:str(1000)}),professionalism:z.object({score:z.coerce.number().int().min(1).max(5),evidence:str(1000)}),problemSolving:z.object({score:z.coerce.number().int().min(1).max(5),evidence:str(1000)})})}),
 guestEvaluationLink:z.object({placementId:str(),expiresInDays:z.coerce.number().int().min(1).max(30).default(7)}),
 revokeGuestEvaluationLink:z.object({linkId:str()}),
 completionForm:z.object({placementId:str(),formType:z.enum(['FINAL_SELF_ASSESSMENT','OJT_EXIT_SURVEY']),answers:z.record(z.string(),z.union([z.string().trim().max(5000),z.number().int().min(1).max(5)]))}),
 completionDecision:z.object({placementId:str(),decision:z.enum(['APPROVE','REJECT']),note:z.string().trim().max(1000).optional()}),
 privateHost:z.object({studentId:str(),classId:str(),companyName:str(160),industry:str(120),location:str(240),description:str(1000),supervisorName:str(120),supervisorEmail:z.string().email(),startsAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),endsAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}),
 announcement:z.object({title:str(160),body:str(8000),classId:z.string().optional()}),
 assessmentSchedule:z.object({courseId:str(),cadence:z.enum(['WEEKLY','MONTHLY','BOTH']),version:z.coerce.number().int().min(0)}),
 evaluation:z.object({placementId:str(),kind:z.enum(['WEEKLY','MONTHLY']),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),version:z.coerce.number().int().min(1).optional(),technical:z.coerce.number().int().min(1).max(5),communication:z.coerce.number().int().min(1).max(5),professionalism:z.coerce.number().int().min(1).max(5),problemSolving:z.coerce.number().int().min(1).max(5)}),
 evaluationReview:z.object({evaluationId:str(),decision:z.enum(['APPROVED','REVISION_REQUESTED']),note:z.string().trim().max(1000).optional()}),
 review:z.object({placementId:str(),rating:z.coerce.number().int().min(1).max(5),body:str(5000)}),
 moderateReview:z.object({reviewId:str(),status:z.enum(['APPROVED','REJECTED'])}),
 account:z.object({name:str(120),username:z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._-]{3,40}$/),email:z.string().email(),role:z.enum(roles),courseId:z.string().optional(),companyId:z.string().optional(),password:z.string().min(12).max(128)}),
 role:z.object({userId:str(),role:z.enum(roles),status:z.enum(['ACTIVE','DISABLED'])}),
 profile:z.object({name:str(120)}),
 structure:z.object({kind:z.enum(['DEPARTMENT','COURSE']),name:str(120),code:str(20),departmentId:z.string().optional()}),
 markNotificationRead:z.object({notificationId:str()}),
 markAllNotificationsRead:z.object({}),
};
export type Action=keyof typeof inputs;
export function camelRows(rows:Record<string,unknown>[]):Row[]{return rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k.replace(/_([a-z])/g,(_,c:string)=>c.toUpperCase()),v])) as Row);}
