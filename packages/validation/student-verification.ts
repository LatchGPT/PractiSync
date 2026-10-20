import { z } from 'zod';
import type { Row } from './contracts';

export const verificationStatuses = ['DRAFT', 'PENDING', 'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED'] as const;
export type StudentVerificationStatus = typeof verificationStatuses[number];
export const studentClassCodeInput = z.object({
 classCode: z.string().trim().min(4, 'Enter the class code from your coordinator.').max(16, 'Class codes are 16 characters or fewer.').regex(/^[A-Za-z0-9]+$/, 'Use letters and numbers only.').transform(value => value.toUpperCase()),
});
export const studentDetailsInput = z.object({
 studentNumber: z.string().trim().min(3, 'Enter your student number.').max(40).regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and hyphens.').transform(value => value.toUpperCase()),
 legalName: z.string().trim().min(2, 'Enter your full legal name.').max(120),
 classCode: studentClassCodeInput.shape.classCode,
 yearLevel: z.coerce.number().int().min(1, 'Choose your year level.').max(6, 'Choose a year from 1 to 6.'),
 version: z.coerce.number().int().min(1),
});
export interface StudentVerificationContext {
 email: string;
 name: string;
 request: Row;
 sections: Row[];
 courses: Row[];
 demo: boolean;
}
