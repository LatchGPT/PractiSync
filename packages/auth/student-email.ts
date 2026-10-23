export const STUDENT_EMAIL_DOMAIN = 'rtu.edu.ph';

export function isRtuStudentEmail(email: string): boolean {
 return /^[^\s@]+@rtu\.edu\.ph$/i.test(email.trim());
}

// This flag is stored on an account by Super Admin provisioning. Never accept
// an exception, replacement email, or provider domain from a student request.
export function studentEmailAllowed(account: Record<string, unknown>): boolean {
 return account.role !== 'STUDENT' || isRtuStudentEmail(String(account.email ?? '')) || Number(account.emailDomainException) === 1;
}
