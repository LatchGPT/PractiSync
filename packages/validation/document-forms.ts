import { z } from 'zod';

export const documentFormTypes = [
  'FINAL_SELF_ASSESSMENT',
  'OJT_EXIT_SURVEY',
] as const;

export type DocumentFormType = typeof documentFormTypes[number];
export type DocumentFormAnswer = string | number | boolean;

export interface DocumentFormField {
  key: string;
  label: string;
  kind: 'text' | 'tel' | 'email' | 'date' | 'number' | 'textarea' | 'checkbox' | 'rating' | 'select';
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  maxLength?: number;
}

const requiredText = (max: number) => z.string().trim().min(1).max(max);
const rating = z.number().int().min(1).max(5);

export const documentFormAnswerSchemas = {
  FINAL_SELF_ASSESSMENT: z.object({
    technicalSkills: rating,
    communication: rating,
    professionalism: rating,
    problemSolving: rating,
    reflection: requiredText(2000),
  }).strict(),
  OJT_EXIT_SURVEY: z.object({
    curriculumRelevance: rating,
    universitySupport: rating,
    workplaceAlignment: rating,
    trainingPlanClarity: rating,
    feedback: requiredText(2000),
  }).strict(),
} satisfies Record<DocumentFormType, z.ZodObject<z.ZodRawShape>>;

export const documentFormCatalog: Record<DocumentFormType, {
  title: string;
  group: 'OJT';
  description: string;
  fields: DocumentFormField[];
}> = {
  FINAL_SELF_ASSESSMENT: {
    title: 'Final competency self-assessment',
    group: 'OJT',
    description: 'Reflect on the competencies in your OJT framework.',
    fields: [
      { key: 'technicalSkills', label: 'Technical skills', kind: 'rating' },
      { key: 'communication', label: 'Communication', kind: 'rating' },
      { key: 'professionalism', label: 'Professionalism', kind: 'rating' },
      { key: 'problemSolving', label: 'Problem solving', kind: 'rating' },
      { key: 'reflection', label: 'What competency or skill improved most during your OJT?', kind: 'textarea', maxLength: 2000 },
    ],
  },
  OJT_EXIT_SURVEY: {
    title: 'OJT learning and program exit survey',
    group: 'OJT',
    description: 'Share feedback on learning, curriculum relevance, and university support.',
    fields: [
      { key: 'curriculumRelevance', label: 'Curriculum relevance', kind: 'rating' },
      { key: 'universitySupport', label: 'University support', kind: 'rating' },
      { key: 'workplaceAlignment', label: 'Workplace alignment', kind: 'rating' },
      { key: 'trainingPlanClarity', label: 'Training plan clarity', kind: 'rating' },
      { key: 'feedback', label: 'What should the university improve in the OJT program?', kind: 'textarea', maxLength: 2000 },
    ],
  },
};

export const documentFormTypeSchema = z.enum(documentFormTypes);
export const documentFormAnswerValueSchema = z.union([
  z.string().trim().max(5000),
  z.number().int().min(0).max(10000),
  z.boolean(),
]);
