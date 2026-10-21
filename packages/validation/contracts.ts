import { z } from 'zod';
import { documentFormAnswerValueSchema, documentFormTypeSchema } from './document-forms';
import { hteInputs } from './hte';
export const roles=['SUPER_ADMIN','COORDINATOR','SUPERVISOR','STUDENT'] as const;
export type Role=typeof roles[number];
export type Row={id:string;tenantId:string;createdAt:string;[key:string]:string|number|null};
export interface Identity {id:string;name:string;username:string;email:string;role:Role;status:string;sessionVersion:number;isDemo:number;courseId:string|null;companyId:string|null;tenantId:string;authenticationId?:string;}
export interface StudentAccountSummary extends Row {courseId:string|null;courseCode:string|null;courseName:string|null;total:number;active:number;disabled:number;}
export interface Snapshot {user:Identity;users:Row[];departments:Row[];courses:Row[];classes:Row[];placements:Row[];entries:Row[];documents:Row[];incidents:Row[];jobs:Row[];applications:Row[];announcements:Row[];calendarEvents:Row[];evaluations:Row[];assessmentSchedules:Row[];scores:Row[];companies:Row[];reviews:Row[];policies:Row[];completion:Row[];audit:Row[];joinRequests:Row[];notifications:Row[];outcomeDecisions:Row[];industryFeedback:Row[];completionResponses?:Row[];guestEvaluationLinks?:Row[];privateHosts?:Row[];studentAccountSummary?:StudentAccountSummary[];classMembers?:Row[];}
const str=(max=500)=>z.string().trim().min(1).max(max);
export interface Snapshot {
 reminderPolicies?: Row[];
 reminderJobs?: Row[];
 reminderTargets?: Row[];
 workflowWorker?: Row|null;
 deadlineRemindersEnabled?: boolean;
 accountMailJobs?: Row[];
 accountAccess?: {google:boolean;email:boolean;institutional:boolean};
 industryFeedbackHistory?: Row[];
 hteRequests?: Row[];
 finalDtrs?: Row[];
 finalDtrReopens?: Row[];
 hteEvaluationTemplates?: Row[];
 hteEvaluationResponses?: Row[];
}
export const dtrInput=z.object({placementId:str(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),startsAt:str(),endsAt:str(),breakMinutes:z.coerce.number().int().min(0),narrative:str(8000),entryId:z.string().optional(),version:z.coerce.number().int().optional(),reason:z.string().max(1000).optional()});
export const inputs={
 ...hteInputs,
 dtr:dtrInput,
 calendarEvent:z.object({remindersEnabled:z.coerce.number().int().min(0).max(1).default(1),reminderTarget:z.string().max(160).default('NONE'),eventId:z.string().optional(),eventType:z.enum(['ACADEMIC','HOLIDAY','DEADLINE','APPOINTMENT']),title:str(160),description:z.string().trim().max(2000).optional().default(''),startDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),endDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),startTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().or(z.literal('')),endTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().or(z.literal('')),location:z.string().trim().max(240).optional().default(''),meetingUrl:z.string().trim().max(1000).optional().default(''),audience:z.enum(['UNIVERSITY','CLASS']).optional().default('CLASS'),classId:z.string().trim().max(100).optional().default(''),status:z.enum(['ACTIVE','CANCELLED']).optional().default('ACTIVE')}),
 cancelCalendarEvent:z.object({eventId:str()}),
 deleteCalendarEvent:z.object({eventId:str()}),
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
 completionForm:z.object({placementId:str(),formType:documentFormTypeSchema,mode:z.enum(['SAVE_DRAFT','SUBMIT']).default('SUBMIT'),answers:z.record(z.string(),documentFormAnswerValueSchema),version:z.coerce.number().int().min(0).optional()}),
 completionDecision:z.object({placementId:str(),decision:z.enum(['APPROVE','REJECT']),note:z.string().trim().max(1000).optional()}),
 privateHost:z.object({studentId:str(),classId:str(),companyName:str(160),industry:str(120),location:str(240),description:str(1000),supervisorName:str(120),supervisorEmail:z.string().email(),startsAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),endsAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}),
 announcement:z.object({title:str(160),body:str(8000),classId:z.string().optional()}),
 assessmentSchedule:z.object({courseId:str(),cadence:z.enum(['WEEKLY','MONTHLY','BOTH']),version:z.coerce.number().int().min(0)}),
 evaluation:z.object({placementId:str(),kind:z.enum(['WEEKLY','MONTHLY']),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),version:z.coerce.number().int().min(1).optional(),technical:z.coerce.number().int().min(1).max(5),communication:z.coerce.number().int().min(1).max(5),professionalism:z.coerce.number().int().min(1).max(5),problemSolving:z.coerce.number().int().min(1).max(5)}),
 evaluationReview:z.object({evaluationId:str(),decision:z.enum(['APPROVED','REVISION_REQUESTED']),note:z.string().trim().max(1000).optional()}),
 outcomeDecision:z.object({placementId:str(),decision:z.enum(['EXEMPLARY','SATISFACTORY','NEEDS_REINFORCEMENT','UNSATISFACTORY']),rationale:z.string().trim().min(5).max(2000)}),
 industryFeedback:z.object({placementId:str(),version:z.coerce.number().int().min(0).default(0),workplaceReadiness:z.coerce.number().int().min(1).max(5),competencyRelevance:z.coerce.number().int().min(1).max(5),supervisionSupport:z.coerce.number().int().min(1).max(5),curriculumAlignment:z.coerce.number().int().min(1).max(5),technicalGaps:z.string().trim().max(500).optional(),softSkillGaps:z.string().trim().max(500).optional(),recommendations:z.string().trim().min(5).max(2000)}),
 invalidateIndustryFeedback:z.object({feedbackId:str(),version:z.coerce.number().int().min(1),reason:str(1000)}),
 review:z.object({placementId:str(),rating:z.coerce.number().int().min(1).max(5),body:str(5000)}),
 moderateReview:z.object({reviewId:str(),status:z.enum(['APPROVED','REJECTED'])}),
 reminderPreference:z.object({enabled:z.coerce.number().int().min(0).max(1)}),
 retryDeadlineReminder:z.object({slotId:str()}),
 revokeOwnSessions:z.object({}),
 retryAccountEmail:z.object({jobId:str()}),
 inviteAccount:z.object({userId:str()}),
 account:z.object({name:str(120),username:z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._-]{3,40}$/),email:z.string().trim().toLowerCase().email(),role:z.enum(roles),courseId:z.string().optional(),companyId:z.string().optional(),studentEmailAccess:z.enum(['RTU_ONLY','MANUAL_EXCEPTION']).default('RTU_ONLY'),password:z.string().min(12).max(128)}),
 role:z.object({userId:str(),role:z.enum(roles),status:z.enum(['ACTIVE','DISABLED'])}),
 profile:z.object({name:str(120)}),
 structure:z.object({kind:z.enum(['DEPARTMENT','COURSE']),name:str(120),code:str(20),departmentId:z.string().optional()}),
 markNotificationRead:z.object({notificationId:str()}),
 markAllNotificationsRead:z.object({}),
};
export type Action=keyof typeof inputs;
export function camelRows(rows:Record<string,unknown>[]):Row[]{return rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k.replace(/_([a-z])/g,(_,c:string)=>c.toUpperCase()),typeof v==='bigint'?(v<=BigInt(Number.MAX_SAFE_INTEGER)&&v>=BigInt(Number.MIN_SAFE_INTEGER)?Number(v):v.toString()):v])) as Row);}
