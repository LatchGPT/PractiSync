import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
export const contactPhone = z.string().trim().min(7, 'Enter a contact phone number.').max(40).regex(/^\+?[\d\s().-]+$/, 'Use a valid phone number, including an area or country code.').refine(value => value.replace(/\D/g, '').length >= 7, 'Use a phone number with at least 7 digits.');
const website = z.string().trim().max(500).url('Enter a full website URL, such as https://company.com.').refine(value => /^https?:\/\//i.test(value), 'Use an http or https website URL.').or(z.literal(''));
export const companyDetails = z.object({ name: text(160), industry: text(120), location: text(240), description: text(2000), contactName: text(120).optional(), contactEmail: z.string().trim().email().max(254).optional(), contactPhone: contactPhone.optional(), contactPosition: text(120).optional(), website: website.optional() });
export const jobDetails = z.object({ title: text(160), description: text(8000), location: text(160), courseId: text(100), courseIds: z.array(text(100)).min(1).max(100).optional(), skills: text(400), openings: z.coerce.number().int().min(1).max(1000) });
export const hteRegistration = companyDetails.omit({ contactEmail: true }).extend({ contactName: text(120), contactPhone, contactPosition: text(120), username: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._-]{3,40}$/), email: z.string().trim().email().max(254), password: z.string().min(12).max(128) }).strict();
export const evaluationQuestion = z.object({
 key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,59}$/), label: text(500),
 type: z.enum(['text','rating','select']), required: z.boolean(),
 options: z.array(text(160)).max(20).default([]),
}).superRefine((q, ctx) => { if (q.type !== 'text' && (q.options.length < 2 || new Set(q.options).size !== q.options.length)) ctx.addIssue({ code: 'custom', message: 'Add at least two distinct scale labels or choices.' }); });
export const evaluationQuestions = z.array(evaluationQuestion).min(1).max(60).refine(q => new Set(q.map(item => item.key)).size === q.length, 'Question keys must be unique.');
export type EvaluationQuestion = z.infer<typeof evaluationQuestion>;
export const hteInputs = {
 hteRequestReview: z.object({ requestId: text(100), version: z.number().int().positive(), decision: z.enum(['APPROVE','REJECT']), note: z.string().trim().max(2000).default('') }),
 hteProfileChange: companyDetails.extend({ version: z.number().int().positive() }),
 hteJobChange: jobDetails.extend({ jobId: text(100), version: z.number().int().positive() }),
 hteJobClose: z.object({ jobId: text(100), version: z.number().int().positive() }),
 finalDtrSubmit: z.object({ placementId: text(100), version: z.number().int().min(0), attachmentFilename: text(180).optional(), attachmentBase64: z.string().optional(), cocFilename: text(180).optional(), cocBase64: z.string().optional() }),
 finalDtrReview: z.object({ placementId: text(100), version: z.number().int().positive(), decision: z.enum(['VERIFY','REJECT']), note: z.string().trim().max(2000).default('') }),
 finalDtrReopen: z.object({ placementId: text(100), version: z.number().int().positive(), reason: text(2000) }),
 finalDtrReopenReview: z.object({ requestId: text(100), version: z.number().int().positive(), decision: z.enum(['APPROVE','REJECT']), note: text(2000) }),
 hteEvaluationPublish: z.object({ templateId: text(100), version: z.number().int().positive(), title: text(160), questions: evaluationQuestions }),
 hteEvaluationDraft: z.object({ templateId: text(100), version: z.number().int().positive(), title: text(160), questions: z.array(evaluationQuestion).max(60).refine(q => new Set(q.map(item => item.key)).size === q.length, 'Question keys must be unique.') }),
 hteEvaluationSave: z.object({ placementId: text(100), templateId: text(100), finalDtrVersion: z.number().int().positive(), version: z.number().int().min(0), mode: z.enum(['DRAFT','SUBMIT']), answers: z.record(z.string().max(60), z.string().max(5000)) }),
 externalEvaluationSubmit: z.object({ placementId: text(100), templateId: text(100), finalDtrVersion: z.number().int().positive(), version: z.number().int().min(0), answers: z.record(z.string().max(60), z.string().max(5000)), attachmentFilename: text(180), attachmentBase64: z.string() }),
 hteEvaluationReview: z.object({ responseId: text(100), version: z.number().int().positive(), decision: z.enum(['APPROVED','REVISION_REQUESTED']), note: z.string().trim().max(2000).default('') }),
 hteCredentials: z.object({ name: text(120), currentPassword: z.string().max(128), newPassword: z.string().min(12).max(128) }),
};
