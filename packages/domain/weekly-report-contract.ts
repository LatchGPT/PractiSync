import { z } from 'zod';

export const ratingLabels = ['Needs continuous guidance', 'Needs frequent guidance', 'Works with some guidance', 'Works independently', 'Works independently and supports others'];
export const weeklyPrompts = [
  ['tasks', 'Work performed'], ['competencies', 'Competencies applied'], ['learning', 'Learning gained'],
  ['challenges', 'Challenges and support needed'], ['nextWeek', 'Plan for next week'],
] as const;
export const questionSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/), text: z.string().trim().min(5).max(500),
  competency: z.string().trim().min(2).max(100), kind: z.enum(['RATING', 'CHOICE']),
  labels: z.array(z.string().trim().min(1).max(160)).length(5),
});
export type WeeklyQuestion = z.infer<typeof questionSchema>;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const id = z.string().min(1).max(160);
export const reportContentSchema = z.object({
  tasks: z.string().trim().max(8000), competencies: z.string().trim().max(8000), learning: z.string().trim().max(8000),
  challenges: z.string().trim().max(8000), nextWeek: z.string().trim().max(8000),
  noActivity: z.boolean(), noActivityReason: z.string().trim().max(2000),
});
export type WeeklyContent = z.infer<typeof reportContentSchema>;
export const emptyWeeklyContent: WeeklyContent = { tasks: '', competencies: '', learning: '', challenges: '', nextWeek: '', noActivity: false, noActivityReason: '' };
export const weeklyActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), placementId: id, week: date, version: z.number().int().min(0), content: reportContentSchema, answers: z.record(z.number().int().min(1).max(5)), submit: z.boolean() }),
  z.object({ action: z.literal('publish'), courseId: z.string().max(160), week: date, questions: z.array(questionSchema).min(1).max(30) }),
  z.object({ action: z.literal('grant'), courseId: id, coordinatorId: id, active: z.boolean() }),
  z.object({ action: z.literal('excuse'), placementId: id, week: date, reason: z.string().trim().min(5).max(1000) }),
]);
export type WeeklyAction = z.infer<typeof weeklyActionSchema>;
export type WeeklyReport = { id: string; placementId: string; week: string; status: 'DRAFT'|'SUBMITTED'|'EXCUSED'; version: number; content: WeeklyContent; answers: Record<string, number>; questions: WeeklyQuestion[]; submittedAt: string|null; late: boolean; excuseReason?: string; attachments: {id: string; name: string}[] };
export type WeeklyPlacement = {id: string; studentName: string; courseId: string; courseName: string; startsAt: string; endsAt: string; status: string};
export type WeeklyAggregate = {week: string; courseId: string; courseName: string; expected: number; submitted: number; noActivity: number; excused: number; late: number; suppressed: boolean; dimensions: {name: string; average: number; count: number}[]};
export type WeeklyView = {
  week: string; courses: {id: string; name: string}[]; placements: WeeklyPlacement[]; reports: WeeklyReport[];
  questionSets: {id: string; courseId: string; effectiveWeek: string; questions: WeeklyQuestion[]}[];
  previewQuestions: Record<string, WeeklyQuestion[]>;
  aggregates: WeeklyAggregate[];
  grants: {courseId: string; coordinatorId: string; active: number}[];
  coordinators: {id: string; name: string}[]; authorableCourses: string[];
  trend?: WeeklyAggregate[];
};
