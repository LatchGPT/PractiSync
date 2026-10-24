import { z } from 'zod';

const paragraph = z.string().trim().min(1, 'Complete this field.').max(4000);
export const weeklyReportDetailsSchema = z.object({
  workPerformed: paragraph,
  competenciesApplied: paragraph,
  learningGained: paragraph,
  challengesAndSupport: paragraph,
  nextWeekPlan: paragraph,
  image: z.object({
    name: z.string().trim().min(1).max(180),
    dataUrl: z.string().max(1_400_000).regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/),
  }).optional(),
});
export type WeeklyReportDetails = z.infer<typeof weeklyReportDetailsSchema>;

const rating = z.number().int().min(1).max(5);
export const weeklyCompetencyRatingsSchema = z.object({
  technical: rating,
  problemSolving: rating,
  communication: rating,
  professionalism: rating,
  technicalApplication: rating,
  technicalTools: rating,
  analyticalJudgment: rating,
  workDocumentation: rating,
  safetyAndPrivacy: rating,
  accountability: rating,
}).strict();
