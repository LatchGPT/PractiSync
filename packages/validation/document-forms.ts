import { z } from 'zod';

export const documentFormTypes = [
  'COE_PLACEMENT_DATA',
  'COE_RECOMMENDATION',
  'STUDENT_INFO_SHEET',
  'TRAINING_AGREEMENT',
  'PARENT_GUARDIAN_CONSENT',
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
  COE_PLACEMENT_DATA: z.object({
    academicTerm: requiredText(80),
    academicYear: requiredText(30),
    studentNumber: requiredText(40),
    studentName: requiredText(160),
    courseMajor: requiredText(160),
    monthlySalary: requiredText(40),
    residentialAddressPhone: requiredText(300),
    companyName: requiredText(180),
    companyAddressPhone: requiredText(300),
    companyBusinessType: requiredText(160),
    trainingFrom: z.string().date(),
    trainingTo: z.string().date(),
    allowance: requiredText(80),
    officialTimeSchedule: requiredText(160),
    supervisorName: requiredText(160),
    supervisorDesignation: requiredText(120),
    supervisorEmail: z.string().trim().email().max(254),
  }).strict(),
  COE_RECOMMENDATION: z.object({
    letterDate: z.string().date(),
    recipientName: requiredText(160),
    recipientPosition: requiredText(160),
    recipientCompany: requiredText(180),
    recipientAddress: requiredText(300),
    studentName: requiredText(160),
    studentPronoun: z.enum(['he', 'she', 'they']),
    studyYear: requiredText(40),
    course: requiredText(160),
    major: requiredText(160),
    requiredHours: z.number().int().min(1).max(10000),
    trainingCompany: requiredText(180),
    trainingPeriod: requiredText(120),
  }).strict(),
  STUDENT_INFO_SHEET: z.object({
    studentNumber: requiredText(40),
    contactNumber: requiredText(40),
    emergencyContactName: requiredText(120),
    emergencyContactNumber: requiredText(40),
  }).strict(),
  TRAINING_AGREEMENT: z.object({
    positionTitle: requiredText(120),
    siteSupervisor: requiredText(120),
    trainingSchedule: requiredText(240),
    primaryDuties: requiredText(2000),
    learningGoals: requiredText(2000),
    studentAcknowledgement: z.boolean(),
  }).strict(),
  PARENT_GUARDIAN_CONSENT: z.object({
    guardianName: requiredText(120),
    relationship: requiredText(80),
    guardianContactNumber: requiredText(40),
    guardianAcknowledgement: z.boolean(),
  }).strict(),
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
  group: 'CLEARANCE' | 'OJT';
  description: string;
  fields: DocumentFormField[];
}> = {
  COE_PLACEMENT_DATA: {
    title: 'COE student placement data',
    group: 'CLEARANCE',
    description: 'Placement details for RTU CoE form RTU-OVPASA-CoEO-0004.',
    fields: [
      { key: 'academicTerm', label: 'Semester / summer', kind: 'select', options: [{ value: '1st Semester', label: '1st Semester' }, { value: '2nd Semester', label: '2nd Semester' }, { value: 'Summer', label: 'Summer' }] },
      { key: 'academicYear', label: 'Academic year', kind: 'text', hint: 'For example, 2026–2027' },
      { key: 'studentNumber', label: 'Student number', kind: 'text', maxLength: 40 },
      { key: 'studentName', label: 'Student name (surname, first, middle)', kind: 'text', maxLength: 160 },
      { key: 'courseMajor', label: 'COE major / course', kind: 'text', maxLength: 160 },
      { key: 'monthlySalary', label: 'Working monthly salary (if applicable)', kind: 'text', maxLength: 40 },
      { key: 'residentialAddressPhone', label: 'Residential address / telephone', kind: 'textarea', maxLength: 300 },
      { key: 'companyName', label: 'Company name', kind: 'text', maxLength: 180 },
      { key: 'companyAddressPhone', label: 'Company address / telephone', kind: 'textarea', maxLength: 300 },
      { key: 'companyBusinessType', label: 'Kind of company business', kind: 'text', maxLength: 160 },
      { key: 'trainingFrom', label: 'Training period starts', kind: 'date' },
      { key: 'trainingTo', label: 'Training period ends', kind: 'date' },
      { key: 'allowance', label: 'Allowance', kind: 'text', maxLength: 80 },
      { key: 'officialTimeSchedule', label: 'Official time schedule', kind: 'text', maxLength: 160 },
      { key: 'supervisorName', label: 'Immediate supervisor', kind: 'text', maxLength: 160 },
      { key: 'supervisorDesignation', label: 'Supervisor designation', kind: 'text', maxLength: 120 },
      { key: 'supervisorEmail', label: 'Supervisor email address', kind: 'email', maxLength: 254 },
    ],
  },
  COE_RECOMMENDATION: {
    title: 'COE recommendation letter',
    group: 'CLEARANCE',
    description: 'Recommendation letter based on RTU CoE template RTU-OVPASA-CoEO-003.',
    fields: [
      { key: 'letterDate', label: 'Letter date', kind: 'date' },
      { key: 'recipientName', label: 'Recipient name', kind: 'text', maxLength: 160 },
      { key: 'recipientPosition', label: 'Recipient title / position', kind: 'text', maxLength: 160 },
      { key: 'recipientCompany', label: 'Recipient company / office', kind: 'text', maxLength: 180 },
      { key: 'recipientAddress', label: 'Recipient address', kind: 'textarea', maxLength: 300 },
      { key: 'studentName', label: 'Student full name', kind: 'text', maxLength: 160 },
      { key: 'studentPronoun', label: 'Pronoun used in letter', kind: 'select', options: [{ value: 'he', label: 'He / his' }, { value: 'she', label: 'She / her' }, { value: 'they', label: 'They / their' }] },
      { key: 'studyYear', label: 'Year level', kind: 'text', hint: 'For example, 4th year', maxLength: 40 },
      { key: 'course', label: 'Degree program', kind: 'text', maxLength: 160 },
      { key: 'major', label: 'Major', kind: 'text', maxLength: 160 },
      { key: 'requiredHours', label: 'Required COE training hours', kind: 'number' },
      { key: 'trainingCompany', label: 'Company / office for training', kind: 'text', maxLength: 180 },
      { key: 'trainingPeriod', label: 'Training period', kind: 'text', maxLength: 120 },
    ],
  },
  STUDENT_INFO_SHEET: {
    title: 'Student information sheet',
    group: 'CLEARANCE',
    description: 'Add contact details used for this fictional practicum record.',
    fields: [
      { key: 'studentNumber', label: 'Student number', kind: 'text', maxLength: 40 },
      { key: 'contactNumber', label: 'Student contact number', kind: 'tel', maxLength: 40 },
      { key: 'emergencyContactName', label: 'Emergency contact name', kind: 'text', maxLength: 120 },
      { key: 'emergencyContactNumber', label: 'Emergency contact number', kind: 'tel', maxLength: 40 },
    ],
  },
  TRAINING_AGREEMENT: {
    title: 'Training agreement details',
    group: 'CLEARANCE',
    description: 'Record the placement details for a sample training agreement.',
    fields: [
      { key: 'positionTitle', label: 'Training position', kind: 'text', maxLength: 120 },
      { key: 'siteSupervisor', label: 'Site supervisor', kind: 'text', maxLength: 120 },
      { key: 'trainingSchedule', label: 'Training schedule', kind: 'text', maxLength: 240 },
      { key: 'primaryDuties', label: 'Primary duties', kind: 'textarea', maxLength: 2000 },
      { key: 'learningGoals', label: 'Learning goals', kind: 'textarea', maxLength: 2000 },
      { key: 'studentAcknowledgement', label: 'I reviewed these sample placement details.', kind: 'checkbox' },
    ],
  },
  PARENT_GUARDIAN_CONSENT: {
    title: 'Parent / guardian acknowledgement',
    group: 'CLEARANCE',
    description: 'Enter a fictional guardian contact and acknowledge this sample placement summary.',
    fields: [
      { key: 'guardianName', label: 'Parent / guardian name', kind: 'text', maxLength: 120 },
      { key: 'relationship', label: 'Relationship to student', kind: 'text', maxLength: 80 },
      { key: 'guardianContactNumber', label: 'Contact number', kind: 'tel', maxLength: 40 },
      { key: 'guardianAcknowledgement', label: 'I reviewed this fictional OJT information.', kind: 'checkbox' },
    ],
  },
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
